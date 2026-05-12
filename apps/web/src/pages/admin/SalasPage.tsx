import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, Users } from 'lucide-react'
import { api } from '@/services/api'
import { Modal } from '@/components/ui/Modal'
import { Field, Input, Select } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { mensagemDeErro } from '@/lib/erro'
import { useUnidadeAtiva } from '@/lib/papel'

interface Sala {
  id: number
  nome: string
  capacidade: number
  ativo: boolean
  unidade: { id: number; nome: string }
}

interface UnidadeSimples { id: number; nome: string }

const schema = z.object({
  unidadeId:  z.coerce.number().int().positive('Selecione a unidade'),
  nome:       z.string().min(1).max(80),
  capacidade: z.coerce.number().int().min(1).max(2000),
  ativo:      z.boolean().optional(),
})
type Form = z.infer<typeof schema>

export function SalasPage() {
  const qc = useQueryClient()
  const [editando, setEditando] = useState<Sala | null>(null)
  const [modal, setModal] = useState(false)

  const { data: salas = [], isLoading } = useQuery({
    queryKey: ['salas'],
    queryFn: async () => (await api.get<Sala[]>('/salas')).data,
  })

  const { data: unidades = [] } = useQuery({
    queryKey: ['unidades', 'ativas'],
    queryFn: async () => (await api.get<UnidadeSimples[]>('/unidades?ativo=true')).data,
  })

  const salvar = useMutation({
    mutationFn: async (data: Form) => {
      if (editando) return api.put(`/salas/${editando.id}`, data)
      return api.post('/salas', data)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['salas'] }); setModal(false); setEditando(null) },
  })

  function abrirNovo() { setEditando(null); setModal(true) }
  function abrirEditar(s: Sala) { setEditando(s); setModal(true) }

  return (
    <div>
      <PageHeader
        titulo="Salas"
        descricao="Espaços físicos das suas unidades (box, sala de pilates, área externa)."
        acoes={<Button onClick={abrirNovo} disabled={unidades.length === 0}>
          <Plus className="h-4 w-4" /> Nova sala
        </Button>}
      />

      {unidades.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 text-sm text-amber-800">
          Cadastre uma unidade antes de criar salas.
        </div>
      )}

      {isLoading ? (
        <div className="text-sm text-slate-500">Carregando…</div>
      ) : salas.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center">
          <p className="text-slate-600">Nenhuma sala cadastrada ainda.</p>
        </div>
      ) : (
        <>
          {/* Tabela desktop */}
          <div className="hidden md:block bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Sala</th>
                  <th className="px-4 py-3 font-medium">Unidade</th>
                  <th className="px-4 py-3 font-medium">Capacidade</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {salas.map(s => (
                  <tr key={s.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{s.nome}</td>
                    <td className="px-4 py-3 text-slate-700">{s.unidade.nome}</td>
                    <td className="px-4 py-3 text-slate-700"><Users className="h-3 w-3 inline mr-1" />{s.capacidade}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${s.ativo ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                        {s.ativo ? 'Ativa' : 'Inativa'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variante="ghost" tamanho="sm" onClick={() => abrirEditar(s)}><Pencil className="h-4 w-4" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cards mobile */}
          <div className="md:hidden space-y-2">
            {salas.map(s => (
              <button
                key={s.id}
                onClick={() => abrirEditar(s)}
                className="w-full text-left bg-white rounded-xl border border-slate-200 p-4 active:bg-slate-50"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium text-slate-900">{s.nome}</div>
                    <div className="text-xs text-slate-500">{s.unidade.nome}</div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${s.ativo ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                    {s.ativo ? 'Ativa' : 'Inativa'}
                  </span>
                </div>
                <div className="text-xs text-slate-600 mt-2 flex items-center gap-1">
                  <Users className="h-3 w-3" /> Capacidade: {s.capacidade}
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {modal && (
        <SalaFormModal
          sala={editando}
          unidades={unidades}
          onClose={() => { setModal(false); setEditando(null) }}
          onSubmit={(d) => salvar.mutate(d)}
          salvando={salvar.isPending}
          erro={salvar.error ? mensagemDeErro(salvar.error) : null}
        />
      )}
    </div>
  )
}

function SalaFormModal({
  sala, unidades, onClose, onSubmit, salvando, erro,
}: {
  sala: Sala | null
  unidades: UnidadeSimples[]
  onClose: () => void
  onSubmit: (d: Form) => void
  salvando: boolean
  erro: string | null
}) {
  const { restritoUnidade, unidadeId: unidadeIdLogada } = useUnidadeAtiva()
  const unidadeIdPadrao = sala?.unidade.id ?? (restritoUnidade ? unidadeIdLogada ?? undefined : undefined)

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: sala
      ? { unidadeId: sala.unidade.id, nome: sala.nome, capacidade: sala.capacidade, ativo: sala.ativo }
      : { unidadeId: unidadeIdPadrao as unknown as number, ativo: true } as Form,
  })

  useEffect(() => {
    if (!sala && !restritoUnidade && unidades.length === 1) {
      setValue('unidadeId', unidades[0].id)
    }
  }, [sala, unidades, restritoUnidade, setValue])

  return (
    <Modal
      open onClose={onClose} titulo={sala ? 'Editar sala' : 'Nova sala'}
      rodape={
        <>
          <Button variante="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit(onSubmit)} loading={salvando}>{sala ? 'Salvar' : 'Cadastrar'}</Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        {!restritoUnidade && (
          <Field label="Unidade" erro={errors.unidadeId?.message} obrigatorio>
            <Select {...register('unidadeId')}>
              <option value="">Selecione…</option>
              {unidades.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
            </Select>
          </Field>
        )}
        <Field label="Nome da sala" erro={errors.nome?.message} obrigatorio>
          <Input {...register('nome')} placeholder="Box principal, Sala de pilates, etc" />
        </Field>
        <Field label="Capacidade (máx. alunos)" erro={errors.capacidade?.message} obrigatorio>
          <Input {...register('capacidade')} type="number" min={1} placeholder="14" />
        </Field>
        {sala && (
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" {...register('ativo')} className="rounded border-slate-300" />
            Sala ativa
          </label>
        )}
        {erro && <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{erro}</div>}
      </form>
    </Modal>
  )
}

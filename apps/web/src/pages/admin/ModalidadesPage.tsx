import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, MapPin } from 'lucide-react'
import { api } from '@/services/api'
import { Modal } from '@/components/ui/Modal'
import { Field, Input, Select } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { mensagemDeErro } from '@/lib/erro'

interface Unidade { id: number; nome: string }
interface Modalidade {
  id: number
  unidadeId: number
  nome: string
  cor: string | null
  icone: string | null
  ativo: boolean
}

const schema = z.object({
  unidadeId: z.coerce.number().int().positive('Selecione a unidade'),
  nome:      z.string().min(2).max(80),
  cor:       z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Formato #RRGGBB').optional().or(z.literal('')),
  icone:     z.string().max(40).optional(),
  ativo:     z.boolean().optional(),
})
type Form = z.infer<typeof schema>

const SUGESTOES = ['CrossFit', 'Hyrox', 'Musculação', 'Pilates', 'Funcional', 'Yoga', 'Luta', 'Personal']

export function ModalidadesPage() {
  const qc = useQueryClient()
  const [editando, setEditando] = useState<Modalidade | null>(null)
  const [modal, setModal] = useState(false)

  const { data: unidades = [] } = useQuery({
    queryKey: ['unidades', 'ativas'],
    queryFn: async () => (await api.get<Unidade[]>('/unidades?ativo=true')).data,
  })

  const { data: modalidades = [], isLoading } = useQuery({
    queryKey: ['modalidades'],
    queryFn: async () => (await api.get<Modalidade[]>('/modalidades')).data,
  })

  const salvar = useMutation({
    mutationFn: async (data: Form) => {
      const payload = { ...data, cor: data.cor || undefined }
      if (editando) {
        const { unidadeId: _unidadeId, ...rest } = payload
        return api.put(`/modalidades/${editando.id}`, rest)
      }
      return api.post('/modalidades', payload)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['modalidades'] }); setModal(false); setEditando(null) },
  })

  const mapUnidade = new Map(unidades.map(u => [u.id, u.nome]))

  function abrirNovo() { setEditando(null); setModal(true) }
  function abrirEditar(m: Modalidade) { setEditando(m); setModal(true) }

  function cadastrarSugestao(nome: string) {
    if (unidades.length === 0) return
    salvar.mutate({ unidadeId: unidades[0].id, nome, cor: '#22C55E' })
  }

  const podeCadastrar = unidades.length > 0

  return (
    <div>
      <PageHeader
        titulo="Modalidades"
        descricao="Tipos de aula oferecidos por cada unidade."
        acoes={<Button onClick={abrirNovo} disabled={!podeCadastrar}><Plus className="h-4 w-4" /> Nova modalidade</Button>}
      />

      {!podeCadastrar && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 text-sm text-amber-800">
          Cadastre uma unidade antes de criar modalidades.
        </div>
      )}

      {isLoading ? (
        <div className="text-sm text-slate-500">Carregando…</div>
      ) : modalidades.length === 0 && podeCadastrar ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center">
          <p className="text-slate-600">Comece cadastrando as modalidades que sua academia oferece.</p>
          {unidades.length === 1 && (
            <div className="flex flex-wrap gap-2 justify-center mt-4">
              {SUGESTOES.map(s => (
                <button
                  key={s}
                  onClick={() => cadastrarSugestao(s)}
                  className="text-xs px-3 py-1.5 rounded-full border border-slate-300 hover:border-slate-900 hover:bg-slate-50"
                >
                  + {s}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {modalidades.map(m => (
            <button
              key={m.id}
              onClick={() => abrirEditar(m)}
              className="text-left bg-white rounded-xl border border-slate-200 p-4 hover:border-slate-900 active:bg-slate-50 transition"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="h-3 w-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: m.cor ?? '#22C55E' }}
                  />
                  <div className="font-medium text-slate-900 truncate">{m.nome}</div>
                </div>
                <Pencil className="h-4 w-4 text-slate-400 flex-shrink-0" />
              </div>
              <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {mapUnidade.get(m.unidadeId) ?? '—'}
                {!m.ativo && <span className="ml-2 text-amber-700">· Inativa</span>}
              </div>
            </button>
          ))}
        </div>
      )}

      {modal && (
        <ModalidadeFormModal
          modalidade={editando}
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

function ModalidadeFormModal({
  modalidade, unidades, onClose, onSubmit, salvando, erro,
}: {
  modalidade: Modalidade | null
  unidades: Unidade[]
  onClose: () => void
  onSubmit: (d: Form) => void
  salvando: boolean
  erro: string | null
}) {
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: modalidade
      ? { unidadeId: modalidade.unidadeId, nome: modalidade.nome, cor: modalidade.cor ?? '', icone: modalidade.icone ?? '', ativo: modalidade.ativo }
      : { ativo: true } as Form,
  })

  // Pré-seleciona quando há só 1 unidade.
  useEffect(() => {
    if (!modalidade && unidades.length === 1) {
      setValue('unidadeId', unidades[0].id)
    }
  }, [modalidade, unidades, setValue])

  return (
    <Modal
      open
      onClose={onClose}
      titulo={modalidade ? 'Editar modalidade' : 'Nova modalidade'}
      rodape={
        <>
          <Button variante="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit(onSubmit)} loading={salvando}>
            {modalidade ? 'Salvar' : 'Cadastrar'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        {!modalidade && (
          <Field label="Unidade" erro={errors.unidadeId?.message} obrigatorio>
            <Select {...register('unidadeId')}>
              <option value="">Selecione…</option>
              {unidades.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
            </Select>
          </Field>
        )}
        <Field label="Nome" erro={errors.nome?.message} obrigatorio>
          <Input {...register('nome')} placeholder="CrossFit, Pilates, Musculação…" />
        </Field>
        <Field label="Cor (hex)" hint="Usada na agenda. Padrão #22C55E (verde)." erro={errors.cor?.message}>
          <Input {...register('cor')} placeholder="#22C55E" />
        </Field>
        {modalidade && (
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" {...register('ativo')} className="rounded border-slate-300" />
            Modalidade ativa
          </label>
        )}
        {erro && <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{erro}</div>}
      </form>
    </Modal>
  )
}

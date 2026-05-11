import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, MapPin, Phone, Mail } from 'lucide-react'
import { api } from '@/services/api'
import { Modal } from '@/components/ui/Modal'
import { Field, Input } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'

interface Unidade {
  id: number
  nome: string
  endereco: string
  bairro: string | null
  cidade: string
  estado: string
  telefone: string
  email: string | null
  ativo: boolean
}

const schema = z.object({
  nome:     z.string().min(2, 'Mínimo 2 caracteres').max(120),
  endereco: z.string().min(2).max(200),
  bairro:   z.string().max(120).optional(),
  cidade:   z.string().min(2).max(120),
  estado:   z.string().length(2, 'UF deve ter 2 letras'),
  telefone: z.string().min(8).max(20),
  email:    z.string().email('Email inválido').optional().or(z.literal('')),
  ativo:    z.boolean().optional(),
})

type Form = z.infer<typeof schema>

export function UnidadesPage() {
  const qc = useQueryClient()
  const [editando, setEditando] = useState<Unidade | null>(null)
  const [modalAberto, setModalAberto] = useState(false)
  const [busca, setBusca] = useState('')

  const { data: unidades = [], isLoading } = useQuery({
    queryKey: ['unidades', busca],
    queryFn: async () => {
      const params = busca ? `?busca=${encodeURIComponent(busca)}` : ''
      const r = await api.get<Unidade[]>(`/unidades${params}`)
      return r.data
    },
  })

  const salvar = useMutation({
    mutationFn: async (data: Form) => {
      const payload = { ...data, email: data.email || undefined }
      if (editando) return api.put(`/unidades/${editando.id}`, payload)
      return api.post('/unidades', payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['unidades'] })
      setModalAberto(false)
      setEditando(null)
    },
  })

  function abrirNovo() { setEditando(null); setModalAberto(true) }
  function abrirEditar(u: Unidade) { setEditando(u); setModalAberto(true) }

  return (
    <div>
      <PageHeader
        titulo="Unidades"
        descricao="Filiais e endereços da sua academia."
        acoes={<Button onClick={abrirNovo}><Plus className="h-4 w-4" /> Nova unidade</Button>}
      />

      <div className="mb-4">
        <Input
          placeholder="Buscar por nome, cidade ou bairro"
          value={busca}
          onChange={e => setBusca(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {isLoading ? (
        <div className="text-sm text-slate-500">Carregando…</div>
      ) : unidades.length === 0 ? (
        <EmptyState onClick={abrirNovo} />
      ) : (
        <>
          {/* Tabela desktop */}
          <div className="hidden md:block bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Unidade</th>
                  <th className="px-4 py-3 font-medium">Cidade/UF</th>
                  <th className="px-4 py-3 font-medium">Contato</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {unidades.map(u => (
                  <tr key={u.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{u.nome}</div>
                      <div className="text-xs text-slate-500">{u.endereco}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{u.cidade}/{u.estado}</td>
                    <td className="px-4 py-3 text-slate-700">
                      <div>{u.telefone}</div>
                      {u.email && <div className="text-xs text-slate-500">{u.email}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${u.ativo ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                        {u.ativo ? 'Ativa' : 'Inativa'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variante="ghost" tamanho="sm" onClick={() => abrirEditar(u)}><Pencil className="h-4 w-4" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cards mobile */}
          <div className="md:hidden space-y-2">
            {unidades.map(u => (
              <button
                key={u.id}
                onClick={() => abrirEditar(u)}
                className="w-full text-left bg-white rounded-xl border border-slate-200 p-4 active:bg-slate-50"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium text-slate-900">{u.nome}</div>
                    <div className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                      <MapPin className="h-3 w-3" /> {u.cidade}/{u.estado}
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${u.ativo ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                    {u.ativo ? 'Ativa' : 'Inativa'}
                  </span>
                </div>
                <div className="text-xs text-slate-500 mt-2 flex items-center gap-3">
                  <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {u.telefone}</span>
                  {u.email && <span className="flex items-center gap-1 truncate"><Mail className="h-3 w-3" /> {u.email}</span>}
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {modalAberto && (
        <UnidadeFormModal
          unidade={editando}
          onClose={() => { setModalAberto(false); setEditando(null) }}
          onSubmit={(data) => salvar.mutate(data)}
          salvando={salvar.isPending}
          erro={salvar.error ? mensagemDeErro(salvar.error) : null}
        />
      )}
    </div>
  )
}

function EmptyState({ onClick }: { onClick: () => void }) {
  return (
    <div className="bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center">
      <p className="text-slate-600">Nenhuma unidade cadastrada ainda.</p>
      <Button className="mt-4" onClick={onClick}><Plus className="h-4 w-4" /> Cadastrar primeira unidade</Button>
    </div>
  )
}

function UnidadeFormModal({
  unidade, onClose, onSubmit, salvando, erro,
}: {
  unidade: Unidade | null
  onClose: () => void
  onSubmit: (d: Form) => void
  salvando: boolean
  erro: string | null
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: unidade ? {
      nome: unidade.nome,
      endereco: unidade.endereco,
      bairro: unidade.bairro ?? '',
      cidade: unidade.cidade,
      estado: unidade.estado,
      telefone: unidade.telefone,
      email: unidade.email ?? '',
      ativo: unidade.ativo,
    } : { ativo: true } as Form,
  })

  return (
    <Modal
      open
      onClose={onClose}
      titulo={unidade ? 'Editar unidade' : 'Nova unidade'}
      tamanho="lg"
      rodape={
        <>
          <Button variante="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit(onSubmit)} loading={salvando}>
            {unidade ? 'Salvar' : 'Cadastrar'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <Field label="Nome" erro={errors.nome?.message} obrigatorio>
          <Input {...register('nome')} placeholder="Matriz, Filial Centro, etc" />
        </Field>
        <Field label="Endereço" erro={errors.endereco?.message} obrigatorio>
          <Input {...register('endereco')} placeholder="Rua, número" />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Bairro" erro={errors.bairro?.message}>
            <Input {...register('bairro')} />
          </Field>
          <Field label="Cidade" erro={errors.cidade?.message} obrigatorio>
            <Input {...register('cidade')} />
          </Field>
          <Field label="UF" erro={errors.estado?.message} obrigatorio>
            <Input {...register('estado')} maxLength={2} placeholder="SP" />
          </Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Telefone" erro={errors.telefone?.message} obrigatorio>
            <Input {...register('telefone')} placeholder="(11) 99999-0000" />
          </Field>
          <Field label="Email" erro={errors.email?.message}>
            <Input {...register('email')} type="email" placeholder="opcional" />
          </Field>
        </div>
        {unidade && (
          <label className="flex items-center gap-2 text-sm text-slate-700 mt-2">
            <input type="checkbox" {...register('ativo')} className="rounded border-slate-300" />
            Unidade ativa
          </label>
        )}
        {erro && <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{erro}</div>}
      </form>
    </Modal>
  )
}

export function mensagemDeErro(e: unknown): string {
  const err = e as { response?: { data?: { error?: string; detalhes?: Record<string, string[]> } } }
  const detalhes = err.response?.data?.detalhes
  if (detalhes) return Object.values(detalhes).flat()[0] ?? 'Verifique os dados informados.'
  return err.response?.data?.error ?? 'Não foi possível salvar. Tente novamente.'
}

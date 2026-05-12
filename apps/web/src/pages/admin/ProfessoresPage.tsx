import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, Phone, Mail, MapPin } from 'lucide-react'
import { api } from '@/services/api'
import { Modal } from '@/components/ui/Modal'
import { Field, Input, Select, Textarea } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { mensagemDeErro } from '@/lib/erro'
import { useUnidadeAtiva } from '@/lib/papel'

interface Unidade { id: number; nome: string }
interface Modalidade { id: number; unidadeId: number; nome: string; cor: string | null }

interface Professor {
  id: number
  unidadeId: number
  nome: string
  cpf: string | null
  email: string | null
  telefone: string
  observacoes: string | null
  ativo: boolean
  modalidades: Modalidade[]
}

const schema = z.object({
  unidadeId:     z.coerce.number().int().positive('Selecione a unidade'),
  nome:          z.string().min(2).max(120),
  cpf:           z.string().max(20).optional(),
  email:         z.string().email('Email inválido').optional().or(z.literal('')),
  telefone:      z.string().min(8).max(20),
  observacoes:   z.string().max(2000).optional(),
  modalidadeIds: z.array(z.number()).optional(),
  ativo:         z.boolean().optional(),
})
type Form = z.infer<typeof schema>

export function ProfessoresPage() {
  const qc = useQueryClient()
  const [editando, setEditando] = useState<Professor | null>(null)
  const [modal, setModal] = useState(false)
  const [busca, setBusca] = useState('')

  const { data: unidades = [] } = useQuery({
    queryKey: ['unidades', 'ativas'],
    queryFn: async () => (await api.get<Unidade[]>('/unidades?ativo=true')).data,
  })

  const { data: professores = [], isLoading } = useQuery({
    queryKey: ['professores', busca],
    queryFn: async () => (await api.get<Professor[]>(`/professores${busca ? `?busca=${encodeURIComponent(busca)}` : ''}`)).data,
  })

  const { data: modalidades = [] } = useQuery({
    queryKey: ['modalidades', 'ativas'],
    queryFn: async () => (await api.get<Modalidade[]>('/modalidades?ativo=true')).data,
  })

  const salvar = useMutation({
    mutationFn: async (data: Form) => {
      const payload = { ...data, email: data.email || undefined }
      if (editando) {
        const { unidadeId: _u, ...rest } = payload
        return api.put(`/professores/${editando.id}`, rest)
      }
      return api.post('/professores', payload)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['professores'] }); setModal(false); setEditando(null) },
  })

  const mapUnidade = new Map(unidades.map(u => [u.id, u.nome]))

  return (
    <div>
      <PageHeader
        titulo="Professores"
        descricao="Coaches, instrutores e personal trainers da sua equipe."
        acoes={<Button onClick={() => { setEditando(null); setModal(true) }}><Plus className="h-4 w-4" /> Novo professor</Button>}
      />

      <div className="mb-4">
        <Input
          type="search"
          inputMode="search"
          enterKeyHint="search"
          placeholder="Buscar por nome, email ou telefone"
          value={busca}
          onChange={e => setBusca(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {isLoading ? (
        <div className="text-sm text-slate-500">Carregando…</div>
      ) : professores.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-600">
          Nenhum professor encontrado.
        </div>
      ) : (
        <>
          {/* Tabela desktop */}
          <div className="hidden md:block bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Nome</th>
                  <th className="px-4 py-3 font-medium">Unidade</th>
                  <th className="px-4 py-3 font-medium">Modalidades</th>
                  <th className="px-4 py-3 font-medium">Contato</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {professores.map(p => (
                  <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{p.nome}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{mapUnidade.get(p.unidadeId) ?? '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {p.modalidades.map(m => (
                          <span key={m.id} className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: (m.cor ?? '#22C55E') + '20', color: m.cor ?? '#15803D' }}>
                            {m.nome}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      <div>{p.telefone}</div>
                      {p.email && <div className="text-xs text-slate-500">{p.email}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${p.ativo ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                        {p.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variante="ghost" tamanho="sm" onClick={() => { setEditando(p); setModal(true) }}><Pencil className="h-4 w-4" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cards mobile */}
          <div className="md:hidden space-y-2">
            {professores.map(p => (
              <button key={p.id} onClick={() => { setEditando(p); setModal(true) }} className="w-full text-left bg-white rounded-xl border border-slate-200 p-4 active:bg-slate-50">
                <div className="flex items-start justify-between">
                  <div className="font-medium text-slate-900">{p.nome}</div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${p.ativo ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                    {p.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {p.modalidades.map(m => (
                    <span key={m.id} className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: (m.cor ?? '#22C55E') + '20', color: m.cor ?? '#15803D' }}>
                      {m.nome}
                    </span>
                  ))}
                </div>
                <div className="text-xs text-slate-500 mt-2 flex items-center gap-3 flex-wrap">
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {mapUnidade.get(p.unidadeId) ?? '—'}</span>
                  <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {p.telefone}</span>
                  {p.email && <span className="flex items-center gap-1 truncate"><Mail className="h-3 w-3" /> {p.email}</span>}
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {modal && (
        <ProfessorFormModal
          professor={editando}
          unidades={unidades}
          modalidades={modalidades}
          onClose={() => { setModal(false); setEditando(null) }}
          onSubmit={(d) => salvar.mutate(d)}
          salvando={salvar.isPending}
          erro={salvar.error ? mensagemDeErro(salvar.error) : null}
        />
      )}
    </div>
  )
}

function ProfessorFormModal({
  professor, unidades, modalidades, onClose, onSubmit, salvando, erro,
}: {
  professor: Professor | null
  unidades: Unidade[]
  modalidades: Modalidade[]
  onClose: () => void
  onSubmit: (d: Form) => void
  salvando: boolean
  erro: string | null
}) {
  const { restritoUnidade, unidadeId: unidadeIdLogada } = useUnidadeAtiva()

  // Quando gestor de unidade: unidadeId vem do JWT, oculta seletor.
  const unidadeIdPadrao = professor?.unidadeId ?? (restritoUnidade ? unidadeIdLogada ?? undefined : undefined)

  const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: professor ? {
      unidadeId: professor.unidadeId,
      nome: professor.nome,
      cpf: professor.cpf ?? '',
      email: professor.email ?? '',
      telefone: professor.telefone,
      observacoes: professor.observacoes ?? '',
      modalidadeIds: professor.modalidades.map(m => m.id),
      ativo: professor.ativo,
    } : {
      unidadeId: unidadeIdPadrao as unknown as number,
      ativo: true,
      modalidadeIds: [] as number[],
    } as Form,
  })

  const unidadeIdSel = watch('unidadeId')

  useEffect(() => {
    if (!professor && !restritoUnidade && unidades.length === 1) {
      setValue('unidadeId', unidades[0].id)
    }
  }, [professor, unidades, restritoUnidade, setValue])

  const modalidadesFiltradas = modalidades.filter(m => !unidadeIdSel || m.unidadeId === Number(unidadeIdSel))

  return (
    <Modal
      open onClose={onClose}
      titulo={professor ? 'Editar professor' : 'Novo professor'}
      tamanho="lg"
      rodape={
        <>
          <Button variante="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit(onSubmit)} loading={salvando}>{professor ? 'Salvar' : 'Cadastrar'}</Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        {!professor && !restritoUnidade && (
          <Field label="Unidade" erro={errors.unidadeId?.message} obrigatorio>
            <Select {...register('unidadeId')}>
              <option value="">Selecione…</option>
              {unidades.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
            </Select>
          </Field>
        )}
        <Field label="Nome" erro={errors.nome?.message} obrigatorio>
          <Input {...register('nome')} />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="CPF" erro={errors.cpf?.message}>
            <Input {...register('cpf')} inputMode="numeric" autoComplete="off" placeholder="000.000.000-00" />
          </Field>
          <Field label="Telefone" erro={errors.telefone?.message} obrigatorio>
            <Input {...register('telefone')} type="tel" inputMode="tel" autoComplete="tel" placeholder="(11) 99999-0000" />
          </Field>
        </div>
        <Field label="Email" erro={errors.email?.message}>
          <Input {...register('email')} type="email" inputMode="email" autoComplete="email" />
        </Field>
        <Field label="Modalidades">
          <Controller
            control={control}
            name="modalidadeIds"
            render={({ field }) => (
              <div className="flex flex-wrap gap-2">
                {modalidadesFiltradas.map(m => {
                  const selecionada = field.value?.includes(m.id) ?? false
                  return (
                    <button
                      type="button"
                      key={m.id}
                      onClick={() => {
                        const atual = field.value ?? []
                        field.onChange(selecionada ? atual.filter(id => id !== m.id) : [...atual, m.id])
                      }}
                      className={`text-sm px-3 py-1.5 rounded-full border transition ${
                        selecionada
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-300 text-slate-700 hover:border-slate-500'
                      }`}
                    >
                      {m.nome}
                    </button>
                  )
                })}
                {modalidadesFiltradas.length === 0 && (
                  <span className="text-xs text-slate-500">
                    {unidadeIdSel ? 'Cadastre modalidades nesta unidade primeiro.' : 'Selecione a unidade.'}
                  </span>
                )}
              </div>
            )}
          />
        </Field>
        <Field label="Observações">
          <Textarea {...register('observacoes')} rows={3} />
        </Field>
        {professor && (
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" {...register('ativo')} className="rounded border-slate-300" />
            Professor ativo
          </label>
        )}
        {erro && <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{erro}</div>}
      </form>
    </Modal>
  )
}

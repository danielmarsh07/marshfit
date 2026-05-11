import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Phone, User } from 'lucide-react'
import { api } from '@/services/api'
import { Modal } from '@/components/ui/Modal'
import { Field, Input, Select, Textarea } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { mensagemDeErro } from '@/lib/erro'

type AlunoStatus = 'ATIVO' | 'INATIVO' | 'CONGELADO' | 'INADIMPLENTE'

interface Aluno {
  id: number
  nome: string
  cpf: string | null
  email: string | null
  telefone: string
  status: AlunoStatus
  unidade: { id: number; nome: string }
  matriculas: { plano: { id: number; nome: string; valor: string } }[]
}

interface ListaAlunos { total: number; page: number; limit: number; alunos: Aluno[] }
interface UnidadeSimples { id: number; nome: string }

const schema = z.object({
  unidadeId:   z.coerce.number().int().positive('Selecione a unidade'),
  nome:        z.string().min(2).max(120),
  cpf:         z.string().max(20).optional(),
  dataNasc:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD').optional().or(z.literal('')),
  sexo:        z.enum(['M', 'F', 'OUTRO']).optional().or(z.literal('')),
  email:       z.string().email('Email inválido').optional().or(z.literal('')),
  telefone:    z.string().min(8).max(20),
  endereco:    z.string().max(200).optional(),
  bairro:      z.string().max(120).optional(),
  cidade:      z.string().max(120).optional(),
  estado:      z.string().length(2).optional().or(z.literal('')),
  observacoes: z.string().max(2000).optional(),
})
type Form = z.infer<typeof schema>

const STATUS_CORES: Record<AlunoStatus, string> = {
  ATIVO:        'bg-green-100 text-green-700',
  INATIVO:      'bg-slate-100 text-slate-500',
  CONGELADO:    'bg-blue-100 text-blue-700',
  INADIMPLENTE: 'bg-amber-100 text-amber-700',
}

export function AlunosPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [modal, setModal] = useState(false)
  const [busca, setBusca] = useState('')
  const [statusFiltro, setStatusFiltro] = useState<AlunoStatus | ''>('')

  const { data, isLoading } = useQuery({
    queryKey: ['alunos', busca, statusFiltro],
    queryFn: async () => {
      const p = new URLSearchParams()
      if (busca) p.set('busca', busca)
      if (statusFiltro) p.set('status', statusFiltro)
      return (await api.get<ListaAlunos>(`/alunos?${p.toString()}`)).data
    },
  })

  const { data: unidades = [] } = useQuery({
    queryKey: ['unidades', 'ativas'],
    queryFn: async () => (await api.get<UnidadeSimples[]>('/unidades?ativo=true')).data,
  })

  const criar = useMutation({
    mutationFn: async (data: Form) => {
      const payload = {
        ...data,
        email: data.email || undefined,
        dataNasc: data.dataNasc || undefined,
        sexo: data.sexo || undefined,
        estado: data.estado || undefined,
      }
      return api.post('/alunos', payload)
    },
    onSuccess: (resp) => {
      qc.invalidateQueries({ queryKey: ['alunos'] })
      setModal(false)
      navigate(`/alunos/${resp.data.id}`)
    },
  })

  const alunos = data?.alunos ?? []

  return (
    <div>
      <PageHeader
        titulo="Alunos"
        descricao={`${data?.total ?? 0} aluno(s) cadastrado(s).`}
        acoes={<Button onClick={() => setModal(true)} disabled={unidades.length === 0}>
          <Plus className="h-4 w-4" /> Novo aluno
        </Button>}
      />

      <div className="flex flex-wrap gap-2 mb-4">
        <Input
          placeholder="Buscar por nome, CPF, email ou telefone"
          value={busca}
          onChange={e => setBusca(e.target.value)}
          className="flex-1 min-w-[200px]"
        />
        <Select value={statusFiltro} onChange={e => setStatusFiltro(e.target.value as AlunoStatus | '')} className="max-w-[180px]">
          <option value="">Todos os status</option>
          <option value="ATIVO">Ativos</option>
          <option value="INADIMPLENTE">Inadimplentes</option>
          <option value="CONGELADO">Congelados</option>
          <option value="INATIVO">Inativos</option>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-sm text-slate-500">Carregando…</div>
      ) : alunos.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-600">
          Nenhum aluno encontrado.
        </div>
      ) : (
        <>
          {/* Tabela desktop */}
          <div className="hidden md:block bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Aluno</th>
                  <th className="px-4 py-3 font-medium">Unidade</th>
                  <th className="px-4 py-3 font-medium">Plano atual</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {alunos.map(a => (
                  <tr key={a.id}
                    onClick={() => navigate(`/alunos/${a.id}`)}
                    className="border-t border-slate-100 hover:bg-slate-50 cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{a.nome}</div>
                      <div className="text-xs text-slate-500">{a.telefone}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{a.unidade.nome}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {a.matriculas[0]?.plano.nome ?? <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_CORES[a.status]}`}>
                        {a.status.toLowerCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cards mobile */}
          <div className="md:hidden space-y-2">
            {alunos.map(a => (
              <button key={a.id}
                onClick={() => navigate(`/alunos/${a.id}`)}
                className="w-full text-left bg-white rounded-xl border border-slate-200 p-4 active:bg-slate-50"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-2">
                    <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center mt-0.5">
                      <User className="h-4 w-4 text-slate-500" />
                    </div>
                    <div>
                      <div className="font-medium text-slate-900">{a.nome}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><Phone className="h-3 w-3" /> {a.telefone}</div>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_CORES[a.status]}`}>
                    {a.status.toLowerCase()}
                  </span>
                </div>
                <div className="text-xs text-slate-500 mt-2">
                  {a.unidade.nome} {a.matriculas[0]?.plano.nome && ` · ${a.matriculas[0]?.plano.nome}`}
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {modal && (
        <NovoAlunoModal
          unidades={unidades}
          onClose={() => setModal(false)}
          onSubmit={(d) => criar.mutate(d)}
          salvando={criar.isPending}
          erro={criar.error ? mensagemDeErro(criar.error) : null}
        />
      )}
    </div>
  )
}

function NovoAlunoModal({
  unidades, onClose, onSubmit, salvando, erro,
}: {
  unidades: UnidadeSimples[]
  onClose: () => void
  onSubmit: (d: Form) => void
  salvando: boolean
  erro: string | null
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: unidades.length === 1 ? { unidadeId: unidades[0].id } as Form : undefined,
  })

  return (
    <Modal
      open onClose={onClose} titulo="Novo aluno" tamanho="lg"
      rodape={
        <>
          <Button variante="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit(onSubmit)} loading={salvando}>Cadastrar</Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <Field label="Unidade" erro={errors.unidadeId?.message} obrigatorio>
          <Select {...register('unidadeId')}>
            <option value="">Selecione…</option>
            {unidades.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
          </Select>
        </Field>
        <Field label="Nome completo" erro={errors.nome?.message} obrigatorio>
          <Input {...register('nome')} />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="CPF" erro={errors.cpf?.message}>
            <Input {...register('cpf')} placeholder="000.000.000-00" />
          </Field>
          <Field label="Data nascimento" erro={errors.dataNasc?.message}>
            <Input {...register('dataNasc')} type="date" />
          </Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Sexo" erro={errors.sexo?.message}>
            <Select {...register('sexo')}>
              <option value="">—</option>
              <option value="M">Masculino</option>
              <option value="F">Feminino</option>
              <option value="OUTRO">Outro</option>
            </Select>
          </Field>
          <Field label="Telefone" erro={errors.telefone?.message} obrigatorio>
            <Input {...register('telefone')} placeholder="(11) 99999-0000" />
          </Field>
        </div>
        <Field label="Email" erro={errors.email?.message}>
          <Input {...register('email')} type="email" />
        </Field>
        <Field label="Endereço">
          <Input {...register('endereco')} />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Bairro"><Input {...register('bairro')} /></Field>
          <Field label="Cidade"><Input {...register('cidade')} /></Field>
          <Field label="UF"><Input {...register('estado')} maxLength={2} /></Field>
        </div>
        <Field label="Observações"><Textarea {...register('observacoes')} rows={2} /></Field>
        {erro && <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{erro}</div>}
      </form>
    </Modal>
  )
}

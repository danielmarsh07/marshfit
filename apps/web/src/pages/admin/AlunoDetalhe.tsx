import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Plus, User, Phone, Mail, MapPin, KeyRound, Copy, Check as CheckIcon } from 'lucide-react'
import { api } from '@/services/api'
import { Modal } from '@/components/ui/Modal'
import { Field, Input, Select, Textarea } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { mensagemDeErro } from '@/lib/erro'

type AlunoStatus = 'ATIVO' | 'INATIVO' | 'CONGELADO' | 'INADIMPLENTE'

interface Aluno {
  id: number
  nome: string
  cpf: string | null
  dataNasc: string | null
  sexo: 'M' | 'F' | 'OUTRO' | null
  email: string | null
  telefone: string
  endereco: string | null
  bairro: string | null
  cidade: string | null
  estado: string | null
  observacoes: string | null
  status: AlunoStatus
  usuarioId: number | null
  unidade: { id: number; nome: string }
  matriculas: Matricula[]
}

interface Matricula {
  id: number
  dataInicio: string
  dataFim: string | null
  proxVencto: string
  status: 'ATIVA' | 'SUSPENSA' | 'CANCELADA' | 'TRANCADA'
  plano: { id: number; nome: string; valor: string; periodicidade: string }
  observacao: string | null
}

interface PlanoSimples { id: number; nome: string; valor: string }

const matriculaSchema = z.object({
  planoId:    z.coerce.number().int().positive('Selecione o plano'),
  dataInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  observacao: z.string().max(2000).optional(),
})
type MatriculaForm = z.infer<typeof matriculaSchema>

const STATUS_CORES: Record<AlunoStatus, string> = {
  ATIVO: 'bg-green-100 text-green-700',
  INATIVO: 'bg-slate-100 text-slate-500',
  CONGELADO: 'bg-blue-100 text-blue-700',
  INADIMPLENTE: 'bg-amber-100 text-amber-700',
}

function formatarBRL(v: string | number) {
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function formatarData(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR')
}

export function AlunoDetalhe() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const alunoId = Number(id)
  const [modalMatricula, setModalMatricula] = useState(false)
  const [modalAcesso, setModalAcesso] = useState(false)

  const { data: aluno, isLoading } = useQuery({
    queryKey: ['aluno', alunoId],
    queryFn: async () => (await api.get<Aluno>(`/alunos/${alunoId}`)).data,
  })

  const { data: planos = [] } = useQuery({
    queryKey: ['planos', 'ativos'],
    queryFn: async () => (await api.get<PlanoSimples[]>('/planos?ativo=true')).data,
  })

  const matricular = useMutation({
    mutationFn: async (data: MatriculaForm) => api.post('/matriculas', { ...data, alunoId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['aluno', alunoId] })
      qc.invalidateQueries({ queryKey: ['alunos'] })
      setModalMatricula(false)
    },
  })

  const alterarStatus = useMutation({
    mutationFn: async ({ matriculaId, status }: { matriculaId: number; status: Matricula['status'] }) =>
      api.patch(`/matriculas/${matriculaId}/status`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['aluno', alunoId] })
      qc.invalidateQueries({ queryKey: ['alunos'] })
    },
  })

  if (isLoading || !aluno) return <div className="text-sm text-slate-500">Carregando…</div>

  const matriculaAtiva = aluno.matriculas.find(m => m.status === 'ATIVA')

  return (
    <div>
      <Link to="/alunos" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 mb-4">
        <ArrowLeft className="h-4 w-4" /> voltar para alunos
      </Link>

      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-5">
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 rounded-full bg-slate-100 flex items-center justify-center">
            <User className="h-7 w-7 text-slate-500" />
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-slate-900">{aluno.nome}</h1>
              <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_CORES[aluno.status]}`}>
                {aluno.status.toLowerCase()}
              </span>
            </div>
            <div className="text-sm text-slate-600 mt-1 flex flex-wrap gap-x-4 gap-y-1">
              <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {aluno.telefone}</span>
              {aluno.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {aluno.email}</span>}
              {aluno.cidade && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {aluno.cidade}/{aluno.estado}</span>}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Unidade: <strong>{aluno.unidade.nome}</strong>
              {aluno.cpf && <> · CPF: {aluno.cpf}</>}
              {aluno.dataNasc && <> · Nascimento: {formatarData(aluno.dataNasc)}</>}
            </div>
          </div>
        </div>
        {aluno.observacoes && (
          <div className="mt-4 pt-4 border-t border-slate-200 text-sm text-slate-700">
            <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">Observações</div>
            {aluno.observacoes}
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-slate-200 flex flex-wrap items-center gap-2 text-sm">
          <KeyRound className="h-4 w-4 text-slate-400" />
          {aluno.usuarioId ? (
            <>
              <span className="text-slate-700">Aluno tem acesso ao portal</span>
              <Button tamanho="sm" variante="secondary" onClick={() => setModalAcesso(true)}>
                Resetar senha
              </Button>
            </>
          ) : (
            <>
              <span className="text-slate-500">Aluno ainda sem acesso ao portal</span>
              <Button tamanho="sm" onClick={() => setModalAcesso(true)} disabled={!aluno.email}>
                Criar acesso
              </Button>
              {!aluno.email && <span className="text-xs text-amber-600">(cadastre o email primeiro)</span>}
            </>
          )}
        </div>
      </div>

      {/* Plano ativo */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-slate-900">Plano atual</h2>
          <Button tamanho="sm" onClick={() => setModalMatricula(true)} disabled={planos.length === 0}>
            <Plus className="h-3.5 w-3.5" /> {matriculaAtiva ? 'Trocar plano' : 'Matricular'}
          </Button>
        </div>
        {matriculaAtiva ? (
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="text-lg font-bold text-slate-900">{matriculaAtiva.plano.nome}</div>
              <div className="text-sm text-slate-600">{formatarBRL(matriculaAtiva.plano.valor)} / {matriculaAtiva.plano.periodicidade.toLowerCase()}</div>
              <div className="text-xs text-slate-500 mt-1">
                Início: {formatarData(matriculaAtiva.dataInicio)} · Próx. vencimento: {formatarData(matriculaAtiva.proxVencto)}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variante="secondary" tamanho="sm" onClick={() => alterarStatus.mutate({ matriculaId: matriculaAtiva.id, status: 'TRANCADA' })}>
                Congelar
              </Button>
              <Button variante="danger" tamanho="sm" onClick={() => alterarStatus.mutate({ matriculaId: matriculaAtiva.id, status: 'CANCELADA' })}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-sm text-slate-500">Aluno sem matrícula ativa.</div>
        )}
      </div>

      {/* Histórico */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="font-semibold text-slate-900 mb-3">Histórico de matrículas</h2>
        {aluno.matriculas.length === 0 ? (
          <div className="text-sm text-slate-500">Sem matrículas no histórico.</div>
        ) : (
          <div className="space-y-2">
            {aluno.matriculas.map(m => (
              <div key={m.id} className="border border-slate-200 rounded-lg p-3 text-sm">
                <div className="flex items-start justify-between flex-wrap gap-2">
                  <div>
                    <div className="font-medium text-slate-900">{m.plano.nome}</div>
                    <div className="text-xs text-slate-500">
                      {formatarData(m.dataInicio)} — {m.dataFim ? formatarData(m.dataFim) : 'em aberto'}
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${m.status === 'ATIVA' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                    {m.status.toLowerCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modalMatricula && (
        <NovaMatriculaModal
          planos={planos}
          onClose={() => setModalMatricula(false)}
          onSubmit={(d) => matricular.mutate(d)}
          salvando={matricular.isPending}
          erro={matricular.error ? mensagemDeErro(matricular.error) : null}
        />
      )}

      {modalAcesso && (
        <AcessoModal aluno={aluno} onClose={() => setModalAcesso(false)} />
      )}
    </div>
  )
}

function AcessoModal({ aluno, onClose }: { aluno: Aluno; onClose: () => void }) {
  const qc = useQueryClient()
  const [senha, setSenha] = useState(() => gerarSenhaProvisoria())
  const [copiada, setCopiada] = useState(false)
  const [resultado, setResultado] = useState<{ email: string; novo: boolean } | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  const gerar = useMutation({
    mutationFn: async () => api.post<{ email: string; novo: boolean }>(`/alunos/${aluno.id}/acesso`, { senha }),
    onSuccess: (r) => {
      setResultado(r.data)
      qc.invalidateQueries({ queryKey: ['aluno', aluno.id] })
    },
    onError: (e) => setErro(mensagemDeErro(e)),
  })

  async function copiar() {
    if (!resultado) return
    const texto = `Acesso ao MarshFit\nE-mail: ${resultado.email}\nSenha: ${senha}\nLink: ${window.location.origin}/login`
    try {
      await navigator.clipboard.writeText(texto)
      setCopiada(true)
      setTimeout(() => setCopiada(false), 2000)
    } catch { /* ignore */ }
  }

  return (
    <Modal
      open onClose={onClose}
      titulo={aluno.usuarioId ? 'Resetar senha do aluno' : 'Criar acesso do aluno'}
      rodape={
        resultado ? (
          <Button onClick={onClose}>Fechar</Button>
        ) : (
          <>
            <Button variante="secondary" onClick={onClose}>Cancelar</Button>
            <Button onClick={() => { setErro(null); gerar.mutate() }} loading={gerar.isPending} disabled={!aluno.email}>
              {aluno.usuarioId ? 'Resetar senha' : 'Criar acesso'}
            </Button>
          </>
        )
      }
    >
      {!aluno.email ? (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">
          O aluno precisa ter um email cadastrado para receber acesso. Edite o cadastro e adicione o email primeiro.
        </div>
      ) : resultado ? (
        <div className="space-y-3">
          <div className="rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700">
            {resultado.novo ? 'Acesso criado!' : 'Senha resetada!'} Envie estes dados para o aluno:
          </div>
          <div className="bg-slate-900 text-slate-100 rounded-lg p-3 text-sm font-mono space-y-1">
            <div><span className="text-slate-400">E-mail:</span> {resultado.email}</div>
            <div><span className="text-slate-400">Senha:</span> {senha}</div>
          </div>
          <Button onClick={copiar} variante="secondary" className="w-full">
            {copiada ? <><CheckIcon className="h-4 w-4" /> Copiado!</> : <><Copy className="h-4 w-4" /> Copiar dados</>}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="text-sm text-slate-700">
            E-mail: <strong>{aluno.email}</strong>
          </div>
          <Field label="Senha provisória" obrigatorio hint="O aluno poderá trocar depois.">
            <div className="flex gap-2">
              <Input value={senha} onChange={(e) => setSenha(e.target.value)} className="flex-1" />
              <Button variante="secondary" tamanho="sm" onClick={() => setSenha(gerarSenhaProvisoria())}>
                Gerar
              </Button>
            </div>
          </Field>
          {aluno.usuarioId && (
            <div className="text-xs text-slate-500">Esse aluno já tem acesso. Salvar substitui a senha atual.</div>
          )}
          {erro && <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{erro}</div>}
        </div>
      )}
    </Modal>
  )
}

function gerarSenhaProvisoria(): string {
  const letras = 'abcdefghjkmnpqrstuvwxyz'   // sem ambíguos
  const numeros = '23456789'
  let s = ''
  for (let i = 0; i < 4; i++) s += letras[Math.floor(Math.random() * letras.length)]
  for (let i = 0; i < 4; i++) s += numeros[Math.floor(Math.random() * numeros.length)]
  return s
}

function NovaMatriculaModal({
  planos, onClose, onSubmit, salvando, erro,
}: {
  planos: PlanoSimples[]
  onClose: () => void
  onSubmit: (d: MatriculaForm) => void
  salvando: boolean
  erro: string | null
}) {
  const hoje = new Date().toISOString().slice(0, 10)
  const { register, handleSubmit, formState: { errors } } = useForm<MatriculaForm>({
    resolver: zodResolver(matriculaSchema),
    defaultValues: { dataInicio: hoje },
  })

  return (
    <Modal
      open onClose={onClose} titulo="Nova matrícula"
      rodape={
        <>
          <Button variante="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit(onSubmit)} loading={salvando}>Matricular</Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <Field label="Plano" erro={errors.planoId?.message} obrigatorio>
          <Select {...register('planoId')}>
            <option value="">Selecione…</option>
            {planos.map(p => (
              <option key={p.id} value={p.id}>
                {p.nome} — {formatarBRL(p.valor)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Data de início" erro={errors.dataInicio?.message} obrigatorio>
          <Input {...register('dataInicio')} type="date" />
        </Field>
        <Field label="Observação"><Textarea {...register('observacao')} rows={2} /></Field>
        <div className="text-xs text-slate-500 bg-slate-50 rounded-lg p-3">
          Ao matricular, qualquer matrícula ativa anterior é encerrada automaticamente.
        </div>
        {erro && <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{erro}</div>}
      </form>
    </Modal>
  )
}

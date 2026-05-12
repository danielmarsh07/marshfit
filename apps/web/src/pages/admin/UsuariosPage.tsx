import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, KeyRound, ShieldOff, Shield, MapPin } from 'lucide-react'
import { api } from '@/services/api'
import { Modal } from '@/components/ui/Modal'
import { Field, Input, Select } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { mensagemDeErro } from '@/lib/erro'

type Papel = 'ADMIN_ACADEMIA' | 'GESTOR_UNIDADE' | 'FINANCEIRO' | 'PROFESSOR' | 'RECEPCAO' | 'SUPER_ADMIN'

const PAPEIS_COM_UNIDADE: Papel[] = ['GESTOR_UNIDADE', 'PROFESSOR', 'RECEPCAO']

const LABEL_PAPEL: Record<Papel, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN_ACADEMIA: 'Admin Academia',
  GESTOR_UNIDADE: 'Gestor de Unidade',
  FINANCEIRO: 'Financeiro',
  PROFESSOR: 'Professor',
  RECEPCAO: 'Recepção',
}

interface Unidade { id: number; nome: string }

interface UsuarioVinculo {
  usuarioId: number
  nome: string
  email: string
  papel: Papel
  unidadeId: number | null
  unidadeNome: string | null
  ativo: boolean
  ultimoLogin: string | null
}

const schema = z.object({
  nome:      z.string().min(2).max(120),
  email:     z.string().email('Email inválido'),
  senha:     z.string().min(6, 'Mínimo 6 caracteres').max(72),
  papel:     z.enum(['ADMIN_ACADEMIA', 'GESTOR_UNIDADE', 'FINANCEIRO', 'PROFESSOR', 'RECEPCAO']),
  unidadeId: z.coerce.number().int().positive().optional()
              .or(z.literal('')).transform(v => v === '' || v === undefined ? undefined : Number(v)),
})
type Form = z.infer<typeof schema>

export function UsuariosPage() {
  const qc = useQueryClient()
  const [modal, setModal] = useState(false)
  const [resetando, setResetando] = useState<UsuarioVinculo | null>(null)

  const { data: usuarios = [], isLoading } = useQuery({
    queryKey: ['usuarios'],
    queryFn: async () => (await api.get<UsuarioVinculo[]>('/usuarios')).data,
  })

  const { data: unidades = [] } = useQuery({
    queryKey: ['unidades', 'ativas'],
    queryFn: async () => (await api.get<Unidade[]>('/unidades?ativo=true')).data,
  })

  const convidar = useMutation({
    mutationFn: async (data: Form) => api.post('/usuarios', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['usuarios'] }); setModal(false) },
  })

  const alternarAtivo = useMutation({
    mutationFn: async (v: { id: number; ativo: boolean }) => api.patch(`/usuarios/${v.id}/ativo`, { ativo: v.ativo }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['usuarios'] }),
  })

  return (
    <div>
      <PageHeader
        titulo="Usuários"
        descricao="Equipe com acesso ao sistema. Convide gestores, professores e recepção."
        acoes={<Button onClick={() => setModal(true)}><Plus className="h-4 w-4" /> Convidar usuário</Button>}
      />

      {isLoading ? (
        <div className="text-sm text-slate-500">Carregando…</div>
      ) : usuarios.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-600">
          Nenhum usuário cadastrado nessa academia.
        </div>
      ) : (
        <>
          {/* Tabela desktop */}
          <div className="hidden md:block bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Nome</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Papel</th>
                  <th className="px-4 py-3 font-medium">Unidade</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map(u => (
                  <tr key={u.usuarioId} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-medium text-slate-900">{u.nome}</td>
                    <td className="px-4 py-3 text-slate-700">{u.email}</td>
                    <td className="px-4 py-3 text-slate-700">{LABEL_PAPEL[u.papel]}</td>
                    <td className="px-4 py-3 text-slate-700">{u.unidadeNome ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${u.ativo ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                        {u.ativo ? 'Ativo' : 'Desabilitado'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {u.papel !== 'SUPER_ADMIN' && (
                        <>
                          <Button variante="ghost" tamanho="sm" onClick={() => setResetando(u)}>
                            <KeyRound className="h-4 w-4" />
                          </Button>
                          <Button
                            variante="ghost"
                            tamanho="sm"
                            onClick={() => alternarAtivo.mutate({ id: u.usuarioId, ativo: !u.ativo })}
                          >
                            {u.ativo ? <ShieldOff className="h-4 w-4 text-red-600" /> : <Shield className="h-4 w-4 text-green-600" />}
                          </Button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cards mobile */}
          <div className="md:hidden space-y-2">
            {usuarios.map(u => (
              <div key={u.usuarioId} className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-slate-900 truncate">{u.nome}</div>
                    <div className="text-xs text-slate-600 truncate">{u.email}</div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${u.ativo ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                    {u.ativo ? 'Ativo' : 'Off'}
                  </span>
                </div>
                <div className="text-xs text-slate-700 mt-2 flex items-center gap-3 flex-wrap">
                  <span>{LABEL_PAPEL[u.papel]}</span>
                  {u.unidadeNome && (
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {u.unidadeNome}</span>
                  )}
                </div>
                {u.papel !== 'SUPER_ADMIN' && (
                  <div className="flex gap-2 mt-3">
                    <Button variante="ghost" tamanho="sm" onClick={() => setResetando(u)}>
                      <KeyRound className="h-4 w-4" /> Senha
                    </Button>
                    <Button
                      variante="ghost"
                      tamanho="sm"
                      onClick={() => alternarAtivo.mutate({ id: u.usuarioId, ativo: !u.ativo })}
                    >
                      {u.ativo ? 'Desabilitar' : 'Habilitar'}
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {modal && (
        <ConvidarModal
          unidades={unidades}
          onClose={() => setModal(false)}
          onSubmit={(d) => convidar.mutate(d)}
          salvando={convidar.isPending}
          erro={convidar.error ? mensagemDeErro(convidar.error) : null}
        />
      )}

      {resetando && (
        <ResetarSenhaModal
          usuario={resetando}
          onClose={() => setResetando(null)}
        />
      )}
    </div>
  )
}

function ConvidarModal({
  unidades, onClose, onSubmit, salvando, erro,
}: {
  unidades: Unidade[]
  onClose: () => void
  onSubmit: (d: Form) => void
  salvando: boolean
  erro: string | null
}) {
  const { register, handleSubmit, watch, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { papel: 'GESTOR_UNIDADE' } as Form,
  })

  const papel = watch('papel')
  const exigeUnidade = PAPEIS_COM_UNIDADE.includes(papel)

  function handle(d: Form) {
    // Strip unidadeId se papel não usa.
    const payload = exigeUnidade ? d : { ...d, unidadeId: undefined }
    onSubmit(payload)
  }

  return (
    <Modal
      open onClose={onClose}
      titulo="Convidar usuário"
      rodape={
        <>
          <Button variante="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit(handle)} loading={salvando}>Convidar</Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(handle)} className="space-y-3">
        <Field label="Nome" erro={errors.nome?.message} obrigatorio>
          <Input {...register('nome')} placeholder="João da Silva" />
        </Field>
        <Field label="Email" erro={errors.email?.message} obrigatorio>
          <Input {...register('email')} type="email" placeholder="joao@boxpiloto.com.br" />
        </Field>
        <Field label="Senha inicial" hint="O usuário poderá trocar depois." erro={errors.senha?.message} obrigatorio>
          <Input {...register('senha')} type="text" placeholder="Mínimo 6 caracteres" />
        </Field>
        <Field label="Papel" erro={errors.papel?.message} obrigatorio>
          <Select {...register('papel')}>
            <option value="ADMIN_ACADEMIA">Admin da academia (acesso total)</option>
            <option value="GESTOR_UNIDADE">Gestor de unidade</option>
            <option value="FINANCEIRO">Financeiro</option>
            <option value="PROFESSOR">Professor</option>
            <option value="RECEPCAO">Recepção</option>
          </Select>
        </Field>
        {exigeUnidade && (
          <Field label="Unidade" hint="Esse papel é restrito a uma unidade." erro={errors.unidadeId?.message} obrigatorio>
            <Select {...register('unidadeId')}>
              <option value="">Selecione…</option>
              {unidades.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
            </Select>
          </Field>
        )}
        {erro && <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{erro}</div>}
      </form>
    </Modal>
  )
}

function ResetarSenhaModal({ usuario, onClose }: { usuario: UsuarioVinculo; onClose: () => void }) {
  const qc = useQueryClient()
  const [senha, setSenha] = useState('')
  const resetar = useMutation({
    mutationFn: async () => api.post(`/usuarios/${usuario.usuarioId}/resetar-senha`, { senha }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['usuarios'] }); onClose() },
  })

  return (
    <Modal
      open onClose={onClose} titulo={`Resetar senha — ${usuario.nome}`}
      rodape={
        <>
          <Button variante="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => resetar.mutate()} loading={resetar.isPending} disabled={senha.length < 6}>
            Resetar
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-slate-600">
          Defina uma nova senha para <strong>{usuario.email}</strong>. Repasse para o usuário usar.
        </p>
        <Field label="Nova senha" obrigatorio>
          <Input value={senha} onChange={(e) => setSenha(e.target.value)} type="text" placeholder="Mínimo 6 caracteres" />
        </Field>
        {resetar.error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            {mensagemDeErro(resetar.error)}
          </div>
        )}
      </div>
    </Modal>
  )
}

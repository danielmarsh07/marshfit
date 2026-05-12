import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { Dumbbell, Loader2, ArrowLeft, Check } from 'lucide-react'
import { api } from '@/services/api'
import { useAuthStore } from '@/stores/auth.store'
import { APP_VERSION } from '@/changelog'

const schema = z.object({
  nomeAcademia:     z.string().min(2, 'Informe o nome da academia').max(120),
  cnpjCpf:          z.string().min(11, 'CNPJ ou CPF inválido').max(20),
  emailAcademia:    z.string().email('Email da academia inválido'),
  telefoneAcademia: z.string().min(8, 'Telefone inválido').max(20),
  nomeAdmin:        z.string().min(2, 'Informe seu nome').max(120),
  emailAdmin:       z.string().email('Seu email é inválido'),
  senha:            z.string().min(6, 'Mínimo 6 caracteres'),
  confirmacao:      z.string().min(6, 'Confirme a senha'),
}).refine(d => d.senha === d.confirmacao, {
  message: 'As senhas não coincidem',
  path: ['confirmacao'],
})

type FormData = z.infer<typeof schema>

export function CadastroPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore(s => s.setAuth)
  const [erro, setErro] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    setErro(null)
    try {
      const { confirmacao: _ignored, ...payload } = data
      const resp = await api.post('/academias/registrar', payload)
      setAuth(resp.data.accessToken, resp.data.usuario, resp.data.vinculo)
      navigate('/')
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string, detalhes?: Record<string, string[]> } } }
      const detalhes = err.response?.data?.detalhes
      if (detalhes) {
        // Pega a primeira mensagem de campo para exibir.
        const primeiro = Object.values(detalhes).flat()[0]
        setErro(primeiro ?? 'Verifique os dados informados.')
      } else {
        setErro(err.response?.data?.error ?? 'Não foi possível criar a conta. Tente novamente.')
      }
    }
  }

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Coluna de apresentação (desktop) */}
      <aside className="hidden lg:flex lg:w-1/2 bg-slate-900 text-white p-12 flex-col justify-between relative overflow-hidden">
        <div>
          <div className="flex items-center gap-2 font-semibold">
            <div className="h-9 w-9 rounded-lg bg-brand-500 flex items-center justify-center">
              <Dumbbell className="h-5 w-5 text-slate-900" />
            </div>
            <span>MarshFit</span>
          </div>
        </div>

        <div className="relative z-10 max-w-sm">
          <h2 className="text-3xl font-bold leading-tight">Comece grátis. Sem cartão.</h2>
          <p className="mt-4 text-slate-300">
            14 dias para você organizar a operação da sua academia com a gente.
            Cancele quando quiser.
          </p>
          <ul className="mt-6 space-y-2 text-sm text-slate-200">
            {[
              'Cadastro de alunos, planos e aulas',
              'Check-in mobile pelo aluno e professor',
              'Financeiro e mensalidades',
              'Portal do aluno completo',
              'Suporte humano da Marsh',
            ].map(item => (
              <li key={item} className="flex items-center gap-2">
                <Check className="h-4 w-4 text-brand-500" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="text-xs text-slate-500 relative z-10">MarshFit {APP_VERSION} · Marsh Consultoria</div>

        <div className="absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-brand-500/20 blur-3xl" />
      </aside>

      {/* Formulário */}
      <main className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-xl">
          <Link to="/login" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 mb-4">
            <ArrowLeft className="h-4 w-4" /> voltar ao login
          </Link>

          <h1 className="text-2xl font-bold text-slate-900">Crie sua conta</h1>
          <p className="text-sm text-slate-500 mt-1">
            Comece o teste gratuito de 14 dias do MarshFit.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-5">
            <Section titulo="Dados da academia">
              <Campo label="Nome da academia/box" erro={errors.nomeAcademia?.message}>
                <input
                  type="text"
                  autoComplete="organization"
                  placeholder="Ex: Box Pilot CrossFit"
                  {...register('nomeAcademia')}
                  className={baseInput}
                />
              </Campo>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Campo label="CNPJ ou CPF" erro={errors.cnpjCpf?.message}>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="00.000.000/0001-00"
                    {...register('cnpjCpf')}
                    className={baseInput}
                  />
                </Campo>
                <Campo label="Telefone" erro={errors.telefoneAcademia?.message}>
                  <input
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="(11) 99999-0000"
                    {...register('telefoneAcademia')}
                    className={baseInput}
                  />
                </Campo>
              </div>

              <Campo label="Email da academia" erro={errors.emailAcademia?.message}>
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="contato@suaacademia.com.br"
                  {...register('emailAcademia')}
                  className={baseInput}
                />
              </Campo>
            </Section>

            <Section titulo="Sua conta de acesso">
              <Campo label="Seu nome" erro={errors.nomeAdmin?.message}>
                <input
                  type="text"
                  autoComplete="name"
                  placeholder="Como vamos te chamar"
                  {...register('nomeAdmin')}
                  className={baseInput}
                />
              </Campo>

              <Campo label="Seu email" erro={errors.emailAdmin?.message}>
                <input
                  type="email"
                  placeholder="voce@email.com"
                  autoComplete="email"
                  {...register('emailAdmin')}
                  className={baseInput}
                />
              </Campo>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Campo label="Senha" erro={errors.senha?.message}>
                  <input
                    type="password"
                    autoComplete="new-password"
                    {...register('senha')}
                    className={baseInput}
                  />
                </Campo>
                <Campo label="Confirme a senha" erro={errors.confirmacao?.message}>
                  <input
                    type="password"
                    autoComplete="new-password"
                    {...register('confirmacao')}
                    className={baseInput}
                  />
                </Campo>
              </div>
            </Section>

            {erro && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                {erro}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 text-white py-3 font-medium hover:bg-slate-800 disabled:opacity-60"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Criar conta e entrar
            </button>

            <p className="text-xs text-slate-500 text-center">
              Ao continuar, você concorda com os termos do serviço e a política de privacidade.
            </p>
          </form>
        </div>
      </main>
    </div>
  )
}

// ── Componentes locais ──────────────────────────────────────────────────

const baseInput =
  'w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-brand-500'

function Section({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-semibold text-slate-700 mb-2">{titulo}</legend>
      {children}
    </fieldset>
  )
}

function Campo({ label, erro, children }: { label: string; erro?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-slate-700 mb-1">{label}</span>
      {children}
      {erro && <span className="block text-sm text-red-600 mt-1">{erro}</span>}
    </label>
  )
}

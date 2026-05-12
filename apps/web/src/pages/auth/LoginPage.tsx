import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { Dumbbell, Loader2 } from 'lucide-react'
import { api } from '@/services/api'
import { useAuthStore, type VinculoAtivo, type UsuarioAuth } from '@/stores/auth.store'
import { useBrand } from '@/lib/brand'
import { APP_VERSION } from '@/changelog'

const schema = z.object({
  email: z.string().email('Email inválido'),
  senha: z.string().min(1, 'Senha obrigatória'),
})

type FormData = z.infer<typeof schema>

interface LoginResp {
  modo: 'autenticado' | 'escolher_academia'
  accessToken?: string
  usuario: UsuarioAuth
  vinculo?: VinculoAtivo
  vinculos?: VinculoAtivo[]
}

export function LoginPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore(s => s.setAuth)
  const brand = useBrand()
  const [erro, setErro] = useState<string | null>(null)
  const [vinculos, setVinculos] = useState<VinculoAtivo[] | null>(null)
  const [dadosLogin, setDadosLogin] = useState<FormData | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    setErro(null)
    try {
      const resp = await api.post<LoginResp>('/auth/login', data)
      if (resp.data.modo === 'autenticado' && resp.data.accessToken && resp.data.vinculo) {
        setAuth(resp.data.accessToken, resp.data.usuario, resp.data.vinculo)
        navigate('/')
        return
      }
      if (resp.data.modo === 'escolher_academia' && resp.data.vinculos) {
        setVinculos(resp.data.vinculos)
        setDadosLogin(data)
      }
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } }
      setErro(err.response?.data?.error ?? 'Não foi possível entrar. Tente novamente.')
    }
  }

  async function selecionarAcademia(v: VinculoAtivo) {
    if (!dadosLogin) return
    setErro(null)
    try {
      const resp = await api.post('/auth/selecionar-academia', {
        ...dadosLogin,
        academiaId: v.academiaId,
      })
      setAuth(resp.data.accessToken, resp.data.usuario, resp.data.vinculo)
      navigate('/')
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } }
      setErro(err.response?.data?.error ?? 'Erro ao selecionar academia.')
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-slate-50">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <div className="h-16 w-16 rounded-2xl themed-sidebar flex items-center justify-center mb-3 shadow-lg">
            <div className="h-10 w-10 rounded-xl themed-logo flex items-center justify-center">
              <Dumbbell className="h-6 w-6" />
            </div>
          </div>
          {brand.nomeComplemento ? (
            <h1 className="themed-brand-title text-2xl leading-tight text-center">
              <span style={{ color: 'var(--accent)' }}>{brand.nomeDestaque}</span>{' '}
              <span className="text-slate-900">{brand.nomeComplemento}</span>
            </h1>
          ) : (
            <h1 className="text-2xl font-bold text-slate-900">{brand.nome}</h1>
          )}
          <p className="text-sm text-slate-500 mt-1">{brand.slogan}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          {!vinculos ? (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-900">Entrar</h2>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  enterKeyHint="next"
                  className="w-full rounded-lg border border-slate-300 px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-brand-500"
                  {...register('email')}
                />
                {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Senha</label>
                <input
                  type="password"
                  autoComplete="current-password"
                  enterKeyHint="go"
                  className="w-full rounded-lg border border-slate-300 px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-brand-500"
                  {...register('senha')}
                />
                {errors.senha && <p className="text-xs text-red-600 mt-1">{errors.senha.message}</p>}
              </div>

              {erro && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                  {erro}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg themed-cta py-3 font-medium disabled:opacity-60"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Entrar
              </button>

              <div className="text-center text-sm text-slate-500">
                Ainda não tem conta?{' '}
                <Link to="/cadastro" className="text-slate-900 font-medium hover:underline">
                  Criar conta grátis
                </Link>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-slate-900">Escolha sua academia</h2>
              <p className="text-sm text-slate-500">Você tem acesso a mais de uma academia.</p>
              {vinculos.map(v => (
                <button
                  key={`${v.academiaId}-${v.papel}`}
                  onClick={() => selecionarAcademia(v)}
                  className="w-full text-left rounded-lg border border-slate-200 px-4 py-3 hover:border-slate-900 hover:bg-slate-50 transition"
                >
                  <div className="font-medium text-slate-900">{v.academiaNome}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {v.papel.replace('_', ' ').toLowerCase()}
                    {v.unidadeNome && ` · ${v.unidadeNome}`}
                  </div>
                </button>
              ))}
              <button
                onClick={() => { setVinculos(null); setDadosLogin(null) }}
                className="text-sm text-slate-500 hover:text-slate-900"
              >
                ← voltar
              </button>
              {erro && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                  {erro}
                </div>
              )}
            </div>
          )}
        </div>

        <p className="text-center text-xs text-slate-400 mt-4">{brand.nome} {APP_VERSION} · {brand.rodape}</p>
      </div>
    </div>
  )
}

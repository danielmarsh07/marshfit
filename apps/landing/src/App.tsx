import { useState } from 'react'
import { Dumbbell, Calendar, Users, Wallet, Smartphone, ShieldCheck, Check } from 'lucide-react'
import { LeadModal } from './LeadModal'

const PORTAL_URL = (import.meta.env.VITE_PORTAL_URL as string | undefined) ?? 'http://localhost:5174'

export function App() {
  const [origemLead, setOrigemLead] = useState<string | null>(null)
  const abrirLead = (origem: string) => () => setOrigemLead(origem)

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-200 sticky top-0 bg-white/90 backdrop-blur z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <a href="#" className="flex items-center gap-2 font-semibold">
            <div className="h-8 w-8 rounded-lg bg-slate-900 flex items-center justify-center">
              <Dumbbell className="h-4 w-4 text-brand-500" />
            </div>
            MarshFit
          </a>
          <nav className="hidden md:flex items-center gap-6 text-sm text-slate-600">
            <a href="#beneficios" className="hover:text-slate-900">Benefícios</a>
            <a href="#modulos"    className="hover:text-slate-900">Funcionalidades</a>
            <a href="#planos"     className="hover:text-slate-900">Planos</a>
            <a href="#faq"        className="hover:text-slate-900">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            <a href={`${PORTAL_URL}/login`} className="text-sm font-medium text-slate-700 hover:text-slate-900 px-3 py-2">
              Entrar
            </a>
            <a
              href={`${PORTAL_URL}/cadastro`}
              className="text-sm font-medium bg-slate-900 text-white rounded-lg px-4 py-2 hover:bg-slate-800"
            >
              Começar grátis
            </a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 md:py-24 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <span className="inline-block text-xs font-medium px-3 py-1 rounded-full bg-brand-500/15 text-brand-600 mb-4">
              Marsh Consultoria
            </span>
            <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 leading-tight">
              A gestão da sua academia, <span className="text-brand-600">sem fricção</span>.
            </h1>
            <p className="mt-5 text-lg text-slate-600 max-w-lg">
              MarshFit organiza alunos, aulas, planos, check-in e financeiro num único sistema —
              feito para boxes de crossfit, hyrox, estúdios de pilates, musculação e personal trainers.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a
                href={`${PORTAL_URL}/cadastro`}
                className="bg-slate-900 text-white font-medium rounded-lg px-6 py-3 hover:bg-slate-800"
              >
                Começar grátis
              </a>
              <button
                onClick={abrirLead('hero')}
                className="border border-slate-300 text-slate-900 font-medium rounded-lg px-6 py-3 hover:bg-slate-50"
              >
                Quero falar com a Marsh
              </button>
            </div>
            <div className="mt-6 text-xs text-slate-500">
              ✓ 14 dias grátis · ✓ Sem cartão de crédito · ✓ Suporte humano
            </div>
          </div>

          {/* Card preview */}
          <div className="relative">
            <div className="bg-slate-900 rounded-2xl shadow-xl p-6 text-white">
              <div className="text-xs uppercase tracking-wide text-slate-400">Aulas de hoje</div>
              <div className="mt-3 space-y-3">
                {[
                  { h: '06:00', m: 'CrossFit', p: 'Coach Bruno', v: '12/14' },
                  { h: '07:30', m: 'Hyrox',    p: 'Coach Léo',   v: '9/12' },
                  { h: '19:00', m: 'CrossFit', p: 'Coach Bruno', v: '14/14 · lista 3' },
                ].map((a) => (
                  <div key={a.h} className="flex items-center justify-between bg-slate-800/60 rounded-lg px-3 py-2.5">
                    <div>
                      <div className="text-sm font-medium">{a.h} — {a.m}</div>
                      <div className="text-xs text-slate-400">{a.p}</div>
                    </div>
                    <div className="text-xs px-2 py-1 rounded bg-brand-500/20 text-brand-500">{a.v}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="absolute -bottom-6 -right-6 h-24 w-24 rounded-full bg-brand-500/20 blur-2xl" />
          </div>
        </div>
      </section>

      {/* Benefícios */}
      <section id="beneficios" className="bg-slate-50 py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl font-bold text-slate-900 text-center">Tudo o que sua operação precisa</h2>
          <p className="text-slate-600 text-center mt-3 max-w-2xl mx-auto">
            Pensado pra resolver a operação diária da academia. Rápido no celular, simples na recepção, claro pro gestor.
          </p>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 mt-10">
            {[
              { icon: Users,       t: 'Alunos e matrícula',     d: 'Cadastro completo, plano contratado, histórico e status num clique.' },
              { icon: Calendar,    t: 'Aulas e check-in',       d: 'Grade semanal, reserva, lista de espera e presença em segundos.' },
              { icon: Wallet,      t: 'Financeiro',             d: 'Mensalidades, baixa, inadimplência e contas a pagar sem planilha.' },
              { icon: Dumbbell,    t: 'Treinos personalizados', d: 'Cadastre WODs, EMOMs, séries de musculação e vincule à aula do dia.' },
              { icon: Smartphone,  t: 'Mobile-first',           d: 'Aluno e professor usam pelo celular. Recepção também.' },
              { icon: ShieldCheck, t: 'LGPD desde o dia 1',     d: 'Dados isolados por academia, consentimento e direito ao esquecimento.' },
            ].map((b) => (
              <div key={b.t} className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="h-10 w-10 rounded-lg bg-brand-500/15 flex items-center justify-center mb-3">
                  <b.icon className="h-5 w-5 text-brand-600" />
                </div>
                <div className="font-semibold text-slate-900">{b.t}</div>
                <div className="text-sm text-slate-600 mt-1">{b.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Módulos */}
      <section id="modulos" className="py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl font-bold text-slate-900 text-center">Funcionalidades principais</h2>
          <div className="grid md:grid-cols-2 gap-4 mt-10 max-w-3xl mx-auto">
            {[
              'Cadastro de unidades, modalidades e salas',
              'Professores, disponibilidade e modalidades',
              'Planos comerciais flexíveis (mensal, trimestral, anual)',
              'Aulas com capacidade, lista de espera e cancelamento',
              'Treinos por modalidade (WOD, musculação, pilates)',
              'Check-in pelo aluno, professor ou recepção',
              'Dashboard com indicadores em tempo real',
              'Relatórios e exportação para Excel',
              'Portal do aluno (programação, plano, treino, pagamentos)',
              'Pagamentos online (PIX, boleto, cartão) — em breve',
            ].map((f) => (
              <div key={f} className="flex items-start gap-2 text-slate-700">
                <Check className="h-5 w-5 text-brand-600 flex-shrink-0 mt-0.5" />
                <span>{f}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Planos */}
      <section id="planos" className="bg-slate-50 py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl font-bold text-slate-900 text-center">Planos</h2>
          <p className="text-slate-600 text-center mt-3">Comece pelo Starter e cresça quando precisar.</p>

          <div className="grid md:grid-cols-3 gap-6 mt-10">
            {[
              { n: 'Starter',      p: 'R$ 89/mês',    d: 'Para academias até 100 alunos',  destaque: false, items: ['1 unidade', 'Até 100 alunos', 'Aulas e check-in', 'Financeiro manual'], cta: 'cta-starter',     ctaLabel: 'Começar grátis',     usaCadastro: true },
              { n: 'Profissional', p: 'R$ 199/mês',   d: 'Para boxes em crescimento',       destaque: true,  items: ['Até 3 unidades', 'Até 400 alunos', 'Tudo do Starter', 'Relatórios completos', 'Portal do aluno'], cta: 'cta-profissional', ctaLabel: 'Quero esse',         usaCadastro: true },
              { n: 'Premium',      p: 'Sob consulta', d: 'Para redes e franquias',          destaque: false, items: ['Unidades ilimitadas', 'Alunos ilimitados', 'Tudo do Profissional', 'Pagamentos online', 'Onboarding dedicado'], cta: 'cta-premium', ctaLabel: 'Fale conosco', usaCadastro: false },
            ].map((pl) => (
              <div
                key={pl.n}
                className={`rounded-2xl border p-6 ${pl.destaque ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white'}`}
              >
                <div className={`text-sm font-medium ${pl.destaque ? 'text-brand-500' : 'text-brand-600'}`}>
                  {pl.n}
                </div>
                <div className={`text-3xl font-extrabold mt-2 ${pl.destaque ? 'text-white' : 'text-slate-900'}`}>{pl.p}</div>
                <div className={`text-sm mt-1 ${pl.destaque ? 'text-slate-300' : 'text-slate-500'}`}>{pl.d}</div>
                <ul className="mt-5 space-y-2 text-sm">
                  {pl.items.map(it => (
                    <li key={it} className="flex items-center gap-2">
                      <Check className={`h-4 w-4 ${pl.destaque ? 'text-brand-500' : 'text-brand-600'}`} />
                      <span className={pl.destaque ? 'text-slate-200' : 'text-slate-700'}>{it}</span>
                    </li>
                  ))}
                </ul>
                {pl.usaCadastro ? (
                  <a
                    href={`${PORTAL_URL}/cadastro`}
                    className={`mt-6 block text-center rounded-lg py-2.5 font-medium ${
                      pl.destaque
                        ? 'bg-brand-500 text-slate-900 hover:bg-brand-600'
                        : 'bg-slate-900 text-white hover:bg-slate-800'
                    }`}
                  >
                    {pl.ctaLabel}
                  </a>
                ) : (
                  <button
                    onClick={abrirLead(pl.cta)}
                    className={`mt-6 block w-full text-center rounded-lg py-2.5 font-medium ${
                      pl.destaque
                        ? 'bg-brand-500 text-slate-900 hover:bg-brand-600'
                        : 'bg-slate-900 text-white hover:bg-slate-800'
                    }`}
                  >
                    {pl.ctaLabel}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl font-bold text-slate-900 text-center">Perguntas frequentes</h2>
          <div className="mt-8 space-y-3">
            {[
              { q: 'Funciona pra box de crossfit?',  a: 'Sim — o MarshFit foi pensado primeiro para boxes de crossfit, hyrox e funcional, com WODs, lista de espera e check-in rápido.' },
              { q: 'Tenho mais de uma unidade.',     a: 'O plano Profissional já cobre até 3 unidades. Premium é ilimitado, com dashboard consolidado.' },
              { q: 'Posso testar antes de pagar?',    a: 'Sim. Você cria sua conta grátis e usa por 14 dias sem cartão.' },
              { q: 'E os dados dos meus alunos?',    a: 'Todo dado é isolado por academia. Seguimos a LGPD: consentimento, acesso e direito ao esquecimento.' },
              { q: 'Pagamentos online já funcionam?', a: 'No MVP a baixa é manual. PIX, boleto e cartão entram na próxima fase, prevista para depois da validação do operacional.' },
            ].map((f) => (
              <details key={f.q} className="rounded-lg border border-slate-200 p-4">
                <summary className="font-medium cursor-pointer">{f.q}</summary>
                <p className="text-slate-600 mt-2 text-sm">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA / Contato */}
      <section className="bg-slate-900 text-white py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl font-bold">Pronto para organizar sua academia?</h2>
          <p className="text-slate-300 mt-3">Crie sua conta gratuita e teste por 14 dias. Sem cartão de crédito.</p>
          <div className="mt-6 flex flex-wrap gap-3 justify-center">
            <a
              href={`${PORTAL_URL}/cadastro`}
              className="bg-brand-500 text-slate-900 font-semibold rounded-lg px-8 py-3 hover:bg-brand-600"
            >
              Começar grátis agora
            </a>
            <button
              onClick={abrirLead('cta-final')}
              className="border border-white/30 text-white font-semibold rounded-lg px-8 py-3 hover:bg-white/10"
            >
              Falar com a Marsh
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-8 text-center text-sm text-slate-500">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          © {new Date().getFullYear()} MarshFit · Marsh Consultoria · Todos os direitos reservados.
        </div>
      </footer>

      {origemLead && <LeadModal origem={origemLead} onClose={() => setOrigemLead(null)} />}
    </div>
  )
}

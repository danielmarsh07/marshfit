import { useAuthStore } from '@/stores/auth.store'

export function DashboardPage() {
  const { usuario, vinculo } = useAuthStore()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">
          Olá, {usuario?.nome}. Bem-vindo ao MarshFit.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Alunos ativos',     valor: '—' },
          { label: 'Faturamento do mês', valor: '—' },
          { label: 'Aulas hoje',         valor: '—' },
          { label: 'Inadimplentes',      valor: '—' },
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="text-xs uppercase tracking-wide text-slate-500">{card.label}</div>
            <div className="text-2xl font-semibold text-slate-900 mt-1">{card.valor}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 text-sm text-slate-500">
        Fundação concluída ✓ — academia ativa: <strong className="text-slate-900">{vinculo?.academiaNome}</strong>.
        <br />
        Próximas fases trarão cadastros, aulas, financeiro e área do aluno.
      </div>
    </div>
  )
}

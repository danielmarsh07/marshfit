import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'
import { AppLayout } from '@/components/layout/AppLayout'
import { LoginPage } from '@/pages/auth/LoginPage'
import { CadastroPage } from '@/pages/auth/CadastroPage'
import { DashboardPage } from '@/pages/admin/DashboardPage'
import { UnidadesPage } from '@/pages/admin/UnidadesPage'
import { ModalidadesPage } from '@/pages/admin/ModalidadesPage'
import { SalasPage } from '@/pages/admin/SalasPage'
import { ProfessoresPage } from '@/pages/admin/ProfessoresPage'
import { PlanosPage } from '@/pages/admin/PlanosPage'
import { AlunosPage } from '@/pages/admin/AlunosPage'
import { AlunoDetalhe } from '@/pages/admin/AlunoDetalhe'
import { AulasPage } from '@/pages/admin/AulasPage'
import { AulasHojePage } from '@/pages/admin/AulasHojePage'
import { TreinosPage } from '@/pages/admin/TreinosPage'
import { HomeAlunoPage } from '@/pages/aluno/HomeAlunoPage'
import { ProgramacaoPage } from '@/pages/aluno/ProgramacaoPage'
import { MinhasReservasPage } from '@/pages/aluno/MinhasReservasPage'
import { MeuPlanoPage } from '@/pages/aluno/MeuPlanoPage'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuth = useAuthStore(s => s.isAuthenticated())
  return isAuth ? <>{children}</> : <Navigate to="/login" replace />
}

function PlaceholderPage({ titulo, descricao }: { titulo: string; descricao?: string }) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">{titulo}</h1>
      <p className="text-sm text-slate-500 mt-2">
        {descricao ?? 'Esta tela será implementada nas próximas fases do MarshFit.'}
      </p>
    </div>
  )
}

/** Mostra a home apropriada para o papel ativo. */
function IndexRoute() {
  const vinculo = useAuthStore(s => s.vinculo)
  if (vinculo?.papel === 'ALUNO') return <HomeAlunoPage />
  if (vinculo?.papel === 'PROFESSOR' || vinculo?.papel === 'RECEPCAO') return <Navigate to="/hoje" replace />
  return <Navigate to="/dashboard" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login"    element={<LoginPage />} />
      <Route path="/cadastro" element={<CadastroPage />} />

      <Route
        element={
          <PrivateRoute>
            <AppLayout />
          </PrivateRoute>
        }
      >
        <Route index element={<IndexRoute />} />

        {/* Aluno */}
        <Route path="/programacao" element={<ProgramacaoPage />} />
        <Route path="/reservas"    element={<MinhasReservasPage />} />
        <Route path="/meu-plano"   element={<MeuPlanoPage />} />

        {/* Gestão / Operação */}
        <Route path="/dashboard"     element={<DashboardPage />} />
        <Route path="/hoje"          element={<AulasHojePage />} />

        <Route path="/unidades"      element={<UnidadesPage />} />
        <Route path="/modalidades"   element={<ModalidadesPage />} />
        <Route path="/salas"         element={<SalasPage />} />
        <Route path="/professores"   element={<ProfessoresPage />} />
        <Route path="/planos"        element={<PlanosPage />} />
        <Route path="/alunos"        element={<AlunosPage />} />
        <Route path="/alunos/:id"    element={<AlunoDetalhe />} />
        <Route path="/aulas"         element={<AulasPage />} />
        <Route path="/treinos"       element={<TreinosPage />} />

        <Route path="/financeiro"    element={<PlaceholderPage titulo="Financeiro" descricao="Mensalidades, contas a pagar e baixa — Fase 6." />} />
        <Route path="/configuracoes" element={<PlaceholderPage titulo="Configurações" />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

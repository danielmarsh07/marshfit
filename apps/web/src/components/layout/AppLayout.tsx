import { useState, useEffect } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'
import { useThemeStore } from '@/stores/theme.store'
import { api } from '@/services/api'
import {
  LayoutDashboard,
  Building2,
  Users,
  Calendar,
  Dumbbell,
  CreditCard,
  Settings,
  LogOut,
  Sun,
  Moon,
  Tag,
  DoorOpen,
  GraduationCap,
  Receipt,
  Home,
  CalendarCheck,
  CalendarDays,
  UserCog,
  MoreHorizontal,
} from 'lucide-react'
import { APP_VERSION } from '@/changelog'
import { cn } from '@/lib/cn'

interface ItemMenu {
  to: string
  label: string
  icon: typeof LayoutDashboard
  papeis: string[]
}

const MENU: ItemMenu[] = [
  // ── Aluno (portal) ──
  { to: '/',              label: 'Início',       icon: Home,            papeis: ['ALUNO'] },
  { to: '/programacao',   label: 'Programação',  icon: CalendarDays,    papeis: ['ALUNO'] },
  { to: '/reservas',      label: 'Reservas',     icon: CalendarCheck,   papeis: ['ALUNO'] },
  { to: '/meu-plano',     label: 'Meu plano',    icon: Receipt,         papeis: ['ALUNO'] },

  // ── Gestão / Operação ──
  { to: '/dashboard',     label: 'Dashboard',    icon: LayoutDashboard, papeis: ['SUPER_ADMIN', 'ADMIN_ACADEMIA', 'GESTOR_UNIDADE', 'FINANCEIRO'] },
  { to: '/hoje',          label: 'Aulas hoje',   icon: CalendarCheck,   papeis: ['SUPER_ADMIN', 'ADMIN_ACADEMIA', 'GESTOR_UNIDADE', 'PROFESSOR', 'RECEPCAO'] },
  { to: '/alunos',        label: 'Alunos',       icon: Users,           papeis: ['SUPER_ADMIN', 'ADMIN_ACADEMIA', 'GESTOR_UNIDADE', 'RECEPCAO'] },
  { to: '/aulas',         label: 'Aulas',        icon: Calendar,        papeis: ['SUPER_ADMIN', 'ADMIN_ACADEMIA', 'GESTOR_UNIDADE', 'PROFESSOR', 'RECEPCAO'] },
  { to: '/treinos',       label: 'Treinos',      icon: Dumbbell,        papeis: ['SUPER_ADMIN', 'ADMIN_ACADEMIA', 'GESTOR_UNIDADE', 'PROFESSOR'] },
  { to: '/professores',   label: 'Professores',  icon: GraduationCap,   papeis: ['SUPER_ADMIN', 'ADMIN_ACADEMIA', 'GESTOR_UNIDADE'] },
  { to: '/planos',        label: 'Planos',       icon: Receipt,         papeis: ['SUPER_ADMIN', 'ADMIN_ACADEMIA'] },
  { to: '/unidades',      label: 'Unidades',     icon: Building2,       papeis: ['SUPER_ADMIN', 'ADMIN_ACADEMIA'] },
  { to: '/salas',         label: 'Salas',        icon: DoorOpen,        papeis: ['SUPER_ADMIN', 'ADMIN_ACADEMIA', 'GESTOR_UNIDADE'] },
  { to: '/modalidades',   label: 'Modalidades',  icon: Tag,             papeis: ['SUPER_ADMIN', 'ADMIN_ACADEMIA', 'GESTOR_UNIDADE'] },
  { to: '/financeiro',    label: 'Financeiro',   icon: CreditCard,      papeis: ['SUPER_ADMIN', 'ADMIN_ACADEMIA', 'FINANCEIRO'] },
  { to: '/usuarios',      label: 'Usuários',     icon: UserCog,         papeis: ['SUPER_ADMIN', 'ADMIN_ACADEMIA'] },
  { to: '/configuracoes', label: 'Configurações', icon: Settings,       papeis: ['SUPER_ADMIN', 'ADMIN_ACADEMIA'] },
]

export function AppLayout() {
  const { usuario, vinculo, clearAuth } = useAuthStore()
  const { tema, setTema } = useThemeStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [drawerAberto, setDrawerAberto] = useState(false)

  const itensVisiveis = MENU.filter(item => item.papeis.includes(vinculo?.papel ?? ''))
  // Bottom nav mostra os 4 primeiros itens por papel. O resto vai pro drawer "Mais".
  const itensPrimarios = itensVisiveis.slice(0, 4)
  const itensSecundarios = itensVisiveis.slice(4)
  const temMais = itensSecundarios.length > 0

  // Fecha o drawer ao trocar de rota.
  useEffect(() => { setDrawerAberto(false) }, [location.pathname])

  async function logout() {
    try { await api.post('/auth/logout') } catch { /* ignora */ }
    clearAuth()
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar desktop */}
      <aside className="hidden md:flex md:w-64 flex-col bg-slate-900 text-slate-100">
        <div className="px-4 py-5 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-brand-500 flex items-center justify-center">
              <Dumbbell className="h-4 w-4 text-slate-900" />
            </div>
            <div>
              <div className="font-semibold">MarshFit</div>
              <div className="text-[10px] text-slate-400">{APP_VERSION}</div>
            </div>
          </div>
          {vinculo && (
            <div className="mt-3 text-xs text-slate-400">
              <div className="truncate">{vinculo.academiaNome}</div>
              <div className="text-[10px] mt-0.5 opacity-75">
                {vinculo.papel.replace(/_/g, ' ').toLowerCase()}
              </div>
            </div>
          )}
        </div>

        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {itensVisiveis.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition',
                isActive
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white',
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-2 py-3 border-t border-slate-800">
          <button
            onClick={() => setTema(tema === 'default' ? 'box' : 'default')}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800"
          >
            {tema === 'default' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            Tema {tema === 'default' ? 'box' : 'padrão'}
          </button>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
          {usuario && (
            <div className="mt-2 px-3 text-[11px] text-slate-500 truncate">
              {usuario.nome}
            </div>
          )}
        </div>
      </aside>

      {/* Conteúdo principal */}
      <main className="flex-1 overflow-x-hidden">
        {/* Topbar mobile */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-brand-500 flex items-center justify-center">
              <Dumbbell className="h-4 w-4 text-slate-900" />
            </div>
            <span className="font-semibold">MarshFit</span>
          </div>
          <button onClick={logout} className="p-2 -mr-2">
            <LogOut className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6">
          <Outlet />
        </div>

        {/* Bottom nav mobile: 4 itens fixos + 'Mais' quando houver overflow */}
        <nav
          className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around z-40"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)', paddingTop: '0.5rem' }}
        >
          {itensPrimarios.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => cn(
                'flex flex-col items-center justify-center gap-0.5 px-2 py-1.5 text-[11px] flex-1 min-h-[52px] active:bg-slate-100',
                isActive ? 'text-slate-900 font-medium' : 'text-slate-500',
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="truncate max-w-full">{label}</span>
            </NavLink>
          ))}
          {temMais && (
            <button
              onClick={() => setDrawerAberto(true)}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 px-2 py-1.5 text-[11px] flex-1 min-h-[52px] active:bg-slate-100',
                drawerAberto ? 'text-slate-900 font-medium' : 'text-slate-500',
              )}
              aria-label="Mais opções"
            >
              <MoreHorizontal className="h-5 w-5" />
              <span>Mais</span>
            </button>
          )}
        </nav>
        {/* Spacer pro conteúdo não ficar atrás do bottom nav */}
        <div
          className="md:hidden"
          style={{ height: 'calc(64px + env(safe-area-inset-bottom))' }}
        />
      </main>

      {/* Drawer "Mais" — mobile only */}
      {drawerAberto && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-slate-900/60 flex items-end"
          onClick={(e) => { if (e.target === e.currentTarget) setDrawerAberto(false) }}
        >
          <div
            className="bg-white rounded-t-2xl w-full max-h-[80dvh] overflow-y-auto shadow-2xl"
            style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 1rem)' }}
          >
            <div className="flex justify-center pt-3 pb-2">
              <div className="h-1 w-10 rounded-full bg-slate-300" />
            </div>
            <div className="px-4 pb-2 text-sm font-medium text-slate-700">Mais opções</div>
            <nav className="pb-2">
              {itensSecundarios.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) => cn(
                    'flex items-center gap-3 px-5 py-3.5 text-base active:bg-slate-100',
                    isActive ? 'bg-slate-50 text-slate-900 font-medium' : 'text-slate-700',
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {label}
                </NavLink>
              ))}
            </nav>
            <div className="border-t border-slate-200 mt-2 pt-2">
              <button
                onClick={() => { setTema(tema === 'default' ? 'box' : 'default'); setDrawerAberto(false) }}
                className="w-full flex items-center gap-3 px-5 py-3.5 text-base text-slate-700 active:bg-slate-100"
              >
                {tema === 'default' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                Tema {tema === 'default' ? 'escuro' : 'padrão'}
              </button>
              <button
                onClick={logout}
                className="w-full flex items-center gap-3 px-5 py-3.5 text-base text-slate-700 active:bg-slate-100"
              >
                <LogOut className="h-5 w-5" />
                Sair
              </button>
              {usuario && (
                <div className="px-5 py-2 text-xs text-slate-500 truncate">{usuario.nome} — {usuario.email}</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

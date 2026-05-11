import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Papel =
  | 'SUPER_ADMIN'
  | 'ADMIN_ACADEMIA'
  | 'GESTOR_UNIDADE'
  | 'FINANCEIRO'
  | 'PROFESSOR'
  | 'RECEPCAO'
  | 'ALUNO'

export interface UsuarioAuth {
  id: number
  nome: string
  email: string
}

export interface VinculoAtivo {
  academiaId: number
  academiaNome: string
  papel: Papel
  unidadeId: number | null
  unidadeNome: string | null
}

interface AuthState {
  accessToken: string | null
  usuario: UsuarioAuth | null
  vinculo: VinculoAtivo | null
  setAuth: (token: string, usuario: UsuarioAuth, vinculo: VinculoAtivo) => void
  setAccessToken: (token: string) => void
  clearAuth: () => void
  isAuthenticated: () => boolean
  // Predicados por papel
  isSuperAdmin: () => boolean
  isAdmin: () => boolean        // SUPER_ADMIN | ADMIN_ACADEMIA
  isGestao: () => boolean       // + GESTOR_UNIDADE
  isProfessor: () => boolean
  isRecepcao: () => boolean
  isFinanceiro: () => boolean
  isAluno: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      usuario: null,
      vinculo: null,

      setAuth: (accessToken, usuario, vinculo) => set({ accessToken, usuario, vinculo }),
      setAccessToken: (accessToken) => set({ accessToken }),
      clearAuth: () => set({ accessToken: null, usuario: null, vinculo: null }),

      isAuthenticated: () => !!get().accessToken && !!get().vinculo,
      isSuperAdmin: () => get().vinculo?.papel === 'SUPER_ADMIN',
      isAdmin:      () => ['SUPER_ADMIN', 'ADMIN_ACADEMIA'].includes(get().vinculo?.papel ?? ''),
      isGestao:     () => ['SUPER_ADMIN', 'ADMIN_ACADEMIA', 'GESTOR_UNIDADE'].includes(get().vinculo?.papel ?? ''),
      isProfessor:  () => get().vinculo?.papel === 'PROFESSOR',
      isRecepcao:   () => get().vinculo?.papel === 'RECEPCAO',
      isFinanceiro: () => get().vinculo?.papel === 'FINANCEIRO',
      isAluno:      () => get().vinculo?.papel === 'ALUNO',
    }),
    {
      name: 'marshfit-auth',
      partialize: (s) => ({ accessToken: s.accessToken, usuario: s.usuario, vinculo: s.vinculo }),
    },
  ),
)

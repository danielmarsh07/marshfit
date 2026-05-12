import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Tema = 'default' | 'box' | 'barsotti'

export const TEMAS: { id: Tema; label: string; descricao: string }[] = [
  { id: 'default',  label: 'Padrão',           descricao: 'Visual neutro do MarshFit.' },
  { id: 'box',      label: 'Box (escuro)',     descricao: 'Tema dark inspirado em box de CrossFit.' },
  { id: 'barsotti', label: 'Barsotti Brothers', descricao: 'Identidade visual da Barsotti Brothers — azul + laranja.' },
]

interface ThemeState {
  tema: Tema
  setTema: (t: Tema) => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      tema: 'default',
      setTema: (tema) => {
        document.documentElement.setAttribute('data-theme', tema)
        set({ tema })
      },
    }),
    {
      name: 'marshfit-theme',
    },
  ),
)

// Aplica o tema persistido antes do React renderizar (evita flash).
export function aplicarTemaInicial() {
  try {
    const raw = localStorage.getItem('marshfit-theme')
    if (raw) {
      const parsed = JSON.parse(raw)
      const tema = parsed?.state?.tema as Tema | undefined
      if (tema) document.documentElement.setAttribute('data-theme', tema)
    }
  } catch {
    // ignora — fica no default
  }
}

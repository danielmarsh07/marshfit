import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Tema = 'default' | 'box'

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

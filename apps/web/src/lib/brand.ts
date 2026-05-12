import { useThemeStore } from '@/stores/theme.store'

export interface Brand {
  /** Nome curto exibido na sidebar e topbar. */
  nome: string
  /** Primeira parte do nome, destacado em cor (ex: "BARSOTTI"). */
  nomeDestaque: string
  /** Segunda parte do nome (ex: "BROTHERS"). Vazio para temas que usam só `nome`. */
  nomeComplemento: string
  /** Slogan curto exibido no login/cadastro e na sidebar. */
  slogan: string
  /** Footer das telas de auth. */
  rodape: string
}

const BRANDS: Record<string, Brand> = {
  default: {
    nome: 'MarshFit',
    nomeDestaque: 'MarshFit',
    nomeComplemento: '',
    slogan: 'Gestão para academias e boxes',
    rodape: 'Marsh Consultoria',
  },
  box: {
    nome: 'MarshFit',
    nomeDestaque: 'MarshFit',
    nomeComplemento: '',
    slogan: 'Gestão para academias e boxes',
    rodape: 'Marsh Consultoria',
  },
  barsotti: {
    nome: 'Barsotti Brothers',
    nomeDestaque: 'BARSOTTI',
    nomeComplemento: 'BROTHERS',
    slogan: 'Weightlifting & Conditioning',
    rodape: 'Barsotti Brothers — powered by MarshFit',
  },
}

export function useBrand(): Brand {
  const tema = useThemeStore(s => s.tema)
  return BRANDS[tema] ?? BRANDS.default
}

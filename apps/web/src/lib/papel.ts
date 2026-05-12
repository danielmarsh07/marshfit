import { useAuthStore, type Papel } from '@/stores/auth.store'

/**
 * Papéis cujo escopo é restrito a uma única unidade — o usuário logado
 * não pode escolher unidade em formulários (vem do JWT/vinculo).
 */
const PAPEIS_RESTRITOS_UNIDADE: ReadonlyArray<Papel> = ['GESTOR_UNIDADE', 'PROFESSOR', 'RECEPCAO']

/**
 * Hook que devolve o contexto de unidade ativa do usuário logado.
 *
 * - `restritoUnidade=true` quando o papel é gestor/professor/recepção:
 *   formulários devem ocultar o seletor de unidade e usar `unidadeId`
 *   automaticamente.
 * - `restritoUnidade=false` para super admin / admin academia / financeiro:
 *   formulários mostram o seletor de unidade.
 */
export function useUnidadeAtiva() {
  const vinculo = useAuthStore(s => s.vinculo)
  const restritoUnidade = !!vinculo && PAPEIS_RESTRITOS_UNIDADE.includes(vinculo.papel)
  return {
    restritoUnidade,
    unidadeId: vinculo?.unidadeId ?? null,
    unidadeNome: vinculo?.unidadeNome ?? null,
  }
}

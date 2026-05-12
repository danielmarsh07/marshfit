import type { TenantContext } from '../plugins/tenant.plugin.js'
import { criarErro } from './errors.js'

/**
 * Decide qual unidadeId usar ao criar/editar um recurso UNIT_SCOPED.
 *
 * Regra:
 *  - Se o tenant é restrito a uma unidade (gestor/professor/recepção), usa a dele
 *    (ignora o que veio do body — defense-in-depth).
 *  - Se é admin/super, usa o unidadeId que veio do body (obrigatório).
 *  - Em qualquer caso, valida que é um número positivo.
 */
export function unidadeIdParaCriar(tenant: TenantContext, bodyUnidadeId?: number | null): number {
  if (tenant.restritoUnidade && tenant.unidadeId) {
    return tenant.unidadeId
  }
  if (!bodyUnidadeId || bodyUnidadeId <= 0) {
    throw criarErro(400, 'Selecione a unidade onde o cadastro será criado')
  }
  return bodyUnidadeId
}

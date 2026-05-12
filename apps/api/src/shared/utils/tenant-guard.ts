import { prisma } from '../../infra/database/prisma.js'
import { criarErro } from './errors.js'

/**
 * Confere que todos os IDs informados pertencem ao tenant `academiaId`
 * antes de fazer um connect/disconnect em relações.
 *
 * O `prismaTenant` cobre `where` direto, mas NÃO cobre `data.modalidades.connect`
 * em relações M:N — então usamos esse helper nos services antes de gravar.
 */
export async function garantirIdsDoTenant(opts: {
  model: 'modalidade' | 'unidade' | 'sala' | 'professor' | 'plano' | 'aluno' | 'aula' | 'treino' | 'reserva' | 'matricula'
  ids: number[]
  academiaId: number
}): Promise<void> {
  if (opts.ids.length === 0) return

  const idsUnicos = Array.from(new Set(opts.ids))

  // Usa prisma raw porque queremos contar livremente (não tenant-scoped aqui —
  // a comparação manual é exatamente o que estamos fazendo).
  const delegate = (prisma as unknown as Record<string, { count: (args: unknown) => Promise<number> }>)[opts.model]
  if (!delegate) {
    throw new Error(`tenant-guard: model "${opts.model}" não suportado`)
  }
  const total = await delegate.count({
    where: {
      id: { in: idsUnicos },
      academiaId: opts.academiaId,
    },
  })

  if (total !== idsUnicos.length) {
    throw criarErro(400, `Um ou mais ${opts.model}(s) não pertencem à sua academia`)
  }
}

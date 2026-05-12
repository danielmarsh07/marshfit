import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import fp from 'fastify-plugin'
import { prismaTenant, prismaTenantUnidade, prisma, type PrismaTenantClient } from '../../infra/database/prisma.js'
import type { JwtPayload } from './auth.plugin.js'

// Papéis cujo escopo natural é a unidade — quando logado com um desses
// papéis, o tenant injeta unidadeId e a Prisma extension filtra
// automaticamente as queries em modelos UNIT_SCOPED.
const PAPEIS_RESTRITOS_UNIDADE: ReadonlySet<JwtPayload['papel']> = new Set([
  'GESTOR_UNIDADE',
  'PROFESSOR',
  'RECEPCAO',
])

export interface TenantContext {
  academiaId: number          // 0 quando SUPER_ADMIN sem academia (bypass)
  unidadeId: number | null
  papel: JwtPayload['papel']
  bypass: boolean             // true só para SUPER_ADMIN cross-tenant
  restritoUnidade: boolean    // true quando o papel limita a 1 unidade
  db: PrismaTenantClient      // Prisma client com escopo aplicado
}

declare module 'fastify' {
  interface FastifyRequest {
    tenant: TenantContext
  }
}

/**
 * Plugin que, APÓS authenticate, injeta `request.tenant` derivado do JWT.
 * Uso típico: `preHandler: [app.authenticate, app.requireTenant]`.
 *
 * Importante: este plugin nunca aceita academiaId/unidadeId vindo do
 * body/query/header. A fonte da verdade é sempre o JWT.
 */
export const tenantPlugin = fp(async (app: FastifyInstance) => {
  app.decorate('requireTenant', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as JwtPayload | undefined
    if (!user) {
      return reply.status(401).send({ error: 'Não autenticado' })
    }

    const bypass = user.papel === 'SUPER_ADMIN'
    const academiaId = user.academiaId ?? 0

    if (!bypass && !user.academiaId) {
      return reply.status(403).send({ error: 'Usuário sem academia vinculada' })
    }

    const restritoUnidade = PAPEIS_RESTRITOS_UNIDADE.has(user.papel) && !!user.unidadeId

    let db: PrismaTenantClient
    if (bypass) {
      db = prisma as unknown as PrismaTenantClient
    } else if (restritoUnidade) {
      db = prismaTenantUnidade(academiaId, user.unidadeId!) as unknown as PrismaTenantClient
    } else {
      db = prismaTenant(academiaId)
    }

    request.tenant = {
      academiaId,
      unidadeId: user.unidadeId ?? null,
      papel: user.papel,
      bypass,
      restritoUnidade,
      db,
    }
  })
})

declare module 'fastify' {
  interface FastifyInstance {
    requireTenant: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}

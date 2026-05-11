import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import fp from 'fastify-plugin'
import { prismaTenant, prisma, type PrismaTenantClient } from '../../infra/database/prisma.js'
import type { JwtPayload } from './auth.plugin.js'

export interface TenantContext {
  academiaId: number          // 0 quando SUPER_ADMIN sem academia (bypass)
  unidadeId: number | null
  papel: JwtPayload['papel']
  bypass: boolean             // true só para SUPER_ADMIN cross-tenant
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
 * Importante: este plugin nunca aceita academiaId vindo do body/query/header.
 * A fonte da verdade é sempre o JWT.
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

    request.tenant = {
      academiaId,
      unidadeId: user.unidadeId ?? null,
      papel: user.papel,
      bypass,
      db: bypass ? prisma as unknown as PrismaTenantClient : prismaTenant(academiaId),
    }
  })
})

declare module 'fastify' {
  interface FastifyInstance {
    requireTenant: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}

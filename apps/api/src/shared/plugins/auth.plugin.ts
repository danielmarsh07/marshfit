import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import fp from 'fastify-plugin'
import type { Papel } from '@prisma/client'

export interface JwtPayload {
  sub: number        // usuarioId
  papel: Papel
  academiaId: number | null   // null apenas para SUPER_ADMIN sem vínculo
  unidadeId?: number | null
  // Marca tokens de refresh (não setado em access tokens).
  kind?: 'refresh'
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JwtPayload
    user: JwtPayload
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
    authorize: (...papeis: Papel[]) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}

export const authPlugin = fp(async (app: FastifyInstance) => {
  app.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify()
    } catch {
      reply.status(401).send({ error: 'Não autorizado' })
    }
  })

  app.decorate('authorize', (...papeis: Papel[]) => {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        await request.jwtVerify()
        const user = request.user as JwtPayload
        if (!papeis.includes(user.papel)) {
          reply.status(403).send({ error: 'Sem permissão para esta ação' })
        }
      } catch {
        reply.status(401).send({ error: 'Não autorizado' })
      }
    }
  })
})

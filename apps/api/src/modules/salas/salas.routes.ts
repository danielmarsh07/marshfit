import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { SalasService } from './salas.service.js'
import { PAPEIS_GESTAO } from '../../shared/utils/permissions.js'

const bodySchema = z.object({
  unidadeId:  z.number().int().positive(),
  nome:       z.string().min(1).max(80),
  capacidade: z.number().int().min(1).max(2000),
  ativo:      z.boolean().optional(),
})

const partialSchema = bodySchema.partial()

export async function salasRoutes(app: FastifyInstance) {
  function makeService(req: import('fastify').FastifyRequest) {
    return new SalasService(req.tenant.db, req.tenant.academiaId)
  }

  app.get('/', {
    preHandler: [app.authenticate, app.requireTenant],
    handler: async (request) => {
      const q = request.query as Record<string, string>
      return makeService(request).listar({
        busca: q.busca,
        unidadeId: q.unidadeId ? Number(q.unidadeId) : undefined,
        ativo: q.ativo === 'false' ? false : q.ativo === 'true' ? true : undefined,
      })
    },
  })

  app.get('/:id', {
    preHandler: [app.authenticate, app.requireTenant],
    handler: async (request) => {
      const id = Number((request.params as { id: string }).id)
      return makeService(request).buscar(id)
    },
  })

  app.post('/', {
    preHandler: [app.authorize(...PAPEIS_GESTAO), app.requireTenant],
    handler: async (request, reply) => {
      const data = bodySchema.parse(request.body)
      return reply.status(201).send(await makeService(request).criar(data))
    },
  })

  app.put('/:id', {
    preHandler: [app.authorize(...PAPEIS_GESTAO), app.requireTenant],
    handler: async (request) => {
      const id = Number((request.params as { id: string }).id)
      const data = partialSchema.parse(request.body)
      return makeService(request).atualizar(id, data)
    },
  })

  app.delete('/:id', {
    preHandler: [app.authorize(...PAPEIS_GESTAO), app.requireTenant],
    handler: async (request) => {
      const id = Number((request.params as { id: string }).id)
      return makeService(request).excluir(id)
    },
  })
}

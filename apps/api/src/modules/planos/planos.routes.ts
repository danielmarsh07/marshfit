import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { PlanosService } from './planos.service.js'
import { PAPEIS_ADMIN } from '../../shared/utils/permissions.js'

const periodicidadeEnum = z.enum(['MENSAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL'])

const bodySchema = z.object({
  nome:           z.string().min(2).max(120),
  descricao:      z.string().max(2000).optional(),
  valor:          z.number().nonnegative().max(99999999),
  periodicidade:  periodicidadeEnum,
  aulasPorSemana: z.number().int().min(1).max(50).optional(),
  acessoLivre:    z.boolean().optional(),
  modalidadeIds:  z.array(z.number().int().positive()).optional(),
  ativo:          z.boolean().optional(),
})

const partialSchema = bodySchema.partial()

export async function planosRoutes(app: FastifyInstance) {
  function makeService(req: import('fastify').FastifyRequest) {
    return new PlanosService(req.tenant.db, req.tenant.academiaId)
  }

  app.get('/', {
    preHandler: [app.authenticate, app.requireTenant],
    handler: async (request) => {
      const q = request.query as Record<string, string>
      return makeService(request).listar({
        busca: q.busca,
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
    preHandler: [app.authorize(...PAPEIS_ADMIN), app.requireTenant],
    handler: async (request, reply) => {
      const data = bodySchema.parse(request.body)
      return reply.status(201).send(await makeService(request).criar(data))
    },
  })

  app.put('/:id', {
    preHandler: [app.authorize(...PAPEIS_ADMIN), app.requireTenant],
    handler: async (request) => {
      const id = Number((request.params as { id: string }).id)
      const data = partialSchema.parse(request.body)
      return makeService(request).atualizar(id, data)
    },
  })

  app.delete('/:id', {
    preHandler: [app.authorize(...PAPEIS_ADMIN), app.requireTenant],
    handler: async (request) => {
      const id = Number((request.params as { id: string }).id)
      return makeService(request).excluir(id)
    },
  })
}

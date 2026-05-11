import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { TreinosService } from './treinos.service.js'
import { PAPEIS_GESTAO } from '../../shared/utils/permissions.js'

const nivelEnum = z.enum(['INICIANTE', 'INTERMEDIARIO', 'AVANCADO', 'TODOS'])
const formatoEnum = z.enum(['AMRAP', 'EMOM', 'FOR_TIME', 'TABATA', 'STRENGTH', 'HIIT', 'LIVRE'])

const bodySchema = z.object({
  nome:         z.string().min(2).max(120),
  modalidadeId: z.number().int().positive().optional(),
  nivel:        nivelEnum.optional(),
  formato:      formatoEnum.optional(),
  duracaoMin:   z.number().int().min(1).max(600).optional(),
  descricao:    z.string().min(1).max(10000),
  ativo:        z.boolean().optional(),
})

const partialSchema = bodySchema.partial()

export async function treinosRoutes(app: FastifyInstance) {
  function makeService(req: import('fastify').FastifyRequest) {
    return new TreinosService(req.tenant.db, req.tenant.academiaId)
  }

  app.get('/', {
    preHandler: [app.authenticate, app.requireTenant],
    handler: async (request) => {
      const q = request.query as Record<string, string>
      return makeService(request).listar({
        busca: q.busca,
        modalidadeId: q.modalidadeId ? Number(q.modalidadeId) : undefined,
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
    preHandler: [app.authorize(...PAPEIS_GESTAO, 'PROFESSOR'), app.requireTenant],
    handler: async (request, reply) => {
      const data = bodySchema.parse(request.body)
      return reply.status(201).send(await makeService(request).criar(data))
    },
  })

  app.put('/:id', {
    preHandler: [app.authorize(...PAPEIS_GESTAO, 'PROFESSOR'), app.requireTenant],
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

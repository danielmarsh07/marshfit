import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { ProfessoresService } from './professores.service.js'
import { PAPEIS_GESTAO } from '../../shared/utils/permissions.js'

const bodySchema = z.object({
  nome:          z.string().min(2).max(120),
  cpf:           z.string().max(20).optional(),
  email:         z.string().email().optional().or(z.literal('')),
  telefone:      z.string().min(8).max(20),
  observacoes:   z.string().max(2000).optional(),
  modalidadeIds: z.array(z.number().int().positive()).optional(),
  ativo:         z.boolean().optional(),
})

const partialSchema = bodySchema.partial()

export async function professoresRoutes(app: FastifyInstance) {
  function makeService(req: import('fastify').FastifyRequest) {
    return new ProfessoresService(req.tenant.db, req.tenant.academiaId)
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
    preHandler: [app.authorize(...PAPEIS_GESTAO), app.requireTenant],
    handler: async (request, reply) => {
      const data = bodySchema.parse(request.body)
      return reply.status(201).send(await makeService(request).criar({ ...data, email: data.email || undefined }))
    },
  })

  app.put('/:id', {
    preHandler: [app.authorize(...PAPEIS_GESTAO), app.requireTenant],
    handler: async (request) => {
      const id = Number((request.params as { id: string }).id)
      const data = partialSchema.parse(request.body)
      return makeService(request).atualizar(id, { ...data, email: data.email || undefined })
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

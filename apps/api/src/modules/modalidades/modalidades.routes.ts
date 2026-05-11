import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { ModalidadesService } from './modalidades.service.js'
import { PAPEIS_GESTAO } from '../../shared/utils/permissions.js'

const bodySchema = z.object({
  nome:  z.string().min(2).max(80),
  cor:   z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Cor deve estar em formato hex (#RRGGBB)').optional(),
  icone: z.string().max(40).optional(),
  ativo: z.boolean().optional(),
})

const partialSchema = bodySchema.partial()

export async function modalidadesRoutes(app: FastifyInstance) {
  app.get('/', {
    preHandler: [app.authenticate, app.requireTenant],
    handler: async (request) => {
      const q = request.query as Record<string, string>
      const service = new ModalidadesService(request.tenant.db, request.tenant.academiaId)
      return service.listar({
        busca: q.busca,
        ativo: q.ativo === 'false' ? false : q.ativo === 'true' ? true : undefined,
      })
    },
  })

  app.get('/:id', {
    preHandler: [app.authenticate, app.requireTenant],
    handler: async (request) => {
      const id = Number((request.params as { id: string }).id)
      return new ModalidadesService(request.tenant.db, request.tenant.academiaId).buscar(id)
    },
  })

  app.post('/', {
    preHandler: [app.authorize(...PAPEIS_GESTAO), app.requireTenant],
    handler: async (request, reply) => {
      const data = bodySchema.parse(request.body)
      const criada = await new ModalidadesService(request.tenant.db, request.tenant.academiaId).criar(data)
      return reply.status(201).send(criada)
    },
  })

  app.put('/:id', {
    preHandler: [app.authorize(...PAPEIS_GESTAO), app.requireTenant],
    handler: async (request) => {
      const id = Number((request.params as { id: string }).id)
      const data = partialSchema.parse(request.body)
      return new ModalidadesService(request.tenant.db, request.tenant.academiaId).atualizar(id, data)
    },
  })

  app.delete('/:id', {
    preHandler: [app.authorize(...PAPEIS_GESTAO), app.requireTenant],
    handler: async (request) => {
      const id = Number((request.params as { id: string }).id)
      return new ModalidadesService(request.tenant.db, request.tenant.academiaId).excluir(id)
    },
  })
}

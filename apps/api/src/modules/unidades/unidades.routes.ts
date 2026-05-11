import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { UnidadesService } from './unidades.service.js'
import { PAPEIS_ADMIN, PAPEIS_OPERACIONAL } from '../../shared/utils/permissions.js'

const unidadeBodySchema = z.object({
  nome:     z.string().min(2).max(120),
  endereco: z.string().min(2).max(200),
  bairro:   z.string().max(120).optional(),
  cidade:   z.string().min(2).max(120),
  estado:   z.string().length(2),
  telefone: z.string().min(8).max(20),
  email:    z.string().email().optional().or(z.literal('')),
  ativo:    z.boolean().optional(),
})

const partialSchema = unidadeBodySchema.partial()

export async function unidadesRoutes(app: FastifyInstance) {
  // GET /unidades
  app.get('/', {
    preHandler: [app.authenticate, app.requireTenant],
    handler: async (request) => {
      const q = request.query as Record<string, string>
      const service = new UnidadesService(request.tenant.db, request.tenant.academiaId)
      const lista = await service.listar({
        busca: q.busca,
        ativo: q.ativo === 'false' ? false : q.ativo === 'true' ? true : undefined,
      })
      return lista
    },
  })

  // GET /unidades/:id
  app.get('/:id', {
    preHandler: [app.authenticate, app.requireTenant],
    handler: async (request) => {
      const id = Number((request.params as { id: string }).id)
      const service = new UnidadesService(request.tenant.db, request.tenant.academiaId)
      return service.buscar(id)
    },
  })

  // POST /unidades — apenas admins
  app.post('/', {
    preHandler: [app.authorize(...PAPEIS_ADMIN), app.requireTenant],
    handler: async (request, reply) => {
      const data = unidadeBodySchema.parse(request.body)
      const service = new UnidadesService(request.tenant.db, request.tenant.academiaId)
      const criada = await service.criar({ ...data, email: data.email || undefined })
      return reply.status(201).send(criada)
    },
  })

  // PUT /unidades/:id — admins; gestão pode ajustar dados básicos
  app.put('/:id', {
    preHandler: [app.authorize(...PAPEIS_OPERACIONAL), app.requireTenant],
    handler: async (request) => {
      const id = Number((request.params as { id: string }).id)
      const data = partialSchema.parse(request.body)
      const service = new UnidadesService(request.tenant.db, request.tenant.academiaId)
      return service.atualizar(id, { ...data, email: data.email || undefined })
    },
  })

  // DELETE /unidades/:id — soft delete (ativo=false)
  app.delete('/:id', {
    preHandler: [app.authorize(...PAPEIS_ADMIN), app.requireTenant],
    handler: async (request) => {
      const id = Number((request.params as { id: string }).id)
      const service = new UnidadesService(request.tenant.db, request.tenant.academiaId)
      return service.excluir(id)
    },
  })
}

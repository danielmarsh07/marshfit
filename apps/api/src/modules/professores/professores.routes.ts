import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { ProfessoresService } from './professores.service.js'
import { PAPEIS_GESTAO } from '../../shared/utils/permissions.js'
import { unidadeIdParaCriar } from '../../shared/utils/unidade.js'
import { garantirIdsDoTenant } from '../../shared/utils/tenant-guard.js'

const criarSchema = z.object({
  unidadeId:     z.number().int().positive().optional(),
  nome:          z.string().min(2).max(120),
  cpf:           z.string().max(20).optional(),
  email:         z.string().email().optional().or(z.literal('')),
  telefone:      z.string().min(8).max(20),
  observacoes:   z.string().max(2000).optional(),
  modalidadeIds: z.array(z.number().int().positive()).optional(),
  ativo:         z.boolean().optional(),
})

const editarSchema = z.object({
  nome:          z.string().min(2).max(120),
  cpf:           z.string().max(20).optional(),
  email:         z.string().email().optional().or(z.literal('')),
  telefone:      z.string().min(8).max(20),
  observacoes:   z.string().max(2000).optional(),
  modalidadeIds: z.array(z.number().int().positive()).optional(),
  ativo:         z.boolean().optional(),
}).partial()

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
      const data = criarSchema.parse(request.body)
      const unidadeId = unidadeIdParaCriar(request.tenant, data.unidadeId)
      await garantirIdsDoTenant({ model: 'unidade', ids: [unidadeId], academiaId: request.tenant.academiaId })
      return reply.status(201).send(await makeService(request).criar({
        ...data,
        unidadeId,
        email: data.email || undefined,
      }))
    },
  })

  app.put('/:id', {
    preHandler: [app.authorize(...PAPEIS_GESTAO), app.requireTenant],
    handler: async (request) => {
      const id = Number((request.params as { id: string }).id)
      const data = editarSchema.parse(request.body)
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

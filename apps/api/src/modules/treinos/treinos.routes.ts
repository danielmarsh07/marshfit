import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { TreinosService } from './treinos.service.js'
import { PAPEIS_GESTAO } from '../../shared/utils/permissions.js'
import { unidadeIdParaCriar } from '../../shared/utils/unidade.js'
import { garantirIdsDoTenant } from '../../shared/utils/tenant-guard.js'

const nivelEnum = z.enum(['INICIANTE', 'INTERMEDIARIO', 'AVANCADO', 'TODOS'])
const formatoEnum = z.enum(['AMRAP', 'EMOM', 'FOR_TIME', 'TABATA', 'STRENGTH', 'HIIT', 'LIVRE'])

const criarSchema = z.object({
  unidadeId:    z.number().int().positive().optional(),
  nome:         z.string().min(2).max(120),
  modalidadeId: z.number().int().positive().optional(),
  nivel:        nivelEnum.optional(),
  formato:      formatoEnum.optional(),
  duracaoMin:   z.number().int().min(1).max(600).optional(),
  descricao:    z.string().min(1).max(10000),
  ativo:        z.boolean().optional(),
})

const editarSchema = z.object({
  nome:         z.string().min(2).max(120),
  modalidadeId: z.number().int().positive().optional(),
  nivel:        nivelEnum.optional(),
  formato:      formatoEnum.optional(),
  duracaoMin:   z.number().int().min(1).max(600).optional(),
  descricao:    z.string().min(1).max(10000),
  ativo:        z.boolean().optional(),
}).partial()

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
      const data = criarSchema.parse(request.body)
      const unidadeId = unidadeIdParaCriar(request.tenant, data.unidadeId)
      await garantirIdsDoTenant({ model: 'unidade', ids: [unidadeId], academiaId: request.tenant.academiaId })
      return reply.status(201).send(await makeService(request).criar({ ...data, unidadeId }))
    },
  })

  app.put('/:id', {
    preHandler: [app.authorize(...PAPEIS_GESTAO, 'PROFESSOR'), app.requireTenant],
    handler: async (request) => {
      const id = Number((request.params as { id: string }).id)
      const data = editarSchema.parse(request.body)
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

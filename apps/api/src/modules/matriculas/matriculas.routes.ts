import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { MatriculasService } from './matriculas.service.js'
import { PAPEIS_OPERACIONAL } from '../../shared/utils/permissions.js'

const matriculaSchema = z.object({
  alunoId:    z.number().int().positive(),
  planoId:    z.number().int().positive(),
  dataInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dataFim:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  observacao: z.string().max(2000).optional(),
})

const statusSchema = z.object({
  status: z.enum(['ATIVA', 'SUSPENSA', 'CANCELADA', 'TRANCADA']),
})

export async function matriculasRoutes(app: FastifyInstance) {
  function makeService(req: import('fastify').FastifyRequest) {
    return new MatriculasService(req.tenant.db, req.tenant.academiaId)
  }

  // GET /matriculas?alunoId=N — lista matrículas do aluno
  app.get('/', {
    preHandler: [app.authenticate, app.requireTenant],
    handler: async (request) => {
      const q = request.query as Record<string, string>
      if (!q.alunoId) return []
      return makeService(request).listarPorAluno(Number(q.alunoId))
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
    preHandler: [app.authorize(...PAPEIS_OPERACIONAL), app.requireTenant],
    handler: async (request, reply) => {
      const data = matriculaSchema.parse(request.body)
      return reply.status(201).send(await makeService(request).criar(data))
    },
  })

  // PATCH /matriculas/:id/status — cancelar, trancar, reativar
  app.patch('/:id/status', {
    preHandler: [app.authorize(...PAPEIS_OPERACIONAL), app.requireTenant],
    handler: async (request) => {
      const id = Number((request.params as { id: string }).id)
      const { status } = statusSchema.parse(request.body)
      return makeService(request).alterarStatus(id, status)
    },
  })
}

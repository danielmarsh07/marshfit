import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { AulasService } from './aulas.service.js'
import { PAPEIS_GESTAO } from '../../shared/utils/permissions.js'

const horario = z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:MM')

const bodySchema = z.object({
  unidadeId:           z.number().int().positive(),
  modalidadeId:        z.number().int().positive(),
  professorId:         z.number().int().positive(),
  salaId:              z.number().int().positive(),
  nome:                z.string().max(120).optional(),
  diaSemana:           z.number().int().min(0).max(6),
  horarioInicio:       horario,
  horarioFim:          horario,
  capacidade:          z.number().int().min(1).max(2000),
  permiteListaEspera:  z.boolean().optional(),
  treinoId:            z.number().int().positive().optional(),
  ativa:               z.boolean().optional(),
})

const partialSchema = bodySchema.partial()

export async function aulasRoutes(app: FastifyInstance) {
  function makeService(req: import('fastify').FastifyRequest) {
    return new AulasService(req.tenant.db, req.tenant.academiaId)
  }

  // GET /aulas — lista com filtros (busca, unidade, modalidade, dia, professor)
  app.get('/', {
    preHandler: [app.authenticate, app.requireTenant],
    handler: async (request) => {
      const q = request.query as Record<string, string>
      return makeService(request).listar({
        busca: q.busca,
        unidadeId:    q.unidadeId    ? Number(q.unidadeId)    : undefined,
        modalidadeId: q.modalidadeId ? Number(q.modalidadeId) : undefined,
        professorId:  q.professorId  ? Number(q.professorId)  : undefined,
        diaSemana:    q.diaSemana    ? Number(q.diaSemana)    : undefined,
        ativa: q.ativa === 'false' ? false : q.ativa === 'true' ? true : undefined,
      })
    },
  })

  // GET /aulas/grade-semanal — agrupado por diaSemana (0..6)
  app.get('/grade-semanal', {
    preHandler: [app.authenticate, app.requireTenant],
    handler: async (request) => {
      const q = request.query as Record<string, string>
      return makeService(request).gradeSemanal({
        unidadeId: q.unidadeId ? Number(q.unidadeId) : undefined,
        modalidadeId: q.modalidadeId ? Number(q.modalidadeId) : undefined,
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

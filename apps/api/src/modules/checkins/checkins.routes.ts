import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { CheckinsService } from './checkins.service.js'
import { PAPEIS_OPERACIONAL } from '../../shared/utils/permissions.js'
import { criarErro } from '../../shared/utils/errors.js'
import type { JwtPayload } from '../../shared/plugins/auth.plugin.js'
import { prisma } from '../../infra/database/prisma.js'

const registrarSchema = z.object({
  alunoId:  z.number().int().positive(),
  aulaId:   z.number().int().positive().optional(),
  dataAula: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  origem:   z.enum(['APP_ALUNO', 'RECEPCAO', 'PROFESSOR', 'QR']).default('RECEPCAO'),
})

export async function checkinsRoutes(app: FastifyInstance) {
  function makeService(req: import('fastify').FastifyRequest) {
    return new CheckinsService(req.tenant.db, req.tenant.academiaId)
  }

  // POST /checkins — admin/recepção/professor registram (passando alunoId)
  app.post('/', {
    preHandler: [app.authorize(...PAPEIS_OPERACIONAL, 'PROFESSOR'), app.requireTenant],
    handler: async (request, reply) => {
      const data = registrarSchema.parse(request.body)
      const c = await makeService(request).registrar(data)
      return reply.status(201).send(c)
    },
  })

  // POST /checkins/auto — aluno se auto-checa via reserva (dentro da janela)
  app.post('/auto', {
    preHandler: [app.authorize('ALUNO'), app.requireTenant],
    handler: async (request, reply) => {
      const user = request.user as JwtPayload
      const { reservaId } = z.object({ reservaId: z.number().int().positive() }).parse(request.body)
      const aluno = await prisma.aluno.findFirst({ where: { usuarioId: user.sub } })
      if (!aluno) throw criarErro(403, 'Aluno não vinculado')
      const c = await makeService(request).autoCheckin(aluno.id, reservaId)
      return reply.status(201).send(c)
    },
  })

  // DELETE /checkins/:id — desfazer (admin/recepção/professor)
  app.delete('/:id', {
    preHandler: [app.authorize(...PAPEIS_OPERACIONAL, 'PROFESSOR'), app.requireTenant],
    handler: async (request) => {
      const id = Number((request.params as { id: string }).id)
      return makeService(request).desfazer(id)
    },
  })

  // GET /checkins/historico?alunoId=
  app.get('/historico', {
    preHandler: [app.authenticate, app.requireTenant],
    handler: async (request) => {
      const user = request.user as JwtPayload
      const q = request.query as Record<string, string>
      let alunoId = q.alunoId ? Number(q.alunoId) : undefined
      if (user.papel === 'ALUNO') {
        const aluno = await prisma.aluno.findFirst({ where: { usuarioId: user.sub } })
        if (!aluno) throw criarErro(403, 'Aluno não vinculado')
        alunoId = aluno.id
      }
      if (!alunoId) throw criarErro(400, 'Informe alunoId')
      return makeService(request).historicoDoAluno(alunoId)
    },
  })
}

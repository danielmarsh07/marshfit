import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { ReservasService } from './reservas.service.js'
import { PAPEIS_OPERACIONAL } from '../../shared/utils/permissions.js'
import { criarErro } from '../../shared/utils/errors.js'
import type { JwtPayload } from '../../shared/plugins/auth.plugin.js'
import { prisma } from '../../infra/database/prisma.js'

const reservarSchema = z.object({
  aulaId:   z.number().int().positive(),
  // alunoId e opcional: quando o usuario logado e ALUNO, resolvemos via JWT.
  // Quando admin/recepcao reserva para alguem, o alunoId e obrigatorio.
  alunoId:  z.number().int().positive().optional(),
  dataAula: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD'),
})

const cancelarSchema = z.object({
  motivo: z.string().max(500).optional(),
})

/**
 * Resolve o alunoId quando quem chama é um ALUNO (não pode reservar para outro).
 * Para admin/recepção, exige alunoId explícito no payload.
 *
 * Para ALUNO: ignora alunoId do body (o aluno nem precisa saber seu ID),
 * resolve sempre pelo JWT. Se um ID veio e nao bate, rejeita (defesa contra
 * tentativa de reservar em nome de outro).
 */
async function resolverAlunoIdParaCriacao(user: JwtPayload, alunoIdInformado: number | undefined): Promise<number> {
  if (user.papel === 'ALUNO') {
    const aluno = await prisma.aluno.findFirst({ where: { usuarioId: user.sub } })
    if (!aluno) throw criarErro(403, 'Aluno não vinculado a este usuário')
    if (alunoIdInformado !== undefined && alunoIdInformado !== aluno.id) {
      throw criarErro(403, 'Não é possível reservar em nome de outro aluno')
    }
    return aluno.id
  }
  if (!alunoIdInformado) throw criarErro(400, 'Informe o alunoId')
  return alunoIdInformado
}

export async function reservasRoutes(app: FastifyInstance) {
  function makeService(req: import('fastify').FastifyRequest) {
    return new ReservasService(req.tenant.db, req.tenant.academiaId)
  }

  // POST /reservas — aluno reserva pra si; admin/recepção reserva para qualquer aluno.
  app.post('/', {
    preHandler: [app.authenticate, app.requireTenant],
    handler: async (request, reply) => {
      const user = request.user as JwtPayload
      const data = reservarSchema.parse(request.body)
      const alunoId = await resolverAlunoIdParaCriacao(user, data.alunoId)
      const reserva = await makeService(request).reservar({ ...data, alunoId })
      return reply.status(201).send(reserva)
    },
  })

  // DELETE /reservas/:id — cancelar
  app.delete('/:id', {
    preHandler: [app.authenticate, app.requireTenant],
    handler: async (request) => {
      const id = Number((request.params as { id: string }).id)
      const user = request.user as JwtPayload
      const body = request.body as Record<string, string> | null
      const motivo = body?.motivo

      let alunoIdFilter: number | undefined
      if (user.papel === 'ALUNO') {
        const aluno = await prisma.aluno.findFirst({ where: { usuarioId: user.sub } })
        if (!aluno) throw criarErro(403, 'Aluno não vinculado')
        alunoIdFilter = aluno.id
      }
      return makeService(request).cancelar(id, { alunoId: alunoIdFilter, motivo })
    },
  })

  app.post('/:id/cancelar', {
    preHandler: [app.authenticate, app.requireTenant],
    handler: async (request) => {
      const id = Number((request.params as { id: string }).id)
      const { motivo } = cancelarSchema.parse(request.body ?? {})
      const user = request.user as JwtPayload
      let alunoIdFilter: number | undefined
      if (user.papel === 'ALUNO') {
        const aluno = await prisma.aluno.findFirst({ where: { usuarioId: user.sub } })
        if (!aluno) throw criarErro(403, 'Aluno não vinculado')
        alunoIdFilter = aluno.id
      }
      return makeService(request).cancelar(id, { alunoId: alunoIdFilter, motivo })
    },
  })

  // GET /reservas/por-aula?aulaId=&dataAula= — admin/professor/recepção
  app.get('/por-aula', {
    preHandler: [app.authorize(...PAPEIS_OPERACIONAL, 'PROFESSOR'), app.requireTenant],
    handler: async (request) => {
      const q = request.query as Record<string, string>
      if (!q.aulaId || !q.dataAula) throw criarErro(400, 'Informe aulaId e dataAula')
      return makeService(request).listarPorAula(Number(q.aulaId), q.dataAula)
    },
  })

  // GET /reservas?alunoId=&somenteFuturas=true — admin lista reservas de um aluno
  app.get('/', {
    preHandler: [app.authorize(...PAPEIS_OPERACIONAL, 'PROFESSOR'), app.requireTenant],
    handler: async (request) => {
      const q = request.query as Record<string, string>
      if (!q.alunoId) throw criarErro(400, 'Informe alunoId')
      return makeService(request).listarDoAluno(Number(q.alunoId), { somenteFuturas: q.somenteFuturas === 'true' })
    },
  })
}

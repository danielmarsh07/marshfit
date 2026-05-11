import type { FastifyInstance } from 'fastify'
import { PortalAlunoService } from './portal-aluno.service.js'
import { ReservasService } from '../reservas/reservas.service.js'
import { criarErro } from '../../shared/utils/errors.js'
import type { JwtPayload } from '../../shared/plugins/auth.plugin.js'

export async function portalAlunoRoutes(app: FastifyInstance) {
  function makeService(req: import('fastify').FastifyRequest) {
    return new PortalAlunoService(req.tenant.db)
  }

  // GET /portal/me — dados do aluno logado (perfil + plano + unidade)
  app.get('/me', {
    preHandler: [app.authorize('ALUNO'), app.requireTenant],
    handler: async (request) => {
      const user = request.user as JwtPayload
      return makeService(request).carregarAluno(user.sub)
    },
  })

  // GET /portal/programacao?dias=7
  app.get('/programacao', {
    preHandler: [app.authorize('ALUNO'), app.requireTenant],
    handler: async (request) => {
      const user = request.user as JwtPayload
      const q = request.query as Record<string, string>
      const dias = q.dias ? Math.min(Math.max(Number(q.dias), 1), 14) : 7
      return makeService(request).programacao(user.sub, dias)
    },
  })

  // GET /portal/minhas-reservas?somenteFuturas=true
  app.get('/minhas-reservas', {
    preHandler: [app.authorize('ALUNO'), app.requireTenant],
    handler: async (request) => {
      const user = request.user as JwtPayload
      const q = request.query as Record<string, string>
      const aluno = await request.tenant.db.aluno.findFirst({ where: { usuarioId: user.sub } })
      if (!aluno) throw criarErro(404, 'Aluno não encontrado')
      const service = new ReservasService(request.tenant.db, request.tenant.academiaId)
      return service.listarDoAluno(aluno.id, { somenteFuturas: q.somenteFuturas !== 'false' })
    },
  })
}

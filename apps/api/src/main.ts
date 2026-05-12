import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import jwt from '@fastify/jwt'
import cookie from '@fastify/cookie'
import rateLimit from '@fastify/rate-limit'

import { env } from './shared/config/env.js'
import { authPlugin } from './shared/plugins/auth.plugin.js'
import { tenantPlugin } from './shared/plugins/tenant.plugin.js'
import { errorHandler } from './shared/plugins/error-handler.plugin.js'

import { authRoutes } from './modules/auth/auth.routes.js'
import { healthRoutes } from './modules/health/health.routes.js'
import { academiasRoutes } from './modules/academias/academias.routes.js'
import { leadsRoutes } from './modules/leads/leads.routes.js'
import { unidadesRoutes } from './modules/unidades/unidades.routes.js'
import { modalidadesRoutes } from './modules/modalidades/modalidades.routes.js'
import { salasRoutes } from './modules/salas/salas.routes.js'
import { professoresRoutes } from './modules/professores/professores.routes.js'
import { planosRoutes } from './modules/planos/planos.routes.js'
import { alunosRoutes } from './modules/alunos/alunos.routes.js'
import { matriculasRoutes } from './modules/matriculas/matriculas.routes.js'
import { treinosRoutes } from './modules/treinos/treinos.routes.js'
import { aulasRoutes } from './modules/aulas/aulas.routes.js'
import { reservasRoutes } from './modules/reservas/reservas.routes.js'
import { checkinsRoutes } from './modules/checkins/checkins.routes.js'
import { portalAlunoRoutes } from './modules/portal-aluno/portal-aluno.routes.js'
import { usuariosRoutes } from './modules/usuarios/usuarios.routes.js'

const app = Fastify({
  logger: {
    level: env.NODE_ENV === 'production' ? 'warn' : 'info',
    transport: env.NODE_ENV !== 'production'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
  },
})

// ── Plugins de segurança ──────────────────────────────────────────────
await app.register(helmet, { global: true, contentSecurityPolicy: false })

await app.register(cors, {
  origin: env.CORS_ORIGINS.split(',').map(s => s.trim()),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
})

await app.register(rateLimit, { max: 200, timeWindow: '1 minute' })

// ── Cookies e JWT ─────────────────────────────────────────────────────
await app.register(cookie)
await app.register(jwt, {
  secret: env.JWT_SECRET,
  cookie: { cookieName: 'refreshToken', signed: false },
})

// ── Auth e tenant ─────────────────────────────────────────────────────
await app.register(authPlugin)
await app.register(tenantPlugin)

// ── Error handler ─────────────────────────────────────────────────────
app.setErrorHandler(errorHandler)

// ── Rotas ─────────────────────────────────────────────────────────────
await app.register(healthRoutes, { prefix: '/health' })
await app.register(authRoutes, { prefix: '/auth' })
await app.register(academiasRoutes, { prefix: '/academias' })
await app.register(leadsRoutes, { prefix: '/leads' })
await app.register(unidadesRoutes,    { prefix: '/unidades' })
await app.register(modalidadesRoutes, { prefix: '/modalidades' })
await app.register(salasRoutes,       { prefix: '/salas' })
await app.register(professoresRoutes, { prefix: '/professores' })
await app.register(planosRoutes,      { prefix: '/planos' })
await app.register(alunosRoutes,      { prefix: '/alunos' })
await app.register(matriculasRoutes,  { prefix: '/matriculas' })
await app.register(treinosRoutes,     { prefix: '/treinos' })
await app.register(aulasRoutes,       { prefix: '/aulas' })
await app.register(reservasRoutes,    { prefix: '/reservas' })
await app.register(checkinsRoutes,    { prefix: '/checkins' })
await app.register(portalAlunoRoutes, { prefix: '/portal' })
await app.register(usuariosRoutes,    { prefix: '/usuarios' })

// ── Inicializar ───────────────────────────────────────────────────────
try {
  await app.listen({ port: env.API_PORT, host: env.API_HOST })
  app.log.info(`MarshFit API rodando em http://${env.API_HOST}:${env.API_PORT}`)
} catch (err) {
  app.log.error(err)
  process.exit(1)
}

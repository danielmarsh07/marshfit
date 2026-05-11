import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { AuthService } from './auth.service.js'
import { env } from '../../shared/config/env.js'
import { refreshCookieOptions } from '../../shared/utils/cookies.js'
import type { JwtPayload } from '../../shared/plugins/auth.plugin.js'

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  senha: z.string().min(1, 'Senha obrigatória'),
})

const selecionarAcademiaSchema = z.object({
  academiaId: z.number().int().positive(),
})

export async function authRoutes(app: FastifyInstance) {
  const service = new AuthService()

  // POST /auth/login — verifica credenciais, devolve vínculos disponíveis.
  app.post('/login', async (request, reply) => {
    const { email, senha } = loginSchema.parse(request.body)
    const resultado = await service.autenticar(email, senha)

    // Se o usuário tem só 1 vínculo, já emite o token direto pra simplificar.
    if (resultado.vinculos.length === 1) {
      const v = resultado.vinculos[0]
      const payload: JwtPayload = {
        sub: resultado.usuario.id,
        papel: v.papel,
        academiaId: v.academiaId,
        unidadeId: v.unidadeId,
      }
      const accessToken = app.jwt.sign(payload, { expiresIn: env.JWT_ACCESS_EXPIRES_IN })
      const refreshToken = app.jwt.sign({ ...payload, kind: 'refresh' }, { expiresIn: env.JWT_REFRESH_EXPIRES_IN })

      reply.setCookie('refreshToken', refreshToken, refreshCookieOptions)

      return reply.send({
        modo: 'autenticado',
        accessToken,
        usuario: resultado.usuario,
        vinculo: v,
      })
    }

    // Múltiplos vínculos — devolve a lista, frontend mostra seletor.
    return reply.send({
      modo: 'escolher_academia',
      usuario: resultado.usuario,
      vinculos: resultado.vinculos,
    })
  })

  // POST /auth/selecionar-academia — emite o token para a academia escolhida.
  // Requer login parcial: precisa enviar email + senha de novo (sem manter
  // estado intermediário, mais simples e seguro).
  app.post('/selecionar-academia', async (request, reply) => {
    const body = z.object({
      email: z.string().email(),
      senha: z.string().min(1),
      academiaId: z.number().int().positive(),
    }).parse(request.body)

    const auth = await service.autenticar(body.email, body.senha)
    const vinculo = auth.vinculos.find(v => v.academiaId === body.academiaId)
    if (!vinculo) {
      return reply.status(403).send({ error: 'Você não tem vínculo com essa academia' })
    }

    const payload: JwtPayload = {
      sub: auth.usuario.id,
      papel: vinculo.papel,
      academiaId: vinculo.academiaId,
      unidadeId: vinculo.unidadeId,
    }
    const accessToken = app.jwt.sign(payload, { expiresIn: env.JWT_ACCESS_EXPIRES_IN })
    const refreshToken = app.jwt.sign({ ...payload, kind: 'refresh' }, { expiresIn: env.JWT_REFRESH_EXPIRES_IN })

    reply.setCookie('refreshToken', refreshToken, refreshCookieOptions)

    return reply.send({
      accessToken,
      usuario: auth.usuario,
      vinculo,
    })
  })

  // POST /auth/refresh — renova o access token usando o refresh do cookie.
  app.post('/refresh', async (request, reply) => {
    try {
      await request.jwtVerify({ onlyCookie: true })
      const payload = request.user as JwtPayload & { kind?: string }
      if (payload.kind !== 'refresh') {
        return reply.status(401).send({ error: 'Token de refresh inválido' })
      }

      const newPayload: JwtPayload = {
        sub: payload.sub,
        papel: payload.papel,
        academiaId: payload.academiaId,
        unidadeId: payload.unidadeId,
      }
      const accessToken = app.jwt.sign(newPayload, { expiresIn: env.JWT_ACCESS_EXPIRES_IN })
      return reply.send({ accessToken })
    } catch {
      return reply.status(401).send({ error: 'Refresh inválido ou expirado' })
    }
  })

  // POST /auth/logout — limpa o cookie de refresh.
  app.post('/logout', async (_request, reply) => {
    reply.clearCookie('refreshToken', refreshCookieOptions)
    return reply.send({ ok: true })
  })

  // GET /auth/me — dados do usuário logado (útil para hidratação no frontend).
  app.get('/me', {
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      const user = request.user as JwtPayload
      return reply.send(user)
    },
  })
}

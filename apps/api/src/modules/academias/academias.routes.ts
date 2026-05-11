import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { AcademiasService } from './academias.service.js'
import { env } from '../../shared/config/env.js'
import { refreshCookieOptions } from '../../shared/utils/cookies.js'
import type { JwtPayload } from '../../shared/plugins/auth.plugin.js'

const registrarSchema = z.object({
  nomeAcademia:     z.string().min(2, 'Nome da academia muito curto').max(120),
  cnpjCpf:          z.string().min(11, 'CNPJ/CPF inválido').max(20),
  emailAcademia:    z.string().email('Email da academia inválido'),
  telefoneAcademia: z.string().min(8, 'Telefone inválido').max(20),
  nomeAdmin:        z.string().min(2, 'Nome muito curto').max(120),
  emailAdmin:       z.string().email('Seu email é inválido'),
  senha:            z.string().min(6, 'A senha precisa ter ao menos 6 caracteres'),
})

export async function academiasRoutes(app: FastifyInstance) {
  const service = new AcademiasService()

  // POST /academias/registrar — público, sem auth. Cria academia em TRIAL,
  // já faz login automático devolvendo accessToken.
  app.post('/registrar', {
    // Rate-limit local — público, alvo de spam. 5/min por IP.
    config: {
      rateLimit: { max: 5, timeWindow: '1 minute' },
    },
    handler: async (request, reply) => {
      const data = registrarSchema.parse(request.body)
      const { usuario, academia } = await service.registrarTrial(data)

      const payload: JwtPayload = {
        sub: usuario.id,
        papel: 'ADMIN_ACADEMIA',
        academiaId: academia.id,
        unidadeId: null,
      }

      const accessToken = app.jwt.sign(payload, { expiresIn: env.JWT_ACCESS_EXPIRES_IN })
      const refreshToken = app.jwt.sign(
        { ...payload, kind: 'refresh' },
        { expiresIn: env.JWT_REFRESH_EXPIRES_IN },
      )

      reply.setCookie('refreshToken', refreshToken, refreshCookieOptions)

      return reply.status(201).send({
        accessToken,
        usuario,
        vinculo: {
          academiaId: academia.id,
          academiaNome: academia.nome,
          papel: 'ADMIN_ACADEMIA',
          unidadeId: null,
          unidadeNome: null,
        },
        academia,
      })
    },
  })
}

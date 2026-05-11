import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { LeadsService } from './leads.service.js'
import { PAPEIS_ADMIN } from '../../shared/utils/permissions.js'

const registrarSchema = z.object({
  nome:     z.string().min(2).max(120),
  email:    z.string().email(),
  telefone: z.string().min(8).max(20),
  academia: z.string().max(120).optional(),
  cidade:   z.string().max(120).optional(),
  mensagem: z.string().max(2000).optional(),
  origem:   z.string().max(60).optional(),
})

export async function leadsRoutes(app: FastifyInstance) {
  const service = new LeadsService()

  // POST /leads — público. Captura de interesse da landing.
  app.post('/', {
    config: {
      rateLimit: { max: 10, timeWindow: '1 minute' },
    },
    handler: async (request, reply) => {
      const data = registrarSchema.parse(request.body)
      const lead = await service.registrar(data)
      return reply.status(201).send({
        ok: true,
        id: lead.id,
        mensagem: 'Recebemos seu contato! Nossa equipe vai te chamar em breve.',
      })
    },
  })

  // GET /leads — protegido, somente Super Admin Marsh / Admin academia (futuro:
  // restringir a SUPER_ADMIN apenas). Lista leads para acompanhamento comercial.
  app.get('/', {
    preHandler: [app.authorize(...PAPEIS_ADMIN)],
    handler: async () => {
      // Lead não é tenant-scoped (é lead da Marsh, não de uma academia).
      // Usa prisma raw direto. Restringimos visualização ao Super Admin
      // futuramente; por ora liberamos para ADMIN_ACADEMIA também enxergar
      // leads gerais do produto.
      const { prisma } = await import('../../infra/database/prisma.js')
      const leads = await prisma.lead.findMany({
        orderBy: { criadoEm: 'desc' },
        take: 200,
      })
      return { leads }
    },
  })
}

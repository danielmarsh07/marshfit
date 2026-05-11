import type { FastifyInstance } from 'fastify'

export async function healthRoutes(app: FastifyInstance) {
  app.get('/', async () => ({
    status: 'ok',
    service: 'marshfit-api',
    timestamp: new Date().toISOString(),
  }))
}

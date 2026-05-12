import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { UsuariosService } from './usuarios.service.js'
import { PAPEIS_ADMIN } from '../../shared/utils/permissions.js'

const papelEnum = z.enum([
  'ADMIN_ACADEMIA',
  'GESTOR_UNIDADE',
  'FINANCEIRO',
  'PROFESSOR',
  'RECEPCAO',
])

const convidarSchema = z.object({
  nome:      z.string().min(2).max(120),
  email:     z.string().email(),
  senha:     z.string().min(6).max(72),
  papel:     papelEnum,
  unidadeId: z.number().int().positive().optional(),
})

export async function usuariosRoutes(app: FastifyInstance) {
  function makeService(req: import('fastify').FastifyRequest) {
    return new UsuariosService(req.tenant.academiaId)
  }

  // GET /usuarios — lista equipe da academia
  app.get('/', {
    preHandler: [app.authorize(...PAPEIS_ADMIN), app.requireTenant],
    handler: async (request) => makeService(request).listar(),
  })

  // POST /usuarios — convida (cria usuário + vínculo)
  app.post('/', {
    preHandler: [app.authorize(...PAPEIS_ADMIN), app.requireTenant],
    handler: async (request, reply) => {
      const data = convidarSchema.parse(request.body)
      return reply.status(201).send(await makeService(request).convidar(data))
    },
  })

  // PATCH /usuarios/:id/ativo — habilita/desabilita
  app.patch('/:id/ativo', {
    preHandler: [app.authorize(...PAPEIS_ADMIN), app.requireTenant],
    handler: async (request) => {
      const id = Number((request.params as { id: string }).id)
      const { ativo } = z.object({ ativo: z.boolean() }).parse(request.body)
      return makeService(request).ativar(id, ativo)
    },
  })

  // POST /usuarios/:id/resetar-senha — admin define senha nova
  app.post('/:id/resetar-senha', {
    preHandler: [app.authorize(...PAPEIS_ADMIN), app.requireTenant],
    handler: async (request) => {
      const id = Number((request.params as { id: string }).id)
      const { senha } = z.object({ senha: z.string().min(6).max(72) }).parse(request.body)
      return makeService(request).resetarSenha(id, senha)
    },
  })
}

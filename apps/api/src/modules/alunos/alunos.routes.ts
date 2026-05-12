import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { AlunosService } from './alunos.service.js'
import { PAPEIS_OPERACIONAL } from '../../shared/utils/permissions.js'
import { unidadeIdParaCriar } from '../../shared/utils/unidade.js'
import type { AlunoStatus } from '@prisma/client'

const sexoEnum = z.enum(['M', 'F', 'OUTRO'])
const statusEnum = z.enum(['ATIVO', 'INATIVO', 'CONGELADO', 'INADIMPLENTE'])

const criarSchema = z.object({
  unidadeId:   z.number().int().positive().optional(),
  nome:        z.string().min(2).max(120),
  cpf:         z.string().max(20).optional(),
  dataNasc:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar em YYYY-MM-DD').optional(),
  sexo:        sexoEnum.optional(),
  email:       z.string().email().optional().or(z.literal('')),
  telefone:    z.string().min(8).max(20),
  endereco:    z.string().max(200).optional(),
  bairro:      z.string().max(120).optional(),
  cidade:      z.string().max(120).optional(),
  estado:      z.string().length(2).optional(),
  observacoes: z.string().max(2000).optional(),
  status:      statusEnum.optional(),
})

const editarSchema = z.object({
  unidadeId:   z.number().int().positive(),
  nome:        z.string().min(2).max(120),
  cpf:         z.string().max(20).optional(),
  dataNasc:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar em YYYY-MM-DD').optional(),
  sexo:        sexoEnum.optional(),
  email:       z.string().email().optional().or(z.literal('')),
  telefone:    z.string().min(8).max(20),
  endereco:    z.string().max(200).optional(),
  bairro:      z.string().max(120).optional(),
  cidade:      z.string().max(120).optional(),
  estado:      z.string().length(2).optional(),
  observacoes: z.string().max(2000).optional(),
  status:      statusEnum.optional(),
}).partial()

export async function alunosRoutes(app: FastifyInstance) {
  function makeService(req: import('fastify').FastifyRequest) {
    return new AlunosService(req.tenant.db, req.tenant.academiaId)
  }

  app.get('/', {
    preHandler: [app.authenticate, app.requireTenant],
    handler: async (request) => {
      const q = request.query as Record<string, string>
      return makeService(request).listar({
        busca: q.busca,
        unidadeId: q.unidadeId ? Number(q.unidadeId) : undefined,
        status: q.status as AlunoStatus | undefined,
        page: q.page ? Number(q.page) : undefined,
        limit: q.limit ? Number(q.limit) : undefined,
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
    preHandler: [app.authorize(...PAPEIS_OPERACIONAL), app.requireTenant],
    handler: async (request, reply) => {
      const data = criarSchema.parse(request.body)
      const unidadeId = unidadeIdParaCriar(request.tenant, data.unidadeId)
      return reply.status(201).send(await makeService(request).criar({
        ...data,
        unidadeId,
        email: data.email || undefined,
      }))
    },
  })

  app.put('/:id', {
    preHandler: [app.authorize(...PAPEIS_OPERACIONAL), app.requireTenant],
    handler: async (request) => {
      const id = Number((request.params as { id: string }).id)
      const data = editarSchema.parse(request.body)
      return makeService(request).atualizar(id, { ...data, email: data.email || undefined })
    },
  })

  app.delete('/:id', {
    preHandler: [app.authorize(...PAPEIS_OPERACIONAL), app.requireTenant],
    handler: async (request) => {
      const id = Number((request.params as { id: string }).id)
      return makeService(request).excluir(id)
    },
  })

  // POST /alunos/:id/acesso — cria/reseta acesso do aluno ao portal.
  app.post('/:id/acesso', {
    preHandler: [app.authorize(...PAPEIS_OPERACIONAL), app.requireTenant],
    handler: async (request) => {
      const id = Number((request.params as { id: string }).id)
      const { senha } = z.object({ senha: z.string().min(6) }).parse(request.body)
      return makeService(request).criarAcesso(id, senha)
    },
  })
}

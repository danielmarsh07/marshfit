import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify'
import { ZodError } from 'zod'
import { AppError } from '../utils/errors.js'

export function errorHandler(
  error: FastifyError | AppError | ZodError | Error,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  // Zod validation
  if (error instanceof ZodError) {
    return reply.status(400).send({
      error: 'Dados inválidos',
      detalhes: error.flatten().fieldErrors,
    })
  }

  // AppError (criarErro)
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({ error: error.message })
  }

  // Fastify validation
  const fastifyError = error as FastifyError
  if (fastifyError.statusCode && fastifyError.statusCode < 500) {
    return reply.status(fastifyError.statusCode).send({ error: error.message })
  }

  // Erros inesperados — logar, devolver 500 genérico
  request.log.error({ err: error }, 'Erro não tratado')
  return reply.status(500).send({ error: 'Erro interno do servidor' })
}

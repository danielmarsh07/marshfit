import { PrismaClient } from '@prisma/client'

// Cliente raw — usado pelo módulo de auth (não tenant-scoped) e pelo seed.
// Para queries de domínio tenant-scoped, use `prismaTenant(academiaId)`
// (ver `tenant.plugin.ts`), que aplica `where: { academiaId }` automaticamente.

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
})

// Lista de models tenant-scoped — ampliar conforme entidades de domínio
// (Aula, Reserva, Checkin, etc) forem criadas nas Fases 4+.
export const TENANT_SCOPED_MODELS = new Set<string>([
  'Unidade',
  'Modalidade',
  'Sala',
  'Professor',
  'Plano',
  'Aluno',
  'Matricula',
  'Aula',
  'Treino',
  'Reserva',
  'Checkin',
  // 'Mensalidade', 'ContaPagar', 'Aviso',
])

/**
 * Cria um Prisma client tenant-aware: força `where.academiaId = X` em
 * findMany/findFirst/update/delete/count dos models tenant-scoped.
 *
 * Defense-in-depth: mesmo que um service esqueça de passar `academiaId`,
 * a extension impede vazamento de dados entre academias.
 *
 * Super Admin (Marsh) pode passar `bypass: true` para queries cross-tenant.
 */
export function prismaTenant(academiaId: number, opts?: { bypass?: boolean }) {
  if (opts?.bypass) return prisma

  return prisma.$extends({
    name: 'tenantScope',
    query: {
      $allModels: {
        async findMany({ model, args, query }) {
          if (TENANT_SCOPED_MODELS.has(model)) {
            args.where = { ...args.where, academiaId }
          }
          return query(args)
        },
        async findFirst({ model, args, query }) {
          if (TENANT_SCOPED_MODELS.has(model)) {
            args.where = { ...args.where, academiaId }
          }
          return query(args)
        },
        async findUnique({ model, args, query }) {
          // findUnique exige campos unique; aplicamos `where` extra via findFirst-like.
          // Para simplicidade, deixamos findUnique sem injeção e exigimos uso
          // disciplinado nos services (sempre validar academiaId após o find).
          return query(args)
        },
        async count({ model, args, query }) {
          if (TENANT_SCOPED_MODELS.has(model)) {
            args.where = { ...args.where, academiaId }
          }
          return query(args)
        },
        async update({ model, args, query }) {
          if (TENANT_SCOPED_MODELS.has(model)) {
            args.where = { ...args.where, academiaId }
          }
          return query(args)
        },
        async updateMany({ model, args, query }) {
          if (TENANT_SCOPED_MODELS.has(model)) {
            args.where = { ...args.where, academiaId }
          }
          return query(args)
        },
        async delete({ model, args, query }) {
          if (TENANT_SCOPED_MODELS.has(model)) {
            args.where = { ...args.where, academiaId }
          }
          return query(args)
        },
        async deleteMany({ model, args, query }) {
          if (TENANT_SCOPED_MODELS.has(model)) {
            args.where = { ...args.where, academiaId }
          }
          return query(args)
        },
        async create({ model, args, query }) {
          // Em create, garantimos que academiaId está presente. Se o service
          // não passou, injetamos. Se passou diferente do tenant, lançamos.
          if (TENANT_SCOPED_MODELS.has(model)) {
            const data = args.data as Record<string, unknown>
            if (data.academiaId !== undefined && data.academiaId !== academiaId) {
              throw new Error(
                `[tenantScope] Tentativa de criar ${model} em academia diferente do contexto (got=${data.academiaId}, expected=${academiaId})`,
              )
            }
            args.data = { ...data, academiaId }
          }
          return query(args)
        },
      },
    },
  })
}

export type PrismaTenantClient = ReturnType<typeof prismaTenant>

import { PrismaClient } from '@prisma/client'

// Cliente raw — usado pelo módulo de auth (não tenant-scoped) e pelo seed.
// Para queries de domínio tenant-scoped, use `prismaTenant(academiaId)`
// (ver `tenant.plugin.ts`), que aplica `where: { academiaId }` automaticamente.

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
})

// Lista de models tenant-scoped (filtrados por academiaId).
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

// Models que ALÉM de academiaId também têm unidadeId — quando o usuário é
// GESTOR_UNIDADE / PROFESSOR / RECEPCAO, queremos forçar também o filtro
// pela unidade dele. Matricula NÃO está aqui porque é filha de Aluno (que
// já tem unidadeId) — filtramos via Aluno.unidadeId no service quando preciso.
export const UNIT_SCOPED_MODELS = new Set<string>([
  'Modalidade',
  'Sala',
  'Professor',
  'Plano',
  'Aluno',
  'Aula',
  'Treino',
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
            // Cast pra any: o tipo union de todos os creates é incompatível,
            // mas em runtime cada model só recebe seus próprios campos.
            args.data = { ...data, academiaId } as typeof args.data
          }
          return query(args)
        },
      },
    },
  })
}

export type PrismaTenantClient = ReturnType<typeof prismaTenant>

/**
 * Variante do prismaTenant que ALÉM de academiaId, força filtro por unidadeId
 * em models UNIT_SCOPED. Usado para usuários com papel restrito a uma unidade
 * (GESTOR_UNIDADE, PROFESSOR, RECEPCAO).
 *
 * Funciona em duas camadas: primeiro aplica academiaId (via prismaTenant),
 * depois um segundo $extends que adiciona unidadeId onde aplicável.
 */
export function prismaTenantUnidade(academiaId: number, unidadeId: number) {
  return prismaTenant(academiaId).$extends({
    name: 'unidadeScope',
    query: {
      $allModels: {
        async findMany({ model, args, query }) {
          if (UNIT_SCOPED_MODELS.has(model)) {
            args.where = { ...args.where, unidadeId }
          }
          return query(args)
        },
        async findFirst({ model, args, query }) {
          if (UNIT_SCOPED_MODELS.has(model)) {
            args.where = { ...args.where, unidadeId }
          }
          return query(args)
        },
        async count({ model, args, query }) {
          if (UNIT_SCOPED_MODELS.has(model)) {
            args.where = { ...args.where, unidadeId }
          }
          return query(args)
        },
        async update({ model, args, query }) {
          if (UNIT_SCOPED_MODELS.has(model)) {
            args.where = { ...args.where, unidadeId }
          }
          return query(args)
        },
        async updateMany({ model, args, query }) {
          if (UNIT_SCOPED_MODELS.has(model)) {
            args.where = { ...args.where, unidadeId }
          }
          return query(args)
        },
        async delete({ model, args, query }) {
          if (UNIT_SCOPED_MODELS.has(model)) {
            args.where = { ...args.where, unidadeId }
          }
          return query(args)
        },
        async deleteMany({ model, args, query }) {
          if (UNIT_SCOPED_MODELS.has(model)) {
            args.where = { ...args.where, unidadeId }
          }
          return query(args)
        },
        async create({ model, args, query }) {
          if (UNIT_SCOPED_MODELS.has(model)) {
            const data = args.data as Record<string, unknown>
            if (data.unidadeId !== undefined && data.unidadeId !== unidadeId) {
              throw new Error(
                `[unidadeScope] Tentativa de criar ${model} em unidade diferente do contexto (got=${data.unidadeId}, expected=${unidadeId})`,
              )
            }
            args.data = { ...data, unidadeId } as typeof args.data
          }
          return query(args)
        },
      },
    },
  })
}

import type { PrismaTenantClient } from '../../infra/database/prisma.js'
import { criarErro } from '../../shared/utils/errors.js'
import { garantirIdsDoTenant } from '../../shared/utils/tenant-guard.js'
import type { NivelTreino, FormatoTreino } from '@prisma/client'

export interface TreinoInput {
  nome: string
  modalidadeId?: number
  nivel?: NivelTreino
  formato?: FormatoTreino
  duracaoMin?: number
  descricao: string
  ativo?: boolean
}

export class TreinosService {
  constructor(private db: PrismaTenantClient, private academiaId: number) {}

  async listar(filtros: { busca?: string; modalidadeId?: number; ativo?: boolean } = {}) {
    return this.db.treino.findMany({
      where: {
        ...(filtros.ativo !== undefined ? { ativo: filtros.ativo } : {}),
        ...(filtros.modalidadeId ? { modalidadeId: filtros.modalidadeId } : {}),
        ...(filtros.busca
          ? { OR: [
              { nome:      { contains: filtros.busca, mode: 'insensitive' as const } },
              { descricao: { contains: filtros.busca, mode: 'insensitive' as const } },
            ] }
          : {}),
      },
      include: { modalidade: { select: { id: true, nome: true, cor: true } } },
      orderBy: { atualizadoEm: 'desc' },
    })
  }

  async buscar(id: number) {
    const t = await this.db.treino.findFirst({
      where: { id },
      include: { modalidade: { select: { id: true, nome: true, cor: true } } },
    })
    if (!t) throw criarErro(404, 'Treino não encontrado')
    return t
  }

  async criar(input: TreinoInput) {
    if (input.modalidadeId) {
      await garantirIdsDoTenant({ model: 'modalidade', ids: [input.modalidadeId], academiaId: this.academiaId })
    }
    return this.db.treino.create({
      data: {
        nome: input.nome.trim(),
        modalidadeId: input.modalidadeId ?? null,
        nivel: input.nivel ?? null,
        formato: input.formato ?? null,
        duracaoMin: input.duracaoMin ?? null,
        descricao: input.descricao,
        ativo: input.ativo ?? true,
      },
      include: { modalidade: { select: { id: true, nome: true, cor: true } } },
    })
  }

  async atualizar(id: number, input: Partial<TreinoInput>) {
    await this.buscar(id)
    if (input.modalidadeId) {
      await garantirIdsDoTenant({ model: 'modalidade', ids: [input.modalidadeId], academiaId: this.academiaId })
    }
    return this.db.treino.update({
      where: { id },
      data: {
        ...(input.nome !== undefined         ? { nome: input.nome.trim() } : {}),
        ...(input.modalidadeId !== undefined ? { modalidadeId: input.modalidadeId ?? null } : {}),
        ...(input.nivel !== undefined        ? { nivel: input.nivel ?? null } : {}),
        ...(input.formato !== undefined      ? { formato: input.formato ?? null } : {}),
        ...(input.duracaoMin !== undefined   ? { duracaoMin: input.duracaoMin ?? null } : {}),
        ...(input.descricao !== undefined    ? { descricao: input.descricao } : {}),
        ...(input.ativo !== undefined        ? { ativo: input.ativo } : {}),
      },
      include: { modalidade: { select: { id: true, nome: true, cor: true } } },
    })
  }

  async excluir(id: number) {
    await this.buscar(id)
    return this.db.treino.update({ where: { id }, data: { ativo: false } })
  }
}

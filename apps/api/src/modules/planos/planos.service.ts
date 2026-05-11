import type { PrismaTenantClient } from '../../infra/database/prisma.js'
import { criarErro } from '../../shared/utils/errors.js'
import { garantirIdsDoTenant } from '../../shared/utils/tenant-guard.js'
import type { Periodicidade } from '@prisma/client'

export interface PlanoInput {
  nome: string
  descricao?: string
  valor: number
  periodicidade: Periodicidade
  aulasPorSemana?: number
  acessoLivre?: boolean
  modalidadeIds?: number[]
  ativo?: boolean
}

export class PlanosService {
  constructor(private db: PrismaTenantClient, private academiaId: number) {}

  async listar(filtros: { busca?: string; ativo?: boolean } = {}) {
    return this.db.plano.findMany({
      where: {
        ...(filtros.ativo !== undefined ? { ativo: filtros.ativo } : {}),
        ...(filtros.busca
          ? { nome: { contains: filtros.busca, mode: 'insensitive' } }
          : {}),
      },
      include: { modalidades: { select: { id: true, nome: true, cor: true } } },
      orderBy: { valor: 'asc' },
    })
  }

  async buscar(id: number) {
    const p = await this.db.plano.findFirst({
      where: { id },
      include: { modalidades: { select: { id: true, nome: true, cor: true } } },
    })
    if (!p) throw criarErro(404, 'Plano não encontrado')
    return p
  }

  async criar(input: PlanoInput) {
    if (input.modalidadeIds?.length) {
      await garantirIdsDoTenant({ model: 'modalidade', ids: input.modalidadeIds, academiaId: this.academiaId })
    }
    return this.db.plano.create({
      data: {
        nome: input.nome.trim(),
        descricao: input.descricao || null,
        valor: input.valor,
        periodicidade: input.periodicidade,
        aulasPorSemana: input.aulasPorSemana ?? null,
        acessoLivre: input.acessoLivre ?? false,
        ativo: input.ativo ?? true,
        ...(input.modalidadeIds?.length
          ? { modalidades: { connect: input.modalidadeIds.map(id => ({ id })) } }
          : {}),
      },
      include: { modalidades: { select: { id: true, nome: true, cor: true } } },
    })
  }

  async atualizar(id: number, input: Partial<PlanoInput>) {
    await this.buscar(id)
    if (input.modalidadeIds?.length) {
      await garantirIdsDoTenant({ model: 'modalidade', ids: input.modalidadeIds, academiaId: this.academiaId })
    }
    return this.db.plano.update({
      where: { id },
      data: {
        ...(input.nome !== undefined           ? { nome: input.nome.trim() } : {}),
        ...(input.descricao !== undefined      ? { descricao: input.descricao || null } : {}),
        ...(input.valor !== undefined          ? { valor: input.valor } : {}),
        ...(input.periodicidade !== undefined  ? { periodicidade: input.periodicidade } : {}),
        ...(input.aulasPorSemana !== undefined ? { aulasPorSemana: input.aulasPorSemana ?? null } : {}),
        ...(input.acessoLivre !== undefined    ? { acessoLivre: input.acessoLivre } : {}),
        ...(input.ativo !== undefined          ? { ativo: input.ativo } : {}),
        ...(input.modalidadeIds !== undefined
          ? { modalidades: { set: input.modalidadeIds.map(idM => ({ id: idM })) } }
          : {}),
      },
      include: { modalidades: { select: { id: true, nome: true, cor: true } } },
    })
  }

  async excluir(id: number) {
    await this.buscar(id)
    return this.db.plano.update({ where: { id }, data: { ativo: false } })
  }
}

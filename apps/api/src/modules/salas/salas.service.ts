import type { PrismaTenantClient } from '../../infra/database/prisma.js'
import { criarErro } from '../../shared/utils/errors.js'
import { garantirIdsDoTenant } from '../../shared/utils/tenant-guard.js'

export interface SalaInput {
  unidadeId: number
  nome: string
  capacidade: number
  ativo?: boolean
}

export class SalasService {
  constructor(private db: PrismaTenantClient, private academiaId: number) {}

  async listar(filtros: { busca?: string; unidadeId?: number; ativo?: boolean } = {}) {
    return this.db.sala.findMany({
      where: {
        ...(filtros.ativo !== undefined ? { ativo: filtros.ativo } : {}),
        ...(filtros.unidadeId ? { unidadeId: filtros.unidadeId } : {}),
        ...(filtros.busca
          ? { nome: { contains: filtros.busca, mode: 'insensitive' } }
          : {}),
      },
      include: { unidade: { select: { id: true, nome: true } } },
      orderBy: [{ unidadeId: 'asc' }, { nome: 'asc' }],
    })
  }

  async buscar(id: number) {
    const sala = await this.db.sala.findFirst({
      where: { id },
      include: { unidade: { select: { id: true, nome: true } } },
    })
    if (!sala) throw criarErro(404, 'Sala não encontrada')
    return sala
  }

  async criar(input: SalaInput) {
    await garantirIdsDoTenant({ model: 'unidade', ids: [input.unidadeId], academiaId: this.academiaId })
    return this.db.sala.create({
      data: {
        unidadeId: input.unidadeId,
        nome: input.nome.trim(),
        capacidade: input.capacidade,
        ativo: input.ativo ?? true,
      },
      include: { unidade: { select: { id: true, nome: true } } },
    })
  }

  async atualizar(id: number, input: Partial<SalaInput>) {
    await this.buscar(id)
    if (input.unidadeId) {
      await garantirIdsDoTenant({ model: 'unidade', ids: [input.unidadeId], academiaId: this.academiaId })
    }
    return this.db.sala.update({
      where: { id },
      data: {
        ...(input.unidadeId !== undefined  ? { unidadeId: input.unidadeId } : {}),
        ...(input.nome !== undefined       ? { nome: input.nome.trim() } : {}),
        ...(input.capacidade !== undefined ? { capacidade: input.capacidade } : {}),
        ...(input.ativo !== undefined      ? { ativo: input.ativo } : {}),
      },
      include: { unidade: { select: { id: true, nome: true } } },
    })
  }

  async excluir(id: number) {
    await this.buscar(id)
    return this.db.sala.update({ where: { id }, data: { ativo: false } })
  }
}

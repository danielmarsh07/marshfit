import type { PrismaTenantClient } from '../../infra/database/prisma.js'
import { criarErro } from '../../shared/utils/errors.js'

export interface ModalidadeInput {
  unidadeId: number
  nome: string
  cor?: string
  icone?: string
  ativo?: boolean
}

export class ModalidadesService {
  constructor(private db: PrismaTenantClient, private academiaId: number) {}

  async listar(filtros: { busca?: string; ativo?: boolean } = {}) {
    return this.db.modalidade.findMany({
      where: {
        ...(filtros.ativo !== undefined ? { ativo: filtros.ativo } : {}),
        ...(filtros.busca
          ? { nome: { contains: filtros.busca, mode: 'insensitive' } }
          : {}),
      },
      orderBy: { nome: 'asc' },
    })
  }

  async buscar(id: number) {
    const m = await this.db.modalidade.findFirst({ where: { id } })
    if (!m) throw criarErro(404, 'Modalidade não encontrada')
    return m
  }

  async criar(input: ModalidadeInput) {
    return this.db.modalidade.create({
      data: {
        academiaId: this.academiaId,
        unidadeId: input.unidadeId,
        nome: input.nome.trim(),
        cor: input.cor || null,
        icone: input.icone || null,
        ativo: input.ativo ?? true,
      },
    })
  }

  async atualizar(id: number, input: Partial<ModalidadeInput>) {
    await this.buscar(id)
    return this.db.modalidade.update({
      where: { id },
      data: {
        ...(input.nome !== undefined  ? { nome: input.nome.trim() } : {}),
        ...(input.cor !== undefined   ? { cor: input.cor || null } : {}),
        ...(input.icone !== undefined ? { icone: input.icone || null } : {}),
        ...(input.ativo !== undefined ? { ativo: input.ativo } : {}),
      },
    })
  }

  async excluir(id: number) {
    await this.buscar(id)
    return this.db.modalidade.update({ where: { id }, data: { ativo: false } })
  }
}

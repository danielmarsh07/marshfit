import type { PrismaTenantClient } from '../../infra/database/prisma.js'
import { criarErro } from '../../shared/utils/errors.js'
import { garantirIdsDoTenant } from '../../shared/utils/tenant-guard.js'

export interface ProfessorInput {
  nome: string
  cpf?: string
  email?: string
  telefone: string
  observacoes?: string
  modalidadeIds?: number[]   // M:N — opcional
  ativo?: boolean
}

export class ProfessoresService {
  constructor(private db: PrismaTenantClient, private academiaId: number) {}

  async listar(filtros: { busca?: string; modalidadeId?: number; ativo?: boolean } = {}) {
    return this.db.professor.findMany({
      where: {
        ...(filtros.ativo !== undefined ? { ativo: filtros.ativo } : {}),
        ...(filtros.busca
          ? { OR: [
              { nome:     { contains: filtros.busca, mode: 'insensitive' } },
              { email:    { contains: filtros.busca, mode: 'insensitive' } },
              { telefone: { contains: filtros.busca } },
            ] }
          : {}),
        ...(filtros.modalidadeId
          ? { modalidades: { some: { id: filtros.modalidadeId } } }
          : {}),
      },
      include: {
        modalidades: { select: { id: true, nome: true, cor: true } },
      },
      orderBy: { nome: 'asc' },
    })
  }

  async buscar(id: number) {
    const prof = await this.db.professor.findFirst({
      where: { id },
      include: { modalidades: { select: { id: true, nome: true, cor: true } } },
    })
    if (!prof) throw criarErro(404, 'Professor não encontrado')
    return prof
  }

  async criar(input: ProfessorInput) {
    if (input.modalidadeIds?.length) {
      await garantirIdsDoTenant({ model: 'modalidade', ids: input.modalidadeIds, academiaId: this.academiaId })
    }
    const cpfLimpo = input.cpf?.replace(/\D/g, '') || null
    return this.db.professor.create({
      data: {
        nome: input.nome.trim(),
        cpf: cpfLimpo,
        email: input.email?.toLowerCase().trim() || null,
        telefone: input.telefone,
        observacoes: input.observacoes || null,
        ativo: input.ativo ?? true,
        ...(input.modalidadeIds?.length
          ? { modalidades: { connect: input.modalidadeIds.map(id => ({ id })) } }
          : {}),
      },
      include: { modalidades: { select: { id: true, nome: true, cor: true } } },
    })
  }

  async atualizar(id: number, input: Partial<ProfessorInput>) {
    await this.buscar(id)
    if (input.modalidadeIds?.length) {
      await garantirIdsDoTenant({ model: 'modalidade', ids: input.modalidadeIds, academiaId: this.academiaId })
    }
    const cpfLimpo = input.cpf !== undefined ? input.cpf?.replace(/\D/g, '') || null : undefined
    return this.db.professor.update({
      where: { id },
      data: {
        ...(input.nome !== undefined        ? { nome: input.nome.trim() } : {}),
        ...(cpfLimpo !== undefined          ? { cpf: cpfLimpo } : {}),
        ...(input.email !== undefined       ? { email: input.email?.toLowerCase() || null } : {}),
        ...(input.telefone !== undefined    ? { telefone: input.telefone } : {}),
        ...(input.observacoes !== undefined ? { observacoes: input.observacoes || null } : {}),
        ...(input.ativo !== undefined       ? { ativo: input.ativo } : {}),
        ...(input.modalidadeIds !== undefined
          ? { modalidades: { set: input.modalidadeIds.map(idM => ({ id: idM })) } }
          : {}),
      },
      include: { modalidades: { select: { id: true, nome: true, cor: true } } },
    })
  }

  async excluir(id: number) {
    await this.buscar(id)
    return this.db.professor.update({ where: { id }, data: { ativo: false } })
  }
}

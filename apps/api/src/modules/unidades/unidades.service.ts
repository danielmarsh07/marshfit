import type { PrismaTenantClient } from '../../infra/database/prisma.js'
import { criarErro } from '../../shared/utils/errors.js'

export interface UnidadeInput {
  nome: string
  endereco: string
  bairro?: string
  cidade: string
  estado: string
  telefone: string
  email?: string
  ativo?: boolean
}

export class UnidadesService {
  constructor(private db: PrismaTenantClient) {}

  async listar(filtros: { busca?: string; ativo?: boolean } = {}) {
    return this.db.unidade.findMany({
      where: {
        ...(filtros.ativo !== undefined ? { ativo: filtros.ativo } : {}),
        ...(filtros.busca
          ? { OR: [
              { nome:    { contains: filtros.busca, mode: 'insensitive' } },
              { cidade:  { contains: filtros.busca, mode: 'insensitive' } },
              { bairro:  { contains: filtros.busca, mode: 'insensitive' } },
            ] }
          : {}),
      },
      orderBy: { nome: 'asc' },
    })
  }

  async buscar(id: number) {
    const unidade = await this.db.unidade.findFirst({ where: { id } })
    if (!unidade) throw criarErro(404, 'Unidade não encontrada')
    return unidade
  }

  async criar(input: UnidadeInput) {
    return this.db.unidade.create({
      data: {
        nome: input.nome,
        endereco: input.endereco,
        bairro: input.bairro ?? null,
        cidade: input.cidade,
        estado: input.estado.toUpperCase(),
        telefone: input.telefone,
        email: input.email?.toLowerCase().trim() || null,
        ativo: input.ativo ?? true,
      },
    })
  }

  async atualizar(id: number, input: Partial<UnidadeInput>) {
    await this.buscar(id)
    return this.db.unidade.update({
      where: { id },
      data: {
        ...(input.nome !== undefined     ? { nome: input.nome } : {}),
        ...(input.endereco !== undefined ? { endereco: input.endereco } : {}),
        ...(input.bairro !== undefined   ? { bairro: input.bairro || null } : {}),
        ...(input.cidade !== undefined   ? { cidade: input.cidade } : {}),
        ...(input.estado !== undefined   ? { estado: input.estado.toUpperCase() } : {}),
        ...(input.telefone !== undefined ? { telefone: input.telefone } : {}),
        ...(input.email !== undefined    ? { email: input.email?.toLowerCase() || null } : {}),
        ...(input.ativo !== undefined    ? { ativo: input.ativo } : {}),
      },
    })
  }

  async excluir(id: number) {
    // TODO: verificar dependências (alunos vinculados, aulas) antes de excluir.
    // Por ora, soft-delete via ativo=false é a abordagem segura.
    await this.buscar(id)
    return this.db.unidade.update({ where: { id }, data: { ativo: false } })
  }
}

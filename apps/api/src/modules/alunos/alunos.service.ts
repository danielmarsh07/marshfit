import bcrypt from 'bcryptjs'
import { prisma, type PrismaTenantClient } from '../../infra/database/prisma.js'
import { criarErro } from '../../shared/utils/errors.js'
import { garantirIdsDoTenant } from '../../shared/utils/tenant-guard.js'
import type { AlunoStatus, Sexo } from '@prisma/client'

export interface AlunoInput {
  unidadeId: number
  nome: string
  cpf?: string
  dataNasc?: string  // ISO yyyy-mm-dd
  sexo?: Sexo
  email?: string
  telefone: string
  endereco?: string
  bairro?: string
  cidade?: string
  estado?: string
  observacoes?: string
  status?: AlunoStatus
}

export class AlunosService {
  constructor(private db: PrismaTenantClient, private academiaId: number) {}

  async listar(filtros: { busca?: string; unidadeId?: number; status?: AlunoStatus; page?: number; limit?: number } = {}) {
    const page = Math.max(filtros.page ?? 1, 1)
    const limit = Math.min(Math.max(filtros.limit ?? 20, 1), 200)
    const where = {
      ...(filtros.unidadeId ? { unidadeId: filtros.unidadeId } : {}),
      ...(filtros.status ? { status: filtros.status } : {}),
      ...(filtros.busca
        ? { OR: [
            { nome:     { contains: filtros.busca, mode: 'insensitive' as const } },
            { email:    { contains: filtros.busca, mode: 'insensitive' as const } },
            { telefone: { contains: filtros.busca } },
            { cpf:      { contains: filtros.busca.replace(/\D/g, '') } },
          ] }
        : {}),
    }
    const [total, alunos] = await Promise.all([
      this.db.aluno.count({ where }),
      this.db.aluno.findMany({
        where,
        include: {
          unidade: { select: { id: true, nome: true } },
          matriculas: {
            where: { status: 'ATIVA' },
            include: { plano: { select: { id: true, nome: true, valor: true } } },
            orderBy: { dataInicio: 'desc' },
            take: 1,
          },
        },
        orderBy: { nome: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ])
    return { total, page, limit, alunos }
  }

  async buscar(id: number) {
    const aluno = await this.db.aluno.findFirst({
      where: { id },
      include: {
        unidade: { select: { id: true, nome: true } },
        matriculas: {
          include: { plano: { select: { id: true, nome: true, valor: true, periodicidade: true } } },
          orderBy: { dataInicio: 'desc' },
        },
      },
    })
    if (!aluno) throw criarErro(404, 'Aluno não encontrado')
    return aluno
  }

  async criar(input: AlunoInput) {
    await garantirIdsDoTenant({ model: 'unidade', ids: [input.unidadeId], academiaId: this.academiaId })
    const cpfLimpo = input.cpf?.replace(/\D/g, '') || null

    if (cpfLimpo) {
      const existente = await this.db.aluno.findFirst({ where: { cpf: cpfLimpo } })
      if (existente) throw criarErro(409, 'Já existe um aluno com esse CPF nessa academia')
    }

    return this.db.aluno.create({
      data: {
        unidadeId: input.unidadeId,
        nome: input.nome.trim(),
        cpf: cpfLimpo,
        dataNasc: input.dataNasc ? new Date(input.dataNasc) : null,
        sexo: input.sexo ?? null,
        email: input.email?.toLowerCase().trim() || null,
        telefone: input.telefone,
        endereco: input.endereco || null,
        bairro: input.bairro || null,
        cidade: input.cidade || null,
        estado: input.estado?.toUpperCase() || null,
        observacoes: input.observacoes || null,
        status: input.status ?? 'ATIVO',
      },
      include: { unidade: { select: { id: true, nome: true } } },
    })
  }

  async atualizar(id: number, input: Partial<AlunoInput>) {
    await this.buscar(id)
    if (input.unidadeId) {
      await garantirIdsDoTenant({ model: 'unidade', ids: [input.unidadeId], academiaId: this.academiaId })
    }
    const cpfLimpo = input.cpf !== undefined ? input.cpf?.replace(/\D/g, '') || null : undefined
    return this.db.aluno.update({
      where: { id },
      data: {
        ...(input.unidadeId !== undefined   ? { unidadeId: input.unidadeId } : {}),
        ...(input.nome !== undefined        ? { nome: input.nome.trim() } : {}),
        ...(cpfLimpo !== undefined          ? { cpf: cpfLimpo } : {}),
        ...(input.dataNasc !== undefined    ? { dataNasc: input.dataNasc ? new Date(input.dataNasc) : null } : {}),
        ...(input.sexo !== undefined        ? { sexo: input.sexo ?? null } : {}),
        ...(input.email !== undefined       ? { email: input.email?.toLowerCase() || null } : {}),
        ...(input.telefone !== undefined    ? { telefone: input.telefone } : {}),
        ...(input.endereco !== undefined    ? { endereco: input.endereco || null } : {}),
        ...(input.bairro !== undefined      ? { bairro: input.bairro || null } : {}),
        ...(input.cidade !== undefined      ? { cidade: input.cidade || null } : {}),
        ...(input.estado !== undefined      ? { estado: input.estado?.toUpperCase() || null } : {}),
        ...(input.observacoes !== undefined ? { observacoes: input.observacoes || null } : {}),
        ...(input.status !== undefined      ? { status: input.status } : {}),
      },
      include: { unidade: { select: { id: true, nome: true } } },
    })
  }

  async excluir(id: number) {
    await this.buscar(id)
    return this.db.aluno.update({ where: { id }, data: { status: 'INATIVO' } })
  }

  /**
   * Cria conta de acesso ao portal do aluno.
   *   - Exige aluno com email cadastrado (login = email).
   *   - Gera Usuario + vínculo UsuarioAcademia (papel=ALUNO).
   *   - Liga aluno.usuarioId.
   * Se o aluno já tem acesso, atualiza a senha (reset).
   */
  async criarAcesso(alunoId: number, senha: string): Promise<{ email: string; novo: boolean }> {
    const aluno = await this.buscar(alunoId)
    if (!aluno.email) {
      throw criarErro(400, 'Cadastre o email do aluno antes de criar acesso')
    }
    if (senha.length < 6) {
      throw criarErro(400, 'A senha precisa ter pelo menos 6 caracteres')
    }

    const senhaHash = await bcrypt.hash(senha, 10)
    const email = aluno.email.toLowerCase().trim()

    // Cenário 1: aluno já tem usuarioId — só atualiza a senha.
    if (aluno.usuarioId) {
      await prisma.usuario.update({
        where: { id: aluno.usuarioId },
        data: { senhaHash, ativo: true },
      })
      return { email, novo: false }
    }

    // Cenário 2: já existe Usuario com esse email? (uso compartilhado proibido — bloqueia)
    const existente = await prisma.usuario.findUnique({ where: { email } })
    if (existente) {
      throw criarErro(409, 'Já existe uma conta com esse email. Use outro email no cadastro do aluno.')
    }

    // Cenário 3: cria Usuario + vínculo + linka aluno em uma transação.
    await prisma.$transaction(async (tx) => {
      const usuario = await tx.usuario.create({
        data: { nome: aluno.nome, email, senhaHash, ativo: true },
      })
      await tx.usuarioAcademia.create({
        data: {
          usuarioId: usuario.id,
          academiaId: this.academiaId,
          papel: 'ALUNO',
          ativo: true,
        },
      })
      await tx.aluno.update({
        where: { id: alunoId },
        data: { usuarioId: usuario.id },
      })
    })

    return { email, novo: true }
  }
}

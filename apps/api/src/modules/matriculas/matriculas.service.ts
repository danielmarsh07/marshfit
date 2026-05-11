import type { PrismaTenantClient } from '../../infra/database/prisma.js'
import { criarErro } from '../../shared/utils/errors.js'
import { garantirIdsDoTenant } from '../../shared/utils/tenant-guard.js'
import type { MatriculaStatus, Periodicidade } from '@prisma/client'

export interface MatriculaInput {
  alunoId: number
  planoId: number
  dataInicio: string  // YYYY-MM-DD
  dataFim?: string
  observacao?: string
}

/** Calcula a data da próxima mensalidade somando o ciclo do plano. */
function calcularProxVencto(inicio: Date, periodicidade: Periodicidade): Date {
  const d = new Date(inicio)
  const meses = periodicidade === 'MENSAL' ? 1
    : periodicidade === 'TRIMESTRAL' ? 3
    : periodicidade === 'SEMESTRAL' ? 6
    : 12
  d.setMonth(d.getMonth() + meses)
  return d
}

export class MatriculasService {
  constructor(private db: PrismaTenantClient, private academiaId: number) {}

  async listarPorAluno(alunoId: number) {
    return this.db.matricula.findMany({
      where: { alunoId },
      include: { plano: { select: { id: true, nome: true, valor: true, periodicidade: true } } },
      orderBy: { dataInicio: 'desc' },
    })
  }

  async buscar(id: number) {
    const m = await this.db.matricula.findFirst({
      where: { id },
      include: { plano: true, aluno: { select: { id: true, nome: true } } },
    })
    if (!m) throw criarErro(404, 'Matrícula não encontrada')
    return m
  }

  async criar(input: MatriculaInput) {
    // Garante que aluno e plano pertencem à mesma academia.
    await Promise.all([
      garantirIdsDoTenant({ model: 'aluno', ids: [input.alunoId], academiaId: this.academiaId }),
      garantirIdsDoTenant({ model: 'plano', ids: [input.planoId], academiaId: this.academiaId }),
    ])

    const plano = await this.db.plano.findFirst({ where: { id: input.planoId } })
    if (!plano) throw criarErro(404, 'Plano não encontrado')
    if (!plano.ativo) throw criarErro(400, 'Plano inativo — não permite novas matrículas')

    const dataInicio = new Date(input.dataInicio)
    const dataFim = input.dataFim ? new Date(input.dataFim) : null
    const proxVencto = calcularProxVencto(dataInicio, plano.periodicidade)

    // Encerra qualquer matrícula ATIVA anterior do mesmo aluno (regra simples
    // do MVP — aluno tem 1 matrícula ativa por vez).
    await this.db.matricula.updateMany({
      where: { alunoId: input.alunoId, status: 'ATIVA' },
      data: { status: 'CANCELADA', dataFim: dataInicio },
    })

    // Atualiza status do aluno para ATIVO no momento da matrícula.
    await this.db.aluno.update({
      where: { id: input.alunoId },
      data: { status: 'ATIVO' },
    })

    return this.db.matricula.create({
      data: {
        alunoId: input.alunoId,
        planoId: input.planoId,
        dataInicio,
        dataFim,
        proxVencto,
        status: 'ATIVA',
        observacao: input.observacao || null,
      },
      include: { plano: true },
    })
  }

  async alterarStatus(id: number, status: MatriculaStatus) {
    const m = await this.buscar(id)
    const novosDados: { status: MatriculaStatus; dataFim?: Date | null } = { status }
    if (['CANCELADA', 'TRANCADA'].includes(status)) {
      novosDados.dataFim = new Date()
    }
    const atualizada = await this.db.matricula.update({
      where: { id },
      data: novosDados,
      include: { plano: true },
    })

    // Espelha no status do aluno.
    if (status === 'TRANCADA') {
      await this.db.aluno.update({ where: { id: m.alunoId }, data: { status: 'CONGELADO' } })
    } else if (status === 'CANCELADA') {
      await this.db.aluno.update({ where: { id: m.alunoId }, data: { status: 'INATIVO' } })
    } else if (status === 'ATIVA') {
      await this.db.aluno.update({ where: { id: m.alunoId }, data: { status: 'ATIVO' } })
    }

    return atualizada
  }
}

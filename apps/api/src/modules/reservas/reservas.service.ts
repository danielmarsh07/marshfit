import { prisma, type PrismaTenantClient } from '../../infra/database/prisma.js'
import { criarErro } from '../../shared/utils/errors.js'

export interface ReservarInput {
  aulaId: number
  alunoId: number
  dataAula: string   // YYYY-MM-DD
}

/** Normaliza dataAula para 00:00 UTC do dia (date-only semantics). */
function diaUtc(dataIso: string): Date {
  const [ano, mes, dia] = dataIso.split('-').map(Number)
  return new Date(Date.UTC(ano, mes - 1, dia))
}

function diaSemanaUtc(d: Date): number {
  return d.getUTCDay()  // 0..6 (dom=0)
}

export class ReservasService {
  constructor(private db: PrismaTenantClient, private academiaId: number) {}

  /**
   * Reserva uma vaga numa instância de aula. Anti-overbooking via transação
   * SERIALIZABLE + unique (aulaId, alunoId, dataAula).
   *
   * Regras:
   *  - dataAula precisa cair no diaSemana da aula recorrente.
   *  - aluno precisa ter matrícula ATIVA.
   *  - se o plano não é acessoLivre, a modalidade da aula tem que estar liberada no plano.
   *  - se lotou e permiteListaEspera = true, cria como LISTA_ESPERA com posição.
   *  - se lotou e permiteListaEspera = false, 409.
   *  - reserva duplicada do mesmo aluno na mesma data: 409.
   */
  async reservar(input: ReservarInput) {
    const dataAula = diaUtc(input.dataAula)

    // Carrega dados base FORA da transação (read-only).
    const [aula, aluno] = await Promise.all([
      this.db.aula.findFirst({
        where: { id: input.aulaId },
        include: { modalidade: true },
      }),
      this.db.aluno.findFirst({
        where: { id: input.alunoId },
        include: {
          matriculas: {
            where: { status: 'ATIVA' },
            include: { plano: { include: { modalidades: { select: { id: true } } } } },
            orderBy: { dataInicio: 'desc' },
            take: 1,
          },
        },
      }),
    ])

    if (!aula) throw criarErro(404, 'Aula não encontrada')
    if (!aula.ativa) throw criarErro(400, 'Aula inativa')
    if (!aluno) throw criarErro(404, 'Aluno não encontrado')
    if (aluno.unidadeId !== aula.unidadeId) {
      throw criarErro(400, 'Aluno é de outra unidade')
    }
    if (diaSemanaUtc(dataAula) !== aula.diaSemana) {
      throw criarErro(400, 'Essa aula não acontece nesse dia da semana')
    }
    if (dataAula < diaUtc(new Date().toISOString().slice(0, 10))) {
      throw criarErro(400, 'Não é possível reservar data passada')
    }

    const matricula = aluno.matriculas[0]
    if (!matricula) throw criarErro(400, 'Aluno sem matrícula ativa')

    // Plano permite essa modalidade?
    if (!matricula.plano.acessoLivre) {
      const liberadas = matricula.plano.modalidades.map(m => m.id)
      if (!liberadas.includes(aula.modalidadeId)) {
        throw criarErro(400, `Seu plano não inclui a modalidade ${aula.modalidade.nome}`)
      }
    }

    return prisma.$transaction(async (tx) => {
      // 1. Conta CONFIRMADAS na mesma instância.
      const confirmadas = await tx.reserva.count({
        where: {
          aulaId: aula.id,
          dataAula,
          status: 'CONFIRMADA',
        },
      })

      // 2. Se há vaga, cria CONFIRMADA. Caso contrário, lista de espera.
      if (confirmadas < aula.capacidade) {
        return tx.reserva.create({
          data: {
            academiaId: this.academiaId,
            aulaId: aula.id,
            alunoId: aluno.id,
            dataAula,
            status: 'CONFIRMADA',
          },
          include: { aula: { include: { modalidade: true, sala: true, professor: true } } },
        })
      }

      if (!aula.permiteListaEspera) {
        throw criarErro(409, 'Aula lotada e sem lista de espera')
      }

      const naFila = await tx.reserva.count({
        where: { aulaId: aula.id, dataAula, status: 'LISTA_ESPERA' },
      })
      return tx.reserva.create({
        data: {
          academiaId: this.academiaId,
          aulaId: aula.id,
          alunoId: aluno.id,
          dataAula,
          status: 'LISTA_ESPERA',
          posicaoEspera: naFila + 1,
        },
        include: { aula: { include: { modalidade: true, sala: true, professor: true } } },
      })
    }, { isolationLevel: 'Serializable' })
      .catch((e: { code?: string }) => {
        if (e.code === 'P2002') {
          throw criarErro(409, 'Você já tem reserva nessa aula nesse dia')
        }
        throw e
      })
  }

  /**
   * Cancela uma reserva. Se a cancelada era CONFIRMADA, promove o primeiro da
   * lista de espera (se existir) para CONFIRMADA.
   */
  async cancelar(reservaId: number, opts: { alunoId?: number; motivo?: string } = {}) {
    const reserva = await this.db.reserva.findFirst({
      where: {
        id: reservaId,
        ...(opts.alunoId ? { alunoId: opts.alunoId } : {}),
      },
    })
    if (!reserva) throw criarErro(404, 'Reserva não encontrada')
    if (reserva.status === 'CANCELADA') return reserva

    return prisma.$transaction(async (tx) => {
      const eraConfirmada = reserva.status === 'CONFIRMADA'

      const cancelada = await tx.reserva.update({
        where: { id: reservaId },
        data: {
          status: 'CANCELADA',
          canceladaEm: new Date(),
          motivoCancelamento: opts.motivo ?? null,
          posicaoEspera: null,
        },
      })

      if (eraConfirmada) {
        // Promove o próximo da fila (posicaoEspera ASC).
        const proximo = await tx.reserva.findFirst({
          where: {
            aulaId: reserva.aulaId,
            dataAula: reserva.dataAula,
            status: 'LISTA_ESPERA',
          },
          orderBy: { posicaoEspera: 'asc' },
        })
        if (proximo) {
          await tx.reserva.update({
            where: { id: proximo.id },
            data: { status: 'CONFIRMADA', posicaoEspera: null },
          })
          // Reorganiza posições remanescentes (-1).
          await tx.reserva.updateMany({
            where: {
              aulaId: reserva.aulaId,
              dataAula: reserva.dataAula,
              status: 'LISTA_ESPERA',
              posicaoEspera: { gt: proximo.posicaoEspera ?? 0 },
            },
            data: { posicaoEspera: { decrement: 1 } },
          })
        }
      }

      return cancelada
    })
  }

  /** Lista quem está inscrito em uma instância (admin/professor). */
  async listarPorAula(aulaId: number, dataAula: string) {
    const data = diaUtc(dataAula)
    const reservas = await this.db.reserva.findMany({
      where: { aulaId, dataAula: data, status: { not: 'CANCELADA' } },
      include: {
        aluno: { select: { id: true, nome: true, telefone: true } },
        checkin: { select: { id: true, dataHora: true, origem: true } },
      },
      orderBy: [{ status: 'asc' }, { posicaoEspera: 'asc' }, { criadoEm: 'asc' }],
    })
    return reservas
  }

  async listarDoAluno(alunoId: number, opts: { somenteFuturas?: boolean } = {}) {
    const hoje = diaUtc(new Date().toISOString().slice(0, 10))
    return this.db.reserva.findMany({
      where: {
        alunoId,
        ...(opts.somenteFuturas ? { dataAula: { gte: hoje }, status: { not: 'CANCELADA' } } : {}),
      },
      include: {
        aula: {
          include: {
            modalidade: { select: { nome: true, cor: true } },
            professor:  { select: { nome: true } },
            sala:       { select: { nome: true } },
            unidade:    { select: { nome: true } },
            treino:     { select: { id: true, nome: true } },
          },
        },
        checkin: { select: { id: true, dataHora: true } },
      },
      orderBy: { dataAula: opts.somenteFuturas ? 'asc' : 'desc' },
      take: opts.somenteFuturas ? undefined : 100,
    })
  }
}

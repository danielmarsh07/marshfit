import type { PrismaTenantClient } from '../../infra/database/prisma.js'
import { criarErro } from '../../shared/utils/errors.js'
import type { OrigemCheckin } from '@prisma/client'

export interface RegistrarCheckinInput {
  alunoId: number
  aulaId?: number
  dataAula?: string  // YYYY-MM-DD — para vincular à reserva
  origem: OrigemCheckin
}

function diaUtc(dataIso: string): Date {
  const [ano, mes, dia] = dataIso.split('-').map(Number)
  return new Date(Date.UTC(ano, mes - 1, dia))
}

export class CheckinsService {
  constructor(private db: PrismaTenantClient, private academiaId: number) {}

  /**
   * Registra check-in. Se houver reserva CONFIRMADA correspondente, vincula.
   * Idempotente: se já existe check-in para essa reserva, retorna o existente.
   */
  async registrar(input: RegistrarCheckinInput) {
    const aluno = await this.db.aluno.findFirst({ where: { id: input.alunoId } })
    if (!aluno) throw criarErro(404, 'Aluno não encontrado')

    let reservaId: number | undefined
    if (input.aulaId && input.dataAula) {
      const reserva = await this.db.reserva.findFirst({
        where: {
          aulaId: input.aulaId,
          alunoId: input.alunoId,
          dataAula: diaUtc(input.dataAula),
          status: 'CONFIRMADA',
        },
        include: { checkin: true },
      })
      if (reserva?.checkin) return reserva.checkin
      reservaId = reserva?.id
    }

    return this.db.checkin.create({
      data: {
        academiaId: this.academiaId,
        alunoId: input.alunoId,
        aulaId: input.aulaId ?? null,
        reservaId: reservaId ?? null,
        origem: input.origem,
      },
      include: {
        aluno: { select: { id: true, nome: true } },
        aula: { select: { id: true, nome: true, horarioInicio: true } },
      },
    })
  }

  /** Auto check-in pelo aluno — só dentro da janela de tolerância da aula. */
  async autoCheckin(alunoId: number, reservaId: number) {
    const reserva = await this.db.reserva.findFirst({
      where: { id: reservaId, alunoId },
      include: { aula: true, checkin: true },
    })
    if (!reserva) throw criarErro(404, 'Reserva não encontrada')
    if (reserva.status !== 'CONFIRMADA') {
      throw criarErro(400, 'Apenas reservas confirmadas permitem check-in')
    }
    if (reserva.checkin) return reserva.checkin

    // Janela: de 30min antes do início até 30min depois do fim.
    const agora = new Date()
    const [hI, mI] = reserva.aula.horarioInicio.split(':').map(Number)
    const [hF, mF] = reserva.aula.horarioFim.split(':').map(Number)
    const inicio = new Date(reserva.dataAula)
    inicio.setUTCHours(hI, mI - 30, 0, 0)
    const fim = new Date(reserva.dataAula)
    fim.setUTCHours(hF, mF + 30, 0, 0)

    if (agora < inicio || agora > fim) {
      throw criarErro(400, 'Check-in só é permitido entre 30min antes do início e 30min após o fim da aula')
    }

    return this.db.checkin.create({
      data: {
        academiaId: this.academiaId,
        alunoId,
        aulaId: reserva.aulaId,
        reservaId: reserva.id,
        origem: 'APP_ALUNO',
      },
    })
  }

  async desfazer(checkinId: number) {
    const c = await this.db.checkin.findFirst({ where: { id: checkinId } })
    if (!c) throw criarErro(404, 'Check-in não encontrado')
    return this.db.checkin.delete({ where: { id: checkinId } })
  }

  async historicoDoAluno(alunoId: number, limite = 50) {
    return this.db.checkin.findMany({
      where: { alunoId },
      include: {
        aula: { include: { modalidade: { select: { nome: true, cor: true } } } },
      },
      orderBy: { dataHora: 'desc' },
      take: limite,
    })
  }
}

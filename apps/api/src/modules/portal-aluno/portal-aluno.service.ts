import type { PrismaTenantClient } from '../../infra/database/prisma.js'
import { criarErro } from '../../shared/utils/errors.js'

/** Normaliza a data UTC do dia. */
function diaUtc(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

/** Itera as datas (inclusive) entre dois dias. */
function rangeDatas(inicio: Date, fim: Date): Date[] {
  const out: Date[] = []
  const d = new Date(inicio)
  while (d <= fim) {
    out.push(new Date(d))
    d.setUTCDate(d.getUTCDate() + 1)
  }
  return out
}

export class PortalAlunoService {
  // academiaId não é usado diretamente — a extension já escopa todas as queries.
  // Mantemos o construtor com 1 arg pra consistência.
  constructor(private db: PrismaTenantClient) {}

  async carregarAluno(usuarioId: number) {
    const aluno = await this.db.aluno.findFirst({
      where: { usuarioId },
      include: {
        unidade: { select: { id: true, nome: true } },
        matriculas: {
          where: { status: 'ATIVA' },
          include: {
            plano: {
              include: {
                modalidades: { select: { id: true, nome: true, cor: true } },
              },
            },
          },
          orderBy: { dataInicio: 'desc' },
          take: 1,
        },
      },
    })
    if (!aluno) throw criarErro(404, 'Aluno não encontrado para este usuário')
    return aluno
  }

  /**
   * Programação dos próximos N dias para o aluno logado.
   * Expande as aulas recorrentes em instâncias diárias.
   * Marca quais já têm reserva do aluno e quantas vagas restam.
   */
  async programacao(usuarioId: number, dias = 7) {
    const aluno = await this.carregarAluno(usuarioId)
    const matricula = aluno.matriculas[0]

    const hoje = diaUtc(new Date())
    const ate = new Date(hoje)
    ate.setUTCDate(ate.getUTCDate() + (dias - 1))

    const aulas = await this.db.aula.findMany({
      where: {
        unidadeId: aluno.unidadeId,
        ativa: true,
      },
      include: {
        modalidade: { select: { id: true, nome: true, cor: true } },
        professor:  { select: { id: true, nome: true } },
        sala:       { select: { id: true, nome: true } },
        treino:     { select: { id: true, nome: true, formato: true } },
      },
      orderBy: [{ diaSemana: 'asc' }, { horarioInicio: 'asc' }],
    })

    // Pré-carrega reservas do aluno no período + reservas confirmadas
    // (todas) para contagem por instância. Evitamos groupBy (problemático
    // com Prisma extensions) — agregamos em JS, o volume é pequeno.
    const datas = rangeDatas(hoje, ate)
    const [reservasMinhas, todasConfirmadas] = await Promise.all([
      this.db.reserva.findMany({
        where: {
          alunoId: aluno.id,
          dataAula: { gte: hoje, lte: ate },
          status: { not: 'CANCELADA' },
        },
        select: { id: true, aulaId: true, dataAula: true, status: true, posicaoEspera: true },
      }),
      this.db.reserva.findMany({
        where: {
          dataAula: { gte: hoje, lte: ate },
          status: 'CONFIRMADA',
        },
        select: { aulaId: true, dataAula: true },
      }),
    ])

    const chaveReserva = (aulaId: number, data: Date) =>
      `${aulaId}-${data.toISOString().slice(0, 10)}`

    const reservasIdx = new Map(reservasMinhas.map(r =>
      [chaveReserva(r.aulaId, r.dataAula), r] as const,
    ))

    const contagemIdx = new Map<string, number>()
    for (const r of todasConfirmadas) {
      const k = chaveReserva(r.aulaId, r.dataAula)
      contagemIdx.set(k, (contagemIdx.get(k) ?? 0) + 1)
    }

    // Modalidades liberadas pelo plano (ou todas, se acessoLivre).
    const modalidadesLiberadasIds = matricula?.plano.acessoLivre
      ? null  // todas
      : new Set(matricula?.plano.modalidades.map(m => m.id) ?? [])

    type AulaProg = (typeof aulas)[number] & {
      data: string
      reservaMinha: typeof reservasMinhas[number] | null
      vagasOcupadas: number
      vagasRestantes: number
      modalidadeLiberada: boolean
    }
    const programacao: AulaProg[] = []

    for (const data of datas) {
      const ds = data.getUTCDay()
      const isoData = data.toISOString().slice(0, 10)
      for (const a of aulas.filter(a => a.diaSemana === ds)) {
        const chave = chaveReserva(a.id, data)
        const ocup = contagemIdx.get(chave) ?? 0
        const liberada = modalidadesLiberadasIds === null
          || modalidadesLiberadasIds.has(a.modalidadeId)
        programacao.push({
          ...a,
          data: isoData,
          reservaMinha: reservasIdx.get(chave) ?? null,
          vagasOcupadas: ocup,
          vagasRestantes: Math.max(a.capacidade - ocup, 0),
          modalidadeLiberada: liberada,
        })
      }
    }

    return {
      aluno: {
        id: aluno.id,
        nome: aluno.nome,
        unidade: aluno.unidade,
        statusMatricula: matricula?.status ?? null,
      },
      programacao,
    }
  }
}

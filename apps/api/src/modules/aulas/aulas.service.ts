import type { PrismaTenantClient } from '../../infra/database/prisma.js'
import { criarErro } from '../../shared/utils/errors.js'
import { garantirIdsDoTenant } from '../../shared/utils/tenant-guard.js'

export interface AulaInput {
  unidadeId: number
  modalidadeId: number
  professorId: number
  salaId: number
  nome?: string
  diaSemana: number       // 0..6
  horarioInicio: string   // HH:MM
  horarioFim: string      // HH:MM
  capacidade: number
  permiteListaEspera?: boolean
  treinoId?: number
  ativa?: boolean
}

export interface AulaInputMultiplosDias extends Omit<AulaInput, 'diaSemana'> {
  diasSemana: number[]    // 0..6, sem repetição
}

const INCLUDE_AULA = {
  unidade:    { select: { id: true, nome: true } },
  modalidade: { select: { id: true, nome: true, cor: true } },
  professor:  { select: { id: true, nome: true } },
  sala:       { select: { id: true, nome: true, capacidade: true } },
  treino:     { select: { id: true, nome: true, formato: true, duracaoMin: true } },
} as const

/** "HH:MM" → minutos desde 00:00 */
function paraMinutos(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

export class AulasService {
  constructor(private db: PrismaTenantClient, private academiaId: number) {}

  async listar(filtros: {
    busca?: string
    unidadeId?: number
    modalidadeId?: number
    professorId?: number
    diaSemana?: number
    ativa?: boolean
  } = {}) {
    return this.db.aula.findMany({
      where: {
        ...(filtros.ativa !== undefined        ? { ativa: filtros.ativa } : {}),
        ...(filtros.unidadeId                  ? { unidadeId: filtros.unidadeId } : {}),
        ...(filtros.modalidadeId               ? { modalidadeId: filtros.modalidadeId } : {}),
        ...(filtros.professorId                ? { professorId: filtros.professorId } : {}),
        ...(filtros.diaSemana !== undefined    ? { diaSemana: filtros.diaSemana } : {}),
        ...(filtros.busca
          ? { OR: [
              { nome: { contains: filtros.busca, mode: 'insensitive' as const } },
              { modalidade: { nome: { contains: filtros.busca, mode: 'insensitive' as const } } },
            ] }
          : {}),
      },
      include: INCLUDE_AULA,
      orderBy: [{ diaSemana: 'asc' }, { horarioInicio: 'asc' }],
    })
  }

  /**
   * Devolve a grade semanal em forma de matriz indexada por diaSemana.
   * Frontend itera 0..6 sem precisar agrupar.
   */
  async gradeSemanal(filtros: { unidadeId?: number; modalidadeId?: number } = {}) {
    const aulas = await this.listar({ ...filtros, ativa: true })
    const porDia: Record<number, typeof aulas> = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] }
    for (const a of aulas) porDia[a.diaSemana]?.push(a)
    return porDia
  }

  async buscar(id: number) {
    const a = await this.db.aula.findFirst({ where: { id }, include: INCLUDE_AULA })
    if (!a) throw criarErro(404, 'Aula não encontrada')
    return a
  }

  async criar(input: AulaInput) {
    this.validarHorarios(input.horarioInicio, input.horarioFim)
    this.validarDiaSemana(input.diaSemana)

    await Promise.all([
      garantirIdsDoTenant({ model: 'unidade',    ids: [input.unidadeId],    academiaId: this.academiaId }),
      garantirIdsDoTenant({ model: 'modalidade', ids: [input.modalidadeId], academiaId: this.academiaId }),
      garantirIdsDoTenant({ model: 'professor',  ids: [input.professorId],  academiaId: this.academiaId }),
      garantirIdsDoTenant({ model: 'sala',       ids: [input.salaId],       academiaId: this.academiaId }),
      input.treinoId
        ? garantirIdsDoTenant({ model: 'treino', ids: [input.treinoId], academiaId: this.academiaId })
        : Promise.resolve(),
    ])

    // Confere que a sala pertence à unidade (evita combinação inválida).
    const sala = await this.db.sala.findFirst({ where: { id: input.salaId } })
    if (sala?.unidadeId !== input.unidadeId) {
      throw criarErro(400, 'A sala selecionada não pertence à unidade escolhida')
    }

    // Capacidade da aula não pode exceder capacidade física da sala.
    if (sala && input.capacidade > sala.capacidade) {
      throw criarErro(400, `Capacidade (${input.capacidade}) maior que a da sala (${sala.capacidade})`)
    }

    return this.db.aula.create({
      data: {
        academiaId: this.academiaId,
        unidadeId: input.unidadeId,
        modalidadeId: input.modalidadeId,
        professorId: input.professorId,
        salaId: input.salaId,
        nome: input.nome?.trim() || null,
        diaSemana: input.diaSemana,
        horarioInicio: input.horarioInicio,
        horarioFim: input.horarioFim,
        capacidade: input.capacidade,
        permiteListaEspera: input.permiteListaEspera ?? true,
        treinoId: input.treinoId ?? null,
        ativa: input.ativa ?? true,
      },
      include: INCLUDE_AULA,
    })
  }

  /**
   * Cria a mesma aula em vários dias da semana de uma só vez.
   * Usado pelo "replicar" do form: o usuário escolhe Seg/Qua/Sex e a
   * gente materializa 3 turmas recorrentes em uma transação.
   */
  async criarMultiplosDias(input: AulaInputMultiplosDias) {
    this.validarHorarios(input.horarioInicio, input.horarioFim)
    const dias = Array.from(new Set(input.diasSemana))
    if (dias.length === 0) throw criarErro(400, 'Selecione ao menos um dia da semana')
    for (const d of dias) this.validarDiaSemana(d)

    await Promise.all([
      garantirIdsDoTenant({ model: 'unidade',    ids: [input.unidadeId],    academiaId: this.academiaId }),
      garantirIdsDoTenant({ model: 'modalidade', ids: [input.modalidadeId], academiaId: this.academiaId }),
      garantirIdsDoTenant({ model: 'professor',  ids: [input.professorId],  academiaId: this.academiaId }),
      garantirIdsDoTenant({ model: 'sala',       ids: [input.salaId],       academiaId: this.academiaId }),
      input.treinoId
        ? garantirIdsDoTenant({ model: 'treino', ids: [input.treinoId], academiaId: this.academiaId })
        : Promise.resolve(),
    ])

    const sala = await this.db.sala.findFirst({ where: { id: input.salaId } })
    if (sala?.unidadeId !== input.unidadeId) {
      throw criarErro(400, 'A sala selecionada não pertence à unidade escolhida')
    }
    if (sala && input.capacidade > sala.capacidade) {
      throw criarErro(400, `Capacidade (${input.capacidade}) maior que a da sala (${sala.capacidade})`)
    }

    const baseData = {
      academiaId: this.academiaId,
      unidadeId: input.unidadeId,
      modalidadeId: input.modalidadeId,
      professorId: input.professorId,
      salaId: input.salaId,
      nome: input.nome?.trim() || null,
      horarioInicio: input.horarioInicio,
      horarioFim: input.horarioFim,
      capacidade: input.capacidade,
      permiteListaEspera: input.permiteListaEspera ?? true,
      treinoId: input.treinoId ?? null,
      ativa: input.ativa ?? true,
    }

    return this.db.$transaction(
      dias.map(diaSemana =>
        this.db.aula.create({
          data: { ...baseData, diaSemana },
          include: INCLUDE_AULA,
        }),
      ),
    )
  }

  async atualizar(id: number, input: Partial<AulaInput>) {
    await this.buscar(id)
    if (input.horarioInicio && input.horarioFim) {
      this.validarHorarios(input.horarioInicio, input.horarioFim)
    }
    if (input.diaSemana !== undefined) this.validarDiaSemana(input.diaSemana)

    const checks: Promise<void>[] = []
    if (input.unidadeId)    checks.push(garantirIdsDoTenant({ model: 'unidade',    ids: [input.unidadeId],    academiaId: this.academiaId }))
    if (input.modalidadeId) checks.push(garantirIdsDoTenant({ model: 'modalidade', ids: [input.modalidadeId], academiaId: this.academiaId }))
    if (input.professorId)  checks.push(garantirIdsDoTenant({ model: 'professor',  ids: [input.professorId],  academiaId: this.academiaId }))
    if (input.salaId)       checks.push(garantirIdsDoTenant({ model: 'sala',       ids: [input.salaId],       academiaId: this.academiaId }))
    if (input.treinoId)     checks.push(garantirIdsDoTenant({ model: 'treino',     ids: [input.treinoId],     academiaId: this.academiaId }))
    await Promise.all(checks)

    return this.db.aula.update({
      where: { id },
      data: {
        ...(input.unidadeId !== undefined          ? { unidadeId: input.unidadeId } : {}),
        ...(input.modalidadeId !== undefined       ? { modalidadeId: input.modalidadeId } : {}),
        ...(input.professorId !== undefined        ? { professorId: input.professorId } : {}),
        ...(input.salaId !== undefined             ? { salaId: input.salaId } : {}),
        ...(input.nome !== undefined               ? { nome: input.nome?.trim() || null } : {}),
        ...(input.diaSemana !== undefined          ? { diaSemana: input.diaSemana } : {}),
        ...(input.horarioInicio !== undefined      ? { horarioInicio: input.horarioInicio } : {}),
        ...(input.horarioFim !== undefined         ? { horarioFim: input.horarioFim } : {}),
        ...(input.capacidade !== undefined         ? { capacidade: input.capacidade } : {}),
        ...(input.permiteListaEspera !== undefined ? { permiteListaEspera: input.permiteListaEspera } : {}),
        ...(input.treinoId !== undefined           ? { treinoId: input.treinoId ?? null } : {}),
        ...(input.ativa !== undefined              ? { ativa: input.ativa } : {}),
      },
      include: INCLUDE_AULA,
    })
  }

  async excluir(id: number) {
    await this.buscar(id)
    return this.db.aula.update({ where: { id }, data: { ativa: false } })
  }

  // ── Helpers ─────────────────────────────────────────────────────────

  private validarHorarios(inicio: string, fim: string) {
    if (!/^\d{2}:\d{2}$/.test(inicio) || !/^\d{2}:\d{2}$/.test(fim)) {
      throw criarErro(400, 'Horário deve estar no formato HH:MM')
    }
    if (paraMinutos(fim) <= paraMinutos(inicio)) {
      throw criarErro(400, 'Horário de fim deve ser depois do início')
    }
  }

  private validarDiaSemana(d: number) {
    if (d < 0 || d > 6 || !Number.isInteger(d)) {
      throw criarErro(400, 'Dia da semana deve ser entre 0 (dom) e 6 (sab)')
    }
  }
}

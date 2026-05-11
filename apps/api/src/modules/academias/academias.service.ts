import bcrypt from 'bcryptjs'
import { prisma } from '../../infra/database/prisma.js'
import { criarErro } from '../../shared/utils/errors.js'
import { slugify } from '../../shared/utils/slug.js'

const DIAS_TRIAL = 14

export interface RegistrarAcademiaInput {
  // Academia
  nomeAcademia: string
  cnpjCpf: string
  emailAcademia: string
  telefoneAcademia: string

  // Admin
  nomeAdmin: string
  emailAdmin: string
  senha: string
}

export class AcademiasService {
  /**
   * Cadastro público de academia em modo TRIAL. Cria, em transação:
   *   1. Academia (status=TRIAL, trialFim = hoje + 14d)
   *   2. Usuário admin (bcrypt hash)
   *   3. Vínculo UsuarioAcademia (papel=ADMIN_ACADEMIA)
   * E devolve os dados prontos para emitir o JWT na route.
   */
  async registrarTrial(input: RegistrarAcademiaInput) {
    const cnpjCpfLimpo = input.cnpjCpf.replace(/\D/g, '')
    if (cnpjCpfLimpo.length !== 11 && cnpjCpfLimpo.length !== 14) {
      throw criarErro(400, 'CNPJ/CPF inválido')
    }

    const emailAdmin = input.emailAdmin.toLowerCase().trim()
    const emailAcademia = input.emailAcademia.toLowerCase().trim()

    // Pré-checagens para mensagens amigáveis (a transação ainda valida).
    const [emailExistente, cnpjExistente] = await Promise.all([
      prisma.usuario.findUnique({ where: { email: emailAdmin } }),
      prisma.academia.findUnique({ where: { cnpjCpf: cnpjCpfLimpo } }),
    ])

    if (emailExistente) {
      throw criarErro(409, 'Já existe uma conta com esse email')
    }
    if (cnpjExistente) {
      throw criarErro(409, 'Já existe uma academia cadastrada com esse CNPJ/CPF')
    }

    const slug = await this.gerarSlugUnico(input.nomeAcademia)
    const senhaHash = await bcrypt.hash(input.senha, 10)

    const trialFim = new Date()
    trialFim.setDate(trialFim.getDate() + DIAS_TRIAL)

    const resultado = await prisma.$transaction(async (tx) => {
      const academia = await tx.academia.create({
        data: {
          nome: input.nomeAcademia,
          cnpjCpf: cnpjCpfLimpo,
          email: emailAcademia,
          telefone: input.telefoneAcademia,
          slug,
          status: 'TRIAL',
          trialFim,
        },
      })

      const usuario = await tx.usuario.create({
        data: {
          nome: input.nomeAdmin,
          email: emailAdmin,
          senhaHash,
          ativo: true,
        },
      })

      await tx.usuarioAcademia.create({
        data: {
          usuarioId: usuario.id,
          academiaId: academia.id,
          papel: 'ADMIN_ACADEMIA',
          ativo: true,
        },
      })

      return { academia, usuario }
    })

    return {
      usuario: {
        id: resultado.usuario.id,
        nome: resultado.usuario.nome,
        email: resultado.usuario.email,
      },
      academia: {
        id: resultado.academia.id,
        nome: resultado.academia.nome,
        slug: resultado.academia.slug,
        status: resultado.academia.status,
        trialFim: resultado.academia.trialFim,
      },
    }
  }

  /**
   * Gera um slug único: se "box-piloto" já existe, tenta "box-piloto-2", -3…
   */
  private async gerarSlugUnico(nome: string): Promise<string> {
    const base = slugify(nome) || 'academia'
    let candidato = base
    let i = 2

    while (await prisma.academia.findUnique({ where: { slug: candidato } })) {
      candidato = `${base}-${i}`
      i++
      if (i > 100) {
        // Fallback defensivo — improvável de acontecer.
        candidato = `${base}-${Date.now()}`
        break
      }
    }
    return candidato
  }
}

import { prisma } from '../../infra/database/prisma.js'

export interface RegistrarLeadInput {
  nome: string
  email: string
  telefone: string
  academia?: string
  cidade?: string
  mensagem?: string
  origem?: string
}

export class LeadsService {
  async registrar(input: RegistrarLeadInput) {
    return prisma.lead.create({
      data: {
        nome: input.nome.trim(),
        email: input.email.toLowerCase().trim(),
        telefone: input.telefone.trim(),
        academia: input.academia?.trim() || null,
        cidade: input.cidade?.trim() || null,
        mensagem: input.mensagem?.trim() || null,
        origem: input.origem?.trim() || null,
      },
      select: { id: true, criadoEm: true },
    })
  }
}

import bcrypt from 'bcryptjs'
import { prisma } from '../../infra/database/prisma.js'
import { criarErro } from '../../shared/utils/errors.js'
import type { Papel } from '@prisma/client'

export interface VinculoResumo {
  academiaId: number
  academiaNome: string
  papel: Papel
  unidadeId: number | null
  unidadeNome: string | null
}

export interface LoginResult {
  usuario: {
    id: number
    nome: string
    email: string
  }
  vinculos: VinculoResumo[]
}

export class AuthService {
  /**
   * Verifica credenciais. NÃO emite token ainda — devolve a lista de
   * vínculos para o usuário escolher qual academia ativar (caso tenha >1).
   * Se tiver só 1 vínculo, o frontend chama `selecionarAcademia` direto.
   */
  async autenticar(email: string, senha: string): Promise<LoginResult> {
    const usuario = await prisma.usuario.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: {
        vinculos: {
          where: { ativo: true },
          include: {
            academia: { select: { id: true, nome: true, status: true } },
            unidade: { select: { id: true, nome: true } },
          },
        },
      },
    })

    if (!usuario || !usuario.ativo) {
      throw criarErro(401, 'Email ou senha inválidos')
    }

    const senhaOk = await bcrypt.compare(senha, usuario.senhaHash)
    if (!senhaOk) {
      throw criarErro(401, 'Email ou senha inválidos')
    }

    // Filtra vínculos com academia cancelada — não permite login.
    const vinculosAtivos = usuario.vinculos.filter(
      v => v.academia.status !== 'CANCELADA',
    )

    if (vinculosAtivos.length === 0) {
      throw criarErro(403, 'Você não tem acesso a nenhuma academia ativa')
    }

    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { ultimoLogin: new Date() },
    })

    return {
      usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email },
      vinculos: vinculosAtivos.map(v => ({
        academiaId: v.academiaId,
        academiaNome: v.academia.nome,
        papel: v.papel,
        unidadeId: v.unidadeId,
        unidadeNome: v.unidade?.nome ?? null,
      })),
    }
  }

  /**
   * Confirma o vínculo escolhido e devolve os dados que vão para o JWT.
   * (A emissão do token fica na route — precisa do app.jwt do Fastify.)
   */
  async selecionarVinculo(usuarioId: number, academiaId: number) {
    const vinculo = await prisma.usuarioAcademia.findUnique({
      where: { usuarioId_academiaId: { usuarioId, academiaId } },
      include: {
        usuario: { select: { id: true, nome: true, email: true, ativo: true } },
        academia: { select: { id: true, nome: true, status: true } },
        unidade: { select: { id: true, nome: true } },
      },
    })

    if (!vinculo || !vinculo.ativo || !vinculo.usuario.ativo) {
      throw criarErro(403, 'Vínculo inválido ou inativo')
    }
    if (vinculo.academia.status === 'CANCELADA') {
      throw criarErro(403, 'Academia cancelada')
    }
    if (vinculo.academia.status === 'SUSPENSA' && vinculo.papel !== 'SUPER_ADMIN') {
      throw criarErro(403, 'Academia suspensa — entre em contato com a Marsh')
    }

    return {
      usuario: vinculo.usuario,
      academia: vinculo.academia,
      unidade: vinculo.unidade,
      papel: vinculo.papel,
    }
  }
}

export async function hashSenha(senha: string): Promise<string> {
  return bcrypt.hash(senha, 10)
}

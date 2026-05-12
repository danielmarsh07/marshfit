import bcrypt from 'bcryptjs'
import type { Papel } from '@prisma/client'
import { prisma } from '../../infra/database/prisma.js'
import { criarErro } from '../../shared/utils/errors.js'
import { garantirIdsDoTenant } from '../../shared/utils/tenant-guard.js'

export interface ConvidarInput {
  nome: string
  email: string
  senha: string
  papel: Papel
  unidadeId?: number | null
}

/**
 * Service de gestão de equipe dentro de uma academia.
 *
 * Listagem e convite operam por academiaId — não usamos PrismaTenantClient
 * porque Usuario é tabela global (compartilhada entre academias). Filtramos
 * via UsuarioAcademia.academiaId nas queries.
 */
export class UsuariosService {
  constructor(private academiaId: number) {}

  async listar(): Promise<Array<{
    usuarioId: number
    nome: string
    email: string
    papel: Papel
    unidadeId: number | null
    unidadeNome: string | null
    ativo: boolean
    ultimoLogin: Date | null
  }>> {
    const vinculos = await prisma.usuarioAcademia.findMany({
      where: { academiaId: this.academiaId },
      include: {
        usuario: { select: { id: true, nome: true, email: true, ultimoLogin: true } },
        unidade: { select: { id: true, nome: true } },
      },
      orderBy: [{ papel: 'asc' }, { criadoEm: 'asc' }],
    })

    return vinculos.map(v => ({
      usuarioId: v.usuario.id,
      nome: v.usuario.nome,
      email: v.usuario.email,
      papel: v.papel,
      unidadeId: v.unidadeId,
      unidadeNome: v.unidade?.nome ?? null,
      ativo: v.ativo,
      ultimoLogin: v.usuario.ultimoLogin,
    }))
  }

  async convidar(input: ConvidarInput) {
    const email = input.email.toLowerCase().trim()
    const PAPEIS_COM_UNIDADE: Papel[] = ['GESTOR_UNIDADE', 'PROFESSOR', 'RECEPCAO']
    const PAPEIS_SEM_UNIDADE: Papel[] = ['ADMIN_ACADEMIA', 'FINANCEIRO', 'SUPER_ADMIN', 'ALUNO']

    if (PAPEIS_COM_UNIDADE.includes(input.papel) && !input.unidadeId) {
      throw criarErro(400, 'Papel exige uma unidade vinculada')
    }
    if (PAPEIS_SEM_UNIDADE.includes(input.papel) && input.unidadeId) {
      throw criarErro(400, 'Esse papel não usa unidade — deixe em branco')
    }
    if (input.papel === 'SUPER_ADMIN' || input.papel === 'ALUNO') {
      throw criarErro(400, 'Esses papéis não são criados aqui')
    }

    if (input.unidadeId) {
      await garantirIdsDoTenant({ model: 'unidade', ids: [input.unidadeId], academiaId: this.academiaId })
    }

    // Procura usuário existente; senão cria.
    let usuario = await prisma.usuario.findUnique({ where: { email } })
    if (!usuario) {
      const senhaHash = await bcrypt.hash(input.senha, 10)
      usuario = await prisma.usuario.create({
        data: {
          nome: input.nome.trim(),
          email,
          senhaHash,
          ativo: true,
        },
      })
    }

    // Já tem vínculo nessa academia?
    const vinculoExistente = await prisma.usuarioAcademia.findUnique({
      where: { usuarioId_academiaId: { usuarioId: usuario.id, academiaId: this.academiaId } },
    })
    if (vinculoExistente) {
      throw criarErro(409, 'Esse e-mail já tem vínculo nessa academia')
    }

    const vinculo = await prisma.usuarioAcademia.create({
      data: {
        usuarioId: usuario.id,
        academiaId: this.academiaId,
        papel: input.papel,
        unidadeId: input.unidadeId ?? null,
        ativo: true,
      },
      include: {
        unidade: { select: { id: true, nome: true } },
      },
    })

    return {
      usuarioId: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      papel: vinculo.papel,
      unidadeId: vinculo.unidadeId,
      unidadeNome: vinculo.unidade?.nome ?? null,
      ativo: vinculo.ativo,
    }
  }

  async ativar(usuarioId: number, ativo: boolean) {
    const vinculo = await prisma.usuarioAcademia.findUnique({
      where: { usuarioId_academiaId: { usuarioId, academiaId: this.academiaId } },
    })
    if (!vinculo) throw criarErro(404, 'Vínculo não encontrado')
    if (vinculo.papel === 'SUPER_ADMIN') throw criarErro(403, 'Não é possível alterar o Super Admin por aqui')

    return prisma.usuarioAcademia.update({
      where: { usuarioId_academiaId: { usuarioId, academiaId: this.academiaId } },
      data: { ativo },
    })
  }

  async resetarSenha(usuarioId: number, novaSenha: string) {
    const vinculo = await prisma.usuarioAcademia.findUnique({
      where: { usuarioId_academiaId: { usuarioId, academiaId: this.academiaId } },
    })
    if (!vinculo) throw criarErro(404, 'Usuário não encontrado nessa academia')
    if (vinculo.papel === 'SUPER_ADMIN') throw criarErro(403, 'Não é possível alterar o Super Admin por aqui')

    const senhaHash = await bcrypt.hash(novaSenha, 10)
    await prisma.usuario.update({ where: { id: usuarioId }, data: { senhaHash } })
    return { ok: true }
  }
}

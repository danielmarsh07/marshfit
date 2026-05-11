/**
 * Seed inicial — popula a base com:
 *   1. Super Admin Marsh (cross-tenant)
 *   2. Academia piloto ("Box Piloto MarshFit") com 1 unidade
 *   3. Admin da academia piloto
 *
 * Rodar com: pnpm db:seed
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed do MarshFit...')

  // ── Super Admin Marsh ────────────────────────────────────────────────
  const superAdminSenha = await bcrypt.hash('marsh@admin', 10)
  const superAdmin = await prisma.usuario.upsert({
    where: { email: 'admin@marshconsultoria.com.br' },
    update: {},
    create: {
      nome: 'Super Admin Marsh',
      email: 'admin@marshconsultoria.com.br',
      senhaHash: superAdminSenha,
      ativo: true,
    },
  })
  console.log(`✓ Super Admin criado: ${superAdmin.email}`)

  // ── Academia piloto ──────────────────────────────────────────────────
  const academia = await prisma.academia.upsert({
    where: { slug: 'box-piloto' },
    update: {},
    create: {
      nome: 'Box Piloto MarshFit',
      cnpjCpf: '00.000.000/0001-00',
      slug: 'box-piloto',
      email: 'contato@boxpiloto.com.br',
      telefone: '(11) 99999-0000',
      status: 'ATIVA',
    },
  })
  console.log(`✓ Academia criada: ${academia.nome}`)

  // ── Unidade matriz ───────────────────────────────────────────────────
  const unidade = await prisma.unidade.upsert({
    where: { id: 1 },
    update: {},
    create: {
      academiaId: academia.id,
      nome: 'Matriz',
      endereco: 'Rua do Crossfit, 100',
      bairro: 'Centro',
      cidade: 'São Paulo',
      estado: 'SP',
      telefone: '(11) 99999-0001',
      email: 'matriz@boxpiloto.com.br',
      ativo: true,
    },
  })
  console.log(`✓ Unidade criada: ${unidade.nome}`)

  // ── Vínculo do Super Admin (sem restrição de academia, mas registramos
  //    como ADMIN_ACADEMIA para que ele consiga entrar no painel da
  //    academia piloto também) ──────────────────────────────────────────
  await prisma.usuarioAcademia.upsert({
    where: { usuarioId_academiaId: { usuarioId: superAdmin.id, academiaId: academia.id } },
    update: {},
    create: {
      usuarioId: superAdmin.id,
      academiaId: academia.id,
      papel: 'SUPER_ADMIN',
      ativo: true,
    },
  })

  // ── Admin da academia piloto ─────────────────────────────────────────
  const adminAcademiaSenha = await bcrypt.hash('piloto@admin', 10)
  const adminAcademia = await prisma.usuario.upsert({
    where: { email: 'admin@boxpiloto.com.br' },
    update: {},
    create: {
      nome: 'Admin Box Piloto',
      email: 'admin@boxpiloto.com.br',
      senhaHash: adminAcademiaSenha,
      ativo: true,
    },
  })

  await prisma.usuarioAcademia.upsert({
    where: { usuarioId_academiaId: { usuarioId: adminAcademia.id, academiaId: academia.id } },
    update: {},
    create: {
      usuarioId: adminAcademia.id,
      academiaId: academia.id,
      papel: 'ADMIN_ACADEMIA',
      ativo: true,
    },
  })
  console.log(`✓ Admin da academia criado: ${adminAcademia.email}`)

  console.log('\n✅ Seed concluído!')
  console.log('\n📋 Credenciais de teste:')
  console.log('   Super Admin Marsh: admin@marshconsultoria.com.br / marsh@admin')
  console.log('   Admin Box Piloto:  admin@boxpiloto.com.br / piloto@admin')
}

main()
  .catch(e => {
    console.error('❌ Erro no seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

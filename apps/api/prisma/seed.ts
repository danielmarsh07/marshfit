/**
 * Seed inicial — popula a base com:
 *   1. Academia "Marsh Consultoria" (matriz do super admin)
 *   2. Super Admin Marsh vinculado a ela com papel SUPER_ADMIN
 *
 * SUPER_ADMIN opera cross-tenant via bypass do prismaTenant — pode criar
 * academias, unidades, modalidades, professores etc. para qualquer
 * cliente. O vínculo serve apenas para login (auth exige >=1 vínculo).
 *
 * Academias clientes são criadas via landing/cadastro ou painel do
 * Super Admin. Sem academia piloto pré-criada.
 *
 * Rodar com: pnpm db:seed
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed do MarshFit...')

  const marsh = await prisma.academia.upsert({
    where: { slug: 'marsh-consultoria' },
    update: {},
    create: {
      nome: 'Marsh Consultoria',
      cnpjCpf: '00.000.000/0000-00',
      slug: 'marsh-consultoria',
      email: 'contato@marshconsultoria.com.br',
      telefone: '(00) 00000-0000',
      status: 'ATIVA',
    },
  })
  console.log(`✓ Academia matriz da Marsh criada`)

  const senha = await bcrypt.hash('marsh@admin', 10)
  const superAdmin = await prisma.usuario.upsert({
    where: { email: 'admin@marshconsultoria.com.br' },
    update: {},
    create: {
      nome: 'Super Admin Marsh',
      email: 'admin@marshconsultoria.com.br',
      senhaHash: senha,
      ativo: true,
    },
  })

  await prisma.usuarioAcademia.upsert({
    where: { usuarioId_academiaId: { usuarioId: superAdmin.id, academiaId: marsh.id } },
    update: {},
    create: {
      usuarioId: superAdmin.id,
      academiaId: marsh.id,
      papel: 'SUPER_ADMIN',
      ativo: true,
    },
  })
  console.log(`✓ Super Admin: ${superAdmin.email}`)

  console.log('\n✅ Seed concluído!')
  console.log('\n📋 Credencial:')
  console.log('   admin@marshconsultoria.com.br / marsh@admin')
}

main()
  .catch(e => {
    console.error('❌ Erro no seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

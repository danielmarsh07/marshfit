import type { Papel } from '@prisma/client'

// Grupos de papéis para facilitar o uso em route guards.

export const PAPEIS_ADMIN: Papel[] = ['SUPER_ADMIN', 'ADMIN_ACADEMIA']

export const PAPEIS_GESTAO: Papel[] = ['SUPER_ADMIN', 'ADMIN_ACADEMIA', 'GESTOR_UNIDADE']

export const PAPEIS_OPERACIONAL: Papel[] = [
  'SUPER_ADMIN',
  'ADMIN_ACADEMIA',
  'GESTOR_UNIDADE',
  'RECEPCAO',
]

export const PAPEIS_FINANCEIRO: Papel[] = [
  'SUPER_ADMIN',
  'ADMIN_ACADEMIA',
  'FINANCEIRO',
]

export const PAPEIS_TODOS: Papel[] = [
  'SUPER_ADMIN',
  'ADMIN_ACADEMIA',
  'GESTOR_UNIDADE',
  'FINANCEIRO',
  'PROFESSOR',
  'RECEPCAO',
  'ALUNO',
]

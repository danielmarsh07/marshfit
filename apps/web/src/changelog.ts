export interface ChangelogEntry {
  version: string
  data: string // YYYY-MM-DD
  destaques: string[]
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: 'v0.5',
    data: '2026-05-11',
    destaques: [
      'Portal do aluno: programação dos próximos 7 dias, reservar aula, lista de espera, check-in.',
      'Cancelamento de reserva promove automaticamente o próximo da lista de espera.',
      'Auto check-in pelo aluno na janela de 30 min antes / 30 min depois da aula.',
      'Tela "Aulas hoje" para recepção/professor com lista de presença e marcação rápida.',
      'Ação "Criar acesso do aluno" gera login com senha provisória copiável.',
    ],
  },
  {
    version: 'v0.4',
    data: '2026-05-11',
    destaques: [
      'Grade semanal de aulas (turmas recorrentes) com filtro por unidade.',
      'Cadastro de aulas vinculando modalidade, professor, sala e capacidade.',
      'Treinos / WODs reutilizáveis, com formato (AMRAP, EMOM, For Time, etc) e nível.',
      'Visualização da agenda em colunas no desktop e empilhada por dia no celular.',
    ],
  },
  {
    version: 'v0.3',
    data: '2026-05-11',
    destaques: [
      'Cadastro completo de unidades, modalidades, salas, professores e planos.',
      'Cadastro de alunos com matrícula vinculada a plano e congelamento/cancelamento.',
      'Tela detalhada do aluno com histórico de planos e ações rápidas.',
      'Lista responsiva (tabela no desktop, cards no celular) em todos os cadastros.',
    ],
  },
  {
    version: 'v0.2',
    data: '2026-05-11',
    destaques: [
      'Landing pública com formulário de interesse funcional.',
      'Cadastro de academia em modo trial (14 dias) com login automático.',
      'Página /cadastro com validação de dados da academia e do admin.',
    ],
  },
  {
    version: 'v0.1',
    data: '2026-05-11',
    destaques: [
      'Fundação do MarshFit: autenticação multi-tenant, layout administrativo, seleção de academia.',
      'Estrutura base para próximas fases (cadastros, aulas, financeiro).',
    ],
  },
]

export const APP_VERSION = CHANGELOG[0]?.version ?? 'v0.0'

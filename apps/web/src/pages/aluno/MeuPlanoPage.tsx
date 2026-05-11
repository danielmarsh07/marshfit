import { useQuery } from '@tanstack/react-query'
import { Receipt, Calendar, Check, AlertCircle } from 'lucide-react'
import { api } from '@/services/api'
import { formatarBRL } from '@/lib/datas'

interface Modalidade { id: number; nome: string; cor: string | null }
interface PlanoDoAluno {
  id: number
  nome: string
  descricao: string | null
  valor: string
  periodicidade: 'MENSAL' | 'TRIMESTRAL' | 'SEMESTRAL' | 'ANUAL'
  aulasPorSemana: number | null
  acessoLivre: boolean
  modalidades: Modalidade[]
}
interface MeuAluno {
  id: number
  nome: string
  status: string
  email: string | null
  telefone: string
  unidade: { id: number; nome: string }
  matriculas: { id: number; dataInicio: string; proxVencto: string; status: string; plano: PlanoDoAluno }[]
}

const PERIODO_LABEL: Record<PlanoDoAluno['periodicidade'], string> = {
  MENSAL: 'mês', TRIMESTRAL: 'trimestre', SEMESTRAL: 'semestre', ANUAL: 'ano',
}

function formatarData(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR')
}

export function MeuPlanoPage() {
  const { data: me, isLoading } = useQuery({
    queryKey: ['portal-me'],
    queryFn: async () => (await api.get<MeuAluno>('/portal/me')).data,
  })

  if (isLoading) return <div className="text-sm text-slate-500">Carregando…</div>
  if (!me) return <div className="text-sm text-slate-500">Erro ao carregar dados.</div>

  const matricula = me.matriculas[0]

  return (
    <div>
      <header className="mb-5">
        <h1 className="text-2xl font-bold text-slate-900">Meu plano</h1>
        <p className="text-sm text-slate-500 mt-1">Detalhes da sua matrícula em {me.unidade.nome}.</p>
      </header>

      {!matricula ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-sm text-amber-800 flex items-start gap-2">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div>
            Você não tem matrícula ativa.
            Procure a recepção para regularizar e voltar a reservar aulas.
          </div>
        </div>
      ) : (
        <>
          <div className="bg-slate-900 text-white rounded-2xl p-5 mb-4">
            <div className="text-xs uppercase tracking-wide text-brand-500">{matricula.plano.nome}</div>
            <div className="text-3xl font-bold mt-1">{formatarBRL(matricula.plano.valor)}</div>
            <div className="text-sm text-slate-300">/ {PERIODO_LABEL[matricula.plano.periodicidade]}</div>

            <div className="mt-4 pt-4 border-t border-slate-700 space-y-1.5 text-sm">
              <div className="flex items-center gap-2 text-slate-200">
                <Calendar className="h-4 w-4 text-brand-500" />
                Início: {formatarData(matricula.dataInicio)}
              </div>
              <div className="flex items-center gap-2 text-slate-200">
                <Receipt className="h-4 w-4 text-brand-500" />
                Próxima cobrança: {formatarData(matricula.proxVencto)}
              </div>
            </div>
          </div>

          {matricula.plano.descricao && (
            <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4 text-sm text-slate-700">
              {matricula.plano.descricao}
            </div>
          )}

          <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
            <div className="text-xs uppercase tracking-wide text-slate-500 font-semibold mb-2">O que está incluso</div>
            <ul className="space-y-1.5 text-sm">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-brand-600 flex-shrink-0" />
                Acesso a {me.unidade.nome}
              </li>
              {matricula.plano.aulasPorSemana ? (
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-brand-600 flex-shrink-0" />
                  Até {matricula.plano.aulasPorSemana} aulas por semana
                </li>
              ) : (
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-brand-600 flex-shrink-0" />
                  Aulas ilimitadas por semana
                </li>
              )}
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-brand-600 flex-shrink-0" />
                {matricula.plano.acessoLivre
                  ? 'Acesso livre a todas as modalidades'
                  : `${matricula.plano.modalidades.length} modalidade(s) liberada(s)`}
              </li>
            </ul>
          </div>

          {!matricula.plano.acessoLivre && matricula.plano.modalidades.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="text-xs uppercase tracking-wide text-slate-500 font-semibold mb-2">Modalidades liberadas</div>
              <div className="flex flex-wrap gap-2">
                {matricula.plano.modalidades.map(m => (
                  <span key={m.id}
                    className="text-sm px-3 py-1 rounded-full"
                    style={{ backgroundColor: (m.cor ?? '#22C55E') + '20', color: m.cor ?? '#15803D' }}
                  >
                    {m.nome}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

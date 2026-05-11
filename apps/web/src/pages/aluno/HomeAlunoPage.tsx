import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Calendar, Clock, MapPin, ArrowRight, AlertCircle } from 'lucide-react'
import { api } from '@/services/api'
import { formatarBRL, formatarDataLonga, hojeIso, isHoje } from '@/lib/datas'

interface Reserva {
  id: number
  dataAula: string
  status: 'CONFIRMADA' | 'LISTA_ESPERA' | 'CANCELADA' | 'NO_SHOW'
  aula: {
    nome: string | null
    horarioInicio: string
    horarioFim: string
    modalidade: { nome: string; cor: string | null }
    professor: { nome: string }
    sala: { nome: string }
  }
  checkin: { id: number } | null
}

interface MeuAluno {
  id: number
  nome: string
  unidade: { nome: string }
  matriculas: { proxVencto: string; status: string; plano: { nome: string; valor: string } }[]
}

export function HomeAlunoPage() {
  const { data: me } = useQuery({
    queryKey: ['portal-me'],
    queryFn: async () => (await api.get<MeuAluno>('/portal/me')).data,
  })

  const { data: reservas = [] } = useQuery({
    queryKey: ['portal-minhas-reservas', true],
    queryFn: async () => (await api.get<Reserva[]>('/portal/minhas-reservas?somenteFuturas=true')).data,
    refetchInterval: 60_000,
  })

  const matricula = me?.matriculas[0]
  const proximas3 = reservas.slice(0, 3)
  const hoje = hojeIso()

  const nomeCurto = me?.nome.split(' ')[0] ?? 'atleta'

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Oi, {nomeCurto} 👋</h1>
        <p className="text-sm text-slate-500 mt-1">{me?.unidade.nome}</p>
      </header>

      {!matricula && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 flex items-start gap-2">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div>Sem matrícula ativa. Procure a recepção para regularizar.</div>
        </div>
      )}

      <section className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-slate-900">Próximas reservas</h2>
          <Link to="/reservas" className="text-sm text-slate-500 hover:text-slate-900 flex items-center gap-1">
            ver todas <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {proximas3.length === 0 ? (
          <div className="text-sm text-slate-500 py-4 text-center">
            Você não tem reservas próximas.
            <Link to="/programacao" className="block mt-2 text-slate-900 font-medium">
              Ver programação →
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {proximas3.map(r => {
              const dataIso = r.dataAula.slice(0, 10)
              const cor = r.aula.modalidade.cor ?? '#22C55E'
              return (
                <div
                  key={r.id}
                  className="border-l-4 border border-slate-200 rounded-lg p-3"
                  style={{ borderLeftColor: cor }}
                >
                  <div className="text-xs text-slate-500">
                    {isHoje(dataIso) ? <strong className="text-slate-900">Hoje</strong> : formatarDataLonga(dataIso)}
                  </div>
                  <div className="text-sm font-medium text-slate-900 mt-0.5">
                    {r.aula.nome || r.aula.modalidade.nome}
                  </div>
                  <div className="text-xs text-slate-600 mt-1 flex flex-wrap gap-x-3">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {r.aula.horarioInicio}–{r.aula.horarioFim}</span>
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {r.aula.sala.nome}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {matricula && (
        <section className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold text-slate-900">Meu plano</h2>
            <Link to="/meu-plano" className="text-sm text-slate-500 hover:text-slate-900 flex items-center gap-1">
              ver detalhes <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="text-lg font-bold text-slate-900">{matricula.plano.nome}</div>
          <div className="text-sm text-slate-600">{formatarBRL(matricula.plano.valor)}</div>
          <div className="text-xs text-slate-500 mt-2 flex items-center gap-1">
            <Calendar className="h-3 w-3" /> Próxima cobrança: {new Date(matricula.proxVencto).toLocaleDateString('pt-BR')}
          </div>
        </section>
      )}

      <Link to="/programacao"
        className="block bg-slate-900 hover:bg-slate-800 active:bg-slate-700 text-white rounded-xl p-4 text-center font-medium"
      >
        Ver programação da semana
      </Link>
    </div>
  )
}

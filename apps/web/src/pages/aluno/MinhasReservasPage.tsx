import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Clock, MapPin, User, Hourglass, CheckCircle2, XCircle, Calendar } from 'lucide-react'
import { api } from '@/services/api'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { mensagemDeErro } from '@/lib/erro'
import { formatarDataLonga, hojeIso } from '@/lib/datas'

interface Reserva {
  id: number
  dataAula: string
  status: 'CONFIRMADA' | 'LISTA_ESPERA' | 'CANCELADA' | 'NO_SHOW'
  posicaoEspera: number | null
  aula: {
    id: number
    nome: string | null
    horarioInicio: string
    horarioFim: string
    modalidade: { nome: string; cor: string | null }
    professor: { nome: string }
    sala: { nome: string }
    unidade: { nome: string }
    treino: { id: number; nome: string } | null
  }
  checkin: { id: number; dataHora: string } | null
}

export function MinhasReservasPage() {
  const qc = useQueryClient()
  const [futuro, setFuturo] = useState(true)
  const [cancelando, setCancelando] = useState<Reserva | null>(null)

  const { data: reservas = [], isLoading } = useQuery({
    queryKey: ['portal-minhas-reservas', futuro],
    queryFn: async () => (await api.get<Reserva[]>(`/portal/minhas-reservas?somenteFuturas=${futuro}`)).data,
    refetchInterval: 60_000,
  })

  const cancelar = useMutation({
    mutationFn: async (r: Reserva) => api.post(`/reservas/${r.id}/cancelar`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portal-minhas-reservas'] })
      qc.invalidateQueries({ queryKey: ['portal-programacao'] })
      setCancelando(null)
    },
  })

  const checkin = useMutation({
    mutationFn: async (r: Reserva) => api.post('/checkins/auto', { reservaId: r.id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['portal-minhas-reservas'] }),
  })

  return (
    <div>
      <header className="mb-5">
        <h1 className="text-2xl font-bold text-slate-900">Minhas reservas</h1>
        <p className="text-sm text-slate-500 mt-1">
          {futuro ? 'Suas próximas aulas.' : 'Histórico das últimas 100 reservas.'}
        </p>
      </header>

      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setFuturo(true)}
          className={`text-sm px-3 py-1.5 rounded-full border ${futuro ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 text-slate-700'}`}
        >
          Próximas
        </button>
        <button
          onClick={() => setFuturo(false)}
          className={`text-sm px-3 py-1.5 rounded-full border ${!futuro ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 text-slate-700'}`}
        >
          Histórico
        </button>
      </div>

      {isLoading ? (
        <div className="text-sm text-slate-500">Carregando…</div>
      ) : reservas.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-6 text-center text-slate-600 flex flex-col items-center gap-3">
          <Calendar className="h-8 w-8 text-slate-400" />
          {futuro ? 'Você não tem reservas futuras.' : 'Sem histórico ainda.'}
        </div>
      ) : (
        <div className="space-y-2">
          {reservas.map(r => {
            const cor = r.aula.modalidade.cor ?? '#22C55E'
            const dataIso = r.dataAula.slice(0, 10)
            const podeCheckin = futuro && r.status === 'CONFIRMADA' && !r.checkin && dataIso === hojeIso()

            return (
              <div
                key={r.id}
                className="bg-white rounded-xl border-l-4 border border-slate-200 p-4"
                style={{ borderLeftColor: cor }}
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-slate-500">{formatarDataLonga(dataIso)}</div>
                    <div className="text-base font-medium text-slate-900 mt-0.5">
                      {r.aula.nome || r.aula.modalidade.nome}
                    </div>
                    <div className="text-xs text-slate-600 mt-1 flex flex-wrap gap-x-3 gap-y-1">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {r.aula.horarioInicio}–{r.aula.horarioFim}</span>
                      <span className="flex items-center gap-1"><User className="h-3 w-3" /> {r.aula.professor.nome}</span>
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {r.aula.sala.nome}</span>
                    </div>
                    <div className="mt-2">
                      <StatusReserva reserva={r} />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 items-end">
                    {podeCheckin && (
                      <Button tamanho="sm" onClick={() => checkin.mutate(r)} loading={checkin.isPending}>
                        Fazer check-in
                      </Button>
                    )}
                    {futuro && r.status !== 'CANCELADA' && (
                      <Button tamanho="sm" variante="secondary" onClick={() => setCancelando(r)}>
                        Cancelar
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {checkin.error && (
        <div className="mt-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {mensagemDeErro(checkin.error)}
        </div>
      )}

      {cancelando && (
        <Modal
          open onClose={() => setCancelando(null)}
          titulo="Cancelar essa reserva?"
          rodape={
            <>
              <Button variante="secondary" onClick={() => setCancelando(null)}>Voltar</Button>
              <Button variante="danger" onClick={() => cancelar.mutate(cancelando)} loading={cancelar.isPending}>
                Cancelar reserva
              </Button>
            </>
          }
        >
          <div className="text-sm text-slate-700 space-y-1">
            <div className="font-medium text-slate-900">{cancelando.aula.nome || cancelando.aula.modalidade.nome}</div>
            <div>{formatarDataLonga(cancelando.dataAula.slice(0, 10))} · {cancelando.aula.horarioInicio}</div>
            {cancelar.error && <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700 mt-3">{mensagemDeErro(cancelar.error)}</div>}
          </div>
        </Modal>
      )}
    </div>
  )
}

function StatusReserva({ reserva }: { reserva: Reserva }) {
  if (reserva.checkin) {
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 inline-flex items-center gap-1">
        <CheckCircle2 className="h-3 w-3" /> Presença confirmada
      </span>
    )
  }
  if (reserva.status === 'CONFIRMADA') {
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 inline-flex items-center gap-1">
        <CheckCircle2 className="h-3 w-3" /> Reservada
      </span>
    )
  }
  if (reserva.status === 'LISTA_ESPERA') {
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 inline-flex items-center gap-1">
        <Hourglass className="h-3 w-3" /> Lista de espera — posição {reserva.posicaoEspera}
      </span>
    )
  }
  if (reserva.status === 'CANCELADA') {
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 inline-flex items-center gap-1">
        <XCircle className="h-3 w-3" /> Cancelada
      </span>
    )
  }
  return (
    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
      {reserva.status.toLowerCase()}
    </span>
  )
}

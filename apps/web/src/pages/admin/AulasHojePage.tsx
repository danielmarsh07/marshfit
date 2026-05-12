import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Clock, MapPin, User as UserIcon, CheckCircle2, Circle, Users, Calendar } from 'lucide-react'
import { api } from '@/services/api'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { mensagemDeErro } from '@/lib/erro'

interface Aula {
  id: number
  nome: string | null
  diaSemana: number
  horarioInicio: string
  horarioFim: string
  capacidade: number
  modalidade: { id: number; nome: string; cor: string | null }
  professor: { id: number; nome: string }
  sala: { id: number; nome: string }
  unidade: { id: number; nome: string }
}

type GradeSemanal = Record<string, Aula[]>

interface Reserva {
  id: number
  alunoId: number
  status: 'CONFIRMADA' | 'LISTA_ESPERA' | 'CANCELADA' | 'NO_SHOW'
  posicaoEspera: number | null
  aluno: { id: number; nome: string; telefone: string }
  checkin: { id: number; dataHora: string; origem: string } | null
}

function hojeIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function offsetIso(dias: number): string {
  const d = new Date()
  d.setDate(d.getDate() + dias)
  return d.toISOString().slice(0, 10)
}

/** Dia da semana (0..6) a partir de YYYY-MM-DD, interpretado como data local. */
function diaSemanaDe(dataIso: string): number {
  const [y, m, d] = dataIso.split('-').map(Number)
  return new Date(y, m - 1, d).getDay()
}

/** Rótulo amigável: "Hoje", "Amanhã", "Ontem" ou data por extenso. */
function rotuloDia(dataIso: string): string {
  if (dataIso === hojeIso()) return 'Hoje'
  if (dataIso === offsetIso(1)) return 'Amanhã'
  if (dataIso === offsetIso(-1)) return 'Ontem'
  const [y, m, d] = dataIso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: '2-digit',
  })
}

export function AulasHojePage() {
  const [dataSelecionada, setDataSelecionada] = useState<string>(hojeIso())
  const diaSemanaSel = useMemo(() => diaSemanaDe(dataSelecionada), [dataSelecionada])
  const [aulaAberta, setAulaAberta] = useState<Aula | null>(null)

  const { data: grade, isLoading } = useQuery({
    queryKey: ['aulas-grade'],
    queryFn: async () => (await api.get<GradeSemanal>('/aulas/grade-semanal')).data,
  })

  const aulasDoDia = (grade?.[diaSemanaSel] ?? []).sort((a, b) => a.horarioInicio.localeCompare(b.horarioInicio))

  return (
    <div>
      <PageHeader
        titulo={`Aulas · ${rotuloDia(dataSelecionada)}`}
        descricao={`${aulasDoDia.length} aula(s) na grade desse dia.`}
      />

      {/* Seletor de data + atalhos */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 mb-4 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 text-slate-700">
          <Calendar className="h-4 w-4 text-slate-500" />
          <input
            type="date"
            value={dataSelecionada}
            onChange={(e) => setDataSelecionada(e.target.value || hojeIso())}
            className="rounded-lg border border-slate-300 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div className="flex flex-wrap gap-1.5 ml-auto">
          {[
            { lbl: 'Ontem', iso: offsetIso(-1) },
            { lbl: 'Hoje', iso: hojeIso() },
            { lbl: 'Amanhã', iso: offsetIso(1) },
          ].map(({ lbl, iso }) => {
            const ativo = dataSelecionada === iso
            return (
              <button
                key={iso}
                onClick={() => setDataSelecionada(iso)}
                className={`text-sm px-3 py-2 rounded-full border whitespace-nowrap ${
                  ativo
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-300 text-slate-700 hover:border-slate-500 active:bg-slate-50'
                }`}
              >
                {lbl}
              </button>
            )
          })}
        </div>
      </div>

      {isLoading ? (
        <div className="text-sm text-slate-500">Carregando…</div>
      ) : aulasDoDia.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-600">
          Nenhuma aula agendada para {rotuloDia(dataSelecionada).toLowerCase()}.
        </div>
      ) : (
        <div className="space-y-2">
          {aulasDoDia.map(a => (
            <button
              key={a.id}
              onClick={() => setAulaAberta(a)}
              className="w-full text-left bg-white rounded-xl border-l-4 border border-slate-200 p-4 hover:border-slate-900 active:bg-slate-50 transition"
              style={{ borderLeftColor: a.modalidade.cor ?? '#22C55E' }}
            >
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Clock className="h-4 w-4" />
                    <span className="font-semibold text-slate-900">{a.horarioInicio} – {a.horarioFim}</span>
                  </div>
                  <div className="text-base font-medium text-slate-900 mt-1">
                    {a.nome || a.modalidade.nome}
                  </div>
                  <div className="text-sm text-slate-600 mt-1 flex flex-wrap gap-x-3 gap-y-1">
                    <span className="flex items-center gap-1"><UserIcon className="h-3.5 w-3.5" /> {a.professor.nome}</span>
                    <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {a.sala.nome}</span>
                  </div>
                </div>
                <ContagemReservas aulaId={a.id} dataAula={dataSelecionada} capacidade={a.capacidade} />
              </div>
            </button>
          ))}
        </div>
      )}

      {aulaAberta && (
        <ListaPresencaModal
          aula={aulaAberta}
          dataAula={dataSelecionada}
          rotuloData={rotuloDia(dataSelecionada)}
          onClose={() => setAulaAberta(null)}
        />
      )}
    </div>
  )
}

function ContagemReservas({ aulaId, dataAula, capacidade }: { aulaId: number; dataAula: string; capacidade: number }) {
  const { data: reservas = [] } = useQuery({
    queryKey: ['reservas-por-aula', aulaId, dataAula],
    queryFn: async () => (await api.get<Reserva[]>(`/reservas/por-aula?aulaId=${aulaId}&dataAula=${dataAula}`)).data,
  })
  const confirmadas = reservas.filter(r => r.status === 'CONFIRMADA').length
  const presentes = reservas.filter(r => r.checkin).length
  return (
    <div className="text-right">
      <div className="text-sm font-semibold text-slate-900 flex items-center gap-1 justify-end">
        <Users className="h-4 w-4" /> {confirmadas}/{capacidade}
      </div>
      <div className="text-xs text-slate-500 mt-0.5">{presentes} presente(s)</div>
    </div>
  )
}

function ListaPresencaModal({
  aula, dataAula, rotuloData, onClose,
}: {
  aula: Aula
  dataAula: string
  rotuloData: string
  onClose: () => void
}) {
  const qc = useQueryClient()

  const { data: reservas = [], isLoading } = useQuery({
    queryKey: ['reservas-por-aula', aula.id, dataAula],
    queryFn: async () => (await api.get<Reserva[]>(`/reservas/por-aula?aulaId=${aula.id}&dataAula=${dataAula}`)).data,
  })

  const toggleCheckin = useMutation({
    mutationFn: async (reserva: Reserva) => {
      if (reserva.checkin) {
        return api.delete(`/checkins/${reserva.checkin.id}`)
      }
      return api.post('/checkins', {
        alunoId: reserva.alunoId,
        aulaId: aula.id,
        dataAula,
        origem: 'RECEPCAO',
      })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reservas-por-aula', aula.id, dataAula] }),
  })

  const confirmadas = reservas.filter(r => r.status === 'CONFIRMADA')
  const espera = reservas.filter(r => r.status === 'LISTA_ESPERA')
  const presentes = confirmadas.filter(r => r.checkin).length

  return (
    <Modal
      open onClose={onClose}
      titulo={`${aula.nome || aula.modalidade.nome} · ${aula.horarioInicio}`}
      tamanho="lg"
    >
      <div className="mb-3">
        <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">{rotuloData}</div>
        <div className="flex items-center justify-between text-sm text-slate-600 flex-wrap gap-2">
          <div>{confirmadas.length} confirmada(s) · {presentes} presente(s) · cap. {aula.capacidade}</div>
          <div className="text-xs text-slate-500">Toque no nome pra marcar presença</div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-sm text-slate-500">Carregando…</div>
      ) : confirmadas.length === 0 && espera.length === 0 ? (
        <div className="text-sm text-slate-500 text-center py-6">Nenhum aluno inscrito ainda.</div>
      ) : (
        <>
          {confirmadas.length > 0 && (
            <div className="space-y-1.5">
              {confirmadas.map(r => (
                <button
                  key={r.id}
                  onClick={() => toggleCheckin.mutate(r)}
                  disabled={toggleCheckin.isPending}
                  className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg border border-slate-200 hover:border-slate-400 active:bg-slate-50"
                >
                  {r.checkin
                    ? <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                    : <Circle className="h-5 w-5 text-slate-300 flex-shrink-0" />
                  }
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-900 truncate">{r.aluno.nome}</div>
                    <div className="text-xs text-slate-500">{r.aluno.telefone}</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {espera.length > 0 && (
            <div className="mt-5">
              <div className="text-xs uppercase tracking-wide text-slate-500 font-semibold mb-2">Lista de espera</div>
              <div className="space-y-1.5">
                {espera.map(r => (
                  <div key={r.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-amber-50 border border-amber-100">
                    <div className="h-6 w-6 rounded-full bg-amber-200 text-amber-900 text-xs font-semibold flex items-center justify-center">
                      {r.posicaoEspera}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-900 truncate">{r.aluno.nome}</div>
                      <div className="text-xs text-slate-500">{r.aluno.telefone}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {toggleCheckin.error && (
        <div className="mt-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {mensagemDeErro(toggleCheckin.error)}
        </div>
      )}

      <div className="mt-5 flex justify-end">
        <Button variante="secondary" onClick={onClose}>Fechar</Button>
      </div>
    </Modal>
  )
}

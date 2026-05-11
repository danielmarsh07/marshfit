import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Clock, MapPin, User, Dumbbell, Users, Check, Hourglass, Lock } from 'lucide-react'
import { api } from '@/services/api'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { mensagemDeErro } from '@/lib/erro'
import { formatarDataCurta, formatarDataLonga, isHoje } from '@/lib/datas'

interface Aula {
  id: number
  data: string  // YYYY-MM-DD
  nome: string | null
  horarioInicio: string
  horarioFim: string
  capacidade: number
  modalidade: { id: number; nome: string; cor: string | null }
  professor: { id: number; nome: string }
  sala: { id: number; nome: string }
  treino: { id: number; nome: string; formato: string | null } | null
  reservaMinha: { id: number; status: 'CONFIRMADA' | 'LISTA_ESPERA' | 'CANCELADA' | 'NO_SHOW'; posicaoEspera: number | null } | null
  vagasOcupadas: number
  vagasRestantes: number
  modalidadeLiberada: boolean
}

interface ProgramacaoResp {
  aluno: { nome: string; unidade: { nome: string }; statusMatricula: string | null }
  programacao: Aula[]
}

export function ProgramacaoPage() {
  const qc = useQueryClient()
  const [acao, setAcao] = useState<{ tipo: 'reservar' | 'cancelar'; aula: Aula } | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['portal-programacao'],
    queryFn: async () => (await api.get<ProgramacaoResp>('/portal/programacao?dias=7')).data,
    refetchInterval: 60_000, // atualiza vagas/posições a cada minuto
  })

  const reservar = useMutation({
    mutationFn: async (a: Aula) => api.post('/reservas', {
      aulaId: a.id,
      alunoId: -1,            // backend ignora p/ aluno (resolve pelo JWT)
      dataAula: a.data,
    }).catch((e) => {
      // tenta novamente forçando o alunoId real — caso o aluno tenha múltiplos vínculos.
      // Em prática o backend resolve direto. Repassamos o erro.
      throw e
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portal-programacao'] })
      qc.invalidateQueries({ queryKey: ['portal-minhas-reservas'] })
      setAcao(null)
    },
  })

  const cancelar = useMutation({
    mutationFn: async (a: Aula) => api.post(`/reservas/${a.reservaMinha!.id}/cancelar`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portal-programacao'] })
      qc.invalidateQueries({ queryKey: ['portal-minhas-reservas'] })
      setAcao(null)
    },
  })

  // Agrupa programação por data
  const porData = useMemo(() => {
    const m = new Map<string, Aula[]>()
    for (const a of data?.programacao ?? []) {
      if (!m.has(a.data)) m.set(a.data, [])
      m.get(a.data)!.push(a)
    }
    return m
  }, [data])

  return (
    <div>
      <header className="mb-5">
        <h1 className="text-2xl font-bold text-slate-900">Programação</h1>
        <p className="text-sm text-slate-500 mt-1">
          Próximas aulas em {data?.aluno.unidade.nome ?? '...'} — reserve a sua vaga.
        </p>
      </header>

      {isLoading ? (
        <div className="text-sm text-slate-500">Carregando…</div>
      ) : porData.size === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-6 text-center text-slate-600">
          Nenhuma aula programada para os próximos 7 dias.
        </div>
      ) : (
        <div className="space-y-5">
          {Array.from(porData.entries()).map(([data, aulas]) => (
            <section key={data}>
              <div className="text-xs uppercase tracking-wide text-slate-500 font-semibold mb-2">
                {isHoje(data) ? <>Hoje <span className="text-slate-400 normal-case">· {formatarDataCurta(data)}</span></> : formatarDataLonga(data)}
              </div>
              <div className="space-y-2">
                {aulas.map(a => (
                  <AulaProgramacaoCard
                    key={`${a.id}-${a.data}`}
                    aula={a}
                    onReservar={() => setAcao({ tipo: 'reservar', aula: a })}
                    onCancelar={() => setAcao({ tipo: 'cancelar', aula: a })}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {acao && (
        <ConfirmarAcaoModal
          acao={acao}
          loading={acao.tipo === 'reservar' ? reservar.isPending : cancelar.isPending}
          erro={
            acao.tipo === 'reservar' && reservar.error ? mensagemDeErro(reservar.error)
            : acao.tipo === 'cancelar' && cancelar.error ? mensagemDeErro(cancelar.error)
            : null
          }
          onConfirm={() => {
            if (acao.tipo === 'reservar') reservar.mutate(acao.aula)
            else cancelar.mutate(acao.aula)
          }}
          onClose={() => setAcao(null)}
        />
      )}
    </div>
  )
}

function AulaProgramacaoCard({
  aula, onReservar, onCancelar,
}: {
  aula: Aula
  onReservar: () => void
  onCancelar: () => void
}) {
  const cor = aula.modalidade.cor ?? '#22C55E'
  const reservada = aula.reservaMinha && aula.reservaMinha.status !== 'CANCELADA'
  const lotada = aula.vagasRestantes === 0

  return (
    <div
      className="bg-white rounded-xl border-l-4 border border-slate-200 p-4"
      style={{ borderLeftColor: cor }}
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Clock className="h-4 w-4" />
            <span className="font-semibold text-slate-900">{aula.horarioInicio} – {aula.horarioFim}</span>
          </div>
          <div className="text-base font-medium text-slate-900 mt-1">
            {aula.nome || aula.modalidade.nome}
          </div>
          <div className="text-xs text-slate-600 mt-1 flex flex-wrap gap-x-3 gap-y-1">
            <span className="flex items-center gap-1"><User className="h-3 w-3" /> {aula.professor.nome}</span>
            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {aula.sala.nome}</span>
            {aula.treino && (
              <span className="flex items-center gap-1 text-slate-500">
                <Dumbbell className="h-3 w-3" /> {aula.treino.nome}
              </span>
            )}
          </div>
        </div>

        <div className="text-right flex-shrink-0">
          <div className="text-xs text-slate-500 flex items-center gap-1 justify-end">
            <Users className="h-3 w-3" /> {aula.vagasOcupadas}/{aula.capacidade}
          </div>
          <div className="mt-2">
            {!aula.modalidadeLiberada ? (
              <div className="text-xs text-amber-700 flex items-center gap-1 justify-end">
                <Lock className="h-3 w-3" /> fora do plano
              </div>
            ) : reservada ? (
              aula.reservaMinha!.status === 'LISTA_ESPERA' ? (
                <Button variante="secondary" tamanho="sm" onClick={onCancelar}>
                  <Hourglass className="h-3.5 w-3.5" /> #{aula.reservaMinha!.posicaoEspera} · cancelar
                </Button>
              ) : (
                <Button variante="secondary" tamanho="sm" onClick={onCancelar}>
                  <Check className="h-3.5 w-3.5" /> reservado · cancelar
                </Button>
              )
            ) : lotada ? (
              <Button tamanho="sm" onClick={onReservar}>
                Lista de espera
              </Button>
            ) : (
              <Button tamanho="sm" onClick={onReservar}>
                Reservar
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function ConfirmarAcaoModal({
  acao, loading, erro, onConfirm, onClose,
}: {
  acao: { tipo: 'reservar' | 'cancelar'; aula: Aula }
  loading: boolean
  erro: string | null
  onConfirm: () => void
  onClose: () => void
}) {
  const reservar = acao.tipo === 'reservar'
  const a = acao.aula
  const lotada = a.vagasRestantes === 0

  return (
    <Modal
      open onClose={onClose}
      titulo={reservar ? (lotada ? 'Entrar na lista de espera?' : 'Confirmar reserva?') : 'Cancelar reserva?'}
      rodape={
        <>
          <Button variante="secondary" onClick={onClose}>Voltar</Button>
          <Button
            onClick={onConfirm}
            loading={loading}
            variante={reservar ? 'primary' : 'danger'}
          >
            {reservar ? (lotada ? 'Entrar na fila' : 'Confirmar') : 'Cancelar reserva'}
          </Button>
        </>
      }
    >
      <div className="space-y-2 text-sm text-slate-700">
        <div className="font-medium text-slate-900">{a.nome || a.modalidade.nome}</div>
        <div className="text-slate-600">
          {formatarDataLonga(a.data)} · {a.horarioInicio}–{a.horarioFim}
        </div>
        <div className="text-slate-600">
          {a.professor.nome} · {a.sala.nome}
        </div>
        {reservar && lotada && (
          <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
            A aula está lotada. Você entra na lista de espera e é promovido automaticamente
            se alguém cancelar.
          </div>
        )}
        {!reservar && a.reservaMinha?.status === 'CONFIRMADA' && (
          <div className="mt-3 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-600">
            Sua vaga libera para o próximo da lista de espera automaticamente.
          </div>
        )}
        {erro && <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{erro}</div>}
      </div>
    </Modal>
  )
}

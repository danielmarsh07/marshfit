import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, Users, MapPin, User, Dumbbell } from 'lucide-react'
import { api } from '@/services/api'
import { Modal } from '@/components/ui/Modal'
import { Field, Input, Select } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { mensagemDeErro } from '@/lib/erro'

interface Modalidade { id: number; nome: string; cor: string | null }
interface UnidadeSimples { id: number; nome: string }
interface ProfessorSimples { id: number; nome: string }
interface SalaSimples { id: number; nome: string; capacidade: number; unidade?: { id: number; nome: string } }
interface TreinoSimples { id: number; nome: string }

interface Aula {
  id: number
  unidadeId: number
  modalidadeId: number
  professorId: number
  salaId: number
  nome: string | null
  diaSemana: number
  horarioInicio: string
  horarioFim: string
  capacidade: number
  permiteListaEspera: boolean
  treinoId: number | null
  ativa: boolean
  unidade: { id: number; nome: string }
  modalidade: { id: number; nome: string; cor: string | null }
  professor: { id: number; nome: string }
  sala: { id: number; nome: string; capacidade: number }
  treino: { id: number; nome: string; formato: string | null; duracaoMin: number | null } | null
}

type GradeSemanal = Record<string, Aula[]>

const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
const DIAS_CURTO = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const schema = z.object({
  unidadeId:           z.coerce.number().int().positive('Selecione a unidade'),
  modalidadeId:        z.coerce.number().int().positive('Selecione a modalidade'),
  professorId:         z.coerce.number().int().positive('Selecione o professor'),
  salaId:              z.coerce.number().int().positive('Selecione a sala'),
  nome:                z.string().max(120).optional(),
  diaSemana:           z.coerce.number().int().min(0).max(6),
  horarioInicio:       z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:MM'),
  horarioFim:          z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:MM'),
  capacidade:          z.coerce.number().int().min(1).max(2000),
  permiteListaEspera:  z.boolean().optional(),
  treinoId:            z.union([z.coerce.number().int().positive(), z.literal('')]).optional()
                         .transform(v => v === '' || v === undefined ? undefined : v),
  ativa:               z.boolean().optional(),
})
type Form = z.infer<typeof schema>

export function AulasPage() {
  const qc = useQueryClient()
  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState<Aula | null>(null)
  const [unidadeFiltro, setUnidadeFiltro] = useState<number | ''>('')

  const { data: unidades = [] } = useQuery({
    queryKey: ['unidades', 'ativas'],
    queryFn: async () => (await api.get<UnidadeSimples[]>('/unidades?ativo=true')).data,
  })

  const { data: grade, isLoading } = useQuery({
    queryKey: ['aulas-grade', unidadeFiltro],
    queryFn: async () => {
      const p = unidadeFiltro ? `?unidadeId=${unidadeFiltro}` : ''
      return (await api.get<GradeSemanal>(`/aulas/grade-semanal${p}`)).data
    },
  })

  const { data: modalidades = [] } = useQuery({
    queryKey: ['modalidades', 'ativas'],
    queryFn: async () => (await api.get<Modalidade[]>('/modalidades?ativo=true')).data,
  })

  const { data: professores = [] } = useQuery({
    queryKey: ['professores', 'ativos'],
    queryFn: async () => (await api.get<ProfessorSimples[]>('/professores?ativo=true')).data,
  })

  const { data: salas = [] } = useQuery({
    queryKey: ['salas', 'ativas'],
    queryFn: async () => (await api.get<SalaSimples[]>('/salas?ativo=true')).data,
  })

  const { data: treinos = [] } = useQuery({
    queryKey: ['treinos', 'ativos'],
    queryFn: async () => (await api.get<TreinoSimples[]>('/treinos?ativo=true')).data,
  })

  const salvar = useMutation({
    mutationFn: async (data: Form) => {
      if (editando) return api.put(`/aulas/${editando.id}`, data)
      return api.post('/aulas', data)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['aulas-grade'] })
      setModal(false); setEditando(null)
    },
  })

  const totalAulas = useMemo(
    () => grade ? Object.values(grade).reduce((acc, lista) => acc + lista.length, 0) : 0,
    [grade],
  )

  const podeCadastrar = unidades.length > 0 && modalidades.length > 0 && professores.length > 0 && salas.length > 0

  return (
    <div>
      <PageHeader
        titulo="Grade de aulas"
        descricao={`${totalAulas} aula(s) na semana${unidadeFiltro && unidades.length > 1 ? ' (filtrada)' : ''}.`}
        acoes={
          <Button onClick={() => { setEditando(null); setModal(true) }} disabled={!podeCadastrar}>
            <Plus className="h-4 w-4" /> Nova aula
          </Button>
        }
      />

      {!podeCadastrar && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 text-sm text-amber-800">
          Para criar aulas você precisa ter ao menos: 1 unidade, 1 modalidade, 1 professor e 1 sala cadastrados.
        </div>
      )}

      {unidades.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-2">
          <button
            onClick={() => setUnidadeFiltro('')}
            className={`text-sm px-3 py-1.5 rounded-full border ${
              unidadeFiltro === '' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 text-slate-700 hover:border-slate-500'
            }`}
          >
            Todas as unidades
          </button>
          {unidades.map(u => (
            <button
              key={u.id}
              onClick={() => setUnidadeFiltro(u.id)}
              className={`text-sm px-3 py-1.5 rounded-full border ${
                unidadeFiltro === u.id ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 text-slate-700 hover:border-slate-500'
              }`}
            >
              {u.nome}
            </button>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="text-sm text-slate-500">Carregando grade…</div>
      ) : totalAulas === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-600">
          Nenhuma aula cadastrada{unidadeFiltro ? ' nessa unidade' : ''}.
          {podeCadastrar && (
            <div className="mt-3">
              <Button onClick={() => { setEditando(null); setModal(true) }}>
                <Plus className="h-4 w-4" /> Cadastrar primeira aula
              </Button>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Desktop: grid 7 colunas */}
          <div className="hidden lg:grid grid-cols-7 gap-3">
            {[0, 1, 2, 3, 4, 5, 6].map(d => (
              <DiaColuna
                key={d}
                titulo={DIAS_CURTO[d]}
                aulas={grade?.[d] ?? []}
                onClickAula={(a) => { setEditando(a); setModal(true) }}
              />
            ))}
          </div>

          {/* Mobile/Tablet: lista vertical por dia */}
          <div className="lg:hidden space-y-4">
            {[1, 2, 3, 4, 5, 6, 0].map(d => {
              const aulas = grade?.[d] ?? []
              if (aulas.length === 0) return null
              return (
                <div key={d}>
                  <div className="text-xs uppercase tracking-wide text-slate-500 font-semibold mb-2">{DIAS[d]}</div>
                  <div className="space-y-2">
                    {aulas.map(a => (
                      <AulaCard key={a.id} aula={a} onClick={() => { setEditando(a); setModal(true) }} />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {modal && (
        <AulaFormModal
          aula={editando}
          unidades={unidades}
          modalidades={modalidades}
          professores={professores}
          salas={salas}
          treinos={treinos}
          onClose={() => { setModal(false); setEditando(null) }}
          onSubmit={(d) => salvar.mutate(d)}
          salvando={salvar.isPending}
          erro={salvar.error ? mensagemDeErro(salvar.error) : null}
        />
      )}
    </div>
  )
}

function DiaColuna({ titulo, aulas, onClickAula }: { titulo: string; aulas: Aula[]; onClickAula: (a: Aula) => void }) {
  return (
    <div className="bg-slate-50 rounded-xl p-3 min-h-[120px]">
      <div className="text-xs uppercase tracking-wide text-slate-500 font-semibold mb-2 text-center">{titulo}</div>
      <div className="space-y-2">
        {aulas.length === 0 ? (
          <div className="text-xs text-slate-400 text-center py-4">—</div>
        ) : (
          aulas.map(a => <AulaCard key={a.id} aula={a} onClick={() => onClickAula(a)} compacto />)
        )}
      </div>
    </div>
  )
}

function AulaCard({ aula, onClick, compacto }: { aula: Aula; onClick: () => void; compacto?: boolean }) {
  const cor = aula.modalidade.cor ?? '#22C55E'
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white rounded-lg border-l-4 border border-slate-200 p-3 hover:border-slate-900 transition active:bg-slate-50"
      style={{ borderLeftColor: cor }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-slate-900">
            {aula.horarioInicio}
            <span className="text-xs font-normal text-slate-500"> – {aula.horarioFim}</span>
          </div>
          <div className="text-sm text-slate-900 mt-0.5 truncate">
            {aula.nome || aula.modalidade.nome}
          </div>
          {!compacto && (
            <div className="text-xs text-slate-600 mt-1 space-y-0.5">
              <div className="flex items-center gap-1"><User className="h-3 w-3" /> {aula.professor.nome}</div>
              <div className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {aula.sala.nome}</div>
              {aula.treino && (
                <div className="flex items-center gap-1 text-slate-500">
                  <Dumbbell className="h-3 w-3" /> {aula.treino.nome}
                </div>
              )}
            </div>
          )}
          {compacto && (
            <div className="text-xs text-slate-500 mt-0.5 truncate">
              {aula.professor.nome.split(' ')[0]} · {aula.sala.nome}
            </div>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          <Pencil className="h-3.5 w-3.5 text-slate-300" />
          <div className="text-xs text-slate-500 mt-1 flex items-center gap-0.5">
            <Users className="h-3 w-3" /> {aula.capacidade}
          </div>
        </div>
      </div>
      {!aula.ativa && <div className="text-xs text-amber-700 mt-1">Inativa</div>}
    </button>
  )
}

function AulaFormModal({
  aula, unidades, modalidades, professores, salas, treinos,
  onClose, onSubmit, salvando, erro,
}: {
  aula: Aula | null
  unidades: UnidadeSimples[]
  modalidades: Modalidade[]
  professores: ProfessorSimples[]
  salas: SalaSimples[]
  treinos: TreinoSimples[]
  onClose: () => void
  onSubmit: (d: Form) => void
  salvando: boolean
  erro: string | null
}) {
  const { register, handleSubmit, watch, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: aula ? {
      unidadeId: aula.unidadeId,
      modalidadeId: aula.modalidadeId,
      professorId: aula.professorId,
      salaId: aula.salaId,
      nome: aula.nome ?? '',
      diaSemana: aula.diaSemana,
      horarioInicio: aula.horarioInicio,
      horarioFim: aula.horarioFim,
      capacidade: aula.capacidade,
      permiteListaEspera: aula.permiteListaEspera,
      treinoId: aula.treinoId ?? undefined,
      ativa: aula.ativa,
    } : { permiteListaEspera: true, ativa: true } as Form,
  })

  const unidadeIdSel = watch('unidadeId')
  const salasFiltradas = useMemo(
    () => salas.filter(s => !s.unidade || s.unidade.id === Number(unidadeIdSel) || !unidadeIdSel),
    [salas, unidadeIdSel],
  )

  return (
    <Modal
      open onClose={onClose}
      titulo={aula ? 'Editar aula' : 'Nova aula'}
      tamanho="lg"
      rodape={
        <>
          <Button variante="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit(onSubmit)} loading={salvando}>{aula ? 'Salvar' : 'Cadastrar'}</Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <Field label="Nome (opcional)" hint="Deixe em branco para usar o nome da modalidade.">
          <Input {...register('nome')} placeholder="Ex: CrossFit Avançado" />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Unidade" erro={errors.unidadeId?.message} obrigatorio>
            <Select {...register('unidadeId')}>
              <option value="">Selecione…</option>
              {unidades.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
            </Select>
          </Field>
          <Field label="Sala" erro={errors.salaId?.message} obrigatorio>
            <Select {...register('salaId')}>
              <option value="">Selecione…</option>
              {salasFiltradas.map(s => (
                <option key={s.id} value={s.id}>{s.nome} (cap. {s.capacidade})</option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Modalidade" erro={errors.modalidadeId?.message} obrigatorio>
            <Select {...register('modalidadeId')}>
              <option value="">Selecione…</option>
              {modalidades.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
            </Select>
          </Field>
          <Field label="Professor" erro={errors.professorId?.message} obrigatorio>
            <Select {...register('professorId')}>
              <option value="">Selecione…</option>
              {professores.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Field label="Dia da semana" erro={errors.diaSemana?.message} obrigatorio>
            <Select {...register('diaSemana')}>
              <option value="">—</option>
              {DIAS.map((d, i) => <option key={i} value={i}>{d}</option>)}
            </Select>
          </Field>
          <Field label="Início" erro={errors.horarioInicio?.message} obrigatorio>
            <Input {...register('horarioInicio')} type="time" />
          </Field>
          <Field label="Fim" erro={errors.horarioFim?.message} obrigatorio>
            <Input {...register('horarioFim')} type="time" />
          </Field>
          <Field label="Capacidade" erro={errors.capacidade?.message} obrigatorio>
            <Input {...register('capacidade')} type="number" min={1} placeholder="14" />
          </Field>
        </div>

        <Field label="Treino padrão (opcional)" hint="Aparece como sugestão para os alunos.">
          <Select {...register('treinoId')}>
            <option value="">—</option>
            {treinos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
          </Select>
        </Field>

        <div className="flex flex-wrap gap-4 mt-2">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" {...register('permiteListaEspera')} className="rounded border-slate-300" />
            Permite lista de espera quando lotar
          </label>
          {aula && (
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" {...register('ativa')} className="rounded border-slate-300" />
              Aula ativa na grade
            </label>
          )}
        </div>

        {erro && <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{erro}</div>}
      </form>
    </Modal>
  )
}

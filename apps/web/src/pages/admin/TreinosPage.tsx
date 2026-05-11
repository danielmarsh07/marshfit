import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, Clock, Zap } from 'lucide-react'
import { api } from '@/services/api'
import { Modal } from '@/components/ui/Modal'
import { Field, Input, Select, Textarea } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { mensagemDeErro } from '@/lib/erro'

interface Modalidade { id: number; nome: string; cor: string | null }

type Nivel = 'INICIANTE' | 'INTERMEDIARIO' | 'AVANCADO' | 'TODOS'
type Formato = 'AMRAP' | 'EMOM' | 'FOR_TIME' | 'TABATA' | 'STRENGTH' | 'HIIT' | 'LIVRE'

interface Treino {
  id: number
  nome: string
  modalidadeId: number | null
  nivel: Nivel | null
  formato: Formato | null
  duracaoMin: number | null
  descricao: string
  ativo: boolean
  modalidade: Modalidade | null
}

const schema = z.object({
  nome:         z.string().min(2).max(120),
  modalidadeId: z.union([z.coerce.number().int().positive(), z.literal('')]).optional()
                  .transform(v => v === '' || v === undefined ? undefined : v),
  nivel:        z.enum(['INICIANTE', 'INTERMEDIARIO', 'AVANCADO', 'TODOS', '']).optional()
                  .transform(v => v === '' ? undefined : v),
  formato:      z.enum(['AMRAP', 'EMOM', 'FOR_TIME', 'TABATA', 'STRENGTH', 'HIIT', 'LIVRE', '']).optional()
                  .transform(v => v === '' ? undefined : v),
  duracaoMin:   z.union([z.coerce.number().int().min(1).max(600), z.literal('')]).optional()
                  .transform(v => v === '' || v === undefined ? undefined : v),
  descricao:    z.string().min(1, 'Descreva o treino').max(10000),
  ativo:        z.boolean().optional(),
})
type Form = z.infer<typeof schema>

const FORMATO_LABEL: Record<Formato, string> = {
  AMRAP: 'AMRAP', EMOM: 'EMOM', FOR_TIME: 'For Time', TABATA: 'Tabata',
  STRENGTH: 'Força', HIIT: 'HIIT', LIVRE: 'Livre',
}
const NIVEL_LABEL: Record<Nivel, string> = {
  INICIANTE: 'Iniciante', INTERMEDIARIO: 'Intermediário', AVANCADO: 'Avançado', TODOS: 'Todos',
}

export function TreinosPage() {
  const qc = useQueryClient()
  const [editando, setEditando] = useState<Treino | null>(null)
  const [modal, setModal] = useState(false)
  const [busca, setBusca] = useState('')

  const { data: treinos = [], isLoading } = useQuery({
    queryKey: ['treinos', busca],
    queryFn: async () => (await api.get<Treino[]>(`/treinos${busca ? `?busca=${encodeURIComponent(busca)}` : ''}`)).data,
  })

  const { data: modalidades = [] } = useQuery({
    queryKey: ['modalidades', 'ativas'],
    queryFn: async () => (await api.get<Modalidade[]>('/modalidades?ativo=true')).data,
  })

  const salvar = useMutation({
    mutationFn: async (data: Form) => {
      if (editando) return api.put(`/treinos/${editando.id}`, data)
      return api.post('/treinos', data)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['treinos'] }); setModal(false); setEditando(null) },
  })

  return (
    <div>
      <PageHeader
        titulo="Treinos"
        descricao="Templates de WOD, séries e atividades. Vincule a uma aula para virar o treino do dia."
        acoes={<Button onClick={() => { setEditando(null); setModal(true) }}><Plus className="h-4 w-4" /> Novo treino</Button>}
      />

      <div className="mb-4">
        <Input placeholder="Buscar por nome ou descrição" value={busca} onChange={e => setBusca(e.target.value)} className="max-w-sm" />
      </div>

      {isLoading ? (
        <div className="text-sm text-slate-500">Carregando…</div>
      ) : treinos.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-600">
          Nenhum treino cadastrado. Comece criando o WOD da semana ou a ficha de musculação base.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {treinos.map(t => (
            <button
              key={t.id}
              onClick={() => { setEditando(t); setModal(true) }}
              className="text-left bg-white rounded-xl border border-slate-200 p-4 hover:border-slate-900 transition"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-900 truncate">{t.nome}</div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {t.modalidade && (
                      <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: (t.modalidade.cor ?? '#22C55E') + '20', color: t.modalidade.cor ?? '#15803D' }}>
                        {t.modalidade.nome}
                      </span>
                    )}
                    {t.formato && (
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700">{FORMATO_LABEL[t.formato]}</span>
                    )}
                    {t.nivel && (
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700">{NIVEL_LABEL[t.nivel]}</span>
                    )}
                  </div>
                </div>
                <Pencil className="h-4 w-4 text-slate-400 flex-shrink-0" />
              </div>
              <div className="text-xs text-slate-600 mt-2 line-clamp-3 whitespace-pre-wrap">
                {t.descricao}
              </div>
              {(t.duracaoMin || !t.ativo) && (
                <div className="text-xs text-slate-500 mt-2 flex items-center gap-3">
                  {t.duracaoMin && <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {t.duracaoMin} min</span>}
                  {!t.ativo && <span>Inativo</span>}
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {modal && (
        <TreinoFormModal
          treino={editando}
          modalidades={modalidades}
          onClose={() => { setModal(false); setEditando(null) }}
          onSubmit={(d) => salvar.mutate(d)}
          salvando={salvar.isPending}
          erro={salvar.error ? mensagemDeErro(salvar.error) : null}
        />
      )}
    </div>
  )
}

function TreinoFormModal({
  treino, modalidades, onClose, onSubmit, salvando, erro,
}: {
  treino: Treino | null
  modalidades: Modalidade[]
  onClose: () => void
  onSubmit: (d: Form) => void
  salvando: boolean
  erro: string | null
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: treino ? {
      nome: treino.nome,
      modalidadeId: treino.modalidadeId ?? undefined,
      nivel: treino.nivel ?? undefined,
      formato: treino.formato ?? undefined,
      duracaoMin: treino.duracaoMin ?? undefined,
      descricao: treino.descricao,
      ativo: treino.ativo,
    } : { ativo: true } as Form,
  })

  return (
    <Modal
      open onClose={onClose} titulo={treino ? 'Editar treino' : 'Novo treino'} tamanho="lg"
      rodape={
        <>
          <Button variante="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit(onSubmit)} loading={salvando}>{treino ? 'Salvar' : 'Cadastrar'}</Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <Field label="Nome" erro={errors.nome?.message} obrigatorio>
          <Input {...register('nome')} placeholder="WOD Murph, Ficha A musculação, Fundamentos pilates…" />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Modalidade" hint="Deixe em branco para um treino genérico.">
            <Select {...register('modalidadeId')}>
              <option value="">—</option>
              {modalidades.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
            </Select>
          </Field>
          <Field label="Nível">
            <Select {...register('nivel')}>
              <option value="">—</option>
              <option value="INICIANTE">Iniciante</option>
              <option value="INTERMEDIARIO">Intermediário</option>
              <option value="AVANCADO">Avançado</option>
              <option value="TODOS">Todos os níveis</option>
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Formato" hint="AMRAP, EMOM, etc — opcional.">
            <Select {...register('formato')}>
              <option value="">—</option>
              <option value="AMRAP">AMRAP</option>
              <option value="EMOM">EMOM</option>
              <option value="FOR_TIME">For Time</option>
              <option value="TABATA">Tabata</option>
              <option value="STRENGTH">Força (sets x reps)</option>
              <option value="HIIT">HIIT</option>
              <option value="LIVRE">Livre</option>
            </Select>
          </Field>
          <Field label="Duração (minutos)">
            <Input {...register('duracaoMin')} type="number" min={1} max={600} placeholder="60" />
          </Field>
        </div>
        <Field label="Descrição / instruções" erro={errors.descricao?.message} obrigatorio>
          <Textarea
            {...register('descricao')}
            rows={8}
            placeholder={`Exemplo:\n\n21-15-9 reps\n- Thrusters 43kg\n- Pull-ups\n\nFor Time. Cap 12min.`}
            className="font-mono text-sm"
          />
        </Field>
        {treino && (
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" {...register('ativo')} className="rounded border-slate-300" />
            Treino ativo (aparece como opção para vincular em aulas)
          </label>
        )}
        {erro && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700 flex items-start gap-2">
            <Zap className="h-4 w-4 mt-0.5 flex-shrink-0" /> {erro}
          </div>
        )}
      </form>
    </Modal>
  )
}

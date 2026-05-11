import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil } from 'lucide-react'
import { api } from '@/services/api'
import { Modal } from '@/components/ui/Modal'
import { Field, Input, Select, Textarea } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { mensagemDeErro } from '@/lib/erro'

interface Modalidade { id: number; nome: string; cor: string | null }

interface Plano {
  id: number
  nome: string
  descricao: string | null
  valor: string  // Decimal vem como string do Prisma
  periodicidade: 'MENSAL' | 'TRIMESTRAL' | 'SEMESTRAL' | 'ANUAL'
  aulasPorSemana: number | null
  acessoLivre: boolean
  ativo: boolean
  modalidades: Modalidade[]
}

const schema = z.object({
  nome:           z.string().min(2).max(120),
  descricao:      z.string().max(2000).optional(),
  valor:          z.coerce.number().nonnegative().max(99999999),
  periodicidade:  z.enum(['MENSAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL']),
  aulasPorSemana: z.coerce.number().int().min(1).max(50).optional().or(z.literal('')).transform(v => v === '' ? undefined : v),
  acessoLivre:    z.boolean().optional(),
  modalidadeIds:  z.array(z.number()).optional(),
  ativo:          z.boolean().optional(),
})
type Form = z.infer<typeof schema>

const LABEL_PERIODO: Record<Plano['periodicidade'], string> = {
  MENSAL: 'mês',
  TRIMESTRAL: 'trimestre',
  SEMESTRAL: 'semestre',
  ANUAL: 'ano',
}

function formatarBRL(v: string | number) {
  const num = typeof v === 'string' ? Number(v) : v
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function PlanosPage() {
  const qc = useQueryClient()
  const [editando, setEditando] = useState<Plano | null>(null)
  const [modal, setModal] = useState(false)

  const { data: planos = [], isLoading } = useQuery({
    queryKey: ['planos'],
    queryFn: async () => (await api.get<Plano[]>('/planos')).data,
  })

  const { data: modalidades = [] } = useQuery({
    queryKey: ['modalidades', 'ativas'],
    queryFn: async () => (await api.get<Modalidade[]>('/modalidades?ativo=true')).data,
  })

  const salvar = useMutation({
    mutationFn: async (data: Form) => {
      if (editando) return api.put(`/planos/${editando.id}`, data)
      return api.post('/planos', data)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['planos'] }); setModal(false); setEditando(null) },
  })

  return (
    <div>
      <PageHeader
        titulo="Planos"
        descricao="Produtos comerciais que você vende aos alunos."
        acoes={<Button onClick={() => { setEditando(null); setModal(true) }}><Plus className="h-4 w-4" /> Novo plano</Button>}
      />

      {isLoading ? (
        <div className="text-sm text-slate-500">Carregando…</div>
      ) : planos.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-600">
          Comece cadastrando o primeiro plano (ex: Mensal, Trimestral).
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {planos.map(p => (
            <button
              key={p.id}
              onClick={() => { setEditando(p); setModal(true) }}
              className="text-left bg-white rounded-xl border border-slate-200 p-5 hover:border-slate-900 transition"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold text-slate-900">{p.nome}</div>
                  <div className="text-2xl font-bold text-slate-900 mt-1">{formatarBRL(p.valor)}</div>
                  <div className="text-xs text-slate-500">/ {LABEL_PERIODO[p.periodicidade]}</div>
                </div>
                <Pencil className="h-4 w-4 text-slate-400" />
              </div>
              <div className="mt-3 text-xs text-slate-600 space-y-0.5">
                {p.acessoLivre
                  ? <div>✓ Acesso livre a todas as modalidades</div>
                  : <div>{p.modalidades.length} modalidade(s) liberada(s)</div>
                }
                {p.aulasPorSemana && <div>✓ Até {p.aulasPorSemana} aulas/semana</div>}
              </div>
              {!p.ativo && <div className="mt-3 text-xs text-slate-500">Inativo</div>}
            </button>
          ))}
        </div>
      )}

      {modal && (
        <PlanoFormModal
          plano={editando}
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

function PlanoFormModal({
  plano, modalidades, onClose, onSubmit, salvando, erro,
}: {
  plano: Plano | null
  modalidades: Modalidade[]
  onClose: () => void
  onSubmit: (d: Form) => void
  salvando: boolean
  erro: string | null
}) {
  const { register, handleSubmit, control, watch, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: plano ? {
      nome: plano.nome,
      descricao: plano.descricao ?? '',
      valor: Number(plano.valor),
      periodicidade: plano.periodicidade,
      aulasPorSemana: plano.aulasPorSemana ?? undefined,
      acessoLivre: plano.acessoLivre,
      modalidadeIds: plano.modalidades.map(m => m.id),
      ativo: plano.ativo,
    } : { periodicidade: 'MENSAL', acessoLivre: false, ativo: true, modalidadeIds: [] } as Form,
  })

  const acessoLivre = watch('acessoLivre')

  return (
    <Modal
      open onClose={onClose}
      titulo={plano ? 'Editar plano' : 'Novo plano'}
      tamanho="lg"
      rodape={
        <>
          <Button variante="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit(onSubmit)} loading={salvando}>{plano ? 'Salvar' : 'Cadastrar'}</Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <Field label="Nome do plano" erro={errors.nome?.message} obrigatorio>
          <Input {...register('nome')} placeholder="Mensal, Trimestral, Plus, etc" />
        </Field>
        <Field label="Descrição">
          <Textarea {...register('descricao')} rows={2} placeholder="O que está incluso" />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Valor (R$)" erro={errors.valor?.message} obrigatorio>
            <Input {...register('valor')} type="number" step="0.01" min="0" placeholder="199.90" />
          </Field>
          <Field label="Periodicidade" erro={errors.periodicidade?.message} obrigatorio>
            <Select {...register('periodicidade')}>
              <option value="MENSAL">Mensal</option>
              <option value="TRIMESTRAL">Trimestral</option>
              <option value="SEMESTRAL">Semestral</option>
              <option value="ANUAL">Anual</option>
            </Select>
          </Field>
        </div>
        <Field label="Aulas por semana (opcional)" hint="Deixe vazio para acesso ilimitado">
          <Input {...register('aulasPorSemana')} type="number" min="1" max="50" placeholder="3" />
        </Field>

        <label className="flex items-center gap-2 text-sm text-slate-700 mt-2">
          <input type="checkbox" {...register('acessoLivre')} className="rounded border-slate-300" />
          Acesso livre a todas as modalidades
        </label>

        {!acessoLivre && (
          <Field label="Modalidades liberadas">
            <Controller
              control={control}
              name="modalidadeIds"
              render={({ field }) => (
                <div className="flex flex-wrap gap-2">
                  {modalidades.map(m => {
                    const sel = field.value?.includes(m.id) ?? false
                    return (
                      <button type="button" key={m.id}
                        onClick={() => {
                          const atual = field.value ?? []
                          field.onChange(sel ? atual.filter(id => id !== m.id) : [...atual, m.id])
                        }}
                        className={`text-sm px-3 py-1.5 rounded-full border ${sel ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 text-slate-700 hover:border-slate-500'}`}
                      >
                        {m.nome}
                      </button>
                    )
                  })}
                  {modalidades.length === 0 && <span className="text-xs text-slate-500">Cadastre modalidades primeiro.</span>}
                </div>
              )}
            />
          </Field>
        )}

        {plano && (
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" {...register('ativo')} className="rounded border-slate-300" />
            Plano ativo (aceita novas matrículas)
          </label>
        )}
        {erro && <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{erro}</div>}
      </form>
    </Modal>
  )
}

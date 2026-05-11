import { useEffect, useRef, useState } from 'react'
import { X, Check, Loader2 } from 'lucide-react'

const API_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3334'

interface LeadModalProps {
  origem: string
  onClose: () => void
}

export function LeadModal({ origem, onClose }: LeadModalProps) {
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState<string | null>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeRef.current?.focus()
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onEsc)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onEsc)
      document.body.style.overflow = ''
    }
  }, [onClose])

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setErro(null)
    const form = new FormData(e.currentTarget)
    const payload = {
      nome:     String(form.get('nome') ?? '').trim(),
      email:    String(form.get('email') ?? '').trim(),
      telefone: String(form.get('telefone') ?? '').trim(),
      academia: String(form.get('academia') ?? '').trim() || undefined,
      cidade:   String(form.get('cidade') ?? '').trim() || undefined,
      mensagem: String(form.get('mensagem') ?? '').trim() || undefined,
      origem,
    }

    try {
      const resp = await fetch(`${API_URL}/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await resp.json()
      if (!resp.ok) {
        setErro(data?.error ?? 'Não conseguimos enviar agora. Tente novamente.')
        return
      }
      setSucesso(data?.mensagem ?? 'Recebemos seu contato!')
    } catch {
      setErro('Falha de conexão. Verifique sua internet.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h3 className="font-semibold text-slate-900">Quero conhecer o MarshFit</h3>
          <button ref={closeRef} onClick={onClose} className="p-2 -mr-2 rounded hover:bg-slate-100">
            <X className="h-5 w-5 text-slate-600" />
          </button>
        </div>

        {sucesso ? (
          <div className="px-5 py-10 text-center">
            <div className="h-12 w-12 rounded-full bg-brand-500/15 mx-auto flex items-center justify-center">
              <Check className="h-6 w-6 text-brand-600" />
            </div>
            <h4 className="text-lg font-semibold text-slate-900 mt-4">Obrigado!</h4>
            <p className="text-slate-600 mt-2">{sucesso}</p>
            <button
              onClick={onClose}
              className="mt-6 bg-slate-900 text-white rounded-lg px-6 py-2.5 font-medium hover:bg-slate-800"
            >
              Fechar
            </button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="px-5 py-5 space-y-3">
            <Campo label="Seu nome*">
              <input name="nome" required type="text" className={baseInput} placeholder="Como vamos te chamar" />
            </Campo>
            <Campo label="Email*">
              <input name="email" required type="email" className={baseInput} placeholder="voce@email.com" />
            </Campo>
            <Campo label="WhatsApp*">
              <input name="telefone" required type="tel" className={baseInput} placeholder="(11) 99999-0000" />
            </Campo>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Campo label="Nome da academia/box">
                <input name="academia" type="text" className={baseInput} placeholder="Box Pilot" />
              </Campo>
              <Campo label="Cidade">
                <input name="cidade" type="text" className={baseInput} placeholder="São Paulo" />
              </Campo>
            </div>
            <Campo label="Quer contar mais?">
              <textarea name="mensagem" rows={3} className={baseInput} placeholder="Quantos alunos? Quais modalidades? Hoje usa outro sistema?" />
            </Campo>

            {erro && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                {erro}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 text-white py-3 font-medium hover:bg-slate-800 disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Enviar contato
            </button>

            <p className="text-xs text-slate-500 text-center">
              A gente te chama no WhatsApp em até 1 dia útil.
            </p>
          </form>
        )}
      </div>
    </div>
  )
}

const baseInput =
  'w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-brand-500'

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-slate-700 mb-1">{label}</span>
      {children}
    </label>
  )
}

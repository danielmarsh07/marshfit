import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  onClose: () => void
  titulo: string
  children: React.ReactNode
  tamanho?: 'sm' | 'md' | 'lg'
  rodape?: React.ReactNode
}

export function Modal({ open, onClose, titulo, children, tamanho = 'md', rodape }: ModalProps) {
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    closeRef.current?.focus()
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onEsc)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onEsc)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  const maxW = tamanho === 'sm' ? 'max-w-sm' : tamanho === 'lg' ? 'max-w-2xl' : 'max-w-lg'

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className={`bg-white sm:rounded-2xl rounded-t-2xl shadow-2xl w-full ${maxW} max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h3 className="font-semibold text-slate-900">{titulo}</h3>
          <button ref={closeRef} onClick={onClose} className="p-2 -mr-2 rounded hover:bg-slate-100">
            <X className="h-5 w-5 text-slate-600" />
          </button>
        </div>
        <div className="px-5 py-5 overflow-y-auto flex-1">{children}</div>
        {rodape && <div className="px-5 py-4 border-t border-slate-200 flex gap-2 justify-end">{rodape}</div>}
      </div>
    </div>
  )
}

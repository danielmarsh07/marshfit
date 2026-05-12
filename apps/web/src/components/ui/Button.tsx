import { forwardRef } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/cn'

type Variante = 'primary' | 'secondary' | 'danger' | 'ghost'
type Tamanho = 'sm' | 'md'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante
  tamanho?: Tamanho
  loading?: boolean
}

const variantes: Record<Variante, string> = {
  primary:   'bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-60',
  secondary: 'border border-slate-300 text-slate-900 hover:bg-slate-50 disabled:opacity-60',
  danger:    'bg-red-600 text-white hover:bg-red-700 disabled:opacity-60',
  ghost:     'text-slate-600 hover:text-slate-900 hover:bg-slate-100',
}

const tamanhos: Record<Tamanho, string> = {
  // Mobile-first: tamanhos miram >=44px de altura. Em sm:* relaxa para desktop.
  sm: 'px-3 py-2 text-sm sm:py-1.5',
  md: 'px-4 py-3 text-base sm:py-2.5 sm:text-sm',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variante = 'primary', tamanho = 'md', loading, disabled, className, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={loading || disabled}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition disabled:cursor-not-allowed',
        variantes[variante],
        tamanhos[tamanho],
        className,
      )}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  )
})

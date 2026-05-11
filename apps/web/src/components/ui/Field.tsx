import { forwardRef } from 'react'
import { cn } from '@/lib/cn'

interface FieldProps {
  label: string
  erro?: string
  hint?: string
  obrigatorio?: boolean
  children: React.ReactNode
}

export function Field({ label, erro, hint, obrigatorio, children }: FieldProps) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-slate-700 mb-1">
        {label}
        {obrigatorio && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      {children}
      {hint && !erro && <span className="block text-xs text-slate-500 mt-1">{hint}</span>}
      {erro && <span className="block text-xs text-red-600 mt-1">{erro}</span>}
    </label>
  )
}

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          'w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-slate-50 disabled:text-slate-500',
          className,
        )}
        {...props}
      />
    )
  },
)

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...props }, ref) {
    return (
      <select
        ref={ref}
        className={cn(
          'w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base bg-white focus:outline-none focus:ring-2 focus:ring-brand-500',
          className,
        )}
        {...props}
      >
        {children}
      </select>
    )
  },
)

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        className={cn(
          'w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-brand-500',
          className,
        )}
        {...props}
      />
    )
  },
)

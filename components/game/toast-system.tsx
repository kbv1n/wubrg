'use client'

import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'

// ─── Types ─────────────────────────────────────────────────────────────────

export type ToastVariant = 'default' | 'success' | 'error' | 'warning' | 'info'

interface ToastItem {
  id: string
  message: string
  variant: ToastVariant
  /** auto-dismiss after this many ms (default 3000) */
  duration: number
  /** true while the toast is in fade-out */
  exiting: boolean
}

interface ToastContextValue {
  toast: (message: string, variant?: ToastVariant, duration?: number) => void
}

// ─── Context ───────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue>({
  toast: () => {},
})

export function useToast() {
  return useContext(ToastContext)
}

// ─── Provider ──────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const dismiss = useCallback((id: string) => {
    // Start exit animation
    setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t))
    // Remove after animation
    const timer = setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
      timersRef.current.delete(id)
    }, 350)
    timersRef.current.set(id + '_exit', timer)
  }, [])

  const toast = useCallback((
    message: string,
    variant: ToastVariant = 'default',
    duration = 3000
  ) => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev.slice(-4), { id, message, variant, duration, exiting: false }])

    const timer = setTimeout(() => dismiss(id), duration)
    timersRef.current.set(id, timer)
  }, [dismiss])

  // Clear all timers on unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach(t => clearTimeout(t))
    }
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

// ─── Container ─────────────────────────────────────────────────────────────

function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[]
  onDismiss: (id: string) => void
}) {
  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-[9990] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <ToastCard key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  )
}

// ─── Individual toast card ──────────────────────────────────────────────────

function ToastCard({
  toast,
  onDismiss,
}: {
  toast: ToastItem
  onDismiss: (id: string) => void
}) {
  const variantStyles: Record<ToastVariant, string> = {
    default: 'border-border/60 text-foreground',
    success: 'border-emerald-500/60 text-emerald-400',
    error:   'border-red-500/60 text-red-400',
    warning: 'border-amber-500/60 text-amber-400',
    info:    'border-sky-500/60 text-sky-400',
  }

  return (
    <div
      className={cn(
        'pointer-events-auto liquid-glass rounded-xl px-4 py-3',
        'flex items-center gap-3 min-w-[220px] max-w-[360px]',
        'border shadow-lg',
        variantStyles[toast.variant],
        toast.exiting ? 'toast-exit' : 'toast-enter'
      )}
    >
      <p className="text-sm font-medium flex-1 leading-snug">{toast.message}</p>
      <button
        onClick={() => onDismiss(toast.id)}
        className="text-muted-foreground hover:text-foreground flex-shrink-0 transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

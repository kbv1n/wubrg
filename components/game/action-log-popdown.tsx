'use client'

import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { X, Scroll } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ActionLogPopdownProps {
  entries: string[]
  open: boolean
  onClose: () => void
}

export function ActionLogPopdown({ entries, open, onClose }: ActionLogPopdownProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEsc)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEsc)
    }
  }, [open, onClose])

  if (!open) return null

  const getEntryColor = (entry: string) => {
    if (entry.includes('damage') || entry.includes('lost')) return 'text-red-400'
    if (entry.includes('gained') || entry.includes('drew')) return 'text-emerald-400'
    if (entry.includes('played') || entry.includes('cast')) return 'text-amber-400'
    if (entry.includes('passed') || entry.includes('turn')) return 'text-blue-400'
    return 'text-muted-foreground'
  }

  return (
    <div className="fixed inset-0 z-[9500] pointer-events-none flex items-start justify-center pt-20">
      <div
        ref={ref}
        className={cn(
          'pointer-events-auto liquid-glass-readable rounded-2xl w-[400px] max-h-[60vh]',
          'animate-slide-up overflow-hidden flex flex-col'
        )}
        style={{
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Scroll className="w-4 h-4 text-primary" />
            <span className="text-sm font-bold text-primary">Action Log</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Entries */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 max-h-[400px]">
          {entries.length === 0 ? (
            <p className="text-muted-foreground/50 text-sm text-center py-8">
              No actions yet
            </p>
          ) : (
            <div className="space-y-1">
              {entries.map((entry, i) => (
                <div
                  key={i}
                  className={cn(
                    'text-sm py-2 px-3 rounded-lg leading-relaxed',
                    i === 0 && 'bg-white/5 font-medium',
                    getEntryColor(entry)
                  )}
                >
                  {entry}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

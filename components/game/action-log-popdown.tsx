'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { X, Scroll, Pin, PinOff } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ActionLogPopdownProps {
  entries: string[]
  open: boolean
  onClose: () => void
}

export function ActionLogPopdown({ entries, open, onClose }: ActionLogPopdownProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [pinned, setPinned] = useState(false)
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const [dragging, setDragging] = useState(false)
  const dragStart = useRef<{ mx: number; my: number; px: number; py: number } | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new entries arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [entries.length])

  // Click-outside to close (only if not pinned)
  useEffect(() => {
    if (!open || pinned) return
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    // Delay listener so the open-click doesn't immediately close
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEsc)
    }, 100)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEsc)
    }
  }, [open, pinned, onClose])

  // Drag handlers
  const onDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return
    // Initialize position from current location if not yet set
    const currentX = pos?.x ?? rect.left
    const currentY = pos?.y ?? rect.top
    dragStart.current = { mx: e.clientX, my: e.clientY, px: currentX, py: currentY }
    setDragging(true)
  }, [pos])

  useEffect(() => {
    if (!dragging) return
    const onMove = (e: MouseEvent) => {
      if (!dragStart.current) return
      const dx = e.clientX - dragStart.current.mx
      const dy = e.clientY - dragStart.current.my
      setPos({ x: dragStart.current.px + dx, y: dragStart.current.py + dy })
    }
    const onUp = () => {
      setDragging(false)
      dragStart.current = null
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [dragging])

  if (!open && !pinned) return null

  const getEntryColor = (entry: string) => {
    if (entry.includes('damage') || entry.includes('lost') || entry.includes('Milled') || entry.includes('Graveyard')) return 'text-red-400'
    if (entry.includes('gained') || entry.includes('drew') || entry.includes('Battlefield')) return 'text-emerald-400'
    if (entry.includes('played') || entry.includes('cast') || entry.includes('Revealed')) return 'text-amber-400'
    if (entry.includes('passed') || entry.includes('turn') || entry.includes('Opened') || entry.includes('Scry')) return 'text-blue-400'
    return 'text-muted-foreground'
  }

  // Position styles — if pos is set use that, otherwise center at top
  const posStyle: React.CSSProperties = pos
    ? { position: 'fixed', left: pos.x, top: pos.y }
    : { position: 'relative' }

  return (
    <div
      className={cn(
        "fixed inset-0 z-[9500] flex items-start justify-center pt-20",
        !pos && "pointer-events-none"
      )}
      style={pos ? { pointerEvents: 'none' } : undefined}
    >
      <div
        ref={ref}
        className={cn(
          'pointer-events-auto liquid-glass-readable rounded-2xl w-[400px] max-h-[60vh]',
          !pos && 'animate-slide-up',
          'overflow-hidden flex flex-col',
          dragging && 'cursor-grabbing'
        )}
        style={{
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          ...posStyle,
          ...(pinned ? { opacity: 0.92 } : {}),
        }}
      >
        {/* Header — draggable */}
        <div
          className={cn(
            "flex items-center justify-between px-4 py-3 border-b border-white/10",
            "cursor-grab select-none",
            dragging && "cursor-grabbing"
          )}
          onMouseDown={onDragStart}
        >
          <div className="flex items-center gap-2">
            <Scroll className="w-4 h-4 text-primary" />
            <span className="text-sm font-bold text-primary">Action Log</span>
            <span className="text-xs text-muted-foreground">({entries.length})</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-7 w-7",
                pinned ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => setPinned(p => !p)}
              title={pinned ? 'Unpin log' : 'Pin log open'}
            >
              {pinned ? <Pin className="w-4 h-4" /> : <PinOff className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => { setPinned(false); onClose() }}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Entries */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar p-3 max-h-[400px]">
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
                    i === entries.length - 1 && 'bg-white/5 font-medium',
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

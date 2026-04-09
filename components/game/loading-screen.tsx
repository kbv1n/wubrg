'use client'

import { cn } from '@/lib/utils'
import { Swords } from 'lucide-react'
import { GiGluttonousSmile } from "react-icons/gi";

interface LoadingScreenProps {
  done: number
  total: number
  current: string
}

export function LoadingScreen({ done, total, current }: LoadingScreenProps) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-2">
      <GiGluttonousSmile className="w-10 h-10 text-primary" />
      </div>

      {/* Progress bar */}
      <div className="w-96 max-w-[85vw]">
        <div className="bg-secondary rounded-full overflow-hidden h-2 mb-3">
          <div 
            className={cn(
              "h-full rounded-full transition-all duration-300",
              "bg-foreground"
            )}
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="flex justify-between items-center text-xs text-muted-foreground mb-4">
          <span>Fetching via Scryfall...</span>
          <span className="tabular-nums">{done}/{total} ({pct}%)</span>
        </div>

        {/* Current card */}
        {current && (
          <div className="text-center">
            <span className="text-sm text-violet-400 bg-violet-500/10 px-4 py-2 rounded-full inline-block">
              {current}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

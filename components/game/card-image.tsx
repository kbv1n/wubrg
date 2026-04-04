'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

interface CardImageProps {
  src: string | null
  alt: string
  className?: string
  fallbackText?: string
  showFallback?: boolean
}

export function CardImage({ 
  src, 
  alt, 
  className,
  fallbackText,
  showFallback = true
}: CardImageProps) {
  const [error, setError] = useState(false)

  if (!src || error) {
    if (!showFallback) return null
    
    return (
      <div 
        className={cn(
          'w-full h-full bg-secondary',
          'flex items-center justify-center text-center p-2',
          className
        )}
      >
        <span className="text-xs font-semibold text-muted-foreground leading-tight">
          {fallbackText || alt || '?'}
        </span>
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      draggable={false}
      onError={() => setError(true)}
      className={cn('w-full h-full object-cover', className)}
      crossOrigin="anonymous"
    />
  )
}

// Card back component
export function CardBack({ className }: { className?: string }) {
  return (
    <div 
      className={cn(
        'w-full h-full rounded bg-[#2d3047]',
        'border-2 border-[#4a5070] flex items-center justify-center',
        className
      )}
    >
      <div className="w-8 h-8 rounded-full bg-indigo-800/50 flex items-center justify-center">
        <span className="text-indigo-400/50 text-lg">M</span>
      </div>
    </div>
  )
}

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

// Card back component — uses the real Magic card back texture
export function CardBack({ className }: { className?: string }) {
  return (
    <img
      src="/textures/Magic_card_back.webp"
      alt="Card back"
      draggable={false}
      className={cn('w-full h-full object-cover rounded', className)}
    />
  )
}

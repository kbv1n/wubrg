'use client'

import { cn } from '@/lib/utils'
import Image from 'next/image'

// Official MTG Mana Symbol URLs from MTG Wiki
const MANA_SYMBOL_URLS: Record<string, string> = {
  W: 'https://static.wikia.nocookie.net/mtgsalvation_gamepedia/images/8/8e/W.svg',
  U: 'https://static.wikia.nocookie.net/mtgsalvation_gamepedia/images/9/9f/U.svg',
  B: 'https://static.wikia.nocookie.net/mtgsalvation_gamepedia/images/2/2f/B.svg',
  R: 'https://static.wikia.nocookie.net/mtgsalvation_gamepedia/images/8/87/R.svg',
  G: 'https://static.wikia.nocookie.net/mtgsalvation_gamepedia/images/8/88/G.svg',
  C: 'https://static.wikia.nocookie.net/mtgsalvation_gamepedia/images/1/1a/C.svg',
  // Generic/colorless
  '0': 'https://static.wikia.nocookie.net/mtgsalvation_gamepedia/images/0/0e/0.svg',
  '1': 'https://static.wikia.nocookie.net/mtgsalvation_gamepedia/images/c/ca/1.svg',
  '2': 'https://static.wikia.nocookie.net/mtgsalvation_gamepedia/images/4/42/2.svg',
  '3': 'https://static.wikia.nocookie.net/mtgsalvation_gamepedia/images/0/00/3.svg',
  '4': 'https://static.wikia.nocookie.net/mtgsalvation_gamepedia/images/1/1e/4.svg',
  '5': 'https://static.wikia.nocookie.net/mtgsalvation_gamepedia/images/b/b3/5.svg',
  '6': 'https://static.wikia.nocookie.net/mtgsalvation_gamepedia/images/d/d8/6.svg',
  '7': 'https://static.wikia.nocookie.net/mtgsalvation_gamepedia/images/6/66/7.svg',
  '8': 'https://static.wikia.nocookie.net/mtgsalvation_gamepedia/images/4/4c/8.svg',
  '9': 'https://static.wikia.nocookie.net/mtgsalvation_gamepedia/images/3/33/9.svg',
  '10': 'https://static.wikia.nocookie.net/mtgsalvation_gamepedia/images/6/62/10.svg',
  X: 'https://static.wikia.nocookie.net/mtgsalvation_gamepedia/images/d/d1/X.svg',
}

// Fallback colors for rendering without images
const MANA_COLORS: Record<string, string> = {
  W: '#F8F6D8',
  U: '#0E68AB',
  B: '#150B00',
  R: '#D3202A',
  G: '#00733E',
  C: '#CAC5C0',
}

interface ManaSymbolsProps {
  cost: string
  size?: number
  className?: string
  useImages?: boolean
}

// Parse oracle text and replace {X} symbols with inline mana icons
interface OracleTextProps {
  text: string
  className?: string
  symbolSize?: number
}

export function OracleText({ text, className, symbolSize = 14 }: OracleTextProps) {
  if (!text) return null

  // Split text by mana symbols, keeping the delimiters
  const parts = text.split(/(\{[^}]+\})/g)
  
  return (
    <span className={cn('inline', className)}>
      {parts.map((part, i) => {
        // Check if this part is a mana symbol
        if (part.match(/^\{[^}]+\}$/)) {
          return <ManaSymbols key={i} cost={part} size={symbolSize} useImages={false} className="inline-flex mx-0.5 align-middle" />
        }
        return <span key={i}>{part}</span>
      })}
    </span>
  )
}

export function ManaSymbols({ cost, size = 18, className, useImages = true }: ManaSymbolsProps) {
  if (!cost) return null

  const symbols: string[] = []
  const re = /\{([^}]+)\}/g
  let m

  while ((m = re.exec(cost)) !== null) {
    symbols.push(m[1])
  }

  if (symbols.length === 0) return null

  return (
    <span className={cn('inline-flex items-center gap-0.5 flex-wrap', className)}>
      {symbols.map((s, i) => {
        const symbolUrl = MANA_SYMBOL_URLS[s]
        
        if (useImages && symbolUrl) {
          return (
            <Image
              key={i}
              src={symbolUrl}
              alt={s}
              width={size}
              height={size}
              className="rounded-full"
              unoptimized
            />
          )
        }
        
        // Fallback to colored circles
        const isNum = /^\d+$/.test(s)
        const bg = isNum ? '#888888' : (MANA_COLORS[s] || MANA_COLORS[s[0]] || '#888888')
        const isLight = s === 'W' || isNum
        
        return (
          <span
            key={i}
            className={cn(
              'inline-flex items-center justify-center rounded-full font-bold shadow-sm',
              s === 'B' && 'ring-1 ring-white/40'
            )}
            style={{
              width: size,
              height: size,
              background: bg,
              fontSize: size * 0.55,
              color: isLight ? '#1a1a1a' : '#fff',
            }}
          >
            {(isNum || s === 'X' || s === 'Y' || s === 'Z') ? s : ''}
          </span>
        )
      })}
    </span>
  )
}

'use client'

import { cn } from '@/lib/utils'
import { useState, useEffect } from 'react'

// Scryfall symbology cache — populated on first use
let symbolCache: Map<string, string> | null = null
let fetchPromise: Promise<void> | null = null

async function loadSymbology(): Promise<Map<string, string>> {
  if (symbolCache) return symbolCache

  // Check localStorage cache first (24h TTL)
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem('scryfall_symbology')
      if (cached) {
        const { data, ts } = JSON.parse(cached)
        if (Date.now() - ts < 24 * 60 * 60 * 1000) {
          symbolCache = new Map(data)
          return symbolCache
        }
      }
    } catch { /* ignore */ }
  }

  if (!fetchPromise) {
    fetchPromise = (async () => {
      try {
        const res = await fetch('https://api.scryfall.com/symbology')
        const json = await res.json()
        const map = new Map<string, string>()
        if (json.data) {
          for (const sym of json.data) {
            // sym.symbol is like "{W}", "{T}", "{W/U}", etc.
            // sym.svg_uri is the official Scryfall SVG
            const key = sym.symbol?.replace(/^\{|\}$/g, '') || ''
            if (key && sym.svg_uri) {
              map.set(key, sym.svg_uri)
            }
          }
        }
        symbolCache = map
        // Cache in localStorage
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('scryfall_symbology', JSON.stringify({
              data: Array.from(map.entries()),
              ts: Date.now()
            }))
          } catch { /* quota exceeded, ignore */ }
        }
      } catch {
        // Fallback: empty map, will use colored circles
        symbolCache = new Map()
      }
    })()
  }
  await fetchPromise
  return symbolCache!
}

// Fallback colors for rendering without images
const MANA_COLORS: Record<string, string> = {
  W: '#F8F6D8',
  U: '#0E68AB',
  B: '#150B00',
  R: '#D3202A',
  G: '#00733E',
  C: '#CAC5C0',
  T: '#888888',
  Q: '#888888',
  E: '#db8f27',
  S: '#b0d0e8',
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
          return <ManaSymbols key={i} cost={part} size={symbolSize} useImages={true} className="inline-flex mx-0.5 align-middle" />
        }
        return <span key={i}>{part}</span>
      })}
    </span>
  )
}

export function ManaSymbols({ cost, size = 18, className, useImages = true }: ManaSymbolsProps) {
  if (!cost) return null

  const [svgMap, setSvgMap] = useState<Map<string, string> | null>(symbolCache)

  useEffect(() => {
    if (!svgMap) {
      loadSymbology().then(map => setSvgMap(map))
    }
  }, [svgMap])

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
        const svgUri = svgMap?.get(s)

        if (useImages && svgUri) {
          return (
            <img
              key={i}
              src={svgUri}
              alt={`{${s}}`}
              width={size}
              height={size}
              className="rounded-full"
              draggable={false}
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
            {(isNum || ['X', 'Y', 'Z', 'T', 'Q', 'E', 'S'].includes(s)) ? s : ''}
          </span>
        )
      })}
    </span>
  )
}

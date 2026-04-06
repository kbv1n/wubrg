'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { CardInstance, Player, PlayerPalette } from '@/lib/game-types'
import { COUNTER_TYPES } from '@/lib/game-types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { X, Minus, Plus } from 'lucide-react'
import { CardImage } from './card-image'

// Counter Modal
interface CounterModalProps {
  card: CardInstance
  pal: PlayerPalette
  onAdd: (type: string, delta: number) => void
  onClose: () => void
}

export function CounterModal({ card, pal, onAdd, onClose }: CounterModalProps) {
  const counterColors: Record<string, string> = {
    '+1/+1': '#10b981',
    '-1/-1': '#ef4444',
    'Loyalty': '#3b82f6',
    'Poison': '#a78bfa',
  }

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-md z-[9500] flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="liquid-glass-strong rounded-2xl p-5 w-80"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold" style={{ color: pal.accent }}>
            {card.name}
          </h3>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="space-y-3">
          {COUNTER_TYPES.map((type) => {
            const val = card.counters?.[type] || 0
            const col = counterColors[type] || '#f59e0b'
            return (
              <div key={type} className="flex items-center gap-3">
                <span 
                  className="flex-1 text-sm font-medium"
                  style={{ color: col }}
                >
                  {type}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  style={{ borderColor: `${col}40`, color: col }}
                  onClick={() => onAdd(type, -1)}
                >
                  <Minus className="w-3 h-3" />
                </Button>
                <span className="w-8 text-center font-bold tabular-nums">
                  {val}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  style={{ borderColor: `${col}40`, color: col }}
                  onClick={() => onAdd(type, 1)}
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            )
          })}
        </div>

        <Button
          className="w-full mt-4"
          variant="secondary"
          onClick={onClose}
        >
          Close
        </Button>
      </div>
    </div>
  )
}

// Commander Damage Modal
interface CmdDmgModalProps {
  player: Player
  allPlayers: Player[]
  onDmg: (fromPid: number, delta: number) => void
  onClose: () => void
}

export function CmdDmgModal({ player, allPlayers, onDmg, onClose }: CmdDmgModalProps) {
  const pal = player.pal
  const others = allPlayers.filter((p) => p.pid !== player.pid)

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-md z-[9500] flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="liquid-glass-strong rounded-2xl p-5 w-[340px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold" style={{ color: pal.accent }}>
            {player.name}
          </h3>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Commander damage received from:
        </p>

        <div className="space-y-2">
          {others.map((op) => {
            const dmg = player.cmdDmg?.[op.pid] || 0
            return (
              <div
                key={op.pid}
                className="flex items-center gap-3 p-3 liquid-glass-subtle rounded-lg"
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ background: op.pal.accent }}
                />
                <span 
                  className="flex-1 text-sm font-medium"
                  style={{ color: op.pal.accent }}
                >
                  {op.name}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-6 w-6 text-emerald-400 border-emerald-400/40"
                  onClick={() => onDmg(op.pid, -1)}
                >
                  <Minus className="w-3 h-3" />
                </Button>
                <span 
                  className={cn(
                    "w-8 text-center font-black tabular-nums",
                    dmg >= 21 && "text-red-400",
                    dmg >= 10 && dmg < 21 && "text-amber-400",
                    dmg < 10 && "text-foreground"
                  )}
                >
                  {dmg}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-6 w-6 text-red-400 border-red-400/40"
                  onClick={() => onDmg(op.pid, 1)}
                >
                  <Plus className="w-3 h-3" />
                </Button>
                {dmg >= 21 && (
                  <span className="text-xs font-bold text-red-400">LETHAL</span>
                )}
              </div>
            )
          })}
        </div>

        <p className="text-xs text-muted-foreground/60 text-center mt-3">
          21+ commander damage = elimination
        </p>

        <Button
          className="w-full mt-4"
          variant="secondary"
          onClick={onClose}
        >
          Close
        </Button>
      </div>
    </div>
  )
}

// Scry Modal
interface ScryModalProps {
  pid: number
  n: number
  cards: CardInstance[]
  pal: PlayerPalette
  onConfirm: (top: CardInstance[], bottom: CardInstance[]) => void
  onClose: () => void
}

export function ScryModal({ pid, n, cards, pal, onConfirm, onClose }: ScryModalProps) {
  const [top, setTop] = useState<CardInstance[]>([])
  const [bottom, setBottom] = useState<CardInstance[]>([])
  const remaining = cards.filter(
    (c) => !top.find((t) => t.iid === c.iid) && !bottom.find((b) => b.iid === c.iid)
  )

  const moveToTop = (card: CardInstance) => {
    setBottom(prev => prev.filter(c => c.iid !== card.iid))
    setTop(prev => [...prev, card])
  }

  const moveToBottom = (card: CardInstance) => {
    setTop(prev => prev.filter(c => c.iid !== card.iid))
    setBottom(prev => [...prev, card])
  }

  const removeFromTop = (card: CardInstance) => {
    setTop(prev => prev.filter(c => c.iid !== card.iid))
  }

  const removeFromBottom = (card: CardInstance) => {
    setBottom(prev => prev.filter(c => c.iid !== card.iid))
  }

  const canConfirm = top.length + bottom.length === cards.length

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-md z-[9500] flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="liquid-glass-strong rounded-2xl p-5 w-[min(600px,95vw)] max-h-[90vh] overflow-y-auto custom-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold" style={{ color: pal.accent }}>
            Scry {n}
          </h3>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <p className="text-xs text-muted-foreground mb-4">
          Click cards to place them on top or bottom of your library.
        </p>

        {/* Remaining cards */}
        {remaining.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-muted-foreground mb-2">Select destination:</p>
            <div className="flex flex-wrap gap-2">
              {remaining.map((c) => (
                <div key={c.iid} className="flex flex-col items-center gap-1">
                  <div className="w-16 h-[88px] rounded overflow-hidden border border-border">
                    <CardImage src={c.img} alt={c.name} />
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-5 px-2 text-[10px] text-emerald-400"
                      onClick={() => moveToTop(c)}
                    >
                      Top
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-5 px-2 text-[10px] text-amber-400"
                      onClick={() => moveToBottom(c)}
                    >
                      Bottom
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top of library */}
        <div className="mb-4">
          <p className="text-xs text-emerald-400 mb-2">
            Top of library ({top.length}):
          </p>
          <div className="flex flex-wrap gap-2 min-h-[100px] p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
            {top.map((c) => (
              <div 
                key={c.iid} 
                className="w-14 h-[78px] rounded overflow-hidden border border-emerald-500/40 cursor-pointer hover:opacity-80"
                onClick={() => removeFromTop(c)}
              >
                <CardImage src={c.img} alt={c.name} />
              </div>
            ))}
            {top.length === 0 && (
              <span className="text-xs text-emerald-400/50 self-center">Drop cards here</span>
            )}
          </div>
        </div>

        {/* Bottom of library */}
        <div className="mb-4">
          <p className="text-xs text-amber-400 mb-2">
            Bottom of library ({bottom.length}):
          </p>
          <div className="flex flex-wrap gap-2 min-h-[100px] p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            {bottom.map((c) => (
              <div 
                key={c.iid} 
                className="w-14 h-[78px] rounded overflow-hidden border border-amber-500/40 cursor-pointer hover:opacity-80"
                onClick={() => removeFromBottom(c)}
              >
                <CardImage src={c.img} alt={c.name} />
              </div>
            ))}
            {bottom.length === 0 && (
              <span className="text-xs text-amber-400/50 self-center">Drop cards here</span>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            className="flex-1"
            onClick={() => onConfirm(top, bottom)}
            disabled={!canConfirm}
          >
            Confirm Scry
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}

// Dice Modal
interface DiceModalProps {
  mode: 'dice' | 'coin'
  onRoll: (sides: number) => number
  onFlip: () => string
  onLog: (msg: string) => void
  onClose: () => void
}

const DICE_PRESETS = [4, 6, 8, 10, 12, 20, 100]

export function DiceModal({ mode, onRoll, onFlip, onLog, onClose }: DiceModalProps) {
  const [result, setResult] = useState<string | number | null>(null)
  const [rolling, setRolling] = useState(false)
  const [customSides, setCustomSides] = useState('')

  const doRoll = (sides: number) => {
    setRolling(true)
    setResult(null)
    setTimeout(() => {
      const r = onRoll(sides)
      setResult(r)
      setRolling(false)
    }, 600)
  }

  const doFlip = () => {
    setRolling(true)
    setResult(null)
    setTimeout(() => {
      const r = onFlip()
      setResult(r)
      setRolling(false)
    }, 500)
  }

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-md z-[9500] flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="liquid-glass-strong rounded-2xl p-6 w-80 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-bold text-lg text-primary mb-4">
          {mode === 'dice' ? 'Roll Dice' : 'Flip Coin'}
        </h3>

        {/* Result display */}
        {result !== null && (
          <div className="mb-6 py-6 liquid-glass-subtle rounded-xl animate-slide-up">
            <div className="text-4xl font-black text-primary mb-1">
              {result}
            </div>
            {mode === 'dice' && typeof result === 'number' && (
              <div className="text-xs text-muted-foreground">
                {result === 20 && 'NAT 20!'}
                {result === 1 && 'NAT 1...'}
              </div>
            )}
          </div>
        )}

        {rolling && (
          <div className="mb-6 py-6 liquid-glass-subtle rounded-xl">
            <div className="text-2xl animate-pulse">
              {mode === 'dice' ? 'Rolling...' : 'Flipping...'}
            </div>
          </div>
        )}

        {mode === 'coin' ? (
          <Button
            className="w-full"
            onClick={doFlip}
            disabled={rolling}
          >
            Flip Coin
          </Button>
        ) : (
          <>
            <div className="flex gap-2 flex-wrap justify-center mb-4">
              {DICE_PRESETS.map((s) => (
                <Button
                  key={s}
                  variant="outline"
                  className="text-violet-400 border-violet-400/40 hover:bg-violet-500/10"
                  onClick={() => doRoll(s)}
                  disabled={rolling}
                >
                  d{s}
                </Button>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={customSides}
                onChange={(e) => setCustomSides(e.target.value.replace(/\D/g, ''))}
                placeholder="Custom sides..."
                className="flex-1"
              />
              <Button
                onClick={() => {
                  const s = parseInt(customSides)
                  if (s >= 2) doRoll(s)
                }}
                disabled={rolling || !customSides || parseInt(customSides) < 2}
              >
                Roll
              </Button>
            </div>
          </>
        )}

        <Button
          className="w-full mt-4"
          variant="ghost"
          onClick={onClose}
        >
          Close
        </Button>
      </div>
    </div>
  )
}

// Settings Modal
interface UISettingsModalProps {
  settings: {
    cardScale: number
    defaultZoom: number
    showZoomPanel: boolean
    uiScale: number
    glassOpacity: number
  }
  onChange: (settings: UISettingsModalProps['settings']) => void
  players: Player[]
  onPlaymat: (pid: number, field: 'url' | 'fit', value: string) => void
  onClose: () => void
}

export function UISettingsModal({ settings, onChange, players, onPlaymat, onClose }: UISettingsModalProps) {
  const [s, setS] = useState(settings)

  const update = (key: keyof typeof settings, val: number | boolean) => {
    const ns = { ...s, [key]: val }
    setS(ns)
    onChange(ns)
  }

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-md z-[9800] flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="liquid-glass-strong rounded-2xl p-6 w-[360px] max-h-[90vh] overflow-y-auto custom-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-lg text-primary">Settings</h3>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* UI Scale */}
        <div className="mb-6">
          <Label className="text-xs text-muted-foreground">
            UI Scale: <strong className="text-foreground">{Math.round(s.uiScale * 100)}%</strong>
          </Label>
          <Slider
            value={[s.uiScale * 100]}
            onValueChange={([v]) => update('uiScale', v / 100)}
            min={70}
            max={150}
            step={5}
            className="mt-2"
          />
        </div>

        {/* Card Scale */}
        <div className="mb-6">
          <Label className="text-xs text-muted-foreground">
            Card Scale: <strong className="text-foreground">{Math.round(s.cardScale * 100)}%</strong>
          </Label>
          <Slider
            value={[s.cardScale * 100]}
            onValueChange={([v]) => update('cardScale', v / 100)}
            min={50}
            max={200}
            step={5}
            className="mt-2"
          />
        </div>

        {/* Default Zoom */}
        <div className="mb-6">
          <Label className="text-xs text-muted-foreground">
            Default Zoom: <strong className="text-foreground">{Math.round(s.defaultZoom * 100)}%</strong>
          </Label>
          <Slider
            value={[s.defaultZoom * 100]}
            onValueChange={([v]) => update('defaultZoom', v / 100)}
            min={30}
            max={300}
            step={5}
            className="mt-2"
          />
        </div>

        {/* Glass Opacity */}
        <div className="mb-6">
          <Label className="text-xs text-muted-foreground">
            Glass Opacity: <strong className="text-foreground">{Math.round((s.glassOpacity || 0.85) * 100)}%</strong>
          </Label>
          <Slider
            value={[(s.glassOpacity || 0.85) * 100]}
            onValueChange={([v]) => update('glassOpacity', v / 100)}
            min={50}
            max={100}
            step={5}
            className="mt-2"
          />
        </div>

        {/* Toggle options */}
        <div className="mb-6">
          <label className="flex items-center gap-3 p-3 liquid-glass-subtle rounded-lg cursor-pointer hover:bg-white/5 transition-colors">
            <input
              type="checkbox"
              checked={s.showZoomPanel}
              onChange={(e) => update('showZoomPanel', e.target.checked)}
              className="rounded accent-primary"
            />
            <span className="text-sm">Show card preview on hover</span>
          </label>
        </div>

        {/* Playmat URLs */}
        {players && players.length > 0 && (
          <div className="mb-4">
            <Label className="text-xs text-muted-foreground mb-2 block">
              Playmat Images (per player)
            </Label>
            {players.map((p) => (
              <div key={p.pid} className="flex items-center gap-2 mb-2">
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: p.pal.accent }}
                />
                <span 
                  className="text-xs min-w-14 truncate"
                  style={{ color: p.pal.accent }}
                >
                  {p.name}
                </span>
                <Input
                  value={p.playmat || ''}
                  onChange={(e) => onPlaymat(p.pid, 'url', e.target.value)}
                  placeholder="Image URL..."
                  className="flex-1 h-7 text-xs"
                />
                <select
                  value={p.playmatFit || 'cover'}
                  onChange={(e) => onPlaymat(p.pid, 'fit', e.target.value)}
                  className="h-7 bg-secondary border border-border rounded text-xs px-1"
                >
                  <option value="cover">Stretch</option>
                  <option value="contain">Fit</option>
                  <option value="repeat">Tile</option>
                  <option value="center">Center</option>
                </select>
              </div>
            ))}
          </div>
        )}

        <Button className="w-full" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  )
}

// Toast notification
interface ToastProps {
  msg: string
  onDone: () => void
}

export function Toast({ msg, onDone }: ToastProps) {
  useState(() => {
    const t = setTimeout(onDone, 2500)
    return () => clearTimeout(t)
  })

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[10000] animate-slide-up">
      <div className="px-6 py-3 bg-card/95 backdrop-blur-md border border-border rounded-full shadow-xl shadow-black/50">
        <span className="text-sm font-medium">{msg}</span>
      </div>
    </div>
  )
}

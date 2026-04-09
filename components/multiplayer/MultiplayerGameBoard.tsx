'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { PlayerMat } from '@/components/game/player-mat'
import { CenterDivider } from '@/components/game/center-divider'
import { ContextMenu } from '@/components/game/context-menu'
import { ZoneViewer } from '@/components/game/zone-viewer'
import { ActionLogPopdown } from '@/components/game/action-log-popdown'
import { LoadingScreen } from '@/components/game/loading-screen'
import { DiceModal } from '@/components/game/modals'
import { CardImage } from '@/components/game/card-image'
import { ManaSymbols } from '@/components/game/mana-symbols'
import { getRarityColor } from '@/lib/game-data'
import { PALETTES, type CardInstance, type Player, type ZoneType } from '@/lib/game-types'
import { lookupCard, fetchScryfall } from '@/lib/game-data'
import { GameActions } from '@/lib/socket-client'
import type { MPGameState, CardState as MPCardState, PlayerState as MPPlayerState } from '@/lib/game-types'
import { useToast } from '@/components/game/toast-system'
import { GiGluttonousSmile } from "react-icons/gi";

interface MultiplayerGameBoardProps {
  gameState: MPGameState
  localPlayerId: string
}

function mpCardToCardInstance(mpCard: MPCardState): CardInstance {
  const cardData = lookupCard(mpCard.cardId)
  return {
    iid: mpCard.iid,
    name: cardData?.name ?? mpCard.cardId,
    manaCost: cardData?.manaCost ?? '',
    cmc: cardData?.cmc ?? 0,
    typeLine: cardData?.typeLine ?? '',
    oracle: cardData?.oracle ?? '',
    power: cardData?.power ?? null,
    tough: cardData?.tough ?? null,
    loyalty: cardData?.loyalty ?? null,
    rarity: cardData?.rarity ?? 'common',
    set: cardData?.set ?? '',
    isLegendary: cardData?.isLegendary ?? false,
    isCreature: cardData?.isCreature ?? false,
    isPlaneswalker: cardData?.isPlaneswalker ?? false,
    isLand: cardData?.isLand ?? false,
    img: cardData?.img ?? null,
    tapped: mpCard.tapped,
    showBack: false,
    faceDown: mpCard.faceDown,
    summonSick: false,
    counters: mpCard.counters ? { '+1/+1': mpCard.counters } : {},
    x: mpCard.x,
    y: mpCard.y,
    z: 0,
  }
}

function mpPlayerToPlayer(mpPlayer: MPPlayerState, idx: number): Player {
  const pal = PALETTES[mpPlayer.colorIndex >= 0 ? mpPlayer.colorIndex % PALETTES.length : idx % PALETTES.length]
  return {
    pid: idx,
    name: mpPlayer.name,
    pal,
    life: mpPlayer.life,
    poison: mpPlayer.poison,
    cmdDmg: Object.fromEntries(
      Array.from(mpPlayer.cmdDamage.entries()).map(([k, v], i) => [i, v.dealt])
    ),
    library: mpPlayer.library.map(mpCardToCardInstance),
    hand: mpPlayer.hand.map(mpCardToCardInstance),
    battlefield: mpPlayer.battlefield.map(mpCardToCardInstance),
    graveyard: mpPlayer.graveyard.map(mpCardToCardInstance),
    exile: mpPlayer.exile.map(mpCardToCardInstance),
    command: mpPlayer.commandZone.map(mpCardToCardInstance),
    maxZ: 0,
    isDemo: false,
    missed: 0,
    playmat: mpPlayer.playmatUrl || '',
    playmatFit: 'cover',
  }
}

export function MultiplayerGameBoard({ gameState, localPlayerId }: MultiplayerGameBoardProps) {
  // ── Scryfall loading ───────────────────────────────────────────────────────
  const [cardsLoaded, setCardsLoaded] = useState(false)
  const [loadProgress, setLoadProgress] = useState({ done: 0, total: 0, current: '' })
  const hasFetched = useRef(false)

  useEffect(() => {
    if (hasFetched.current) return
    hasFetched.current = true

    const names = new Set<string>()
    for (const p of gameState.players.values()) {
      const zones = [...p.battlefield, ...p.hand, ...p.library, ...p.graveyard, ...p.exile, ...p.commandZone]
      for (const c of zones) names.add(c.cardId)
    }

    fetchScryfall([...names], (done, total, current) => {
      setLoadProgress({ done, total: Math.max(total, 1), current })
    })
      .catch(() => {})
      .finally(() => setCardsLoaded(true))
  }, [])

  const { toast } = useToast()

  // ── Local action log — captures client-side actions that don't go through the server log
  const [localLog, setLocalLog] = useState<string[]>([])
  const addLocalLog = useCallback((msg: string) => {
    setLocalLog(prev => [...prev, msg])
  }, [])
  // Unified notify: fires a toast AND records in local log
  const notify = useCallback((msg: string, variant: 'default' | 'success' | 'error' | 'warning' | 'info' = 'default') => {
    toast(msg, variant)
    addLocalLog(msg)
  }, [toast, addLocalLog])

  // ── UI State ───────────────────────────────────────────────────────────────
  const [zoom, setZoom] = useState<Record<number, number>>({})
  const [pan, setPan] = useState<Record<number, { x: number; y: number }>>({})
  const [hoverCard, setHoverCard] = useState<CardInstance | null>(null)
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 })
  const [previewScale, setPreviewScale] = useState(1)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; iid: string; zone: ZoneType } | null>(null)
  const [zoneViewer, setZoneViewer] = useState<{ pid: number; zone: ZoneType } | null>(null)
  const [logOpen, setLogOpen] = useState(false)
  const [diceOpen, setDiceOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [uiSettings, setUiSettings] = useState({
    cardScale: 1,
    defaultZoom: 1,
    showZoomPanel: false,
    uiScale: 1,
    glassOpacity: 0.5,
  })

  // ── Drag state ─────────────────────────────────────────────────────────────
  const [dragIid, setDragIid] = useState<string | null>(null)
  const [dragFrom, setDragFrom] = useState<string>('')
  const [dragCard, setDragCard] = useState<CardInstance | null>(null)
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 })

  // Refs for viewport-div per mat (NOT the transformed canvas — we do the math ourselves)
  const viewportRefs = useRef<Record<number, HTMLDivElement | null>>({})

  // ── Player conversion ──────────────────────────────────────────────────────
  const playersArray = Array.from(gameState.players.values())
  const players: Player[] = playersArray.map((mp, idx) => mpPlayerToPlayer(mp, idx))

  const localPlayerIdx = playersArray.findIndex(p => p.odId === localPlayerId)
  const localPid = localPlayerIdx >= 0 ? localPlayerIdx : 0

  const initializedViewports = useRef(false)
  const prevLogLen = useRef(-1)
  // Keep a stable ref to toast so the effect doesn't re-fire when the function identity changes
  const toastRef = useRef(toast)
  toastRef.current = toast

  // ── Log → Toast sync: toast new log entries as they appear ─────────────
  const logLen = gameState.log?.length ?? 0
  useEffect(() => {
    const log = gameState.log ?? []
    // First run: snapshot current length, don't toast pre-existing entries
    if (prevLogLen.current < 0) {
      prevLogLen.current = log.length
      return
    }
    if (log.length > prevLogLen.current) {
      const newEntries = log.slice(prevLogLen.current)
      for (const entry of newEntries) {
        let variant: 'default' | 'success' | 'error' | 'warning' | 'info' = 'default'
        if (entry.includes('damage') || entry.includes('lost') || entry.includes('destroyed')) variant = 'error'
        else if (entry.includes('gained') || entry.includes('drew') || entry.includes('healed')) variant = 'success'
        else if (entry.includes('played') || entry.includes('cast')) variant = 'warning'
        else if (entry.includes('passed') || entry.includes('turn') || entry.includes('untapped')) variant = 'info'
        toastRef.current(entry, variant)
      }
      prevLogLen.current = log.length
    }
  // Depend on log length (primitive) to avoid re-firing on every gameState reference change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logLen])
  const getZoom = (pid: number) => zoom[pid] ?? 1
  const setPlayerZoom = (pid: number, z: number) => setZoom(prev => ({ ...prev, [pid]: z }))
  const setPlayerPan = (pid: number, p: { x: number; y: number }) => setPan(prev => ({ ...prev, [pid]: p }))

  // Auto-fit: calculate initial zoom so the 1600×900 canvas fills each viewport
  useEffect(() => {
    if (initializedViewports.current || !cardsLoaded) return
    // Small delay to let viewports render and get their dimensions
    const timer = setTimeout(() => {
      const newZoom: Record<number, number> = {}
      const newPan: Record<number, { x: number; y: number }> = {}
      for (const [pidStr, vpEl] of Object.entries(viewportRefs.current)) {
        if (!vpEl) continue
        const pid = parseInt(pidStr)
        const rect = vpEl.getBoundingClientRect()
        const fitZoom = Math.max(rect.width / 1600, rect.height / 900)
        newZoom[pid] = fitZoom
        // Center the canvas in the viewport
        const canvasW = 1600 * fitZoom
        const canvasH = 900 * fitZoom
        newPan[pid] = { x: (rect.width - canvasW) / 2, y: (rect.height - canvasH) / 2 }
      }
      if (Object.keys(newZoom).length > 0) {
        setZoom(newZoom)
        setPan(newPan)
        initializedViewports.current = true
      }
    }, 50)
    return () => clearTimeout(timer)
  }, [cardsLoaded])

  // ── Coordinate calculation ─────────────────────────────────────────────────
  // Cards are stored as percentages of the FIXED 1600×900 canvas.
  // The canvas sits at pan.x/pan.y inside the viewport and is scaled by zoom.
  // Given a mouse position in screen space, compute the canvas percentage.
  const screenToCanvasPct = useCallback((
    mouseX: number,
    mouseY: number,
    pid: number
  ): { x: number; y: number } => {
    const vpEl = viewportRefs.current[pid]
    if (!vpEl) return { x: 50, y: 50 }

    const rect = vpEl.getBoundingClientRect()
    const currentPan = pan[pid] ?? { x: 0, y: 0 }
    const currentZoom = zoom[pid] ?? 1

    // Canvas origin in screen space
    const canvasOriginX = rect.left + currentPan.x
    const canvasOriginY = rect.top + currentPan.y

    // Canvas pixel dimensions in screen space
    const canvasScreenW = 1600 * currentZoom
    const canvasScreenH = 900 * currentZoom

    const x = Math.max(0, Math.min(95, ((mouseX - canvasOriginX) / canvasScreenW) * 100))
    const y = Math.max(0, Math.min(90, ((mouseY - canvasOriginY) / canvasScreenH) * 100))

    return { x, y }
  }, [pan, zoom])

  // ── Drag & drop ────────────────────────────────────────────────────────────
  const handleCardMD = useCallback((e: React.MouseEvent, iid: string, zone: string = 'battlefield') => {
    if (e.button !== 0) return
    e.stopPropagation()

    // Find the card to use as ghost
    let found: CardInstance | null = null
    for (const p of players) {
      const all = [...p.battlefield, ...p.hand, ...p.graveyard, ...p.exile, ...p.command, ...p.library]
      const c = all.find(c => c.iid === iid)
      if (c) { found = c; break }
    }

    setDragIid(iid)
    setDragFrom(zone)
    setDragCard(found)
    setDragPos({ x: e.clientX, y: e.clientY })
  }, [players])

  const handleHandCardMD = useCallback((e: React.MouseEvent, iid: string) => {
    handleCardMD(e, iid, 'hand')
  }, [handleCardMD])

  // Keep a ref to hoverCard for the wheel handler (avoids stale closure)
  const hoverCardRef = useRef(hoverCard)
  hoverCardRef.current = hoverCard

  // Global mouse move — update ghost position + hover position
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (dragIid) setDragPos({ x: e.clientX, y: e.clientY })
      setHoverPos({ x: e.clientX, y: e.clientY })
    }
    // When hovering a card, capture wheel to scale preview instead of zooming the board
    const onWheel = (e: WheelEvent) => {
      if (hoverCardRef.current && !dragIid) {
        e.preventDefault()
        e.stopPropagation()
        setPreviewScale(s => Math.max(0.5, Math.min(3, s + (e.deltaY > 0 ? -0.15 : 0.15))))
      }
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('wheel', onWheel, { passive: false, capture: true })
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('wheel', onWheel, true)
    }
  }, [dragIid])

  // Global mouse up — commit drop
  useEffect(() => {
    const onUp = (e: MouseEvent) => {
      if (!dragIid) return

      // Find which viewport the cursor is over
      for (const [pidStr, vpEl] of Object.entries(viewportRefs.current)) {
        if (!vpEl) continue
        const rect = vpEl.getBoundingClientRect()
        if (e.clientX >= rect.left && e.clientX <= rect.right &&
            e.clientY >= rect.top && e.clientY <= rect.bottom) {
          const pid = parseInt(pidStr)
          const { x, y } = screenToCanvasPct(e.clientX, e.clientY, pid)
          // Offset so the card center lands at the cursor, not the top-left corner
          // Card is 126×176 on a 1600×900 canvas → ~3.9% and ~9.8%
          const cx = Math.max(0, Math.min(95, x - (63 / 1600) * 100))
          const cy = Math.max(0, Math.min(90, y - (88 / 900) * 100))
          GameActions.moveCard(dragIid, 'battlefield', cx, cy)
          break
        }
      }

      setDragIid(null)
      setDragFrom('')
      setDragCard(null)
    }

    window.addEventListener('mouseup', onUp)
    return () => window.removeEventListener('mouseup', onUp)
  }, [dragIid, screenToCanvasPct])

  // ── Context menu ───────────────────────────────────────────────────────────
  const handleCardRC = useCallback((e: React.MouseEvent, iid: string, zone: string) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, iid, zone: zone as ZoneType })
  }, [])

  const handleContextAction = (action: string) => {
    if (!contextMenu) return
    const { iid } = contextMenu

    // Find the card to check its state (e.g. tapped)
    let card: CardInstance | null = null
    for (const p of players) {
      const all = [...p.battlefield, ...p.hand, ...p.graveyard, ...p.exile, ...p.command, ...p.library]
      const c = all.find(c => c.iid === iid)
      if (c) { card = c; break }
    }

    switch (action) {
      // 'tap' toggles: if tapped → untap, else → tap
      case 'tap':
        if (card?.tapped) GameActions.untapCard(iid)
        else GameActions.tapCard(iid)
        break
      case 'untap':     GameActions.untapCard(iid); break
      case 'flip':      GameActions.flipCard(iid); break
      case 'fd':        GameActions.flipCard(iid); break
      case 'toHand':    GameActions.moveCard(iid, 'hand'); break
      case 'toBF':
      case 'toBattlefield': GameActions.moveCard(iid, 'battlefield', 50, 50); break
      case 'toGrave':
      case 'toGraveyard':   GameActions.moveCard(iid, 'graveyard'); break
      case 'toExile':       GameActions.moveCard(iid, 'exile'); break
      case 'toCommand':     GameActions.moveCard(iid, 'commandZone'); break
      case 'toLib':
      case 'toLibTop':      GameActions.moveCard(iid, 'library', undefined, undefined, 0); break
      case 'toLibBottom':   GameActions.moveCard(iid, 'library'); break
      case 'ctr':           GameActions.addCounter(iid, 1); break
      case 'addCounter':    GameActions.addCounter(iid, 1); break
      case 'removeCounter': GameActions.addCounter(iid, -1); break
      case 'dup':
        // Duplicate: move a copy to battlefield (re-use same card for now)
        GameActions.moveCard(iid, 'battlefield', 50, 50)
        break
    }
    setContextMenu(null)
  }

  // ── Layout ─────────────────────────────────────────────────────────────────
  const getPlayerLayout = () => {
    if (players.length <= 2) {
      const opponent = players.find((_, i) => i !== localPid)
      const local = players[localPid]
      return { top: opponent ? [opponent] : [], bottom: local ? [local] : [] }
    }
    const top = players.filter((_, i) => i !== localPid)
    const bottom = players[localPid] ? [players[localPid]] : []
    return { top, bottom }
  }
  const layout = getPlayerLayout()

  // ── PlayerMat props builder ────────────────────────────────────────────────
  const makePlayerMatProps = (player: Player, idx: number) => ({
    player,
    isActive: gameState.turn === idx,
    isMain: idx === localPid,
    isLocal: idx === localPid,
    zoom: getZoom(idx),
    pan: pan[idx] ?? { x: 0, y: 0 },
    onPan: (newPan: { x: number; y: number }) => setPlayerPan(idx, newPan),
    onResetView: () => {
      const vpEl = viewportRefs.current[idx]
      if (vpEl) {
        const rect = vpEl.getBoundingClientRect()
        const fitZoom = Math.max(rect.width / 1600, rect.height / 900)
        const canvasW = 1600 * fitZoom
        const canvasH = 900 * fitZoom
        setPlayerZoom(idx, fitZoom)
        setPlayerPan(idx, { x: (rect.width - canvasW) / 2, y: (rect.height - canvasH) / 2 })
      } else {
        setPlayerZoom(idx, 1)
        setPlayerPan(idx, { x: 0, y: 0 })
      }
    },
    cardScale: 1,
    onLife: (delta: number) => { if (idx === localPid) GameActions.changeLife(delta) },
    onCardMD: (e: React.MouseEvent, iid: string) => handleCardMD(e, iid, 'battlefield'),
    onCardRC: handleCardRC,
    onHover: (card: CardInstance) => { if (!dragIid) setHoverCard(card) },
    onHL: () => { setHoverCard(null) },
    onZone: (zone: string) => {
      const zoneName = zone === 'library' ? 'Library' : zone === 'graveyard' ? 'Graveyard' : zone === 'exile' ? 'Exile' : zone === 'command' ? 'Command Zone' : zone
      notify(`Opened ${player.name}'s ${zoneName}`, 'info')
      setZoneViewer({ pid: idx, zone: zone as ZoneType })
    },
    onHandCardMD: handleHandCardMD,
    isHandDragOver: dragIid !== null && dragFrom !== 'hand',
    // Pass the viewport ref — coordinate math uses pan/zoom directly, not getBCR of canvas
    matRef: (el: HTMLDivElement | null) => { viewportRefs.current[idx] = el },
    outerScrollRef: { current: null },
    onZoomWithScroll: (newZoom: number, mx: number, my: number) => {
      const clamped = Math.max(0.25, Math.min(3, newZoom))
      const oldZoom = getZoom(idx)
      const currentPan = pan[idx] ?? { x: 0, y: 0 }
      // Adjust pan so the canvas point under the cursor stays fixed
      const newPanX = mx - (mx - currentPan.x) / oldZoom * clamped
      const newPanY = my - (my - currentPan.y) / oldZoom * clamped
      setPlayerZoom(idx, clamped)
      setPlayerPan(idx, { x: newPanX, y: newPanY })
    },
  })

  // ── Loading gate ───────────────────────────────────────────────────────────
  if (!cardsLoaded) {
    return <LoadingScreen done={loadProgress.done} total={loadProgress.total} current={loadProgress.current} />
  }

  return (
    <div
      className="h-screen w-screen flex flex-col bg-background overflow-hidden relative select-none"
      onClick={() => { if (contextMenu) setContextMenu(null) }}
    >
      {/* Player mats */}
      <div className="flex-1 flex flex-col gap-1 p-1 overflow-hidden min-h-0">
        {layout.top.length > 0 ? (
          <div className="flex gap-1" style={{ flex: 1, minHeight: 0 }}>
            {layout.top.map((player) => {
              const props = makePlayerMatProps(player, player.pid)
              // Top players: bind viewport ref to the outer div via matRef
              return <PlayerMat key={player.pid} {...props} />
            })}
          </div>
        ) : null}
        {layout.bottom.map((player) => (
          <div key={player.pid} className="flex flex-1 min-h-0">
            <PlayerMat {...makePlayerMatProps(player, player.pid)} />
          </div>
        ))}
      </div>

      {/* Center action bar */}
      <CenterDivider
        players={players}
        turn={gameState.turn}
        round={gameState.round}
        localPid={localPid}
        hasDrawnInitial={players[localPid]?.hand.length > 0}
        zoom={getZoom(localPid)}
        logOpen={logOpen}
        onPassTurn={() => GameActions.passTurn()}
        onSettings={() => setSettingsOpen(true)}
        onLog={() => setLogOpen(o => !o)}
        onDice={() => setDiceOpen(true)}
        onCoin={() => {
          const result = Math.random() < 0.5 ? 'Heads' : 'Tails'
          notify(`🪙 Coin flip: ${result}`, result === 'Heads' ? 'success' : 'info')
        }}
        onCmdDmg={() => {}}
        onLife={(_pid, delta) => GameActions.changeLife(delta)}
        onDraw={(_pid) => GameActions.drawCards(1)}
        onDraw7={(_pid) => GameActions.drawCards(7)}
        onUntapAll={(_pid) => GameActions.untapAll()}
      />

      {/* Context Menu */}
      {contextMenu ? (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          card={(() => {
            for (const player of players) {
              const all = [...player.battlefield, ...player.hand, ...player.graveyard, ...player.exile, ...player.command]
              const c = all.find(c => c.iid === contextMenu.iid)
              if (c) return c
            }
            return null
          })()}
          zone={contextMenu.zone}
          pal={PALETTES[localPid % PALETTES.length]}
          onAction={handleContextAction}
        />
      ) : null}

      {/* Zone Viewer */}
      {zoneViewer && players[zoneViewer.pid] ? (
        <ZoneViewer
          player={players[zoneViewer.pid]}
          zone={zoneViewer.zone}
          onClose={() => {
            notify(`Closed ${zoneViewer.zone}`, 'default')
            setZoneViewer(null)
          }}
          onMove={(iid, toZone) => {
            // Find card name for the toast
            const p = players[zoneViewer.pid]
            const allCards = [...p.battlefield, ...p.hand, ...p.graveyard, ...p.exile, ...p.command, ...p.library]
            const card = allCards.find(c => c.iid === iid)
            const cardName = card?.faceDown ? 'a face-down card' : (card?.name ?? 'a card')
            const zoneName = toZone === 'battlefield' ? 'Battlefield' : toZone === 'hand' ? 'Hand' : toZone === 'graveyard' ? 'Graveyard' : toZone === 'exile' ? 'Exile' : toZone
            notify(`${cardName} → ${zoneName}`, toZone === 'graveyard' ? 'error' : toZone === 'exile' ? 'warning' : 'success')
            GameActions.moveCard(iid, toZone, 0, 0)
          }}
          onReveal={(card) => {
            notify(`Revealed: ${card.name}`, 'warning')
          }}
          onRC={(_e, _card) => {}}
          onScry={(n) => {
            notify(`Scrying ${n} card${n > 1 ? 's' : ''}...`, 'info')
          }}
          onMill={(n) => {
            notify(`Milled ${n} card${n > 1 ? 's' : ''}`, 'error')
            GameActions.millCards(n)
          }}
          onHover={setHoverCard}
          onHL={() => setHoverCard(null)}
        />
      ) : null}

      {/* Action log — merged server log + local client actions */}
      <ActionLogPopdown
        entries={[...gameState.log, ...localLog]}
        open={logOpen}
        onClose={() => setLogOpen(false)}
      />

      {/* Dice modal */}
      {diceOpen ? (
        <DiceModal
          mode="dice"
          onRoll={(sides) => {
            const result = Math.floor(Math.random() * sides) + 1
            notify(`🎲 d${sides} → ${result}${result === sides ? ' MAX!' : result === 1 ? ' NAT 1!' : ''}`, result === 1 ? 'error' : result === sides ? 'success' : 'default')
            return result
          }}
          onFlip={() => {
            const result = Math.random() < 0.5 ? 'Heads' : 'Tails'
            notify(`🪙 Coin flip: ${result}`, result === 'Heads' ? 'success' : 'info')
            return result
          }}
          onLog={() => {}}
          onClose={() => setDiceOpen(false)}
        />
      ) : null}

      {/* Settings modal — simplified: Back to Menu, Glass Opacity, UI Scale */}
      {settingsOpen ? (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-md z-[9800] flex items-center justify-center"
          onClick={() => setSettingsOpen(false)}
        >
          <div
            className="liquid-glass-strong rounded-2xl p-6 w-[340px]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-lg text-primary">Settings</h3>
              <button
                onClick={() => setSettingsOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >✕</button>
            </div>

            <div className="mb-5">
              <label className="text-xs text-muted-foreground">
                UI Scale: <strong className="text-foreground">{Math.round(uiSettings.uiScale * 100)}%</strong>
              </label>
              <input
                type="range"
                min={70} max={150} step={5}
                value={uiSettings.uiScale * 100}
                onChange={(e) => setUiSettings(s => ({ ...s, uiScale: Number(e.target.value) / 100 }))}
                className="w-full mt-2 accent-primary"
              />
            </div>

            <div className="mb-6">
              <label className="text-xs text-muted-foreground">
                Glass Opacity: <strong className="text-foreground">{Math.round(uiSettings.glassOpacity * 100)}%</strong>
              </label>
              <input
                type="range"
                min={30} max={100} step={5}
                value={uiSettings.glassOpacity * 100}
                onChange={(e) => setUiSettings(s => ({ ...s, glassOpacity: Number(e.target.value) / 100 }))}
                className="w-full mt-2 accent-primary"
              />
            </div>

            <button
              onClick={() => { window.location.href = '/' }}
              className="w-full py-2.5 rounded-xl text-sm font-bold text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-colors"
            >
              Back to Menu
            </button>
          </div>
        </div>
      ) : null}

      {/* Card hover preview — follows mouse, scroll to scale */}
      {hoverCard && !dragIid && !hoverCard.faceDown ? (() => {
        const card = hoverCard
        const showBack = card.showBack && card.imgBack
        const img = showBack ? (card.imgBack ?? null) : card.img
        const name = showBack ? (card.backName || card.name) : card.name
        const type = showBack ? (card.backType || card.typeLine) : card.typeLine
        const pw = showBack ? card.backPower : card.power
        const tg = showBack ? card.backTough : card.tough
        const counters = Object.entries(card.counters || {}).filter(([, v]) => v > 0)
        // Position: offset from cursor, stay on screen
        const pw2 = Math.round(200 * previewScale)
        const ph = Math.round(280 * previewScale)
        const vw = typeof window !== 'undefined' ? window.innerWidth : 1400
        const vh = typeof window !== 'undefined' ? window.innerHeight : 900
        const flipX = hoverPos.x + pw2 + 30 > vw
        const flipY = hoverPos.y + ph + 80 > vh
        const px = flipX ? hoverPos.x - pw2 - 16 : hoverPos.x + 20
        const py = flipY ? Math.max(8, hoverPos.y - ph - 16) : hoverPos.y + 12
        return (
          <div
            className="fixed z-[8000] pointer-events-none flex flex-col gap-2"
            style={{ left: px, top: py, width: pw2 }}
          >
            <div
              className="rounded-lg overflow-hidden border border-border/50 shadow-2xl shadow-black/60"
              style={{ width: pw2, height: ph }}
            >
              <CardImage src={img} alt={name} fallbackText={name} />
            </div>
            <div className="liquid-glass rounded-lg p-3 border border-border/30" style={{ width: pw2 }}>
              <h3 className="font-bold text-foreground text-sm mb-1 leading-tight">{name}</h3>
              <p className="text-xs text-muted-foreground mb-2">{type}</p>
              {card.manaCost && (
                <div className="flex items-center gap-2 mb-2">
                  <ManaSymbols cost={card.manaCost} size={14} />
                  <span className="text-xs text-muted-foreground">CMC {card.cmc}</span>
                </div>
              )}
              {card.oracle && (
                <p className="text-xs text-muted-foreground leading-relaxed border-t border-border/30 pt-2 whitespace-pre-wrap">
                  {card.oracle}
                </p>
              )}
              <div className="flex items-center gap-3 mt-2 pt-2 border-t border-border/30">
                {pw != null && (
                  <span className="text-sm font-bold text-amber-400">{pw}/{tg}</span>
                )}
                {card.loyalty != null && (
                  <span className="text-sm font-bold text-blue-400 flex items-center gap-1">
                    <span className="text-xs">L</span>{card.loyalty}
                  </span>
                )}
                <span className="text-xs ml-auto font-medium" style={{ color: getRarityColor(card.rarity) }}>
                  {card.set}
                </span>
              </div>
              {counters.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-border/30">
                  {counters.map(([ctype, val]) => (
                    <span key={ctype} className="text-xs px-2 py-0.5 rounded bg-secondary font-medium text-emerald-400">
                      {ctype}: {val}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      })() : null}

      {/* Drag ghost — semi-transparent card following the cursor */}
      {dragIid && dragCard ? (
        <div
          className="fixed pointer-events-none z-[9999]"
          style={{
            left: dragPos.x - 45,
            top: dragPos.y - 63,
            width: 90,
            height: 126,
            opacity: 0.8,
            transform: 'rotate(-2deg)',
            willChange: 'left, top',
          }}
        >
          <div className="w-full h-full rounded-md overflow-hidden ring-2 ring-primary shadow-[0_8px_32px_rgba(0,0,0,0.6)]">
            {dragCard.faceDown ? (
              <div className="w-full h-full bg-gradient-to-br from-indigo-900 to-violet-950 flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-2 border-white/20" />
              </div>
            ) : dragCard.img ? (
              <img
                src={dragCard.img}
                alt={dragCard.name}
                draggable={false}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-secondary flex items-center justify-center">
                <span className="text-xs font-semibold text-muted-foreground text-center p-2">{dragCard.name}</span>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}

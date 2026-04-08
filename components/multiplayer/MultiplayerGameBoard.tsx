'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { PlayerMat } from '@/components/game/player-mat'
import { CenterDivider } from '@/components/game/center-divider'
import { ContextMenu } from '@/components/game/context-menu'
import { ZoneViewer } from '@/components/game/zone-viewer'
import { ActionLogPopdown } from '@/components/game/action-log-popdown'
import { LoadingScreen } from '@/components/game/loading-screen'
import { CardZoom } from '@/components/game/card-zoom'
import { DiceModal } from '@/components/game/modals'
import { PALETTES, type CardInstance, type Player, type ZoneType } from '@/lib/game-types'
import { lookupCard, fetchScryfall } from '@/lib/game-data'
import { GameActions } from '@/lib/socket-client'
import type { MPGameState, CardState as MPCardState, PlayerState as MPPlayerState } from '@/lib/game-types'
import { useToast } from '@/components/game/toast-system'

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

  // ── UI State ───────────────────────────────────────────────────────────────
  const [zoom, setZoom] = useState<Record<number, number>>({})
  const [pan, setPan] = useState<Record<number, { x: number; y: number }>>({})
  const [hoverCard, setHoverCard] = useState<CardInstance | null>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; iid: string; zone: ZoneType } | null>(null)
  const [zoneViewer, setZoneViewer] = useState<{ pid: number; zone: ZoneType } | null>(null)
  const [logOpen, setLogOpen] = useState(false)
  const [diceOpen, setDiceOpen] = useState(false)

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

  const getZoom = (pid: number) => zoom[pid] ?? 1
  const setPlayerZoom = (pid: number, z: number) => setZoom(prev => ({ ...prev, [pid]: z }))
  const setPlayerPan = (pid: number, p: { x: number; y: number }) => setPan(prev => ({ ...prev, [pid]: p }))

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

  // Global mouse move — update ghost position
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (dragIid) setDragPos({ x: e.clientX, y: e.clientY })
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
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
          GameActions.moveCard(dragIid, 'battlefield', x, y)
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
    switch (action) {
      case 'tap':       GameActions.tapCard(iid); break
      case 'untap':     GameActions.untapCard(iid); break
      case 'flip':      GameActions.flipCard(iid); break
      case 'toHand':    GameActions.moveCard(iid, 'hand'); break
      case 'toBattlefield': GameActions.moveCard(iid, 'battlefield', 50, 50); break
      case 'toGraveyard':   GameActions.moveCard(iid, 'graveyard'); break
      case 'toExile':       GameActions.moveCard(iid, 'exile'); break
      case 'toCommand':     GameActions.moveCard(iid, 'commandZone'); break
      case 'toLibTop':      GameActions.moveCard(iid, 'library', undefined, undefined, 0); break
      case 'toLibBottom':   GameActions.moveCard(iid, 'library'); break
      case 'addCounter':    GameActions.addCounter(iid, 1); break
      case 'removeCounter': GameActions.addCounter(iid, -1); break
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
    onResetView: () => { setPlayerZoom(idx, 1); setPlayerPan(idx, { x: 0, y: 0 }) },
    cardScale: 1,
    onLife: (delta: number) => { if (idx === localPid) GameActions.changeLife(delta) },
    onCardMD: (e: React.MouseEvent, iid: string) => handleCardMD(e, iid, 'battlefield'),
    onCardRC: handleCardRC,
    onHover: (card: CardInstance) => { if (!dragIid) setHoverCard(card) },
    onHL: () => setHoverCard(null),
    onZone: (zone: string) => setZoneViewer({ pid: idx, zone: zone as ZoneType }),
    onHandCardMD: handleHandCardMD,
    isHandDragOver: dragIid !== null && dragFrom !== 'hand',
    // Pass the viewport ref — coordinate math uses pan/zoom directly, not getBCR of canvas
    matRef: (el: HTMLDivElement | null) => { viewportRefs.current[idx] = el },
    outerScrollRef: { current: null },
    onZoomWithScroll: (newZoom: number) => setPlayerZoom(idx, Math.max(0.25, Math.min(3, newZoom))),
  })

  // ── Loading gate ───────────────────────────────────────────────────────────
  if (!cardsLoaded) {
    return <LoadingScreen done={loadProgress.done} total={loadProgress.total} current={loadProgress.current} />
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-background overflow-hidden relative select-none">
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
        onSettings={() => {}}
        onLog={() => setLogOpen(o => !o)}
        onDice={() => setDiceOpen(true)}
        onCoin={() => {
          const result = Math.random() < 0.5 ? 'Heads' : 'Tails'
          toast(`🪙 Coin flip: ${result}`, result === 'Heads' ? 'success' : 'info')
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
          onClose={() => setZoneViewer(null)}
          onMove={(iid, toZone) => GameActions.moveCard(iid, toZone, 0, 0)}
          onRC={(_e, _card) => {}}
          onScry={() => {}}
          onMill={() => {}}
          onHover={setHoverCard}
          onHL={() => setHoverCard(null)}
        />
      ) : null}

      {/* Action log */}
      <ActionLogPopdown
        entries={gameState.log}
        open={logOpen}
        onClose={() => setLogOpen(false)}
      />

      {/* Dice modal */}
      {diceOpen ? (
        <DiceModal
          mode="dice"
          onRoll={(sides) => {
            const result = Math.floor(Math.random() * sides) + 1
            toast(`🎲 d${sides} → ${result}${result === sides ? ' MAX!' : result === 1 ? ' NAT 1!' : ''}`, result === 1 ? 'error' : result === sides ? 'success' : 'default')
            return result
          }}
          onFlip={() => {
            const result = Math.random() < 0.5 ? 'Heads' : 'Tails'
            toast(`🪙 Coin flip: ${result}`, result === 'Heads' ? 'success' : 'info')
            return result
          }}
          onLog={() => {}}
          onClose={() => setDiceOpen(false)}
        />
      ) : null}

      {/* Card hover preview — full CardZoom with image */}
      {hoverCard && !dragIid ? (
        <CardZoom card={hoverCard} />
      ) : null}

      {/* Drag ghost — semi-transparent card following the cursor */}
      {dragIid && dragCard ? (
        <div
          className="fixed pointer-events-none z-[9999]"
          style={{
            left: dragPos.x - 63,
            top: dragPos.y - 88,
            width: 126,
            height: 176,
            opacity: 0.75,
            transform: 'rotate(-3deg) scale(1.05)',
            transition: 'none',
          }}
        >
          <div className="w-full h-full rounded-md overflow-hidden ring-2 ring-primary shadow-[0_8px_32px_rgba(0,0,0,0.6)]">
            {dragCard.img ? (
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

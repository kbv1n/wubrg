'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { PlayerMat } from '@/components/game/player-mat'
import { CenterDivider } from '@/components/game/center-divider'
import { ContextMenu } from '@/components/game/context-menu'
import { ZoneViewer } from '@/components/game/zone-viewer'
import { ActionLogPopdown } from '@/components/game/action-log-popdown'
import { LoadingScreen } from '@/components/game/loading-screen'
import { PALETTES, type CardInstance, type Player, type ZoneType } from '@/lib/game-types'
import { lookupCard, fetchScryfall } from '@/lib/game-data'
import { GameActions } from '@/lib/socket-client'
import type { MPGameState, CardState as MPCardState, PlayerState as MPPlayerState } from '@/lib/game-types'
import { cn } from '@/lib/utils'

interface MultiplayerGameBoardProps {
  gameState: MPGameState
  localPlayerId: string
}

// Convert multiplayer CardState to full CardInstance with looked-up data
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

// Convert multiplayer PlayerState to game Player format
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
  // ── Scryfall card-data loading ─────────────────────────────────────────────
  // Fetch card art / text for every cardId in all players' zones before
  // rendering the board.  Runs once on mount; failures are soft (game still shows).
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
      .catch(() => {/* soft fail */})
      .finally(() => setCardsLoaded(true))
  }, [])

  // UI State
  const [uiSettings] = useState({
    cardScale: 1,
    defaultZoom: 1,
  })

  const [zoom, setZoom] = useState<Record<number, number>>({})
  const [pan, setPan] = useState<Record<number, { x: number; y: number }>>({})
  const [hoverCard, setHoverCard] = useState<CardInstance | null>(null)
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 })
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; iid: string; zone: ZoneType } | null>(null)
  const [zoneViewer, setZoneViewer] = useState<{ pid: number; zone: ZoneType } | null>(null)
  const [dragIid, setDragIid] = useState<string | null>(null)
  const [dragFrom, setDragFrom] = useState<string>('')
  const [logOpen, setLogOpen] = useState(false)

  // Track mat refs for drop calculations
  const matRefs = useRef<Record<number, HTMLDivElement | null>>({})

  // Convert multiplayer players to game format
  const playersArray = Array.from(gameState.players.values())
  const players: Player[] = playersArray.map((mp, idx) => mpPlayerToPlayer(mp, idx))

  // Find local player index
  const localPlayerIdx = playersArray.findIndex(p => p.odId === localPlayerId)
  const localPid = localPlayerIdx >= 0 ? localPlayerIdx : 0

  // Get zoom for player
  const getZoom = (pid: number) => zoom[pid] ?? uiSettings.defaultZoom
  const setPlayerZoom = (pid: number, z: number) => setZoom(prev => ({ ...prev, [pid]: z }))
  const setPlayerPan = (pid: number, p: { x: number; y: number }) => setPan(prev => ({ ...prev, [pid]: p }))

  // Handle card drop on battlefield
  // Cards are positioned as PERCENTAGES (0–100) of the battlefield div.
  // getBoundingClientRect() on the transformed inner div already reflects
  // zoom/pan, so dividing by rect.width/height gives the correct percentage.
  const handleCardDrop = useCallback((e: MouseEvent, pid: number) => {
    if (!dragIid) return

    const matEl = matRefs.current[pid]
    if (!matEl) return

    const rect = matEl.getBoundingClientRect()
    const x = Math.max(0, Math.min(95, ((e.clientX - rect.left) / rect.width) * 100))
    const y = Math.max(0, Math.min(90, ((e.clientY - rect.top) / rect.height) * 100))

    GameActions.moveCard(dragIid, 'battlefield', x, y)
    setDragIid(null)
    setDragFrom('')
  }, [dragIid])

  // Handle card mouse down (start drag)
  const handleCardMD = useCallback((e: React.MouseEvent, iid: string, zone: string = 'battlefield') => {
    if (e.button !== 0) return
    setDragIid(iid)
    setDragFrom(zone)
    console.log('[v0] Starting drag:', iid, 'from:', zone)
  }, [])

  // Handle card right click (context menu)
  const handleCardRC = useCallback((e: React.MouseEvent, iid: string, zone: string) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, iid, zone: zone as ZoneType })
  }, [])

  // Handle hand card mouse down
  const handleHandCardMD = useCallback((e: React.MouseEvent, iid: string) => {
    if (e.button !== 0) return
    setDragIid(iid)
    setDragFrom('hand')
    console.log('[v0] Starting drag from hand:', iid)
  }, [])

  // Track mouse position for hover card preview
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (hoverCard) setHoverPos({ x: e.clientX, y: e.clientY })
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [hoverCard])

  // Setup global mouse up handler for drops
  useEffect(() => {
    const handleMouseUp = (e: MouseEvent) => {
      if (!dragIid) return

      // Find which mat we're over
      for (const [pidStr, matEl] of Object.entries(matRefs.current)) {
        if (!matEl) continue
        const rect = matEl.getBoundingClientRect()
        if (e.clientX >= rect.left && e.clientX <= rect.right &&
            e.clientY >= rect.top && e.clientY <= rect.bottom) {
          handleCardDrop(e, parseInt(pidStr))
          return
        }
      }

      // Dropped outside - reset
      setDragIid(null)
      setDragFrom('')
    }

    window.addEventListener('mouseup', handleMouseUp)
    return () => window.removeEventListener('mouseup', handleMouseUp)
  }, [dragIid, handleCardDrop])

  // Context menu actions
  const handleContextAction = (action: string) => {
    if (!contextMenu) return
    const { iid, zone } = contextMenu
    
    console.log('[v0] Context action:', action, 'on card:', iid)
    
    switch (action) {
      case 'tap':
        GameActions.tapCard(iid)
        break
      case 'untap':
        GameActions.untapCard(iid)
        break
      case 'flip':
        GameActions.flipCard(iid)
        break
      case 'toHand':
        GameActions.moveCard(iid, 'hand')
        break
      case 'toBattlefield':
        GameActions.moveCard(iid, 'battlefield', 100, 100)
        break
      case 'toGraveyard':
        GameActions.moveCard(iid, 'graveyard')
        break
      case 'toExile':
        GameActions.moveCard(iid, 'exile')
        break
      case 'toCommand':
        GameActions.moveCard(iid, 'commandZone')
        break
      case 'toLibTop':
        GameActions.moveCard(iid, 'library', undefined, undefined, 0)
        break
      case 'toLibBottom':
        GameActions.moveCard(iid, 'library')
        break
      case 'addCounter':
        GameActions.addCounter(iid, 1)
        break
      case 'removeCounter':
        GameActions.addCounter(iid, -1)
        break
    }
    
    setContextMenu(null)
  }

  // Build props for PlayerMat
  const makePlayerMatProps = (player: Player, idx: number) => ({
    player,
    isActive: gameState.turn === idx,
    isMain: idx === localPid,
    isLocal: idx === localPid,
    zoom: getZoom(idx),
    pan: pan[idx] ?? { x: 0, y: 0 },
    onPan: (newPan: { x: number; y: number }) => setPlayerPan(idx, newPan),
    onResetView: () => { setPlayerZoom(idx, 1); setPlayerPan(idx, { x: 0, y: 0 }) },
    cardScale: uiSettings.cardScale,
    onLife: (delta: number) => {
      if (idx === localPid) {
        GameActions.changeLife(delta)
      }
    },
    onCardMD: (e: React.MouseEvent, iid: string) => handleCardMD(e, iid, 'battlefield'),
    onCardRC: handleCardRC,
    onHover: (card: CardInstance) => setHoverCard(card),
    onHL: () => setHoverCard(null),
    onZone: (zone: string) => setZoneViewer({ pid: idx, zone: zone as ZoneType }),
    onHandCardMD: handleHandCardMD,
    isHandDragOver: dragIid !== null && dragFrom !== 'hand',
    matRef: (el: HTMLDivElement | null) => { matRefs.current[idx] = el },
    outerScrollRef: { current: null },
    onZoomWithScroll: (newZoom: number, mx: number, my: number) => {
      setPlayerZoom(idx, Math.max(0.25, Math.min(3, newZoom)))
    },
  })

  // Arrange players for display (main player at bottom)
  const getPlayerLayout = () => {
    if (players.length <= 2) {
      // 2 players: opponent top, local bottom
      const opponent = players.find((_, i) => i !== localPid)
      const local = players[localPid]
      return { top: opponent ? [opponent] : [], bottom: local ? [local] : [] }
    }
    // 3-4 players: others on top row, local on bottom
    const top = players.filter((_, i) => i !== localPid)
    const bottom = players[localPid] ? [players[localPid]] : []
    return { top, bottom }
  }

  const layout = getPlayerLayout()

  // Show loading screen while Scryfall data is being fetched
  if (!cardsLoaded) {
    return <LoadingScreen done={loadProgress.done} total={loadProgress.total} current={loadProgress.current} />
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-background overflow-hidden relative select-none">
      {/* All player mats — CenterDivider is absolute so stays out of flow */}
      <div className="flex-1 flex flex-col gap-1 p-1 overflow-hidden min-h-0">
        {/* Top players (opponents) */}
        {layout.top.length > 0 && (
          <div
            className="flex gap-1"
            style={{ flex: 1, minHeight: 0 }}
          >
            {layout.top.map((player) => (
              <PlayerMat key={player.pid} {...makePlayerMatProps(player, player.pid)} />
            ))}
          </div>
        )}

        {/* Bottom player (local) */}
        {layout.bottom.map((player) => (
          <div key={player.pid} className="flex flex-1 min-h-0">
            <PlayerMat {...makePlayerMatProps(player, player.pid)} />
          </div>
        ))}
      </div>

      {/* Center action bar — absolutely positioned overlay, same as singleplayer */}
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
        onDice={() => {}}
        onCoin={() => {}}
        onCmdDmg={(_pid) => {}}
        onLife={(_pid, delta) => GameActions.changeLife(delta)}
        onDraw={(_pid) => GameActions.drawCards(1)}
        onDraw7={(_pid) => GameActions.drawCards(7)}
        onUntapAll={(_pid) => GameActions.untapAll()}
      />

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          card={(() => {
            const player = players.find(p => 
              p.battlefield.some(c => c.iid === contextMenu.iid) ||
              p.hand.some(c => c.iid === contextMenu.iid) ||
              p.graveyard.some(c => c.iid === contextMenu.iid)
            )
            if (!player) return null
            return [...player.battlefield, ...player.hand, ...player.graveyard].find(c => c.iid === contextMenu.iid) ?? null
          })()}
          zone={contextMenu.zone}
          pal={PALETTES[localPid % PALETTES.length]}
          onAction={(action) => { handleContextAction(action); setContextMenu(null) }}
        />
      )}

      {/* Zone Viewer */}
      {zoneViewer && players[zoneViewer.pid] && (
        <ZoneViewer
          player={players[zoneViewer.pid]}
          zone={zoneViewer.zone}
          onClose={() => setZoneViewer(null)}
          onMove={(iid, toZone) => {
            console.log('[v0] ZoneViewer move:', iid, 'to', toZone)
            GameActions.moveCard(iid, toZone, 0, 0)
          }}
          onRC={(_e, _card) => {}}
          onScry={(_n) => {}}
          onMill={(_n) => {}}
          onHover={setHoverCard}
          onHL={() => setHoverCard(null)}
        />
      )}

      {/* Action log popdown — same component as singleplayer */}
      <ActionLogPopdown
        entries={gameState.log}
        open={logOpen}
        onClose={() => setLogOpen(false)}
      />

      {/* Cursor-following card hover preview */}
      {hoverCard && (
        <div
          className="fixed z-[9998] pointer-events-none"
          style={{
            left: Math.min(hoverPos.x + 20, (typeof window !== 'undefined' ? window.innerWidth : 1200) - 280),
            top: Math.max(20, Math.min(hoverPos.y - 100, (typeof window !== 'undefined' ? window.innerHeight : 800) - 200)),
          }}
        >
          <div className="liquid-glass-readable px-3 py-2.5 rounded-xl max-w-[220px]">
            <p className="text-sm font-semibold text-foreground">{hoverCard.name}</p>
            {hoverCard.manaCost && (
              <p className="text-xs text-muted-foreground mt-0.5">{hoverCard.manaCost}</p>
            )}
            {hoverCard.typeLine && (
              <p className="text-xs text-muted-foreground/80 mt-0.5">{hoverCard.typeLine}</p>
            )}
            {hoverCard.oracle && (
              <p className="text-xs text-foreground/80 leading-relaxed mt-1">{hoverCard.oracle}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

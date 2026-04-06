'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { PlayerMat } from '@/components/game/player-mat'
import { CenterDivider } from '@/components/game/center-divider'
import { ContextMenu } from '@/components/game/context-menu'
import { ZoneViewer } from '@/components/game/zone-viewer'
import { PALETTES, type CardInstance, type Player } from '@/lib/game-types'
import { lookupCard } from '@/lib/game-data'
import { GameActions } from '@/lib/colyseus-client'
import type { GameState, CardState as MPCardState, PlayerState as MPPlayerState } from '@/lib/multiplayer-types'
import { cn } from '@/lib/utils'

interface MultiplayerGameBoardProps {
  gameState: GameState
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
  // UI State
  const [uiSettings] = useState({
    cardScale: 1,
    defaultZoom: 1,
  })

  const [zoom, setZoom] = useState<Record<number, number>>({})
  const [pan, setPan] = useState<Record<number, { x: number; y: number }>>({})
  const [hoverCard, setHoverCard] = useState<CardInstance | null>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; iid: string; zone: string } | null>(null)
  const [zoneViewer, setZoneViewer] = useState<{ pid: number; zone: string } | null>(null)
  const [dragIid, setDragIid] = useState<string | null>(null)
  const [dragFrom, setDragFrom] = useState<string>('')

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
  const handleCardDrop = useCallback((e: MouseEvent, pid: number) => {
    if (!dragIid) return

    const matEl = matRefs.current[pid]
    if (!matEl) return

    const rect = matEl.getBoundingClientRect()
    const currentZoom = getZoom(pid)
    const currentPan = pan[pid] ?? { x: 0, y: 0 }

    // Calculate position relative to mat, accounting for zoom and pan
    const x = (e.clientX - rect.left - currentPan.x) / currentZoom
    const y = (e.clientY - rect.top - currentPan.y) / currentZoom

    console.log('[v0] Moving card to battlefield:', dragIid, 'x:', x, 'y:', y)
    GameActions.moveCard(dragIid, 'battlefield', x, y)
    setDragIid(null)
    setDragFrom('')
  }, [dragIid, pan, getZoom])

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
    setContextMenu({ x: e.clientX, y: e.clientY, iid, zone })
  }, [])

  // Handle hand card mouse down
  const handleHandCardMD = useCallback((e: React.MouseEvent, iid: string) => {
    if (e.button !== 0) return
    setDragIid(iid)
    setDragFrom('hand')
    console.log('[v0] Starting drag from hand:', iid)
  }, [])

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
    onZone: (zone: string) => setZoneViewer({ pid: idx, zone }),
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

  return (
    <div className="h-screen w-screen flex flex-col bg-background overflow-hidden">
      {/* Top players */}
      <div className="flex-1 flex">
        {layout.top.map((player) => (
          <div key={player.pid} className="flex-1 relative">
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
        onPassTurn={() => GameActions.passTurn()}
        onSettings={() => {}}
        onLog={() => {}}
        onDice={() => {}}
        onCoin={() => {}}
        onCmdDmg={(pid) => {}}
        onLife={(pid, delta) => GameActions.changeLife(delta)}
        onDraw={(pid) => GameActions.drawCards(1)}
        onDraw7={(pid) => GameActions.drawCards(7)}
        onUntapAll={(pid) => GameActions.untapAll()}
      />

      {/* Bottom players (local) */}
      <div className="flex-1 flex">
        {layout.bottom.map((player) => (
          <div key={player.pid} className="flex-1 relative">
            <PlayerMat {...makePlayerMatProps(player, player.pid)} />
          </div>
        ))}
      </div>

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
          playerPalette={PALETTES[localPid % PALETTES.length]}
          onAction={handleContextAction}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* Zone Viewer */}
      {zoneViewer && players[zoneViewer.pid] && (
        <ZoneViewer
          player={players[zoneViewer.pid]}
          zone={zoneViewer.zone}
          onClose={() => setZoneViewer(null)}
          onMoveCard={(iid, toZone, x, y) => {
            console.log('[v0] ZoneViewer move:', iid, 'to', toZone)
            GameActions.moveCard(iid, toZone, x, y)
          }}
          onHover={setHoverCard}
          onHL={() => setHoverCard(null)}
        />
      )}

      {/* Hover card preview */}
      {hoverCard && (
        <div className="fixed bottom-4 right-4 w-64 liquid-glass-readable rounded-xl p-4 z-50 pointer-events-none">
          <h4 className="font-bold text-foreground mb-1">{hoverCard.name}</h4>
          {hoverCard.manaCost && (
            <p className="text-xs text-muted-foreground mb-2">{hoverCard.manaCost}</p>
          )}
          <p className="text-xs text-foreground/80 leading-relaxed">{hoverCard.oracle}</p>
        </div>
      )}

      {/* Action Log */}
      {gameState.log.length > 0 && (
        <div className="fixed top-4 right-4 w-72 max-h-48 overflow-y-auto liquid-glass-readable rounded-xl p-3 z-40">
          <h4 className="font-bold text-sm text-foreground mb-2">Action Log</h4>
          <div className="space-y-1">
            {gameState.log.slice(0, 20).map((entry, i) => (
              <p key={i} className="text-xs text-muted-foreground">{entry}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

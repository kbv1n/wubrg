"use client"

import React, { useState, useRef, useEffect } from 'react'
import type { Player, CardInstance, ZoneType } from '@/lib/game-types'
import { PALETTES } from '@/lib/game-types'
import { lookupCard, fetchScryfall } from '@/lib/game-data'
import { GameActions } from '@/lib/colyseus-client'
import type { GameState as MPGameState, CardState as MPCardState } from '@/lib/multiplayer-types'
import { PlayerMat } from '@/components/game/player-mat'
import { CenterDivider } from '@/components/game/center-divider'
import { ActionLogPopdown } from '@/components/game/action-log-popdown'
import { ContextMenu } from '@/components/game/context-menu'
import { ZoneViewer } from '@/components/game/zone-viewer'
import { CardImage } from '@/components/game/card-image'
import { ManaSymbols, OracleText } from '@/components/game/mana-symbols'
import { CounterModal, CmdDmgModal, DiceModal, UISettingsModal } from '@/components/game/modals'

// Convert a single MP card to a CardInstance for the UI
function mpCardToInstance(card: MPCardState): CardInstance {
  const data = lookupCard(card.cardId)
  const base = data
    ? { ...data }
    : {
        name: card.cardId,
        manaCost: '',
        cmc: 0,
        typeLine: '...',
        oracle: '',
        power: null,
        tough: null,
        loyalty: null,
        rarity: 'common' as const,
        set: '',
        isLegendary: false,
        isCreature: false,
        isPlaneswalker: false,
        isLand: false,
        img: null,
      }
  return {
    ...base,
    iid: card.iid,
    tapped: card.tapped,
    showBack: false,
    faceDown: card.faceDown,
    summonSick: false,
    counters: card.counters > 0 ? { '+1/+1': card.counters } : {},
    x: card.x,
    y: card.y,
    z: 0,
  }
}

// Convert MP state to the Player[] format the UI expects
function convertToPlayers(
  mpState: MPGameState,
  localPlayerId: string
): { players: Player[]; localPid: number; turn: number; sessionIds: string[] } {
  const playerOrder = mpState.playerOrder
  // Put local player first so they render at the bottom
  const orderedIds = [localPlayerId, ...playerOrder.filter((id) => id !== localPlayerId)]

  const players: Player[] = orderedIds
    .map((sessionId, idx) => {
      const mp = mpState.players.get(sessionId)
      if (!mp) return null as unknown as Player

      const palIdx =
        mp.colorIndex >= 0 ? mp.colorIndex % PALETTES.length : idx % PALETTES.length

      const cmdDmg: Record<number, number> = {}
      mp.cmdDamage.forEach((dmg, fromId) => {
        const fromPid = orderedIds.indexOf(fromId)
        if (fromPid >= 0) cmdDmg[fromPid] = dmg.dealt
      })

      return {
        pid: idx,
        name: mp.name,
        pal: PALETTES[palIdx],
        life: mp.life,
        poison: mp.poison,
        cmdDmg,
        library: mp.library.map(mpCardToInstance),
        hand: mp.hand.map(mpCardToInstance),
        battlefield: mp.battlefield.map(mpCardToInstance),
        graveyard: mp.graveyard.map(mpCardToInstance),
        exile: mp.exile.map(mpCardToInstance),
        command: mp.commandZone.map(mpCardToInstance),
        maxZ: 10,
        isDemo: false,
        missed: 0,
        playmat: mp.playmatUrl || '',
        playmatFit: 'cover',
      } satisfies Player
    })
    .filter(Boolean)

  const activeId = mpState.playerOrder[mpState.turn]
  const turn = Math.max(0, orderedIds.indexOf(activeId))

  return { players, localPid: 0, turn, sessionIds: orderedIds }
}

// Collect all unique card names from the MP state so we can prefetch them
function collectCardNames(mpState: MPGameState): string[] {
  const names = new Set<string>()
  mpState.players.forEach((player) => {
    const all = [
      ...player.library,
      ...player.hand,
      ...player.battlefield,
      ...player.graveyard,
      ...player.exile,
      ...player.commandZone,
    ]
    all.forEach((c) => names.add(c.cardId))
  })
  return Array.from(names)
}

interface Props {
  mpState: MPGameState
  localPlayerId: string
  onLeave: () => void
}

export function MultiplayerBoard({ mpState, localPlayerId, onLeave }: Props) {
  // UI state (local only, not synced)
  const [hover, setHover] = useState<CardInstance | null>(null)
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 })
  const [ctx, setCtx] = useState<{
    x: number
    y: number
    pid: number
    iid: string
    zone: ZoneType
  } | null>(null)
  const [zv, setZV] = useState<{ pid: number; zone: ZoneType } | null>(null)
  const [ctr, setCtr] = useState<{ pid: number; iid: string } | null>(null)
  const [dmg, setDmg] = useState<number | null>(null)
  const [logOpen, setLog] = useState(true)
  const [diceModal, setDiceModal] = useState<'dice' | 'coin' | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [uiSettings, setUISettings] = useState({ showZoomPanel: true, uiScale: 1, glassOpacity: 0.85 })
  const [zooms, setZooms] = useState<Record<number, number>>({})
  const [pans, setPans] = useState<Record<number, { x: number; y: number }>>({})
  const [handDragOver, setHandDragOver] = useState<number | null>(null)
  const [handGhost, setHandGhost] = useState<{ card: CardInstance; x: number; y: number } | null>(null)
  const [previewScale, setPreviewScale] = useState(1)

  const matRefs = useRef<Record<number, HTMLDivElement | null>>({})
  const outerRefs = useRef<Record<number, React.RefObject<HTMLDivElement | null>>>({})
  const handDragRef = useRef<{ pid: number; iid: string } | null>(null)
  const dragRef = useRef<boolean | null>(null)
  const fetchedRef = useRef<Set<string>>(new Set())
  const [scryfallLoaded, setScryfallLoaded] = useState(0)

  // Fetch Scryfall data for any new card names in the state, then re-render
  useEffect(() => {
    const names = collectCardNames(mpState).filter((n) => !fetchedRef.current.has(n))
    if (names.length === 0) return
    names.forEach((n) => fetchedRef.current.add(n))
    fetchScryfall(names).then(() => setScryfallLoaded((n) => n + 1))
  }, [mpState])

  // Track mouse for the hover card preview
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (hover) setHoverPos({ x: e.clientX, y: e.clientY })
    }
    window.addEventListener('mousemove', handler)
    return () => window.removeEventListener('mousemove', handler)
  }, [hover])

  // Close context menu on any click
  useEffect(() => {
    const handler = () => setCtx(null)
    window.addEventListener('mousedown', handler)
    return () => window.removeEventListener('mousedown', handler)
  }, [])

  // Derived game state from server
  const { players, localPid, turn, sessionIds } = convertToPlayers(mpState, localPlayerId)
  if (players.length === 0) return null

  const getZoom = (pid: number) => zooms[pid] ?? 1
  const setZoom = (pid: number, z: number) =>
    setZooms((prev) => ({ ...prev, [pid]: Math.max(0.15, Math.min(4.0, z)) }))
  const getPan = (pid: number) => pans[pid] || { x: 0, y: 0 }
  const setPan = (pid: number, pan: { x: number; y: number }) =>
    setPans((prev) => ({ ...prev, [pid]: pan }))

  const zoomAtCursor = (pid: number, newZoom: number, mx: number, my: number) => {
    const oldZoom = getZoom(pid)
    const pan = getPan(pid)
    const wx = (mx - pan.x) / oldZoom
    const wy = (my - pan.y) / oldZoom
    setZoom(pid, newZoom)
    setPan(pid, { x: mx - wx * newZoom, y: my - wy * newZoom })
  }

  const isLocal = (pid: number) => pid === localPid

  const findCard = (pid: number, iid: string): CardInstance | null => {
    const p = players[pid]
    if (!p) return null
    const zones: ZoneType[] = ['hand', 'battlefield', 'graveyard', 'exile', 'command', 'library']
    for (const z of zones) {
      const c = p[z].find((c) => c.iid === iid)
      if (c) return c
    }
    return null
  }

  // --- Action handlers (send to Colyseus) ---

  const handDockRef = useRef<HTMLDivElement | null>(null)

  const onCardMD = (e: React.MouseEvent, pid: number, iid: string) => {
    if (e.button !== 0 || !isLocal(pid)) return
    e.preventDefault()
    e.stopPropagation()

    const card = players[pid].battlefield.find((c) => c.iid === iid)
    if (!card) return

    const sx = e.clientX
    const sy = e.clientY
    const scx = card.x
    const scy = card.y
    let hasDragged = false
    dragRef.current = true

    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return
      if (Math.abs(ev.clientX - sx) > 5 || Math.abs(ev.clientY - sy) > 5) hasDragged = true
    }

    const onUp = (ev: MouseEvent) => {
      dragRef.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)

      if (!hasDragged) {
        if (card.tapped) GameActions.untapCard(iid)
        else GameActions.tapCard(iid)
      } else {
        // Check if dropped over hand dock area (bottom 120px of viewport)
        const viewH = window.innerHeight
        if (ev.clientY > viewH - 120) {
          GameActions.moveCard(iid, 'hand')
          return
        }
        const rect = matRefs.current[pid]?.getBoundingClientRect()
        if (rect) {
          const nx = Math.max(0, Math.min(90, scx + ((ev.clientX - sx) / rect.width) * 100))
          const ny = Math.max(0, Math.min(88, scy + ((ev.clientY - sy) / rect.height) * 100))
          GameActions.moveCard(iid, 'battlefield', nx, ny)
        }
      }
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const onHandCardMD = (e: React.MouseEvent, pid: number, iid: string) => {
    if (e.button !== 0 || !isLocal(pid)) return
    e.preventDefault()
    e.stopPropagation()

    const card = players[pid].hand.find((c) => c.iid === iid)
    if (!card) return

    handDragRef.current = { pid, iid }
    setHandGhost({ card, x: e.clientX, y: e.clientY })

    const getBFRect = () => outerRefs.current[localPid]?.current?.getBoundingClientRect() ?? null

    const onMove = (ev: MouseEvent) => {
      setHandGhost((prev) => (prev ? { ...prev, x: ev.clientX, y: ev.clientY } : null))
      const rect = getBFRect()
      if (rect && ev.clientX >= rect.left && ev.clientX <= rect.right &&
          ev.clientY >= rect.top && ev.clientY <= rect.bottom) {
        setHandDragOver(localPid)
      } else {
        setHandDragOver(null)
      }
    }

    const onUp = (ev: MouseEvent) => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)

      const hd = handDragRef.current
      if (hd && isLocal(hd.pid)) {
        const rect = getBFRect()
        if (rect && ev.clientX >= rect.left && ev.clientX <= rect.right &&
            ev.clientY >= rect.top && ev.clientY <= rect.bottom) {
          const dropX = Math.max(2, Math.min(90, ((ev.clientX - rect.left) / rect.width) * 100))
          const dropY = Math.max(2, Math.min(88, ((ev.clientY - rect.top) / rect.height) * 100))
          GameActions.moveCard(hd.iid, 'battlefield', dropX, dropY)
        }
      }

      handDragRef.current = null
      setHandGhost(null)
      setHandDragOver(null)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const doCtx = (act: string) => {
    if (!ctx) return
    const { pid, iid } = ctx
    if (!isLocal(pid)) {
      setCtx(null)
      return
    }
    switch (act) {
      case 'tap': {
        const card = players[pid].battlefield.find((c) => c.iid === iid)
        if (card?.tapped) GameActions.untapCard(iid)
        else GameActions.tapCard(iid)
        break
      }
      case 'toBF':
        GameActions.moveCard(iid, 'battlefield')
        break
      case 'toHand':
        GameActions.moveCard(iid, 'hand')
        break
      case 'toGrave':
        GameActions.moveCard(iid, 'graveyard')
        break
      case 'toExile':
        GameActions.moveCard(iid, 'exile')
        break
      case 'toLib':
        GameActions.moveCard(iid, 'library')
        break
      case 'flip':
        GameActions.flipCard(iid)
        break
      case 'fd':
        GameActions.flipCard(iid)
        break
      case 'ctr':
        setCtr({ pid, iid })
        break
    }
    setCtx(null)
  }

  const makePlayerMatProps = (p: Player, isMain: boolean) => {
    if (!outerRefs.current[p.pid]) {
      outerRefs.current[p.pid] = React.createRef<HTMLDivElement | null>()
    }
    return {
      key: p.pid,
      player: p,
      isActive: turn === p.pid,
      isMain,
      isLocal: isLocal(p.pid),
      zoom: getZoom(p.pid),
      pan: getPan(p.pid),
      onPan: (newPan: { x: number; y: number }) => setPan(p.pid, newPan),
      onResetView: () => {
        setZoom(p.pid, 1)
        setPan(p.pid, { x: 0, y: 0 })
      },
      onLife: (d: number) => {
        if (isLocal(p.pid)) GameActions.changeLife(d)
      },
      onCardMD: (e: React.MouseEvent, iid: string) => onCardMD(e, p.pid, iid),
      onCardRC: (e: React.MouseEvent, iid: string, zone: string) => {
        if (!isLocal(p.pid)) return
        e.preventDefault()
        e.stopPropagation()
        setCtx({ x: e.clientX, y: e.clientY, pid: p.pid, iid, zone: zone as ZoneType })
      },
      onHover: (c: CardInstance) => { if (!c.faceDown) { setHover(c); setPreviewScale(1) } },
      onHL: () => setHover(null),
      onZone: (zone: string) => {
        if (isLocal(p.pid) && zone === 'library') {
          GameActions.addLog(`${p.name} is looking at their library`)
        }
        setZV({ pid: p.pid, zone: zone as ZoneType })
      },
      onHandCardMD: (e: React.MouseEvent, iid: string) => onHandCardMD(e, p.pid, iid),
      isHandDragOver: handDragOver === p.pid,
      matRef: (el: HTMLDivElement | null) => {
        matRefs.current[p.pid] = el
      },
      outerScrollRef: outerRefs.current[p.pid],
      onZoomWithScroll: (newZoom: number, mx: number, my: number) =>
        zoomAtCursor(p.pid, newZoom, mx, my),
    }
  }

  const ctxCard = ctx ? findCard(ctx.pid, ctx.iid) : null
  const ctrCard = ctr ? findCard(ctr.pid, ctr.iid) : null

  return (
    <div
      onMouseDown={() => setCtx(null)}
      className="h-screen w-screen overflow-hidden bg-background flex flex-col select-none relative"
      style={{
        transform: `scale(${uiSettings.uiScale})`,
        transformOrigin: 'top left',
        width: `${100 / uiSettings.uiScale}%`,
        height: `${100 / uiSettings.uiScale}vh`,
        '--glass-opacity': uiSettings.glassOpacity,
      } as React.CSSProperties}
    >
      {/* Player mats */}
      <div className="flex-1 flex flex-col gap-1 p-1 overflow-hidden min-h-0">
        {players.length > 1 && (
          <div
            className="flex gap-1"
            style={{ flex: players.length === 2 ? 1 : 0.65, minHeight: 0 }}
          >
            {players.slice(1).map((p) => {
              const { key, ...props } = makePlayerMatProps(p, false)
              return <PlayerMat key={key} {...props} />
            })}
          </div>
        )}
        <div className="flex flex-1 min-h-0">
          {(() => {
            const { key, ...props } = makePlayerMatProps(players[0], true)
            return <PlayerMat key={key} {...props} />
          })()}
        </div>
      </div>

      {/* Action bar */}
      <CenterDivider
        players={players}
        turn={turn}
        round={mpState.round}
        localPid={localPid}
        hasDrawnInitial={true}
        onPassTurn={() => GameActions.passTurn()}
        onSettings={() => setSettingsOpen(true)}
        onLog={() => setLog((o) => !o)}
        onDice={() => setDiceModal('dice')}
        onCoin={() => setDiceModal('coin')}
        logOpen={logOpen}
        onCmdDmg={(pid) => setDmg(pid)}
        onLife={(pid, d) => {
          if (pid === localPid) GameActions.changeLife(d)
        }}
        onDraw={(pid) => {
          if (pid === localPid) GameActions.drawCards(1)
        }}
        onDraw7={(pid) => {
          if (pid === localPid) GameActions.drawCards(7)
        }}
        onUntapAll={(pid) => {
          if (pid === localPid) GameActions.untapAll()
        }}
      />

      {/* Action log */}
      <ActionLogPopdown entries={mpState.log} open={logOpen} onClose={() => setLog(false)} />

      {/* Context menu */}
      {ctx && ctxCard && (
        <div onMouseDown={(e) => e.stopPropagation()}>
          <ContextMenu
            x={ctx.x}
            y={ctx.y}
            card={ctxCard}
            zone={ctx.zone}
            pal={players[ctx.pid]?.pal || PALETTES[0]}
            onAction={doCtx}
          />
        </div>
      )}

      {/* Hover card preview */}
      {hover && (
        <div
          className="fixed z-[9998] animate-card-enter"
          style={{
            left: Math.min(
              hoverPos.x + 20,
              (typeof window !== 'undefined' ? window.innerWidth : 1200) - 280
            ),
            top: Math.max(
              20,
              Math.min(
                hoverPos.y - 100,
                (typeof window !== 'undefined' ? window.innerHeight : 800) - 450
              )
            ),
            pointerEvents: 'auto',
          }}
          onWheel={(e) => {
            e.stopPropagation()
            setPreviewScale(s => Math.max(0.5, Math.min(3, s + (e.deltaY > 0 ? -0.15 : 0.15))))
          }}
        >
          <div
            className="w-52 rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/20 origin-top-left transition-transform duration-100"
            style={{ transform: `scale(${previewScale})` }}
          >
            <CardImage src={hover.img} alt={hover.name} />
          </div>
          <div className="liquid-glass-readable mt-2 px-3 py-2.5 rounded-xl max-w-[220px]">
            {hover.manaCost && (
              <div className="mb-1.5">
                <ManaSymbols cost={hover.manaCost} size={18} useImages={false} />
              </div>
            )}
            <p className="text-sm font-semibold text-foreground">{hover.name}</p>
            {hover.typeLine && (
              <p className="text-xs text-muted-foreground mb-1.5">{hover.typeLine}</p>
            )}
            {hover.oracle && (
              <div className="text-xs text-foreground/80 leading-relaxed">
                <OracleText
                  text={
                    hover.oracle.length > 250 ? hover.oracle.slice(0, 250) + '...' : hover.oracle
                  }
                  symbolSize={12}
                />
              </div>
            )}
            {hover.power && hover.tough && (
              <p className="text-sm font-bold text-primary mt-1.5">
                {hover.power}/{hover.tough}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Zone viewer */}
      {zv && (
        <ZoneViewer
          player={players[zv.pid]}
          zone={zv.zone}
          onClose={() => setZV(null)}
          onMove={(iid, z) => {
            if (isLocal(zv.pid)) GameActions.moveCard(iid, z)
            setZV(null)
          }}
          onHover={(c) => setHover(c)}
          onHL={() => setHover(null)}
          onRC={(e, c) => {
            if (!isLocal(zv.pid)) return
            e.preventDefault()
            e.stopPropagation()
            setCtx({ x: e.clientX, y: e.clientY, pid: zv.pid, iid: c.iid, zone: zv.zone })
          }}
          onScry={(n) => {
            if (isLocal(zv.pid)) GameActions.scry(n)
          }}
          onMill={(n) => {
            if (isLocal(zv.pid)) GameActions.millCards(n)
            setZV(null)
          }}
          onShuffle={() => {
            if (isLocal(zv.pid)) GameActions.shuffleLibrary()
          }}
        />
      )}

      {/* Counter modal */}
      {ctr && ctrCard && isLocal(ctr.pid) && (
        <CounterModal
          card={ctrCard}
          pal={players[ctr.pid].pal}
          onAdd={(_type, delta) => GameActions.addCounter(ctr.iid, delta)}
          onClose={() => setCtr(null)}
        />
      )}

      {/* Commander damage modal */}
      {dmg !== null && (
        <CmdDmgModal
          player={players[dmg]}
          allPlayers={players}
          onDmg={(fromPid, d) => {
            if (dmg === localPid) {
              // Local player receiving commander damage — convert pid to sessionId
              const fromSessionId = sessionIds[fromPid]
              if (fromSessionId) {
                GameActions.cmdDamage(fromSessionId, d)
              }
            }
          }}
          onClose={() => setDmg(null)}
        />
      )}

      {/* Dice/coin modal */}
      {diceModal && (
        <DiceModal
          mode={diceModal}
          onRoll={(sides) => Math.floor(Math.random() * sides) + 1}
          onFlip={() => (Math.random() < 0.5 ? 'Heads' : 'Tails')}
          onLog={(msg) => {
            const name = players[localPid]?.name ?? 'A player'
            GameActions.addLog(`${name} ${msg}`)
          }}
          onClose={() => setDiceModal(null)}
        />
      )}

      {/* Settings modal */}
      {settingsOpen && (
        <UISettingsModal
          settings={uiSettings}
          onChange={setUISettings}
          players={players}
          onPlaymat={(_pid, field, val) => {
            if (field === 'url') GameActions.setPlaymat(val)
          }}
          onClose={() => setSettingsOpen(false)}
          onLeave={onLeave}
        />
      )}

      {/* Hand drag ghost */}
      {handGhost && (
        <div
          className="fixed pointer-events-none z-[10000] w-14 h-[78px] rounded overflow-hidden rotate-[-4deg] scale-105 ring-2 ring-primary shadow-xl"
          style={{
            left: handGhost.x - 28,
            top: handGhost.y - 39,
            opacity: 0.9
          }}
        >
          <CardImage src={handGhost.card.img} alt={handGhost.card.name} />
        </div>
      )}
    </div>
  )
}

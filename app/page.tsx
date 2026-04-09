'use client'

import { useState, useRef, useEffect } from 'react'
import type { 
  GameState, Player, CardInstance, PlayerSetup, 
  ZoneType, ScreenType 
} from '@/lib/game-types'
import { PALETTES } from '@/lib/game-types'
import { 
  DEMO_DATA, fetchScryfall, lookupCard, parseDeck, 
  createCardInstance, shuffle
} from '@/lib/game-data'

// Components
import { SetupScreen } from '@/components/game/setup-screen'
import { LoadingScreen } from '@/components/game/loading-screen'
import { CenterDivider } from '@/components/game/center-divider'
import { ActionLogPopdown } from '@/components/game/action-log-popdown'
import { PlayerMat } from '@/components/game/player-mat'
import { CardZoom } from '@/components/game/card-zoom'
import { ManaSymbols, OracleText } from '@/components/game/mana-symbols'
import { ContextMenu } from '@/components/game/context-menu'
import { ZoneViewer } from '@/components/game/zone-viewer'
import { CardImage } from '@/components/game/card-image'
import { MorphingText } from "@/components/ui/morphing-text"
import { GiCrownOfThorns , GiFootTrip } from "react-icons/gi";
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from '@/components/ui/button'
import { Loader2, Plus, ArrowRight } from 'lucide-react'

import { 
  CounterModal, CmdDmgModal, ScryModal, 
  DiceModal, UISettingsModal, Toast 
} from '@/components/game/modals'
import { DamageToastContainer } from '@/components/game/damage-toast'


// Multiplayer
import { MultiplayerWrapper } from '@/components/multiplayer/MultiplayerWrapper'
import { MultiplayerGameBoard } from '@/components/multiplayer/MultiplayerGameBoard'
import { GameActions } from '@/lib/socket-client'
import type { MPGameState } from '@/lib/game-types'
import { cn } from "@/lib/utils"


export default function AstralMagicGame() {
  // Game mode: 'select' | 'single' | 'multi'
  const [gameMode, setGameMode] = useState<'select' | 'single' | 'multi'>('select')

  // Multiplayer state for create/join
  const [multiplayerAction, setMultiplayerAction] = useState<
    { type: 'create'; maxPlayers: number } | { type: 'join'; roomCode: string } | null
  >(null)
  const [roomCode, setRoomCode] = useState("")
  const [showJoinOptions, setShowJoinOptions] = useState(false)

  // Screen state
  const [screen, setScreen] = useState<ScreenType>('setup')
  const [nPlayers, setNP] = useState(4)
  const [setups, setSU] = useState<PlayerSetup[]>(
    Array.from({ length: 6 }, (_, i) => ({ name: `Player ${i + 1}`, deck: '' }))
  )
  const [ld, setLD] = useState({ done: 0, total: 0, current: '' })
  
  // Game state
  const [game, setGame] = useState<GameState | null>(null)
  const [hover, setHover] = useState<CardInstance | null>(null)
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 })
  const [ctx, setCtx] = useState<{ x: number; y: number; pid: number; iid: string; zone: ZoneType } | null>(null)
  const [zv, setZV] = useState<{ pid: number; zone: ZoneType } | null>(null)
  const [ctr, setCtr] = useState<{ pid: number; iid: string } | null>(null)
  const [dmg, setDmg] = useState<number | null>(null)
  const [logOpen, setLog] = useState(true)

  // Auto-join from URL param
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search)
      const room = params.get("room")
      if (room) {
        setRoomCode(room)
        setMultiplayerAction({ type: 'join', roomCode: room })
        setGameMode('multi')
      }
    }
  }, [])

  const handleCreateRoom = () => {
    setMultiplayerAction({ type: 'create', maxPlayers: 6 })
    setGameMode('multi')
  }

  const handleJoinRoom = () => {
    if (!roomCode.trim()) return
    setMultiplayerAction({ type: 'join', roomCode: roomCode.trim() })
    setGameMode('multi')
  }

  // UI Settings
  const [uiSettings, setUISettings] = useState({
    cardScale: 1,
    defaultZoom: 1,
    showZoomPanel: true,
    uiScale: 1,
    glassOpacity: 0.65
  })
  const [settingsOpen, setSettingsOpen] = useState(false)
  
  // Per-player zoom and pan
  const [zooms, setZooms] = useState<Record<number, number>>({})
  const [pans, setPans] = useState<Record<number, { x: number; y: number }>>({})
  
  // Hand drag state
  const [handGhost, setHandGhost] = useState<{ card: CardInstance; x: number; y: number } | null>(null)
  const [handDragOver, setHandDragOver] = useState<number | null>(null)
  const handDragRef = useRef<{ pid: number; iid: string } | null>(null)
  
  // Pass-the-laptop local player
  const [localPid, setLocalPid] = useState(0)
  
  // Track if initial hand has been drawn (for Draw 7 vs Draw 1)
  const [hasDrawnInitial, setHasDrawnInitial] = useState<Record<number, boolean>>({})
  
  // Commander selection
  const [cmdSelections, setCmdSelections] = useState<Record<number, string[]>>({})
  const [cmdReady, setCmdReady] = useState<Record<number, boolean>>({})
  
  // Toast & modals
  const [toast, setToast] = useState<string | null>(null)
  const [scry, setScry] = useState<{ pid: number; n: number } | null>(null)
  const [diceModal, setDiceModal] = useState<'dice' | 'coin' | null>(null)
  
  // Damage tracking for cumulative toasts
  const [damageToasts, setDamageToasts] = useState<Map<number, { damage: number; timeoutId: NodeJS.Timeout }>>(new Map())
  const [activeToasts, setActiveToasts] = useState<Array<{ id: string; playerName: string; damage: number; pal: typeof PALETTES[0] }>>([])
  
  // Refs
  const matRefs = useRef<Record<number, HTMLDivElement | null>>({})
  const dragRef = useRef<boolean | null>(null)
  const outerRefs = useRef<Record<number, React.RefObject<HTMLDivElement | null>>>({})

  // Track mouse position for cursor-following card preview
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (hover) {
        setHoverPos({ x: e.clientX, y: e.clientY })
      }
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [hover])

  // Helper functions
  const getZoom = (pid: number) => zooms[pid] ?? uiSettings.defaultZoom
  const setZoom = (pid: number, z: number) => setZooms(prev => ({ ...prev, [pid]: Math.max(0.15, Math.min(4.0, z)) }))
  const getPan = (pid: number) => pans[pid] || { x: 0, y: 0 }
  const setPan = (pid: number, pan: { x: number; y: number }) => setPans(prev => ({ ...prev, [pid]: pan }))

  // Zoom at cursor
  const zoomAtCursor = (pid: number, newZoom: number, mx: number, my: number) => {
    const oldZoom = getZoom(pid)
    const pan = getPan(pid)
    const wx = (mx - pan.x) / oldZoom
    const wy = (my - pan.y) / oldZoom
    const newPanX = mx - wx * newZoom
    const newPanY = my - wy * newZoom
    setZoom(pid, newZoom)
    setPan(pid, { x: newPanX, y: newPanY })
  }

  // Close context menu on click
  useEffect(() => {
    const handler = () => setCtx(null)
    window.addEventListener('mousedown', handler)
    return () => window.removeEventListener('mousedown', handler)
  }, [])

  // Start game
  const startGame = async () => {
    const active = setups.slice(0, nPlayers)
    setScreen('loading')

    // Collect names needing Scryfall
    const customNames: string[] = []
    active.forEach((p) => {
      if (p.deck.trim()) {
        parseDeck(p.deck).forEach((e) => {
          const key = e.name.toLowerCase()
          if (!DEMO_DATA.find(d => d.name.toLowerCase() === key)) {
            customNames.push(e.name)
          }
        })
      }
    })

    if (customNames.length > 0) {
      setLD({ done: 0, total: customNames.length, current: 'Connecting to Scryfall...' })
      await fetchScryfall(customNames, (done, total, current) => {
        setLD({ done, total: Math.max(total, 1), current: current || 'Processing...' })
      })
    }

    setLD({ done: 1, total: 1, current: 'Building game...' })

    const players: Player[] = active.map((pd, idx) => {
      const isDemo = !pd.deck.trim()
      const entries = isDemo
        ? DEMO_DATA.map((d) => ({ name: d.name, section: 'main' }))
        : parseDeck(pd.deck)

      const commanders: CardInstance[] = []
      const library: CardInstance[] = []
      let missed = 0

      entries.forEach((e) => {
        const cd = lookupCard(e.name)
        if (!cd) { missed++; return }
        const inst = createCardInstance(cd)
        if (e.section === 'commander') commanders.push(inst)
        else library.push(inst)
      })

      return {
        pid: idx,
        name: pd.name,
        pal: PALETTES[idx % PALETTES.length],
        life: 40,
        poison: 0,
        cmdDmg: {},
        library: shuffle(library),
        hand: [],
        battlefield: [],
        graveyard: [],
        exile: [],
        command: commanders,
        maxZ: 10,
        isDemo,
        missed,
        playmat: pd.playmat || '',
        playmatFit: pd.playmatFit || 'cover'
      }
    })

    const tot = players.reduce((s, p) => s + p.library.length + p.command.length, 0)
    const mis = players.reduce((s, p) => s + p.missed, 0)

    setGame({
      players,
      turn: 0,
      round: 1,
      log: [`Game ready: ${tot} cards loaded${mis > 0 ? `, ${mis} not found` : ''}`]
    })

    // Initialize commander selection
    const initSel: Record<number, string[]> = {}
    const initReady: Record<number, boolean> = {}
    players.forEach((p) => { initSel[p.pid] = []; initReady[p.pid] = false })
    setCmdSelections(initSel)
    setCmdReady(initReady)
    setScreen('commander-select')
  }

  // Finalize commander selection
  const finalizeCommanderSelect = () => {
    mut((g) => {
      g.players.forEach((p) => {
        const selected = cmdSelections[p.pid] || []
        selected.forEach((iid) => {
          const idx = p.library.findIndex((c) => c.iid === iid)
          if (idx !== -1) p.command.push(p.library.splice(idx, 1)[0])
        })
        p.library = shuffle(p.library)
      })
      const firstPid = Math.floor(Math.random() * g.players.length)
      g.turn = firstPid
      g.log = [`${g.players[firstPid].name} goes first (randomly selected)!`]
    })
    setScreen('game')
  }

  // Mutate game state
  const mut = (fn: (g: GameState) => void) => {
    setGame((prev) => {
      if (!prev) return prev
      const next: GameState = {
        ...prev,
        log: prev.log.slice(),
        players: prev.players.map((p) => ({
          ...p,
          library: p.library.slice(),
          hand: p.hand.slice(),
          battlefield: p.battlefield.slice(),
          graveyard: p.graveyard.slice(),
          exile: p.exile.slice(),
          command: p.command.slice(),
          cmdDmg: { ...p.cmdDmg },
        }))
      }
      fn(next)
      return next
    })
  }

  // Move card between zones
  const moveCard = (fromPid: number, iid: string, toZone: ZoneType, toPid?: number, dropX?: number, dropY?: number) => {
    const targetPid = toPid ?? fromPid
    mut((g) => {
      const fp = g.players[fromPid]
      let card: CardInstance | null = null
      const zones: ZoneType[] = ['hand', 'battlefield', 'graveyard', 'exile', 'command', 'library']
      
      for (const z of zones) {
        const idx = fp[z].findIndex((c) => c.iid === iid)
        if (idx !== -1) {
          card = { ...fp[z][idx] }
          fp[z].splice(idx, 1)
          break
        }
      }
      
      if (!card) return
      
      card.iid = crypto.randomUUID()
      card.tapped = false
      card.summonSick = toZone === 'battlefield'
      card.z = ++g.players[targetPid].maxZ
      
      if (toZone === 'battlefield') {
        card.x = dropX ?? 5 + Math.random() * 55
        card.y = dropY ?? 5 + Math.random() * 55
      }
      
      g.players[targetPid][toZone].push(card)
      g.log = [`${fp.name}: ${card.faceDown ? 'Card' : card.name} -> ${toZone}`, ...g.log.slice(0, 99)]
    })
    
    if (toZone === 'battlefield' && game) {
      const card = findCard(fromPid, iid)
      setToast(`${game.players[fromPid].name} plays ${card?.name || 'a card'}`)
    }
    setCtx(null)
  }

  // Draw cards
  const drawCards = (pid: number, n = 1) => {
    mut((g) => {
    const p = g.players[pid]
    if (p.library.length === 0) {
    g.log = [`${p.name}: library empty!`, ...g.log.slice(0, 99)]
    return
    }
    const cnt = Math.min(n, p.library.length)
    const drawn = p.library.splice(0, cnt).map((c) => ({ ...c, iid: crypto.randomUUID() }))
    p.hand.push(...drawn)
    g.log = [`${p.name} drew ${cnt} - hand:${p.hand.length} lib:${p.library.length}`, ...g.log.slice(0, 99)]
    })
    if (game) setToast(`${game.players[pid].name} draws ${n === 1 ? 'a card' : `${n} cards`}`)
  }
  
  // Draw 7 opening hand
  const draw7 = (pid: number) => {
    drawCards(pid, 7)
    setHasDrawnInitial((prev) => ({ ...prev, [pid]: true }))
  }

  const dealOpening = (pid: number) => {
    mut((g) => {
      const p = g.players[pid]
      const ret = p.hand.map((c) => ({ ...c, iid: crypto.randomUUID() }))
      p.library = shuffle([...p.library, ...ret])
      const cnt = Math.min(7, p.library.length)
      p.hand = p.library.splice(0, cnt).map((c) => ({ ...c, iid: crypto.randomUUID() }))
      g.log = [`${p.name} drew opening hand (${cnt} cards)`, ...g.log.slice(0, 99)]
    })
  }

  const untapAll = (pid: number) => {
    mut((g) => {
      g.players[pid].battlefield = g.players[pid].battlefield.map((c) => ({ ...c, tapped: false }))
      g.log = [`${g.players[pid].name} untapped all`, ...g.log.slice(0, 99)]
    })
  }

  const shuffleLib = (pid: number) => {
    mut((g) => {
      g.players[pid].library = shuffle(g.players[pid].library)
      g.log = [`${g.players[pid].name} shuffled`, ...g.log.slice(0, 99)]
    })
  }

  const changeLife = (pid: number, d: number) => {
    mut((g) => { g.players[pid].life = Math.max(-99, g.players[pid].life + d) })
    if (game) {
      const newLife = Math.max(-99, (game.players[pid].life || 40) + d)
      const pname = game.players[pid].name
      const pal = PALETTES[pid % PALETTES.length]
      
      // Cumulative damage toast system
      setDamageToasts(prev => {
        const newMap = new Map(prev)
        const existing = newMap.get(pid)
        
        // Clear existing timeout
        if (existing?.timeoutId) {
          clearTimeout(existing.timeoutId)
        }
        
        // Calculate cumulative damage (negative d = damage taken, positive = healing)
        const cumulativeDamage = (existing?.damage || 0) - d
        
        // Set new timeout to finalize the toast
        const timeoutId = setTimeout(() => {
          setDamageToasts(p => {
            const n = new Map(p)
            n.delete(pid)
            return n
          })
        }, 800)
        
        newMap.set(pid, { damage: cumulativeDamage, timeoutId })
        
        // Update active toasts display
        setActiveToasts(prev => {
          const filtered = prev.filter(t => t.id !== `dmg-${pid}`)
          return [...filtered, { id: `dmg-${pid}`, playerName: pname, damage: cumulativeDamage, pal }]
        })
        
        return newMap
      })
      
      // Critical life warnings
      if (newLife <= 0) setToast(`${pname} is at ${newLife} life!`)
      else if (newLife <= 10 && (game.players[pid].life || 40) > 10) setToast(`${pname} is at ${newLife} life!`)
    }
  }
  
  const removeDamageToast = (id: string) => {
    setActiveToasts(prev => prev.filter(t => t.id !== id))
  }

  const tapCard = (pid: number, iid: string) => {
    mut((g) => {
      const p = g.players[pid]
      p.battlefield = p.battlefield.map((c) => {
        if (c.iid !== iid) return c
        const nowTapped = !c.tapped
        return { ...c, tapped: nowTapped }
      })
    })
    setCtx(null)
  }

  // Pass turn
  const passTheTurn = () => {
    if (!game) return
    const nextPid = (game.turn + 1) % game.players.length
    const nextName = game.players[nextPid].name
    mut((g) => {
      if (nextPid === 0) g.round++
      g.turn = nextPid
      const np = g.players[nextPid]
      np.battlefield = np.battlefield.map((c) => ({ ...c, tapped: false, summonSick: false }))
      g.log = [`${np.name}'s turn - Round ${g.round}`, ...g.log.slice(0, 99)]
    })
    setToast(`${nextName}'s turn`)
  }

  // Card drag on battlefield
  const onCardMD = (e: React.MouseEvent, pid: number, iid: string) => {
    if (e.button !== 0 || !game) return
    e.preventDefault()
    e.stopPropagation()
    
    const card = game.players[pid].battlefield.find((c) => c.iid === iid)
    if (!card) return
    
    mut((g) => {
      const mz = ++g.players[pid].maxZ
      g.players[pid].battlefield = g.players[pid].battlefield.map((c) => 
        c.iid === iid ? { ...c, z: mz } : c
      )
    })
    
    const sx = e.clientX, sy = e.clientY
    const scx = card.x, scy = card.y
    let hasDragged = false
    dragRef.current = true
    
    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return
      const dx = Math.abs(ev.clientX - sx)
      const dy = Math.abs(ev.clientY - sy)
      // Only consider it a drag if moved more than 5 pixels
      if (dx > 5 || dy > 5) {
        hasDragged = true
      }
      if (!hasDragged) return
      const rect = matRefs.current[pid]?.getBoundingClientRect()
      if (!rect) return
      const nx = Math.max(0, Math.min(90, scx + (ev.clientX - sx) / rect.width * 100))
      const ny = Math.max(0, Math.min(88, scy + (ev.clientY - sy) / rect.height * 100))
      setGame((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          players: prev.players.map((pl, i) => 
            i !== pid ? pl : {
              ...pl,
              battlefield: pl.battlefield.map((c) => 
                c.iid !== iid ? c : { ...c, x: nx, y: ny }
              )
            }
          )
        }
      })
    }
    
    const onUp = () => {
      dragRef.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      // If we didn't drag, treat it as a tap/untap click
      if (!hasDragged) {
        tapCard(pid, iid)
      }
    }
    
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  // Context menu actions
  const doCtx = (act: string) => {
    if (!ctx) return
    const { pid, iid } = ctx
    
    switch (act) {
      case 'tap': tapCard(pid, iid); break
      case 'toBF': moveCard(pid, iid, 'battlefield'); break
      case 'toHand': moveCard(pid, iid, 'hand'); break
      case 'toGrave': moveCard(pid, iid, 'graveyard'); break
      case 'toExile': moveCard(pid, iid, 'exile'); break
      case 'toLib': moveCard(pid, iid, 'library'); break
      case 'flip':
        mut((g) => {
          g.players[pid].battlefield = g.players[pid].battlefield.map((c) =>
            c.iid === iid ? { ...c, showBack: !c.showBack } : c
          )
        })
        setCtx(null)
        break
      case 'fd':
        mut((g) => {
          ['battlefield', 'hand'].forEach((z) => {
            g.players[pid][z as ZoneType] = g.players[pid][z as ZoneType].map((c) =>
              c.iid === iid ? { ...c, faceDown: !c.faceDown } : c
            )
          })
        })
        setCtx(null)
        break
      case 'ctr':
        setCtr({ pid, iid })
        setCtx(null)
        break
      case 'dup':
        mut((g) => {
          const c = g.players[pid].battlefield.find((c) => c.iid === iid)
          if (c) {
            g.players[pid].battlefield.push({
              ...c,
              iid: crypto.randomUUID(),
              x: c.x + 4,
              y: c.y + 4,
              z: ++g.players[pid].maxZ
            })
          }
        })
        setCtx(null)
        break
      default:
        setCtx(null)
    }
  }

  const addCtr = (type: string, delta: number) => {
    if (!ctr) return
    const { pid, iid } = ctr
    mut((g) => {
      g.players[pid].battlefield = g.players[pid].battlefield.map((c) => {
        if (c.iid !== iid) return c
        const nc = { ...c.counters }
        const nv = Math.max(0, (nc[type] || 0) + delta)
        if (nv === 0) delete nc[type]
        else nc[type] = nv
        return { ...c, counters: nc }
      })
    })
  }

  const addCmdDmg = (toPid: number, fromPid: number, delta: number) => {
    mut((g) => {
      const cur = g.players[toPid].cmdDmg[fromPid] || 0
      const nv = Math.max(0, cur + delta)
      g.players[toPid].cmdDmg[fromPid] = nv
      g.players[toPid].life = Math.max(-99, g.players[toPid].life - delta)
      if (delta !== 0) {
        g.log = [`${g.players[fromPid].name} -> ${g.players[toPid].name}: ${nv} cmd dmg`, ...g.log.slice(0, 99)]
      }
    })
  }

  // Zone operations
  const openZone = (pid: number, zone: ZoneType) => {
    if (zone === 'library' && game) {
      const pname = game.players[pid].name
      mut((g) => { g.log = [`${pname} opened their library`, ...g.log.slice(0, 99)] })
      setToast(`${pname} is searching their library`)
    }
    setZV({ pid, zone })
  }

  const openScry = (pid: number, n: number) => {
    if (!game || game.players[pid].library.length === 0) return
    const cnt = Math.min(n, game.players[pid].library.length)
    mut((g) => { g.log = [`${g.players[pid].name} is scrying ${cnt}...`, ...g.log.slice(0, 99)] })
    setZV(null)
    setScry({ pid, n: cnt })
  }

  const confirmScry = (pid: number, topCards: CardInstance[], bottomCards: CardInstance[]) => {
    const n = scry?.n || 0
    mut((g) => {
      const p = g.players[pid]
      p.library = [...topCards, ...p.library.slice(n), ...bottomCards]
      g.log = [`${p.name} scryed ${n} (${topCards.length} top, ${bottomCards.length} bottom)`, ...g.log.slice(0, 99)]
    })
    setScry(null)
  }

  const millCards = (pid: number, n: number) => {
    mut((g) => {
      const p = g.players[pid]
      const milled = p.library.splice(0, Math.min(n, p.library.length))
      p.graveyard.push(...milled)
      g.log = [`${p.name} milled ${milled.length} card${milled.length !== 1 ? 's' : ''}`, ...g.log.slice(0, 99)]
    })
  }

  // Dice/coin
  const rollDice = (sides: number): number => {
    const result = Math.floor(Math.random() * sides) + 1
    mut((g) => {
      g.log = [`d${sides} -> ${result}${result === sides ? ' MAX!' : result === 1 ? ' NAT 1' : ''}`, ...g.log.slice(0, 99)]
    })
    return result
  }

  const flipCoin = (): string => {
    const result = Math.random() < 0.5 ? 'Heads' : 'Tails'
    mut((g) => { g.log = [`Coin flip -> ${result}`, ...g.log.slice(0, 99)] })
    return result
  }

  // Hand drag to battlefield
  const onHandCardMD = (e: React.MouseEvent, pid: number, iid: string) => {
    if (e.button !== 0 || !game) return
    e.preventDefault()
    e.stopPropagation()
    
    const card = game.players[pid].hand.find((c) => c.iid === iid)
    if (!card) return
    
    handDragRef.current = { pid, iid }
    setHandGhost({ card, x: e.clientX, y: e.clientY })
    
    const findBFPid = (el: Element | null): number | null => {
      let t = el
      while (t) {
        if (t instanceof HTMLElement && t.dataset.bfpid != null) {
          return parseInt(t.dataset.bfpid)
        }
        t = t.parentElement
      }
      return null
    }
    
    const onMove = (ev: MouseEvent) => {
      setHandGhost((prev) => prev ? { ...prev, x: ev.clientX, y: ev.clientY } : null)
      const el = document.elementFromPoint(ev.clientX, ev.clientY)
      setHandDragOver(el ? findBFPid(el) : null)
    }
    
    const onUp = (ev: MouseEvent) => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      
      const hd = handDragRef.current
      if (hd) {
        const el = document.elementFromPoint(ev.clientX, ev.clientY)
        const dropPid = el ? findBFPid(el) : null
        
        if (dropPid !== null) {
          const bfEl = document.querySelector(`[data-bfpid="${dropPid}"]`)
          let dropX = 10 + Math.random() * 40
          let dropY = 10 + Math.random() * 40
          
          if (bfEl) {
            const rect = bfEl.getBoundingClientRect()
            dropX = Math.max(2, Math.min(90, (ev.clientX - rect.left) / rect.width * 100))
            dropY = Math.max(2, Math.min(88, (ev.clientY - rect.top) / rect.height * 100))
          }
          
          moveCard(hd.pid, hd.iid, 'battlefield', dropPid, dropX, dropY)
        }
      }
      
      handDragRef.current = null
      setHandGhost(null)
      setHandDragOver(null)
    }
    
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const findCard = (pid: number, iid: string): CardInstance | null => {
    if (!game) return null
    const zones: ZoneType[] = ['hand', 'battlefield', 'graveyard', 'exile', 'command', 'library']
    for (const z of zones) {
      const c = game.players[pid][z].find((c) => c.iid === iid)
      if (c) return c
    }
    return null
  }
const texts = [
  "wubrg"
]
  // Mode Selection Screen
if (gameMode === 'select') {
    return (
      <div className="min-h-screen bg-background flex flex-row items-center justify-center p-8">
        
        {/* Inner wrapper to keep everything centered together */}
        <div className="flex flex-row items-center gap-12">
          
          {/* Fixed-width container for the morphing text. 
            Adjust w-48 (192px) or w-64 (256px) based on your longest word 
          */}
          <div className="w-90 flex justify-center flex-shrink-2">
            <MorphingText texts={texts} className="text-6xl font-bold" />
          </div>
          
          {/* Buttons */}
          <div className="flex flex-row items-center gap-4">
            <button
              onClick={handleCreateRoom}
              className="h-16 px-6 rounded-4xl flex items-center gap-3 hover:border-foreground/50 transition-all border border-transparent whitespace-nowrap"
            >
              <GiCrownOfThorns className="w-8 h-8" />
              <span className="text-lg font-bold">host</span>
            </button>
        
        {/* Join Room Input */}
        <div className="relative flex items-center gap-2">
          <button
            onClick={() => setShowJoinOptions(!showJoinOptions)}
            className="h-16 px-6 rounded-4xl flex items-center gap-3 hover:border-foreground/50 transition-all border border-transparent whitespace-nowrap"
          >
            <GiFootTrip className="w-8 h-8" />
            <span className="text-lg font-bold">join</span>
          </button>
          {showJoinOptions && (
            <div className="absolute top-full mt-2 left-0 bg-background border border-border rounded-xl p-3 shadow-x1 z-50 min-w-[100px]">
              <Input
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value)}
                placeholder="room code"
                className="h-8 w-full text-center bg-primary font-mono text-lg mb-3"
                onKeyDown={(e) => e.key === 'Enter' && roomCode.trim() && handleJoinRoom()}
                autoFocus
              />
              <button
                onClick={handleJoinRoom}
                disabled={!roomCode.trim()}
                className={cn(
                  "w-full h-8 px-2 rounded-2xl flex items-center justify-center gap-2 transition-all border",
                  roomCode.trim() ? "hover:bg-foreground/5 border-foreground/20" : "opacity-50 cursor-not-allowed"
                )}
              >
                <span className="text-sm">connect</span>
              </button>
            </div>
          )}
        </div>
          </div>

        </div>
        
      </div>
      
    )
  }
  

  // Multiplayer Mode
  if (gameMode === 'multi') {
    return (
      <MultiplayerWrapper
        onBack={() => {
          setGameMode('select')
          setMultiplayerAction(null)
          setRoomCode("")
        }}
        initialAction={multiplayerAction}
      >
        {({ gameState, localPlayerId }) => (
          <MultiplayerGameBoard gameState={gameState} localPlayerId={localPlayerId} />
        )}
      </MultiplayerWrapper>
    )
  }

  // Single Player Mode - Render screens
  if (screen === 'setup') {
    return <SetupScreen nPlayers={nPlayers} setNP={setNP} setups={setups} setSU={setSU} onStart={startGame} />
  }
  
  if (screen === 'loading') {
    return <LoadingScreen done={ld.done} total={ld.total} current={ld.current} />
  }
  
  if (screen === 'commander-select' && game) {
    return (
      <CommanderSelectScreen 
        game={game}
        cmdSelections={cmdSelections}
        setCmdSelections={setCmdSelections}
        cmdReady={cmdReady}
        setCmdReady={setCmdReady}
        onBegin={finalizeCommanderSelect}
      />
    )
  }
  
  if (!game) return null

  const { players, turn, round } = game
  const ctxCard = ctx ? findCard(ctx.pid, ctx.iid) : null
  const ctrCard = ctr ? players[ctr.pid].battlefield.find((c) => c.iid === ctr.iid) : null

  // Build player mat props
  const makePlayerMatProps = (p: Player, isMain: boolean) => {
    // Ensure outerRefs entry exists
    if (!outerRefs.current[p.pid]) {
      outerRefs.current[p.pid] = { current: null }
    }
    
    return {
      key: p.pid,
      player: p,
      isActive: turn === p.pid,
      isMain,
      isLocal: localPid === p.pid,
      zoom: getZoom(p.pid),
      pan: getPan(p.pid),
      onPan: (newPan: { x: number; y: number }) => setPan(p.pid, newPan),
      onResetView: () => { setZoom(p.pid, uiSettings.defaultZoom); setPan(p.pid, { x: 0, y: 0 }) },
      cardScale: uiSettings.cardScale,
      onLife: (d: number) => changeLife(p.pid, d),
      onCardMD: (e: React.MouseEvent, iid: string) => onCardMD(e, p.pid, iid),
      onCardRC: (e: React.MouseEvent, iid: string, zone: string) => {
        e.preventDefault()
        e.stopPropagation()
        setCtx({ x: e.clientX, y: e.clientY, pid: p.pid, iid, zone: zone as ZoneType })
      },
      onHover: (c: CardInstance) => setHover(c),
      onHL: () => setHover(null),
      onZone: (zone: string) => openZone(p.pid, zone as ZoneType),
      onHandCardMD: (e: React.MouseEvent, iid: string) => onHandCardMD(e, p.pid, iid),
      isHandDragOver: handDragOver === p.pid,
      matRef: (el: HTMLDivElement | null) => { matRefs.current[p.pid] = el },
      outerScrollRef: outerRefs.current[p.pid],
      onZoomWithScroll: (newZoom: number, mx: number, my: number) => zoomAtCursor(p.pid, newZoom, mx, my)
    }
  }

  return (
    <div 
      onMouseDown={() => setCtx(null)}
      className="h-screen w-screen overflow-hidden bg-background flex flex-col select-none relative"
      style={{
        transform: `scale(${uiSettings.uiScale})`,
        transformOrigin: 'top left',
        width: `${100 / uiSettings.uiScale}%`,
        height: `${100 / uiSettings.uiScale}vh`,
        // Apply glass opacity as CSS variable
        '--glass-opacity': uiSettings.glassOpacity,
      } as React.CSSProperties}
    >
      {/* Main content - full screen player mats */}
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

      {/* Action Bar - positioned absolutely at playmat border intersection */}
      <CenterDivider 
        players={players}
        turn={turn}
        round={round}
        localPid={localPid}
        hasDrawnInitial={hasDrawnInitial[localPid] || false}
        zoom={getZoom(localPid)}
        onPassTurn={passTheTurn}
        onSettings={() => setSettingsOpen(true)}
        onLog={() => setLog(o => !o)}
        onDice={() => setDiceModal('dice')}
        onCoin={() => setDiceModal('coin')}
        logOpen={logOpen}
        onCmdDmg={(pid) => setDmg(pid)}
        onLife={changeLife}
        onDraw={(pid) => drawCards(pid, 1)}
        onDraw7={draw7}
        onUntapAll={untapAll}
      />

      {/* Action log popdown */}
      <ActionLogPopdown 
        entries={game.log} 
        open={logOpen} 
        onClose={() => setLog(false)} 
      />

      {/* Modals and overlays */}
      {ctx && ctxCard && (
        <div onMouseDown={(e) => e.stopPropagation()}>
          <ContextMenu 
            x={ctx.x} 
            y={ctx.y} 
            card={ctxCard} 
            zone={ctx.zone} 
            pal={players[ctx.pid].pal} 
            onAction={doCtx} 
          />
        </div>
      )}

      {/* Cursor-following card preview - constrained to viewport */}
      {hover && uiSettings.showZoomPanel && (
        <div 
          className="fixed z-[9998] pointer-events-none animate-card-enter"
          style={{
            // Constrain preview to stay within viewport
            left: Math.min(hoverPos.x + 20, (typeof window !== 'undefined' ? window.innerWidth : 1200) - 280),
            top: Math.max(20, Math.min(hoverPos.y - 100, (typeof window !== 'undefined' ? window.innerHeight : 800) - 450)),
          }}
        >
          <div className="w-52 rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/20">
            <CardImage src={hover.img} alt={hover.name} />
          </div>
          <div className="liquid-glass-readable mt-2 px-3 py-2.5 rounded-xl max-w-[220px]">
            {/* Mana cost */}
            {hover.manaCost && (
              <div className="mb-1.5">
                <ManaSymbols cost={hover.manaCost} size={18} useImages={false} />
              </div>
            )}
            <p className="text-sm font-semibold text-foreground">{hover.name}</p>
            {hover.typeLine && (
              <p className="text-xs text-muted-foreground mb-1.5">{hover.typeLine}</p>
            )}
            {/* Oracle text with mana symbols */}
            {hover.oracle && (
              <div className="text-xs text-foreground/80 leading-relaxed">
                <OracleText 
                  text={hover.oracle.length > 250 ? hover.oracle.slice(0, 250) + '...' : hover.oracle} 
                  symbolSize={12}
                />
              </div>
            )}
            {/* Power/Toughness for creatures */}
            {hover.power && hover.tough && (
              <p className="text-sm font-bold text-primary mt-1.5">{hover.power}/{hover.tough}</p>
            )}
          </div>
        </div>
      )}
      
      {/* Fixed panel fallback when showZoomPanel is disabled but we want full zoom */}
      {hover && !uiSettings.showZoomPanel && <CardZoom card={hover} />}

      {zv && (
        <ZoneViewer
          player={players[zv.pid]}
          zone={zv.zone}
          onClose={() => setZV(null)}
          onMove={(iid, z) => moveCard(zv.pid, iid, z)}
          onHover={(c) => setHover(c)}
          onHL={() => setHover(null)}
          onRC={(e, c) => {
            e.preventDefault()
            e.stopPropagation()
            setCtx({ x: e.clientX, y: e.clientY, pid: zv.pid, iid: c.iid, zone: zv.zone })
          }}
          onScry={(n) => openScry(zv.pid, n)}
          onMill={(n) => { millCards(zv.pid, n); setZV(null) }}
        />
      )}

      {ctr && ctrCard && (
        <CounterModal 
          card={ctrCard} 
          pal={players[ctr.pid].pal} 
          onAdd={addCtr} 
          onClose={() => setCtr(null)} 
        />
      )}

      {dmg !== null && (
        <CmdDmgModal 
          player={players[dmg]} 
          allPlayers={players} 
          onDmg={(fp, d) => addCmdDmg(dmg, fp, d)} 
          onClose={() => setDmg(null)} 
        />
      )}

      {settingsOpen && (
        <UISettingsModal
          settings={uiSettings}
          onChange={setUISettings}
          players={players}
          onPlaymat={(pid, field, val) => {
            mut((g) => {
              if (field === 'url') g.players[pid].playmat = val
              else if (field === 'fit') g.players[pid].playmatFit = val
            })
          }}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {toast && <Toast msg={toast} onDone={() => setToast(null)} />}
      
      {/* Damage toasts */}
      <DamageToastContainer 
        toasts={activeToasts}
        onRemove={removeDamageToast}
      />

      {scry && (
        <ScryModal
          pid={scry.pid}
          n={scry.n}
          cards={game.players[scry.pid].library.slice(0, scry.n)}
          pal={game.players[scry.pid].pal}
          onConfirm={(top, bot) => confirmScry(scry.pid, top, bot)}
          onClose={() => setScry(null)}
        />
      )}

      {diceModal && (
        <DiceModal
          mode={diceModal}
          onRoll={rollDice}
          onFlip={flipCoin}
          onLog={(msg) => mut((g) => { g.log = [msg, ...g.log.slice(0, 99)] })}
          onClose={() => setDiceModal(null)}
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

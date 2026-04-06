import type { CardData, CardInstance } from './game-types'

// Pre-embedded demo cards (real Scryfall data)
export const DEMO_DATA: CardData[] = [
  {name:'Sol Ring',manaCost:'{1}',cmc:1,typeLine:'Artifact',oracle:'Tap: Add {C}{C}.',power:null,tough:null,loyalty:null,rarity:'uncommon',set:'CMR',isLegendary:false,isCreature:false,isPlaneswalker:false,isLand:false,img:'https://cards.scryfall.io/normal/front/0/b/0bd02b38-bc69-4b6e-b1f7-c66b95f61bf5.jpg'},
  {name:'Lightning Bolt',manaCost:'{R}',cmc:1,typeLine:'Instant',oracle:'Lightning Bolt deals 3 damage to any target.',power:null,tough:null,loyalty:null,rarity:'common',set:'M11',isLegendary:false,isCreature:false,isPlaneswalker:false,isLand:false,img:'https://cards.scryfall.io/normal/front/e/3/e3285602-4f0f-4998-a5c0-a81e2be8de58.jpg'},
  {name:'Counterspell',manaCost:'{U}{U}',cmc:2,typeLine:'Instant',oracle:'Counter target spell.',power:null,tough:null,loyalty:null,rarity:'common',set:'7ED',isLegendary:false,isCreature:false,isPlaneswalker:false,isLand:false,img:'https://cards.scryfall.io/normal/front/8/e/8e2e3abe-4940-4444-ab73-9e3b3f23e88b.jpg'},
  {name:'Dark Ritual',manaCost:'{B}',cmc:1,typeLine:'Instant',oracle:'Add {B}{B}{B}.',power:null,tough:null,loyalty:null,rarity:'common',set:'A25',isLegendary:false,isCreature:false,isPlaneswalker:false,isLand:false,img:'https://cards.scryfall.io/normal/front/e/a/ea94a237-94a1-4b63-a52f-9a0d82489a70.jpg'},
  {name:'Giant Growth',manaCost:'{G}',cmc:1,typeLine:'Instant',oracle:'Target creature gets +3/+3 until end of turn.',power:null,tough:null,loyalty:null,rarity:'common',set:'M14',isLegendary:false,isCreature:false,isPlaneswalker:false,isLand:false,img:'https://cards.scryfall.io/normal/front/c/6/c69c5e9a-8e31-4e24-a3e5-b61985bf29e5.jpg'},
  {name:'Llanowar Elves',manaCost:'{G}',cmc:1,typeLine:'Creature — Elf Druid',oracle:'Tap: Add {G}.',power:'1',tough:'1',loyalty:null,rarity:'common',set:'M19',isLegendary:false,isCreature:true,isPlaneswalker:false,isLand:false,img:'https://cards.scryfall.io/normal/front/3/6/36833fe7-1f4a-4b4f-abb2-8e38be6da1e5.jpg'},
  {name:'Swords to Plowshares',manaCost:'{W}',cmc:1,typeLine:'Instant',oracle:'Exile target creature. Its controller gains life equal to its power.',power:null,tough:null,loyalty:null,rarity:'uncommon',set:'A25',isLegendary:false,isCreature:false,isPlaneswalker:false,isLand:false,img:'https://cards.scryfall.io/normal/front/6/f/6fad7162-e1af-4ffc-bf14-f50e76a84e62.jpg'},
  {name:'Brainstorm',manaCost:'{U}',cmc:1,typeLine:'Instant',oracle:'Draw three cards, then put two cards from your hand on top of your library in any order.',power:null,tough:null,loyalty:null,rarity:'common',set:'CNS',isLegendary:false,isCreature:false,isPlaneswalker:false,isLand:false,img:'https://cards.scryfall.io/normal/front/f/7/f74a2573-3a49-4826-a1bd-f1df84d38fb9.jpg'},
  {name:'Doom Blade',manaCost:'{1}{B}',cmc:2,typeLine:'Instant',oracle:'Destroy target nonblack creature.',power:null,tough:null,loyalty:null,rarity:'common',set:'M14',isLegendary:false,isCreature:false,isPlaneswalker:false,isLand:false,img:'https://cards.scryfall.io/normal/front/8/f/8f7cfc88-a98d-4b65-9a1d-7fb3f75ce0e7.jpg'},
  {name:'Command Tower',manaCost:'',cmc:0,typeLine:'Land',oracle:"Tap: Add one mana of any color in your commander's color identity.",power:null,tough:null,loyalty:null,rarity:'common',set:'CLB',isLegendary:false,isCreature:false,isPlaneswalker:false,isLand:true,img:'https://cards.scryfall.io/normal/front/4/2/42232ea6-e31d-46a6-9f94-b2ad2416d79b.jpg'},
  {name:'Arcane Signet',manaCost:'{2}',cmc:2,typeLine:'Artifact',oracle:"Tap: Add one mana of any color in your commander's color identity.",power:null,tough:null,loyalty:null,rarity:'common',set:'CMR',isLegendary:false,isCreature:false,isPlaneswalker:false,isLand:false,img:'https://cards.scryfall.io/normal/front/0/9/09bb1a87-3f40-4d54-9785-0a52a49437cf.jpg'},
  {name:'Mind Stone',manaCost:'{2}',cmc:2,typeLine:'Artifact',oracle:'Tap: Add {C}. {1}, Tap, Sacrifice Mind Stone: Draw a card.',power:null,tough:null,loyalty:null,rarity:'uncommon',set:'CMR',isLegendary:false,isCreature:false,isPlaneswalker:false,isLand:false,img:'https://cards.scryfall.io/normal/front/4/3/43ac02c7-67ac-4b9b-9f85-ec1d10461e3a.jpg'},
  {name:'Thought Vessel',manaCost:'{2}',cmc:2,typeLine:'Artifact',oracle:'You have no maximum hand size. Tap: Add {C}.',power:null,tough:null,loyalty:null,rarity:'common',set:'CMR',isLegendary:false,isCreature:false,isPlaneswalker:false,isLand:false,img:'https://cards.scryfall.io/normal/front/9/0/90878a14-d2e5-44ba-ba05-56f7e2990a98.jpg'},
  {name:'Swiftfoot Boots',manaCost:'{2}',cmc:2,typeLine:'Artifact — Equipment',oracle:'Equipped creature has hexproof and haste. Equip {1}.',power:null,tough:null,loyalty:null,rarity:'uncommon',set:'CMR',isLegendary:false,isCreature:false,isPlaneswalker:false,isLand:false,img:'https://cards.scryfall.io/normal/front/1/f/1f6d1bce-99b1-43c1-b3c9-e6f6e3c4c2d1.jpg'},
  {name:'Lightning Greaves',manaCost:'{2}',cmc:2,typeLine:'Artifact — Equipment',oracle:'Equipped creature has haste and shroud. Equip {0}.',power:null,tough:null,loyalty:null,rarity:'uncommon',set:'2XM',isLegendary:false,isCreature:false,isPlaneswalker:false,isLand:false,img:'https://cards.scryfall.io/normal/front/e/9/e9f23edd-56e2-4570-a1de-1f04d05e2afe.jpg'},
  {name:'Reliquary Tower',manaCost:'',cmc:0,typeLine:'Land',oracle:'You have no maximum hand size. Tap: Add {C}.',power:null,tough:null,loyalty:null,rarity:'uncommon',set:'CMR',isLegendary:false,isCreature:false,isPlaneswalker:false,isLand:true,img:'https://cards.scryfall.io/normal/front/0/e/0ef4ab62-d9ac-4625-ad18-25babde7aa46.jpg'},
  {name:'Wrath of God',manaCost:'{2}{W}{W}',cmc:4,typeLine:'Sorcery',oracle:"Destroy all creatures. They can't be regenerated.",power:null,tough:null,loyalty:null,rarity:'rare',set:'A25',isLegendary:false,isCreature:false,isPlaneswalker:false,isLand:false,img:'https://cards.scryfall.io/normal/front/d/b/db10e8bb-2d1e-4b5c-b2ff-acfdbd32ecb0.jpg'},
  {name:'Cyclonic Rift',manaCost:'{1}{U}',cmc:2,typeLine:'Instant',oracle:"Return target nonland permanent you don't control to its owner's hand. Overload {6}{U}.",power:null,tough:null,loyalty:null,rarity:'rare',set:'CMR',isLegendary:false,isCreature:false,isPlaneswalker:false,isLand:false,img:'https://cards.scryfall.io/normal/front/1/b/1b0d6060-fb0e-4dc8-bc0a-f5ef0e9f04da.jpg'},
  {name:'Chaos Warp',manaCost:'{2}{R}',cmc:3,typeLine:'Instant',oracle:"The owner of target permanent shuffles it into their library, then reveals the top card of their library. If it's a permanent card, they put it onto the battlefield.",power:null,tough:null,loyalty:null,rarity:'rare',set:'CMR',isLegendary:false,isCreature:false,isPlaneswalker:false,isLand:false,img:'https://cards.scryfall.io/normal/front/4/8/48a669b6-ab09-4499-97fa-b9f3b5a9d6ca.jpg'},
  {name:'Blasphemous Act',manaCost:'{8}{R}',cmc:9,typeLine:'Sorcery',oracle:'This spell costs {1} less to cast for each creature on the battlefield. Blasphemous Act deals 13 damage to each creature.',power:null,tough:null,loyalty:null,rarity:'rare',set:'CMR',isLegendary:false,isCreature:false,isPlaneswalker:false,isLand:false,img:'https://cards.scryfall.io/normal/front/1/0/10e5a71a-c1bc-4826-a4f0-98a86e7c6c81.jpg'},
  {name:'Murder',manaCost:'{1}{B}{B}',cmc:3,typeLine:'Instant',oracle:'Destroy target creature.',power:null,tough:null,loyalty:null,rarity:'common',set:'M21',isLegendary:false,isCreature:false,isPlaneswalker:false,isLand:false,img:'https://cards.scryfall.io/normal/front/0/a/0a9e7dbc-b764-4b37-8ed4-a8f5dab9f6ac.jpg'},
  {name:'Naturalize',manaCost:'{1}{G}',cmc:2,typeLine:'Instant',oracle:'Destroy target artifact or enchantment.',power:null,tough:null,loyalty:null,rarity:'common',set:'M14',isLegendary:false,isCreature:false,isPlaneswalker:false,isLand:false,img:'https://cards.scryfall.io/normal/front/6/9/694f01bf-f5ec-4375-a5e3-e29b7e54fe25.jpg'},
  {name:'Negate',manaCost:'{1}{U}',cmc:2,typeLine:'Instant',oracle:'Counter target noncreature spell.',power:null,tough:null,loyalty:null,rarity:'common',set:'M20',isLegendary:false,isCreature:false,isPlaneswalker:false,isLand:false,img:'https://cards.scryfall.io/normal/front/8/6/86b1ff45-f7e2-4d18-9d7d-2fb9c1dbc573.jpg'},
  {name:'Swan Song',manaCost:'{U}',cmc:1,typeLine:'Instant',oracle:'Counter target enchantment, instant, or sorcery spell. Its controller creates a 2/2 blue Bird creature token with flying.',power:null,tough:null,loyalty:null,rarity:'rare',set:'THS',isLegendary:false,isCreature:false,isPlaneswalker:false,isLand:false,img:'https://cards.scryfall.io/normal/front/b/6/b6f37385-4878-4b6a-8a15-dac872ab0dec.jpg'},
  {name:'Eternal Witness',manaCost:'{1}{G}{G}',cmc:3,typeLine:'Creature — Human Shaman',oracle:'When Eternal Witness enters the battlefield, you may return target card from your graveyard to your hand.',power:'2',tough:'1',loyalty:null,rarity:'uncommon',set:'5DN',isLegendary:false,isCreature:true,isPlaneswalker:false,isLand:false,img:'https://cards.scryfall.io/normal/front/e/a/eada5a11-5bb4-4900-a462-93a0ee5e748a.jpg'},
  {name:'Solemn Simulacrum',manaCost:'{4}',cmc:4,typeLine:'Artifact Creature — Golem',oracle:'When Solemn Simulacrum enters the battlefield, you may search your library for a basic land card, put that card onto the battlefield tapped, then shuffle. When Solemn Simulacrum dies, you may draw a card.',power:'2',tough:'2',loyalty:null,rarity:'rare',set:'CMR',isLegendary:false,isCreature:true,isPlaneswalker:false,isLand:false,img:'https://cards.scryfall.io/normal/front/9/e/9e64dd5e-7b54-4d58-9c25-43b3ef09e0cb.jpg'},
  {name:'Burnished Hart',manaCost:'{3}',cmc:3,typeLine:'Artifact Creature — Elk',oracle:'{3}, Sacrifice Burnished Hart: Search your library for up to two basic land cards, put them onto the battlefield tapped, then shuffle.',power:'2',tough:'2',loyalty:null,rarity:'uncommon',set:'CMR',isLegendary:false,isCreature:true,isPlaneswalker:false,isLand:false,img:'https://cards.scryfall.io/normal/front/0/2/02bc76fb-f372-4c94-b03c-e5c764f28819.jpg'},
  {name:'Mulldrifter',manaCost:'{4}{U}',cmc:5,typeLine:'Creature — Elemental',oracle:'Flying. When Mulldrifter enters the battlefield, draw two cards. Evoke {2}{U}.',power:'2',tough:'2',loyalty:null,rarity:'common',set:'CMR',isLegendary:false,isCreature:true,isPlaneswalker:false,isLand:false,img:'https://cards.scryfall.io/normal/front/5/a/5a9c8cfd-acde-45e2-a7c9-78e9da63e60a.jpg'},
  {name:'Thran Dynamo',manaCost:'{4}',cmc:4,typeLine:'Artifact',oracle:'Tap: Add {C}{C}{C}.',power:null,tough:null,loyalty:null,rarity:'uncommon',set:'CMR',isLegendary:false,isCreature:false,isPlaneswalker:false,isLand:false,img:'https://cards.scryfall.io/normal/front/c/5/c5d6be47-9d11-4dfe-a456-2ca7a9ce5f52.jpg'},
  {name:'Cultivate',manaCost:'{2}{G}',cmc:3,typeLine:'Sorcery',oracle:'Search your library for up to two basic land cards, reveal those cards, put one onto the battlefield tapped and the other into your hand, then shuffle.',power:null,tough:null,loyalty:null,rarity:'common',set:'CMR',isLegendary:false,isCreature:false,isPlaneswalker:false,isLand:false,img:'https://cards.scryfall.io/normal/front/9/9/99f79746-dc4d-4b86-8f48-aa4b69fa04a4.jpg'},
  {name:'Farseek',manaCost:'{1}{G}',cmc:2,typeLine:'Sorcery',oracle:'Search your library for a Plains, Island, Swamp, Mountain, or Forest card, put it onto the battlefield tapped, then shuffle.',power:null,tough:null,loyalty:null,rarity:'common',set:'M13',isLegendary:false,isCreature:false,isPlaneswalker:false,isLand:false,img:'https://cards.scryfall.io/normal/front/4/d/4ddce7b8-29dc-40e1-9cd3-00ea6e1de46b.jpg'},
  {name:'Path to Exile',manaCost:'{W}',cmc:1,typeLine:'Instant',oracle:'Exile target creature. Its controller may search their library for a basic land card, put that card onto the battlefield tapped, then shuffle.',power:null,tough:null,loyalty:null,rarity:'uncommon',set:'MMA',isLegendary:false,isCreature:false,isPlaneswalker:false,isLand:false,img:'https://cards.scryfall.io/normal/front/5/e/5e4a7b9a-3db7-4c1f-a6da-9c41b71568c0.jpg'},
  {name:'Beast Within',manaCost:'{2}{G}',cmc:3,typeLine:'Instant',oracle:'Destroy target permanent. Its controller creates a 3/3 green Beast creature token.',power:null,tough:null,loyalty:null,rarity:'uncommon',set:'CMR',isLegendary:false,isCreature:false,isPlaneswalker:false,isLand:false,img:'https://cards.scryfall.io/normal/front/8/3/83e08546-e643-4916-a53a-4dc0bc204c13.jpg'},
  {name:'Rampant Growth',manaCost:'{1}{G}',cmc:2,typeLine:'Sorcery',oracle:'Search your library for a basic land card, put that card onto the battlefield tapped, then shuffle.',power:null,tough:null,loyalty:null,rarity:'common',set:'M12',isLegendary:false,isCreature:false,isPlaneswalker:false,isLand:false,img:'https://cards.scryfall.io/normal/front/a/1/a19caf81-9a38-469b-a5f2-f2f0adcca523.jpg'},
  {name:'Disenchant',manaCost:'{1}{W}',cmc:2,typeLine:'Instant',oracle:'Destroy target artifact or enchantment.',power:null,tough:null,loyalty:null,rarity:'common',set:'A25',isLegendary:false,isCreature:false,isPlaneswalker:false,isLand:false,img:'https://cards.scryfall.io/normal/front/e/3/e3f3fc2c-2f95-4d03-8143-2db1b5ab1daa.jpg'},
]

// Build lookup cache
const DEMO_CACHE: Record<string, CardData> = {}
DEMO_DATA.forEach((d) => { DEMO_CACHE[d.name.toLowerCase()] = d })

// Scryfall fetch cache
const sfCache: Record<string, CardData | null> = {}

// Fetch cards from Scryfall API
export async function fetchScryfall(
  names: string[], 
  onProgress?: (done: number, total: number, current: string) => void
): Promise<void> {
  const unique: string[] = []
  const seen: Record<string, boolean> = {}
  
  names.forEach((n) => {
    const k = n.trim().toLowerCase()
    if (k && !seen[k] && !(k in sfCache) && !(k in DEMO_CACHE)) {
      seen[k] = true
      unique.push(n.trim())
    }
  })

  if (unique.length === 0) {
    onProgress?.(names.length, names.length, '')
    return
  }

  const CHUNK = 75
  let done = 0
  
  for (let i = 0; i < unique.length; i += CHUNK) {
    const chunk = unique.slice(i, i + CHUNK)
    onProgress?.(done, unique.length, chunk[0])
    
    try {
      const res = await fetch('https://api.scryfall.com/cards/collection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifiers: chunk.map((n) => ({ name: n })) }),
      })
      
      if (!res.ok) throw new Error('HTTP ' + res.status)
      
      const json = await res.json()
      
      ;(json.data || []).forEach((d: Record<string, unknown>) => {
        const cf = d.card_faces as Array<Record<string, unknown>> | undefined
        const mdfc = !!(cf && cf[0] && (cf[0] as Record<string, Record<string, string>>).image_uris)
        
        const card: CardData = {
          name: d.name as string,
          manaCost: (d.mana_cost as string) || (cf && cf[0] ? (cf[0].mana_cost as string) : '') || '',
          cmc: (d.cmc as number) || 0,
          typeLine: (d.type_line as string) || '',
          oracle: (d.oracle_text as string) || (cf ? cf.map((f) => (f.oracle_text as string) || '').join(' | ') : ''),
          power: (d.power as string) || (cf && cf[0] ? (cf[0].power as string) : null),
          tough: (d.toughness as string) || (cf && cf[0] ? (cf[0].toughness as string) : null),
          loyalty: (d.loyalty as string) || null,
          rarity: (d.rarity as string) || 'common',
          set: ((d.set as string) || '???').toUpperCase(),
          isLegendary: ((d.type_line as string) || '').includes('Legendary'),
          isCreature: ((d.type_line as string) || '').includes('Creature'),
          isPlaneswalker: ((d.type_line as string) || '').includes('Planeswalker'),
          isLand: ((d.type_line as string) || '').includes('Land'),
          mdfc,
          img: ((d.image_uris as Record<string, string>)?.normal) || 
               (cf && cf[0] && (cf[0].image_uris as Record<string, string>)?.normal) || null,
          imgBack: mdfc ? ((cf?.[1]?.image_uris as Record<string, string>)?.normal || null) : null,
          backName: mdfc && cf?.[1] ? (cf[1].name as string) : null,
          backType: mdfc && cf?.[1] ? (cf[1].type_line as string) : null,
          backPower: mdfc && cf?.[1] ? (cf[1].power as string) : null,
          backTough: mdfc && cf?.[1] ? (cf[1].toughness as string) : null,
        }
        
        sfCache[(d.name as string).toLowerCase()] = card
        chunk.forEach((sn) => {
          const slo = sn.toLowerCase()
          if (!(slo in sfCache) && (d.name as string).toLowerCase().includes(slo)) {
            sfCache[slo] = card
          }
        })
      })
      
      ;(json.not_found || []).forEach((nf: { name?: string }) => {
        if (nf.name) sfCache[nf.name.toLowerCase()] = null
      })
    } catch (err) {
      console.warn('Scryfall fetch failed:', (err as Error).message)
      chunk.forEach((n) => { sfCache[n.toLowerCase()] = null })
    }
    
    done += chunk.length
    if (i + CHUNK < unique.length) {
      await new Promise((r) => setTimeout(r, 110))
    }
  }
  
  onProgress?.(done, unique.length, '')
}

export function lookupCard(name: string): CardData | null {
  const k = name.trim().toLowerCase()
  return DEMO_CACHE[k] || sfCache[k] || null
}

// Deck parser
export function parseDeck(text: string): Array<{ name: string; section: string }> {
  if (!text?.trim()) return []
  
  const cards: Array<{ name: string; section: string }> = []
  let section = 'main'
  
  text.split('\n').forEach((raw) => {
    const line = raw.trim()
    if (!line || line[0] === '/' || line[0] === '#') return
    
    const lo = line.toLowerCase()
    if (lo === 'commander' || lo === 'commanders') { section = 'commander'; return }
    if (lo === 'deck' || lo === 'main' || lo === 'mainboard') { section = 'main'; return }
    if (lo === 'sideboard' || lo === 'side' || lo === 'maybeboard') { section = 'side'; return }
    if (section === 'side') return
    
    const m = line.match(/^(\d+)\s*[xX]?\s+(.+?)(?:\s+\([\w\d-]+\)[\s\d]*)?$/)
    if (m) {
      const qty = parseInt(m[1], 10)
      const name = m[2].trim().split(' // ')[0].trim()
      if (name) {
        for (let q = 0; q < qty; q++) {
          cards.push({ name, section })
        }
      }
    }
  })
  
  return cards
}

// Create card instance from data
export function createCardInstance(data: CardData): CardInstance {
  return {
    ...data,
    iid: crypto.randomUUID(),
    tapped: false,
    showBack: false,
    faceDown: false,
    summonSick: false,
    counters: {},
    x: 5 + Math.random() * 55,
    y: 5 + Math.random() * 55,
    z: 1,
  }
}

// Shuffle array
export function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const t = a[i]
    a[i] = a[j]
    a[j] = t
  }
  return a
}

// Get rarity color
export function getRarityColor(rarity: string): string {
  const colors: Record<string, string> = {
    common: '#7a8090',
    uncommon: '#9aacb8',
    rare: '#b89040',
    mythic: '#c06828'
  }
  return colors[rarity] || '#7a8090'
}

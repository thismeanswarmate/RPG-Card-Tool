import { createContext, useContext } from 'react'
import { create, useStore as useZustand, type StoreApi } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { EXPANSION_CARDS, EXPANSIONS } from './expansions'
import { STARTER } from './starter'
import { autoEdge, childrenOf, freeSpot, layout, shuffle, SIZE, type Cards } from './logic'
import { BASE_TYPES, EXTRA_TYPES, isHub, TYPES, type CardDef, type CardType, type Edge, type Held, type Link, type Placed } from './types'

const DOUBLED: CardType[] = ['site', 'epithet', 'trait', 'question']

/** Size of the table viewport in pixels, kept up to date by the Table component. */
export const viewport = { w: 1000, h: 700 }

export interface Data {
  init: boolean
  custom: CardDef[]
  disabled: string[]
  /** Card types switched on for each expansion; an expansion that is absent here is off. */
  expansions: Record<string, CardType[]>
  piles: Record<CardType, string[]>
  hand: Held[]
  discards: string[]
  side: Partial<Record<CardType, string>> | null
  meta: Held[]
  placed: Record<string, Placed>
  links: Link[]
  notes: Record<string, string>
  view: { x: number; y: number; k: number }
  selected: string | null
  focus: string | null
  linking: string | null
  guide: { on: boolean; complex: boolean; step: number; drawn: boolean }
  seq: number
}

interface Actions {
  reset(): void
  load(data: Partial<Data>): void
  draw(type: CardType, n?: number): void
  guideDraw(): void
  guideNext(): void
  setGuide(g: Partial<Data['guide']>): void
  toggleSide(): void
  takeSide(type: CardType): void
  keep(id: string): void
  tuck(id: string, hub: string, edge: Edge): void
  move(id: string, x: number, y: number, front?: boolean): void
  rotate(id: string): void
  setActive(id: string, i: number): void
  discard(id: string): void
  toMeta(id: string): void
  toHand(id: string): void
  select(id: string | null): void
  startLink(id: string | null): void
  addLink(a: string, b: string): void
  setLink(id: string, note: string | null): void
  setNote(id: string, text: string): void
  setView(v: Data['view']): void
  saveCustom(card: CardDef): void
  deleteCustom(id: string): void
  toggleDeck(deck: string): void
  toggleExpansion(id: string): void
  toggleExpansionType(id: string, type: CardType): void
  fit(): void
  generate(size: WorldSize): void
}

export type State = Data & Actions

export type WorldSize = 'small' | 'medium' | 'large'
/** How many microsettings a generated world holds, by map size. */
export const WORLD_SIZES: Record<WorldSize, { label: string; min: number; max: number }> = {
  small: { label: 'Small — 5 to 7 places', min: 5, max: 7 },
  medium: { label: 'Medium — 9 to 14 places', min: 9, max: 14 },
  large: { label: 'Large — 14 to 20 places', min: 14, max: 20 },
}

const emptyPiles = () => Object.fromEntries(TYPES.map((t) => [t, [] as string[]])) as Record<CardType, string[]>

export const blank = (): Data => ({
  init: true, custom: [], disabled: [], expansions: {}, piles: emptyPiles(), hand: [], discards: [], side: null, meta: [],
  placed: {}, links: [], notes: {}, view: { x: 0, y: 0, k: 1 }, selected: null, focus: null, linking: null,
  guide: { on: true, complex: false, step: 0, drawn: false }, seq: 1,
})

let cache: { custom: CardDef[]; map: Cards } | null = null
export function cardsOf(s: Pick<Data, 'custom'>): Cards {
  if (cache?.custom !== s.custom)
    cache = { custom: s.custom, map: Object.fromEntries([...STARTER, ...EXPANSION_CARDS, ...s.custom].map((c) => [c.id, c])) }
  return cache.map
}

type Decks = Pick<Data, 'custom' | 'disabled' | 'expansions'>

/** Whether a card's deck, and for an expansion its card type, is switched on. */
export const enabled = (s: Decks, c: CardDef) =>
  c.deck === 'starter' || c.deck === 'custom' ? !s.disabled.includes(c.deck) : !!s.expansions[c.deck]?.includes(c.type)

/** The extra card types in play, from expansions or custom cards. */
export const extraTypes = (s: Decks): CardType[] => {
  const all = Object.values(cardsOf(s))
  return EXTRA_TYPES.filter((t) => all.some((c) => c.type === t && enabled(s, c)))
}

/** The guided steps: the six basics, then one step for each extra type in play. */
export const guideSteps = (s: Decks): CardType[] => [...BASE_TYPES, ...extraTypes(s)]

const inUse = (s: Data) =>
  new Set([
    ...s.hand.map((h) => h.card), ...s.meta.map((h) => h.card), ...s.discards,
    ...Object.values(s.side ?? {}), ...Object.keys(s.placed),
  ])

export function rebuild(s: Data) {
  const used = inUse(s)
  const all = Object.values(cardsOf(s)).filter((c) => enabled(s, c) && !used.has(c.id))
  for (const t of TYPES) s.piles[t] = shuffle(all.filter((c) => c.type === t).map((c) => c.id))
}

function pop(s: Data, type: CardType): string | undefined {
  if (!s.piles[type].length) {
    const cards = cardsOf(s)
    const back = s.discards.filter((id) => cards[id]?.type === type)
    s.discards = s.discards.filter((id) => !back.includes(id))
    s.piles[type] = shuffle(back)
  }
  return s.piles[type].pop()
}

/** Take a card out of wherever it currently is. Returns its active cue. */
function remove(s: Data, id: string): number {
  let active = 0
  const held = [...s.hand, ...s.meta].find((h) => h.card === id)
  if (held) active = held.active
  s.hand = s.hand.filter((h) => h.card !== id)
  s.meta = s.meta.filter((h) => h.card !== id)
  s.discards = s.discards.filter((d) => d !== id)
  const p = s.placed[id]
  if (p) {
    active = p.active
    const pos = layout(s.placed, cardsOf(s))
    for (const c of childrenOf(s.placed, id)) {
      const q = s.placed[c.id]
      q.parent = undefined
      q.edge = undefined
      q.x = pos[c.id].x
      q.y = pos[c.id].y
    }
    delete s.placed[id]
    s.links = s.links.filter((l) => l.a !== id && l.b !== id)
    if (s.selected === id) s.selected = null
    if (s.focus === id) s.focus = null
    if (s.linking === id) s.linking = null
  }
  return active
}

/** Screen point new cards are placed around: higher up on a phone, where the hand covers the lower half. */
const focal = () => ({ x: viewport.w / 2, y: viewport.h * (viewport.w < 760 ? 0.3 : 0.5) })
const centre = (s: Data) => ({ x: (focal().x - s.view.x) / s.view.k, y: (focal().y - s.view.y) / s.view.k })

export function targetHub(s: Data): string | null {
  const cards = cardsOf(s)
  const sel = s.selected && s.placed[s.selected]
  if (sel) {
    if (isHub(cards[sel.id].type)) return sel.id
    if (sel.parent) return sel.parent
  }
  return s.focus && s.placed[s.focus] ? s.focus : null
}

export const MIN_ZOOM = 0.12

/** Zoom and pan so that every card on the table is in view. */
function fitView(s: Data) {
  const pos = Object.values(layout(s.placed, cardsOf(s)))
  if (!pos.length) { s.view = { x: 0, y: 0, k: 1 }; return }
  const pad = 30
  const x0 = Math.min(...pos.map((p) => p.x)) - pad
  const y0 = Math.min(...pos.map((p) => p.y)) - pad
  const w = Math.max(...pos.map((p) => p.x)) + SIZE + pad - x0
  const h = Math.max(...pos.map((p) => p.y)) + SIZE + pad - y0
  const k = Math.max(MIN_ZOOM, Math.min(1, viewport.w / w, viewport.h / h))
  s.view = { k, x: (viewport.w - w * k) / 2 - x0 * k, y: (viewport.h - h * k) / 2 - y0 * k }
}

const rand = (n: number) => Math.floor(Math.random() * n)
const HEX = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, -1], [-1, 1]]

/** An irregular blob of n cells on a hex grid, grown outward from the middle. */
function blob(n: number): [number, number][] {
  const cells: [number, number][] = [[0, 0]]
  const has = (q: number, r: number) => cells.some((c) => c[0] === q && c[1] === r)
  const dist = ([q, r]: number[]) => Math.hypot(q + r / 2, r * 0.87)
  while (cells.length < n) {
    const open = cells.flatMap(([q, r]) => HEX.map(([a, b]) => [q + a, r + b] as [number, number])).filter(([q, r]) => !has(q, r))
    const a = open[rand(open.length)]
    const b = open[rand(open.length)]
    cells.push(dist(a) < dist(b) ? a : b)
  }
  return cells
}

/**
 * Fill an empty table with a whole world: a meta row chosen from two draws of each type, then a run of
 * microsettings that alternate between simple (one of everything) and complex (two Sites, Epithets and
 * Traits drawn, one or both kept).
 */
export function generateWorld(s: Data, size: WorldSize, prepare?: (s: Data) => void) {
  Object.assign(s, blank(), { custom: s.custom, disabled: s.disabled, expansions: s.expansions, guide: { ...s.guide } })
  rebuild(s)
  prepare?.(s)
  const cards = cardsOf(s)
  const cue = (id: string) => rand(cards[id].cues.length)

  for (const t of ['epithet', 'legacy', 'trait', 'omen'] as CardType[]) {
    const [keep, spare] = [pop(s, t), pop(s, t)]
    if (keep) s.meta.push({ card: keep, active: cue(keep) })
    if (spare) s.discards.push(spare)
  }

  const everywhere = pop(s, 'question')
  if (everywhere) s.meta.push({ card: everywhere, active: cue(everywhere) })

  const { min, max } = WORLD_SIZES[size]
  const count = Math.min(min + rand(max - min + 1), s.piles.terrain.length)
  let complex = Math.random() < 0.5

  const tuck = (id: string, hub: string, active: number) => {
    s.placed[id] = { id, active, x: 0, y: 0, parent: hub, edge: autoEdge(s.placed, cards, hub, cards[id], active), order: ++s.seq }
  }
  /** Draw one card, or two for a complex microsetting, keeping one or both. */
  const drawFor = (type: CardType, doubled: boolean) => {
    const got = [pop(s, type), doubled ? pop(s, type) : undefined].filter((c): c is string => !!c)
    if (got.length === 2 && Math.random() < 0.5) s.discards.push(got.pop()!)
    return got
  }

  for (const [q, r] of blob(count)) {
    const terrain = pop(s, 'terrain')
    if (!terrain) break
    s.placed[terrain] = { id: terrain, active: 0, x: (q + r / 2) * 560 + rand(80) - 40, y: r * 490 + rand(80) - 40, order: ++s.seq }
    const hubs = [terrain]
    const anyHub = () => hubs[rand(hubs.length)]

    for (const id of drawFor('site', complex)) { tuck(id, terrain, cue(id)); hubs.push(id) }
    for (const id of drawFor('epithet', complex)) {
      const hub = anyHub()
      const opened = childrenOf(s.placed, hub).some((c) => cards[c.id].type === 'epithet' && c.active === 0)
      tuck(id, hub, opened ? 1 + rand(3) : cue(id))
    }
    for (const id of drawFor('legacy', false)) tuck(id, anyHub(), cue(id))
    for (const id of drawFor('trait', complex)) tuck(id, anyHub(), cue(id))
    for (const id of drawFor('omen', false)) tuck(id, terrain, cue(id))
    // Extras, when an expansion brings them in: questions about the people, a piece of lore with its
    // twist, and a quest pinned above about half the places.
    for (const id of drawFor('question', complex)) tuck(id, anyHub(), cue(id))
    for (const id of drawFor('work', false)) {
      tuck(id, terrain, cue(id))
      for (const t of drawFor('twist', false)) tuck(t, terrain, cue(t))
    }
    if (Math.random() < 0.5) for (const id of drawFor('quest', false)) tuck(id, terrain, 0)
    complex = !complex
  }
  fitView(s)
}

export type Mode = 'custom' | 'auto'
type Api = StoreApi<State>

const makeStore = (name: string) => create<State>()(

  persist(
    immer((set) => ({
      ...blank(),
      init: false,

      reset: () => set((s) => { Object.assign(s, blank(), { custom: s.custom, disabled: s.disabled, expansions: s.expansions }); rebuild(s) }),

      load: (data) => set((s) => {
        Object.assign(s, blank(), data, { init: true, linking: null })
        if (!data.piles) rebuild(s)
        else s.piles = { ...emptyPiles(), ...s.piles }
      }),

      draw: (type, n = 1) => set((s) => {
        for (let i = 0; i < n; i++) {
          const id = pop(s, type)
          if (id) s.hand.push({ card: id, active: 0 })
        }
      }),

      guideDraw: () => set((s) => {
        const type = guideSteps(s)[s.guide.step] ?? 'terrain'
        const n = s.guide.complex && DOUBLED.includes(type) ? 2 : 1
        for (let i = 0; i < n; i++) {
          const id = pop(s, type)
          if (id) s.hand.push({ card: id, active: 0 })
        }
        if (type === 'terrain') { s.focus = null; s.selected = null }
        s.guide.drawn = true
      }),

      guideNext: () => set((s) => { s.guide.step = (s.guide.step + 1) % guideSteps(s).length; s.guide.drawn = false }),

      setGuide: (g) => set((s) => { Object.assign(s.guide, g) }),

      toggleSide: () => set((s) => {
        if (s.side) {
          const cards = cardsOf(s)
          for (const id of Object.values(s.side)) s.piles[cards[id].type] = shuffle([...s.piles[cards[id].type], id])
          s.side = null
        } else {
          s.side = {}
          for (const t of TYPES) { const id = pop(s, t); if (id) s.side[t] = id }
        }
      }),

      takeSide: (type) => set((s) => {
        const id = s.side?.[type]
        if (!s.side || !id) return
        s.hand.push({ card: id, active: 0 })
        const next = pop(s, type)
        if (next) s.side[type] = next
        else delete s.side[type]
      }),

      keep: (id) => set((s) => {
        const cards = cardsOf(s)
        const card = cards[id]
        const active = remove(s, id)
        const order = ++s.seq
        const hub = card.type === 'terrain' ? null : targetHub(s)
        if (hub) {
          s.placed[id] = { id, active, x: 0, y: 0, parent: hub, edge: autoEdge(s.placed, cards, hub, card, active), order }
        } else {
          const c = centre(s)
          const spot = freeSpot(s.placed, c.x, c.y, card.type === 'terrain' ? 440 : SIZE * 1.2)
          s.placed[id] = { id, active, ...spot, order }
        }
        if (card.type === 'terrain') {
          s.focus = id
          const p = s.placed[id]
          s.view.x = focal().x - (p.x + SIZE / 2) * s.view.k
          s.view.y = focal().y - (p.y + SIZE / 2) * s.view.k
        }
        s.selected = hub ?? id
      }),

      tuck: (id, hub, edge) => set((s) => {
        const p = s.placed[id]
        if (!p || !s.placed[hub]) return
        Object.assign(p, { parent: hub, edge, order: ++s.seq })
      }),

      move: (id, x, y, front) => set((s) => {
        const p = s.placed[id]
        if (!p) return
        Object.assign(p, { parent: undefined, edge: undefined, x, y })
        if (front) p.order = ++s.seq
      }),

      rotate: (id) => set((s) => {
        const n = cardsOf(s)[id].cues.length
        const t = s.placed[id] ?? [...s.hand, ...s.meta].find((h) => h.card === id)
        if (t) t.active = (t.active + 1) % n
      }),

      setActive: (id, i) => set((s) => {
        const t = s.placed[id] ?? [...s.hand, ...s.meta].find((h) => h.card === id)
        if (t) t.active = i
      }),

      discard: (id) => set((s) => { remove(s, id); s.discards.push(id) }),

      toMeta: (id) => set((s) => { const active = remove(s, id); s.meta.push({ card: id, active }) }),

      toHand: (id) => set((s) => { const active = remove(s, id); s.hand.push({ card: id, active }) }),

      select: (id) => set((s) => { s.selected = id }),

      startLink: (id) => set((s) => { s.linking = id }),

      addLink: (a, b) => set((s) => {
        s.linking = null
        if (a === b || s.links.some((l) => (l.a === a && l.b === b) || (l.a === b && l.b === a))) return
        s.links.push({ id: `l${++s.seq}`, a, b, note: '' })
      }),

      setLink: (id, note) => set((s) => {
        if (note === null) s.links = s.links.filter((l) => l.id !== id)
        else { const l = s.links.find((x) => x.id === id); if (l) l.note = note }
      }),

      setNote: (id, text) => set((s) => { s.notes[id] = text }),

      setView: (v) => set((s) => { s.view = v }),

      saveCustom: (card) => set((s) => {
        const i = s.custom.findIndex((c) => c.id === card.id)
        if (i >= 0) s.custom[i] = card
        else { s.custom.push(card); if (enabled(s, card)) s.piles[card.type] = shuffle([...s.piles[card.type], card.id]) }
      }),

      deleteCustom: (id) => set((s) => {
        remove(s, id)
        for (const t of TYPES) {
          s.piles[t] = s.piles[t].filter((c) => c !== id)
          if (s.side?.[t] === id) delete s.side[t]
        }
        s.custom = s.custom.filter((c) => c.id !== id)
      }),

      toggleDeck: (deck) => set((s) => {
        s.disabled = s.disabled.includes(deck) ? s.disabled.filter((d) => d !== deck) : [...s.disabled, deck]
        rebuild(s)
      }),

      toggleExpansion: (id) => set((s) => {
        if (s.expansions[id]?.length) delete s.expansions[id]
        else s.expansions[id] = [...(EXPANSIONS.find((e) => e.id === id)?.types ?? [])]
        s.guide.step = 0
        s.guide.drawn = false
        rebuild(s)
      }),

      toggleExpansionType: (id, type) => set((s) => {
        const on = s.expansions[id] ?? []
        const next = on.includes(type) ? on.filter((t) => t !== type) : [...on, type]
        if (next.length) s.expansions[id] = next
        else delete s.expansions[id]
        s.guide.step = 0
        s.guide.drawn = false
        rebuild(s)
      }),

      fit: () => set((s) => { fitView(s) }),

      generate: (size) => set((s) => { generateWorld(s, size) }),
    })),
    { name },
  ),
)

/** Each tab keeps its own, separately saved world. */
export const stores: Record<Mode, Api> = { custom: makeStore('worldloom-v1'), auto: makeStore('worldloom-auto-v1') }
for (const api of Object.values(stores)) {
  if (!api.getState().init) api.getState().reset()
  // A world saved before the deck grew: shuffle the cards it has never seen into its piles.
  else (api.setState as (recipe: (s: State) => void) => void)((s) => {
    s.piles = { ...emptyPiles(), ...s.piles }
    const known = new Set([...inUse(s), ...TYPES.flatMap((t) => s.piles[t])])
    for (const c of Object.values(cardsOf(s)))
      if (!known.has(c.id) && enabled(s, c)) s.piles[c.type] = shuffle([...s.piles[c.type], c.id])
  })
}

// Decks, expansions and custom cards are one setting shared by both tabs: a change in either world is
// copied to the other, whose draw piles are then reshuffled.
const deckKeys = ['custom', 'disabled', 'expansions'] as const
const sameDecks = (a: State, b: State) => deckKeys.every((k) => a[k] === b[k] || JSON.stringify(a[k]) === JSON.stringify(b[k]))
const copyDecks = (from: Api, to: Api) => {
  const src = from.getState()
  if (sameDecks(src, to.getState())) return
  ;(to.setState as (recipe: (s: State) => void) => void)((s) => {
    Object.assign(s, { custom: src.custom, disabled: src.disabled, expansions: src.expansions })
    s.guide.step = 0
    s.guide.drawn = false
    rebuild(s)
  })
}
copyDecks(stores.custom, stores.auto)
stores.custom.subscribe(() => copyDecks(stores.custom, stores.auto))
stores.auto.subscribe(() => copyDecks(stores.auto, stores.custom))

export const WorldCtx = createContext<Mode>('custom')
export const useMode = () => useContext(WorldCtx)
export const useApi = () => stores[useContext(WorldCtx)]
export const useStore = () => useZustand(useApi())

/** The saved portion of the state, for export. */
export function snapshot(api: Api): Data {
  const s = api.getState()
  return JSON.parse(JSON.stringify(Object.fromEntries(Object.entries(s).filter(([, v]) => typeof v !== 'function'))))
}

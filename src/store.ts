import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { STARTER } from './starter'
import { autoEdge, childrenOf, freeSpot, layout, shuffle, SIZE, type Cards } from './logic'
import { isHub, TYPES, type CardDef, type CardType, type Edge, type Held, type Link, type Placed } from './types'

export const GUIDE_STEPS: CardType[] = ['terrain', 'site', 'epithet', 'legacy', 'trait', 'omen']
const DOUBLED: CardType[] = ['site', 'epithet', 'trait']

/** Size of the table viewport in pixels, kept up to date by the Table component. */
export const viewport = { w: 1000, h: 700 }

interface Data {
  init: boolean
  custom: CardDef[]
  disabled: string[]
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
}

export type State = Data & Actions

const emptyPiles = () => Object.fromEntries(TYPES.map((t) => [t, [] as string[]])) as Record<CardType, string[]>

const blank = (): Data => ({
  init: true, custom: [], disabled: [], piles: emptyPiles(), hand: [], discards: [], side: null, meta: [],
  placed: {}, links: [], notes: {}, view: { x: 0, y: 0, k: 1 }, selected: null, focus: null, linking: null,
  guide: { on: true, complex: false, step: 0, drawn: false }, seq: 1,
})

let cache: { custom: CardDef[]; map: Cards } | null = null
export function cardsOf(s: Pick<Data, 'custom'>): Cards {
  if (cache?.custom !== s.custom)
    cache = { custom: s.custom, map: Object.fromEntries([...STARTER, ...s.custom].map((c) => [c.id, c])) }
  return cache.map
}

const inUse = (s: Data) =>
  new Set([
    ...s.hand.map((h) => h.card), ...s.meta.map((h) => h.card), ...s.discards,
    ...Object.values(s.side ?? {}), ...Object.keys(s.placed),
  ])

function rebuild(s: Data) {
  const used = inUse(s)
  const all = Object.values(cardsOf(s)).filter((c) => !s.disabled.includes(c.deck) && !used.has(c.id))
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

const centre = (s: Data) => ({ x: (viewport.w / 2 - s.view.x) / s.view.k, y: (viewport.h / 2 - s.view.y) / s.view.k })

export function targetHub(s: Data): string | null {
  const cards = cardsOf(s)
  const sel = s.selected && s.placed[s.selected]
  if (sel) {
    if (isHub(cards[sel.id].type)) return sel.id
    if (sel.parent) return sel.parent
  }
  return s.focus && s.placed[s.focus] ? s.focus : null
}

export const useStore = create<State>()(
  persist(
    immer((set) => ({
      ...blank(),
      init: false,

      reset: () => set((s) => { Object.assign(s, blank(), { custom: s.custom, disabled: s.disabled }); rebuild(s) }),

      load: (data) => set((s) => { Object.assign(s, blank(), data, { init: true, linking: null }); if (!data.piles) rebuild(s) }),

      draw: (type, n = 1) => set((s) => {
        for (let i = 0; i < n; i++) {
          const id = pop(s, type)
          if (id) s.hand.push({ card: id, active: 0 })
        }
      }),

      guideDraw: () => set((s) => {
        const type = GUIDE_STEPS[s.guide.step]
        const n = s.guide.complex && DOUBLED.includes(type) ? 2 : 1
        for (let i = 0; i < n; i++) {
          const id = pop(s, type)
          if (id) s.hand.push({ card: id, active: 0 })
        }
        if (type === 'terrain') { s.focus = null; s.selected = null }
        s.guide.drawn = true
      }),

      guideNext: () => set((s) => { s.guide.step = (s.guide.step + 1) % GUIDE_STEPS.length; s.guide.drawn = false }),

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
          s.view.x = viewport.w / 2 - (p.x + SIZE / 2) * s.view.k
          s.view.y = viewport.h / 2 - (p.y + SIZE / 2) * s.view.k
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
        else { s.custom.push(card); if (!s.disabled.includes(card.deck)) s.piles[card.type] = shuffle([...s.piles[card.type], card.id]) }
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
    })),
    { name: 'worldloom-v1' },
  ),
)

/** The saved portion of the state, for export. */
export function snapshot(): Data {
  const s = useStore.getState()
  return JSON.parse(JSON.stringify(Object.fromEntries(Object.entries(s).filter(([, v]) => typeof v !== 'function'))))
}

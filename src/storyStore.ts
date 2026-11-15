import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { CARD, drawCard, fill, PACKS, PATTERNS, slotsOf, type Story } from './story'

interface Stories {
  stories: Story[]
  current: string
  packs: string[]
  add(): void
  remove(id: string): void
  select(id: string): void
  setPattern(pattern: string): void
  setNotes(notes: string): void
  draw(slot: string, swap?: boolean): void
  turn(slot: string): void
  clear(slot: string): void
  toggleLock(slot: string): void
  generate(): void
  togglePack(pack: string): void
}

let n = 0
const blank = (pattern = PATTERNS[0].id): Story => ({ id: `s${Date.now().toString(36)}${(n++).toString(36)}`, pattern, slots: {}, notes: '' })
const first = blank()

export const useStories = create<Stories>()(
  persist(
    immer((set) => {
      const me = (s: Stories) => s.stories.find((x) => x.id === s.current)!
      return {
        stories: [first],
        current: first.id,
        packs: [],
        add: () => set((s) => { const x = blank(me(s).pattern); s.stories.push(x); s.current = x.id }),
        remove: (id) => set((s) => {
          s.stories = s.stories.filter((x) => x.id !== id)
          if (!s.stories.length) s.stories.push(blank())
          if (!s.stories.some((x) => x.id === s.current)) s.current = s.stories[0].id
        }),
        select: (id) => set((s) => { s.current = id }),
        setPattern: (pattern) => set((s) => {
          const story = me(s)
          story.pattern = pattern
          const keep = new Map(slotsOf(pattern, s.packs).map((d) => [d.id, d]))
          for (const [id, held] of Object.entries(story.slots)) {
            const def = keep.get(id)
            const kind = held && CARD[held.card]?.kind
            if (!def || (kind !== def.kind && kind !== def.alt)) delete story.slots[id]
          }
        }),
        setNotes: (notes) => set((s) => { me(s).notes = notes }),
        draw: (slot, swap) => set((s) => {
          const story = me(s)
          const def = slotsOf(story.pattern, s.packs).find((d) => d.id === slot)
          if (!def) return
          const now = story.slots[slot] && CARD[story.slots[slot]!.card]?.kind
          const kind = swap && def.alt ? (now === def.alt ? def.kind : def.alt) : now ?? def.kind
          story.slots[slot] = drawCard(kind, s.packs, Object.values(story.slots).flatMap((h) => (h ? [h.card] : [])))
        }),
        turn: (slot) => set((s) => {
          const held = me(s).slots[slot]
          if (held) held.active = (held.active + 1) % CARD[held.card].cues.length
        }),
        clear: (slot) => set((s) => { delete me(s).slots[slot] }),
        toggleLock: (slot) => set((s) => { const held = me(s).slots[slot]; if (held) held.locked = !held.locked }),
        generate: () => set((s) => { fill(me(s), s.packs) }),
        togglePack: (pack) => set((s) => {
          if (!(pack in PACKS)) return
          s.packs = s.packs.includes(pack) ? s.packs.filter((p) => p !== pack) : [...s.packs, pack]
        }),
      }
    }),
    { name: 'storyloom-stories-v1' },
  ),
)

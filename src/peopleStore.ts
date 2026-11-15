import { useMemo } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { GENRES, PERSON_CARDS, poolFor, SLOTS, type Lookup, type Person, type PersonCard, type Slot } from './people'

interface Cast {
  people: Person[]
  current: string
  genres: string[]
  custom: PersonCard[]
  add(): void
  remove(id: string): void
  select(id: string): void
  rename(name: string): void
  setNotes(notes: string): void
  draw(slot: Slot): void
  clear(slot: Slot): void
  toggleLock(slot: Slot): void
  generate(): void
  toggleGenre(genre: string): void
  addCustom(slot: Slot, text: string): void
  removeCustom(id: string): void
}

let n = 0
const uid = (p: string) => `${p}${Date.now().toString(36)}${(n++).toString(36)}`
const blank = (): Person => ({ id: uid('p'), name: '', cards: {}, locked: [], notes: '' })
const first = blank()

/** A random card for the slot, avoiding the one already there. */
export function pick(all: PersonCard[], slot: Slot, genres: string[], avoid?: string): string | undefined {
  const pool = poolFor(all, slot, genres)
  const fresh = pool.filter((c) => c.id !== avoid)
  const from = fresh.length ? fresh : pool
  return from[Math.floor(Math.random() * from.length)]?.id
}

export const usePeople = create<Cast>()(
  persist(
    immer((set) => {
      const me = (s: Cast) => s.people.find((p) => p.id === s.current)!
      const all = (s: Cast) => [...PERSON_CARDS, ...s.custom]
      return {
        people: [first],
        current: first.id,
        genres: ['fantasy'],
        custom: [],
        add: () => set((s) => { const p = blank(); s.people.push(p); s.current = p.id }),
        remove: (id) => set((s) => {
          s.people = s.people.filter((p) => p.id !== id)
          if (!s.people.length) s.people.push(blank())
          if (!s.people.some((p) => p.id === s.current)) s.current = s.people[0].id
        }),
        select: (id) => set((s) => { s.current = id }),
        rename: (name) => set((s) => { me(s).name = name }),
        setNotes: (notes) => set((s) => { me(s).notes = notes }),
        draw: (slot) => set((s) => {
          const id = pick(all(s), slot, s.genres, me(s).cards[slot])
          if (id) me(s).cards[slot] = id
        }),
        clear: (slot) => set((s) => { delete me(s).cards[slot]; me(s).locked = me(s).locked.filter((l) => l !== slot) }),
        toggleLock: (slot) => set((s) => {
          const p = me(s)
          p.locked = p.locked.includes(slot) ? p.locked.filter((l) => l !== slot) : [...p.locked, slot]
        }),
        generate: () => set((s) => {
          const p = me(s)
          for (const slot of SLOTS) {
            if (p.locked.includes(slot)) continue
            const id = pick(all(s), slot, s.genres, p.cards[slot])
            if (id) p.cards[slot] = id
          }
        }),
        toggleGenre: (genre) => set((s) => {
          if (!(genre in GENRES)) return
          if (!s.genres.includes(genre)) s.genres.push(genre)
          else if (s.genres.length > 1) s.genres = s.genres.filter((g) => g !== genre)
        }),
        addCustom: (slot, text) => set((s) => { s.custom.push({ id: uid('c'), slot, set: 'custom', text }) }),
        removeCustom: (id) => set((s) => {
          s.custom = s.custom.filter((c) => c.id !== id)
          for (const p of s.people) for (const slot of SLOTS) if (p.cards[slot] === id) delete p.cards[slot]
        }),
      }
    }),
    { name: 'storyloom-cast-v1' },
  ),
)

export function useLookup(): Lookup {
  const custom = usePeople((s) => s.custom)
  return useMemo(() => Object.fromEntries([...PERSON_CARDS, ...custom].map((c) => [c.id, c])), [custom])
}

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { makeName, titleCase, TONGUES } from './names'
import { kindLabel, rollAll, stepsFor, type Rolls } from './peril'

export interface Peril { id: string; name: string; rolls: Rolls; locked: string[]; notes: string }

interface Perils {
  perils: Peril[]
  current: string
  add(): void
  remove(id: string): void
  select(id: string): void
  rollAll(): void
  roll(table: string): void
  set(table: string, index: number | undefined): void
  toggleLock(table: string): void
  rename(name?: string): void
  setNotes(notes: string): void
}

let n = 0
const blank = (): Peril => ({ id: `d${Date.now().toString(36)}${(n++).toString(36)}`, name: '', rolls: {}, locked: [], notes: '' })
const first = blank()

/** A name in the plain old-country style, built around what kind of place it is. */
const nameFor = (p: Peril, taken: string[]) => {
  const tongue = Math.max(0, TONGUES.findIndex((x) => x.id === 'old'))
  return titleCase(makeName({ kind: 'site', tongue, base: kindLabel(p.rolls) }, Math.random, new Set(taken.map((x) => x.toLowerCase()))))
}

export const usePerils = create<Perils>()(
  persist(
    immer((set) => {
      const me = (s: Perils) => s.perils.find((p) => p.id === s.current)!
      const others = (s: Perils) => s.perils.map((p) => p.name)
      return {
        perils: [first],
        current: first.id,
        add: () => set((s) => { const p = blank(); s.perils.push(p); s.current = p.id }),
        remove: (id) => set((s) => {
          s.perils = s.perils.filter((p) => p.id !== id)
          if (!s.perils.length) s.perils.push(blank())
          if (!s.perils.some((p) => p.id === s.current)) s.current = s.perils[0].id
        }),
        select: (id) => set((s) => { s.current = id }),
        rollAll: () => set((s) => {
          const p = me(s)
          p.rolls = rollAll(p.rolls, p.locked)
          if (!p.name.trim()) p.name = nameFor(p, others(s))
        }),
        roll: (table) => set((s) => {
          const p = me(s)
          const tb = stepsFor(p.rolls).flatMap((x) => x.tables).find((x) => x.id === table)
          if (!tb) return
          const options = tb.entries.map((_, i) => i).filter((i) => i !== p.rolls[table])
          p.rolls[table] = options[Math.floor(Math.random() * options.length)] ?? 0
        }),
        set: (table, index) => set((s) => { me(s).rolls[table] = index }),
        toggleLock: (table) => set((s) => {
          const p = me(s)
          p.locked = p.locked.includes(table) ? p.locked.filter((x) => x !== table) : [...p.locked, table]
        }),
        rename: (name) => set((s) => { const p = me(s); p.name = name ?? nameFor(p, others(s)) }),
        setNotes: (notes) => set((s) => { me(s).notes = notes }),
      }
    }),
    { name: 'storyloom-perils-v1' },
  ),
)

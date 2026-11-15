import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { rollTables, type Rolls, type Step } from './roller'

export interface Rolled { id: string; name: string; rolls: Rolls; locked: string[]; notes: string }

export interface RollerState {
  items: Rolled[]
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

/**
 * A saved list of things built by rolling on tables. `stepsFor` says which tables apply to a set of rolls,
 * and `name` makes up a name once enough has been rolled. `legacy` is the field an older save kept its list under.
 */
export function makeRoller(storage: string, stepsFor: (rolls: Rolls) => Step[], name: (rolls: Rolls, taken: string[]) => string, legacy?: string) {
  const blank = (): Rolled => ({ id: `r${Date.now().toString(36)}${(n++).toString(36)}`, name: '', rolls: {}, locked: [], notes: '' })
  const first = blank()
  return create<RollerState>()(
    persist(
      immer((set) => {
        const me = (s: RollerState) => s.items.find((p) => p.id === s.current)!
        const taken = (s: RollerState) => s.items.map((p) => p.name)
        return {
          items: [first],
          current: first.id,
          add: () => set((s) => { const p = blank(); s.items.push(p); s.current = p.id }),
          remove: (id) => set((s) => {
            s.items = s.items.filter((p) => p.id !== id)
            if (!s.items.length) s.items.push(blank())
            if (!s.items.some((p) => p.id === s.current)) s.current = s.items[0].id
          }),
          select: (id) => set((s) => { s.current = id }),
          rollAll: () => set((s) => {
            const p = me(s)
            p.rolls = rollTables(stepsFor, p.rolls, p.locked)
            if (!p.name.trim()) p.name = name(p.rolls, taken(s))
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
          rename: (next) => set((s) => { const p = me(s); p.name = next ?? name(p.rolls, taken(s)) }),
          setNotes: (notes) => set((s) => { me(s).notes = notes }),
        }
      }),
      {
        name: storage,
        merge: (saved, current) => {
          const old = (saved ?? {}) as Partial<RollerState> & Record<string, unknown>
          const items = old.items ?? (legacy ? (old[legacy] as Rolled[] | undefined) : undefined) ?? current.items
          return { ...current, ...old, items, current: items.some((p) => p.id === old.current) ? old.current! : items[0].id }
        },
      },
    ),
  )
}

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { blank, cardOf, draw, fill, type Item, type ToolDef } from './cardTool'

export interface CardToolState {
  items: Item[]
  current: string
  packs: string[]
  add(): void
  remove(id: string): void
  select(id: string): void
  rename(name?: string): void
  setNotes(notes: string): void
  /** Draw one aspect afresh, or every unlocked aspect of a section, or of all sections. */
  draw(section: number, aspect: string): void
  fill(section?: number): void
  pick(section: number, aspect: string, cue: number): void
  clear(section: number, aspect: string): void
  toggleLock(section: number, aspect: string): void
  addSection(): void
  removeSection(section: number): void
  togglePack(pack: string): void
}

let n = 0

/** The saved list for one of the card tools, kept in this browser. */
export function makeCardStore(def: ToolDef) {
  const fresh = () => blank(def, `i${Date.now().toString(36)}${(n++).toString(36)}`)
  const first = fresh()
  return create<CardToolState>()(
    persist(
      immer((set) => {
        const me = (s: CardToolState) => s.items.find((x) => x.id === s.current)!
        const names = (s: CardToolState) => s.items.map((x) => x.name)
        const cards = (item: Item) => item.sections.flatMap((x) => Object.values(x.slots).flatMap((h) => (h ? [h.card] : [])))
        return {
          items: [first],
          current: first.id,
          packs: [],
          add: () => set((s) => { const x = fresh(); s.items.push(x); s.current = x.id }),
          remove: (id) => set((s) => {
            s.items = s.items.filter((x) => x.id !== id)
            if (!s.items.length) s.items.push(fresh())
            if (!s.items.some((x) => x.id === s.current)) s.current = s.items[0].id
          }),
          select: (id) => set((s) => { s.current = id }),
          rename: (name) => set((s) => { me(s).name = name ?? def.name(names(s)) }),
          setNotes: (notes) => set((s) => { me(s).notes = notes }),
          draw: (section, aspect) => set((s) => {
            const item = me(s)
            if (item.sections[section]) item.sections[section].slots[aspect] = draw(def, aspect, s.packs, cards(item))
          }),
          fill: (section) => set((s) => {
            const item = me(s)
            for (const i of section === undefined ? item.sections.map((_, k) => k) : [section]) fill(def, item, i, s.packs)
            if (!item.name.trim()) item.name = def.name(names(s))
          }),
          pick: (section, aspect, cue) => set((s) => {
            const held = me(s).sections[section]?.slots[aspect]
            if (held && cardOf(def, held.card)?.cues[cue] !== undefined) held.active = cue
          }),
          clear: (section, aspect) => set((s) => { delete me(s).sections[section]?.slots[aspect] }),
          toggleLock: (section, aspect) => set((s) => { const held = me(s).sections[section]?.slots[aspect]; if (held) held.locked = !held.locked }),
          addSection: () => set((s) => {
            const item = me(s)
            if (item.sections.length >= (def.sections?.max ?? 1)) return
            item.sections.push({ slots: {} })
            fill(def, item, item.sections.length - 1, s.packs)
          }),
          removeSection: (section) => set((s) => { const item = me(s); if (item.sections.length > 1) item.sections.splice(section, 1) }),
          togglePack: (pack) => set((s) => {
            if (!(pack in def.packs) && !pack.startsWith('-')) return
            s.packs = s.packs.includes(pack) ? s.packs.filter((p) => p !== pack) : [...s.packs, pack]
          }),
        }
      }),
      { name: `storyloom-${def.id}-v1` },
    ),
  )
}

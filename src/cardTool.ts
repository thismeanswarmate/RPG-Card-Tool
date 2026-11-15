// The engine behind the Races, Cultures and History tools. Each is a set of aspects; an aspect is drawn
// like a card, which offers a few cues to choose between, and each cue completes a sentence of the
// written description. A tool may be made of several sections drawn the same way, as a history is of ages.

export interface Aspect {
  id: string
  label: string
  /** What the aspect answers, shown beside its label. */
  hint: string
  /** Left empty by a full draw about one time in three. */
  optional?: boolean
  /** The cues of each deck, separated by semicolons; every four make one draw. */
  cues: Record<string, string>
}

export interface ToolDef {
  id: string
  /** Optional decks beside the core one, by id and label. */
  packs: Record<string, string>
  aspects: Aspect[]
  /** When the tool is made of repeated sections: what one is called, and how many to begin with. */
  sections?: { label: string; start: number; max: number }
  /** A sentence to open with, before the sections. */
  intro?(name: string, sections: number): string
  /** One section written out. `get` gives the chosen cue of an aspect, if it has one. */
  write(get: (aspect: string) => string | undefined, name: string, index: number): string
  /** A name for a new item. */
  name(taken: string[]): string
}

export interface Card { id: string; aspect: string; deck: string; cues: string[] }
export interface Held { card: string; active: number; locked?: boolean }
export interface Section { slots: Record<string, Held | undefined> }
export interface Item { id: string; name: string; sections: Section[]; notes: string }

const made = new Map<ToolDef, Card[]>()
/** Every draw a tool holds: each deck's cues for an aspect, four to a card. */
export function cardsOf(def: ToolDef): Card[] {
  let cards = made.get(def)
  if (!cards) {
    cards = def.aspects.flatMap((a) => Object.entries(a.cues).flatMap(([deck, raw]) => {
      const list = raw.split(';').map((x) => x.trim()).filter(Boolean)
      return Array.from({ length: Math.ceil(list.length / 4) }, (_, i) => ({ id: `${deck}:${a.id}:${i}`, aspect: a.id, deck, cues: list.slice(i * 4, i * 4 + 4) }))
    }))
    made.set(def, cards)
  }
  return cards
}
export const cardOf = (def: ToolDef, id: string) => cardsOf(def).find((c) => c.id === id)

/**
 * Whether a card is in the mix. `packs` lists the optional decks that are on; an entry starting with "-"
 * takes something out: "-core" the core deck, "-fantasy:origin" one aspect of one deck.
 */
export const deckOn = (deck: string, packs: string[]) => (deck === 'core' ? !packs.includes('-core') : packs.includes(deck))
export const inMix = (c: { deck: string; aspect: string }, packs: string[]) => deckOn(c.deck, packs) && !packs.includes(`-${c.deck}:${c.aspect}`)

/** A fresh draw for an aspect, avoiding cards already in use. With nothing in the mix, the core deck steps in. */
export function draw(def: ToolDef, aspect: string, packs: string[], avoid: string[] = [], random = Math.random): Held | undefined {
  const all = cardsOf(def).filter((c) => c.aspect === aspect)
  const mixed = all.filter((c) => inMix(c, packs))
  const pool = mixed.length ? mixed : all.filter((c) => c.deck === 'core')
  const fresh = pool.filter((c) => !avoid.includes(c.id))
  const from = fresh.length ? fresh : pool
  const card = from[Math.floor(random() * from.length)]
  return card && { card: card.id, active: Math.floor(random() * card.cues.length) }
}

const used = (item: Item) => item.sections.flatMap((s) => Object.values(s.slots).flatMap((h) => (h ? [h.card] : [])))

/** Draw every aspect of a section that is not locked. */
export function fill(def: ToolDef, item: Item, index: number, packs: string[], random = Math.random) {
  const section = item.sections[index]
  if (!section) return
  for (const a of def.aspects) {
    if (section.slots[a.id]?.locked) continue
    if (a.optional && random() < 0.33) { delete section.slots[a.id]; continue }
    section.slots[a.id] = draw(def, a.id, packs, used(item), random)
  }
}

export const blank = (def: ToolDef, id: string): Item => ({ id, name: '', notes: '', sections: Array.from({ length: def.sections?.start ?? 1 }, () => ({ slots: {} })) })

const reader = (def: ToolDef, section: Section) => (aspect: string) => {
  const held = section.slots[aspect]
  return held ? cardOf(def, held.card)?.cues[held.active] : undefined
}

/** The item written out: the opening, then a paragraph for each section that has anything drawn. */
export function text(def: ToolDef, item: Item): string[] {
  const name = item.name.trim()
  const drawn = item.sections.map((s, i) => (Object.values(s.slots).some(Boolean) ? def.write(reader(def, s), name, i) : '')).filter(Boolean)
  return drawn.length ? [def.intro?.(name, item.sections.length) ?? '', ...drawn].filter(Boolean) : []
}

/** Helpers for writing: a sentence that vanishes when any part of it is missing, and joining what is left. */
export const say = (strings: TemplateStringsArray, ...values: (string | undefined)[]) =>
  values.some((v) => v === undefined) ? '' : strings.reduce((s, part, i) => s + part + (values[i] ?? ''), '')
export const join = (...parts: string[]) => parts.filter(Boolean).join(' ')
export const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)

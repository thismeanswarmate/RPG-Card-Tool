// A setting is one connected whole built in layers: geography, then the powers at work in it, then
// its people, then the stories waiting to happen. Each layer links to what the earlier ones made, so a
// faction's sacred place is a real spot on the map and its founder is someone in the cast.
// It draws on the Worlds, Lore and Stories decks; the Characters tool stands apart.
//
// Everything is stored as structure — ids, cards and links — and turned into text when shown, so a
// rename reaches every sentence that mentions the thing.

import { cardOf, fill as fillCards, text as cardText, type Section, type ToolDef } from './cardTool'
import { CULTURES, HISTORY, RACES } from './cardTools'
import { cardSentence, chronicle, describe, placeName } from './describe'
import type { EmblemSpec } from './emblem'
import { GLOSS, ROLE_GLOSS } from './glosses'
import { cueText, rootOf, shuffle, subtree, type Board } from './logic'
import { DETAIL, detailParts, detailsFor, newDetail, PRIMARY, slots, type DetailInst, type Kind } from './lore'
import { makeName, rngFrom, titleCase, TONGUES, tonguesFor, type NameSpec, type Rng } from './names'
import { kindLabel, brief as perilBrief, rollAll as rollPeril } from './peril'
import type { Rolls } from './roller'
import { brief as settlementBrief, rollAll as rollSettlement, rollType, typeKey, typeLabel } from './settlement'
import { blank, cardsOf, generateWorld, type WorldSize } from './store'
import { STORY_CARDS } from './story'
import { featureOf, featuresFor } from './features'
import { landOf, misfit, needsSea, openBearings, scaleOf, sideNearness } from './terrain'
import type { Held } from './types'

export type Size = 'region' | 'country' | 'continent'
export type Depth = 'sketch' | 'standard' | 'rich'
export interface Answers { size: Size; genres: string[]; lands: string[]; focus: string[]; depth: Depth }

export const QUESTIONS = {
  size: { label: 'How big is it?', options: { region: 'A region — 5 to 7 places', country: 'A country — 9 to 14 places', continent: 'A continent — 14 to 20 places' } },
  genres: { label: 'What kind of world?', options: { fantasy: 'Fantasy', scifi: 'Science fiction', horror: 'Horror', grounded: 'Grounded' } },
  lands: { label: 'What does the land look like?', options: { temperate: 'Temperate', frost: 'Frost', coast: 'Coast', dry: 'Desert' } },
  focus: { label: 'What is it about?', options: { power: 'Power and factions', secrets: 'Secrets and mystery', adventure: 'Adventure', everyday: 'Everyday life', faith: 'Faith and myth' } },
  depth: { label: 'How much detail?', options: { sketch: 'A sketch', standard: 'Standard', rich: 'Rich' } },
} as const

export const DEFAULT_ANSWERS: Answers = { size: 'country', genres: ['fantasy'], lands: ['temperate'], focus: ['power', 'adventure'], depth: 'standard' }

export interface Entity {
  id: string
  kind: Kind
  what: string
  home?: string
  details: DetailInst[]
  /** The power whose details first brought this thing into the setting. */
  from?: string
  /** The culture a faction grew out of, or a person was raised in. */
  culture?: string
  /** Which age of the history a faction, event, object or deity dates from, counting from 0. */
  age?: number
}
/** A person: a role from the story deck, described with details from the lore deck. */
export interface Char extends Entity { kind: 'figure'; home: string; faction?: string; local: boolean; /** The race they belong to. */ race?: string }
export interface HookLine { who: string; drive: string; target: string; but?: string; also?: { drive: string; target: string } }
export interface Hook { id: string; at: string; lines: HookLine[] }

export interface Setting {
  id: string
  seed: string
  answers: Answers
  created: number
  board: Board
  meta: Held[]
  /** Every named thing, by id: places and sites (their card ids), people, powers and the world itself. */
  names: Record<string, string>
  /** How each name was made, so it can be made again. */
  specs: Record<string, NameSpec & { homeId?: string; /** Words the made name is set in, with {} where it goes: "the {} folk". */ frame?: string }>
  entities: Entity[]
  people: Char[]
  hooks: Hook[]
  /** The art direction for this setting's pictures; absent means it follows the genre. */
  art?: string
  /** Settlements and dangerous places, each rolled on the tables of its own tool. */
  built?: Built[]
  /** Built by hand, one piece at a time, rather than generated from answers. */
  manual?: boolean
  /** Which decks later additions draw on; absent means the ones the answers call for. */
  decks?: DeckChoice
  /** The races of the world, the cultures of its places and its history, each drawn on the cards of its own tool. */
  drawn?: Drawn[]
  /** The worlds that lie beyond the edges of the map: for now a name and the side each lies on. */
  beyond?: Beyond[]
  /** The features each land is made up of: a fjord, a caldera, a string of islands. */
  features?: Feature[]
  /** Things made from a word in a description: whose description, which word, and what it became. */
  mentioned?: { owner: string; word: string; id: string }[]
  /** Emblems changed by hand, by the id of the land, race or culture that bears them; the rest follow from the setting itself. */
  emblems?: Record<string, EmblemSpec>
}

export interface Beyond { id: string; side: Side }
/** The four sides a neighbouring world can lie on. A side without one faces the open sea. */
export const SIDES = ['north', 'east', 'south', 'west'] as const
export type Side = (typeof SIDES)[number]

/** The neighbouring worlds of a setting: one at most on each side, each joined to it by land. */
/** A feature of a land: what kind of formation it is, and which land it lies in. */
export interface Feature { id: string; land: string; what: string }
/** The features of one land, in the order they were made. */
export const featuresOf = (s: Pick<Setting, 'features'>, land: string) => (s.features ?? []).filter((f) => f.land === land)
/** A sentence about a feature. */
export const featureText = (s: Pick<Setting, 'names'>, f: Feature) => {
  const name = s.names[f.id] ?? f.what, land = s.names[f.land] ?? 'the land'
  const text = featureOf(f.what).text.replace(/\{place\}/g, name).replace(/\{land\}/g, land)
  return text.charAt(0).toUpperCase() + text.slice(1)
}
/** The bearings from a land along which open sea lies beyond its coast. */
export function seaBearings(s: Pick<Setting, 'board' | 'beyond' | 'names'>, land: string): number[] {
  const roots = Object.values(s.board).filter((p) => !p.parent), p = s.board[land]
  if (!p) return []
  const taken = beyondOf(s).map((b) => b.side)
  return openBearings(p, roots, SIDES.map((side) => taken.includes(side)))
}
/** Whether a land lies on the open sea. */
export const coastal = (s: Pick<Setting, 'board' | 'beyond' | 'names'>, land: string) => seaBearings(s, land).length > 0

export const beyondOf = (s: Pick<Setting, 'beyond' | 'names'>): Beyond[] =>
  SIDES.flatMap((side) => { const b = s.beyond?.find((x) => x.side === side && s.names[x.id]); return b ? [b] : [] })
/** The seas on the sides with no neighbouring world, each named in the setting's own manner. */
export function seasOf(s: Pick<Setting, 'beyond' | 'names' | 'seed' | 'specs' | 'id'>): { side: Side; name: string }[] {
  const taken = beyondOf(s).map((b) => b.side)
  const tongue = TONGUES[s.specs.world?.tongue ?? 0] ?? TONGUES[0]
  return SIDES.filter((side) => !taken.includes(side)).map((side) => {
    const rng = rngFrom(`${s.seed}:${s.id}:sea:${side}`)
    const w = tongue.word(rng)
    return { side, name: [`the ${w} Ocean`, `the Sea of ${w}`, `the ${w} Sea`, `the ${w} Deep`, `the Gulf of ${w}`][Math.floor(rng() * 5)] }
  })
}

/** A race, a culture or the history of a setting. A culture belongs to a place and may be mostly of one race. */
export interface Drawn { id: string; tool: 'race' | 'culture' | 'history'; home?: string; race?: string; sections: Section[] }
export const DRAWN_DEF: Record<Drawn['tool'], ToolDef> = { race: RACES, culture: CULTURES, history: HISTORY }
const FRAME: Record<Drawn['tool'], string> = { race: 'the {}', culture: 'the {} folk', history: 'the Chronicle of {}' }
export const drawnKind = (d: Drawn) => (d.tool === 'history' ? `history · ${d.sections.length} ${d.sections.length === 1 ? 'age' : 'ages'}` : d.tool)
/** The decks a setting's races, cultures and history draw on, in the form the card tools take. */
export const drawnPacks = (s: Pick<Setting, 'answers' | 'decks' | 'manual'>) => {
  const story = decksOf(s).story
  return [...story.filter((d) => d in RACES.packs), ...(decksOf(s).animal ? ['animal'] : []), ...(story.includes('core') ? [] : ['-core'])]
}
const ORDINALS = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth']
const cueOf = (d: Drawn, section: number, aspect: string) => {
  const held = d.sections[section]?.slots[aspect]
  return held ? cardOf(DRAWN_DEF[d.tool], held.card)?.cues[held.active] : undefined
}
/** The ages of a setting's history, as they are spoken of: "the Age of Ash", or "the second age" for one with no name. */
export function ageNames(s: Setting): string[] {
  const history = s.drawn?.find((d) => d.tool === 'history')
  return history ? history.sections.map((_, i) => (cueOf(history, i, 'name') ? `the Age of ${cueOf(history, i, 'name')}` : `the ${ORDINALS[i] ?? 'next'} age`)) : []
}
/** Which kinds of thing date from an age of the history. */
export const DATED: Kind[] = ['faction', 'event', 'object', 'deity']
/** How a race looks, in a sentence, for describing one of its members to a picture model. */
export function raceLooks(s: Setting, race?: string): string {
  const d = race ? s.drawn?.find((x) => x.id === race && x.tool === 'race') : undefined
  if (!d) return ''
  const g = (a: string) => cueOf(d, 0, a)
  const looks = [g('skin') && `skin ${g('skin')}`, g('hair') && `hair ${g('hair')}`, g('eyes') && `eyes ${g('eyes')}`].filter(Boolean).join('; ')
  return [g('form') && `Their people are ${g('form')}.`, looks && `They have ${looks}.`, g('features') && `Their people have ${g('features')}.`].filter(Boolean).join(' ')
}

/** One of them written out, with a culture placed and peopled. */
export function drawnText(s: Setting, d: Drawn): string[] {
  const name = s.names[d.id] ?? ''
  const out = cardText(DRAWN_DEF[d.tool], { id: d.id, name: name.charAt(0).toUpperCase() + name.slice(1), notes: '', sections: d.sections })
  if (d.tool !== 'culture' || !out.length) return out
  const where = d.home && s.board[d.home] ? `It is the way of life ${whereText(s, d.home)}.` : ''
  const who = d.race && s.names[d.race] ? `Most who keep it are ${s.names[d.race].replace(/^the /, '')}.` : ''
  return [[out[0], where, who].filter(Boolean).join(' '), ...out.slice(1)]
}

/** The decks a setting draws on: lands and sites, people and stories, and whether there are gods. */
export interface DeckChoice { world: string[]; story: string[]; deities: boolean; /** Whether races and the history may draw on the animal deck. */ animal?: boolean }
export const WORLD_DECKS: Record<string, string> = { starter: 'Starter', fantasy: 'Fantasy', scifi: 'Science fiction', horror: 'Horror', frost: 'Frost', coast: 'Coast', dry: 'Desert' }
export const STORY_DECKS: Record<string, string> = { core: 'Core', fantasy: 'Fantasy', scifi: 'Science fiction', horror: 'Horror', mystery: 'Mystery' }
export function decksOf(s: Pick<Setting, 'answers' | 'decks' | 'manual'>): DeckChoice {
  if (s.decks) return s.decks
  const { genres, lands, focus } = s.answers
  return {
    world: ['starter', ...[...genres, ...lands].filter((d) => d in WORLD_DECKS)],
    story: ['core', ...genres.filter((g) => g in STORY_DECKS)],
    deities: !!s.manual || focus.includes('faith') || genres.includes('fantasy'),
  }
}

/** A settlement or dangerous place within the setting: where it is, and what its tables rolled. */
export interface Built { id: string; tool: 'settlement' | 'peril'; home: string; rolls: Rolls; locked?: string[] }
/** Whether the setting already has a capital, leaving out one settlement if given. */
export const hasCapital = (s: Pick<Setting, 'built'>, except?: string) =>
  !!s.built?.some((b) => b.tool === 'settlement' && b.id !== except && typeKey(b.rolls) === 'capital')
export const builtKind = (b: Built) => (b.tool === 'settlement' ? typeLabel(b.rolls) ?? 'settlement' : kindLabel(b.rolls))
export function builtText(s: Setting, b: Built): string[] {
  const out = (b.tool === 'settlement' ? settlementBrief : perilBrief)(s.names[b.id].charAt(0).toUpperCase() + s.names[b.id].slice(1), b.rolls)
  // A settlement keeps the culture of the place it stands in.
  const culture = b.tool === 'settlement' && s.board[b.home] ? s.drawn?.find((d) => d.tool === 'culture' && d.home === rootOf(s.board, b.home)) : undefined
  if (culture && s.names[culture.id] && out.length > 1) out[1] = `${out[1]} Most of them are of ${s.names[culture.id]}.`
  return out
}


const CARDS = cardsOf({ custom: [] })

const SCALE: Record<Size, { world: WorldSize; min: number; factions: number; people: number; minor: number; hooks: number; tongues: number }> = {
  region: { world: 'small', min: 5, factions: 2, people: 4, minor: 5, hooks: 3, tongues: 1 },
  country: { world: 'medium', min: 9, factions: 3, people: 7, minor: 8, hooks: 5, tongues: 2 },
  continent: { world: 'large', min: 14, factions: 5, people: 10, minor: 12, hooks: 8, tongues: 3 },
}
const DETAILS: Record<Depth, { major: number; minor: number }> = { sketch: { major: 2, minor: 1 }, standard: { major: 3, minor: 2 }, rich: { major: 4, minor: 2 } }

/** Drives that read oddly when aimed at a person. */
const THINGS_ONLY = new Set(['steal', 'rebuild', 'return to', 'sell', 'lay claim to', 'inherit', 'upload', 'decode', 'jump-start', 'defect from', 'bury', 'feed'])

/** Run a function with the global random source replaced by a seeded one, so every draw repeats. */
function withSeed<T>(seed: string, fn: (rng: Rng) => T): T {
  const original = Math.random
  const rng = rngFrom(seed)
  Math.random = rng
  try { return fn(rng) } finally { Math.random = original }
}

/**
 * Put each land where it belongs. The places keep the same set of spots, but trade them so that cold lands
 * lie to the north and hot ones to the south, islands and coastal lands on the rim and inland ones at the heart.
 */
export function settle(board: Board) {
  const roots = Object.values(board).filter((p) => !p.parent)
  if (roots.length < 2) return
  const spots = roots.map((p) => ({ x: p.x, y: p.y }))
  const [y0, y1] = [Math.min(...spots.map((p) => p.y)), Math.max(...spots.map((p) => p.y))]
  const [cx, cy] = [spots.reduce((n, p) => n + p.x, 0) / spots.length, spots.reduce((n, p) => n + p.y, 0) / spots.length]
  const reach = Math.max(1, ...spots.map((p) => Math.hypot(p.x - cx, p.y - cy)))
  const lat = (p: { y: number }) => (y1 > y0 ? (p.y - y0) / (y1 - y0) : 0.5)
  const rim = (p: { x: number; y: number }) => Math.hypot(p.x - cx, p.y - cy) / reach
  const lands = roots.map((p) => landOf(CARDS[p.id].cues[p.active]?.text ?? ''))
  const cost = (i: number, spot: { x: number; y: number }) => misfit(lands[i], lat(spot), rim(spot))
  // The fussiest lands choose first; then pairs trade places for as long as a trade helps.
  const order = roots.map((_, i) => i).sort((a, b) => lands[b].bound + (lands[b].shape === 'land' ? 0 : 1) - (lands[a].bound + (lands[a].shape === 'land' ? 0 : 1)))
  const free = spots.map((_, k) => k), at: number[] = []
  for (const i of order) {
    const k = free.reduce((best, f) => (cost(i, spots[f]) < cost(i, spots[best]) ? f : best), free[0])
    at[i] = k
    free.splice(free.indexOf(k), 1)
  }
  for (let pass = 0, moved = true; moved && pass < 8; pass++) {
    moved = false
    for (let i = 0; i < roots.length; i++) for (let j = i + 1; j < roots.length; j++)
      if (cost(i, spots[at[j]]) + cost(j, spots[at[i]]) + 1e-9 < cost(i, spots[at[i]]) + cost(j, spots[at[j]])) { [at[i], at[j]] = [at[j], at[i]]; moved = true }
  }
  roots.forEach((p, i) => { p.x = spots[at[i]].x; p.y = spots[at[i]].y })
}

const nextId = (prefix: string, items: { id: string }[]) =>
  `${prefix}${items.reduce((n, x) => Math.max(n, (parseInt(x.id.slice(prefix.length), 10) || 0) + 1), 0)}`

/**
 * The hands that add to a setting: naming, making powers and people, writing their details so that every
 * link lands on something already there, and starting stories. The generator uses them in bulk and the
 * hand-built mode one at a time. `budget.left` is how many new lesser things details may still call into being.
 */
export function weave(s: Setting, rng: Rng = Math.random, budget = { left: 0 }) {
  const { board, names, specs, entities, people, answers } = s
  const pick = <T,>(a: T[]): T => a[Math.floor(rng() * a.length)]
  const genres = answers.genres.length ? answers.genres : ['grounded']
  const depth = DETAILS[answers.depth]
  const deities = decksOf(s).deities
  const packs = { deities, emblems: false, names: false }
  const sitesOf = (root: string) => subtree(board, root).filter((id) => CARDS[id].type === 'site')
  // The map is read often and changes seldom, so it is read again only when cards have come or gone.
  let seen = { cards: -1, roots: [] as string[], sites: [] as string[] }
  const map = () => {
    const cards = Object.keys(board).length
    if (cards !== seen.cards) {
      const roots = Object.values(board).filter((p) => !p.parent).map((p) => p.id)
      seen = { cards, roots, sites: roots.flatMap(sitesOf) }
    }
    return seen
  }
  const roots = () => map().roots
  const sites = () => map().sites
  const places = () => [...roots(), ...sites()]
  const taken = new Set(Object.values(names).map((n) => n.toLowerCase()))
  const tongueAt = (place?: string) => (place && specs[rootOf(board, place)]) ? specs[rootOf(board, place)].tongue : specs.world?.tongue ?? 0
  const name = (id: string, spec: NameSpec, homeId?: string) => {
    names[id] = makeName({ ...spec, home: homeId ? names[homeId] : undefined }, rng, taken)
    specs[id] = { ...spec, homeId }
  }
  const storyDecks = decksOf(s).story
  const cues = (kind: string) => {
    const of = (decks: string[]) => STORY_CARDS.filter((c) => c.kind === kind && decks.includes(c.deck)).flatMap((c) => c.cues)
    const mixed = of(storyDecks)
    // A deck with nothing of this kind leaves the core deck to supply it.
    return mixed.length ? mixed : of(['core'])
  }
  const roles = cues('character')

  /** A person with a role and a home; their details come later, once there are powers to tie them to. */
  const person = (home: string, what?: string): Char => {
    const fresh = roles.filter((r) => !people.some((c) => c.what === r))
    const c: Char = { id: nextId('c', people), kind: 'figure', what: what ?? pick(fresh.length ? fresh : roles), home, local: false, details: [] }
    name(c.id, { kind: 'person', tongue: tongueAt(home) }, rootOf(board, home))
    people.push(c)
    return c
  }

  const make = (kind: Kind, home?: string, from?: string, given?: string): Entity => {
    const fresh = PRIMARY[kind].filter((p) => !entities.some((e) => e.kind === kind && e.what === p))
    const what = given ?? pick(fresh.length ? fresh : PRIMARY[kind])
    const e: Entity = { id: nextId('e', entities), kind, what, home, details: [], ...(from ? { from } : {}) }
    entities.push(e)
    const nameKind = kind === 'figure' || kind === 'place' ? 'object' : kind
    name(e.id, { kind: nameKind, tongue: tongueAt(home), base: what }, home && rootOf(board, home))
    return e
  }

  const ofKind = (kind: Kind, self: Entity) => entities.filter((e) => e.kind === kind && e.id !== self.id)
  /** Whether a link of this kind can be completed for an entity, creating something new if allowed. */
  const can = (kind: Kind, self: Entity, create: boolean) =>
    kind === 'place' ? places().length > 0
      : kind === 'figure' ? people.some((c) => c.id !== self.id)
        : kind === 'deity' && !deities ? false
          : ofKind(kind, self).length > 0 || (create && kind !== 'faction' && budget.left > 0)
  /**
   * Complete one link. `text` is the detail it sits in and `used` the things that detail already names,
   * so that one sentence never names the same thing twice or contradicts where someone lives or belongs.
   */
  const resolve = (kinds: Kind[], self: Entity, create: boolean, text: string, used: string[]) => {
    const free = <T extends { id: string }>(a: T[]) => { const rest = a.filter((x) => !used.includes(x.id)); return rest.length ? rest : a }
    // A detail is only chosen when all its links can be completed, but an earlier link in the same detail
    // may have used up the last of the budget for new things. Then the link is completed anyway.
    const open = kinds.filter((k) => can(k, self, create))
    const kind = pick(open.length ? open : kinds.filter((k) => k !== 'deity' || deities))
    if (kind === 'place') {
      if (text.includes('never left') && self.home) return { kind, node: self.home }
      const all = places()
      const others = all.filter((p) => p !== self.home && !used.includes(p))
      return { kind, node: pick(others.length ? others : all) }
    }
    if (kind === 'figure') {
      const others = free(people.filter((c) => c.id !== self.id))
      const own = others.filter((c) => c.faction === self.id)
      return { kind, node: pick(own.length && rng() < 0.7 ? own : others).id }
    }
    let existing = free(ofKind(kind, self))
    if (kind === 'faction' && self.kind === 'figure') {
      // A person's ties to factions are to ones they do not belong to, unless they secretly lead their own.
      const mine = (self as Char).faction
      const outside = existing.filter((f) => f.id !== mine)
      if (text.includes('leads') && mine && !used.includes(mine)) return { kind, node: mine }
      if (outside.length) existing = outside
    }
    if (existing.length && (!create || kind === 'faction' || budget.left <= 0 || !open.length || rng() < 0.35)) return { kind, node: pick(existing).id }
    budget.left--
    return { kind, node: make(kind, self.home ?? pick(places()), self.id).id }
  }
  /** Write an entity's details afresh, each link pointing at something in the setting. */
  const detail = (self: Entity, count: number, create: boolean) => {
    const pool = detailsFor(self.kind, packs).filter((t) => {
      const needs = slots(t)
      const twoFactions = needs.filter((ks) => ks.length === 1 && ks[0] === 'faction').length > 1
      return needs.every((ks) => ks.some((k) => can(k, self, create))) && !(twoFactions && ofKind('faction', self).length < 2)
    })
    const linked = pool.filter((t) => slots(t).length)
    const chosen: string[] = []
    while (chosen.length < count && chosen.length < pool.length) {
      const t = pick(chosen.length === 0 && linked.length ? linked : pool)
      if (!chosen.includes(t)) chosen.push(t)
    }
    self.details = chosen.map((t) => {
      const d = newDetail(t)
      for (const link of d.links) Object.assign(link, resolve(link.kinds, self, create, t, d.links.flatMap((l) => (l.node ? [l.node] : []))))
      return d
    })
  }

  const drives = cues('drive')
  const obstacles = cues('obstacle')
  const forPerson = drives.filter((d) => !THINGS_ONLY.has(d))
  const rivalOf = (a: Char) => {
    const others = people.filter((c) => c.id !== a.id)
    const rivals = others.filter((c) => c.faction && c.faction !== a.faction)
    return pick(rivals.length ? rivals : others)
  }
  /** The lines of a story for one person: after a thing, racing a rival for it, at odds with someone, or torn two ways. */
  const story = (a: Char): HookLine[] => {
    const things = [...sites(), ...roots(), ...entities.filter((e) => e.kind === 'object').map((e) => e.id)]
    const roll = people.length > 1 ? rng() : 0
    const x = pick(things)
    return roll < 0.35 ? [{ who: a.id, drive: pick(drives), target: x, but: pick(obstacles) }]
      : roll < 0.6 ? [{ who: a.id, drive: pick(drives), target: x, but: pick(obstacles) }, { who: rivalOf(a).id, drive: pick(drives), target: x, but: pick(obstacles) }]
        : roll < 0.8 ? (() => { const b = rivalOf(a); return [{ who: a.id, drive: pick(forPerson), target: b.id, but: pick(obstacles) }, { who: b.id, drive: pick(forPerson), target: a.id, but: pick(obstacles) }] })()
          : [{ who: a.id, drive: pick(drives), target: x, also: { drive: pick(forPerson), target: rivalOf(a).id } }]
  }
  const hook = (a: Char): Hook => {
    const h: Hook = { id: nextId('h', s.hooks), at: rootOf(board, a.home), lines: story(a) }
    s.hooks.push(h)
    return h
  }
  /** A settlement or dangerous place, rolled in full and named for where it stands. */
  const build = (tool: Built['tool'], home: string, given: Rolls = {}): Built => {
    const built = (s.built ??= [])
    // A settlement's kind is drawn by rarity, and a world keeps to one capital, unless the kind was asked for.
    if (tool === 'settlement' && given.type === undefined) given = { ...given, type: rollType(rng, hasCapital(s)) }
    const rolls = tool === 'settlement' ? rollSettlement(given, Object.keys(given), rng) : rollPeril(given, Object.keys(given), rng)
    const b: Built = { id: nextId('b', built), tool, home, rolls }
    built.push(b)
    if (tool === 'settlement') name(b.id, { kind: 'place', tongue: tongueAt(home) })
    else name(b.id, { kind: 'site', tongue: tongueAt(home), base: kindLabel(rolls) }, rootOf(board, home))
    return b
  }
  /** A neighbouring world on a side that has none yet, named in the manner of this one. Nothing more is known of it. */
  const neighbour = (strict = false): Beyond | undefined => {
    const list = (s.beyond ??= [])
    const free = SIDES.filter((side) => !list.some((b) => b.side === side))
    if (!free.length) return undefined
    // Islands, lagoons and coasts need the open sea: the side each of them lies nearest is kept for the ocean.
    const roots = Object.values(board).filter((p) => !p.parent)
    const box = { x0: Math.min(...roots.map((p) => p.x)), y0: Math.min(...roots.map((p) => p.y)), x1: Math.max(...roots.map((p) => p.x)), y1: Math.max(...roots.map((p) => p.y)) }
    const kept = new Set<string>()
    for (const p of roots) if (roots.length > 1 && needsSea(landOf(CARDS[p.id].cues[p.active]?.text ?? ''))) {
      const near = sideNearness(p, box)
      const open = SIDES.map((side, k) => ({ side, n: near[k] })).filter((x) => !list.some((b) => b.side === x.side)).sort((a, b) => b.n - a.n)
      if (open.length) kept.add(open[0].side)
    }
    const clear = free.filter((side) => !kept.has(side))
    if (!clear.length && strict) return undefined
    const b: Beyond = { id: nextId('n', list), side: pick([...(clear.length ? clear : free)]) }
    list.push(b)
    name(b.id, { kind: 'world', tongue: Math.floor(rng() * TONGUES.length), genres })
    return b
  }
  /** A race, a culture for a place, or the history, drawn in full and named. */
  const drawOne = (tool: Drawn['tool'], home?: string, ages = 3): Drawn => {
    const list = (s.drawn ??= [])
    const d: Drawn = { id: nextId('d', list), tool, sections: Array.from({ length: tool === 'history' ? ages : 1 }, () => ({ slots: {} })), ...(home ? { home } : {}) }
    list.push(d)
    const item = { id: d.id, name: '', notes: '', sections: d.sections }
    d.sections.forEach((_, i) => fillCards(DRAWN_DEF[tool], item, i, drawnPacks(s), rng))
    names[d.id] = FRAME[tool].replace('{}', makeName({ kind: 'place', tongue: tongueAt(home) }, rng, taken))
    specs[d.id] = { kind: 'place', tongue: tongueAt(home), frame: FRAME[tool] }
    if (tool === 'culture') {
      const races = list.filter((x) => x.tool === 'race')
      if (races.length) d.race = pick(races).id
    }
    return d
  }
  /**
   * Tie one thing to the races, cultures and history of the setting, where it is not tied already: a person
   * gets a culture (the one of their home, if it has one) and a race (usually the one that keeps that
   * culture); a faction gets a culture and an age; an event, object or deity gets an age.
   */
  const tie = (e: Entity) => {
    const all = s.drawn ?? []
    const cultures = all.filter((d) => d.tool === 'culture')
    const races = all.filter((d) => d.tool === 'race')
    const ages = all.find((d) => d.tool === 'history')?.sections.length ?? 0
    const local = e.home ? cultures.filter((d) => d.home === rootOf(board, e.home!)) : []
    if ((e.kind === 'figure' || e.kind === 'faction') && !e.culture && cultures.length) e.culture = pick(local.length ? local : cultures).id
    if (e.kind === 'figure' && !(e as Char).race && races.length) {
      const kept = all.find((d) => d.id === e.culture)?.race
      ;(e as Char).race = kept && rng() < 0.8 ? kept : pick(races).id
    }
    if (DATED.includes(e.kind) && e.age === undefined && ages) e.age = Math.floor(rng() * ages)
  }
  /** A feature for a land: a kind that suits its country and is not already there, named after the manner of the place. */
  const feature = (land: string, what?: string): Feature | undefined => {
    const list = (s.features ??= [])
    const terrain = CARDS[land]?.cues[board[land]?.active ?? 0]?.text ?? ''
    const here = list.filter((f) => f.land === land).map((f) => f.what), elsewhere = list.map((f) => f.what)
    const fits = featuresFor(terrain, coastal(s, land), genres).filter((f) => !here.includes(f.what))
    // What the world does not have yet comes first, so that lands differ.
    const fresh = fits.filter((f) => !elsewhere.includes(f.what))
    const kind = what ?? (fresh.length ? pick(fresh) : fits.length ? pick(fits) : undefined)?.what
    if (!kind) return undefined
    const f: Feature = { id: nextId('f', list), land, what: kind }
    list.push(f)
    name(f.id, { kind: 'site', tongue: tongueAt(land), base: kind.toLowerCase() }, land)
    return f
  }
  const tieAll = () => { for (const e of [...entities, ...people]) tie(e) }
  return { pick, genres, depth, roles, drawOne, tie, tieAll, neighbour, feature, deities, roots, sitesOf, sites, places, name, tongueAt, person, make, detail, story, hook, build }
}

export function generateSetting(answers: Answers, seed: string): Setting {
  return withSeed(seed, (rng) => {
    const scale = SCALE[answers.size]
    const has = (f: string) => answers.focus.includes(f)
    const genres = answers.genres.length ? answers.genres : ['grounded']
    const rich = answers.depth === 'rich' ? 1 : answers.depth === 'sketch' ? -1 : 0

    // 1. Geography: the world generator, fed with the packs the answers call for.
    const world = blank()
    const all = ['terrain', 'site', 'epithet', 'legacy', 'trait', 'omen'] as const
    for (const pack of [...genres, ...answers.lands]) if (['fantasy', 'scifi', 'horror', 'frost', 'coast', 'dry'].includes(pack)) world.expansions[pack] = [...all]
    if (has('adventure')) world.expansions.quests = ['quest']
    if (has('everyday')) world.expansions.customs = ['question']
    if (has('faith')) world.expansions.lore = ['work', 'twist']
    generateWorld(world, scale.world, (s) => {
      // Common kinds of land come up more often than rare ones: each card draws a lot, weighted by how
      // common its land is, and the pile is taken from the top lot down.
      // Only whole lands are drawn as lands: single formations are features within them, and places in space are held back.
      s.piles.terrain = s.piles.terrain.filter((id) => scaleOf(CARDS[id].cues[0].text) === 'land')
      const lot = new Map(s.piles.terrain.map((id) => [id, rng() ** (1 / landOf(CARDS[id].cues[0].text).common)]))
      s.piles.terrain.sort((a, b) => lot.get(a)! - lot.get(b)!)
      // Without "temperate", the starter deck's terrains are held back unless the map would come up short.
      if (answers.lands.includes('temperate') || !answers.lands.length) return
      const themed = s.piles.terrain.filter((id) => CARDS[id].deck !== 'starter')
      const spare = s.piles.terrain.filter((id) => CARDS[id].deck === 'starter')
      s.piles.terrain = [...spare.slice(0, Math.max(0, scale.min - themed.length)), ...themed]
    })
    const board = world.placed
    settle(board)
    const s: Setting = { id: '', seed, answers, created: Date.now(), board, meta: world.meta, names: {}, specs: {}, entities: [], people: [], hooks: [], built: [] }
    const budget = { left: scale.minor + rich * 3 + (has('faith') ? 1 : 0) + (has('secrets') ? 2 : 0) }
    const w = weave(s, rng, budget)
    const { pick, depth } = w
    const roots = w.roots()
    const sites = w.sites()
    const places = [...roots, ...sites]
    const { entities, people } = s

    // Names: a few tongues, each spoken across a contiguous part of the map.
    const tongues = tonguesFor(genres, scale.tongues, rng)
    const cx = roots.reduce((n, r) => n + board[r].x, 0) / roots.length
    const cy = roots.reduce((n, r) => n + board[r].y, 0) / roots.length
    const byAngle = [...roots].sort((a, b) => Math.atan2(board[a].y - cy, board[a].x - cx) - Math.atan2(board[b].y - cy, board[b].x - cx))
    const tongueOf: Record<string, number> = {}
    byAngle.forEach((r, i) => { tongueOf[r] = tongues[Math.floor((i * tongues.length) / byAngle.length)] })
    w.name('world', { kind: 'world', tongue: tongues[0], genres })
    for (const r of roots) {
      w.name(r, { kind: 'land', tongue: tongueOf[r], base: cueText(CARDS, board[r]).toLowerCase() })
      for (const site of w.sitesOf(r)) w.name(site, { kind: 'site', tongue: tongueOf[r], base: cueText(CARDS, board[site]).toLowerCase() }, r)
    }

    // 3 (begun early, because the powers need people to point at). People: a role from the story deck
    // and a home; their details are filled in once there are powers for them to be tied to.
    for (let i = 0; i < Math.max(2, scale.people + rich * 2 + (has('secrets') ? 2 : 0)); i++) w.person(pick(places))

    // 2. Powers: factions first, then the lesser things their details reach for.
    const factionCount = Math.min(PRIMARY.faction.length, scale.factions + (has('power') ? 1 : 0))
    const factions = Array.from({ length: factionCount }, () => w.make('faction', pick(sites.length ? sites : roots)))
    people.forEach((c, i) => { if (i < factions.length || rng() < 0.5) c.faction = factions[i % factions.length].id })

    for (const f of factions) {
      w.detail(f, depth.major, true)
      // Every faction needs a rival to push against.
      if (factions.length > 1 && !f.details.some((d) => d.links.some((l) => l.kind === 'faction'))) {
        const feud = newDetail(DETAIL.faction.find((t) => t.includes('feud'))!)
        Object.assign(feud.links[0], { kind: 'faction', node: pick(factions.filter((x) => x.id !== f.id)).id })
        f.details = [...f.details.slice(0, depth.major - 1), feud]
      }
    }
    for (let i = factions.length; i < entities.length; i++) w.detail(entities[i], depth.minor, false)
    for (const c of people) w.detail(c, depth.minor, false)

    // 4. Stories: prompts whose every slot is someone or something already in the setting.
    const stories = scale.hooks + rich * 2 + (has('adventure') ? 3 : 0)
    for (let i = 0; i < stories; i++) w.hook(people[i % people.length])

    // What is happening at home becomes the turning point for about half the people who live there.
    for (const c of people) c.local = !!omenAt(board, rootOf(board, c.home)) && rng() < 0.5
    s.id = `s${Date.now().toString(36)}${Math.floor(rng() * 1e6).toString(36)}`

    // 5. Settlements and dangerous places, spread over the map so that no place gets two before every place has one.
    const order = shuffle([...roots], rng)
    const counts = { region: [2, 1], country: [3, 2], continent: [5, 3] }[answers.size]
    for (let i = 0; i < counts[0] + (has('everyday') ? 1 : 0); i++) w.build('settlement', order[i % order.length])
    for (let i = 0; i < counts[1] + (has('adventure') ? 1 : 0); i++) w.build('peril', order[(order.length - 1 - i + order.length * 8) % order.length])

    // 6. The races of the world, then the cultures of some of its places, then its history in ages.
    const scope = { region: [2, 2, 3], country: [2, 3, 4], continent: [3, 5, 5] }[answers.size]
    for (let i = 0; i < scope[0]; i++) w.drawOne('race')
    const homes = shuffle([...roots], rng)
    for (let i = 0; i < Math.min(scope[1] + (has('everyday') ? 1 : 0), homes.length); i++) w.drawOne('culture', homes[i])
    w.drawOne('history', undefined, scope[2])
    // Everyone gets a race and a culture, and what has a past is given its age.
    w.tieAll()

    // 7. The worlds beyond the map's edges: names only.
    // One to three sides are joined to a neighbour; the rest face the sea.
    // The first may take any side; the rest keep clear of sides that islands, lagoons and coasts need for the sea.
    for (let i = 0; i < 1 + Math.floor(rng() * 3); i++) w.neighbour(i > 0)

    // 8. What each land is made up of: two to four features, suited to its country and its coast.
    for (const r of w.roots()) for (let i = 0, n = 2 + Math.floor(rng() * 3); i < n; i++) w.feature(r)
    return s
  })
}

const omenAt = (board: Board, root: string) => subtree(board, root).find((id) => CARDS[id].type === 'omen')
const upper = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)
const lower = (t: string) => t.charAt(0).toLowerCase() + t.slice(1)

/** A new name for one thing in a setting, made the way its first one was. */
export function rename(s: Setting, id: string, rng: Rng = Math.random): string {
  const spec = s.specs[id]
  if (!spec) return s.names[id]
  const taken = new Set(Object.values(s.names).map((n) => n.toLowerCase()))
  const made = makeName({ ...spec, home: spec.homeId ? s.names[spec.homeId] : undefined }, rng, taken)
  return spec.frame ? spec.frame.replace('{}', made) : made
}

export const rootsOf = (s: Setting) =>
  Object.values(s.board).filter((p) => !p.parent).sort((a, b) => Math.round(a.y / 300) - Math.round(b.y / 300) || a.x - b.x).map((p) => p.id)

export const terrainOf = (s: Setting, root: string) => cueText(CARDS, s.board[root])
export const homeRoot = (s: Setting, place: string) => rootOf(s.board, place)

/** A faction with what hangs from it: its members and the things its details brought into being. */
export interface PowerNode { power: Entity; members: Char[]; things: Entity[] }
/** A spot — the land itself or one site on it — with everything found there. */
export interface Spot { id: string; text: string; powers: PowerNode[]; things: Entity[]; people: Char[]; built: Built[]; cultures: Drawn[] }

export interface PlaceView {
  id: string
  name: string
  aka: string
  /** The land, with everything that belongs to the place as a whole. */
  land: Spot
  sites: Spot[]
  /** Members of factions based elsewhere who live here. */
  visitors: Char[]
  todo: string[]
}

/** The faction a thing hangs from: the one that brought it in, or failing that the first to mention it. */
function ownerOf(s: Setting, e: Entity): string | undefined {
  if (e.kind === 'faction') return undefined
  const factions = s.entities.filter((f) => f.kind === 'faction')
  if (e.from && factions.some((f) => f.id === e.from)) return e.from
  return factions.find((f) => f.details.some((d) => d.links.some((l) => l.node === e.id)))?.id
}

/**
 * One place as a tree: the land and each site, and under each the factions based there, with their
 * members and things beneath them, then whatever else is found there and whoever lives there unattached.
 */
export function placeView(s: Setting, root: string): PlaceView {
  const hubs = subtree(s.board, root).filter((id) => CARDS[id].type === 'terrain' || CARDS[id].type === 'site')
  const inside = new Set(subtree(s.board, root))
  const paragraphs = describe(s.board, CARDS, root, [], s.names)
  const book = chronicle(Object.fromEntries([...inside].map((id) => [id, s.board[id]])), CARDS, [], [])
  const owned = new Map(s.entities.map((e) => [e.id, ownerOf(s, e)]))
  const spot = (id: string, i: number): Spot => {
    const powers = s.entities.filter((e) => e.kind === 'faction' && e.home === id)
    return {
      id,
      text: [paragraphs[i] ?? '', mentions(s, id)].filter(Boolean).join(' '),
      powers: powers.map((power) => ({
        power,
        members: s.people.filter((c) => c.faction === power.id),
        things: s.entities.filter((e) => owned.get(e.id) === power.id),
      })),
      things: s.entities.filter((e) => e.kind !== 'faction' && e.home === id && !owned.get(e.id)),
      people: s.people.filter((c) => c.home === id && !c.faction),
      built: (s.built ?? []).filter((b) => b.home === id),
      cultures: (s.drawn ?? []).filter((d) => d.tool === 'culture' && d.home === id),
    }
  }
  const [land, ...sites] = hubs.map(spot)
  return {
    id: root,
    name: s.names[root],
    aka: upper(placeName(s.board, CARDS, root)),
    land,
    sites,
    visitors: s.people.filter((c) => inside.has(c.home) && c.faction && !inside.has(s.entities.find((e) => e.id === c.faction)?.home ?? '')),
    todo: book[0]?.prompts ?? [],
  }
}

const SIZE_WORD: Record<Size, string> = { region: 'a region', country: 'a country', continent: 'a continent' }

/** The opening of a setting: how big it is, who contends for it, and what holds true everywhere. */
export function worldProse(s: Setting): { text: string[]; prompts: string[] } {
  const roots = rootsOf(s)
  const lands = [...new Set(roots.map((r) => terrainOf(s, r).toLowerCase()))]
  const factions = s.entities.filter((e) => e.kind === 'faction')
  const opening = [
    !roots.length ? `${titleCase(upper(s.names.world))} is waiting for its first place.` : `${titleCase(upper(s.names.world))} is ${s.manual ? 'a setting' : SIZE_WORD[s.answers.size]} of ${count(roots.length)} ${roots.length === 1 ? 'place' : 'places'}, taking in ${lands.length > 5 ? `${lands.slice(0, 5).join(', ')} and more besides` : listOf(lands)}.`,
    factions.length ? `${upper(count(factions.length))} ${factions.length === 1 ? 'power holds sway in it' : 'powers contend for it'}: ${listOf(factions.map((f) => s.names[f.id]))}.` : '',
    s.people.length || s.hooks.length ? `${upper(count(s.people.length))} ${s.people.length === 1 ? 'person stands' : 'people stand'} out in what follows, and ${count(s.hooks.length)} ${s.hooks.length === 1 ? 'story is' : 'stories are'} already under way.` : '',
  ].filter(Boolean).join(' ')
  // What lies past the edges, side by side: "the Kuhali Coast to the north and the Mera Vale to the east".
  const sides = beyondOf(s).map((b) => `${s.names[b.id]} to the ${b.side}`)
  const seas = roots.length ? seasOf(s).map((x) => `${x.name} to the ${x.side}`) : []
  const around = [
    sides.length ? `It is joined by land to ${listOf(sides)}.` : '',
    seas.length ? `${sides.length ? 'Its other shores face' : 'It is bounded by'} ${listOf(seas)}.` : '',
  ].filter(Boolean).join(' ')
  const meta = chronicle({}, CARDS, [], s.meta)[0]
  if (around) return { text: [`${opening} ${around}`, ...(meta?.text ?? [])], prompts: meta?.prompts ?? [] }
  return { text: [opening, ...(meta?.text ?? [])], prompts: meta?.prompts ?? [] }
}

const an = (w: string) => `${/^([aeiou]|heir|hour)/i.test(w) ? 'an' : 'a'} ${w}`
const NUMBERS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve']
const count = (n: number) => NUMBERS[n] ?? String(n)
const listOf = (items: string[]) => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`)

const detailLine = (s: Setting, d: DetailInst) =>
  detailParts(d).map((p) => (typeof p === 'string' ? p : s.names[p.node ?? ''] ?? p.primary ?? 'something')).join('')

/** "at Vael Lighthouse, in Marrowick" for a site; "in Marrowick" for the land itself. */
function whereText(s: Setting, home: string): string {
  const root = rootOf(s.board, home)
  return home === root ? `in ${s.names[root]}` : `at ${s.names[home]}, in ${s.names[root]}`
}

/** Details as flowing sentences: the first alone, then the rest in pairs joined by "and". */
function detailProse(s: Setting, details: DetailInst[], first: string, later: string): string {
  const lines = details.map((d) => lower(detailLine(s, d)))
  const out: string[] = []
  if (lines.length) out.push(`${first} ${lines[0]}.`)
  for (let i = 1; i < lines.length; i += 2) out.push(`${i === 1 ? later : first} ${lines.slice(i, i + 2).join(' and ')}.`)
  return out.join(' ')
}

/** What others' details say about this thing, as sentences in their own words. */
function mentions(s: Setting, id: string, skip: (other: Entity) => boolean = () => false): string {
  const out: string[] = []
  for (const other of [...s.entities, ...s.people]) {
    if (other.id === id || skip(other)) continue
    for (const d of other.details) if (d.links.some((l) => l.node === id)) out.push(`${upper(s.names[other.id])} ${lower(detailLine(s, d))}.`)
  }
  return out.slice(0, 4).join(' ')
}

/** A power, thing or event as paragraphs: what it is and where, what is true of it, and what others say of it. */
export function entityText(s: Setting, e: Entity): string[] {
  const name = upper(s.names[e.id])
  const gloss = GLOSS[`${e.kind}:${e.what}`] ?? ''
  const at = e.home ? whereText(s, e.home) : ''
  const intro: Record<string, string> = {
    faction: `${name} is ${an(e.what)}${gloss}.${at ? ` It is based ${at}.` : ''}`,
    event: `${name} was ${an(e.what)}${gloss}.${at ? ` It is remembered ${at}.` : ''}`,
    object: `${name} is ${an(e.what)}${gloss}.${at ? ` It is kept ${at}.` : ''}`,
    creature: `${name} is ${an(e.what)}${gloss}${at ? `, found ${at}` : ''}.`,
    material: `${name} is a kind of ${e.what}${gloss}${at ? `, got ${at}` : ''}.`,
    deity: `${name} is the ${e.what}${gloss}.${at ? ` The chief shrine stands ${at}.` : ''}`,
  }
  const short = e.kind === 'deity' ? 'The deity' : e.kind === 'material' ? `The ${e.what}` : `The ${e.what}`
  const age = e.age === undefined ? undefined : ageNames(s)[e.age]
  const among = e.culture && s.names[e.culture] ? `among ${s.names[e.culture]}` : ''
  const dated: Record<string, string> = {
    faction: age || among ? `It was founded ${[age && `in ${age}`, among].filter(Boolean).join(', ')}.` : '',
    event: age ? `It happened in ${age}.` : '',
    object: age ? `It was made in ${age}.` : '',
    deity: age ? `It has been worshipped since ${age}.` : '',
  }
  return [
    [intro[e.kind] ?? `${name} is ${an(e.what)}.`, dated[e.kind] ?? ''].filter(Boolean).join(' '),
    detailProse(s, e.details, 'It', short),
    // A feud is told once, from this side, even when the rival names it too.
    mentions(s, e.id, (other) => other.kind === 'faction' && e.details.some((d) => d.links.some((l) => l.node === other.id))),
  ].filter(Boolean)
}

/** A person as paragraphs: who they are and where, what ties them to the rest, what they want, and what is changing. */
export function charText(s: Setting, c: Char): string[] {
  const name = s.names[c.id]
  const gloss = ROLE_GLOSS[c.what]
  const intro = `${name} is ${an(c.what)}${gloss ? `, ${gloss}` : ''}. They live ${whereText(s, c.home)}${c.faction ? `, and belong to ${s.names[c.faction]}` : ''}.`
  const race = c.race && s.names[c.race] ? `one of ${s.names[c.race]}` : ''
  const raised = c.culture && s.names[c.culture] ? `raised among ${s.names[c.culture]}` : ''
  const roots = race ? `They are ${race}${raised ? `, ${raised}` : ''}.` : raised ? `They were ${raised}.` : ''
  const wants = s.hooks.flatMap((h) => h.lines.filter((l) => l.who === c.id).map((l) => hookLine(s, l))).slice(0, 2).join(' ')
  const omen = c.local && omenAt(s.board, rootOf(s.board, c.home))
  return [
    [intro, roots].filter(Boolean).join(' '),
    [detailProse(s, c.details, name, `The ${c.what}`), mentions(s, c.id)].filter(Boolean).join(' '),
    wants,
    omen ? `Meanwhile things are changing at home: ${lower(cardSentence(s.board, CARDS, omen))}` : '',
  ].filter(Boolean)
}

const hookLine = (s: Setting, l: HookLine) => {
  const want = `${upper(s.names[l.who])} wants to ${l.drive} ${s.names[l.target]}`
  return l.also ? `${want}, but also wants to ${l.also.drive} ${s.names[l.also.target]}.` : `${want}${l.but ? `, but ${l.but}` : ''}.`
}

/** A story as sentences. When two people are after the same thing, the second is set against the first. */
export const hookText = (s: Setting, h: Hook) =>
  h.lines.map((l, i) => {
    const line = hookLine(s, l)
    if (i === 0) return line
    return `${h.lines[0].target === l.target ? 'Meanwhile' : 'For their part'}, ${line.charAt(0).toLowerCase() === line.charAt(0) ? line : s.names[l.who] + line.slice(upper(s.names[l.who]).length)}`
  }).join(' ')

/** Everything else in the setting that points at this thing. */
export function tiesTo(s: Setting, id: string): string[] {
  const out = new Set<string>()
  for (const e of [...s.entities, ...s.people]) if (e.id !== id && e.details.some((d) => d.links.some((l) => l.node === id))) out.add(e.id)
  for (const h of s.hooks) for (const l of h.lines) if (l.target === id || l.also?.target === id) out.add(l.who)
  if (s.entities.some((e) => e.id === id && e.kind === 'faction')) for (const c of s.people) if (c.faction === id) out.add(c.id)
  // Race, culture and history tie both ways: a person shows theirs, and each of those shows who and what belongs to it.
  const me = [...s.entities, ...s.people].find((e) => e.id === id) as Char | undefined
  const history = s.drawn?.find((d) => d.tool === 'history')
  for (const link of [me?.race, me?.culture, me?.age !== undefined ? history?.id : undefined]) if (link && s.names[link]) out.add(link)
  for (const e of [...s.entities, ...s.people] as Char[]) if (e.race === id || e.culture === id || (history?.id === id && e.age !== undefined)) out.add(e.id)
  const asDrawn = s.drawn?.find((d) => d.id === id)
  if (asDrawn?.race && s.names[asDrawn.race]) out.add(asDrawn.race)
  for (const d of s.drawn ?? []) if (d.race === id) out.add(d.id)
  out.delete(id)
  return [...out]
}

export const summary = (s: Setting) => {
  const q = QUESTIONS
  const label = (set: Record<string, string>, keys: string[]) => keys.map((k) => set[k]).filter(Boolean).join(', ')
  return [
    `${rootsOf(s).length} places, ${s.entities.length} powers and things, ${s.people.length} people, ${s.hooks.length} stories`,
    label(q.genres.options, s.answers.genres), label(q.lands.options, s.answers.lands), label(q.focus.options, s.answers.focus),
  ].filter(Boolean).join(' · ')
}

/** What belongs to the world as a whole: its history, its races, and any culture not tied to a place still on the map. */
export const worldDrawn = (s: Setting, tool: Drawn['tool']) =>
  (s.drawn ?? []).filter((d) => d.tool === tool && (tool !== 'culture' || !d.home || !s.board[d.home]))

export const KIND_ORDER: Kind[] = ['faction', 'deity', 'event', 'object', 'creature', 'material']

/** The whole setting as a Markdown document. */
export function settingMarkdown(s: Setting): string {
  const out: string[] = [`# ${titleCase(upper(s.names.world))}`, `_${summary(s)} · seed “${s.seed}”_`]
  const meta = worldProse(s)
  out.push('## Overview', ...meta.text, ...meta.prompts.map((p) => `- ${p}`))
  const entity = (e: Entity, depth: number) => out.push(`${'#'.repeat(depth)} ${upper(s.names[e.id])} (${e.kind === 'deity' ? e.what : `${e.kind}: ${e.what}`})`, ...entityText(s, e))
  const person = (c: Char, depth: number) => out.push(`${'#'.repeat(depth)} ${s.names[c.id]} (${c.what})`, ...charText(s, c))
  const spot = (sp: Spot, depth: number) => {
    for (const p of sp.powers) {
      entity(p.power, depth)
      for (const c of p.members) person(c, depth + 1)
      for (const e of p.things) entity(e, depth + 1)
    }
    for (const e of sp.things) entity(e, depth)
    for (const c of sp.people) person(c, depth)
    for (const b of sp.built) out.push(`${'#'.repeat(depth)} ${upper(s.names[b.id])} (${builtKind(b)})`, ...builtText(s, b))
    for (const d of sp.cultures) out.push(`${'#'.repeat(depth)} ${upper(s.names[d.id])} (culture)`, ...drawnText(s, d))
  }
  const history = worldDrawn(s, 'history')[0]
  if (history) out.push(`## ${upper(s.names[history.id])}`, ...drawnText(s, history))
  const races = worldDrawn(s, 'race')
  if (races.length) out.push('## Races')
  for (const d of races) out.push(`### ${upper(s.names[d.id])}`, ...drawnText(s, d))
  // A culture whose place has gone is told with the world rather than lost.
  for (const d of worldDrawn(s, 'culture')) out.push(`### ${upper(s.names[d.id])} (culture)`, ...drawnText(s, d))
  out.push('## Places')
  for (const r of rootsOf(s)) {
    const v = placeView(s, r)
    out.push(`### ${v.name} — ${v.aka}`, v.land.text)
    for (const f of featuresOf(s, r)) out.push(`- ${upper(s.names[f.id])} (${f.what.toLowerCase()}): ${featureText(s, f)}`)
    spot(v.land, 4)
    for (const site of v.sites) {
      out.push(`#### ${s.names[site.id]}`, site.text)
      spot(site, 5)
    }
    if (v.visitors.length) out.push(`Also living here: ${listOf(v.visitors.map((c) => `${s.names[c.id]} (of ${s.names[c.faction!]})`))}.`)
    out.push(...v.todo.map((p) => `- ${p}`))
  }
  out.push('## Stories', ...s.hooks.map((h) => `- ${hookText(s, h)} (${s.names[h.at]})`))
  return out.join('\n\n')
}

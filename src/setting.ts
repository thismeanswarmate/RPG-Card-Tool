// A setting is one connected whole built in layers: geography, then the powers at work in it, then
// its people, then the stories waiting to happen. Each layer links to what the earlier ones made, so a
// faction's sacred place is a real spot on the map and its founder is someone in the cast.
// It draws on the Worlds, Lore and Stories decks; the Characters tool stands apart.
//
// Everything is stored as structure — ids, cards and links — and turned into text when shown, so a
// rename reaches every sentence that mentions the thing.

import { cardSentence, chronicle, describe, placeName } from './describe'
import { GLOSS, ROLE_GLOSS } from './glosses'
import { cueText, rootOf, shuffle, subtree, type Board } from './logic'
import { DETAIL, detailParts, detailsFor, newDetail, PRIMARY, slots, type DetailInst, type Kind } from './lore'
import { makeName, rngFrom, titleCase, tonguesFor, type NameSpec, type Rng } from './names'
import { kindLabel, brief as perilBrief, rollAll as rollPeril } from './peril'
import type { Rolls } from './roller'
import { brief as settlementBrief, rollAll as rollSettlement, typeLabel } from './settlement'
import { blank, cardsOf, generateWorld, type WorldSize } from './store'
import { STORY_CARDS } from './story'
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
}
/** A person: a role from the story deck, described with details from the lore deck. */
export interface Char extends Entity { kind: 'figure'; home: string; faction?: string; local: boolean }
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
  specs: Record<string, NameSpec & { homeId?: string }>
  entities: Entity[]
  people: Char[]
  hooks: Hook[]
  /** The art direction for this setting's pictures; absent means it follows the genre. */
  art?: string
  /** Settlements and dangerous places, each rolled on the tables of its own tool. */
  built?: Built[]
  /** Built by hand, one piece at a time, rather than generated from answers. */
  manual?: boolean
}

/** A settlement or dangerous place within the setting: where it is, and what its tables rolled. */
export interface Built { id: string; tool: 'settlement' | 'peril'; home: string; rolls: Rolls; locked?: string[] }
export const builtKind = (b: Built) => (b.tool === 'settlement' ? typeLabel(b.rolls) ?? 'settlement' : kindLabel(b.rolls))
export const builtText = (s: Setting, b: Built) =>
  (b.tool === 'settlement' ? settlementBrief : perilBrief)(s.names[b.id].charAt(0).toUpperCase() + s.names[b.id].slice(1), b.rolls)


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
  const deities = !!s.manual || answers.focus.includes('faith') || genres.includes('fantasy')
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
  const storyDecks = ['core', ...genres.filter((g) => g !== 'grounded')]
  const cues = (kind: string) => STORY_CARDS.filter((c) => c.kind === kind && storyDecks.includes(c.deck)).flatMap((c) => c.cues)
  const roles = cues('character')

  /** A person with a role and a home; their details come later, once there are powers to tie them to. */
  const person = (home: string): Char => {
    const fresh = roles.filter((r) => !people.some((c) => c.what === r))
    const c: Char = { id: nextId('c', people), kind: 'figure', what: pick(fresh.length ? fresh : roles), home, local: false, details: [] }
    name(c.id, { kind: 'person', tongue: tongueAt(home) }, rootOf(board, home))
    people.push(c)
    return c
  }

  const make = (kind: Kind, home?: string, from?: string): Entity => {
    const fresh = PRIMARY[kind].filter((p) => !entities.some((e) => e.kind === kind && e.what === p))
    const what = pick(fresh.length ? fresh : PRIMARY[kind])
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
  const build = (tool: Built['tool'], home: string): Built => {
    const built = (s.built ??= [])
    const rolls = tool === 'settlement' ? rollSettlement({}, [], rng) : rollPeril({}, [], rng)
    const b: Built = { id: nextId('b', built), tool, home, rolls }
    built.push(b)
    if (tool === 'settlement') name(b.id, { kind: 'place', tongue: tongueAt(home) })
    else name(b.id, { kind: 'site', tongue: tongueAt(home), base: kindLabel(rolls) }, rootOf(board, home))
    return b
  }
  return { pick, genres, depth, deities, roots, sitesOf, sites, places, name, tongueAt, person, make, detail, story, hook, build }
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
      // Without "temperate", the starter deck's terrains are held back unless the map would come up short.
      if (answers.lands.includes('temperate') || !answers.lands.length) return
      const themed = s.piles.terrain.filter((id) => CARDS[id].deck !== 'starter')
      const spare = s.piles.terrain.filter((id) => CARDS[id].deck === 'starter')
      s.piles.terrain = [...spare.slice(0, Math.max(0, scale.min - themed.length)), ...themed]
    })
    const board = world.placed
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
      w.name(r, { kind: 'place', tongue: tongueOf[r] })
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
  return makeName({ ...spec, home: spec.homeId ? s.names[spec.homeId] : undefined }, rng, taken)
}

export const rootsOf = (s: Setting) =>
  Object.values(s.board).filter((p) => !p.parent).sort((a, b) => Math.round(a.y / 300) - Math.round(b.y / 300) || a.x - b.x).map((p) => p.id)

export const terrainOf = (s: Setting, root: string) => cueText(CARDS, s.board[root])
export const homeRoot = (s: Setting, place: string) => rootOf(s.board, place)

/** A faction with what hangs from it: its members and the things its details brought into being. */
export interface PowerNode { power: Entity; members: Char[]; things: Entity[] }
/** A spot — the land itself or one site on it — with everything found there. */
export interface Spot { id: string; text: string; powers: PowerNode[]; things: Entity[]; people: Char[]; built: Built[] }

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
  const meta = chronicle({}, CARDS, [], s.meta)[0]
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
  return [
    intro[e.kind] ?? `${name} is ${an(e.what)}.`,
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
  const wants = s.hooks.flatMap((h) => h.lines.filter((l) => l.who === c.id).map((l) => hookLine(s, l))).slice(0, 2).join(' ')
  const omen = c.local && omenAt(s.board, rootOf(s.board, c.home))
  return [
    intro,
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
  }
  out.push('## Places')
  for (const r of rootsOf(s)) {
    const v = placeView(s, r)
    out.push(`### ${v.name} — ${v.aka}`, v.land.text)
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

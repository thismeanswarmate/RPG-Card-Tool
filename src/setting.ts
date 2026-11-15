// A setting is one connected whole built in layers: geography, then the powers at work in it, then
// its people, then the stories waiting to happen. Each layer links to what the earlier ones made, so a
// faction's sacred place is a real spot on the map and its founder is someone in the cast.
// It draws on the Worlds, Lore and Stories decks; the Characters tool stands apart.
//
// Everything is stored as structure — ids, cards and links — and turned into text when shown, so a
// rename reaches every sentence that mentions the thing.

import { cardSentence, chronicle, describe, placeName } from './describe'
import { cueText, rootOf, subtree, type Board } from './logic'
import { DETAIL, detailParts, detailsFor, newDetail, PRIMARY, slots, type DetailInst, type Kind } from './lore'
import { makeName, rngFrom, titleCase, tonguesFor, type NameSpec, type Rng } from './names'
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

export interface Entity { id: string; kind: Kind; what: string; home?: string; details: DetailInst[] }
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

export function generateSetting(answers: Answers, seed: string): Setting {
  return withSeed(seed, (rng) => {
    const pick = <T,>(a: T[]): T => a[Math.floor(rng() * a.length)]
    const scale = SCALE[answers.size]
    const depth = DETAILS[answers.depth]
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
    const roots = Object.values(board).filter((p) => !p.parent).map((p) => p.id)
    const sitesOf = (root: string) => subtree(board, root).filter((id) => CARDS[id].type === 'site')
    const sites = roots.flatMap(sitesOf)
    const places = [...roots, ...sites]

    // Names: a few tongues, each spoken across a contiguous part of the map.
    const names: Record<string, string> = {}
    const specs: Setting['specs'] = {}
    const taken = new Set<string>()
    const tongues = tonguesFor(genres, scale.tongues, rng)
    const cx = roots.reduce((n, r) => n + board[r].x, 0) / roots.length
    const cy = roots.reduce((n, r) => n + board[r].y, 0) / roots.length
    const byAngle = [...roots].sort((a, b) => Math.atan2(board[a].y - cy, board[a].x - cx) - Math.atan2(board[b].y - cy, board[b].x - cx))
    const tongueOf: Record<string, number> = {}
    byAngle.forEach((r, i) => { tongueOf[r] = tongues[Math.floor((i * tongues.length) / byAngle.length)] })
    const tongueAt = (place?: string) => (place ? tongueOf[rootOf(board, place)] : pick(tongues))
    const name = (id: string, spec: NameSpec, homeId?: string) => {
      const full = { ...spec, home: homeId ? names[homeId] : undefined }
      names[id] = makeName(full, rng, taken)
      specs[id] = { ...spec, homeId }
    }
    name('world', { kind: 'world', tongue: tongues[0], genres })
    for (const r of roots) {
      name(r, { kind: 'place', tongue: tongueOf[r] })
      for (const s of sitesOf(r)) name(s, { kind: 'site', tongue: tongueOf[r], base: cueText(CARDS, board[s]).toLowerCase() }, r)
    }

    const storyDecks = ['core', ...genres.filter((g) => g !== 'grounded')]
    const cues = (kind: string) => STORY_CARDS.filter((c) => c.kind === kind && storyDecks.includes(c.deck)).flatMap((c) => c.cues)

    // 3 (begun early, because the powers need people to point at). People: a role from the story deck
    // and a home; their details are filled in once there are powers for them to be tied to.
    const roles = cues('character')
    const people: Char[] = []
    for (let i = 0; i < Math.max(2, scale.people + rich * 2 + (has('secrets') ? 2 : 0)); i++) {
      const home = pick(places)
      const fresh = roles.filter((r) => !people.some((c) => c.what === r))
      const c: Char = { id: `c${i}`, kind: 'figure', what: pick(fresh.length ? fresh : roles), home, local: false, details: [] }
      name(c.id, { kind: 'person', tongue: tongueAt(home) }, rootOf(board, home))
      people.push(c)
    }

    // 2. Powers: factions first, then the lesser things their details reach for.
    const deities = has('faith') || genres.includes('fantasy')
    const packs = { deities, emblems: false, names: false }
    const entities: Entity[] = []
    const used = new Set<string>()
    const make = (kind: Kind, home?: string): Entity => {
      const fresh = PRIMARY[kind].filter((p) => !used.has(`${kind}:${p}`))
      const what = pick(fresh.length ? fresh : PRIMARY[kind])
      used.add(`${kind}:${what}`)
      const e: Entity = { id: `e${entities.length}`, kind, what, home, details: [] }
      entities.push(e)
      const nameKind = kind === 'figure' || kind === 'place' ? 'object' : kind
      name(e.id, { kind: nameKind, tongue: tongueAt(home), base: what }, home && rootOf(board, home))
      return e
    }
    const factionCount = Math.min(PRIMARY.faction.length, scale.factions + (has('power') ? 1 : 0))
    const factions = Array.from({ length: factionCount }, () => make('faction', pick(sites.length ? sites : roots)))
    people.forEach((c, i) => { if (i < factions.length || rng() < 0.5) c.faction = factions[i % factions.length].id })

    let budget = scale.minor + rich * 3 + (has('faith') ? 1 : 0) + (has('secrets') ? 2 : 0)
    const ofKind = (kind: Kind, self: Entity) => entities.filter((e) => e.kind === kind && e.id !== self.id)
    /** Whether a link of this kind can be completed for an entity, creating something new if allowed. */
    const can = (kind: Kind, self: Entity, create: boolean) =>
      kind === 'place' || kind === 'figure' ? true
        : kind === 'deity' && !deities ? false
          : ofKind(kind, self).length > 0 || (create && kind !== 'faction' && budget > 0)
    const resolve = (kinds: Kind[], self: Entity, create: boolean) => {
      const kind = pick(kinds.filter((k) => can(k, self, create)))
      if (kind === 'place') {
        const others = places.filter((p) => p !== self.home)
        return { kind, node: pick(others.length ? others : places) }
      }
      if (kind === 'figure') {
        const others = people.filter((c) => c.id !== self.id)
        const own = others.filter((c) => c.faction === self.id)
        return { kind, node: pick(own.length && rng() < 0.7 ? own : others).id }
      }
      const existing = ofKind(kind, self)
      if (existing.length && (!create || kind === 'faction' || budget <= 0 || rng() < 0.35)) return { kind, node: pick(existing).id }
      budget--
      return { kind, node: make(kind, self.home ?? pick(places)).id }
    }
    const detail = (self: Entity, count: number, create: boolean) => {
      const pool = detailsFor(self.kind, packs).filter((t) => slots(t).every((ks) => ks.some((k) => can(k, self, create))))
      const linked = pool.filter((t) => slots(t).length)
      const chosen: string[] = []
      while (chosen.length < count && chosen.length < pool.length) {
        const t = pick(chosen.length === 0 && linked.length ? linked : pool)
        if (!chosen.includes(t)) chosen.push(t)
      }
      self.details = chosen.map((t) => {
        const d = newDetail(t)
        for (const link of d.links) Object.assign(link, resolve(link.kinds, self, create))
        return d
      })
    }
    for (const f of factions) {
      detail(f, depth.major, true)
      // Every faction needs a rival to push against.
      if (factions.length > 1 && !f.details.some((d) => d.links.some((l) => l.kind === 'faction'))) {
        const feud = newDetail(DETAIL.faction.find((t) => t.includes('feud'))!)
        Object.assign(feud.links[0], { kind: 'faction', node: pick(factions.filter((x) => x.id !== f.id)).id })
        f.details = [...f.details.slice(0, depth.major - 1), feud]
      }
    }
    for (let i = factions.length; i < entities.length; i++) detail(entities[i], depth.minor, false)
    for (const c of people) detail(c, depth.minor, false)

    // 4. Stories: prompts whose every slot is someone or something already in the setting.
    const drives = cues('drive')
    const obstacles = cues('obstacle')
    const forPerson = drives.filter((d) => !THINGS_ONLY.has(d))
    const things = [...sites, ...roots, ...entities.filter((e) => e.kind === 'object').map((e) => e.id)]
    const rivalOf = (a: Char) => {
      const others = people.filter((c) => c.id !== a.id)
      const rivals = others.filter((c) => c.faction && c.faction !== a.faction)
      return pick(rivals.length ? rivals : others)
    }
    const hooks: Hook[] = Array.from({ length: scale.hooks + rich * 2 + (has('adventure') ? 3 : 0) }, (_, i) => {
      const a = people[i % people.length]
      const roll = rng()
      const x = pick(things)
      const lines: HookLine[] =
        roll < 0.35 ? [{ who: a.id, drive: pick(drives), target: x, but: pick(obstacles) }]
          : roll < 0.6 ? [{ who: a.id, drive: pick(drives), target: x, but: pick(obstacles) }, { who: rivalOf(a).id, drive: pick(drives), target: x, but: pick(obstacles) }]
            : roll < 0.8 ? (() => { const b = rivalOf(a); return [{ who: a.id, drive: pick(forPerson), target: b.id, but: pick(obstacles) }, { who: b.id, drive: pick(forPerson), target: a.id, but: pick(obstacles) }] })()
              : [{ who: a.id, drive: pick(drives), target: x, also: { drive: pick(forPerson), target: rivalOf(a).id } }]
      return { id: `h${i}`, at: rootOf(board, a.home), lines }
    })

    // What is happening at home becomes the turning point for about half the people who live there.
    for (const c of people) c.local = !!omenAt(board, rootOf(board, c.home)) && rng() < 0.5

    return { id: `s${Date.now().toString(36)}${Math.floor(rng() * 1e6).toString(36)}`, seed, answers, created: Date.now(), board, meta: world.meta, names, specs, entities, people, hooks }
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

export interface PlaceView {
  id: string
  name: string
  aka: string
  prose: string[]
  todo: string[]
  sites: string[]
  people: Char[]
  powers: Entity[]
  hooks: Hook[]
}

export function placeView(s: Setting, root: string): PlaceView {
  const inside = new Set(subtree(s.board, root))
  const book = chronicle({ [root]: s.board[root], ...Object.fromEntries([...inside].map((id) => [id, s.board[id]])) }, CARDS, [], [])
  return {
    id: root,
    name: s.names[root],
    aka: upper(placeName(s.board, CARDS, root)),
    prose: describe(s.board, CARDS, root, [], s.names),
    todo: book[0]?.prompts ?? [],
    sites: [...inside].filter((id) => CARDS[id].type === 'site'),
    people: s.people.filter((c) => inside.has(c.home)),
    powers: s.entities.filter((e) => e.home && inside.has(e.home)),
    hooks: s.hooks.filter((h) => h.at === root),
  }
}

export const worldProse = (s: Setting) => chronicle({}, CARDS, [], s.meta)[0]

/** A power, object, event and so on, as sentences. */
export function entityText(s: Setting, e: Entity): string {
  const where = e.home ? ` ${e.kind === 'faction' ? 'is based at' : 'belongs to'} ${s.names[e.home]}.` : ''
  return [
    where && `${upper(s.names[e.id])}${where}`,
    ...e.details.map((d, i) => `${i === 0 && !where ? upper(s.names[e.id]) : 'It'} ${lower(detailLine(s, d))}.`),
  ].filter(Boolean).join(' ')
}

const detailLine = (s: Setting, d: DetailInst) =>
  detailParts(d).map((p) => (typeof p === 'string' ? p : s.names[p.node ?? ''] ?? p.primary ?? 'something')).join('')

/** A person as paragraphs: who they are and where, what ties them to the rest, and what is changing around them. */
export function charText(s: Setting, c: Char): string[] {
  const name = s.names[c.id]
  const intro = `${name} is ${/^[aeiou]/i.test(c.what) ? 'an' : 'a'} ${c.what}, living at ${s.names[c.home]}${c.faction ? ` and belonging to ${s.names[c.faction]}` : ''}.`
  const ties = c.details.map((d, i) => `${i === 0 ? name : `The ${c.what}`} ${lower(detailLine(s, d))}.`).join(' ')
  const omen = c.local && omenAt(s.board, rootOf(s.board, c.home))
  return [intro, ties, omen ? `Now things are changing at home: ${lower(cardSentence(s.board, CARDS, omen))}` : ''].filter(Boolean)
}

export const hookText = (s: Setting, h: Hook) =>
  h.lines.map((l) => {
    const want = `${upper(s.names[l.who])} wants to ${l.drive} ${s.names[l.target]}`
    return l.also ? `${want}, but also wants to ${l.also.drive} ${s.names[l.also.target]}.` : `${want}${l.but ? `, but ${l.but}` : ''}.`
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
  if (meta) out.push('## Across the world', ...meta.text, ...meta.prompts.map((p) => `- ${p}`))
  out.push('## Places')
  for (const r of rootsOf(s)) {
    const v = placeView(s, r)
    out.push(`### ${v.name} — ${v.aka}`, ...v.prose)
    if (v.sites.length) out.push(`Sites: ${v.sites.map((id) => s.names[id]).join(', ')}.`)
    if (v.people.length) out.push(`People: ${v.people.map((c) => s.names[c.id]).join(', ')}.`)
    if (v.powers.length) out.push(`Also here: ${v.powers.map((e) => s.names[e.id]).join(', ')}.`)
    out.push(...v.todo.map((p) => `- ${p}`), ...v.hooks.map((h) => `- Story: ${hookText(s, h)}`))
  }
  out.push('## Powers and things')
  for (const kind of KIND_ORDER)
    for (const e of s.entities.filter((x) => x.kind === kind)) out.push(`### ${upper(s.names[e.id])} (${kind === 'deity' ? e.what : `${kind}: ${e.what}`})`, entityText(s, e))
  out.push('## People')
  for (const c of s.people) out.push(`### ${s.names[c.id]} (${c.what})`, ...charText(s, c))
  out.push('## Stories', ...s.hooks.map((h) => `- ${hookText(s, h)}`))
  return out.join('\n\n')
}

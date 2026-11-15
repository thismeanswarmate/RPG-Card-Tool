// Building a setting by hand: the same pieces the generator lays down in bulk, added one at a time,
// changed and taken away again. Every function here changes the setting it is given.

import { cueText, autoEdge, rootOf, subtree } from './logic'
import type { Kind } from './lore'
import { tonguesFor } from './names'
import { kindLabel, rollAll as rollPeril, stepsFor as perilSteps } from './peril'
import { DEFAULT_ANSWERS, weave, type Built, type Char, type Entity, type Setting } from './setting'
import { rollAll as rollSettlement, stepsFor as settlementSteps } from './settlement'
import { cardsOf } from './store'
import type { CardType } from './types'

const CARDS = cardsOf({ custom: [] })
const rand = (n: number) => Math.floor(Math.random() * n)

/** An empty setting to build in. The genres and lands decide which cards and names it draws on. */
export function newManual(genres: string[], lands: string[], title = ''): Setting {
  const s: Setting = {
    id: `s${Date.now().toString(36)}${rand(1e6).toString(36)}`, seed: 'built by hand', created: Date.now(), manual: true,
    answers: { ...DEFAULT_ANSWERS, size: 'region', genres, lands, focus: [] },
    board: {}, meta: [], names: {}, specs: {}, entities: [], people: [], hooks: [], built: [],
  }
  const tongue = tonguesFor(genres.length ? genres : ['grounded'], 1, Math.random)[0]
  weave(s).name('world', { kind: 'world', tongue, genres: genres.length ? genres : ['grounded'] })
  if (title.trim()) s.names.world = title.trim()
  return s
}

/** An unused card of a type from the decks this setting draws on, preferring its themed decks for terrain. */
function draw(s: Setting, type: CardType): string | undefined {
  const { genres, lands } = s.answers
  const decks = new Set(['starter', ...genres, ...lands])
  const used = new Set([...Object.keys(s.board), ...s.meta.map((h) => h.card)])
  const all = Object.values(CARDS).filter((c) => c.type === type && decks.has(c.deck) && !used.has(c.id))
  const themed = all.filter((c) => c.deck !== 'starter')
  const pool = type === 'terrain' && themed.length && lands.length && !lands.includes('temperate') ? themed : all
  return pool[rand(pool.length)]?.id
}

function tuck(s: Setting, id: string, hub: string) {
  const active = rand(CARDS[id].cues.length)
  const order = Object.values(s.board).reduce((n, p) => Math.max(n, p.order), 0) + 1
  s.board[id] = { id, active, x: 0, y: 0, parent: hub, edge: autoEdge(s.board, CARDS, hub, CARDS[id], active), order }
}

/** The cards that describe a place: one each of what it is called, what was there, what it is like and what is afoot. */
function dress(s: Setting, root: string) {
  for (const type of ['epithet', 'legacy', 'trait', 'omen'] as CardType[]) {
    const id = draw(s, type)
    if (!id) continue
    const hubs = type === 'omen' ? [root] : subtree(s.board, root).filter((c) => CARDS[c].type === 'terrain' || CARDS[c].type === 'site')
    tuck(s, id, hubs[rand(hubs.length)])
  }
}

/** A new place beside the ones already there, with a site and its describing cards. Returns its id. */
export function addPlace(s: Setting): string | undefined {
  const id = draw(s, 'terrain')
  if (!id) return
  const w = weave(s)
  const roots = w.roots().map((r) => s.board[r])
  // The free spots next to existing places, on the same staggered grid the generator uses; the one nearest the middle wins.
  let x = 0, y = 0, tongue = s.specs.world.tongue
  if (roots.length) {
    const cx = roots.reduce((n, p) => n + p.x, 0) / roots.length, cy = roots.reduce((n, p) => n + p.y, 0) / roots.length
    const spots = roots.flatMap((p) => [[560, 0], [-560, 0], [280, 490], [-280, 490], [280, -490], [-280, -490]].map(([dx, dy]) => ({ x: p.x + dx, y: p.y + dy, from: p.id })))
      .filter((q) => roots.every((p) => Math.hypot(p.x - q.x, p.y - q.y) > 400))
      .map((q) => ({ ...q, d: Math.hypot(q.x - cx, q.y - cy) + rand(500) }))
      .sort((a, b) => a.d - b.d)
    x = spots[0].x + rand(80) - 40
    y = spots[0].y + rand(80) - 40
    // Most places speak as their neighbour does; now and then a new tongue arrives.
    tongue = Math.random() < 0.75 ? s.specs[spots[0].from].tongue : tonguesFor(w.genres, 3, Math.random)[rand(3)] ?? tongue
  }
  s.board[id] = { id, active: rand(CARDS[id].cues.length), x, y, order: Object.values(s.board).reduce((n, p) => Math.max(n, p.order), 0) + 1 }
  weave(s).name(id, { kind: 'place', tongue })
  addSite(s, id)
  dress(s, id)
  return id
}

export function addSite(s: Setting, root: string): string | undefined {
  const id = draw(s, 'site')
  if (!id) return
  tuck(s, id, root)
  const w = weave(s)
  w.name(id, { kind: 'site', tongue: w.tongueAt(root), base: cueText(CARDS, s.board[id]).toLowerCase() }, root)
  return id
}

/** Draw the describing cards of a place again, keeping the land, its sites and everything in it. */
export function redrawPlace(s: Setting, root: string) {
  for (const id of subtree(s.board, root)) if (!['terrain', 'site'].includes(CARDS[id].type)) delete s.board[id]
  dress(s, root)
}

/** Whether a land or site card has another face to turn to. */
export const canTurn = (id: string) => CARDS[id].cues.length > 1
/** Turn a land or site to its next kind, keeping its name and everything in it. */
export function turn(s: Setting, id: string) {
  s.board[id].active = (s.board[id].active + 1) % CARDS[id].cues.length
  if (CARDS[id].type === 'site' && s.specs[id]) s.specs[id].base = cueText(CARDS, s.board[id]).toLowerCase()
}

const find = (s: Setting, id: string): Entity | undefined => s.entities.find((e) => e.id === id) ?? s.people.find((c) => c.id === id)

/** A faction, deity, event, object, creature or material at a place, described in terms of what is already there. */
export function addPower(s: Setting, kind: Kind, home: string): string {
  const w = weave(s)
  const e = w.make(kind, home)
  w.detail(e, kind === 'faction' ? w.depth.major : w.depth.minor, false)
  return e.id
}

export function addPerson(s: Setting, home: string): string {
  const w = weave(s)
  const c = w.person(home)
  const local = s.entities.filter((e) => e.kind === 'faction' && e.home && rootOf(s.board, e.home) === rootOf(s.board, home))
  if (local.length && Math.random() < 0.6) c.faction = local[rand(local.length)].id
  w.detail(c, w.depth.minor, false)
  return c.id
}

/** Write the details of a power, thing or person again, so that they can take in what has been added since. */
export function rewrite(s: Setting, id: string) {
  const e = find(s, id)
  if (e) { const w = weave(s); w.detail(e, e.kind === 'faction' ? w.depth.major : w.depth.minor, false) }
}

export function setFaction(s: Setting, id: string, faction: string | undefined) {
  const c = s.people.find((x) => x.id === id)
  if (c) { if (faction) c.faction = faction; else delete c.faction }
}

export function addStory(s: Setting, who: string): string | undefined {
  const c = s.people.find((x) => x.id === who)
  return c && weave(s).hook(c).id
}
export function rerollStory(s: Setting, id: string) {
  const h = s.hooks.find((x) => x.id === id)
  const c = h && s.people.find((x) => x.id === h.lines[0].who)
  if (h && c) h.lines = weave(s).story(c)
}
export function removeStory(s: Setting, id: string) { s.hooks = s.hooks.filter((h) => h.id !== id) }

export const addBuilt = (s: Setting, tool: Built['tool'], home: string) => weave(s).build(tool, home).id

export const builtSteps = (b: Built) => (b.tool === 'settlement' ? settlementSteps : perilSteps)(b.rolls)
/** Change one table of a settlement or dangerous place: a number picks that result, 'roll' draws another, 'lock' holds or frees it. */
export function builtEdit(s: Setting, id: string, table: string, change: number | undefined | 'roll' | 'lock') {
  const b = s.built?.find((x) => x.id === id)
  if (!b) return
  if (change === 'lock') { const held = b.locked ?? []; b.locked = held.includes(table) ? held.filter((x) => x !== table) : [...held, table]; return }
  if (change === 'roll') {
    const tb = builtSteps(b).flatMap((x) => x.tables).find((x) => x.id === table)
    if (!tb) return
    const options = tb.entries.map((_, i) => i).filter((i) => i !== b.rolls[table])
    b.rolls[table] = options[rand(options.length)] ?? 0
  } else b.rolls[table] = change
  // A changed result can bring in tables that were not there before; those are rolled, the rest left alone.
  const keep = Object.keys(b.rolls).filter((k) => b.rolls[k] !== undefined)
  b.rolls = (b.tool === 'settlement' ? rollSettlement : rollPeril)(b.rolls, keep)
  if (b.tool === 'peril' && s.specs[b.id]) s.specs[b.id].base = kindLabel(b.rolls)
}
export function builtReroll(s: Setting, id: string) {
  const b = s.built?.find((x) => x.id === id)
  if (b) b.rolls = (b.tool === 'settlement' ? rollSettlement : rollPeril)(b.rolls, b.locked ?? [])
}

/** Everything that goes when one thing is removed: a place takes its sites and all that is based there. */
export function goneWith(s: Setting, id: string): string[] {
  const gone = new Set(s.board[id] ? subtree(s.board, id) : [id])
  for (const x of [...s.entities, ...s.people, ...(s.built ?? [])]) if (x.home && gone.has(x.home)) gone.add(x.id)
  return [...gone]
}

/** Remove a place, site, power, thing, person or built place, and every mention of it elsewhere. */
export function remove(s: Setting, id: string) {
  const gone = new Set(goneWith(s, id))
  for (const g of gone) { delete s.board[g]; delete s.names[g]; delete s.specs[g] }
  s.entities = s.entities.filter((e) => !gone.has(e.id))
  s.people = s.people.filter((c) => !gone.has(c.id))
  s.built = (s.built ?? []).filter((b) => !gone.has(b.id))
  s.hooks = s.hooks.filter((h) => !h.lines.some((l) => gone.has(l.who) || gone.has(l.target) || (l.also && gone.has(l.also.target))))
  for (const e of [...s.entities, ...s.people] as (Entity | Char)[]) {
    e.details = e.details.filter((d) => !d.links.some((l) => l.node && gone.has(l.node)))
    if (e.from && gone.has(e.from)) delete e.from
    if ('faction' in e && e.faction && gone.has(e.faction)) delete e.faction
  }
  for (const spec of Object.values(s.specs)) if (spec.homeId && gone.has(spec.homeId)) delete spec.homeId
}

// Building a setting by hand: the same pieces the generator lays down in bulk, added one at a time,
// changed and taken away again. Every function here changes the setting it is given.

import { cueText, autoEdge, rootOf, subtree } from './logic'
import { PRIMARY, type Kind } from './lore'
import { tonguesFor } from './names'
import { KINDS as PERIL_KINDS, kindLabel, rollAll as rollPeril, stepsFor as perilSteps } from './peril'
import { STORY_CARDS } from './story'
import { cardOf, draw as drawCard, fill as fillCards } from './cardTool'
import { emblemFrom, ICONS, tidy, type EmblemSpec } from './emblem'
import { glyphFor, type Glyph } from './mapgen'
import { ageNames, decksOf, DEFAULT_ANSWERS, DRAWN_DEF, drawnPacks, weave, type Drawn, type Built, type Char, type Entity, type Setting } from './setting'
import { rollAll as rollSettlement, stepsFor as settlementSteps, TYPES as SETTLEMENT_TYPES } from './settlement'
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

/** The unused cards of a type from the decks this setting draws on. */
function unused(s: Setting, type: CardType) {
  const used = new Set([...Object.keys(s.board), ...s.meta.map((h) => h.card)])
  const of = (decks: string[]) => Object.values(CARDS).filter((c) => c.type === type && decks.includes(c.deck) && !used.has(c.id))
  const mixed = of(decksOf(s).world)
  // Decks with nothing of this type left fall back on the starter deck.
  return mixed.length ? mixed : of(['starter'])
}

/** Put a deck in or out of the mix for whatever is added from now on. */
export function toggleDeck(s: Setting, group: 'world' | 'story' | 'deities' | 'animal', id = '') {
  const now = decksOf(s)
  const flip = (list: string[]) => (list.includes(id) ? list.filter((d) => d !== id) : [...list, id])
  s.decks = group === 'deities' ? { ...now, deities: !now.deities } : group === 'animal' ? { ...now, animal: !now.animal } : { ...now, [group]: flip(now[group]) }
}

/** One of them at random, preferring the themed decks for terrain. */
function draw(s: Setting, type: CardType): string | undefined {
  const { lands } = s.answers
  const all = unused(s, type)
  const themed = all.filter((c) => c.deck !== 'starter')
  // Until the decks are chosen by hand, a setting without temperate lands keeps to its themed terrain.
  const pool = type === 'terrain' && !s.decks && themed.length && lands.length && !lands.includes('temperate') ? themed : all
  return pool[rand(pool.length)]?.id
}

function tuck(s: Setting, id: string, hub: string, active = rand(CARDS[id].cues.length)) {
  const order = Object.values(s.board).reduce((n, p) => Math.max(n, p.order), 0) + 1
  s.board[id] = { id, active, x: 0, y: 0, parent: hub, edge: autoEdge(s.board, CARDS, hub, CARDS[id], active), order }
}

/** What describes a land: one each of what it is called, what was there, what it is like and what is afoot. All belong to the land itself, so they are told in its description. */
function dress(s: Setting, root: string) {
  for (const type of ['epithet', 'legacy', 'trait', 'omen'] as CardType[]) {
    const id = draw(s, type)
    if (id) tuck(s, id, root)
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

/** Draw what describes a land again, keeping the land, its sites and everything in them. */
export function redrawPlace(s: Setting, root: string) {
  for (const p of Object.values(s.board)) if (p.parent === root && ['epithet', 'legacy', 'trait', 'omen'].includes(CARDS[p.id].type)) delete s.board[p.id]
  dress(s, root)
}

/** The parts of a place that can be chosen, in the order they are shown, with the question each answers. */
export const ASPECTS: [CardType, string][] = [['terrain', 'Land'], ['epithet', 'Called'], ['legacy', 'Its past'], ['trait', 'Today'], ['omen', 'What is afoot']]

export interface Choice { value: string; text: string }
/** Everything a part of a place could be, as plain text: what it is now, and whatever is not in use elsewhere. */
export function choices(s: Setting, type: CardType, current?: string): Choice[] {
  const cards = [...(current ? [CARDS[current]] : []), ...unused(s, type)]
  return cards.flatMap((c) => c.cues.map((cue, i) => ({ value: `${c.id}:${i}`, text: cue.text })))
    .sort((a, b) => a.text.replace(/^(of|the) /i, '').localeCompare(b.text.replace(/^(of|the) /i, '')))
}
export const chosen = (s: Setting, id: string) => `${id}:${s.board[id].active}`
/** The deck a land, site or describing part came from, and the deck of a person's role. */
export const themeOf = (id: string) => CARDS[id]?.deck
export const roleTheme = (s: Setting, role: string) => STORY_CARDS.find((c) => c.kind === 'character' && c.cues.includes(role))?.deck

/** The options that came with one draw: as many as its card has, be that one, two or four. */
export const drawn = (id: string): Choice[] => CARDS[id].cues.map((cue, i) => ({ value: `${id}:${i}`, text: cue.text }))
/** What describes a land or a site, by part: the entries that belong to it and so appear in its own description. */
export const aspectsOf = (s: Setting, hub: string, type: CardType) =>
  type === 'terrain' ? [hub] : Object.values(s.board).filter((p) => p.parent === hub && CARDS[p.id].type === type).map((p) => p.id)

/** Swap the id of a land or site for another, everywhere it is mentioned. */
function rekey(s: Setting, from: string, to: string) {
  const { id, ...rest } = s
  Object.assign(s, JSON.parse(JSON.stringify(rest).split(JSON.stringify(from)).join(JSON.stringify(to))), { id })
}

/**
 * Set one part of a place. `value` is a choice from `choices`, 'random' for any of them, or '' to leave the
 * part out; `current` is the entry it replaces. A land or site keeps its name and everything in it.
 */
export function choose(s: Setting, root: string, type: CardType, value: string, current?: string) {
  if (value === 'random') {
    // A fresh draw is always a different card, so every option on offer changes.
    const all = choices(s, type, current).filter((c) => !current || !c.value.startsWith(`${current}:`))
    if (!all.length) return
    value = all[rand(all.length)].value
  }
  const [card, cue] = [value.slice(0, value.lastIndexOf(':')), +value.slice(value.lastIndexOf(':') + 1)]
  if (type === 'terrain' || type === 'site') {
    if (!current || !CARDS[card]) return
    if (card !== current) rekey(s, current, card)
    s.board[card].active = cue
    if (type === 'site' && s.specs[card]) s.specs[card].base = cueText(CARDS, s.board[card]).toLowerCase()
    return
  }
  const hub = (current && s.board[current]?.parent) || root
  if (current) delete s.board[current]
  if (CARDS[card]) tuck(s, card, hub, cue)
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
  w.tie(e)
  return e.id
}

export function addPerson(s: Setting, home: string): string {
  const w = weave(s)
  const c = w.person(home)
  const local = s.entities.filter((e) => e.kind === 'faction' && e.home && rootOf(s.board, e.home) === rootOf(s.board, home))
  if (local.length && Math.random() < 0.6) c.faction = local[rand(local.length)].id
  w.detail(c, w.depth.minor, false)
  w.tie(c)
  return c.id
}

/** Write the details of a power, thing or person again, so that they can take in what has been added since. */
export function rewrite(s: Setting, id: string) {
  const e = find(s, id)
  if (e) { const w = weave(s); w.detail(e, e.kind === 'faction' ? w.depth.major : w.depth.minor, false) }
}

/** The story decks a setting draws its roles from. */
const roleCards = (s: Setting) => {
  const of = (decks: string[]) => STORY_CARDS.filter((c) => c.kind === 'character' && decks.includes(c.deck))
  const mixed = of(decksOf(s).story)
  return mixed.length ? mixed : of(['core'])
}
/** The kinds a power or thing can be, dealt out four to a draw. */
const kindDraws = (kind: Kind) => Array.from({ length: Math.ceil(PRIMARY[kind].length / 4) }, (_, i) => PRIMARY[kind].slice(i * 4, i * 4 + 4))

/** The draw a person's role or a thing's kind came from: the options that were on offer alongside it. */
export function whatOptions(s: Setting, id: string): string[] {
  const e = find(s, id)
  if (!e) return []
  const draws = e.kind === 'figure' ? roleCards(s).map((c) => c.cues) : kindDraws(e.kind)
  return draws.find((d) => d.includes(e.what)) ?? [e.what]
}
/** Draw again: a different set of options, one of which is taken. */
export function redrawWhat(s: Setting, id: string) {
  const e = find(s, id)
  if (!e) return
  const draws = (e.kind === 'figure' ? roleCards(s).map((c) => c.cues) : kindDraws(e.kind)).filter((d) => !d.includes(e.what))
  const next = draws[rand(draws.length)]
  if (next) setWhat(s, id, next[rand(next.length)])
}
/** Change what something is. Its name stays; draw another to match if wanted. */
export function setWhat(s: Setting, id: string, what: string) {
  const e = find(s, id)
  if (!e) return
  e.what = what
  if (e.kind !== 'figure' && s.specs[id]) s.specs[id].base = what
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

/** Add a race or the history to the world, or a culture to a place. A setting has one history. */
export function addDrawn(s: Setting, tool: Drawn['tool'], home?: string): string | undefined {
  if (tool === 'history' && s.drawn?.some((d) => d.tool === 'history')) return s.drawn.find((d) => d.tool === 'history')!.id
  const w = weave(s)
  const id = w.drawOne(tool, home && rootOf(s.board, home)).id
  // Whatever has no race, culture or age yet is given one now that there is one to give.
  w.tieAll()
  return id
}

/** Set, or with no value clear, the race or culture of a person, the culture of a faction, or the age something dates from. */
export function setTie(s: Setting, id: string, field: 'race' | 'culture' | 'age', value: string) {
  const e = find(s, id) as (Entity & { race?: string }) | undefined
  if (!e) return
  if (value === '') delete e[field]
  else if (field === 'age') e.age = +value
  else e[field] = value
}
const drawnOf = (s: Setting, id: string) => s.drawn?.find((d) => d.id === id)
const asItem = (d: Drawn) => ({ id: d.id, name: '', notes: '', sections: d.sections })
/** Change one aspect: a number picks that option, 'draw' draws afresh, 'lock' holds or frees it, 'clear' leaves it out. */
export function drawnEdit(s: Setting, id: string, section: number, aspect: string, change: number | 'draw' | 'lock' | 'clear') {
  const d = drawnOf(s, id)
  const slots = d?.sections[section]?.slots
  if (!d || !slots) return
  const def = DRAWN_DEF[d.tool]
  const held = slots[aspect]
  if (change === 'draw') slots[aspect] = drawCard(def, aspect, drawnPacks(s), d.sections.flatMap((x) => Object.values(x.slots).flatMap((h) => (h ? [h.card] : []))))
  else if (change === 'clear') delete slots[aspect]
  else if (!held) return
  else if (change === 'lock') held.locked = !held.locked
  else if (cardOf(def, held.card)?.cues[change] !== undefined) held.active = change
}
/** Draw every unlocked aspect again, of one section or of all. */
export function drawnFill(s: Setting, id: string, section?: number) {
  const d = drawnOf(s, id)
  if (d) for (const i of section === undefined ? d.sections.map((_, k) => k) : [section]) fillCards(DRAWN_DEF[d.tool], asItem(d), i, drawnPacks(s))
}
export function addAge(s: Setting, id: string) {
  const d = drawnOf(s, id)
  const max = d && DRAWN_DEF[d.tool].sections?.max
  if (!d || !max || d.sections.length >= max) return
  d.sections.push({ slots: {} })
  fillCards(DRAWN_DEF[d.tool], asItem(d), d.sections.length - 1, drawnPacks(s))
}
export function removeAge(s: Setting, id: string, section: number) {
  const d = drawnOf(s, id)
  if (!d || d.sections.length < 2) return
  d.sections.splice(section, 1)
  // What dated from that age loses its date; what dated from a later one keeps its age.
  if (d.tool === 'history') for (const e of s.entities) {
    if (e.age === section) delete e.age
    else if (e.age !== undefined && e.age > section) e.age--
  }
}
/** Say which race mostly keeps a culture, or none. */
export function setRace(s: Setting, id: string, race: string | undefined) {
  const d = drawnOf(s, id)
  if (d) { if (race) d.race = race; else delete d.race }
}

// Emblems: every land, race and culture bears one. It follows from the setting until it is changed by hand.

/** Icons that suit each kind of country, so that a coast tends to an anchor and a forest to a tree. */
const SUITS: Record<Glyph, string[]> = {
  tree: ['Tree', 'Leaf', 'Antlers'], deadtree: ['Tree', 'Mushroom', 'Skull'], peak: ['Mountain', 'Hammer', 'Anvil'], tuft: ['Wheat', 'Horseshoe', 'Sun'],
  reed: ['Waves', 'Fish', 'Feather'], snow: ['Snowflake', 'Mountain', 'Star'], wave: ['Waves', 'Anchor', 'Ship', 'Fish'], crater: ['Ring', 'Moon and star'],
  cross: ['Skull', 'Bell', 'Cross'], crystal: ['Diamond', 'Spark'], dune: ['Sun', 'Serpent'], dome: ['Wheel', 'Gate', 'Lightning'],
}
const suited = (s: Setting, id: string) =>
  s.board[id] ? (SUITS[glyphFor(cueText(CARDS, s.board[id]))] ?? []).map((name) => ICONS.findIndex((x) => x[0] === name)).filter((i) => i >= 0) : []
/** Whether something bears an emblem: a land, a race or a culture. */
export const bearsEmblem = (s: Setting, id: string) =>
  !!(s.board[id] && !s.board[id].parent) || !!s.drawn?.some((d) => d.id === id && d.tool !== 'history')
export function emblemOf(s: Setting, id: string): EmblemSpec | undefined {
  if (!bearsEmblem(s, id)) return undefined
  return s.emblems?.[id] ? tidy(s.emblems[id]) : emblemFrom(`${s.id}:${id}`, suited(s, id))
}
export function setEmblem(s: Setting, id: string, spec: EmblemSpec) {
  if (bearsEmblem(s, id)) (s.emblems ??= {})[id] = tidy(spec)
}
export const rerollEmblem = (s: Setting, id: string) => setEmblem(s, id, emblemFrom(String(Math.random()), suited(s, id)))

/** The lands, races and cultures something belongs to, in that order: whose emblems it may wear. */
export function belongsTo(s: Setting, id: string): string[] {
  const thing = (find(s, id) ?? s.built?.find((b) => b.id === id) ?? s.drawn?.find((d) => d.id === id)) as { home?: string; race?: string; culture?: string; tool?: string } | undefined
  const home = s.board[id]?.parent ? id : thing?.home
  const land = home && s.board[home] ? rootOf(s.board, home) : undefined
  // A settlement keeps the culture of the land it stands in.
  const local = thing?.tool === 'settlement' && land ? s.drawn?.find((d) => d.tool === 'culture' && d.home === land)?.id : undefined
  return [...new Set([land, thing?.race, thing?.culture ?? local])].filter((x): x is string => !!x && x !== id && bearsEmblem(s, x))
}

/** Everything that goes when one thing is removed: a place takes its sites and all that is based there. */
export function goneWith(s: Setting, id: string): string[] {
  const gone = new Set(s.board[id] ? subtree(s.board, id) : [id])
  for (const x of [...s.entities, ...s.people, ...(s.built ?? []), ...(s.drawn ?? [])]) if (x.home && gone.has(x.home)) gone.add(x.id)
  return [...gone]
}

/** Remove a place, site, power, thing, person or built place, and every mention of it elsewhere. */
export function remove(s: Setting, id: string) {
  const gone = new Set(goneWith(s, id))
  for (const g of gone) { delete s.board[g]; delete s.names[g]; delete s.specs[g]; delete s.emblems?.[g] }
  s.entities = s.entities.filter((e) => !gone.has(e.id))
  s.people = s.people.filter((c) => !gone.has(c.id))
  s.built = (s.built ?? []).filter((b) => !gone.has(b.id))
  s.drawn = (s.drawn ?? []).filter((d) => !gone.has(d.id))
  for (const d of s.drawn) if (d.race && gone.has(d.race)) delete d.race
  const history = s.drawn.some((d) => d.tool === 'history')
  for (const e of [...s.entities, ...s.people] as (Entity & { race?: string })[]) {
    if (e.race && gone.has(e.race)) delete e.race
    if (e.culture && gone.has(e.culture)) delete e.culture
    if (!history) delete e.age
  }
  s.hooks = s.hooks.filter((h) => !h.lines.some((l) => gone.has(l.who) || gone.has(l.target) || (l.also && gone.has(l.also.target))))
  for (const e of [...s.entities, ...s.people] as (Entity | Char)[]) {
    e.details = e.details.filter((d) => !d.links.some((l) => l.node && gone.has(l.node)))
    if (e.from && gone.has(e.from)) delete e.from
    if ('faction' in e && e.faction && gone.has(e.faction)) delete e.faction
  }
  for (const spec of Object.values(s.specs)) if (spec.homeId && gone.has(spec.homeId)) delete spec.homeId
}

// Mentions: words in a description that name a kind of thing the setting could hold — a council, a flood,
// a lighthouse, a village — so that the thing itself can be added from where it is mentioned.

export type Mention =
  | { type: 'power'; kind: Kind; what?: string }
  | { type: 'person'; what: string }
  | { type: 'site'; card: string; cue: number }
  | { type: 'built'; tool: Built['tool']; rolls: Record<string, number> }
/** What a mention would add, in a word, for its colour and its button. */
export const mentionKind = (m: Mention) => (m.type === 'power' ? m.kind : m.type === 'person' ? 'figure' : m.type === 'site' ? 'site' : m.tool)

interface Lexicon { words: RegExp; names: RegExp | null; by: Map<string, Mention>; stamp: string }
const lexicons = new WeakMap<Setting, Lexicon>()
const escape = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
/** Words with too many everyday meanings to be worth marking. */
const TOO_COMMON = new Set(['order', 'watch', 'well', 'gate', 'map', 'rival', 'general', 'stranger', 'twin', 'cook', 'capital', 'landmark', 'child', 'friend', 'guest', 'keeper', 'pilot'])

function lexicon(s: Setting): Lexicon {
  // Made once for a setting as it stands, and again when its cards or names have changed.
  // The ages of the history count as names: "the Age of Lanterns" is not an offer of a lantern.
  const ages = ageNames(s)
  const stamp = `${Object.keys(s.board).join()}|${Object.values(s.names).join()}|${ages.join()}|${JSON.stringify(s.decks ?? 0)}`
  const known = lexicons.get(s)
  if (known?.stamp === stamp) return known
  const by = new Map<string, Mention>()
  const put = (word: string, m: Mention) => { const w = word.toLowerCase(); if (!by.has(w) && !TOO_COMMON.has(w)) by.set(w, m) }
  // Earlier entries win where a word could be two things.
  for (const c of unused(s, 'site')) c.cues.forEach((cue, i) => put(cue.text, { type: 'site', card: c.id, cue: i }))
  for (const what of PRIMARY.faction) put(what, { type: 'power', kind: 'faction', what })
  for (const what of [...roleCards(s).flatMap((c) => c.cues), ...PRIMARY.figure]) put(what, { type: 'person', what })
  // The last word of a longer role stands for it: a "wizard" in a description can become the hedge wizard.
  for (const what of roleCards(s).flatMap((c) => c.cues)) if (what.includes(' ')) put(what.split(' ').at(-1)!, { type: 'person', what })
  Object.values(SETTLEMENT_TYPES).forEach((t, i) => put(t.label.replace(' town', ''), { type: 'built', tool: 'settlement', rolls: { type: i } }))
  Object.values(PERIL_KINDS).forEach((k, i) => put(k.label, { type: 'built', tool: 'peril', rolls: { kind: i } }))
  for (const kind of ['event', 'object', 'creature', 'material'] as Kind[]) for (const what of PRIMARY[kind]) put(what, { type: 'power', kind, what })
  for (const word of ['god', 'goddess', 'deity', 'saint']) put(word, { type: 'power', kind: 'deity' })
  const alt = (list: string[]) => list.sort((a, b) => b.length - a.length).map(escape).join('|')
  const names = [...Object.values(s.names), ...ages].filter((n) => n.length > 2)
  const made: Lexicon = {
    by, stamp,
    words: new RegExp(`(?<![\\p{L}’'-])(${alt([...by.keys()])})(?:e?s)?(?![\\p{L}’'-])`, 'giu'),
    names: names.length ? new RegExp(alt(names), 'gi') : null,
  }
  lexicons.set(s, made)
  return made
}

/**
 * A description cut into plain text and mentions. Names already given to things are left alone, each word
 * is marked once, and `skip` is what the text is itself about.
 */
export function findMentions(s: Setting, text: string, skip?: string): (string | { text: string; mention: Mention })[] {
  const lex = lexicon(s)
  const named = lex.names ? [...text.matchAll(lex.names)].map((m) => [m.index, m.index + m[0].length]) : []
  const out: (string | { text: string; mention: Mention })[] = []
  const seen = new Set<string>()
  let at = 0
  for (const m of text.matchAll(lex.words)) {
    const word = m[1].toLowerCase()
    if (seen.has(word) || word === skip?.toLowerCase() || named.some(([a, b]) => m.index < b && m.index + m[0].length > a)) continue
    seen.add(word)
    out.push(text.slice(at, m.index), { text: m[0], mention: lex.by.get(word)! })
    at = m.index + m[0].length
  }
  out.push(text.slice(at))
  return out.filter((x) => x !== '')
}

/** Add the thing a mention names, at the spot whose description mentioned it. Returns its id. */
export function addMention(s: Setting, m: Mention, home: string): string | undefined {
  const w = weave(s)
  if (m.type === 'site') {
    if (s.board[m.card]) return
    const root = rootOf(s.board, home)
    tuck(s, m.card, root, m.cue)
    const again = weave(s)
    again.name(m.card, { kind: 'site', tongue: again.tongueAt(root), base: cueText(CARDS, s.board[m.card]).toLowerCase() }, root)
    return m.card
  }
  if (m.type === 'built') return w.build(m.tool, home, m.rolls).id
  if (m.type === 'person') { const c = w.person(home, m.what); w.detail(c, w.depth.minor, false); w.tie(c); return c.id }
  const e = w.make(m.kind, home, undefined, m.what)
  w.detail(e, m.kind === 'faction' ? w.depth.major : w.depth.minor, false)
  w.tie(e)
  return e.id
}

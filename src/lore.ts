// The lore tool: a web of story elements, each a small cluster of cues, joined by links.
// All card text is original to this project.
//
// An element has a primary cue (what it is), an optional modifier, and up to four details. A detail may
// contain links, written {kind} — or {kind/kind} for a choice of kinds — which are completed by drawing
// a primary cue of that kind or by pointing at an element already in the web. A completed link can be
// expanded into an element of its own, which is how the web grows.

export type Kind = 'faction' | 'figure' | 'event' | 'place' | 'object' | 'material' | 'creature' | 'deity'

export const BASE_KINDS: Kind[] = ['faction', 'figure', 'event', 'place', 'object', 'material', 'creature']

export const KIND_LABEL: Record<Kind, string> = {
  faction: 'Faction', figure: 'Figure', event: 'Event', place: 'Place', object: 'Object', material: 'Material', creature: 'Creature', deity: 'Deity',
}

const words = (s: string) => s.split(',').map((w) => w.trim())

export const PRIMARY: Record<Kind, string[]> = {
  faction: words('guild, order, cult, militia, court, cartel, college, caravan, choir, council, fellowship, syndicate, tribunal, circus, sect, league, crew, academy, clan, watch'),
  figure: words('mapmaker, exile, healer, smuggler, heir, oracle, general, forger, hermit, envoy, poet, executioner, tinker, pilgrim, champion, archivist, usurper, shepherd, spy, midwife'),
  event: words('flood, coronation, plague, siege, eclipse, famine, wedding, trial, fire, betrayal, festival, earthquake, exodus, duel, harvest, mutiny, discovery, treaty, storm, funeral'),
  place: words('crypt, lighthouse, bazaar, bridge, well, citadel, orchard, crossroads, library, quarry, harbour, shrine, tavern, labyrinth, tower, cistern, garden, mine, gate, island'),
  object: words('key, crown, lantern, bell, mirror, ledger, blade, mask, compass, chalice, drum, ring, map, loom, horn, coin, banner, needle, hourglass, flute'),
  material: words('ink, glass, salt, amber, silk, iron, clay, resin, bone, ash, honey, coral, wax, dye, slate, pearl, tar, moss, copper, ice'),
  creature: words('heron, wolf, moth, eel, stag, beetle, owl, serpent, hare, crab, bat, boar, spider, crane, toad, lynx, wasp, tortoise, raven, pike'),
  deity: words('deity of thresholds, deity of salt and tears, deity of lost things, deity of the harvest moon, deity of locks, deity of small fires, deity of roads, deity of second thoughts, deity of deep water, deity of bees, deity of debts, deity of storms, deity of sleep, deity of rust, deity of laughter, deity of the hunt'),
}

const list = (raw: string) => raw.split('\n').map((l) => l.trim()).filter(Boolean)

export const DETAIL: Record<Kind, string[]> = {
  faction: list(`
    Holds {place} sacred
    Was founded by {figure}
    Is locked in a feud with {faction}
    Guards the secret of making {material}
    Recruits only orphans
    Marks its members with a hidden tattoo
    Lost its greatest treasure, {object}
    Rose to power after {event}
    Keeps {creature} as its living symbol
    Meets only by night
    Is secretly funded by {figure/faction}
    Is torn between loyalty to {figure} and {figure}
    Has not admitted a new member in a generation
    Answers every insult with a lawsuit
    Controls all trade in {material/object}
    Is forbidden to enter {place}
    Swears its oaths on {object}
    Is slowly dying out
    Blames itself for {event}
    Speaks a private language of gestures`),
  figure: list(`
    Owes a life-debt to {figure}
    Was cast out of {faction}
    Carries {object} everywhere
    Was the sole witness to {event}
    Has never left {place}
    Is hunted by {creature/faction}
    Speaks to no one before noon
    Raised {creature} from birth
    Is hiding a second family
    Claims to have predicted {event}
    Bears a scar shaped like a key
    Is the last person who can work {material}
    Secretly leads {faction}
    Betrayed {figure} and regrets it
    Has forgotten their own name
    Is searching for {place}
    Writes everything down in cipher
    Lost a hand to {creature}
    Is far older than anyone suspects
    Stands between {faction} and {faction}`),
  event: list(`
    Began in {place}
    Was set in motion by {figure}
    Destroyed {faction}
    Is commemorated every year with fasting
    Left {material} scattered across the land
    Was foretold, and ignored
    Brought {creature} out of hiding
    Ended only when {object} was surrendered
    Is remembered differently by {faction} and {faction}
    Lasted a hundred days
    Made {figure} famous
    Has never been explained
    Was blamed on {figure/creature}
    Turned {place} into a ruin
    Is forbidden to be spoken of
    Is the reason {faction} exists
    Happened twice, a century apart
    Revealed {object} to the world
    Cost more lives than were ever counted
    Was the last time {material} was seen`),
  place: list(`
    Is claimed by {faction}
    Was built by {figure}
    Is infested with {creature}
    Was the site of {event}
    Is built entirely from {material}
    Hides {object} somewhere inside
    Can only be entered at low tide
    Is haunted, by all accounts
    Lies exactly between {faction} and {faction}
    Has no doors
    Is tended by {figure}
    Appears on no official map
    Is slowly sinking
    Draws pilgrims from far away
    Was sealed after {event}
    Is the only source of {material}
    Changes its layout by night
    Is fought over by {faction/figure}
    Smells always of smoke
    Is older than {place}`),
  object: list(`
    Was forged from {material}
    Was last carried by {figure}
    Is sought by {faction}
    Was lost during {event}
    Is kept under guard in {place}
    Cannot be held by the dishonest
    Is one of a matched pair
    Was stolen from {creature}
    Grows heavier each year
    Is a clever forgery
    Was made by {figure} as an apology
    Belongs by right to {faction/figure}
    Hums when danger is near
    Is said to have caused {event}
    Has been broken and mended three times
    Opens the way to {place}
    Is feared by {creature}
    Is worth less than people think
    Changes hands only by gift
    Is contested between {figure} and {faction}`),
  material: list(`
    Is found only in {place}
    Is harvested from {creature}
    Is controlled by {faction}
    Was first worked by {figure}
    Remembers whatever it touches
    Glows faintly in the dark
    Is poisonous until cured
    Became scarce after {event}
    Is the only thing that harms {creature}
    Is needed to make {object}
    Is worth its weight in silver
    Sings when struck
    Is outlawed by {faction}
    Decays within a day of harvest
    Is smuggled through {place}
    Was once thought worthless
    Is traded by {faction} to {faction}
    Reacts badly to {material}
    Is used in every funeral
    Was discovered by {figure/creature}`),
  creature: list(`
    Nests only in {place}
    Is sacred to {faction}
    Was tamed, once, by {figure}
    Feeds on {material}
    Appeared after {event}
    Is larger than any other of its kind
    Is hunted for {material/object}
    Mimics human voices
    Is the natural enemy of {creature}
    Lives for centuries
    Guards {object} without knowing it
    Is believed to bring luck
    Is feared by {faction}
    Migrates on a single night each year
    Was bred by {figure}
    Can be heard but rarely seen
    Is drawn to {object}
    Is dying out
    Is pictured on the banner of {faction}
    Follows {figure} everywhere`),
  deity: list(`
    Is worshipped in secret by {faction}
    Once walked the earth as {figure}
    Is honoured at {place}
    Sent {event} as a punishment
    Takes the form of {creature}
    Accepts offerings of {material}
    Lost {object} to a mortal
    Has not answered a prayer in a century
    Is the sworn rival of {deity}
    Demands silence from the faithful
    Is said to be dying
    Chose {figure} as a prophet
    Is blamed for {event}
    Was invented by {faction}, some say
    Sleeps beneath {place}
    Has a thousand names`),
}

/** Extra details that reach for a deity, added to each kind while the Deities pack is on. */
const DEITY_DETAIL: Partial<Record<Kind, string[]>> = {
  faction: ['Is devoted to {deity}', 'Has renounced {deity}'],
  figure: ['Is devoted to {deity}', 'Claims to speak for {deity}'],
  event: ['Is called the wrath of {deity}'],
  place: ['Is consecrated to {deity}'],
  object: ['Was a gift from {deity}'],
  material: ['Is the blood of {deity}, they say'],
  creature: ['Is the messenger of {deity}'],
}

export const MODIFIERS = words('forgotten, gilded, forbidden, wandering, patient, hollow, drowned, sleepless, borrowed, crooked, silent, burning, veiled, broken, tireless, exiled, hungry, faithful, shattered, last, laughing, hidden, scarlet, pale, iron, blind, humble, restless, sunken, twice-born, unbowed, thousand-year')

export const EMBLEMS = words('a broken wheel, three black feathers, an open hand, a key crossed with a quill, a setting sun, a coiled rope, a single eye, a burning ship, two fish chasing each other, a cracked bell, a white stag, a crescent and thorn, a ladder to nowhere, an hourglass on its side, a knot of serpents, a crowned toad, a red door, an empty chair, a mountain split in two, a lantern in a storm, a needle and thread, seven stars, a wave over a tower, a closed book')

export const EPITHETS = words('of Spiders, of the Seven Keys, the Unbowed, of Quiet Water, of the Long Road, the Twice-Burned, of Ash and Honey, of the Last Bell, the Patient, of Broken Chains, of the Grey Hour, the Unforgiven, of Salt, of the Hollow Hill, the Wakeful, of Nine Winters, of the Black Sail, the Lesser, of Thorns, of the Open Door, the Elder, of Wolves, of the Drowned Moon, the Merciful, of Glass, of the Far Shore, the Nameless, of Embers, of the Crooked Mile, the Younger, of Rooks, of the Silver Hand')

export interface Packs { deities: boolean; emblems: boolean; names: boolean }
export const PACK_LABEL: Record<keyof Packs, string> = { deities: 'Deities', emblems: 'Emblems', names: 'Names' }

export interface LinkInst { kinds: Kind[]; kind?: Kind; primary?: string; node?: string }
export interface DetailInst { text: string; links: LinkInst[] }
export interface LoreNode {
  id: string
  kind: Kind
  primary: string
  modifier?: string
  epithet?: string
  emblem?: string
  details: DetailInst[]
  parent?: string
  x: number
  y: number
}
export type Web = Record<string, LoreNode>

export const kindsFor = (packs: Packs): Kind[] => (packs.deities ? [...BASE_KINDS, 'deity'] : BASE_KINDS)
export const detailsFor = (kind: Kind, packs: Packs) => [...DETAIL[kind], ...(packs.deities ? DEITY_DETAIL[kind] ?? [] : [])]

const SLOT = /\{([a-z/]+)\}/g
/** The kinds each link in a detail may be completed with. */
export const slots = (text: string): Kind[][] => [...text.matchAll(SLOT)].map((m) => m[1].split('/') as Kind[])
export const newDetail = (text: string): DetailInst => ({ text, links: slots(text).map((kinds) => ({ kinds })) })

const SMALL = new Set(['of', 'and', 'the'])
const titleCase = (s: string) => s.split(' ').map((w) => (SMALL.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1))).join(' ')
const lowerFirst = (t: string) => t.charAt(0).toLowerCase() + t.slice(1)

/** "The Forgotten Crypt of Spiders" */
export const title = (n: LoreNode) => `The ${titleCase([n.modifier, n.primary].filter(Boolean).join(' '))}${n.epithet ? ` ${n.epithet}` : ''}`

/** How a completed link reads inside a sentence. */
export function refText(link: LinkInst, web: Web): string {
  const target = link.node ? web[link.node] : undefined
  if (target) return lowerFirst(title(target))
  if (!link.primary) return '…'
  if (link.kind === 'material') return link.primary
  return `${/^([aeiou]|hour|heir)/.test(link.primary) ? 'an' : 'a'} ${link.primary}`
}

/** A detail split into plain text and links, in reading order. */
export function detailParts(d: DetailInst): (string | LinkInst)[] {
  const out: (string | LinkInst)[] = []
  let i = 0
  let last = 0
  for (const m of d.text.matchAll(SLOT)) {
    out.push(d.text.slice(last, m.index), d.links[i++])
    last = m.index + m[0].length
  }
  out.push(d.text.slice(last))
  return out.filter((p) => p !== '')
}

export const detailText = (d: DetailInst, web: Web) => detailParts(d).map((p) => (typeof p === 'string' ? p : refText(p, web))).join('')

/** An element written out as sentences. */
export function describeNode(n: LoreNode, web: Web): string {
  // Name the element once, then say "it" — except for people, who keep their role.
  const subject = (i: number) => (i === 0 || n.kind === 'figure' ? `The ${n.primary}` : 'It')
  return [
    ...n.details.map((d, i) => `${subject(i)} ${lowerFirst(detailText(d, web))}.`),
    ...(n.emblem ? [`Its emblem is ${n.emblem}.`] : []),
  ].join(' ')
}

export const webText = (web: Web) =>
  Object.values(web).map((n) => `${title(n)} (${KIND_LABEL[n.kind].toLowerCase()})\n\n${describeNode(n, web) || 'Nothing is known of it yet.'}`).join('\n\n\n')

export const CELL = { w: 300, h: 290 }

/** A free grid cell as close as possible to an existing element, or the origin for the first. */
export function spot(web: Web, near?: LoreNode): { x: number; y: number } {
  const taken = new Set(Object.values(web).map((n) => `${Math.round(n.x / CELL.w)},${Math.round(n.y / CELL.h)}`))
  const cx = near ? Math.round(near.x / CELL.w) : 0
  const cy = near ? Math.round(near.y / CELL.h) : 0
  for (let r = 0; r < 40; r++) {
    const ring: [number, number][] = []
    for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) if (Math.max(Math.abs(dx), Math.abs(dy)) === r) ring.push([dx, dy])
    ring.sort((a, b) => Math.hypot(...a) - Math.hypot(...b) || b[0] - a[0] || b[1] - a[1])
    for (const [dx, dy] of ring) if (!taken.has(`${cx + dx},${cy + dy}`)) return { x: (cx + dx) * CELL.w, y: (cy + dy) * CELL.h }
  }
  return { x: 0, y: 0 }
}

const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)]
export const sample = <T,>(a: T[], n: number): T[] => {
  const pool = [...a]
  const out: T[] = []
  while (out.length < n && pool.length) out.push(...pool.splice(Math.floor(Math.random() * pool.length), 1))
  return out
}

let seq = 0
export const newId = () => `n${Date.now().toString(36)}${(seq++).toString(36)}`

/** Turn a completed link into an element of its own, beside the one it came from. */
export function expandLink(web: Web, from: LoreNode, link: LinkInst, modifier: string, packs: Packs): LoreNode {
  const node: LoreNode = {
    id: newId(), kind: link.kind!, primary: link.primary!, modifier, details: [], parent: from.id, ...spot(web, from),
    ...(packs.names && Math.random() < 0.5 ? { epithet: pick(EPITHETS) } : {}),
    ...(packs.emblems && (link.kind === 'faction' || link.kind === 'deity') ? { emblem: pick(EMBLEMS) } : {}),
  }
  web[node.id] = node
  link.node = node.id
  return node
}

/** Build a whole web of the given size, starting from a faction and expanding links breadth-first. */
export function generateWeb(size: number, packs: Packs): Web {
  const web: Web = {}
  const first: LoreNode = {
    id: newId(), kind: 'faction', primary: pick(PRIMARY.faction), details: [], x: 0, y: 0,
    ...(packs.names ? { epithet: pick(EPITHETS) } : {}), ...(packs.emblems ? { emblem: pick(EMBLEMS) } : {}),
  }
  web[first.id] = first
  const queue = [first]
  const allowed = kindsFor(packs)

  while (queue.length) {
    const node = queue.shift()!
    const pool = detailsFor(node.kind, packs).filter((t) => slots(t).every((s) => s.some((k) => allowed.includes(k))))
    const chosen = sample(pool, 4)
    if (!chosen.some((t) => slots(t).length)) chosen[0] = pick(pool.filter((t) => slots(t).length))
    node.details = chosen.map(newDetail)

    for (const d of node.details)
      for (const link of d.links) {
        const kinds = link.kinds.filter((k) => allowed.includes(k))
        const existing = Object.values(web).filter((n) => n.id !== node.id && kinds.includes(n.kind) && n.id !== node.parent)
        if (existing.length && Math.random() < 0.3) {
          const target = pick(existing)
          Object.assign(link, { kind: target.kind, primary: target.primary, node: target.id })
          continue
        }
        link.kind = pick(kinds)
        const used = new Set(Object.values(web).filter((n) => n.kind === link.kind).map((n) => n.primary))
        link.primary = pick(PRIMARY[link.kind].filter((p) => !used.has(p)).concat(used.size >= PRIMARY[link.kind].length ? PRIMARY[link.kind] : []))
        if (Object.keys(web).length < size) queue.push(expandLink(web, node, link, pick(MODIFIERS), packs))
      }
  }
  return web
}

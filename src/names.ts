// The name generator. It has no screen of its own: settings call it for every place, person, faction,
// relic, event and so on, and the only sign of it in the interface is a rename button.
//
// Names come from "tongues" — small sound systems, or word lists for the plainer styles — so that
// everything named in one region sounds related. A seeded random source makes a setting repeatable.

export type Rng = () => number

/** A repeatable random source from any text seed. */
export function rngFrom(seed: string): Rng {
  let h = 1779033703 ^ seed.length
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  let a = h >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const sp = (s: string) => s.split(' ')
const pick = <T,>(rng: Rng, a: T[]): T => a[Math.floor(rng() * a.length)]
const cap = (w: string) => w.charAt(0).toUpperCase() + w.slice(1)
export const titleCase = (s: string) => s.split(' ').map((w) => (['of', 'the', 'and'].includes(w) ? w : cap(w))).join(' ')

interface Tongue {
  id: string
  genres: string[]
  /** An invented or compounded word, capitalised. */
  word(rng: Rng): string
  place(rng: Rng): string
  given(rng: Rng): string
  family(rng: Rng): string
}

/** A tongue built from onsets, vowels and codas, with its own endings for places and families. */
function invented(id: string, genres: string[], on: string, vo: string, co: string, placeEnd: string, famEnd: string): Tongue {
  const [O, V, C, P, F] = [on, vo, co, placeEnd, famEnd].map(sp)
  const coda = (rng: Rng) => (rng() < 0.55 ? pick(rng, C) : '')
  const stem = (rng: Rng, n: number) => {
    let w = ''
    for (let i = 0; i < n; i++) w += pick(rng, O) + pick(rng, V)
    return w
  }
  const word = (rng: Rng) => cap(stem(rng, rng() < 0.6 ? 2 : 3) + coda(rng))
  return {
    id, genres, word,
    place: (rng) => cap(stem(rng, rng() < 0.7 ? 2 : 1) + pick(rng, C.filter(Boolean)) + pick(rng, P)),
    given: (rng) => cap(stem(rng, rng() < 0.75 ? 2 : 1) + coda(rng)),
    family: (rng) => cap(stem(rng, 1) + pick(rng, C.filter(Boolean)) + pick(rng, F)),
  }
}

/** A tongue that joins plain English parts, for old-country and present-day settings. */
function compound(id: string, genres: string[], first: string, placeEnd: string, famEnd: string, given: string): Tongue {
  const [A, P, F, G] = [first, placeEnd, famEnd, given].map(sp)
  const join = (a: string, b: string) => (a.endsWith(b[0]) ? a + b.slice(1) : a + b)
  return {
    id, genres,
    word: (rng) => join(pick(rng, A), pick(rng, P)),
    place: (rng) => join(pick(rng, A), pick(rng, P)),
    given: (rng) => pick(rng, G),
    family: (rng) => join(pick(rng, A), pick(rng, F)),
  }
}

export const TONGUES: Tongue[] = [
  invented('soft', ['fantasy'], 'm n l r v s th y f el', 'a e i o ae ia ei', 'n l r s th', 'a el ia en or eth', 'ael ien or eth'),
  invented('hard', ['fantasy'], 'k g d t br kr dr gr z v', 'a o u e ar ur', 'k g d r n sk rn', 'ak gar dun ok urn', 'ak ur gan dok'),
  invented('sea', ['fantasy', 'grounded'], 'p t k m n l h w', 'a i u o ai ua oa', 'n l m', 'ua ani olo ika', 'alu ani oka'),
  compound('old', ['horror', 'grounded'],
    'Black Hollow Grey Ash Marrow Thorn Cold Raven Low Elder Stone Mire Wolf Bram Carr Dun Hag Wyke Fen Crow',
    'wick moor stead field ford mere well combe ley holt bridge gate',
    'wood well ley croft more by stone er worth',
    'Edda Tobias Maud Silas Agnes Jonas Hester Amos Ruth Enoch Clara Obed Ivy Josiah Mabel Ezra Dinah Caleb Nell Abel'),
  {
    ...invented('star', ['scifi'], 'k v z x t r s n j', 'a e i o y', 'x n s r k t', 'on ar is ex', 'ov ar ek is'),
    place(rng) {
      const w = this.word(rng)
      return rng() < 0.3 ? `${w}-${1 + Math.floor(rng() * 9)}` : `${w} ${pick(rng, sp('Station Reach Drift Colony Array Anchorage Depot'))}`
    },
    given: (rng) => pick(rng, sp('Ada Kai Mira Juno Ren Tavi Noor Idris Lena Oskar Zane Yara Cato Imre Sol Vesper')),
  },
]

/** The tongues a setting speaks: up to n of those that suit its genres. */
export function tonguesFor(genres: string[], n: number, rng: Rng): number[] {
  const pool = TONGUES.map((t, i) => ({ t, i })).filter(({ t }) => genres.some((g) => t.genres.includes(g))).map(({ i }) => i)
  const from = pool.length ? pool : [0]
  const out: number[] = []
  while (out.length < Math.min(n, from.length)) {
    const i = pick(rng, from)
    if (!out.includes(i)) out.push(i)
  }
  return out
}

export type NameKind =
  | 'world' | 'place' | 'site' | 'person' | 'faction' | 'deity' | 'object' | 'event' | 'creature' | 'material'

/** Everything needed to name one thing, or to name it again later. */
export interface NameSpec {
  kind: NameKind
  tongue: number
  /** What the thing is: "lighthouse", "guild", "flood". */
  base?: string
  /** The name of the place it belongs to, if any. */
  home?: string
  genres?: string[]
}

const MODS = sp('Ashen Gilded Hollow Silent Patient Crooked Drowned Sleepless Scarlet Pale Iron Humble Sunken Unbowed Veiled Last Hidden Faithful Burning Tireless')
const WORLD_END: Record<string, string[]> = {
  fantasy: sp('Reaches Marches Kingdoms Vale Coast'), horror: sp('Parishes Hollows Moors Fens'),
  scifi: sp('Cluster Expanse Belt Frontier'), grounded: sp('Counties Shore Lowlands Province'),
}

function attempt(spec: NameSpec, rng: Rng): string {
  const t = TONGUES[spec.tongue] ?? TONGUES[0]
  const base = spec.base ?? ''
  const Base = titleCase(base)
  const roll = rng()
  switch (spec.kind) {
    case 'world':
      return `the ${t.word(rng)} ${pick(rng, WORLD_END[spec.genres?.[0] ?? 'fantasy'] ?? WORLD_END.fantasy)}`
    case 'place':
      return t.place(rng)
    case 'site':
      return spec.home && roll < 0.3 ? `${spec.home.split(' ')[0]} ${Base}` : `${t.word(rng)} ${Base}`
    case 'person':
      if (spec.home && roll < 0.2) return `${t.given(rng)} of ${spec.home}`
      if (roll < 0.3) return `${t.given(rng)} the ${pick(rng, MODS)}`
      return `${t.given(rng)} ${t.family(rng)}`
    case 'faction':
      if (spec.home && roll < 0.35) return `the ${Base} of ${spec.home}`
      return roll < 0.7 ? `the ${pick(rng, MODS)} ${Base}` : `the ${t.word(rng)} ${Base}`
    case 'deity':
      return t.given(rng) + (roll < 0.4 ? pick(rng, sp('ae is or')) : '')
    case 'object':
      if (roll < 0.35) return `the ${Base} of ${t.word(rng)}`
      return roll < 0.7 ? `the ${pick(rng, MODS)} ${Base}` : `${t.given(rng)}’s ${Base}`
    case 'event':
      return spec.home && roll < 0.65 ? `the ${Base} of ${spec.home}` : `the ${pick(rng, MODS)} ${Base}`
    case 'creature':
      return spec.home && roll < 0.6 ? `the ${spec.home.split(' ')[0]} ${base}` : `the ${pick(rng, MODS).toLowerCase()} ${base}`
    case 'material':
      return spec.home && roll < 0.7 ? `${spec.home.split(' ')[0]} ${base}` : `${pick(rng, MODS).toLowerCase()} ${base}`
  }
}

/** A name for the thing described, unlike any already taken. The winner is added to `taken`. */
export function makeName(spec: NameSpec, rng: Rng, taken: Set<string>): string {
  let name = attempt(spec, rng)
  for (let i = 0; i < 60 && (taken.has(name.toLowerCase()) || name.length < 3); i++) name = attempt(spec, rng)
  taken.add(name.toLowerCase())
  return name
}

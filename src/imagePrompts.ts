// Turns an element of a setting into a prompt for the image model: subject, then where it is, then the
// light, then the medium. Invented names are left out, since the model would only try to spell them.

import { describe } from './describe'
import { cueText, rootOf, subtree } from './logic'
import { detailParts, type DetailInst } from './lore'
import { rootsOf, terrainOf, type Char, type Entity, type Setting } from './setting'
import { cardsOf } from './store'

const CARDS = cardsOf({ custom: [] })
const an = (w: string) => `${/^[aeiou]/i.test(w) ? 'an' : 'a'} ${w}`
/** Terrain names that are plural ("dragon peaks", "salt flats") take no article. */
const land = (w: string) => (/s$/.test(w) ? w : an(w))

const MEDIUM: Record<string, string> = {
  fantasy: 'Fantasy concept art, painterly, richly detailed.',
  scifi: 'Science fiction concept art, cinematic, richly detailed.',
  horror: 'Dark gothic illustration, muted colours, heavy atmosphere.',
  grounded: 'Realistic photograph, natural colours.',
}
const LIGHT: Record<string, string> = {
  fantasy: 'Warm low sunlight.', scifi: 'Cool artificial light with deep shadows.', horror: 'Dim overcast light and mist.', grounded: 'Soft natural daylight.',
}

export interface ImageSpec { prompt: string; w: number; h: number; seed: number }
const WIDE = { w: 1344, h: 768 }
const TALL = { w: 768, h: 1344 }
const SQUARE = { w: 1024, h: 1024 }

const hash = (text: string) => {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619)
  return h >>> 0
}

/** What a link points at, in plain words: "a lighthouse", "a forger", "a guild". */
function plain(s: Setting, id?: string): string {
  if (!id) return 'something'
  if (s.board[id]) return an(cueText(CARDS, s.board[id]).toLowerCase())
  const thing = [...s.entities, ...s.people].find((e) => e.id === id)
  return thing ? (thing.kind === 'material' ? thing.what : an(thing.what)) : 'something'
}
const hints = (s: Setting, details: DetailInst[]) =>
  details.slice(0, 2).map((d) => detailParts(d).map((p) => (typeof p === 'string' ? p : plain(s, p.node))).join('').toLowerCase()).join('; ')

/** "at a lighthouse in a marsh" */
function where(s: Setting, home?: string): string {
  if (!home || !s.board[home]) return ''
  const root = rootOf(s.board, home)
  const terrain = land(terrainOf(s, root).toLowerCase())
  return home === root ? `in ${terrain}` : `at ${an(cueText(CARDS, s.board[home]).toLowerCase())} in ${terrain}`
}

/** The prompt, size and seed for one element: a place, a power or thing, a person, or the world itself. */
export function imageSpec(s: Setting, id: string): ImageSpec {
  const genre = s.answers.genres[0] ?? 'grounded'
  const tail = `${LIGHT[genre] ?? LIGHT.grounded} ${MEDIUM[genre] ?? MEDIUM.grounded} No text or lettering.`
  const seed = hash(`${s.seed}:${id}`) % 2 ** 31
  const done = (subject: string, size: { w: number; h: number }) => ({ prompt: `${subject} ${tail}`.replace(/\s+/g, ' ').trim(), ...size, seed })

  if (id === 'world') {
    const lands = [...new Set(rootsOf(s).map((r) => terrainOf(s, r).toLowerCase()))].slice(0, 5)
    return done(`A sweeping aerial vista of a wide land made up of ${lands.join(', ')}, stretching to the horizon.`, WIDE)
  }
  if (s.board[id]) {
    const terrain = terrainOf(s, id).toLowerCase()
    const sites = subtree(s.board, id).filter((x) => CARDS[x].type === 'site').map((x) => an(cueText(CARDS, s.board[x]).toLowerCase()))
    const first = describe(s.board, CARDS, id, [], { [id]: `the ${terrain}` })[0]?.split('. ')[0] ?? ''
    return done(`A wide landscape view of ${land(terrain)}${sites.length ? `, with ${sites.join(' and ')} in the distance` : ''}. ${first}.`, WIDE)
  }
  const person = s.people.find((c: Char) => c.id === id)
  if (person) {
    const faction = s.entities.find((e) => e.id === person.faction)
    return done(
      `A portrait of ${an(person.what)}${faction ? `, a member of ${an(faction.what)}` : ''}, standing ${where(s, person.home)}. Head and shoulders, expressive face, looking at the viewer. ${hints(s, person.details)}.`,
      TALL)
  }
  const e = s.entities.find((x: Entity) => x.id === id)
  if (!e) return done('An empty landscape.', SQUARE)
  const at = where(s, e.home)
  const more = hints(s, e.details)
  const subject: Record<string, [string, { w: number; h: number }]> = {
    faction: [`The members of ${an(e.what)} gathered ${at}. It ${more}.`, WIDE],
    event: [`A dramatic scene of ${an(e.what)} ${at}. It ${more}.`, WIDE],
    object: [`${an(e.what)}, an old and important relic, in close view on a worn table. It ${more}.`, SQUARE],
    creature: [`${an(e.what)}, a remarkable animal, ${at}. It ${more}.`, SQUARE],
    material: [`A close study of ${e.what}, a rare material, shown both raw and worked. It ${more}.`, SQUARE],
    deity: [`A weathered shrine statue of ${an(e.what)} ${at}. It ${more}.`, TALL],
  }
  const [text, size] = subject[e.kind] ?? [`${an(e.what)} ${at}.`, SQUARE]
  return done(text.charAt(0).toUpperCase() + text.slice(1), size)
}

/** Everything in a setting that can have a picture, in reading order. */
export const imageIds = (s: Setting) => ['world', ...rootsOf(s), ...s.entities.map((e) => e.id), ...s.people.map((c) => c.id)]

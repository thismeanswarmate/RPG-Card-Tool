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

const BY_GENRE: Record<string, { medium: string; light: string }> = {
  fantasy: { medium: 'Fantasy concept art, painterly, richly detailed.', light: 'Warm low sunlight.' },
  scifi: { medium: 'Science fiction concept art, cinematic, richly detailed.', light: 'Cool artificial light with deep shadows.' },
  horror: { medium: 'Dark gothic illustration, muted colours, heavy atmosphere.', light: 'Dim overcast light and mist.' },
  grounded: { medium: 'Realistic photograph, natural colours.', light: 'Soft natural daylight.' },
}

/**
 * What the world itself looks like, whatever it is drawn with: its buildings, its tools and how its people
 * dress. This goes into every prompt, so a watercolour or a woodcut of a science fiction setting still
 * shows machines and not castles.
 */
const WORLD: Record<string, { things: string; dress: string }> = {
  fantasy: {
    things: 'timber and stone buildings, hand-made tools, banners, lanterns and signs of magic in everyday use, with no modern technology',
    dress: 'cloaks, tunics, leather and hand-worked metal',
  },
  scifi: {
    things: 'advanced technology, metal and glass structures, machines, vehicles, screens and artificial light',
    dress: 'practical technical clothing, worn work suits and gear',
  },
  horror: {
    things: 'decaying old buildings, bare trees, rusted iron, candles and unsettling details half hidden in shadow',
    dress: 'dark, old-fashioned, well-worn clothes',
  },
  grounded: {
    things: 'ordinary real-world buildings, vehicles, tools and furnishings of the present day',
    dress: 'everyday modern clothes',
  },
}
const GENRE_NAME: Record<string, string> = { fantasy: 'fantasy', scifi: 'science fiction', horror: 'gothic horror', grounded: 'realistic present-day' }

/** "A fantasy and gothic horror world: …" — the look of the setting's genres, up to two of them. */
function worldClause(genres: string[], person: boolean): string {
  const known = (genres.length ? genres : ['grounded']).filter((g) => WORLD[g]).slice(0, 2)
  const list = known.length ? known : ['grounded']
  const things = list.map((g) => WORLD[g].things).join('; ')
  const dress = person ? ` They wear ${list.map((g) => WORLD[g].dress).join(', and ')}.` : ''
  return `The setting is a ${list.map((g) => GENRE_NAME[g]).join(' and ')} world: ${things}.${dress}`
}

/**
 * Art directions to choose between. Each names a medium and, where the look depends on it, its own light;
 * without one, the light follows the setting's genre. "auto" takes both from the genre.
 */
export const ART: Record<string, { label: string; medium: string; light?: string }> = {
  auto: { label: 'Match the genre', medium: '' },
  concept: { label: 'Painterly concept art', medium: 'Painterly concept art, richly detailed, broad confident brushwork.' },
  watercolour: { label: 'Watercolour', medium: 'Loose watercolour on textured paper, soft edges, pale washes, white paper showing through.', light: 'Gentle diffuse daylight.' },
  ink: { label: 'Pen and ink', medium: 'Pen and ink drawing with grey wash on cream paper, fine cross-hatching, no colour.', light: 'Even light with clear shadows.' },
  oil: { label: 'Oil painting', medium: 'Oil painting in the manner of the old masters, visible brushwork, deep glazes, rich earth colours.', light: 'A single warm light source against deep shadow.' },
  woodcut: { label: 'Woodcut print', medium: 'Hand-coloured woodcut print, bold black outlines, flat muted colours, visible wood grain.', light: 'Flat, even light.' },
  storybook: { label: 'Storybook illustration', medium: 'Storybook illustration in gouache, rounded shapes, warm gentle colours, soft texture.', light: 'Golden afternoon light.' },
  animation: { label: 'Animated film background', medium: 'Hand-painted animation background, clean shapes, luminous colour, crisp detail.', light: 'Bright clear light with long soft shadows.' },
  photo: { label: 'Photograph', medium: 'Realistic photograph, 35mm lens, natural colours, fine detail.' },
  film: { label: 'Film still', medium: 'Cinematic film still, wide anamorphic frame, shallow depth of field, subtle film grain.', light: 'Dramatic directional light.' },
  noir: { label: 'Black and white', medium: 'High-contrast black and white photograph, film noir, heavy grain.', light: 'Hard light and deep black shadows.' },
  pixel: { label: 'Pixel art', medium: 'Detailed pixel art with a limited palette, crisp square pixels, no blur.', light: 'Clear simple lighting.' },
  tapestry: { label: 'Embroidered tapestry', medium: 'Embroidered medieval tapestry, flat figures, woven texture, faded dyes, decorative border.', light: 'Flat, even light.' },
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
  const genre = BY_GENRE[s.answers.genres[0] ?? 'grounded'] ?? BY_GENRE.grounded
  const art = ART[s.art ?? 'auto']
  const tail = `${art?.light ?? genre.light} ${art?.medium || genre.medium} No text or lettering.`
  const seed = hash(`${s.seed}:${id}`) % 2 ** 31
  const isPerson = s.people.some((c) => c.id === id)
  // Subject first, then the look of the world it belongs to, then the light, then the medium.
  const done = (subject: string, size: { w: number; h: number }) => ({
    prompt: `${subject} ${worldClause(s.answers.genres, isPerson)} ${tail}`.replace(/\s+/g, ' ').trim(), ...size, seed,
  })

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

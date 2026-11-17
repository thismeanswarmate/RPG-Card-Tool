// Emblems: a small coat of arms put together from a shape, a field pattern, a border, three colours and
// an icon, each chosen from a list. One is fully described by a handful of numbers, so it can be made
// from a seed, changed part by part, and saved with a setting. All drawing data is original.

import { rngFrom, type Rng } from './names'

export interface EmblemSpec {
  shape: number
  pattern: number
  border: number
  /** Field colour, second colour and icon colour, as indexes into COLOURS. */
  a: number
  b: number
  c: number
  icon: number
  /** How the icon is set out: one large, three small, or two stacked. */
  layout: number
}

/** Outlines, in a 100 by 100 box. */
export const SHAPES: [string, string][] = [
  ['Shield', 'M10 8h80v38c0 26-18 40-40 48C28 86 10 72 10 46z'],
  ['Roundel', 'M50 6a44 44 0 1 0 0 88a44 44 0 1 0 0-88z'],
  ['Square', 'M10 10h80v80H10z'],
  ['Banner', 'M14 6h72v88L50 76 14 94z'],
  ['Lozenge', 'M50 4L94 50 50 96 6 50z'],
  ['Oval', 'M50 4c22 0 36 20 36 46S72 96 50 96 14 76 14 50 28 4 50 4z'],
  ['Hexagon', 'M50 4l40 23v46L50 96 10 73V27z'],
  ['Kite', 'M50 4c20 6 34 14 38 22-2 30-16 54-38 70C28 80 14 56 12 26 16 18 30 10 50 4z'],
  ['Arch', 'M12 94V44C12 20 30 6 50 6s38 14 38 38v50z'],
  ['Pennant', 'M8 10h84L64 50l28 40H8z'],
]

export const PATTERNS = [
  'Plain', 'Split down', 'Split across', 'Split slantwise', 'Split the other way', 'Quartered', 'Upright stripe', 'Cross band', 'Slanting band',
  'Top band', 'Chevron', 'Upright stripes', 'Level stripes', 'Slanting stripes', 'Checks', 'Cross', 'Saltire', 'Wedges', 'Rays', 'Inner field',
  'Hills', 'Point', 'Disc', 'Scales', 'Diamonds',
]

export const BORDERS = ['Fine line', 'Coloured band', 'Double line', 'Dashed inner line', 'Dotted inner line', 'Heavy line', 'Band and line', 'None']

/** Deep colours first, then the pale ones. A field takes a deep colour; its second is usually pale. */
export const COLOURS: [string, string][] = [
  ['Crimson', '#a63a3a'], ['Azure', '#2f5f9e'], ['Forest', '#2f7a4f'], ['Sable', '#26262b'], ['Purple', '#6b4a8e'], ['Orange', '#c9742e'],
  ['Teal', '#2b8a8a'], ['Maroon', '#6e2a3a'], ['Navy', '#1f3358'], ['Olive', '#6f7a3a'], ['Rust', '#8a4a2a'], ['Slate', '#4a5a6a'],
  ['Gold', '#e2b65a'], ['Silver', '#e8e6df'], ['Bone', '#cfc4a8'], ['Sky', '#9cc4de'], ['Rose', '#e0a0a8'], ['Mint', '#a8d8b8'],
]
export const DEEP = 12

/** Icons, in a 24 by 24 box. Those marked 's' are drawn as lines, the rest filled. */
export const ICONS: [string, string, 'f' | 's'][] = [
  ['Disc', 'M12 4a8 8 0 1 0 0 16a8 8 0 0 0 0-16z', 'f'],
  ['Ring', 'M12 5a7 7 0 1 0 0 14a7 7 0 0 0 0-14z', 's'],
  ['Crescent', 'M15 3a9 9 0 1 0 6 13A7.5 7.5 0 0 1 15 3z', 'f'],
  ['Star', 'M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.2 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8z', 'f'],
  ['Spark', 'M12 2l2 8 8 2-8 2-2 8-2-8-8-2 8-2z', 'f'],
  ['Sun', 'M12 8a4 4 0 1 0 0 8a4 4 0 0 0 0-8zM12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2', 's'],
  ['Tree', 'M12 2l6 8h-3l5 7h-6v5h-4v-5H4l5-7H6z', 'f'],
  ['Mountain', 'M2 20L9 7l4 6 3-4 6 11z', 'f'],
  ['Waves', 'M2 9c3-4 6-4 9 0s6 4 9 0M2 16c3-4 6-4 9 0s6 4 9 0', 's'],
  ['Flame', 'M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-4 2-7 2 1 3 3 3 5 1-3 1-6 1-10z', 'f'],
  ['Drop', 'M12 2c4 6 7 9 7 13a7 7 0 0 1-14 0c0-4 3-7 7-13z', 'f'],
  ['Leaf', 'M4 20C4 9 10 3 21 3c0 11-6 17-17 17z', 'f'],
  ['Tower', 'M6 22V8H4V3h3v2h2V3h6v2h2V3h3v5h-2v14h-5v-5h-2v5z', 'f'],
  ['Crown', 'M3 19V7l5 5 4-8 4 8 5-5v12z', 'f'],
  ['Sword', 'M12 1.5l2 3.5v9h3.5v2.5H14V22h-4v-5.5H6.5V14H10V5z', 'f'],
  ['Key', 'M12 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0zM10.8 10.8L20 20M15.5 15.5l2.5-2.5M18 18l2.5-2.5', 's'],
  ['Anchor', 'M12 7v14M12 7a2 2 0 1 0 0-4a2 2 0 0 0 0 4zM7 11h10M4 14c0 4 4 7 8 7s8-3 8-7', 's'],
  ['Eye', 'M2 12c3-5 6.5-7 10-7s7 2 10 7c-3 5-6.5 7-10 7s-7-2-10-7zM12 9.5a2.5 2.5 0 1 0 0 5a2.5 2.5 0 0 0 0-5z', 's'],
  ['Fish', 'M2 12c4-6 10-6 14-2l5-4v12l-5-4c-4 4-10 4-14-2z', 'f'],
  ['Bird', 'M2 10c4-3 7-2 10 3 3-5 6-6 10-3', 's'],
  ['Paw', 'M12 11c-3 0-5.5 2.5-5.5 5 0 1.6 1.3 2.5 2.8 2.5 1 0 1.7-.5 2.7-.5s1.7.5 2.7.5c1.5 0 2.8-.9 2.8-2.5 0-2.5-2.5-5-5.5-5zM5 7.500a2 2 0 1 0 0 4a2 2 0 0 0 0-4zM9 3.500a2 2 0 1 0 0 4a2 2 0 0 0 0-4zM15 3.500a2 2 0 1 0 0 4a2 2 0 0 0 0-4zM19 7.500a2 2 0 1 0 0 4a2 2 0 0 0 0-4z', 'f'],
  ['Antlers', 'M12 22v-8M12 14C8 13 5 10 5 4M12 14c4-1 7-4 7-10M5 9L2 7M19 9l3-2M7.5 12L4 13M16.5 12L20 13', 's'],
  ['Hammer', 'M4 4h12v6h-4.5v12H9V10H4z', 'f'],
  ['Wheel', 'M12 4a8 8 0 1 0 0 16a8 8 0 0 0 0-16zM12 4v16M4 12h16M6.3 6.3l11.4 11.4M17.7 6.3L6.3 17.7', 's'],
  ['Book', 'M12 6c-2-1.5-5-1.5-8-1v14c3-.5 6-.5 8 1 2-1.5 5-1.5 8-1V5c-3-.5-6-.5-8 1zM12 6v14', 's'],
  ['Bell', 'M12 2a2 2 0 0 1 2 2c3 1 4 4 4 8v4l2 3H4l2-3v-4c0-4 1-7 4-8a2 2 0 0 1 2-2zM10 20h4a2 2 0 0 1-4 0z', 'f'],
  ['Arrow', 'M12 22V3M6 9l6-6 6 6M8 18l4 4 4-4', 's'],
  ['Hourglass', 'M6 3h12M6 21h12M7 3c0 5 10 5 10 9s-10 4-10 9M17 3c0 5-10 5-10 9s10 4 10 9', 's'],
  ['Lightning', 'M13 2L4 14h6l-1 8 9-12h-6z', 'f'],
  ['Heart', 'M12 21C6 16 2 12.5 2 8.5A5 5 0 0 1 12 6a5 5 0 0 1 10 2.5c0 4-4 7.5-10 12.5z', 'f'],
  ['Triangle', 'M12 3l10 18H2z', 'f'],
  ['Diamond', 'M12 2l8 10-8 10-8-10z', 'f'],
  ['Cross', 'M9 2h6v7h7v6h-7v7H9v-7H2V9h7z', 'f'],
  ['Chevrons', 'M4 9l8-6 8 6M4 15l8-6 8 6M4 21l8-6 8 6', 's'],
  ['Trefoil', 'M12 2.5a3.5 3.5 0 1 0 0 7a3.5 3.5 0 0 0 0-7zM6 13.5a3.5 3.5 0 1 0 0 7a3.5 3.5 0 0 0 0-7zM18 13.5a3.5 3.5 0 1 0 0 7a3.5 3.5 0 0 0 0-7z', 'f'],
  ['Snowflake', 'M12 2v20M3.3 7l17.4 10M20.7 7L3.3 17M12 6l-2.5-2.5M12 6l2.5-2.5M12 18l-2.5 2.5M12 18l2.5 2.5', 's'],
  ['Serpent', 'M6 4c8 0 12 3 12 6s-12 2-12 6 4 5 12 5', 's'],
  ['Ship', 'M3 15h18l-3 6H6zM11 3h2v11h-2zM14 5l5 8h-5z', 'f'],
  ['Bridge', 'M2 19h20M4 19c0-6 4-9 8-9s8 3 8 9M2 13h20', 's'],
  ['Gate', 'M5 22V11a7 7 0 0 1 14 0v11M5 22h14M12 4v18M8.5 5.5v16.5M15.5 5.5v16.5', 's'],
  ['Feather', 'M5 21L17 9M17 9c2-2 3-4 3-6-6 0-12 4-13 12 4 0 8-2 10-6z', 's'],
  ['Cup', 'M6 3h12c0 6-2 9-5 10v5h4v3H7v-3h4v-5C8 12 6 9 6 3z', 'f'],
  ['Scales', 'M12 3v18M7 21h10M4 7h16M4 7l-2.5 6h5zM20 7l-2.5 6h5z', 's'],
  ['Anvil', 'M3 6h14v3c-2 1-3 3-3 5h3v6H6v-6h3c0-2-1-4-6-5z', 'f'],
  ['Horn', 'M4 8c2 8 8 12 16 12v-5C14 15 10 12 9 6z', 'f'],
  ['Spear', 'M12 22V9M12 2l3.5 7h-7z', 's'],
  ['Mushroom', 'M3 11a9 8 0 0 1 18 0zM10 11h4v10h-4z', 'f'],
  ['Linked rings', 'M14 12a5 5 0 1 1-10 0 5 5 0 0 1 10 0zM20 12a5 5 0 1 1-10 0 5 5 0 0 1 10 0z', 's'],
  ['Horseshoe', 'M6 20V10a6 6 0 0 1 12 0v10M4 20h4M16 20h4', 's'],
  ['Skull', 'M12 3a7.5 7.5 0 0 0-7.5 7.5c0 2.6 1.3 4.5 3 5.700V20h9v-3.800c1.7-1.2 3-3.1 3-5.700A7.5 7.5 0 0 0 12 3zM9 11a1.5 1.5 0 1 0 0 3a1.5 1.5 0 0 0 0-3zM15 11a1.5 1.5 0 1 0 0 3a1.5 1.5 0 0 0 0-3z', 's'],
  ['Moon and star', 'M13 3a9 9 0 1 0 8 13A7.5 7.5 0 0 1 13 3zM18 4l.9 2.1 2.1.9-2.1.9L18 10l-.9-2.100L15 7l2.1-.9z', 'f'],
  ['Wheat', 'M12 22V5M12 5l-3-3M12 5l3-3M12 9l-4-3M12 9l4-3M12 13l-4-3M12 13l4-3M12 17l-4-3M12 17l4-3', 's'],
  ['Open hand', 'M8 22v-6l-3-4 1.5-1.500L9 13V4h2v7h1V3h2v8h1V4.500h2V12h1V7h2v9c0 3-2 6-6 6z', 'f'],
  ['Pillars', 'M4 21h16M4 5h16M7 5v16M12 5v16M17 5v16M3 3h18', 's'],
]

export const LAYOUTS = ['One large', 'Three small', 'Two stacked']

const lum = (hex: string) => {
  const n = parseInt(hex.slice(1), 16)
  return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255
}

/** An icon colour that shows up against a field: pale on deep and deep on pale, and never the field's own. */
function contrasting(rng: Rng, a: number, b: number, pattern: number): number {
  const darkField = (lum(COLOURS[a][1]) + (pattern ? lum(COLOURS[b][1]) : lum(COLOURS[a][1]))) / 2 < 0.5
  const pool = COLOURS.map((_, i) => i).filter((i) => i !== a && i !== b && (darkField ? i >= DEEP : i < DEEP))
  return pool[Math.floor(rng() * pool.length)]
}

/** An emblem from a seed. `prefer` narrows the icon to a few that suit the thing, where any do. */
export function emblemFrom(seed: string, prefer: number[] = []): EmblemSpec {
  const rng = rngFrom(`emblem:${seed}`)
  const pick = (n: number) => Math.floor(rng() * n)
  const a = pick(DEEP)
  // The second colour is usually a pale one, for contrast; now and then two deep colours meet.
  const b = rng() < 0.75 ? DEEP + pick(COLOURS.length - DEEP) : (a + 1 + pick(DEEP - 1)) % DEEP
  // A third of emblems keep a plain field; the rest take one of the divided ones.
  const pattern = rng() < 0.3 ? 0 : 1 + pick(PATTERNS.length - 1)
  const icon = prefer.length && rng() < 0.8 ? prefer[pick(prefer.length)] : pick(ICONS.length)
  return { shape: pick(SHAPES.length), pattern, border: pick(BORDERS.length), a, b, c: contrasting(rng, a, b, pattern), icon, layout: rng() < 0.7 ? 0 : 1 + pick(2) }
}

/** A spec with every part inside its list, whatever it was given. */
export function tidy(spec: Partial<EmblemSpec>): EmblemSpec {
  const fit = (v: number | undefined, n: number) => (Number.isInteger(v) && v! >= 0 && v! < n ? v! : 0)
  return {
    shape: fit(spec.shape, SHAPES.length), pattern: fit(spec.pattern, PATTERNS.length), border: fit(spec.border, BORDERS.length),
    a: fit(spec.a, COLOURS.length), b: fit(spec.b, COLOURS.length), c: fit(spec.c, COLOURS.length), icon: fit(spec.icon, ICONS.length), layout: fit(spec.layout, LAYOUTS.length),
  }
}

/** How many different emblems the parts allow. */
export const emblemCount = () => SHAPES.length * PATTERNS.length * BORDERS.length * COLOURS.length ** 3 * ICONS.length * LAYOUTS.length

/** In words: "a crimson shield, quartered with gold, bearing a silver tower". */
export function emblemWords(spec: EmblemSpec): string {
  const s = tidy(spec)
  const field = s.pattern ? `, ${PATTERNS[s.pattern].toLowerCase()} with ${COLOURS[s.b][0].toLowerCase()}` : ''
  const an = (w: string) => `${/^[aeiou]/i.test(w) ? 'an' : 'a'} ${w}`
  const times = s.layout === 1 ? ' three times' : s.layout === 2 ? ' twice' : ''
  return `${an(COLOURS[s.a][0].toLowerCase())} ${SHAPES[s.shape][0].toLowerCase()}${field}, bearing ${an(COLOURS[s.c][0].toLowerCase())} ${ICONS[s.icon][0].toLowerCase()}${times}`
}

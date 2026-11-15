export type CardType = 'terrain' | 'site' | 'epithet' | 'legacy' | 'trait' | 'omen' | 'question' | 'work' | 'twist' | 'quest'

/** The six types every world uses. */
export const BASE_TYPES: CardType[] = ['terrain', 'site', 'epithet', 'legacy', 'trait', 'omen']
/** Types that only appear when an expansion (or a custom card) brings them in. */
export const EXTRA_TYPES: CardType[] = ['question', 'work', 'twist', 'quest']
export const TYPES: CardType[] = [...BASE_TYPES, ...EXTRA_TYPES]

export const TYPE_INFO: Record<CardType, { label: string; cues: number; glyph: string; blurb: string }> = {
  terrain: { label: 'Terrain', cues: 1, glyph: '▲', blurb: 'The lay of the land. The hub other cards tuck under.' },
  site: { label: 'Site', cues: 2, glyph: '◆', blurb: 'A point of interest. Also a hub.' },
  epithet: { label: 'Epithet', cues: 4, glyph: '❝', blurb: 'A nickname: one opening word, three endings.' },
  legacy: { label: 'Legacy', cues: 4, glyph: '⌛', blurb: 'Something from the past.' },
  trait: { label: 'Trait', cues: 4, glyph: '✦', blurb: 'What the place is like today.' },
  omen: { label: 'Omen', cues: 2, glyph: '↯', blurb: 'An event that may change the future.' },
  question: { label: 'Question', cues: 4, glyph: '?', blurb: 'Something to answer about the people who live here.' },
  work: { label: 'Lore', cues: 4, glyph: '✎', blurb: 'A piece of in-world writing to make.' },
  twist: { label: 'Twist', cues: 4, glyph: '∿', blurb: 'A constraint to write a piece of lore under.' },
  quest: { label: 'Quest', cues: 1, glyph: '⚑', blurb: 'A story hook with three questions to answer.' },
}

export interface Cue {
  text: string
  sub?: string
  /** A sentence of prose for this cue; see describe.ts for the placeholders it may use. */
  desc?: string
  /** Open questions on a Quest card. */
  asks?: string[]
}

export interface CardDef {
  id: string
  type: CardType
  deck: string
  cues: Cue[]
}

/** 0 top, 1 right, 2 bottom, 3 left */
export type Edge = 0 | 1 | 2 | 3

export interface Placed {
  id: string
  active: number
  x: number
  y: number
  parent?: string
  edge?: Edge
  order: number
}

export interface Held {
  card: string
  active: number
}

export interface Link {
  id: string
  a: string
  b: string
  note: string
}

export const isHub = (t: CardType) => t === 'terrain' || t === 'site'

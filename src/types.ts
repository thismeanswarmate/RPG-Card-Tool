export type CardType = 'terrain' | 'site' | 'epithet' | 'legacy' | 'trait' | 'omen'

export const TYPES: CardType[] = ['terrain', 'site', 'epithet', 'legacy', 'trait', 'omen']

export const TYPE_INFO: Record<CardType, { label: string; cues: number; glyph: string; blurb: string }> = {
  terrain: { label: 'Terrain', cues: 1, glyph: '▲', blurb: 'The lay of the land. The hub other cards tuck under.' },
  site: { label: 'Site', cues: 2, glyph: '◆', blurb: 'A point of interest. Also a hub.' },
  epithet: { label: 'Epithet', cues: 4, glyph: '❝', blurb: 'A nickname: one opening word, three endings.' },
  legacy: { label: 'Legacy', cues: 4, glyph: '⌛', blurb: 'Something from the past.' },
  trait: { label: 'Trait', cues: 4, glyph: '✦', blurb: 'What the place is like today.' },
  omen: { label: 'Omen', cues: 2, glyph: '↯', blurb: 'An event that may change the future.' },
}

export interface Cue {
  text: string
  sub?: string
  /** A sentence of prose for this cue; see describe.ts for the placeholders it may use. */
  desc?: string
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

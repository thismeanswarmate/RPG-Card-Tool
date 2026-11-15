import { describe, expect, it } from 'vitest'
import { autoEdge, composeName, cueAt, dropTarget, layout, peek, rootOf, shuffle, type Board, type Cards } from './logic'
import { STARTER } from './starter'
import { TYPES } from './types'

const cards: Cards = Object.fromEntries(STARTER.map((c) => [c.id, c]))
const T = 's-terrain-0' // Marsh
const S = 's-site-0' // Lighthouse / Ferry Landing
const E = 's-epithet-0' // Whispering / of Lanterns ...
const L = 's-legacy-0'

const board = (): Board => ({
  [T]: { id: T, active: 0, x: 100, y: 100, order: 1 },
  [S]: { id: S, active: 0, x: 0, y: 0, parent: T, edge: 1, order: 2 },
  [E]: { id: E, active: 0, x: 0, y: 0, parent: T, edge: 0, order: 3 },
  [L]: { id: L, active: 2, x: 0, y: 0, parent: T, edge: 1, order: 4 },
})

describe('starter deck', () => {
  it('has unique ids and the right cue count per type', () => {
    expect(new Set(STARTER.map((c) => c.id)).size).toBe(STARTER.length)
    const counts = { terrain: 1, site: 2, epithet: 4, legacy: 4, trait: 4, omen: 2 }
    for (const c of STARTER) expect(c.cues.length).toBe(counts[c.type])
    for (const t of TYPES) expect(STARTER.some((c) => c.type === t)).toBe(true)
  })
  it('has no repeated cue text', () => {
    const all = STARTER.flatMap((c) => c.cues.map((q) => q.text.toLowerCase()))
    expect(new Set(all).size).toBe(all.length)
  })
})

describe('layout', () => {
  it('tucks cards outward from the parent edge and stacks siblings', () => {
    const pos = layout(board(), cards)
    expect(pos[S]).toMatchObject({ x: 100 + peek(cards[S]), y: 100 })
    expect(pos[E]).toMatchObject({ x: 100, y: 100 - peek(cards[E]) })
    expect(pos[L].x).toBe(100 + peek(cards[S]) + peek(cards[L]))
    expect(pos[S].z).toBeLessThan(pos[T].z)
    expect(pos[L].z).toBeLessThan(pos[S].z)
  })
})

describe('names', () => {
  it('uses the opening cue before and ending cues after the hub', () => {
    const b = board()
    expect(composeName(b, cards, T)).toBe('The Whispering Marsh')
    b[E].active = 1
    expect(composeName(b, cards, T)).toBe('The Marsh of Lanterns')
    expect(composeName(b, cards, S)).toBeNull()
  })
})

describe('cueAt', () => {
  it('puts the active cue on the tucked edge', () => {
    for (const e of [0, 1, 2, 3] as const) expect(cueAt(2, e, e)).toBe(2)
    expect(cueAt(1, undefined, 0)).toBe(1)
    expect(cueAt(3, undefined, 2)).toBe(1)
  })
})

describe('placement helpers', () => {
  it('finds the nearest hub edge and never tucks terrain', () => {
    const b: Board = { [T]: { id: T, active: 0, x: 0, y: 0, order: 1 }, [L]: { id: L, active: 0, x: 20, y: 120, order: 2 } }
    expect(dropTarget(b, cards, layout(b, cards), L)).toEqual({ hub: T, edge: 2 })
    b[L].x = 900
    expect(dropTarget(b, cards, layout(b, cards), L)).toBeNull()
    const t2 = 's-terrain-1'
    b[t2] = { id: t2, active: 0, x: 10, y: 10, order: 3 }
    expect(dropTarget(b, cards, layout(b, cards), t2)).toBeNull()
  })
  it('prefers the top edge for an opening epithet and avoids crowded edges', () => {
    const b = board()
    delete b[E]
    expect(autoEdge(b, cards, T, cards[E], 0)).toBe(0)
    expect(autoEdge(b, cards, T, cards['s-legacy-1'], 0)).toBe(2)
  })
  it('shuffle keeps every element', () => {
    expect(shuffle([1, 2, 3, 4, 5]).sort()).toEqual([1, 2, 3, 4, 5])
  })
})

describe('world generator', async () => {
  const { blank, generateWorld, WORLD_SIZES } = await import('./store')
  for (const size of ['small', 'medium', 'large'] as const)
    it(`deals a complete ${size} world`, () => {
      for (let run = 0; run < 20; run++) {
        const s = blank()
        generateWorld(s, size)
        const placed = Object.values(s.placed)
        const roots = placed.filter((p) => !p.parent)
        expect(roots.length).toBeGreaterThanOrEqual(WORLD_SIZES[size].min)
        expect(roots.length).toBeLessThanOrEqual(WORLD_SIZES[size].max)
        expect(s.meta.map((m) => cards[m.card].type).sort()).toEqual(['epithet', 'legacy', 'omen', 'trait'])
        for (const r of roots) {
          expect(cards[r.id].type).toBe('terrain')
          const kinds = new Set(placed.filter((p) => p.id !== r.id && rootOf(s.placed, p.id) === r.id).map((p) => cards[p.id].type))
          expect([...kinds].sort()).toEqual(['epithet', 'legacy', 'omen', 'site', 'trait'])
        }
        // no card is in two places, and clusters keep clear of each other
        const everywhere = [...Object.keys(s.placed), ...s.discards, ...s.meta.map((m) => m.card), ...TYPES.flatMap((t) => s.piles[t])]
        expect(new Set(everywhere).size).toBe(everywhere.length)
        expect(everywhere.length).toBe(STARTER.length)
        for (const a of roots) for (const b of roots) if (a !== b) expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(380)
        for (const p of placed) expect(p.active).toBeLessThan(cards[p.id].cues.length)
      }
    })
})

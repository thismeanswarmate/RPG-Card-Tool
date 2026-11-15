import { describe, expect, it } from 'vitest'
import { autoEdge, composeName, cueAt, dropTarget, layout, peek, rootOf, shuffle, type Board, type Cards } from './logic'
import { chronicle, chronicleText, describe as describeArea } from './describe'
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

describe('descriptions', () => {
  it('gives every starter cue a sentence that only uses known placeholders', () => {
    for (const c of STARTER)
      for (const q of c.cues) {
        expect(q.desc, `${c.type}: ${q.text}`).toBeTruthy()
        for (const m of q.desc!.matchAll(/\{(\w+)/g)) expect(['place', 'terrain', 'site']).toContain(m[1])
        if (c.type === 'epithet') expect(q.desc).toMatch(/^(for|because|after) /)
        else expect(q.desc).toMatch(/^[A-Z].*\.$/)
        if (c.type === 'terrain' || c.type === 'site') expect(q.desc).toContain('{place}')
      }
  })
  it('weaves a microsetting into prose that names its neighbours', () => {
    const b = board()
    b[E].active = 1
    const text = describeArea(b, cards, T)
    expect(text).toHaveLength(2)
    expect(text[0]).toMatch(/^In the Marsh of Lanterns the ground/)
    expect(text[0]).toContain('They say “of Lanterns” for the lamps hung at every door after dark.')
    expect(text[0]).toContain('Two rivals once staked the marsh on a single wager')
    expect(text[1]).toMatch(/^At the edge of the marsh, the lamp of the Lighthouse/)
    expect(text.join(' ')).not.toMatch(/[{}]|undefined/)
  })
  it('uses the other site, or the fallback when there is none', () => {
    const migration = 's-legacy-8' // Where two migrations met
    const b = board()
    b[migration] = { id: migration, active: 0, x: 0, y: 0, parent: T, edge: 2, order: 9 }
    expect(describeArea(b, cards, T)[0]).toContain('different sides of the lighthouse.')
    delete b[S]
    expect(describeArea(b, cards, T)[0]).toContain('different sides of the main road.')
  })
  it('mentions links and copes with cards that have no description', () => {
    const plain: Cards = { ...cards, x: { id: 'x', type: 'trait', deck: 'custom', cues: [{ text: 'Loves kites' }] } }
    const b = board()
    b.x = { id: 'x', active: 0, x: 0, y: 0, parent: T, edge: 3, order: 9 }
    b['s-terrain-1'] = { id: 's-terrain-1', active: 0, x: 900, y: 0, order: 10 }
    const text = describeArea(b, plain, T, [{ id: 'l', a: 'x', b: 's-terrain-1', note: 'kite season.' }])
    expect(text[0]).toContain('Of the marsh today, people say this: loves kites.')
    expect(text[2]).toBe('A thread runs between “Loves kites” and the Steppe: kite season.')
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
        const book = chronicle(s.placed, cards, s.links, s.meta)
        expect(book).toHaveLength(roots.length + 1)
        expect(chronicleText(book)).not.toMatch(/[{}]|undefined|  /)
      }
    })
})

describe('character cards', async () => {
  const { PERSON_CARDS, SLOTS, SLOT_INFO, GENRES, poolFor, portrait, cardText, withArticle } = await import('./people')
  const { pick } = await import('./peopleStore')
  const lookup = Object.fromEntries(PERSON_CARDS.map((c) => [c.id, c]))
  const byText = (t: string) => PERSON_CARDS.find((c) => c.text.startsWith(t))!.id

  it('has unique cards and a full pool for every slot in every genre', () => {
    expect(new Set(PERSON_CARDS.map((c) => c.id)).size).toBe(PERSON_CARDS.length)
    expect(new Set(PERSON_CARDS.map((c) => c.text)).size).toBe(PERSON_CARDS.length)
    for (const g of Object.keys(GENRES))
      for (const slot of SLOTS) {
        const pool = poolFor(PERSON_CARDS, slot, [g])
        expect(pool.length, `${g} ${slot}`).toBeGreaterThanOrEqual(10)
        expect(pool.every((c) => (c.set === 'core') !== SLOT_INFO[slot].genre)).toBe(true)
      }
    for (const c of PERSON_CARDS.filter((c) => c.slot === 'motivation')) expect(c.text).toMatch(/^To /)
  })
  it('never redraws the same card when there is a choice', () => {
    const id = byText('Hedge witch')
    for (let i = 0; i < 50; i++) expect(pick(PERSON_CARDS, 'role', ['fantasy'], id)).not.toBe(id)
  })
  it('writes a portrait in which cards mention the role', () => {
    const person = {
      id: 'p', name: 'Odalys', locked: [], notes: '',
      cards: {
        role: byText('Asylum orderly'), background: byText('Came to the work of'), motivation: byText('To be left in peace'),
        strength: byText('An ear for lies'), flaw: byText('A weakness for a wager'), turning: byText('Lost a duel on purpose'),
        secret: byText('Were never truly trained as'), catalyst: byText('The fog has not lifted'),
      },
    }
    expect(withArticle('Asylum orderly')).toBe('an asylum orderly')
    expect(portrait(person, lookup)).toEqual([
      'Odalys is an asylum orderly. They came to the work of an asylum orderly by accident and stayed.',
      'More than anything, they want to be left in peace. Their gift is an ear for lies, and their flaw is a weakness for a wager.',
      'Years ago they lost a duel on purpose. What almost no one knows is that they were never truly trained as an asylum orderly.',
      'Now everything is about to change: the fog has not lifted in nine days.',
    ])
    const bare = { ...person, name: '', cards: { secret: person.cards.secret } }
    expect(cardText(lookup[bare.cards.secret]!, bare, lookup)).toBe('Were never truly trained as what they claim to be')
    expect(portrait(bare, lookup)).toEqual(['What almost no one knows is that they were never truly trained as what they claim to be.'])
    expect(portrait({ ...bare, cards: {} }, lookup)).toEqual([])
  })
})

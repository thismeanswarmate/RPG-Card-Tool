import { describe, expect, it } from 'vitest'
import { autoEdge, composeName, cueAt, dropTarget, layout, peek, rootOf, shuffle, type Board, type Cards } from './logic'
import { chronicle, chronicleText, describe as describeArea, prompts as promptsFor } from './describe'
import { STARTER } from './starter'
import { BASE_TYPES, TYPE_INFO, TYPES } from './types'

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
    for (const c of STARTER) expect(c.cues.length).toBe(TYPE_INFO[c.type].cues)
    for (const t of BASE_TYPES) expect(STARTER.some((c) => c.type === t)).toBe(true)
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

describe('expansions', async () => {
  const { EXPANSION_CARDS, EXPANSIONS } = await import('./expansions')
  const { blank, rebuild, generateWorld, enabled, extraTypes, guideSteps } = await import('./store')
  const all: Cards = Object.fromEntries([...STARTER, ...EXPANSION_CARDS].map((c) => [c.id, c]))

  it('are well formed and never repeat a cue from the starter deck', () => {
    const texts = [...STARTER, ...EXPANSION_CARDS].flatMap((c) => c.cues.map((q) => q.text.toLowerCase()))
    expect(new Set(texts).size).toBe(texts.length)
    expect(new Set(EXPANSION_CARDS.map((c) => c.id)).size).toBe(EXPANSION_CARDS.length)
    for (const c of EXPANSION_CARDS) {
      const pack = EXPANSIONS.find((x) => x.id === c.deck)!
      expect(pack.types).toContain(c.type)
      expect(c.cues.length, c.id).toBe(TYPE_INFO[c.type].cues)
      for (const q of c.cues) {
        expect(q.text).toBeTruthy()
        if (BASE_TYPES.includes(c.type)) expect(q.desc, q.text).toMatch(c.type === 'epithet' ? /^(for|because|after) / : /^[A-Z].*\.$/)
        if (c.type === 'quest') expect(q.asks).toHaveLength(3)
      }
    }
    for (const x of EXPANSIONS) for (const t of x.types) expect(EXPANSION_CARDS.some((c) => c.deck === x.id && c.type === t)).toBe(true)
  })
  it('are off by default and can be switched on one card type at a time', () => {
    const s = blank()
    rebuild(s)
    expect(TYPES.flatMap((t) => s.piles[t])).toHaveLength(STARTER.length)
    expect(guideSteps(s)).toEqual(BASE_TYPES)
    s.expansions = { frost: ['terrain'], lore: ['work'] }
    rebuild(s)
    const added = TYPES.flatMap((t) => s.piles[t]).filter((id) => all[id].deck !== 'starter')
    expect(added.length).toBeGreaterThan(0)
    expect(added.every((id) => enabled(s, all[id]) && ['terrain', 'work'].includes(all[id].type))).toBe(true)
    expect(extraTypes(s)).toEqual(['work'])
    expect(guideSteps(s)).toEqual([...BASE_TYPES, 'work'])
  })
  it('feed the generator with questions, lore and quests', () => {
    const s = blank()
    s.expansions = Object.fromEntries(EXPANSIONS.map((x) => [x.id, x.types]))
    generateWorld(s, 'small')
    const kinds = new Set(Object.keys(s.placed).map((id) => all[id].type))
    for (const t of ['question', 'work', 'twist']) expect(kinds.has(t as never), t).toBe(true)
    expect(s.meta.some((m) => all[m.card].type === 'question')).toBe(true)
    const book = chronicle(s.placed, all, s.links, s.meta)
    expect(book.flatMap((c) => c.prompts).some((p) => p.startsWith('Lore to write — '))).toBe(true)
    expect(chronicleText(book)).not.toMatch(/[{}]|undefined/)
  })
  it('lists what a place still needs answered or written', () => {
    const b = board()
    const tuck = (id: string, active: number) => { b[id] = { id, active, x: 0, y: 0, parent: T, edge: 2, order: 20 } }
    tuck('quests-quest-0', 0); tuck('customs-question-0', 1); tuck('lore-work-0', 0); tuck('lore-twist-0', 1)
    expect(promptsFor(b, all, T)).toEqual([
      'Quest — The Empty Saddle: A horse has come home without its rider. Who was the rider, and where were they bound? What is in the saddlebags? Who would rather the rider were never found?',
      'Question — What is never said aloud?',
      'Lore to write — a lullaby, in exactly four lines.',
    ])
    expect(describeArea(b, all, T).join(' ')).not.toMatch(/lullaby|Saddle/)
  })
})

describe('lore web', async () => {
  const L = await import('./lore')
  const packs = { deities: true, emblems: true, names: true }

  it('has whole cards of four cues and only valid link kinds', () => {
    for (const k of [...L.BASE_KINDS, 'deity'] as const) {
      expect(L.PRIMARY[k].length % 4, k).toBe(0)
      expect(L.DETAIL[k].length % 4, k).toBe(0)
      expect(new Set(L.PRIMARY[k]).size).toBe(L.PRIMARY[k].length)
      for (const t of L.detailsFor(k, packs)) {
        expect(t).toMatch(/^[A-Z]/)
        for (const kinds of L.slots(t)) for (const x of kinds) expect(Object.keys(L.KIND_LABEL)).toContain(x)
      }
      expect(L.DETAIL[k].some((t) => L.slots(t).length > 0 && !t.includes('deity'))).toBe(true)
    }
    for (const k of L.BASE_KINDS) for (const t of L.DETAIL[k]) expect(t).not.toContain('deity')
    for (const a of [L.MODIFIERS, L.EMBLEMS, L.EPITHETS]) expect(new Set(a).size).toBe(a.length)
  })
  it('names elements and reads links in a sentence', () => {
    const crypt: import('./lore').LoreNode = { id: 'c', kind: 'place', primary: 'crypt', modifier: 'forgotten', epithet: 'of Spiders', details: [], x: 300, y: 0 }
    const guild: import('./lore').LoreNode = {
      id: 'g', kind: 'faction', primary: 'guild', emblem: 'a red door', x: 0, y: 0,
      details: [
        { text: 'Holds {place} sacred', links: [{ kinds: ['place'], kind: 'place', primary: 'crypt', node: 'c' }] },
        { text: 'Controls all trade in {material/object}', links: [{ kinds: ['material', 'object'], kind: 'material', primary: 'amber' }] },
        { text: 'Lost its greatest treasure, {object}', links: [{ kinds: ['object'], kind: 'object', primary: 'hourglass' }] },
      ],
    }
    const web = { c: crypt, g: guild }
    expect(L.title(crypt)).toBe('The Forgotten Crypt of Spiders')
    expect(L.describeNode(guild, web)).toBe(
      'The guild holds the Forgotten Crypt of Spiders sacred. It controls all trade in amber. It lost its greatest treasure, an hourglass. Its emblem is a red door.')
    expect(L.spot(web, guild)).not.toEqual({ x: 0, y: 0 })
    expect(L.spot(web, guild)).not.toEqual({ x: 300, y: 0 })
  })
  it('generates a connected web of the requested size', () => {
    for (const p of [packs, { deities: false, emblems: false, names: false }])
      for (const size of [5, 12]) {
        const web = L.generateWeb(size, p)
        const nodes = Object.values(web)
        expect(nodes).toHaveLength(size)
        expect(new Set(nodes.map((n) => `${n.x},${n.y}`)).size).toBe(size)
        for (const n of nodes) {
          expect(n.details).toHaveLength(4)
          if (!p.deities) expect(n.kind).not.toBe('deity')
          if (n.parent) expect(web[n.parent].details.some((d) => d.links.some((l) => l.node === n.id))).toBe(true)
          for (const d of n.details) for (const l of d.links) { expect(l.primary).toBeTruthy(); if (l.node) expect(web[l.node]).toBeTruthy() }
        }
        expect(nodes.filter((n) => !n.parent)).toHaveLength(1)
        expect(L.webText(web)).not.toMatch(/[{}…]|undefined/)
      }
  })
})

describe('story prompts', async () => {
  const S = await import('./story')
  const id = (kind: string, text: string) => {
    const c = S.STORY_CARDS.find((x) => x.kind === kind && x.cues.includes(text))!
    return { card: c.id, active: c.cues.indexOf(text) }
  }

  it('has whole cards, unique cues and something of every kind a pattern needs', () => {
    const cues = S.STORY_CARDS.flatMap((c) => c.cues.map((q) => `${c.kind}:${q}`))
    expect(new Set(cues).size).toBe(cues.length)
    for (const c of S.STORY_CARDS) expect(c.cues).toHaveLength(S.KIND_INFO[c.kind].cues)
    for (const c of S.STORY_CARDS.filter((x) => x.kind === 'subject')) for (const q of c.cues) expect(q).toMatch(/^(a|an|the) /)
    for (const p of S.PATTERNS) for (const d of p.slots) expect(S.drawCard(d.kind, [])).toBeTruthy()
    expect(S.drawCard('bond', [])).toBeUndefined()
    expect(S.drawCard('bond', ['dynamics'])).toBeTruthy()
  })
  it('reads a seed and a two-character prompt as sentences', () => {
    const seed = { id: 's', pattern: 'seed', notes: '', slots: {
      who: id('character', 'heir'), whoT: id('trait', 'honest'), drive: id('drive', 'expose the truth about'),
      what: id('subject', 'the last train'), whatT: id('trait', 'ancient'), but: id('obstacle', 'no one will believe them'),
    } }
    expect(S.write(seed)).toEqual(['An honest heir wants to expose the truth about the ancient last train, but no one will believe them.'])
    const clash = { id: 'c', pattern: 'clash', notes: '', slots: {
      a: id('character', 'forger'), aDrive: id('drive', 'steal'), x: id('subject', 'an old map'), xT: id('trait', 'stolen'),
      b: id('character', 'archivist'), bT: id('trait', 'weary'), bDrive: id('drive', 'protect'), bBut: id('obstacle', 'they are being watched'),
      bond: id('bond', 'estranged siblings'), ask: id('question', 'What would they never forgive?'),
    } }
    expect(S.write(clash)).toEqual([
      'A forger wants to steal a stolen old map.',
      'A weary archivist wants to protect the same old map, but they are being watched.',
      'The two are estranged siblings.',
      'About the forger: What would they never forgive?',
    ])
    expect(S.write({ id: 'e', pattern: 'seed', notes: '', slots: {} })).toEqual([])
  })
  it('fills every pattern without leaving required slots empty, and keeps locked cards', () => {
    for (const p of S.PATTERNS)
      for (const packs of [[], Object.keys(S.PACKS)]) {
        const story = { id: 'x', pattern: p.id, notes: '', slots: {} as Record<string, import('./story').Held | undefined> }
        S.fill(story, packs)
        const defs = S.slotsOf(p.id, packs)
        for (const d of defs) if (!d.optional) expect(story.slots[d.id], `${p.id} ${d.id}`).toBeTruthy()
        const lead = story.slots[p.lead]!
        lead.locked = true
        const before = { ...lead }
        S.fill(story, packs)
        expect(story.slots[p.lead]).toEqual(before)
        const text = S.write(story).join(' ')
        expect(text).toMatch(/^[A-Z].*[.?]$/)
        expect(text).not.toMatch(/undefined|…|  /)
      }
  })
})

describe('names', async () => {
  const N = await import('./names')
  it('repeats for the same seed and differs for another', () => {
    const run = (seed: string) => { const r = N.rngFrom(seed); return Array.from({ length: 8 }, () => r()) }
    expect(run('ember-1')).toEqual(run('ember-1'))
    expect(run('ember-1')).not.toEqual(run('ember-2'))
    for (const v of run('x')) { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThan(1) }
  })
  it('names every kind of thing in every tongue without repeating itself', () => {
    const kinds = ['world', 'place', 'site', 'person', 'faction', 'deity', 'object', 'event', 'creature', 'material'] as const
    N.TONGUES.forEach((_, tongue) => {
      const rng = N.rngFrom(`t${tongue}`)
      const taken = new Set<string>()
      for (const kind of kinds)
        for (let i = 0; i < 25; i++) {
          const name = N.makeName({ kind, tongue, base: 'bell tower', home: 'Marrowick', genres: ['fantasy'] }, rng, taken)
          expect(name, `${kind} in tongue ${tongue}`).toMatch(/^[A-Za-z]/)
          expect(name).not.toMatch(/undefined|  /)
        }
      expect(taken.size).toBeGreaterThan(180)
    })
    expect(N.tonguesFor(['scifi'], 3, N.rngFrom('a')).map((i) => N.TONGUES[i].id)).toEqual(['star'])
    expect(N.tonguesFor(['fantasy', 'horror'], 3, N.rngFrom('a'))).toHaveLength(3)
  })
})

describe('settings', async () => {
  const G = await import('./setting')
  const answers = (over: Partial<import('./setting').Answers> = {}) => ({ ...G.DEFAULT_ANSWERS, ...over })
  const strip = (s: import('./setting').Setting) => ({ ...s, id: '', created: 0 })

  it('is the same setting for the same seed and answers', () => {
    expect(strip(G.generateSetting(answers(), 'quill-204'))).toEqual(strip(G.generateSetting(answers(), 'quill-204')))
    expect(G.generateSetting(answers(), 'quill-205').names).not.toEqual(G.generateSetting(answers(), 'quill-204').names)
  })
  it('ties every layer to the others, at every size and theme', () => {
    const cases = [
      answers({ size: 'region', depth: 'sketch', genres: ['horror'], lands: ['coast'], focus: [] }),
      answers(),
      answers({ size: 'continent', depth: 'rich', genres: ['fantasy', 'scifi'], lands: ['temperate', 'frost', 'dry'], focus: ['power', 'secrets', 'adventure', 'everyday', 'faith'] }),
      answers({ size: 'country', genres: [], lands: ['frost'], focus: ['faith'] }),
    ]
    cases.forEach((a, n) => {
      const s = G.generateSetting(a, `case-${n}`)
      const roots = G.rootsOf(s)
      const [min, max] = { region: [5, 7], country: [9, 14], continent: [14, 20] }[a.size]
      expect(roots.length).toBeGreaterThanOrEqual(min)
      expect(roots.length).toBeLessThanOrEqual(max)
      if (!a.lands.includes('temperate')) expect(roots.some((r) => cards[r] === undefined)).toBe(true)

      const ids = new Set([...Object.keys(s.board), ...s.entities.map((e) => e.id), ...s.people.map((c) => c.id), 'world'])
      const named = Object.values(s.names).map((x) => x.toLowerCase())
      expect(new Set(named).size).toBe(named.length)
      for (const r of roots) expect(s.names[r]).toBeTruthy()
      for (const e of [...s.entities, ...s.people]) {
        expect(s.names[e.id], e.id).toBeTruthy()
        expect(e.details.length).toBeGreaterThan(0)
        for (const d of e.details) for (const l of d.links) { expect(ids.has(l.node!), `${e.id} → ${l.node}`).toBe(true); expect(l.node).not.toBe(e.id) }
      }
      const factions = s.entities.filter((e) => e.kind === 'faction')
      expect(factions.length).toBeGreaterThanOrEqual(2)
      for (const f of factions) {
        expect(s.people.some((c) => c.faction === f.id), `${f.id} has a member`).toBe(true)
        expect(f.details.some((d) => d.links.some((l) => l.kind === 'faction')), `${f.id} has a rival`).toBe(true)
        expect(s.board[f.home!]).toBeTruthy()
      }
      for (const c of s.people) expect(s.board[c.home]).toBeTruthy()
      for (const h of s.hooks) for (const l of h.lines) { expect(ids.has(l.who)).toBe(true); expect(ids.has(l.target)).toBe(true); expect(l.target).not.toBe(l.who) }
      for (const r of roots) {
        const v = G.placeView(s, r)
        expect(v.land.text).toContain(s.names[r])
        for (const site of v.sites) expect(site.text).toContain(s.names[site.id])
      }
      const text = G.settingMarkdown(s)
      expect(text).not.toMatch(/[{}]|undefined|  /)
      for (const e of [...s.entities, ...s.people]) expect(text).toContain(s.names[e.id])
      if (a.focus.includes('adventure')) expect(text).toContain('Quest — ')
    })
  })
  it('never fails to generate, whatever the seed', () => {
    for (let n = 0; n < 40; n++)
      for (const size of ['region', 'country', 'continent'] as const) {
        const s = G.generateSetting(answers({ size, depth: n % 2 ? 'rich' : 'sketch' }), `any-${n}`)
        for (const e of [...s.entities, ...s.people]) for (const d of e.details) for (const l of d.links) expect(s.names[l.node!], `${size} any-${n}`).toBeTruthy()
      }
  })
  it('renames a thing everywhere it is mentioned', () => {
    const s = G.generateSetting(answers(), 'rename')
    const f = s.entities.find((e) => e.kind === 'faction')!
    const fresh = G.rename(s, f.id)
    expect(fresh).not.toBe(s.names[f.id])
    s.names[f.id] = 'the Zzyzx Test'
    const member = s.people.find((c) => c.faction === f.id)!
    expect(G.charText(s, member)[0]).toContain('the Zzyzx Test')
    expect(G.settingMarkdown(s)).toContain('The Zzyzx Test')
  })
})

describe('pictures', async () => {
  const G = await import('./setting')
  const P = await import('./imagePrompts')
  const C = await import('./comfy')

  it('writes a prompt for every element, without invented names', () => {
    const s = G.generateSetting({ ...G.DEFAULT_ANSWERS, focus: ['faith', 'power'] }, 'pictures')
    const ids = P.imageIds(s)
    expect(ids).toHaveLength(1 + G.rootsOf(s).length + s.entities.length + s.people.length)
    for (const id of ids) {
      const spec = P.imageSpec(s, id)
      expect(spec.prompt, id).toMatch(/^[A-Z].*No text or lettering\.$/)
      expect(spec.prompt).not.toMatch(/undefined|something|\{|  /)
      expect(spec.w % 32).toBe(0)
      expect(spec.h % 32).toBe(0)
      expect(spec.seed).toBe(P.imageSpec(s, id).seed)
      if (id !== 'world') expect(spec.prompt, id).not.toContain(s.names[id].replace(/^the /, ''))
    }
    expect(P.imageSpec(s, s.people[0].id).h).toBeGreaterThan(P.imageSpec(s, s.people[0].id).w)
    expect(P.imageSpec(s, G.rootsOf(s)[0]).prompt).toMatch(/^A wide landscape view of /)
    for (const id of ids) expect(P.imageSpec(s, id).prompt).not.toMatch(/\b(in|of) an? (\w+ )?(peaks|flats|badlands|highlands|canyonlands|dunes|caverns|caves|shoals|cliffs|islands|isles|fields|steps)\b/)
  })
  it('builds the text-to-image graph the way ComfyUI expects it', () => {
    const g = C.graph({ prompt: 'a heron', w: 1344, h: 768, seed: 7, steps: 25 })
    expect(g['1'].inputs.unet_name).toBe('qwen_image_2.1_int8_convrot.safetensors')
    expect(g['3'].inputs).toMatchObject({ clip_name: 'qwen3vl_8b_int8_convrot.safetensors', type: 'qwen_image' })
    expect(g['5'].inputs).toMatchObject({ prompt: 'a heron', negative_prompt: '', resolution: 0, clip: ['3', 0], vae: ['4', 0] })
    expect(g['6'].inputs).toEqual({ width: 1344, height: 768, batch_size: 1 })
    expect(g['7'].inputs).toMatchObject({ seed: 7, steps: 25, cfg: 1, sampler_name: 'euler', scheduler: 'simple', denoise: 1, positive: ['5', 0], negative: ['5', 1] })
    expect(g['9'].inputs.images).toEqual(['8', 0])
  })
})

describe('setting descriptions', async () => {
  const G = await import('./setting')
  const { GLOSS, ROLE_GLOSS } = await import('./glosses')
  const L = await import('./lore')
  const S = await import('./story')

  it('has a gloss for every power, thing and role a setting can contain', () => {
    for (const kind of ['faction', 'event', 'object', 'material', 'creature', 'deity'] as const)
      for (const p of L.PRIMARY[kind]) expect(GLOSS[`${kind}:${p}`], `${kind}:${p}`).toMatch(/^(: |, | )\S/)
    for (const c of S.STORY_CARDS.filter((x) => x.kind === 'character')) for (const role of c.cues) expect(ROLE_GLOSS[role], role).toBeTruthy()
    for (const g of [...Object.values(GLOSS), ...Object.values(ROLE_GLOSS)]) expect(g).not.toMatch(/\.$|  /)
  })
  it('opens each element with what it is and weaves in what others say of it', () => {
    const s = G.generateSetting({ ...G.DEFAULT_ANSWERS, depth: 'rich', focus: ['power', 'faith', 'secrets'] }, 'prose')
    const world = G.worldProse(s).text[0]
    expect(world).toMatch(/is a country of \w+ places, taking in /)
    expect(world).toMatch(/powers contend for it: /)
    for (const e of s.entities) {
      const text = G.entityText(s, e)
      expect(text[0], e.id).toContain(s.names[e.id].replace(/^the /, ''))
      expect(text[0]).toContain(e.what)
      expect(text.length).toBeGreaterThanOrEqual(2)
      for (const p of text) expect(p).toMatch(/^[A-Z“].*\.$/)
      expect(text.join(' ')).not.toMatch(/undefined|  |\.\.| ,/)
    }
    const f = s.entities.find((e) => e.kind === 'faction')!
    const member = s.people.find((c) => c.faction === f.id)!
    const spots = G.rootsOf(s).flatMap((r) => { const v = G.placeView(s, r); return [v.land, ...v.sites] })
    expect(spots.flatMap((sp) => sp.powers).find((p) => p.power.id === f.id)!.members.map((c) => c.id)).toContain(member.id)
    for (const c of s.people) {
      const text = G.charText(s, c)
      expect(text[0]).toContain(`${s.names[c.id]} is a`)
      expect(text[0]).toContain(' They live ')
      expect(text.join(' ')).not.toMatch(/undefined|  |\.\.| ,/)
    }
    // Someone a faction's details point at is told so in their own entry.
    const pointed = s.people.find((c) => s.entities.some((e) => e.details.some((d) => d.links.some((l) => l.node === c.id))))
    if (pointed) {
      const who = s.entities.find((e) => e.details.some((d) => d.links.some((l) => l.node === pointed.id)))!
      expect(G.charText(s, pointed).join(' ')).toContain(s.names[who.id].replace(/^the /, ''))
    }
    // Every power, thing and person appears exactly once in the tree of places.
    const shown = spots.flatMap((sp) => [
      ...sp.powers.flatMap((p) => [p.power.id, ...p.members.map((c) => c.id), ...p.things.map((e) => e.id)]),
      ...sp.things.map((e) => e.id), ...sp.people.map((c) => c.id),
    ])
    expect([...shown].sort()).toEqual([...s.entities, ...s.people].map((e) => e.id).sort())
    for (const sp of spots) for (const p of sp.powers) { expect(p.power.home).toBe(sp.id); for (const c of p.members) expect(c.faction).toBe(p.power.id) }
    for (const h of s.hooks) expect(G.hookText(s, h)).toMatch(/^[A-Z].*\.$/)
  })
})

describe('art directions', async () => {
  const G = await import('./setting')
  const P = await import('./imagePrompts')
  it('changes the medium and light of every prompt but not its subject, size or seed', () => {
    const s = G.generateSetting(G.DEFAULT_ANSWERS, 'art')
    const id = G.rootsOf(s)[0]
    const base = P.imageSpec(s, id)
    expect(base.prompt).toContain('Fantasy concept art')
    const seen = new Set<string>()
    for (const [key, art] of Object.entries(P.ART)) {
      const spec = P.imageSpec({ ...s, art: key }, id)
      expect(art.label).toBeTruthy()
      expect(spec.prompt).toMatch(/No text or lettering\.$/)
      expect(spec.prompt).not.toMatch(/undefined|  /)
      expect([spec.w, spec.h, spec.seed]).toEqual([base.w, base.h, base.seed])
      expect(spec.prompt.split('. ')[0]).toBe(base.prompt.split('. ')[0])
      if (key === 'auto') expect(spec.prompt).toBe(base.prompt)
      else { expect(spec.prompt).toContain(art.medium); expect(spec.prompt).not.toContain('Fantasy concept art') }
      seen.add(spec.prompt)
    }
    expect(seen.size).toBe(Object.keys(P.ART).length)
    expect(P.imageSpec({ ...s, art: 'gone' }, id).prompt).toBe(base.prompt)
    expect(P.imageSpec({ ...s, art: 'photo' }, id).prompt).toContain('Warm low sunlight.')
  })
})

describe('drawn map', async () => {
  const G = await import('./setting')
  const M = await import('./mapgen')
  const inside = (p: [number, number], poly: [number, number][]) => {
    let hit = false
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i], [xj, yj] = poly[j]
      if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) hit = !hit
    }
    return hit
  }
  it('draws the same land for the same setting, with every place, site and symbol on its own ground', () => {
    for (const size of ['region', 'country', 'continent'] as const) {
      const s = G.generateSetting({ ...G.DEFAULT_ANSWERS, size, lands: ['temperate', 'coast', 'frost'] }, `map-${size}`)
      const map = M.buildMap(s)
      expect(M.buildMap(s)).toEqual(map)
      expect(map.regions.map((r) => r.id)).toEqual(G.rootsOf(s))
      expect(map.theme).toBe('parchment')
      for (const r of map.regions) {
        expect(r.points.length).toBeGreaterThan(30)
        expect(r.d).toMatch(/^M[-\d. L]+Z$/)
        for (const [x, y] of r.points) { expect(Number.isFinite(x) && Number.isFinite(y)).toBe(true); expect(x).toBeGreaterThan(0); expect(x).toBeLessThan(map.w); expect(y).toBeGreaterThan(0); expect(y).toBeLessThan(map.h) }
        expect(inside([r.x, r.y], r.points), `${r.name} holds its own centre`).toBe(true)
        expect(r.name).toBe(s.names[r.id])
        expect(r.symbols.length).toBeGreaterThan(0)
        for (const p of r.symbols) expect(inside([p.x, p.y], r.points)).toBe(true)
        for (const site of r.sites) expect(inside([site.x, site.y], r.points), `${site.name} in ${r.name}`).toBe(true)
        // No region covers another place's centre.
        for (const o of map.regions) if (o !== r) expect(inside([o.x, o.y], r.points)).toBe(false)
      }
      // Regions are plainly of different sizes.
      const area = (poly: [number, number][]) => Math.abs(poly.reduce((sum, [x, y], k) => { const [nx, ny] = poly[(k + 1) % poly.length]; return sum + x * ny - nx * y }, 0)) / 2
      const areas = map.regions.map((r) => area(r.points))
      expect(Math.max(...areas) / Math.min(...areas), 'largest to smallest').toBeGreaterThan(2.5)
      expect(map.routes.length).toBeGreaterThan(0)
      for (const route of map.routes) { expect(route.a).not.toBe(route.b); expect(route.d).toMatch(/^M[-\d. ]+Q[-\d. ]+$/) }
      // Renaming changes the lettering and nothing else.
      const renamed = M.buildMap({ ...s, names: { ...s.names, [map.regions[0].id]: 'Testhaven' } })
      expect(renamed.regions[0].name).toBe('Testhaven')
      expect(renamed.regions[0].d).toBe(map.regions[0].d)
    }
    expect(M.buildMap(G.generateSetting({ ...G.DEFAULT_ANSWERS, genres: ['scifi'] }, 'blue')).theme).toBe('blueprint')
  })
  it('picks a fitting symbol for each kind of terrain', () => {
    expect(M.glyphFor('Old Forest')).toBe('tree')
    expect(M.glyphFor('Dragon Peaks')).toBe('peak')
    expect(M.glyphFor('Tidal Marsh')).toBe('reed')
    expect(M.glyphFor('Ice Shelf')).toBe('snow')
    expect(M.glyphFor('Blighted Wood')).toBe('deadtree')
    expect(M.glyphFor('Archipelago')).toBe('wave')
    expect(M.glyphFor('Steppe')).toBe('tuft')
  })
})

describe('region colour from a picture', async () => {
  const { tintOf } = await import('./imageStore')
  const M = await import('./mapgen')
  it('reads the overall colour of a picture, favouring vivid pixels over grey', () => {
    const px = (...colours: [number, number, number][]) => colours.flatMap((c) => [...c, 255])
    expect(tintOf(px([200, 40, 40], [200, 40, 40]))).toBe('#c82828')
    expect(tintOf([])).toBe('#808080')
    // One vivid green pixel outweighs one grey one.
    const mixed = tintOf(px([128, 128, 128], [20, 200, 20]))
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(mixed.slice(i, i + 2), 16))
    expect(g).toBeGreaterThan(170)
    expect(r).toBeLessThan(60)
    expect(b).toBe(r)
  })
  it('turns that colour into a wash for either theme', () => {
    expect(M.washFor('#c82828', 'parchment')).toMatch(/^rgb\(\d+ \d+ \d+\)$/)
    expect(M.washFor('#c82828', 'parchment')).not.toBe(M.washFor('#c82828', 'blueprint'))
    expect(M.washFor('#c82828', 'parchment')).not.toBe(M.washFor('#2828c8', 'parchment'))
  })
})

describe('genre in pictures', async () => {
  const G = await import('./setting')
  const P = await import('./imagePrompts')
  const world: Record<string, RegExp> = {
    fantasy: /The setting is a fantasy world: .*magic.*no modern technology/,
    scifi: /The setting is a science fiction world: .*machines/,
    horror: /The setting is a gothic horror world: .*decaying/,
    grounded: /The setting is a realistic present-day world: .*present day/,
  }
  it('keeps the things of the genre in every prompt, whatever the art direction', () => {
    for (const [genre, pattern] of Object.entries(world)) {
      const s = G.generateSetting({ ...G.DEFAULT_ANSWERS, size: 'region', genres: [genre], focus: ['power', 'faith'] }, `genre-${genre}`)
      for (const art of Object.keys(P.ART))
        for (const id of P.imageIds(s)) {
          const { prompt } = P.imageSpec({ ...s, art }, id)
          expect(prompt, `${genre} ${art} ${id}`).toMatch(pattern)
          // The element itself still leads, and the medium still closes.
          expect(prompt.indexOf('The setting is a')).toBeGreaterThan(20)
          if (art !== 'auto') expect(prompt.indexOf(P.ART[art].medium)).toBeGreaterThan(prompt.indexOf('The setting is a'))
          expect(prompt).not.toMatch(/undefined|  /)
        }
      const person = P.imageSpec({ ...s, art: 'woodcut' }, s.people[0].id).prompt
      expect(person).toContain(' They wear ')
      expect(person).toContain(s.people[0].what)
      expect(P.imageSpec({ ...s, art: 'woodcut' }, G.rootsOf(s)[0]).prompt).not.toContain(' They wear ')
    }
  })
  it('names both genres of a mixed setting, and falls back to the present day when none is chosen', () => {
    const mixed = G.generateSetting({ ...G.DEFAULT_ANSWERS, size: 'region', genres: ['scifi', 'horror'] }, 'mixed')
    expect(P.imageSpec({ ...mixed, art: 'watercolour' }, 'world').prompt).toMatch(/a science fiction and gothic horror world: .*machines.*decaying/)
    const none = G.generateSetting({ ...G.DEFAULT_ANSWERS, size: 'region', genres: [] }, 'none')
    expect(P.imageSpec(none, 'world').prompt).toContain('a realistic present-day world')
  })
})

describe('perils', async () => {
  const D = await import('./peril')
  const seq = (values: number[]) => { let i = 0; return () => values[i++ % values.length] }

  it('has well-formed tables: several entries each, none repeated, sentences where sentences are expected', () => {
    const every = [
      ...Object.keys(D.KINDS).flatMap((_, k) => Object.keys(D.ENVIRONMENTS).flatMap((_e, e) => Object.keys(D.DANGERS).map((_d, d) => ({ kind: k, env: e, danger: d, before: 1 })))),
    ].flatMap((r) => D.stepsFor(r).flatMap((s) => s.tables))
    const seen = new Map(every.map((tb) => [tb.id, tb]))
    expect(seen.size).toBeGreaterThan(70)
    for (const tb of seen.values()) {
      expect(tb.entries.length, tb.id).toBeGreaterThanOrEqual(6)
      expect(new Set(tb.entries).size, tb.id).toBe(tb.entries.length)
      for (const e of tb.entries) expect(e.trim()).toBe(e)
      if (/feature$|twist$|^press$/.test(tb.id)) for (const e of tb.entries) expect(e, tb.id).toMatch(/^[A-Z].*\.$/)
      else for (const e of tb.entries) expect(e, tb.id).not.toMatch(/\.$/)
    }
    expect(D.ARCHETYPES).toHaveLength(12)
  })
  it('only offers the tables that earlier rolls call for', () => {
    expect(D.stepsFor({}).map((s) => s.title)).toEqual(['Premise'])
    expect(D.stepsFor({}).flatMap((s) => s.tables).map((tb) => tb.id)).not.toContain('remains')
    expect(D.stepsFor({ before: 0 }).flatMap((s) => s.tables).map((tb) => tb.id)).not.toContain('remains')
    expect(D.stepsFor({ before: 3 }).flatMap((s) => s.tables).map((tb) => tb.id)).toContain('remains')
    const people = Object.keys(D.DANGERS).indexOf('people'), magic = Object.keys(D.DANGERS).indexOf('magic')
    expect(D.stepsFor({ kind: 0, env: 0, danger: people }).map((s) => s.title).at(-1)).toBe('Who is behind it')
    expect(D.stepsFor({ kind: 0, env: 0, danger: magic })).toHaveLength(4)
  })
  it('rolls every table that applies, keeps locked results, and writes a complete brief', () => {
    for (let n = 0; n < 200; n++) {
      const rolls = D.rollAll({})
      const tables = D.stepsFor(rolls).flatMap((s) => s.tables)
      for (const tb of tables) { expect(rolls[tb.id], tb.id).toBeGreaterThanOrEqual(0); expect(rolls[tb.id]).toBeLessThan(tb.entries.length) }
      const text = D.brief('Blackmoor Tower', rolls)
      expect(text.length).toBeGreaterThanOrEqual(5)
      expect(text[0]).toMatch(/^Blackmoor Tower is an? /)
      for (const para of text) expect(para).toMatch(/^[A-Z].*\.$/)
      expect(text.join(' ')).not.toMatch(/undefined|  |\.\.| ,|\. [a-z]/)
      const again = D.rollAll(rolls, ['kind', 'theme'])
      expect([again.kind, again.theme]).toEqual([rolls.kind, rolls.theme])
    }
    expect(D.brief('', {})).toEqual([])
    expect(D.brief('', { kind: 0 })[0]).toBe('This place is a burial ground.')
  })
  it('reads as intended for a known set of rolls', () => {
    const rolls = D.rollAll({}, [], seq([0]))
    expect(D.brief('Ashwick', rolls)).toEqual([
      'Ashwick is a pristine, cramped burial ground, raised within the last year. It was made to honour a single great family. Every marker faces the same direction, away from the gate. It is reached by a single well-used path. Locals know nothing of it.',
      'It stands on an island barely larger than itself, on open water. The water around it is unnaturally still. The country around is home to shoals of silver fish that scatter at a shadow. Lately the weather has been calm and clear. The land is slowly taking it back.',
      'Before this, the ground held nothing but wild country.',
      'The danger is a pack hunting together. They are here because the place is warm and dry. They are starving. No one has dealt with it because no one knows it is there. Left alone, it will spread to the nearest settlement. Outsiders should care because someone they know is inside.',
      'The thread running through it all is debt.',
    ])
  })
})

describe('settlements', async () => {
  const T = await import('./settlement')
  it('has well-formed tables for every kind of settlement', () => {
    const kinds = Object.keys(T.TYPES)
    expect(kinds).toHaveLength(6)
    kinds.forEach((_, i) => {
      const steps = T.stepsFor({ type: i })
      expect(steps.map((s) => s.title)).toEqual(['Foundations', 'People', 'Rule and order', 'Places', 'Trouble and talk'])
      const tables = steps.flatMap((s) => s.tables)
      expect(new Set(tables.map((tb) => tb.id)).size).toBe(tables.length)
      for (const tb of tables) {
        expect(tb.entries.length, tb.id).toBeGreaterThanOrEqual(4)
        expect(new Set(tb.entries).size, tb.id).toBe(tb.entries.length)
        if (/extra$|^market$|^history$|^event$/.test(tb.id)) for (const e of tb.entries) expect(e, tb.id).toMatch(/^[A-Z].*\.$/)
        else for (const e of tb.entries) expect(e, tb.id).not.toMatch(/\.$/)
      }
    })
    expect(T.stepsFor({}).map((s) => s.title)).toEqual(['Foundations'])
    expect(T.brief('Anywhere', {})).toEqual([])
  })
  it('rolls a complete settlement and writes it up in whole sentences', () => {
    for (let n = 0; n < 200; n++) {
      const rolls = T.rollAll({})
      for (const tb of T.stepsFor(rolls).flatMap((s) => s.tables)) expect(rolls[tb.id], tb.id).toBeLessThan(tb.entries.length)
      const text = T.brief('Marrowick', rolls)
      expect(text).toHaveLength(5)
      expect(text[0]).toMatch(/^Marrowick is an? /)
      for (const para of text) expect(para).toMatch(/^[A-Z].*\.$/)
      expect(text.join(' ')).not.toMatch(/undefined|  |\.\.| ,|\. [a-z]| and \./)
      expect(T.rollAll(rolls, ['type']).type).toBe(rolls.type)
    }
  })
  it('reads as intended for a known set of rolls, and copes with gaps', () => {
    const rolls = T.rollAll({}, [], () => 0)
    expect(T.brief('Ashford', rolls)).toEqual([
      'Ashford is a squalid trading post, barely a generation old. It began as a camp that never moved on and lies on a coast. It is known for furs and hides. Visitors are almost unknown.',
      'It holds a dozen permanent residents. Its people are nearly all of one folk; most are destitute. Toward strangers they are hostile.',
      'It is run by an elected mayor. The law is absent, and crime is almost unknown. It is defended by nothing. A single family controls every stall.',
      'The market square is cobbled and crowded. The best-known inn is a low, smoky house with excellent stew. Shops of note include a bookbinder. There is also a bathhouse. The main place of worship is a plain wooden chapel, and people gather at the well.',
      'A new leader took over within the year. A festival is days away. People say that the well has gone bad. The nearest danger is bandits on the road.',
    ])
    expect(T.brief('', { type: 1, crime: 2, gather: 0 })).toEqual(['This settlement is a village.', 'Crime is an everyday nuisance.', 'People gather at the well.'])
  })
})

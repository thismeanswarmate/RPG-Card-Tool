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
    const siteCount = G.rootsOf(s).reduce((n, r) => n + G.placeView(s, r).sites.length, 0)
    expect(ids).toHaveLength(1 + G.rootsOf(s).length + siteCount + s.entities.length + s.people.length + s.built!.length + s.drawn!.length)
    for (const id of ids) {
      const spec = P.imageSpec(s, id)
      expect(spec.prompt, id).toMatch(/^[A-Z].*No text or lettering\.$/)
      expect(spec.prompt).not.toMatch(s.built!.some((b) => b.id === id) ? /undefined|\{|  / : /undefined|something|\{|  /)
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
      ...Object.keys(D.KINDS).flatMap((_, k) => Object.keys(D.DANGERS).map((_d, d) => ({ kind: k, danger: d, before: 1 }))),
    ].flatMap((r) => D.stepsFor(r).flatMap((s) => s.tables))
    const seen = new Map(every.map((tb) => [tb.id, tb]))
    expect(seen.size).toBeGreaterThan(50)
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
    expect(D.stepsFor({ kind: 0, danger: people }).map((s) => s.title).at(-1)).toBe('Who is behind it')
    expect(D.stepsFor({ kind: 0, danger: magic })).toHaveLength(3)
    expect(D.stepsFor({ kind: 0, danger: magic }).flatMap((s) => s.tables).map((tb) => tb.label)).not.toContain('Surroundings')
  })
  it('rolls every table that applies, keeps locked results, and writes a complete brief', () => {
    for (let n = 0; n < 200; n++) {
      const rolls = D.rollAll({})
      const tables = D.stepsFor(rolls).flatMap((s) => s.tables)
      for (const tb of tables) { expect(rolls[tb.id], tb.id).toBeGreaterThanOrEqual(0); expect(rolls[tb.id]).toBeLessThan(tb.entries.length) }
      const text = D.brief('Blackmoor Tower', rolls)
      expect(text.length).toBeGreaterThanOrEqual(4)
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
      'Ashford is a squalid trading post, barely a generation old. It began as a camp that never moved on. It is known for furs and hides. Visitors are almost unknown.',
      'It holds a dozen permanent residents. Its people are nearly all of one folk; most are destitute. Toward strangers they are hostile.',
      'It is run by an elected mayor. The law is absent, and crime is almost unknown. It is defended by nothing. A single family controls every stall.',
      'The market square is cobbled and crowded. The best-known inn is a low, smoky house with excellent stew. Shops of note include a bookbinder. There is also a bathhouse. The main place of worship is a plain wooden chapel, and people gather at the well.',
      'A new leader took over within the year. A festival is days away. People say that the well has gone bad. The nearest danger is bandits on the road.',
    ])
    expect(T.brief('', { type: 1, crime: 2, gather: 0 })).toEqual(['This settlement is a village.', 'Crime is an everyday nuisance.', 'People gather at the well.'])
  })
})

describe('settings built by hand, and built places in generated ones', async () => {
  const G = await import('./setting')
  const B = await import('./settingBuild')
  const M = await import('./mapgen')
  const clean = (text: string) => expect(text).not.toMatch(/undefined|NaN|\[object|  /)

  it('puts settlements and dangerous places into a generated setting', () => {
    const s = G.generateSetting({ ...G.DEFAULT_ANSWERS, focus: ['adventure', 'everyday'] }, 'built')
    expect(s.built!.filter((b) => b.tool === 'settlement')).toHaveLength(4)
    expect(s.built!.filter((b) => b.tool === 'peril')).toHaveLength(3)
    for (const b of s.built!) {
      expect(s.board[b.home]).toBeTruthy()
      expect(s.names[b.id]).toBeTruthy()
      expect(G.builtText(s, b).length).toBeGreaterThanOrEqual(4)
    }
    const text = G.settingMarkdown(s)
    for (const b of s.built!) expect(text).toContain(G.builtText(s, b)[0])
    clean(text)
  })

  it('builds up piece by piece, draws a map at every size, and reads cleanly throughout', () => {
    for (let n = 0; n < 25; n++) {
      const genres = [['fantasy'], ['scifi'], ['horror'], [], ['fantasy', 'horror']][n % 5]
      const s = B.newManual(genres, n % 2 ? ['frost'] : ['temperate', 'coast'], n % 3 ? '' : 'My World')
      expect(s.manual).toBe(true)
      clean(G.settingMarkdown(s))
      for (let i = 0; i < 4; i++) {
        const place = B.addPlace(s)!
        expect(s.names[place]).toBeTruthy()
        const map = M.buildMap(s)
        expect(map.regions).toHaveLength(i + 1)
        expect(Number.isFinite(map.w) && Number.isFinite(map.h) && map.w > 100 && map.h > 100).toBe(true)
        expect(JSON.stringify(map)).not.toContain('null')
        const site = G.placeView(s, place).sites[0]?.id ?? place
        // Populate it: with nothing else in the setting yet, details simply have less to point at.
        const made = [
          B.addPower(s, 'faction', site), B.addPerson(s, site), B.addPower(s, 'object', place), B.addPerson(s, place),
          B.addPower(s, (['deity', 'event', 'creature', 'material'] as const)[i], place),
          B.addBuilt(s, 'settlement', place), B.addBuilt(s, 'peril', site),
        ]
        for (const id of made) expect(s.names[id], id).toBeTruthy()
        expect(B.addStory(s, made[1])).toBeTruthy()
        for (const id of made.slice(0, 5)) B.rewrite(s, id)
        B.redrawPlace(s, place)
        B.addSite(s, place)
        clean(G.settingMarkdown(s))
      }
      expect(G.rootsOf(s)).toHaveLength(4)
      expect(new Set([...s.entities, ...s.people, ...s.built!, ...s.hooks].map((x) => x.id)).size).toBe(s.entities.length + s.people.length + s.built!.length + s.hooks.length)
      for (const d of [...s.entities, ...s.people].flatMap((e) => e.details)) for (const l of d.links) expect(s.names[l.node!], d.text).toBeTruthy()
      for (const p of Object.values(s.board)) expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true)

      // Take a place away: everything based there goes, and nothing left behind still mentions it.
      const [first] = G.rootsOf(s)
      const gone = B.goneWith(s, first)
      expect(gone.length).toBeGreaterThan(5)
      B.remove(s, first)
      expect(G.rootsOf(s)).toHaveLength(3)
      const left = JSON.stringify({ e: s.entities, p: s.people, h: s.hooks, b: s.built })
      for (const id of gone) expect(left).not.toContain(`"${id}"`)
      clean(G.settingMarkdown(s))
      B.remove(s, s.people[0].id)
      B.remove(s, s.entities[0].id)
      B.rerollStory(s, s.hooks[0]?.id ?? '')
      clean(G.settingMarkdown(s))
      expect(M.buildMap(s).regions).toHaveLength(3)
      expect(s.names[B.addPower(s, 'faction', G.rootsOf(s)[0])]).toBeTruthy()
    }
  })

  it('edits the tables of a built place and keeps what it was told to keep', () => {
    const s = B.newManual(['fantasy'], ['temperate'])
    const place = B.addPlace(s)!
    const id = B.addBuilt(s, 'settlement', place)
    const b = s.built!.find((x) => x.id === id)!
    B.builtEdit(s, id, 'type', 3)
    expect(G.builtKind(b)).toBe('city')
    expect(b.rolls['type.city.known']).toBeDefined()
    expect(G.builtText(s, b)[0]).toMatch(/city/)
    B.builtEdit(s, id, 'type', 'lock')
    B.builtEdit(s, id, 'age', 'roll')
    for (let i = 0; i < 10; i++) B.builtReroll(s, id)
    expect(G.builtKind(b)).toBe('city')
    const peril = B.addBuilt(s, 'peril', place)
    B.builtEdit(s, peril, 'kind', 'roll')
    expect(G.builtText(s, s.built!.find((x) => x.id === peril)!).length).toBeGreaterThan(2)
  })
})

describe('choosing the parts of a hand-built place from lists', async () => {
  const G = await import('./setting')
  const B = await import('./settingBuild')
  it('offers every part as text and applies the choice, keeping names and whatever is based there', () => {
    for (let n = 0; n < 20; n++) {
      const s = B.newManual(['fantasy'], ['temperate', 'coast'])
      const root = B.addPlace(s)!
      const site = G.placeView(s, root).sites[0].id
      const [faction, person] = [B.addPower(s, 'faction', site), B.addPerson(s, root)]
      B.addStory(s, person)
      const [placeName, siteName, id] = [s.names[root], s.names[site], s.id]

      // The land: pick a different one. The place keeps its name, its site and its people.
      const lands = B.choices(s, 'terrain', root)
      expect(lands.length).toBeGreaterThan(10)
      for (const c of lands) expect(c.text).toBeTruthy()
      const land = lands.find((c) => !c.value.startsWith(`${root}:`))!
      B.choose(s, root, 'terrain', land.value, root)
      const next = G.rootsOf(s)[0]
      expect(next).not.toBe(root)
      expect(G.terrainOf(s, next)).toBe(land.text)
      expect([s.names[next], s.id, s.people[0].home]).toEqual([placeName, id, next])
      expect(JSON.stringify(s)).not.toContain(`"${root}"`)

      // The site: likewise, and the faction based there moves with it.
      const kind = B.choices(s, 'site', site).find((c) => !c.value.startsWith(`${site}:`))!
      B.choose(s, next, 'site', kind.value, site)
      const view = G.placeView(s, next)
      expect(s.names[view.sites[0].id]).toBe(siteName)
      expect(view.sites[0].powers[0].power.id).toBe(faction)
      expect(B.chosen(s, view.sites[0].id)).toBe(kind.value)
      expect(s.specs[view.sites[0].id].base).toBe(kind.text.toLowerCase())

      // The describing parts: choose, leave out, and pick at random.
      for (const [type] of B.ASPECTS.slice(1)) {
        const [now] = B.aspectsOf(s, next, type)
        const pick = B.choices(s, type, now).find((c) => c.value !== B.chosen(s, now))!
        B.choose(s, next, type, pick.value, now)
        const [after] = B.aspectsOf(s, next, type)
        expect(B.chosen(s, after)).toBe(pick.value)
        B.choose(s, next, type, '', after)
        expect(B.aspectsOf(s, next, type)).toHaveLength(0)
        B.choose(s, next, type, 'random')
        expect(B.aspectsOf(s, next, type)).toHaveLength(1)
      }
      expect(G.settingMarkdown(s)).not.toMatch(/undefined|NaN/)

      // A draw offers what its card held, and a redraw brings a different set.
      for (const [type, size] of [['terrain', 1], ['epithet', 4], ['legacy', 4], ['trait', 4], ['omen', 2]] as const) {
        const here = G.rootsOf(s)[0]
        const [now] = B.aspectsOf(s, here, type)
        const before = B.drawn(now)
        expect(before).toHaveLength(size)
        expect(before.map((c) => c.value)).toContain(B.chosen(s, now))
        B.choose(s, here, type, 'random', now)
        const [then] = B.aspectsOf(s, G.rootsOf(s)[0], type)
        expect(then).not.toBe(now)
        expect(B.drawn(then).map((c) => c.text)).not.toEqual(before.map((c) => c.text))
      }
      expect(s.names[G.rootsOf(s)[0]]).toBe(placeName)
      expect(B.drawn(G.placeView(s, G.rootsOf(s)[0]).sites[0].id)).toHaveLength(2)

      // What a power is and a person's role work the same way: a few options, pick one, or redraw.
      for (const id of [faction, person]) {
        const e = [...s.entities, ...s.people].find((x) => x.id === id)!
        const options = B.whatOptions(s, id)
        expect(options.length).toBeGreaterThan(1)
        expect(options.length).toBeLessThanOrEqual(4)
        expect(options).toContain(e.what)
        B.setWhat(s, id, options.find((o) => o !== e.what)!)
        expect(B.whatOptions(s, id)).toEqual(options)
        B.redrawWhat(s, id)
        expect(options).not.toContain(e.what)
        expect(B.whatOptions(s, id)).toContain(e.what)
      }
      expect(G.entityText(s, s.entities[0])[0]).toContain(s.entities[0].what)
      expect(G.charText(s, s.people[0])[0]).toContain(s.people[0].what)
    }
  })
})

describe('what is chosen for a land is told in its description', async () => {
  const G = await import('./setting')
  const B = await import('./settingBuild')
  const { cardSentence } = await import('./describe')
  const { cardsOf } = await import('./store')
  const CARDS = cardsOf({ custom: [] })
  it('includes the past, today and what is afoot of a land in the land text, and of a site in the site text', () => {
    for (let n = 0; n < 30; n++) {
      const s = B.newManual([['fantasy'], ['scifi'], ['horror']][n % 3], ['temperate'])
      const root = B.addPlace(s)!
      const check = () => {
        const v = G.placeView(s, G.rootsOf(s)[0])
        for (const spot of [v.land, ...v.sites])
          for (const [type] of B.ASPECTS.slice(1))
            for (const id of B.aspectsOf(s, spot.id, type)) {
              const told = cardSentence(s.board, CARDS, id)
              expect(told, type).toBeTruthy()
              // The land's own sentence names it in full; the others are told word for word.
              expect(spot.text, `${type}: ${told}`).toContain(type === 'epithet' ? told.slice(0, 20) : told)
            }
      }
      for (const [type] of B.ASPECTS.slice(1)) expect(B.aspectsOf(s, root, type), type).toHaveLength(1)
      check()
      B.redrawPlace(s, root)
      for (const [type] of B.ASPECTS.slice(1)) { B.choose(s, root, type, 'random', B.aspectsOf(s, root, type)[0]); check() }
      const site = G.placeView(s, root).sites[0].id
      for (const [type] of B.ASPECTS.slice(1, 4)) { B.choose(s, site, type, 'random'); expect(B.aspectsOf(s, site, type)).toHaveLength(1) }
      check()
    }
  })
})

describe('story packs: mystery, curios and pasts', async () => {
  const S = await import('./story')
  it('adds cards of the right kinds, and only when switched on', () => {
    const decks = (deck: string) => S.STORY_CARDS.filter((c) => c.deck === deck)
    expect(decks('mystery').map((c) => c.kind).sort().join()).toBe('character,character,character,drive,drive,obstacle,obstacle,subject,subject,subject,trait,trait')
    expect(decks('curios').filter((c) => c.kind === 'subject')).toHaveLength(3)
    expect(decks('curios').filter((c) => c.kind === 'trait')).toHaveLength(4)
    expect(decks('pasts').filter((c) => c.kind === 'past')).toHaveLength(11)
    expect(decks('pasts').filter((c) => c.kind === 'present')).toHaveLength(11)
    expect(S.drawCard('past', [])).toBeUndefined()
    for (const p of S.PATTERNS) {
      expect(S.slotsOf(p.id, []).map((x) => x.id)).not.toContain('past')
      expect(S.slotsOf(p.id, ['pasts']).map((x) => x.id).slice(-2)).toEqual(['past', 'now'])
      expect(p.slots.map((x) => x.id)).toContain(p.other)
    }
  })
  it('writes the past into the prompt as a sentence of its own', () => {
    for (const p of S.PATTERNS) for (let n = 0; n < 60; n++) {
      const story = { id: 'x', pattern: p.id, slots: {}, notes: '' }
      S.fill(story, ['mystery', 'curios', 'pasts'])
      const text = S.write(story)
      const past = text.find((t) => t.startsWith('Long ago the '))
      expect(past, text.join(' | ')).toMatch(/^Long ago the .+ (the|a|an) .+, and now .+\.$/)
      expect(text.join(' ')).not.toMatch(/undefined|  |\.\./)
    }
    const fixed = { id: 'x', pattern: 'seed', notes: '', slots: {
      who: { card: 'mystery:character:0', active: 0 }, drive: { card: 'mystery:drive:0', active: 1 }, what: { card: 'curios:subject:0', active: 0 },
      but: { card: 'mystery:obstacle:0', active: 0 }, past: { card: 'pasts:past:0', active: 0 }, now: { card: 'pasts:present:0', active: 0 },
    } }
    expect(S.write(fixed)).toEqual([
      'A night-shift detective wants to clear the name of a compass that points at what you fear, but the evidence points at them.',
      'Long ago the night-shift detective was saved by the compass that points at what you fear, and now the wrong people have started asking questions.',
    ])
  })
})

describe('mentions in descriptions', async () => {
  const G = await import('./setting')
  const B = await import('./settingBuild')
  it('marks words that name something addable, once each, and leaves given names alone', () => {
    const s = B.newManual(['fantasy'], ['temperate'])
    const root = B.addPlace(s)!
    s.names[root] = 'Carrcombe'
    const circus = B.addPower(s, 'faction', root)
    s.names[circus] = 'the Coldgate Circus'
    const parts = B.findMentions(s, 'A council governs Carrcombe, and the council fears the Coldgate Circus. Two villages were lost to floods; ringed by cliffs, in order to watch.')
    const marked = parts.filter((p) => typeof p !== 'string') as { text: string; mention: import('./settingBuild').Mention }[]
    expect(marked.map((m) => m.text)).toEqual(['council', 'villages', 'floods'])
    expect(marked.map((m) => B.mentionKind(m.mention))).toEqual(['faction', 'settlement', 'event'])
    expect(parts.map((p) => (typeof p === 'string' ? p : p.text)).join('')).toContain('fears the Coldgate Circus. Two villages')
    expect(B.findMentions(s, 'The council meets.', 'council')).toEqual(['The council meets.'])
  })
  it('adds exactly what was mentioned, where it was mentioned', () => {
    for (let n = 0; n < 15; n++) {
      const s = B.newManual(['fantasy'], ['temperate'])
      const root = B.addPlace(s)!
      const text = 'A council, a village, a hideout, a smuggler, a bell, some amber, an owl, a god and a siege.'
      const added = B.findMentions(s, text).flatMap((p) => (typeof p === 'string' ? [] : [B.addMention(s, p.mention, root)!]))
      expect(added).toHaveLength(9)
      expect(s.entities.map((e) => `${e.kind}:${e.kind === 'deity' ? '' : e.what}`)).toEqual(['faction:council', 'object:bell', 'material:amber', 'creature:owl', 'deity:', 'event:siege'])
      expect(s.people[0].what).toBe('smuggler')
      expect(s.built!.map(G.builtKind)).toEqual(['village', 'hideout'])
      for (const id of added) expect(s.names[id]).toBeTruthy()
      expect([...s.entities, ...s.people, ...s.built!].every((x) => x.home === root)).toBe(true)
      // A kind of site that is not yet on the map can be added too, and then stops being offered.
      // A kind of site whose word is not already part of some name here, since words inside names are left alone.
      const site = B.choices(s, 'site').find((c) => !Object.values(s.names).some((n) => n.toLowerCase().includes(c.text.toLowerCase())))!
      const [hit] = B.findMentions(s, `Past the ${site.text.toLowerCase()}.`).filter((p) => typeof p !== 'string') as { mention: import('./settingBuild').Mention }[]
      expect(B.mentionKind(hit.mention)).toBe('site')
      const made = B.addMention(s, hit.mention, root)!
      expect(G.placeView(s, root).sites.map((x) => x.id)).toContain(made)
      expect(B.findMentions(s, `Past the ${site.text.toLowerCase()}.`).filter((p) => typeof p !== 'string' && B.mentionKind(p.mention) === 'site')).toHaveLength(0)
      expect(G.settingMarkdown(s)).not.toMatch(/undefined|NaN/)
    }
  })
})

describe('choosing the decks in the mix', async () => {
  const S = await import('./story')
  const L = await import('./lore')
  const G = await import('./setting')
  const B = await import('./settingBuild')
  const { cardsOf } = await import('./store')
  const CARDS = cardsOf({ custom: [] })

  it('stories: draws only from the decks and kinds that are ticked', () => {
    for (let n = 0; n < 80; n++) {
      expect(S.CARD[S.drawCard('character', ['-core', 'horror'])!.card].deck).toBe('horror')
      expect(S.CARD[S.drawCard('character', ['horror', 'mystery', '-horror:character'])!.card].deck).not.toBe('horror')
      expect(S.CARD[S.drawCard('trait', ['-core'])!.card].deck).toBe('core')
    }
    expect(S.slotsOf('seed', ['pasts', '-pasts:present']).map((x) => x.id).slice(-1)).toEqual(['past'])
    expect(S.slotsOf('circle', ['dynamics', '-dynamics:bond']).map((x) => x.id)).not.toContain('bond')
    expect(S.slotsOf('circle', ['dynamics']).map((x) => x.id)).toContain('bond')
  })
  it('lore: leaves out the element types that are unticked', () => {
    const packs = { deities: true, emblems: false, names: false, off: ['creature', 'material', 'deity'] as import('./lore').Kind[] }
    expect(L.kindsFor(packs)).toEqual(['faction', 'figure', 'event', 'place', 'object'])
    for (let n = 0; n < 20; n++) for (const node of Object.values(L.generateWeb(12, packs))) expect(packs.off).not.toContain(node.kind)
    expect(L.kindsFor({ ...packs, off: [...L.BASE_KINDS, 'deity'] })).toHaveLength(8)
  })
  it('setting: draws places, sites and roles from the ticked decks, and keeps what is already there', () => {
    const s = B.newManual(['fantasy'], ['temperate'])
    expect(G.decksOf(s)).toEqual({ world: ['starter', 'fantasy'], story: ['core', 'fantasy'], deities: true })
    const first = B.addPlace(s)!
    B.toggleDeck(s, 'world', 'starter'); B.toggleDeck(s, 'world', 'fantasy'); B.toggleDeck(s, 'world', 'frost')
    B.toggleDeck(s, 'story', 'core'); B.toggleDeck(s, 'story', 'fantasy'); B.toggleDeck(s, 'story', 'mystery')
    B.toggleDeck(s, 'deities')
    expect(s.decks).toEqual({ world: ['frost'], story: ['mystery'], deities: false })
    const frost = [B.addPlace(s)!, B.addPlace(s)!]
    for (const root of frost) for (const id of Object.keys(s.board).filter((id) => id === root || s.board[id].parent === root)) expect(CARDS[id].deck, id).toBe('frost')
    expect(CARDS[first].deck).not.toBe('frost')
    const mysteryRoles = S.STORY_CARDS.filter((c) => c.deck === 'mystery' && c.kind === 'character').flatMap((c) => c.cues)
    for (let i = 0; i < 6; i++) { const id = B.addPerson(s, frost[0]); expect(mysteryRoles).toContain(s.people.find((c) => c.id === id)!.what) }
    // The frost deck has six lands; once they are used up the starter deck steps in rather than nothing.
    for (let i = 0; i < 6; i++) expect(B.addPlace(s)).toBeTruthy()
    expect(G.settingMarkdown(s)).not.toMatch(/undefined|NaN/)
  })
})

describe('settlements and dangerous places on the map', async () => {
  const G = await import('./setting')
  const B = await import('./settingBuild')
  const M = await import('./mapgen')
  it('marks every one inside the place it stands in, clear of the other marks', () => {
    for (const size of ['region', 'country', 'continent'] as const) {
      const s = G.generateSetting({ ...G.DEFAULT_ANSWERS, size, focus: ['adventure', 'everyday'] }, `marks-${size}`)
      const [root] = G.rootsOf(s)
      for (let i = 0; i < 3; i++) { B.addBuilt(s, 'settlement', root); B.addBuilt(s, 'peril', G.placeView(s, root).sites[0]?.id ?? root) }
      const map = M.buildMap(s)
      const marks = map.regions.flatMap((r) => r.sites.map((m) => ({ ...m, region: r.id })))
      for (const b of s.built!) {
        const mark = marks.find((m) => m.id === b.id)!
        expect(mark, b.id).toBeTruthy()
        expect([mark.kind, mark.name, mark.region]).toEqual([b.tool, s.names[b.id], G.homeRoot(s, b.home)])
        expect(mark.x > 0 && mark.x < map.w && mark.y > 0 && mark.y < map.h).toBe(true)
      }
      expect(marks.filter((m) => m.kind === 'site').length).toBeGreaterThan(0)
      // In all but the most crowded places no two marks sit on top of each other.
      const clashes = marks.filter((a, i) => marks.some((b, j) => j > i && Math.abs(a.x - b.x) < 20 && Math.abs(a.y - b.y) < 12))
      expect(clashes.length).toBeLessThanOrEqual(1)
    }
  })
})

describe('races, cultures and history', async () => {
  const E = await import('./cardTool')
  const T = await import('./cardTools')
  const tools = [T.RACES, T.CULTURES, T.HISTORY]

  it('has well-formed decks: full draws, nothing repeated, and cues that complete a sentence', () => {
    for (const def of tools) {
      const cards = E.cardsOf(def)
      expect(new Set(cards.map((c) => c.id)).size).toBe(cards.length)
      for (const a of def.aspects) {
        const core = cards.filter((c) => c.aspect === a.id && c.deck === 'core')
        expect(core.length, `${def.id}:${a.id}`).toBeGreaterThanOrEqual(4)
        const cues = cards.filter((c) => c.aspect === a.id).flatMap((c) => c.cues)
        expect(new Set(cues).size, `${def.id}:${a.id}`).toBe(cues.length)
        for (const c of cards.filter((x) => x.aspect === a.id)) expect(c.cues, c.id).toHaveLength(4)
        for (const cue of cues) expect(cue, `${def.id}:${a.id}`).toMatch(/^[^.\n]+[^.\s]$/)
      }
      for (const pack of Object.keys(def.packs)) expect(cards.some((c) => c.deck === pack), `${def.id}:${pack}`).toBe(true)
    }
  })
  it('draws every aspect and writes whole sentences, whatever is left out', () => {
    for (const def of tools) for (let n = 0; n < 150; n++) {
      const item = E.blank(def, 'x')
      item.name = n % 3 ? def.name([]) : ''
      const packs = [[], ['fantasy'], ['-core', 'scifi', 'horror']][n % 3]
      item.sections.forEach((_, i) => E.fill(def, item, i, packs))
      // Knock out a few at random: the text must still read.
      for (const section of item.sections) for (const a of def.aspects) if (Math.random() < 0.25) delete section.slots[a.id]
      const out = E.text(def, item)
      for (const para of out) expect(para, para).toMatch(/^[A-Z].*\.$/)
      expect(out.join(' ')).not.toMatch(/undefined|  |\.\.| ,| \.|\. [a-z]/)
      const all = item.sections.flatMap((x) => Object.values(x.slots).flatMap((h) => (h ? [h.card] : [])))
      if (!packs.length) expect(new Set(all).size).toBe(all.length)
    }
  })
  it('keeps to the ticked decks, and keeps what is locked', () => {
    for (let n = 0; n < 60; n++) {
      expect(E.draw(T.RACES, 'origin', ['-core', 'horror'])!.card).toMatch(/^horror:/)
      expect(E.draw(T.RACES, 'origin', ['fantasy', '-fantasy:origin'])!.card).toMatch(/^core:/)
      expect(E.draw(T.CULTURES, 'taboo', ['-core', 'horror'])!.card).toMatch(/^core:/)
      expect(E.draw(T.RACES, 'home', ['-core', 'animal'])!.card).toMatch(/^animal:/)
    }
    const item = E.blank(T.HISTORY, 'x')
    expect(item.sections).toHaveLength(3)
    E.fill(T.HISTORY, item, 0, [])
    const kept = { ...item.sections[0].slots.name!, locked: true }
    item.sections[0].slots.name = kept
    for (let n = 0; n < 10; n++) E.fill(T.HISTORY, item, 0, [])
    expect(item.sections[0].slots.name).toEqual(kept)
  })
  it('reads as intended for a known draw', () => {
    const first = (def: typeof T.RACES, name: string) => {
      const item = E.blank(def, 'x'); item.name = name
      item.sections.forEach((_, i) => E.fill(def, item, i, [], () => 0.5))
      return E.text(def, item)
    }
    const races = first(T.RACES, 'The Velmar')
    expect(races).toHaveLength(1)
    expect(races[0]).toMatch(/^The Velmar are .+, known by .+\. They say they .+\. They are most at home .+\. They have a gift for .+, but they .+\. They live .+\. Other peoples .+\.$/)
    expect(first(T.CULTURES, 'the Lorel folk')[0]).toMatch(/^The Lorel folk prize .+ above all\. They are governed by .+\. Households are .+\. They hold that .+\. By custom, .+\. It is forbidden to .+\. They are known for .+, and dress in .+\. What divides them now is .+\.$/)
    const history = first(T.HISTORY, 'The Chronicle of Lorel')
    expect(history[0]).toBe('The Chronicle of Lorel is told in three ages.')
    expect(history).toHaveLength(4)
    for (const age of history.slice(1)) expect(age).toMatch(/^The Age of .+ began when .+\. In those years .+ held sway\. Under them .+, but .+\. It ended when .+\. What remains of it is .+\.$/)
  })
})

describe('pictures for every element', async () => {
  const G = await import('./setting')
  const B = await import('./settingBuild')
  const P = await import('./imagePrompts')
  it('offers a picture for sites, settlements and dangerous places as well as the rest', () => {
    const s = G.generateSetting({ ...G.DEFAULT_ANSWERS, size: 'region' }, 'every-picture')
    const ids = P.imageIds(s)
    const sites = G.rootsOf(s).flatMap((r) => G.placeView(s, r).sites.map((x) => x.id))
    expect(sites.length).toBeGreaterThan(0)
    for (const id of [...sites, ...s.built!.map((b) => b.id), ...s.entities.map((e) => e.id), ...s.people.map((c) => c.id), ...G.rootsOf(s), 'world']) expect(ids).toContain(id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) {
      const spec = P.imageSpec(s, id)
      expect(spec.prompt, id).toMatch(/^[A-Z].*No text or lettering\.$/)
      expect(spec.prompt, id).not.toMatch(/undefined|NaN|\.\. |  /)
      // Invented names stay out of prompts, since the picture model would try to write them.
      expect(spec.prompt, id).not.toContain(s.names[id])
    }
    const site = P.imageSpec(s, sites[0]).prompt
    expect(site).toContain('seen from close by')
    const town = s.built!.find((b) => b.tool === 'settlement')!
    expect(P.imageSpec(s, town.id).prompt).toContain(`A wide view of a${/^[aeiou]/.test(G.builtKind(town)) ? 'n' : ''} ${G.builtKind(town)}`)
    expect(P.imageSpec(s, s.built!.find((b) => b.tool === 'peril')!.id).prompt).toContain('a dangerous place')
    const hand = B.newManual(['scifi'], ['frost']); const root = B.addPlace(hand)!
    expect(P.imageSpec(hand, B.addBuilt(hand, 'peril', root)).prompt).toMatch(/dangerous place/)
  })
  it('makes a prompt from any written description', () => {
    const spec = P.loosePrompt('A portrait of one member of a people. They are tall.', 'tall', 'races:x')
    expect([spec.w, spec.h]).toEqual([768, 1344])
    expect(spec.prompt).toMatch(/^A portrait of one member of a people\. They are tall\. .+ No text or lettering\.$/)
    expect(P.loosePrompt('x', 'tall', 'races:x').seed).toBe(spec.seed)
    expect(P.loosePrompt('x', 'wide', 'races:y').seed).not.toBe(spec.seed)
  })
})

describe('how a race looks', async () => {
  const E = await import('./cardTool')
  const T = await import('./cardTools')
  it('has skin, hair, eyes and features, written into the description', () => {
    expect(T.RACES.aspects.map((a) => a.id).slice(0, 6)).toEqual(['form', 'mark', 'skin', 'hair', 'eyes', 'features'])
    const item = E.blank(T.RACES, 'x'); item.name = 'The Velmar'
    E.fill(T.RACES, item, 0, [], () => 0)
    item.sections[0].slots.features = { card: 'core:features:0', active: 0 }
    const text = E.text(T.RACES, item)[0]
    expect(text).toContain('Their skin is weathered brown, like old leather; their hair is black and coarse, worn long; and their eyes are pale grey. They have high cheekbones and narrow chins. They say they')
    delete item.sections[0].slots.hair; delete item.sections[0].slots.features
    expect(E.text(T.RACES, item)[0]).toContain('Their skin is weathered brown, like old leather; and their eyes are pale grey. They say they')
    delete item.sections[0].slots.skin
    expect(E.text(T.RACES, item)[0]).toContain('Their eyes are pale grey. They say they')
    item.sections[0].slots.hair = { card: 'core:hair:0', active: 1 }
    expect(E.text(T.RACES, item)[0]).toContain('Their hair is white from birth and their eyes are pale grey.')
  })
})

describe('races, cultures and history in a setting', async () => {
  const G = await import('./setting')
  const B = await import('./settingBuild')
  const P = await import('./imagePrompts')
  it('generates them with the setting: races, a culture for some places, and a history in ages', () => {
    for (const [size, races, cultures, ages] of [['region', 2, 2, 3], ['country', 2, 3, 4], ['continent', 3, 5, 5]] as const) {
      const s = G.generateSetting({ ...G.DEFAULT_ANSWERS, size }, `drawn-${size}`)
      const of = (tool: string) => s.drawn!.filter((d) => d.tool === tool)
      expect([of('race').length, of('culture').length, of('history').length]).toEqual([races, cultures, 1])
      expect(of('history')[0].sections).toHaveLength(ages)
      expect(new Set(of('culture').map((d) => d.home)).size).toBe(cultures)
      for (const d of s.drawn!) {
        expect(s.names[d.id], d.id).toBeTruthy()
        const text = G.drawnText(s, d)
        expect(text.length).toBeGreaterThanOrEqual(1)
        for (const para of text) expect(para).toMatch(/^[A-Z].*\.$/)
        expect(text.join(' ')).not.toMatch(/undefined|  |\.\./)
        expect(P.imageSpec(s, d.id).prompt).not.toContain(s.names[d.id])
        expect(P.imageIds(s)).toContain(d.id)
      }
      const culture = of('culture')[0]
      expect(G.rootsOf(s)).toContain(culture.home)
      expect(G.drawnText(s, culture)[0]).toContain(`It is the way of life in ${s.names[culture.home!]}.`)
      expect(G.drawnText(s, culture)[0]).toContain(`Most who keep it are ${s.names[culture.race!].replace(/^the /, '')}.`)
      expect(G.placeView(s, culture.home!).land.cultures.map((d) => d.id)).toContain(culture.id)
      expect(s.names[of('race')[0].id]).toMatch(/^the /)
      expect(s.names[culture.id]).toMatch(/^the .+ folk$/)
      expect(s.names[of('history')[0].id]).toMatch(/^the Chronicle of /)
      expect(G.rename(s, culture.id)).toMatch(/^the .+ folk$/)
      const md = G.settingMarkdown(s)
      for (const d of s.drawn!) expect(md).toContain(G.drawnText(s, d)[0])
      expect(G.generateSetting({ ...G.DEFAULT_ANSWERS, size }, `drawn-${size}`).drawn).toEqual(s.drawn)
    }
  })
  it('adds, edits and removes them by hand', () => {
    const s = B.newManual(['fantasy'], ['temperate'])
    const place = B.addPlace(s)!
    const race = B.addDrawn(s, 'race')!
    const culture = B.addDrawn(s, 'culture', G.placeView(s, place).sites[0].id)!
    const history = B.addDrawn(s, 'history')!
    expect(B.addDrawn(s, 'history')).toBe(history)
    const get = (id: string) => s.drawn!.find((d) => d.id === id)!
    expect([get(culture).home, get(culture).race]).toEqual([place, race])
    // pick, lock, redraw, clear
    B.drawnEdit(s, race, 0, 'skin', 2)
    expect(get(race).sections[0].slots.skin!.active).toBe(2)
    B.drawnEdit(s, race, 0, 'skin', 'lock')
    const kept = { ...get(race).sections[0].slots.skin! }
    for (let i = 0; i < 8; i++) B.drawnFill(s, race)
    expect(get(race).sections[0].slots.skin).toEqual(kept)
    const before = get(race).sections[0].slots.origin!.card
    B.drawnEdit(s, race, 0, 'origin', 'draw')
    expect(get(race).sections[0].slots.origin!.card).not.toBe(before)
    B.drawnEdit(s, race, 0, 'life', 'draw'); B.drawnEdit(s, race, 0, 'life', 'clear')
    expect(get(race).sections[0].slots.life).toBeUndefined()
    // ages
    B.addAge(s, history); expect(get(history).sections).toHaveLength(4)
    B.removeAge(s, history, 0); expect(get(history).sections).toHaveLength(3)
    B.addAge(s, race); expect(get(race).sections).toHaveLength(1)
    // removing a race frees the cultures it kept; removing a place takes its culture
    B.setRace(s, culture, undefined); B.setRace(s, culture, race)
    B.remove(s, race)
    expect(get(culture).race).toBeUndefined()
    expect(G.drawnText(s, get(culture))[0]).not.toContain('Most who keep it')
    expect(B.goneWith(s, place)).toContain(culture)
    B.remove(s, place)
    expect(s.drawn!.map((d) => d.id)).toEqual([history])
    expect(G.settingMarkdown(s)).not.toMatch(/undefined|NaN/)
  })
})

describe('everything tied to races, cultures and history', async () => {
  const G = await import('./setting')
  const B = await import('./settingBuild')
  const P = await import('./imagePrompts')
  it('gives every person a race and a culture, and what has a past its age', () => {
    for (const size of ['region', 'country', 'continent'] as const) for (let n = 0; n < 6; n++) {
      const s = G.generateSetting({ ...G.DEFAULT_ANSWERS, size, focus: ['power', 'faith'] }, `ties-${size}-${n}`)
      const ids = (tool: string) => s.drawn!.filter((d) => d.tool === tool).map((d) => d.id)
      const ages = G.ageNames(s)
      expect(ages).toHaveLength(s.drawn!.find((d) => d.tool === 'history')!.sections.length)
      for (const a of ages) expect(a).toMatch(/^the (Age of .+|\w+ age)$/)
      for (const c of s.people) {
        expect(ids('race')).toContain(c.race)
        expect(ids('culture')).toContain(c.culture)
        const text = G.charText(s, c)[0]
        expect(text).toContain(`They are one of ${s.names[c.race!]}, raised among ${s.names[c.culture!]}.`)
        expect(G.tiesTo(s, c.id)).toEqual(expect.arrayContaining([c.race, c.culture]))
        expect(G.tiesTo(s, c.race!)).toContain(c.id)
        // Someone who lives where a culture is kept was raised in it.
        const local = s.drawn!.filter((d) => d.tool === 'culture' && d.home === G.homeRoot(s, c.home)).map((d) => d.id)
        if (local.length) expect(local).toContain(c.culture)
      }
      for (const e of s.entities) {
        if (G.DATED.includes(e.kind)) {
          expect(e.age).toBeLessThan(ages.length)
          expect(G.entityText(s, e)[0]).toContain(ages[e.age!])
        } else expect(e.age).toBeUndefined()
        if (e.kind === 'faction') expect(G.entityText(s, e)[0]).toMatch(new RegExp(`It was founded in ${ages[e.age!]}, among ${s.names[e.culture!]}\\.`))
      }
      const history = ids('history')[0]
      expect(G.tiesTo(s, history).length).toBe(s.entities.filter((e) => e.age !== undefined).length)
      const md = G.settingMarkdown(s)
      expect(md).not.toMatch(/undefined|NaN|  /)
      // A settlement in a place with a culture says whose it is.
      const town = s.built!.find((b) => b.tool === 'settlement' && s.drawn!.some((d) => d.tool === 'culture' && d.home === G.homeRoot(s, b.home)))
      if (town) expect(G.builtText(s, town)[1]).toMatch(/Most of them are of the .+ folk\.$/)
      // A portrait is told how the person's race looks, without naming it.
      const who = s.people[0]
      const prompt = P.imageSpec(s, who.id).prompt
      expect(prompt).toContain(G.raceLooks(s, who.race))
      expect(G.raceLooks(s, who.race)).toMatch(/^Their people are .+\. They have skin .+; hair .+; eyes .+\./)
      expect(prompt).not.toContain(s.names[who.race!])
    }
  })
  it('ties things as they are added by hand, lets the ties be changed, and clears them when their end is removed', () => {
    const s = B.newManual(['fantasy'], ['temperate'])
    const place = B.addPlace(s)!
    const early = B.addPerson(s, place)
    const person = () => s.people.find((c) => c.id === early)!
    expect([person().race, person().culture]).toEqual([undefined, undefined])
    expect(G.charText(s, person())[0]).not.toMatch(/one of|raised among/)
    const race = B.addDrawn(s, 'race')!
    expect(person().race).toBe(race)
    const culture = B.addDrawn(s, 'culture', place)!
    const history = B.addDrawn(s, 'history')!
    expect(person().culture).toBe(culture)
    const guild = B.addPower(s, 'faction', place), relic = B.addPower(s, 'object', place), beast = B.addPower(s, 'creature', place)
    const of = (id: string) => s.entities.find((e) => e.id === id)!
    expect(of(guild).culture).toBe(culture)
    expect(of(guild).age).toBeLessThan(3)
    expect(of(relic).age).toBeLessThan(3)
    expect([of(beast).age, of(beast).culture]).toEqual([undefined, undefined])
    const late = B.addPerson(s, place)
    expect(s.people.find((c) => c.id === late)!.culture).toBe(culture)

    B.setTie(s, guild, 'age', '2'); B.setTie(s, relic, 'age', '0')
    expect(G.entityText(s, of(guild))[0]).toContain(`It was founded in ${G.ageNames(s)[2]}, among ${s.names[culture]}.`)
    B.removeAge(s, history, 0)
    expect([of(guild).age, of(relic).age]).toEqual([1, undefined])
    B.setTie(s, early, 'race', '')
    expect(G.charText(s, person())[0]).toContain(`They were raised among ${s.names[culture]}.`)
    B.setTie(s, early, 'race', race)
    B.remove(s, culture)
    expect([person().culture, of(guild).culture]).toEqual([undefined, undefined])
    expect(G.charText(s, person())[0]).toContain(`They are one of ${s.names[race]}.`)
    B.remove(s, race); B.remove(s, history)
    expect([person().race, of(guild).age]).toEqual([undefined, undefined])
    expect(G.settingMarkdown(s)).not.toMatch(/undefined|NaN|They are one of|raised among|It was founded (in|among) /)
  })
})

describe('ages are names, not offers', async () => {
  const G = await import('./setting')
  const B = await import('./settingBuild')
  it('does not mark a word inside the name of an age', () => {
    const s = G.generateSetting(G.DEFAULT_ANSWERS, 'age-names')
    for (const age of G.ageNames(s)) expect(B.findMentions(s, `It was founded in ${age}.`)).toEqual([`It was founded in ${age}.`])
  })
})

describe('the genre and animal decks for races', async () => {
  const E = await import('./cardTool')
  const T = await import('./cardTools')
  const G = await import('./setting')
  const B = await import('./settingBuild')
  it('covers every aspect in each optional deck', () => {
    const cards = E.cardsOf(T.RACES)
    expect(Object.keys(T.RACES.packs)).toEqual(['fantasy', 'scifi', 'horror', 'animal'])
    for (const deck of Object.keys(T.RACES.packs)) for (const a of T.RACES.aspects) {
      const n = cards.filter((c) => c.deck === deck && c.aspect === a.id).length
      expect(n, `${deck}:${a.id}`).toBeGreaterThanOrEqual(1)
      if (['form', 'mark', 'origin', 'home'].includes(a.id)) expect(n, `${deck}:${a.id}`).toBeGreaterThanOrEqual(2)
    }
  })
  it('writes a whole race from one optional deck alone', () => {
    for (const deck of Object.keys(T.RACES.packs)) for (let n = 0; n < 40; n++) {
      const item = E.blank(T.RACES, 'x'); item.name = 'The Velmar'
      E.fill(T.RACES, item, 0, ['-core', deck])
      for (const held of Object.values(item.sections[0].slots)) expect(held!.card.startsWith(`${deck}:`), held!.card).toBe(true)
      const text = E.text(T.RACES, item)[0]
      expect(text).toMatch(/^The Velmar are .+\.$/)
      expect(text).not.toMatch(/undefined|  |\.\.| ,/)
    }
  })
  it('lets a setting switch the animal deck on for its races', () => {
    const s = B.newManual(['fantasy'], ['temperate'])
    expect(G.drawnPacks(s)).toEqual(['fantasy'])
    B.toggleDeck(s, 'animal')
    expect(G.drawnPacks(s)).toEqual(['fantasy', 'animal'])
    B.toggleDeck(s, 'story', 'core'); B.toggleDeck(s, 'story', 'fantasy')
    expect(G.drawnPacks(s)).toEqual(['animal', '-core'])
    B.addDrawn(s, 'race')
    expect(s.drawn).toHaveLength(1)
    for (const d of s.drawn!) for (const held of Object.values(d.sections[0].slots)) expect(held!.card).toMatch(/^animal:/)
    B.toggleDeck(s, 'animal')
    expect(G.drawnPacks(s)).toEqual(['-core'])
  })
})

describe('the optional decks for history', async () => {
  const E = await import('./cardTool')
  const T = await import('./cardTools')
  it('covers every aspect of an age in each optional deck, and can tell a whole history alone', () => {
    const cards = E.cardsOf(T.HISTORY)
    expect(Object.keys(T.HISTORY.packs)).toEqual(['fantasy', 'scifi', 'horror', 'animal'])
    for (const deck of Object.keys(T.HISTORY.packs)) {
      for (const a of T.HISTORY.aspects) expect(cards.filter((c) => c.deck === deck && c.aspect === a.id).length, `${deck}:${a.id}`).toBeGreaterThanOrEqual(2)
      for (let n = 0; n < 30; n++) {
        const item = E.blank(T.HISTORY, 'x'); item.name = 'The Chronicle of Lorel'
        item.sections = [{ slots: {} }, { slots: {} }]
        item.sections.forEach((_, i) => E.fill(T.HISTORY, item, i, ['-core', deck]))
        for (const section of item.sections) for (const held of Object.values(section.slots)) expect(held!.card.startsWith(`${deck}:`), held!.card).toBe(true)
        const text = E.text(T.HISTORY, item)
        expect(text).toHaveLength(3)
        for (const age of text.slice(1)) expect(age).toMatch(/^The Age of .+ began when .+\. In those years .+ held sway\. Under them .+, but .+\. It ended when .+\. What remains of it is .+\.$/)
        // Two ages of one history never share a draw.
        const all = item.sections.flatMap((x) => Object.values(x.slots).map((h) => h!.card))
        expect(new Set(all).size).toBe(all.length)
      }
    }
  })
})

describe('emblems', async () => {
  const E = await import('./emblem')
  const G = await import('./setting')
  const B = await import('./settingBuild')
  it('has a large and well-formed library of parts', () => {
    expect(E.SHAPES.length).toBeGreaterThanOrEqual(10)
    expect(E.PATTERNS.length).toBeGreaterThanOrEqual(24)
    expect(E.BORDERS.length).toBeGreaterThanOrEqual(8)
    expect(E.ICONS.length).toBeGreaterThanOrEqual(50)
    expect(E.COLOURS.length).toBeGreaterThanOrEqual(18)
    for (const list of [E.SHAPES.map((x) => x[0]), E.PATTERNS, E.BORDERS, E.ICONS.map((x) => x[0]), E.COLOURS.map((x) => x[0])]) expect(new Set(list).size).toBe(list.length)
    for (const [, d] of [...E.SHAPES, ...E.ICONS.map((x) => [x[0], x[1]] as [string, string])]) expect(d).toMatch(/^M[-\d. a-zA-Z]+$/)
    for (const [, hex] of E.COLOURS) expect(hex).toMatch(/^#[0-9a-f]{6}$/)
    expect(E.emblemCount()).toBeGreaterThan(1e9)
  })
  it('makes the same emblem from the same seed, varied ones from different seeds, and always a legible one', () => {
    expect(E.emblemFrom('a')).toEqual(E.emblemFrom('a'))
    const made = Array.from({ length: 600 }, (_, i) => E.emblemFrom(`seed-${i}`))
    expect(new Set(made.map((m) => JSON.stringify(m))).size).toBeGreaterThan(590)
    for (const key of ['shape', 'pattern', 'border', 'icon', 'layout'] as const) expect(new Set(made.map((m) => m[key])).size).toBe({ shape: E.SHAPES, pattern: E.PATTERNS, border: E.BORDERS, icon: E.ICONS, layout: E.LAYOUTS }[key].length)
    for (const m of made) {
      expect(E.tidy(m)).toEqual(m)
      expect(m.a).toBeLessThan(E.DEEP)
      // The icon is never the colour of what lies behind it.
      expect(m.c).not.toBe(m.a); expect(m.c).not.toBe(m.b); expect(m.b).not.toBe(m.a)
      expect(E.emblemWords(m)).toMatch(/^an? \w+ [\w ,]+, bearing an? [\w ]+( twice| three times)?$/)
    }
    expect(E.tidy({ shape: 99, icon: -1 })).toEqual({ shape: 0, pattern: 0, border: 0, a: 0, b: 0, c: 0, icon: 0, layout: 0 })
    expect(E.emblemWords({ shape: 0, pattern: 5, border: 0, a: 0, b: 12, c: 13, icon: 12, layout: 0 })).toBe('a crimson shield, quartered with gold, bearing a silver tower')
    expect(E.emblemWords({ shape: 5, pattern: 0, border: 0, a: 1, b: 12, c: 5, icon: 16, layout: 1 })).toBe('an azure oval, bearing an orange anchor three times')
  })
  it('gives every land, race and culture of a setting an emblem, and says who may wear them', () => {
    const s = G.generateSetting({ ...G.DEFAULT_ANSWERS, lands: ['temperate', 'coast'] }, 'emblems')
    const bearers = [...G.rootsOf(s), ...s.drawn!.filter((d) => d.tool !== 'history').map((d) => d.id)]
    for (const id of bearers) {
      expect(B.emblemOf(s, id)).toEqual(B.emblemOf(s, id))
      expect(B.emblemOf(s, id)).toBeTruthy()
    }
    expect(new Set(bearers.map((id) => JSON.stringify(B.emblemOf(s, id)))).size).toBe(bearers.length)
    const history = s.drawn!.find((d) => d.tool === 'history')!
    for (const id of [history.id, s.people[0].id, s.entities[0].id, 'nothing']) expect(B.emblemOf(s, id)).toBeUndefined()
    for (const c of s.people) expect(B.belongsTo(s, c.id)).toEqual([...new Set([G.homeRoot(s, c.home), c.race!, c.culture!])])
    const faction = s.entities.find((e) => e.kind === 'faction')!
    expect(B.belongsTo(s, faction.id)).toEqual([G.homeRoot(s, faction.home!), faction.culture!])
    const culture = s.drawn!.find((d) => d.tool === 'culture')!
    expect(B.belongsTo(s, culture.id)).toEqual([culture.home!, culture.race!])
    const site = G.placeView(s, G.rootsOf(s)[0]).sites[0]
    expect(B.belongsTo(s, site.id)).toEqual([G.rootsOf(s)[0]])
    expect(B.belongsTo(s, G.rootsOf(s)[0])).toEqual([])
    // Change one by hand: it is kept, and goes when its bearer goes.
    const land = G.rootsOf(s)[0]
    const mine = { shape: 3, pattern: 5, border: 2, a: 1, b: 13, c: 12, icon: 4, layout: 1 }
    B.setEmblem(s, land, mine)
    expect(B.emblemOf(s, land)).toEqual(mine)
    B.rerollEmblem(s, land)
    expect(B.emblemOf(s, land)).not.toEqual(mine)
    B.setEmblem(s, s.people[0].id, mine)
    expect(s.emblems![s.people[0].id]).toBeUndefined()
    B.remove(s, land)
    expect(s.emblems![land]).toBeUndefined()
  })
})

describe('how common each kind of settlement is in a world', async () => {
  const G = await import('./setting')
  const B = await import('./settingBuild')
  const T = await import('./settlement')
  const M = await import('./mapgen')
  it('rolls kinds by rarity and never a second capital', () => {
    expect(Object.keys(T.RARITY).sort()).toEqual(Object.keys(T.TYPES).sort())
    expect(Object.values(T.RARITY).reduce((a, b) => a + b, 0)).toBe(100)
    const keys = Object.keys(T.TYPES)
    const tally: Record<string, number> = {}
    for (let n = 0; n < 6000; n++) { const k = keys[T.rollType(Math.random, false)]; tally[k] = (tally[k] ?? 0) + 1 }
    expect(tally.village).toBeGreaterThan(tally.town)
    expect(tally.town).toBeGreaterThan(tally.post)
    expect(tally.post).toBeGreaterThan(tally.city)
    expect(tally.city).toBeGreaterThan(tally.capital)
    expect(tally.capital).toBeGreaterThan(100)
    for (let n = 0; n < 2000; n++) expect(keys[T.rollType(Math.random, true)]).not.toBe('capital')
  })
  it('keeps a generated or hand-built world to one capital, however it is rolled', () => {
    const capitals = (s: import('./setting').Setting) => s.built!.filter((b) => G.builtKind(b) === 'capital').length
    let withCapital = 0, kinds = new Set<string>()
    for (let n = 0; n < 60; n++) {
      const s = G.generateSetting({ ...G.DEFAULT_ANSWERS, size: 'continent', focus: ['everyday'] }, `rare-${n}`)
      expect(capitals(s)).toBeLessThanOrEqual(1)
      withCapital += capitals(s)
      for (const b of s.built!) if (b.tool === 'settlement') kinds.add(G.builtKind(b))
    }
    expect(withCapital).toBeGreaterThan(3)
    expect(withCapital).toBeLessThan(40)
    expect(kinds.size).toBe(6)

    const s = B.newManual(['fantasy'], ['temperate'])
    const place = B.addPlace(s)!
    for (let n = 0; n < 120; n++) B.addBuilt(s, 'settlement', place)
    expect(capitals(s)).toBe(1)
    for (const b of s.built!) for (let i = 0; i < 3; i++) { B.builtReroll(s, b.id); B.builtEdit(s, b.id, 'type', 'roll') }
    expect(capitals(s)).toBeLessThanOrEqual(1)
    // Asking for one outright is still the builder's choice.
    const village = s.built!.find((b) => G.builtKind(b) === 'village')!
    B.builtEdit(s, village.id, 'type', Object.keys(T.TYPES).indexOf('capital'))
    expect(G.builtKind(village)).toBe('capital')
    // The map knows each settlement's rank, to draw it by.
    const marks = M.buildMap(s).regions.flatMap((r) => r.sites).filter((m) => m.kind === 'settlement')
    expect(marks.length).toBe(s.built!.length)
    for (const m of marks) expect(Object.keys(T.TYPES)).toContain(m.rank)
    expect(M.buildMap(s).regions.flatMap((r) => r.sites).filter((m) => m.kind !== 'settlement').every((m) => m.rank === undefined)).toBe(true)
  })
})

describe('water on the map, and no gaps between places', async () => {
  const G = await import('./setting')
  const M = await import('./mapgen')
  const within = (p: [number, number], poly: [number, number][]) => {
    let hit = false
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i], [xj, yj] = poly[j]
      if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) hit = !hit
    }
    return hit
  }
  const coords = (d: string) => [...d.matchAll(/(-?[\d.]+) (-?[\d.]+)/g)].map((m) => [+m[1], +m[2]] as [number, number])

  it('leaves no pocket of sea enclosed between places', () => {
    let pockets = 0, maps = 0
    for (const size of ['region', 'country', 'continent'] as const) for (let n = 0; n < 6; n++) {
      const map = M.buildMap(G.generateSetting({ ...G.DEFAULT_ANSWERS, size }, `gaps-${size}-${n}`))
      maps++
      // Flood the sea in from the edge of the sheet over a coarse grid; any water it cannot reach is a pocket.
      const step = 5, cols = Math.ceil(map.w / step), rows = Math.ceil(map.h / step)
      const land = new Uint8Array(cols * rows)
      for (const r of map.regions) {
        const xs = r.points.map((p) => p[0]), ys = r.points.map((p) => p[1])
        for (let y = Math.max(0, Math.floor(Math.min(...ys) / step)); y <= Math.min(rows - 1, Math.ceil(Math.max(...ys) / step)); y++)
          for (let x = Math.max(0, Math.floor(Math.min(...xs) / step)); x <= Math.min(cols - 1, Math.ceil(Math.max(...xs) / step)); x++)
            if (!land[y * cols + x] && within([x * step + step / 2, y * step + step / 2], r.points)) land[y * cols + x] = 1
      }
      const seen = new Uint8Array(cols * rows), queue = [0]
      seen[0] = 1
      while (queue.length) {
        const at = queue.pop()!, x = at % cols, y = (at - x) / cols
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy, k = ny * cols + nx
          if (nx >= 0 && ny >= 0 && nx < cols && ny < rows && !seen[k] && !land[k]) { seen[k] = 1; queue.push(k) }
        }
      }
      // A pocket is a patch of unreached water at least three cells across; a hairline along a border is only the grid.
      for (let y = 1; y < rows - 1; y++) for (let x = 1; x < cols - 1; x++) {
        let open = true
        for (let dy = -1; dy <= 1 && open; dy++) for (let dx = -1; dx <= 1; dx++) { const k = (y + dy) * cols + x + dx; if (land[k] || seen[k]) { open = false; break } }
        if (open) { pockets++; y = rows; break }
      }
    }
    expect(maps).toBe(18)
    expect(pockets).toBe(0)
    // Closing the gaps must not make the sheet sprawl.
    for (const size of ['region', 'country', 'continent'] as const) {
      const map = M.buildMap(G.generateSetting({ ...G.DEFAULT_ANSWERS, size }, `sheet-${size}`))
      expect(Math.max(map.w, map.h)).toBeLessThan({ region: 1500, country: 2100, continent: 2500 }[size])
    }
  }, 30000)

  it('puts lakes inside their places and runs rivers over land to the sea or a lake', () => {
    let lakes = 0, rivers = 0
    for (let n = 0; n < 12; n++) {
      const s = G.generateSetting({ ...G.DEFAULT_ANSWERS, size: 'continent', lands: ['temperate', 'coast'] }, `water-${n}`)
      const map = M.buildMap(s)
      expect(M.buildMap(s)).toEqual(map)
      lakes += map.lakes.length; rivers += map.rivers.length
      for (const lake of map.lakes) {
        const pts = coords(lake.d)
        expect(pts.length).toBeGreaterThan(12)
        const home = map.regions.filter((r) => pts.every((p) => within(p, r.points)))
        expect(home, 'a lake lies wholly inside one place').toHaveLength(1)
        // Clear of the place's name and of everything marked in it.
        const [cx, cy] = [pts.reduce((a, p) => a + p[0], 0) / pts.length, pts.reduce((a, p) => a + p[1], 0) / pts.length]
        expect(Math.abs(cx - home[0].x) < 60 && Math.abs(cy - home[0].y) < 14).toBe(false)
        for (const m of home[0].sites) expect(Math.hypot(m.x - cx, m.y - cy)).toBeGreaterThan(18)
      }
      for (const river of map.rivers) {
        const pts = coords(river.d)
        expect(pts.length).toBeGreaterThanOrEqual(5)
        // All but the last step, which runs out into the sea, is on land.
        const onLand = pts.slice(0, -2).filter((p) => map.regions.some((r) => within(p, r.points))).length
        expect(onLand).toBeGreaterThanOrEqual(pts.length - 3)
        for (const p of pts) expect(p[0] > 0 && p[1] > 0 && p[0] < map.w && p[1] < map.h).toBe(true)
      }
      for (const r of map.regions) for (const sym of r.symbols) for (const river of map.rivers) for (const p of coords(river.d)) expect(Math.hypot(p[0] - sym.x, p[1] - sym.y)).toBeGreaterThanOrEqual(8.5)
    }
    expect(lakes).toBeGreaterThan(20)
    expect(rivers).toBeGreaterThan(20)
  }, 30000)
})

describe('bordering worlds and named water', async () => {
  const G = await import('./setting')
  const B = await import('./settingBuild')
  const M = await import('./mapgen')
  const within = (p: [number, number], poly: [number, number][]) => {
    let hit = false
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i], [xj, yj] = poly[j]
      if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) hit = !hit
    }
    return hit
  }
  const coords = (d: string) => [...d.matchAll(/(-?[\d.]+) (-?[\d.]+)/g)].map((m) => [+m[1], +m[2]] as [number, number])

  it('gives a generated setting one to three neighbours, one a side, and a named sea on every other side', () => {
    const counts = new Set<number>()
    for (const size of ['region', 'country', 'continent'] as const) for (let n = 0; n < 8; n++) {
      const s = G.generateSetting({ ...G.DEFAULT_ANSWERS, size }, `beyond-${size}-${n}`)
      const worlds = G.beyondOf(s), seas = G.seasOf(s)
      counts.add(worlds.length)
      expect(worlds.length).toBeGreaterThanOrEqual(1)
      expect(worlds.length).toBeLessThanOrEqual(3)
      expect([...worlds.map((b) => b.side), ...seas.map((x) => x.side)].sort()).toEqual([...G.SIDES].sort())
      for (const x of seas) expect(x.name).toMatch(/^the (\S+ (Ocean|Sea|Deep)|(Sea|Gulf) of \S+)$/)
      expect(G.seasOf(s)).toEqual(seas)
      const opening = G.worldProse(s).text[0]
      for (const b of worlds) expect(opening).toContain(`${s.names[b.id]} to the ${b.side}`)
      for (const x of seas) expect(opening).toContain(`${x.name} to the ${x.side}`)
      expect(opening).toMatch(/It is joined by land to .+\. Its other shores face .+\.$/)
      expect(G.generateSetting({ ...G.DEFAULT_ANSWERS, size }, `beyond-${size}-${n}`).beyond).toEqual(s.beyond)
    }
    expect(counts.size).toBeGreaterThan(1)
  })

  it('joins each neighbour to the land and runs it off its own edge of the sheet', () => {
    for (let n = 0; n < 10; n++) {
      const s = G.generateSetting({ ...G.DEFAULT_ANSWERS, size: n % 2 ? 'country' : 'region' }, `joined-${n}`)
      const map = M.buildMap(s)
      expect(map.beyond.map((b) => b.id)).toEqual(G.beyondOf(s).map((b) => b.id))
      expect(map.seas.map((x) => x.name)).toEqual(G.seasOf(s).map((x) => x.name))
      const ours = map.regions.flatMap((r) => r.points)
      for (const b of map.beyond) {
        const side = G.beyondOf(s).find((x) => x.id === b.id)!.side
        const land = coords(b.d)
        // It reaches past its own edge of the sheet …
        const past = { north: land.some((p) => p[1] < 0), south: land.some((p) => p[1] > map.h), west: land.some((p) => p[0] < 0), east: land.some((p) => p[0] > map.w) }
        expect(past[side], `${side} runs off the sheet`).toBe(true)
        // … and runs in under this world's land, so the two are joined with no sea between.
        expect(ours.some((q) => within(q as [number, number], land)), `${side} is joined on`).toBe(true)
        // It fills both corners at the ends of its edge.
        const corners: Record<string, [number, number][]> = {
          north: [[6, 6], [map.w - 6, 6]], south: [[6, map.h - 6], [map.w - 6, map.h - 6]], west: [[6, 6], [6, map.h - 6]], east: [[map.w - 6, 6], [map.w - 6, map.h - 6]],
        }
        for (const c of corners[side]) expect(within(c, land), `${side} fills its corners`).toBe(true)
        // Its name sits on its own land, on the sheet, and not on top of this world.
        expect(b.x > 0 && b.y > 0 && b.x < map.w && b.y < map.h).toBe(true)
        expect(within([b.x, b.y], land)).toBe(true)
        expect(map.regions.some((r) => within([b.x, b.y], r.points as [number, number][]))).toBe(false)
        // … and well in from the edge of the sheet, so that it is not cut off.
        expect(Math.min(b.x, b.y, map.w - b.x, map.h - b.y), `${side} name clear of the edge`).toBeGreaterThan(22)
      }
      for (const x of map.seas) expect(x.x > 0 && x.y > 0 && x.x < map.w && x.y < map.h).toBe(true)
    }
  })

  it('names every lake and river, the same way each time', () => {
    let lakes = 0, rivers = 0
    for (let n = 0; n < 8; n++) {
      const s = G.generateSetting({ ...G.DEFAULT_ANSWERS, size: 'continent', lands: ['temperate', 'coast'] }, `named-water-${n}`)
      const map = M.buildMap(s)
      expect(M.buildMap(s)).toEqual(map)
      for (const l of map.lakes) { lakes++; expect(l.name).toMatch(/^(Lake \S+|\S+ (Mere|Water|Tarn))$/); expect(Number.isFinite(l.x) && Number.isFinite(l.y)).toBe(true) }
      for (const r of map.rivers) {
        rivers++
        expect(r.name).toMatch(/^(River \S+|the \S+|\S+ (Run|Water))$/)
        const along = coords(r.along)
        expect(along.length).toBeGreaterThanOrEqual(3)
        // Set to be read from left to right.
        expect(along[0][0]).toBeLessThanOrEqual(along[along.length - 1][0])
      }
    }
    expect(lakes).toBeGreaterThan(10)
    expect(rivers).toBeGreaterThan(10)
  })

  it('adds, renames, moves and removes neighbours by hand, four at most', () => {
    const s = B.newManual(['fantasy'], ['temperate'])
    expect(G.worldProse(s).text[0]).not.toMatch(/joined by land|bounded by/)
    B.addPlace(s)
    expect(G.worldProse(s).text[0]).toMatch(/ It is bounded by the .+ to the north, .+ to the east, .+ to the south and .+ to the west\.$/)
    const ids = Array.from({ length: 5 }, () => B.addBeyond(s))
    expect(ids.slice(0, 4).every(Boolean)).toBe(true)
    expect(ids[4]).toBeUndefined()
    expect(G.beyondOf(s).map((b) => b.side)).toEqual([...G.SIDES])
    expect(G.seasOf(s)).toEqual([])
    expect(M.buildMap(s).beyond).toHaveLength(4)
    const [a, b] = s.beyond!
    const [sideA, sideB] = [a.side, b.side]
    B.moveBeyond(s, a.id, sideB)
    expect([a.side, b.side]).toEqual([sideB, sideA])
    s.names[a.id] = G.rename(s, a.id)
    B.removeBeyond(s, a.id)
    expect(G.beyondOf(s)).toHaveLength(3)
    expect(G.seasOf(s).map((x) => x.side)).toEqual([sideB])
    for (let i = 0; i < 2; i++) B.removeBeyond(s, s.beyond![0].id)
    expect(G.worldProse(s).text[0]).toMatch(/ It is joined by land to the .+ to the \S+\. Its other shores face .+\.$/)
    expect(M.buildMap(s).beyond).toHaveLength(1)
    // A neighbour left over from an earlier version on a corner side is simply not shown.
    s.beyond!.push({ id: 'n9', side: 'north-east' as never }); s.names.n9 = 'the Old Corner'
    expect(G.beyondOf(s)).toHaveLength(1)
    expect(G.settingMarkdown(s)).not.toMatch(/undefined|NaN|Old Corner/)
  })
})

describe('the names of lands', async () => {
  const N = await import('./names')
  const G = await import('./setting')
  const B = await import('./settingBuild')
  const M = await import('./mapgen')
  const old = Math.max(0, N.TONGUES.findIndex((x) => x.id === 'old'))
  it('takes each form when asked, suited to the country', () => {
    const shapes = [/^\S+$/, /^the \w+ of \S+$/, /^\S+ \w+$/, /^the \S+ \w+$/, /^\S+’s \w+$/, /^the Land of \w+$/]
    expect(N.LAND_FORMS).toHaveLength(shapes.length)
    shapes.forEach((shape, form) => {
      for (let n = 0; n < 40; n++) expect(N.makeName({ kind: 'land', tongue: old, base: 'marsh', form }, Math.random, new Set()), `form ${form}`).toMatch(shape)
    })
    const words = (base: string) => new Set(Array.from({ length: 300 }, () => N.makeName({ kind: 'land', tongue: old, base, form: 3 }, Math.random, new Set()).split(' ').pop()))
    expect([...words('old forest')].some((w) => ['Wood', 'Weald', 'Thicket', 'Wilds', 'Boughs'].includes(w!))).toBe(true)
    expect([...words('glacier')].some((w) => ['Ice', 'Frost', 'Snows', 'Floes', 'Cold'].includes(w!))).toBe(true)
    expect([...words('glacier')].some((w) => ['Wood', 'Weald', 'Sands', 'Fen'].includes(w!))).toBe(false)
  })
  it('mixes the forms by chance, keeping star-faring lands to one word', () => {
    const made = Array.from({ length: 800 }, () => N.makeName({ kind: 'land', tongue: old, base: 'plateau' }, Math.random, new Set()))
    const plain = made.filter((m) => !m.includes(' ')).length
    expect(plain).toBeGreaterThan(240); expect(plain).toBeLessThan(440)
    expect(made.some((m) => / of /.test(m))).toBe(true)
    expect(made.some((m) => /’s /.test(m))).toBe(true)
    expect(made.some((m) => /^the Land of /.test(m))).toBe(true)
    const star = N.TONGUES.findIndex((x) => x.id === 'star')
    for (let n = 0; n < 100; n++) expect(N.makeName({ kind: 'land', tongue: star, base: 'crater' }, Math.random, new Set())).not.toMatch(/ of |’s |^the /)
  })
  it('lets what lies in a land borrow the short part of its name', () => {
    expect([N.shortOf('the Vale of Marrow'), N.shortOf('Marrow Reach'), N.shortOf('the Drowned Fields'), N.shortOf('Maren’s Rest'), N.shortOf('the Land of Rooks'), N.shortOf('Marrowick')])
      .toEqual(['Marrow', 'Marrow', 'Drowned', 'Maren', 'Rooks', 'Marrowick'])
    for (let n = 0; n < 200; n++) {
      const site = N.makeName({ kind: 'site', tongue: old, base: 'lighthouse', home: 'the Vale of Marrow' }, Math.random, new Set())
      expect(site).not.toMatch(/^the Lighthouse$|Vale of/)
      expect(N.makeName({ kind: 'faction', tongue: old, base: 'guild', home: 'the Vale of Marrow' }, Math.random, new Set())).not.toContain('of the Vale of')
    }
  })
  it('names the lands of a setting in mixed forms, reads well, and lets a form be chosen', () => {
    let phrases = 0, lands = 0
    for (let n = 0; n < 12; n++) {
      const s = G.generateSetting({ ...G.DEFAULT_ANSWERS, size: 'continent' }, `lands-${n}`)
      for (const r of G.rootsOf(s)) { lands++; if (s.names[r].includes(' ')) phrases++; expect(s.specs[r].kind).toBe('land') }
      expect(G.settingMarkdown(s)).not.toMatch(/undefined|NaN|  /)
      const map = M.buildMap(s)
      expect(map.regions.map((r) => r.name).sort()).toEqual(G.rootsOf(s).map((r) => s.names[r]).sort())
    }
    expect(phrases / lands).toBeGreaterThan(0.3)
    expect(phrases / lands).toBeLessThan(0.8)
    const s = B.newManual(['fantasy'], ['temperate'])
    const place = B.addPlace(s)!
    expect(B.nameForm(s, place)).toBe(-1)
    B.setNameForm(s, place, 1)
    expect(s.names[place]).toMatch(/^the \w+ of \S+$/)
    for (let i = 0; i < 10; i++) { s.names[place] = G.rename(s, place); expect(s.names[place]).toMatch(/^the \w+ of \S+$/) }
    B.setNameForm(s, place, 4)
    expect(s.names[place]).toMatch(/’s /)
    B.setNameForm(s, place, -1)
    expect(B.nameForm(s, place)).toBe(-1)
    const site = G.placeView(s, place).sites[0].id
    B.setNameForm(s, site, 1)
    expect(s.specs[site].form).toBeUndefined()
  })
})

describe('uneven seas and lakes, and far-running rivers', async () => {
  const G = await import('./setting')
  const M = await import('./mapgen')
  const coords = (d: string) => [...d.matchAll(/(-?[\d.]+) (-?[\d.]+)/g)].map((m) => [+m[1], +m[2]] as [number, number])
  it('varies the width of each sea, the size and shape of lakes, and lets rivers cross several places', () => {
    const margins: number[] = [], lakeSizes: number[] = [], lakeShapes: number[] = [], lengths: number[] = []
    for (let n = 0; n < 14; n++) {
      const s = G.generateSetting({ ...G.DEFAULT_ANSWERS, size: n % 2 ? 'continent' : 'country', lands: ['temperate', 'coast'] }, `uneven-${n}`)
      const map = M.buildMap(s)
      expect(M.buildMap(s)).toEqual(map)
      const land = map.regions.flatMap((r) => r.points)
      const open = G.seasOf(s).map((x) => x.side)
      const gap = { north: Math.min(...land.map((p) => p[1])), south: map.h - Math.max(...land.map((p) => p[1])), west: Math.min(...land.map((p) => p[0])), east: map.w - Math.max(...land.map((p) => p[0])) }
      for (const side of open) { expect(gap[side]).toBeGreaterThan(50); margins.push(gap[side]) }
      for (const l of map.lakes) {
        const pts = coords(l.d), cx = pts.reduce((a, p) => a + p[0], 0) / pts.length, cy = pts.reduce((a, p) => a + p[1], 0) / pts.length
        const radii = pts.map((p) => Math.hypot(p[0] - cx, p[1] - cy))
        lakeSizes.push(Math.max(...radii)); lakeShapes.push(Math.max(...radii) / Math.min(...radii))
      }
      for (const r of map.rivers) {
        const pts = coords(r.d)
        lengths.push(pts.slice(1).reduce((a, p, k) => a + Math.hypot(p[0] - pts[k][0], p[1] - pts[k][1]), 0))
        // However far it runs, it stays off every name and mark.
        for (const p of pts.slice(0, -2)) {
          for (const o of map.regions) expect(Math.abs(p[0] - o.x) < 70 && p[1] > o.y - 50 && p[1] < o.y + 20).toBe(false)
          for (const m of map.regions.flatMap((o) => o.sites)) expect(Math.hypot(m.x - p[0], m.y - p[1])).toBeGreaterThan(10)
        }
      }
    }
    // Seas: some narrow, some broad.
    expect(Math.min(...margins)).toBeLessThan(110)
    expect(Math.max(...margins)).toBeGreaterThan(220)
    // Lakes: ponds and broad waters, and none a neat circle.
    expect(Math.min(...lakeSizes)).toBeLessThan(18)
    expect(Math.max(...lakeSizes)).toBeGreaterThan(38)
    expect(lakeShapes.filter((x) => x > 1.6).length).toBeGreaterThan(lakeShapes.length * 0.5)
    // Rivers: short streams still, and some far longer than the old limit of about 330.
    expect(Math.min(...lengths)).toBeLessThan(150)
    expect(Math.max(...lengths)).toBeGreaterThan(450)
    expect(lengths.filter((x) => x > 330).length).toBeGreaterThan(3)
  }, 30000)
})

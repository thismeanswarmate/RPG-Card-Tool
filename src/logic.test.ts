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
      const site = B.choices(s, 'site')[0]
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
      expect(E.draw(T.RACES, 'home', ['-core', 'horror'])!.card).toMatch(/^core:/)
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

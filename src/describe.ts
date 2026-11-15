import { childrenOf, composeName, cueText, rootOf, subtree, type Board, type Cards } from './logic'
import { isHub, type CardType, type Held, type Link, type Placed } from './types'

// Turns the cards of a microsetting into prose. Each cue carries a sentence that may refer to its
// neighbours through placeholders:
//   {place}          the hub the card sits on: "the Whispering Marsh" in its own sentence, "the marsh" after
//   {terrain}        the Terrain of the microsetting ("the marsh")
//   {site|fallback}  another Site in the microsetting, or the fallback text when there is none
//   {cue} / {sub}    the card's own text, for the generic sentences used by cards with no description

const GENERIC: Record<CardType, string> = {
  terrain: 'Travellers speak of {place} as a land apart.',
  site: 'Somewhere in {terrain}, travellers come upon {place}.',
  epithet: '',
  legacy: 'Of the past of {place}, this much is told: {cue}.',
  trait: 'Of {place} today, people say this: {cue}.',
  omen: 'And now there is news in {place}: {cue}{sub}.',
  question: '', work: '', twist: '', quest: '',
}
const ORDER: CardType[] = ['epithet', 'legacy', 'trait', 'omen']

const lowerFirst = (t: string) => t.charAt(0).toLowerCase() + t.slice(1)
const upperFirst = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)

/** A hub's name as it reads mid-sentence: "the Whispering Marsh", "the Lighthouse". */
export const placeName = (board: Board, cards: Cards, hub: string) =>
  (composeName(board, cards, hub) ?? `The ${cueText(cards, board[hub])}`).replace(/^The /, 'the ')

const fill = (template: string, vars: Record<string, string | undefined>) =>
  upperFirst(template.replace(/\{(\w+)(?:\|([^}]*))?\}/g, (_, key: string, fallback?: string) => vars[key] ?? fallback ?? ''))

function sentence(cards: Cards, id: string, active: number, vars: Record<string, string | undefined>): string {
  const { type, cues } = cards[id]
  const cue = cues[active]
  if (type === 'epithet') return cue.desc ? `They say “${cue.text}” ${cue.desc.replace(/\.$/, '')}.` : ''
  return fill(cue.desc || GENERIC[type], { ...vars, cue: lowerFirst(cue.text), sub: cue.sub ? ` — ${cue.sub}` : '' })
}

/** One paragraph for the root hub and one for each Site under it, then a paragraph of links. */
export function describe(board: Board, cards: Cards, root: string, links: Link[] = [], names: Record<string, string> = {}): string[] {
  if (!board[root] || !isHub(cards[root].type)) return []
  const members = subtree(board, root)
  const hubs = members.filter((id) => isHub(cards[id].type))
  const terrain = cards[root].type === 'terrain' ? `the ${cueText(cards, board[root]).toLowerCase()}` : 'the surrounding country'

  const out = hubs.map((hub) => {
    const other = hubs.find((h) => h !== hub && cards[h].type === 'site')
    // The hub's own sentence gives its full name; the cards under it then use the short form.
    const full = names[hub] ?? placeName(board, cards, hub)
    const vars = {
      place: `the ${cueText(cards, board[hub]).toLowerCase()}`,
      terrain,
      site: other && `the ${cueText(cards, board[other]).toLowerCase()}`,
    }
    const kids = childrenOf(board, hub).filter((k) => ORDER.includes(cards[k.id].type))
    const rank = (k: Placed) => ORDER.indexOf(cards[k.id].type)
    return [
      sentence(cards, hub, board[hub].active, { ...vars, place: full }),
      ...kids.sort((a, b) => rank(a) - rank(b)).map((k) => sentence(cards, k.id, k.active, vars)),
    ].filter(Boolean).join(' ')
  })

  const label = (id: string) => (isHub(cards[id].type) ? placeName(board, cards, id) : `“${cueText(cards, board[id])}”`)
  const threads = links.filter((l) => board[l.a] && board[l.b] && (members.includes(l.a) || members.includes(l.b))).map((l) => {
    const [mine, theirs] = members.includes(l.a) ? [l.a, l.b] : [l.b, l.a]
    const far = rootOf(board, theirs)
    const where = far !== root && far !== theirs && isHub(cards[far].type) ? ` in ${placeName(board, cards, far)}` : ''
    const note = l.note.trim().replace(/\.$/, '')
    return `A thread runs between ${label(mine)} and ${label(theirs)}${where}${note ? `: ${note}` : ''}.`
  })
  return threads.length ? [...out, threads.join(' ')] : out
}

/** The sentence for one card tucked under a place, as it would appear in that place's description. */
export function cardSentence(board: Board, cards: Cards, id: string): string {
  const hub = board[id]?.parent
  if (!hub || !board[hub]) return ''
  const root = rootOf(board, hub)
  const other = subtree(board, root).find((h) => h !== hub && cards[h].type === 'site')
  return sentence(cards, id, board[id].active, {
    place: `the ${cueText(cards, board[hub]).toLowerCase()}`,
    terrain: cards[root].type === 'terrain' ? `the ${cueText(cards, board[root]).toLowerCase()}` : 'the surrounding country',
    site: other && `the ${cueText(cards, board[other]).toLowerCase()}`,
  })
}

/** What holds true everywhere, from the meta row. */
export function describeMeta(cards: Cards, meta: Held[]): string {
  const vars = { place: 'this world', terrain: 'the world', site: undefined }
  const rank = (m: Held) => ORDER.indexOf(cards[m.card].type)
  return meta.filter((m) => ORDER.includes(cards[m.card].type)).sort((a, b) => rank(a) - rank(b)).map((m) => sentence(cards, m.card, m.active, vars)).filter(Boolean).join(' ')
}

const promptFor = (cards: Cards, id: string, active: number, twists: string[] = []): string => {
  const { type, cues } = cards[id]
  const cue = cues[active]
  if (type === 'quest') return `Quest — ${cue.text}: ${[cue.sub, ...(cue.asks ?? [])].filter(Boolean).join(' ')}`
  if (type === 'question') return `Question — ${cue.text}`
  if (type === 'work') return `Lore to write — ${[lowerFirst(cue.text), ...twists].join(', ')}.`
  return ''
}

/** Things left to answer or write for an area, from the Quest, Question, Lore and Twist cards in it. */
export function prompts(board: Board, cards: Cards, root: string): string[] {
  if (!board[root]) return []
  return subtree(board, root).filter((id) => isHub(cards[id].type)).flatMap((hub) => {
    const kids = childrenOf(board, hub)
    const twists = kids.filter((k) => cards[k.id].type === 'twist').map((k) => cueText(cards, k))
    const works = kids.some((k) => cards[k.id].type === 'work')
    return [
      ...kids.map((k) => promptFor(cards, k.id, k.active, twists)),
      ...(works ? [] : twists.map((t) => `Twist — ${t}.`)),
    ].filter(Boolean)
  })
}

/** The same for the meta row, where the prompts apply to the whole world. */
export const metaPrompts = (cards: Cards, meta: Held[]) => {
  const twists = meta.filter((m) => cards[m.card].type === 'twist').map((m) => cards[m.card].cues[m.active].text)
  return meta.map((m) => promptFor(cards, m.card, m.active, twists)).filter(Boolean)
}

export interface Chapter { id: string; title: string; text: string[]; prompts: string[] }

/** The whole world as prose: the meta first, then every microsetting from north-west to south-east. */
export function chronicle(board: Board, cards: Cards, links: Link[], meta: Held[]): Chapter[] {
  const roots = Object.values(board).filter((p) => !p.parent && isHub(cards[p.id].type))
    .sort((a, b) => Math.round(a.y / 300) - Math.round(b.y / 300) || a.x - b.x)
  const world = describeMeta(cards, meta)
  return [
    ...(world || metaPrompts(cards, meta).length ? [{ id: 'meta', title: 'Across the whole world', text: world ? [world] : [], prompts: metaPrompts(cards, meta) }] : []),
    ...roots.map((r) => ({ id: r.id, title: upperFirst(placeName(board, cards, r.id)), text: describe(board, cards, r.id, links), prompts: prompts(board, cards, r.id) })),
  ]
}

export const chronicleText = (chapters: Chapter[]) =>
  chapters.map((c) => [c.title, ...c.text, ...(c.prompts.length ? [c.prompts.map((p) => `- ${p}`).join('\n')] : [])].join('\n\n')).join('\n\n\n')

import { isHub, type CardDef, type Edge, type Placed } from './types'

export const SIZE = 150
export type Cards = Record<string, CardDef>
export type Board = Record<string, Placed>
export interface Pos { x: number; y: number; z: number }

export const DIR: [number, number][] = [[0, -1], [1, 0], [0, 1], [-1, 0]]

/** How much of a tucked card sticks out from under its parent. */
export const peek = (c: CardDef) => (c.cues.length === 2 ? 78 : 40)

export function shuffle<T>(a: T[], rnd = Math.random): T[] {
  const r = [...a]
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[r[i], r[j]] = [r[j], r[i]]
  }
  return r
}

export const childrenOf = (board: Board, id: string) =>
  Object.values(board).filter((p) => p.parent === id).sort((a, b) => a.order - b.order)

export function rootOf(board: Board, id: string): string {
  let p = board[id]
  while (p?.parent && board[p.parent]) p = board[p.parent]
  return p.id
}

export function subtree(board: Board, id: string): string[] {
  return [id, ...childrenOf(board, id).flatMap((c) => subtree(board, c.id))]
}

/** Absolute position and stacking value of every card on the board. */
export function layout(board: Board, cards: Cards): Record<string, Pos> {
  const out: Record<string, Pos> = {}
  const visit = (p: Placed, pos: Pos, step: number) => {
    out[p.id] = pos
    const dist = [0, 0, 0, 0]
    childrenOf(board, p.id).forEach((c, i) => {
      const e = c.edge ?? 0
      dist[e] += peek(cards[c.id])
      visit(c, { x: pos.x + DIR[e][0] * dist[e], y: pos.y + DIR[e][1] * dist[e], z: pos.z - step * (i + 1) }, step / 20)
    })
  }
  for (const p of Object.values(board)) if (!p.parent || !board[p.parent]) visit(p, { x: p.x, y: p.y, z: p.order }, 0.04)
  return out
}

/** Which cue index shows on a given screen edge of a four-cue card. */
export const cueAt = (active: number, tucked: Edge | undefined, screen: number) =>
  (active + screen - (tucked ?? 0) + 4) % 4

export const cueText = (cards: Cards, p: Placed) => cards[p.id].cues[p.active]?.text ?? ''

/** "The Whispering Marsh of Lanterns" from a hub and the epithets tucked under it. */
export function composeName(board: Board, cards: Cards, hub: string): string | null {
  const eps = childrenOf(board, hub).filter((c) => cards[c.id].type === 'epithet')
  if (!eps.length) return null
  const pre = eps.filter((e) => e.active === 0).map((e) => cueText(cards, e))
  const post = eps.filter((e) => e.active !== 0).map((e) => cueText(cards, e))
  return ['The', ...pre, cueText(cards, board[hub]), ...post].join(' ')
}

export const titleOf = (board: Board, cards: Cards, id: string) =>
  composeName(board, cards, id) ?? cueText(cards, board[id])

/** Where a card dropped at (x, y) would tuck, if anywhere. */
export function dropTarget(board: Board, cards: Cards, pos: Record<string, Pos>, id: string): { hub: string; edge: Edge } | null {
  if (cards[id].type === 'terrain') return null
  const me = pos[id]
  let best: { hub: string; edge: Edge; d: number } | null = null
  for (const h of Object.values(board)) {
    if (h.id === id || !isHub(cards[h.id].type) || rootOf(board, h.id) === id) continue
    const dx = me.x - pos[h.id].x
    const dy = me.y - pos[h.id].y
    const d = Math.max(Math.abs(dx), Math.abs(dy))
    if (d > SIZE * 1.15) continue
    const edge = (Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : dy > 0 ? 2 : 0) as Edge
    if (h.parent && edge === ((h.edge ?? 0) + 2) % 4) continue
    if (!best || d < best.d) best = { hub: h.id, edge, d }
  }
  return best && { hub: best.hub, edge: best.edge }
}

/** Pick the least crowded edge of a hub for an automatically tucked card. */
export function autoEdge(board: Board, cards: Cards, hub: string, card: CardDef, active: number): Edge {
  const kids = childrenOf(board, hub)
  const h = board[hub]
  const blocked = h.parent ? ((h.edge ?? 0) + 2) % 4 : -1
  const pref: Edge[] =
    card.type === 'epithet' ? (active === 0 ? [0, 2, 3, 1] : [2, 0, 3, 1])
      : card.type === 'site' ? [1, 3, 2, 0] : card.type === 'quest' ? [0, 3, 1, 2] : [2, 3, 1, 0]
  const count = (e: Edge) => kids.filter((k) => (k.edge ?? 0) === e).length
  return pref.filter((e) => e !== blocked).sort((a, b) => count(a) - count(b))[0]
}

/** A spot near (cx, cy) that keeps clear of existing clusters. */
export function freeSpot(board: Board, cx: number, cy: number, gap = 440): { x: number; y: number } {
  const roots = Object.values(board).filter((p) => !p.parent)
  for (let i = 0; i < 400; i++) {
    const r = 55 * Math.sqrt(i) * 1.6
    const a = i * 2.4
    const x = cx + r * Math.cos(a) - SIZE / 2
    const y = cy + r * Math.sin(a) - SIZE / 2
    if (roots.every((p) => Math.hypot(p.x - x, p.y - y) > gap)) return { x, y }
  }
  return { x: cx, y: cy }
}

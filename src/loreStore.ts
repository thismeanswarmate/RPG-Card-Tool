import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import {
  detailsFor, EMBLEMS, EPITHETS, expandLink, generateWeb, kindsFor, MODIFIERS, newDetail, newId, PRIMARY, sample, spot,
  type Kind, type Packs, type Web,
} from './lore'

/** A choice waiting for the user: one card's worth of options. */
export type Pending =
  | { t: 'primary'; kind: Kind; options: string[] }
  | { t: 'detail'; node: string; options: string[] }
  | { t: 'link'; node: string; detail: number; link: number; options: { kind: Kind; primary: string; node?: string }[] }
  | { t: 'modifier'; node: string; detail: number; link: number; options: string[] }

interface LoreState {
  web: Web
  packs: Packs
  pending: Pending | null
  start(kind: Kind): void
  addDetail(node: string): void
  completeLink(node: string, detail: number, link: number): void
  expand(node: string, detail: number, link: number): void
  choose(i: number): void
  reroll(): void
  cancel(): void
  move(node: string, x: number, y: number): void
  remove(node: string): void
  removeDetail(node: string, detail: number): void
  drawName(node: string): void
  drawEmblem(node: string): void
  togglePack(pack: 'deities' | 'emblems' | 'names'): void
  /** Put an element type in or out of the mix. */
  toggleKind(kind: Kind): void
  generate(size: number): void
  reset(): void
}

const any = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)]

function options(s: LoreState, p: Pending): Pending {
  if (p.t === 'primary') return { ...p, options: sample(PRIMARY[p.kind], 4) }
  if (p.t === 'modifier') return { ...p, options: sample(MODIFIERS, 4) }
  const node = s.web[p.node]
  if (p.t === 'detail') {
    const have = new Set(node.details.map((d) => d.text))
    const allowed = kindsFor(s.packs)
    const pool = detailsFor(node.kind, s.packs).filter((t) => !have.has(t) && newDetail(t).links.every((l) => l.kinds.some((k) => allowed.includes(k))))
    return { ...p, options: sample(pool, 4) }
  }
  const kinds = node.details[p.detail].links[p.link].kinds.filter((k) => kindsFor(s.packs).includes(k))
  return {
    ...p,
    options: [
      ...kinds.flatMap((kind) => sample(PRIMARY[kind], 4).map((primary) => ({ kind, primary }))),
      ...Object.values(s.web).filter((n) => n.id !== p.node && kinds.includes(n.kind)).map((n) => ({ kind: n.kind, primary: n.primary, node: n.id })),
    ],
  }
}

/** The next link in a detail that still needs completing, if any. */
const nextLink = (s: LoreState, node: string, detail: number): Pending | null => {
  const link = s.web[node]?.details[detail]?.links.findIndex((l) => !l.primary)
  return link === undefined || link < 0 ? null : options(s, { t: 'link', node, detail, link, options: [] })
}

export const useLore = create<LoreState>()(
  persist(
    immer((set) => ({
      web: {},
      packs: { deities: false, emblems: false, names: false },
      pending: null,

      start: (kind) => set((s) => { s.pending = options(s, { t: 'primary', kind, options: [] }) }),
      addDetail: (node) => set((s) => { if (s.web[node]?.details.length < 4) s.pending = options(s, { t: 'detail', node, options: [] }) }),
      completeLink: (node, detail, link) => set((s) => { s.pending = options(s, { t: 'link', node, detail, link, options: [] }) }),
      expand: (node, detail, link) => set((s) => { s.pending = options(s, { t: 'modifier', node, detail, link, options: [] }) }),

      choose: (i) => set((s) => {
        const p = s.pending
        if (!p) return
        s.pending = null
        if (p.t === 'primary') {
          const id = newId()
          s.web[id] = { id, kind: p.kind, primary: p.options[i], details: [], ...spot(s.web, Object.values(s.web).at(-1)) }
        } else if (p.t === 'detail') {
          const node = s.web[p.node]
          node.details.push(newDetail(p.options[i]))
          s.pending = nextLink(s, p.node, node.details.length - 1)
        } else if (p.t === 'link') {
          Object.assign(s.web[p.node].details[p.detail].links[p.link], p.options[i])
          s.pending = nextLink(s, p.node, p.detail)
        } else {
          const from = s.web[p.node]
          expandLink(s.web, from, from.details[p.detail].links[p.link], p.options[i], s.packs)
        }
      }),

      reroll: () => set((s) => { if (s.pending) s.pending = options(s, s.pending) }),
      cancel: () => set((s) => { s.pending = null }),
      move: (node, x, y) => set((s) => { if (s.web[node]) Object.assign(s.web[node], { x, y }) }),

      remove: (node) => set((s) => {
        delete s.web[node]
        for (const n of Object.values(s.web)) {
          if (n.parent === node) delete n.parent
          for (const d of n.details) for (const l of d.links) if (l.node === node) delete l.node
        }
      }),

      removeDetail: (node, detail) => set((s) => { s.web[node]?.details.splice(detail, 1) }),
      drawName: (node) => set((s) => { if (s.web[node]) s.web[node].epithet = any(EPITHETS.filter((e) => e !== s.web[node].epithet)) }),
      drawEmblem: (node) => set((s) => { if (s.web[node]) s.web[node].emblem = any(EMBLEMS.filter((e) => e !== s.web[node].emblem)) }),
      togglePack: (pack) => set((s) => { s.packs[pack] = !s.packs[pack] }),
      toggleKind: (kind) => set((s) => {
        const off = s.packs.off ?? []
        s.packs.off = off.includes(kind) ? off.filter((k) => k !== kind) : [...off, kind]
      }),
      generate: (size) => set((s) => { s.web = generateWeb(size, s.packs); s.pending = null }),
      reset: () => set((s) => { s.web = {}; s.pending = null }),
    })),
    { name: 'storyloom-lore-v1', partialize: (s) => ({ web: s.web, packs: s.packs }) },
  ),
)

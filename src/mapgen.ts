// Draws a setting as a map. Nothing here is random at view time: the land, its coast, the symbols on it
// and the routes across it all come from the setting and its seed, so the same setting always draws the
// same map, and the map always matches what the text says.
//
// Each place gets a region: a blob around its position, cut back wherever a neighbour is nearer, so that
// neighbouring regions meet along a shared border and together make up the landmass. Every outline is
// then pushed about by one smooth noise field, which makes coasts and borders wander while keeping
// shared borders exactly shared.

import { EXPANSION_COLORS } from './expansions'
import { cueText, rootOf, subtree } from './logic'
import { rngFrom, type Rng } from './names'
import { rootsOf, terrainOf, type Setting } from './setting'
import { TERRAIN_COLORS } from './starter'
import { cardsOf } from './store'

const CARDS = cardsOf({ custom: [] })
type P = [number, number]

export type Glyph = 'tree' | 'deadtree' | 'peak' | 'tuft' | 'reed' | 'snow' | 'wave' | 'crater' | 'cross' | 'crystal' | 'dune' | 'dome'

/** Which small symbol stands for a terrain, chosen from words in its name. */
const GLYPHS: [RegExp, Glyph][] = [
  [/blighted/, 'deadtree'],
  [/bone|grave/, 'cross'],
  [/crystal/, 'crystal'],
  [/orbital|dome|terraformed/, 'dome'],
  [/asteroid|derelict|ash|crater|salt|dry lake|stony/, 'crater'],
  [/ice|glacier|tundra|snow|frozen|permafrost/, 'snow'],
  [/forest|wood|taiga|mangrove|canopy|jungle/, 'tree'],
  [/sea|atoll|archipelago|shoal|kelp|fjord|island|isle|lagoon|drowned|methane/, 'wave'],
  [/marsh|fen|floodplain|estuary|tidal|wetland|delta|oasis/, 'reed'],
  [/dune|erg|desert|wadi/, 'dune'],
  [/mountain|peak|highland|caldera|plateau|mesa|cliff|steps|karst|canyon|rift|badland|valley|headland|cave/, 'peak'],
]
export const glyphFor = (terrain: string): Glyph => GLYPHS.find(([re]) => re.test(terrain.toLowerCase()))?.[1] ?? 'tuft'

export interface MapSite { id: string; name: string; x: number; y: number }
export interface MapRegion {
  id: string
  name: string
  terrain: string
  /** The outline as an SVG path. */
  d: string
  points: P[]
  x: number
  y: number
  colour: string
  glyph: Glyph
  symbols: { x: number; y: number; k: number }[]
  sites: MapSite[]
}
export interface MapData {
  w: number
  h: number
  regions: MapRegion[]
  routes: { a: string; b: string; d: string }[]
  scale: { px: number; label: string }
  theme: 'parchment' | 'blueprint'
}

const SCALE = 0.4
const MARGIN = 290

/** Smooth noise in [0, 1) over the plane, different for each seed. */
function noise(seed: number) {
  const at = (ix: number, iy: number) => {
    let h = (ix * 374761393 + iy * 668265263 + seed * 2147483647) | 0
    h = Math.imul(h ^ (h >>> 13), 1274126177)
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296
  }
  return (x: number, y: number) => {
    const ix = Math.floor(x), iy = Math.floor(y)
    const fx = x - ix, fy = y - iy
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy)
    const top = at(ix, iy) + (at(ix + 1, iy) - at(ix, iy)) * sx
    const bottom = at(ix, iy + 1) + (at(ix + 1, iy + 1) - at(ix, iy + 1)) * sx
    return top + (bottom - top) * sy
  }
}

/** Keep the part of a polygon on the near side of the line through m with normal n. */
function clip(poly: P[], m: P, n: P): P[] {
  const side = (p: P) => (p[0] - m[0]) * n[0] + (p[1] - m[1]) * n[1]
  const out: P[] = []
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length]
    const sa = side(a), sb = side(b)
    if (sa <= 0) out.push(a)
    if ((sa < 0 && sb > 0) || (sa > 0 && sb < 0)) {
      const t = sa / (sa - sb)
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t])
    }
  }
  return out
}

const inside = (p: P, poly: P[]) => {
  let hit = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j]
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) hit = !hit
  }
  return hit
}

const r1 = (n: number) => Math.round(n * 10) / 10
const pathOf = (pts: P[]) => `M${pts.map(([x, y]) => `${r1(x)} ${r1(y)}`).join('L')}Z`

/** Soften a colour toward the paper, so regions read as washes and not as blocks. */
function wash(hex: string, amount: number, paper: [number, number, number]): string {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
  return `rgb(${c.map((v, i) => Math.round(v * amount + paper[i] * (1 - amount))).join(' ')})`
}

const MILES: Record<string, [number, string]> = { region: [120, '10 miles'], country: [120, '50 miles'], continent: [120, '200 miles'] }

export function buildMap(s: Setting): MapData {
  const rng: Rng = rngFrom(`${s.seed}:map`)
  const roots = rootsOf(s)
  const raw = roots.map((r): P => [s.board[r].x * SCALE, s.board[r].y * SCALE])
  const minX = Math.min(...raw.map((p) => p[0])), minY = Math.min(...raw.map((p) => p[1]))
  const pts = raw.map(([x, y]): P => [x - minX + MARGIN, y - minY + MARGIN])
  const w = Math.max(...pts.map((p) => p[0])) + MARGIN
  const h = Math.max(...pts.map((p) => p[1])) + MARGIN

  // How far a region reaches: a little over half the usual distance to the nearest neighbour.
  const nearest = pts.map((p, i) => Math.min(...pts.filter((_, j) => j !== i).map((q) => Math.hypot(p[0] - q[0], p[1] - q[1]))))
  const typical = [...nearest].sort((a, b) => a - b)[Math.floor(nearest.length / 2)] || 260
  const reach = Math.min(175, Math.max(105, typical * 0.78))

  const seed = Math.floor(rng() * 1e6)
  const edge = noise(seed), dx = noise(seed + 1), dy = noise(seed + 2)
  const push = ([x, y]: P): P => [x + (dx(x / 70, y / 70) - 0.5) * 34 + (dx(x / 19, y / 19) - 0.5) * 7, y + (dy(x / 70, y / 70) - 0.5) * 34 + (dy(x / 19, y / 19) - 0.5) * 7]
  const theme = s.answers.genres[0] === 'scifi' ? 'blueprint' : 'parchment'
  const paper: [number, number, number] = theme === 'blueprint' ? [18, 42, 68] : [233, 220, 192]

  // How much room each place takes: busier places — more sites, powers and people — are larger, with a
  // little chance on top. A border between two places sits nearer the smaller one.
  const busy = (root: string) => {
    const within = new Set(subtree(s.board, root))
    return subtree(s.board, root).filter((x) => CARDS[x].type === 'site').length * 0.3
      + [...s.entities, ...s.people].filter((e) => e.home && within.has(e.home)).length * 0.14
  }
  const loads = roots.map(busy)
  const mean = loads.reduce((a, b) => a + b, 0) / loads.length || 1
  const weight = loads.map((v) => Math.min(1.75, Math.max(0.5, 0.55 + (0.5 * v) / mean + (rng() - 0.5) * 0.5)))

  const regions = roots.map((id, i): MapRegion => {
    const [cx, cy] = pts[i]
    // A rough blob, wider than tall, with an uneven edge.
    let poly: P[] = Array.from({ length: 44 }, (_, k) => {
      const a = (k / 44) * Math.PI * 2
      const r = reach * weight[i] ** 0.85 * (0.8 + 0.42 * edge(i * 7.3 + Math.cos(a) * 1.6 + 5, Math.sin(a) * 1.6 + 5))
      return [cx + Math.cos(a) * r * 1.08, cy + Math.sin(a) * r * 0.94]
    })
    pts.forEach((q, j) => {
      if (j === i) return
      // Where the border falls between the two centres. Each place has a radius that grows with its weight,
      // and the border is the line of equal "power" between the two circles. Borders drawn by this rule
      // always meet three at a point, so regions fit together with no gaps or overlaps.
      const span = (q[0] - cx) ** 2 + (q[1] - cy) ** 2
      const share = 0.5 + ((85 * weight[i]) ** 2 - (85 * weight[j]) ** 2) / (2 * span)
      poly = clip(poly, [cx + (q[0] - cx) * share, cy + (q[1] - cy) * share], [q[0] - cx, q[1] - cy])
    })
    // Many short steps along each edge, each pushed by the noise field.
    const fine: P[] = []
    poly.forEach((a, k) => {
      const b = poly[(k + 1) % poly.length]
      const steps = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 9))
      for (let t = 0; t < steps; t++) fine.push(push([a[0] + ((b[0] - a[0]) * t) / steps, a[1] + ((b[1] - a[1]) * t) / steps]))
    })

    const terrain = terrainOf(s, id)
    const glyph = glyphFor(terrain)
    const base = (TERRAIN_COLORS[terrain] ?? EXPANSION_COLORS[terrain] ?? ['#8a8f7a'])[0]

    const hubs = subtree(s.board, id).filter((x) => CARDS[x].type === 'site')
    const turn = rng() * Math.PI * 2
    const sites = hubs.map((sid, k): MapSite => {
      let a = turn + (k / Math.max(1, hubs.length)) * Math.PI * 2
      let spot: P = [cx, cy]
      // Step round the centre until the site sits on its own land and clear of the place's lettering.
      const half = s.names[id].length * 5.4 + 14
      const lettered = (p: P) => Math.abs(p[0] - cx) < half + s.names[sid].length * 2.4 && p[1] > cy - 30 && p[1] < cy + 22
      for (let tries = 0, r = 60; tries < 70; tries++, a += 0.45, r = Math.max(18, r - 1)) {
        spot = [cx + Math.cos(a) * r * 0.95, cy + Math.sin(a) * r + (Math.sin(a) >= 0 ? 16 : -10)]
        if (inside(spot, fine) && inside([spot[0], spot[1] + 14], fine) && !lettered(spot)) break
      }
      return { id: sid, name: s.names[sid], x: r1(spot[0]), y: r1(spot[1]) }
    })

    // Scatter the terrain symbol across the region, clear of the lettering, the sites and each other.
    const xs = fine.map((p) => p[0]), ys = fine.map((p) => p[1])
    const box = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]
    const symbols: MapRegion['symbols'] = []
    for (let tries = 0; tries < 260 && symbols.length < 26; tries++) {
      const p: P = [box[0] + rng() * (box[2] - box[0]), box[1] + rng() * (box[3] - box[1])]
      if (!inside(p, fine) || !inside([p[0], p[1] + 9], fine) || !inside([p[0] - 9, p[1]], fine) || !inside([p[0] + 9, p[1]], fine)) continue
      if (Math.abs(p[0] - cx) < 66 && Math.abs(p[1] - cy) < 28) continue
      if (sites.some((q) => Math.abs(p[0] - q.x) < 58 && Math.abs(p[1] - q.y) < 24)) continue
      if (symbols.some((q) => Math.hypot(p[0] - q.x, p[1] - q.y) < 24)) continue
      symbols.push({ x: r1(p[0]), y: r1(p[1]), k: r1(0.85 + rng() * 0.4) })
    }

    return {
      id, name: s.names[id], terrain, d: pathOf(fine), points: fine, x: r1(cx), y: r1(cy),
      colour: wash(base, theme === 'blueprint' ? 0.35 : 0.5, paper), glyph, symbols: symbols.sort((a, b) => a.y - b.y), sites,
    }
  })

  // Routes: one for every pair of places that something in the setting connects.
  const index = new Map(roots.map((r, i) => [r, i]))
  const rootFor = (id?: string): string | undefined => {
    if (!id) return undefined
    if (s.board[id]) return rootOf(s.board, id)
    const thing = [...s.entities, ...s.people].find((e) => e.id === id)
    return thing?.home ? rootOf(s.board, thing.home) : undefined
  }
  const pairs = new Map<string, [string, string]>()
  const join = (a?: string, b?: string) => { if (a && b && a !== b) pairs.set([a, b].sort().join('|'), [a, b].sort() as [string, string]) }
  for (const e of [...s.entities, ...s.people]) for (const d of e.details) for (const l of d.links) join(rootFor(e.id), rootFor(l.node))
  for (const c of s.people) join(rootFor(c.id), rootFor(c.faction))
  for (const hk of s.hooks) for (const l of hk.lines) join(rootFor(l.who), rootFor(l.target))
  const length = ([a, b]: [string, string]) => Math.hypot(pts[index.get(a)!][0] - pts[index.get(b)!][0], pts[index.get(a)!][1] - pts[index.get(b)!][1])
  const routes = [...pairs.values()].sort((p, q) => length(p) - length(q)).slice(0, Math.ceil(roots.length * 1.1)).map(([a, b]) => {
    const [ax, ay] = pts[index.get(a)!], [bx, by] = pts[index.get(b)!]
    const len = Math.hypot(bx - ax, by - ay)
    const bend = (edge(ax / 50 + bx / 90, ay / 50 + by / 90) - 0.5) * len * 0.36
    const mx = (ax + bx) / 2 - ((by - ay) / len) * bend, my = (ay + by) / 2 + ((bx - ax) / len) * bend
    return { a, b, d: `M${r1(ax)} ${r1(ay)}Q${r1(mx)} ${r1(my)} ${r1(bx)} ${r1(by)}` }
  })

  const [px, label] = MILES[s.answers.size] ?? MILES.country
  return { w: Math.round(w), h: Math.round(h), regions, routes, scale: { px, label }, theme }
}

export const siteKind = (s: Setting, id: string) => cueText(CARDS, s.board[id])

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

/** A marked spot within a region: a site, a settlement or a dangerous place. */
export interface MapSite { id: string; name: string; x: number; y: number; kind: 'site' | 'settlement' | 'peril' }
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
const MARGIN = 330

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

/** The roomiest spot inside an outline: the point of a coarse grid that lies furthest from every edge. */
function heart(poly: P[]): P {
  const xs = poly.map((p) => p[0]), ys = poly.map((p) => p[1])
  const [x0, y0, x1, y1] = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]
  const rim = poly.filter((_, i) => i % 2 === 0)
  let best: P = [(x0 + x1) / 2, (y0 + y1) / 2], room = -1
  for (let i = 1; i < 18; i++)
    for (let j = 1; j < 18; j++) {
      const p: P = [x0 + ((x1 - x0) * i) / 18, y0 + ((y1 - y0) * j) / 18]
      if (!inside(p, poly)) continue
      // Lettering is wide and short, so sideways room counts for less than room above and below.
      const d = Math.min(...rim.map((q) => Math.hypot((p[0] - q[0]) * 0.8, p[1] - q[1])))
      if (d > room) { room = d; best = p }
    }
  return best
}

const r1 = (n: number) => Math.round(n * 10) / 10
const pathOf = (pts: P[]) => `M${pts.map(([x, y]) => `${r1(x)} ${r1(y)}`).join('L')}Z`

/** Soften a colour toward the paper, so regions read as washes and not as blocks. */
export function wash(hex: string, amount: number, paper: [number, number, number]): string {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
  return `rgb(${c.map((v, i) => Math.round(v * amount + paper[i] * (1 - amount))).join(' ')})`
}

export const PAPER: Record<MapData['theme'], [number, number, number]> = { parchment: [233, 220, 192], blueprint: [18, 42, 68] }

/** The wash for a region in a given colour: its terrain's by default, or one taken from its picture. */
export const washFor = (hex: string, theme: MapData['theme']) => wash(hex, theme === 'blueprint' ? 0.35 : 0.5, PAPER[theme])

const MILES: Record<string, [number, string]> = { region: [120, '10 miles'], country: [120, '50 miles'], continent: [120, '200 miles'] }

export function buildMap(s: Setting): MapData {
  const rng: Rng = rngFrom(`${s.seed}:map`)
  const roots = rootsOf(s)
  const raw = roots.map((r): P => [s.board[r].x * SCALE, s.board[r].y * SCALE])
  const minX = Math.min(...raw.map((p) => p[0])), minY = Math.min(...raw.map((p) => p[1]))
  const grid = raw.map(([x, y]): P => [x - minX + MARGIN, y - minY + MARGIN])

  // How far a region reaches: a little over half the usual distance to the nearest neighbour.
  // A place alone on the map has no neighbour to measure against, so it is given the usual distance.
  const gaps = grid.map((p, i) => Math.min(520 * SCALE * (grid.length > 1 ? Infinity : 1), ...grid.filter((_, j) => j !== i).map((q) => Math.hypot(p[0] - q[0], p[1] - q[1]))))
  const spacing = [...gaps].sort((a, b) => a - b)[Math.floor(gaps.length / 2)] || 220
  // Nudge every centre off the grid it was laid out on, so that borders do not fall into a honeycomb.
  const pts = grid.map(([x, y]): P => {
    const a = rng() * Math.PI * 2, r = spacing * (0.08 + rng() * 0.16)
    return [x + Math.cos(a) * r, y + Math.sin(a) * r]
  })
  const nearest = pts.map((p, i) => Math.min(pts.length > 1 ? Infinity : 520 * SCALE, ...pts.filter((_, j) => j !== i).map((q) => Math.hypot(p[0] - q[0], p[1] - q[1]))))
  const typical = [...nearest].sort((a, b) => a - b)[Math.floor(nearest.length / 2)] || 260
  const reach = Math.min(200, Math.max(110, typical * 0.9))

  const seed = Math.floor(rng() * 1e6)
  const edge = noise(seed), dx = noise(seed + 1), dy = noise(seed + 2)
  // The warp that bends every outline: a broad swell, a middling wobble and a fine tremor. It is one
  // field over the whole map, applied to borders, centres and routes alike, so everything moves together.
  // Around a wild place the wobble and tremor are stronger and a fourth, tighter ripple joins in.
  const wildness = (x: number, y: number) =>
    pts.reduce((sum, p, i) => sum + wild[i] * Math.exp(-((x - p[0]) ** 2 + (y - p[1]) ** 2) / (2 * 120 ** 2)), 0)
  const warp = (f: (x: number, y: number) => number, x: number, y: number) => {
    const extra = Math.min(1, wildness(x, y))
    return (f(x / 150, y / 150) - 0.5) * 78
      + (f(x / 58 + 9, y / 58 + 9) - 0.5) * 30 * (1 + 0.7 * extra)
      + (f(x / 31 + 5, y / 31 + 5) - 0.5) * 22 * extra
      + (f(x / 17 + 3, y / 17 + 3) - 0.5) * 7 * (1 + extra)
  }
  const push = ([x, y]: P): P => [x + warp(dx, x, y), y + warp(dy, x, y)]
  const theme = s.answers.genres[0] === 'scifi' ? 'blueprint' : 'parchment'

  // How much room each place takes: busier places — more sites, powers and people — are larger, with a
  // little chance on top. A border between two places sits nearer the smaller one.
  const busy = (root: string) => {
    const within = new Set(subtree(s.board, root))
    return subtree(s.board, root).filter((x) => CARDS[x].type === 'site').length * 0.3
      + [...s.entities, ...s.people].filter((e) => e.home && within.has(e.home)).length * 0.14
  }
  const loads = roots.map(busy)
  const mean = loads.reduce((a, b) => a + b, 0) / loads.length || 1
  // The spread is wide and lopsided: a few places sprawl, most are middling, some are small.
  const weight = loads.map((v) => Math.min(2.1, Math.max(0.45, (0.5 + (0.5 * v) / mean) * Math.exp((rng() - 0.45) * 1.25))))
  // Each place's radius for drawing borders. Where a large place would otherwise push a border past a
  // small neighbour's centre, the large one is reined in until the small one keeps its ground.
  const radius = weight.map((v) => 92 * v)
  for (let pass = 0, changed = true; changed && pass < 60; pass++) {
    changed = false
    pts.forEach((p, i) => pts.forEach((q, j) => {
      if (i === j || radius[i] <= radius[j]) return
      const room = 0.4 * ((p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2)
      if (radius[i] ** 2 - radius[j] ** 2 > room + 1e-6) { radius[i] = Math.sqrt(room + radius[j] ** 2); changed = true }
    }))
  }
  // Some places are wilder than the rest: their coasts throw out more headlands and their borders wander further.
  const wild = roots.map(() => (rng() < 0.4 ? 0.6 + rng() * 0.4 : 0))

  const regions = roots.map((id, i): MapRegion => {
    const [gx, gy] = pts[i]
    // A lopsided blob: an uneven edge, two or three lobes at angles of its own, stretched along one axis.
    const lean = rng() * Math.PI, stretch = 0.78 + rng() * 0.5 + (rng() < 0.5 ? -0.16 : 0.3) * wild[i]
    const lobes = [rng() * Math.PI * 2, rng() * Math.PI * 2, rng() * Math.PI * 2]
    let poly: P[] = Array.from({ length: 72 }, (_, k) => {
      const a = (k / 72) * Math.PI * 2
      const r = Math.max(74, reach * weight[i] ** 0.9)
        * (0.72 + 0.5 * edge(i * 7.3 + Math.cos(a) * 1.9 + 5, Math.sin(a) * 1.9 + 5))
        * Math.max(0.55, 1 + (0.2 + 0.2 * wild[i]) * Math.sin(a * 2 + lobes[0]) + (0.14 + 0.18 * wild[i]) * Math.sin(a * 3 + lobes[1]) + 0.2 * wild[i] * Math.sin(a * 5 + lobes[2]))
      const [u, v] = [Math.cos(a) * r * stretch, (Math.sin(a) * r) / stretch]
      return [gx + u * Math.cos(lean) - v * Math.sin(lean), gy + u * Math.sin(lean) + v * Math.cos(lean)]
    })
    pts.forEach((q, j) => {
      if (j === i) return
      // Where the border falls between the two centres. Each place has a radius that grows with its weight,
      // and the border is the line of equal "power" between the two circles. Borders drawn by this rule
      // always meet three at a point, so regions fit together with no gaps or overlaps.
      const span = (q[0] - gx) ** 2 + (q[1] - gy) ** 2
      const share = 0.5 + (radius[i] ** 2 - radius[j] ** 2) / (2 * span)
      poly = clip(poly, [gx + (q[0] - gx) * share, gy + (q[1] - gy) * share], [q[0] - gx, q[1] - gy])
    })
    // Many short steps along each edge, each pushed by the noise field.
    const fine: P[] = []
    poly.forEach((a, k) => {
      const b = poly[(k + 1) % poly.length]
      const steps = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 9))
      for (let t = 0; t < steps; t++) fine.push(push([a[0] + ((b[0] - a[0]) * t) / steps, a[1] + ((b[1] - a[1]) * t) / steps]))
    })
    // The name goes at the roomiest spot in the region, wherever its shape has left that.
    const [cx, cy] = heart(fine)

    const terrain = terrainOf(s, id)
    const glyph = glyphFor(terrain)
    const base = (TERRAIN_COLORS[terrain] ?? EXPANSION_COLORS[terrain] ?? ['#8a8f7a'])[0]

    // Sites first, then the settlements and dangerous places that stand anywhere in the place.
    const within = new Set(subtree(s.board, id))
    const marks = new Map<string, MapSite['kind']>([
      ...[...within].filter((x) => CARDS[x].type === 'site').map((x) => [x, 'site'] as [string, MapSite['kind']]),
      ...(s.built ?? []).filter((b) => within.has(b.home)).map((b) => [b.id, b.tool] as [string, MapSite['kind']]),
    ])
    const hubs = [...marks.keys()]
    const turn = rng() * Math.PI * 2
    const sites: MapSite[] = []
    hubs.forEach((sid, k) => {
      let a = turn + (k / Math.max(1, hubs.length)) * Math.PI * 2
      let spot: P = [cx, cy]
      // Step round the centre until the mark sits on its own land, clear of the place's lettering and of the marks before it.
      const half = s.names[id].length * 5.4 + 14
      const lettered = (p: P) => Math.abs(p[0] - cx) < half + s.names[sid].length * 2.4 && p[1] > cy - 52 && p[1] < cy + 22
      // Each ring is walked right round before moving to the next: the usual distance first, then nearer and farther.
      const rings = [60, 42, 80, 100, 26, 122, 146]
      for (let tries = 0; tries < rings.length * 14; tries++, a += 0.45) {
        const r = rings[Math.floor(tries / 14)]
        spot = [cx + Math.cos(a) * r * 0.95, cy + Math.sin(a) * r + (Math.sin(a) >= 0 ? 16 : -10)]
        const crowded = sites.some((q) => Math.abs(q.x - spot[0]) < 46 && Math.abs(q.y - spot[1]) < 24)
        if (inside(spot, fine) && inside([spot[0], spot[1] + 14], fine) && !lettered(spot) && !crowded) break
      }
      sites.push({ id: sid, name: s.names[sid], x: r1(spot[0]), y: r1(spot[1]), kind: marks.get(sid)! })
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
      colour: washFor(base, theme), glyph, symbols: symbols.sort((a, b) => a.y - b.y), sites,
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
    const ra = regions[index.get(a)!], rb = regions[index.get(b)!]
    const [ax, ay] = [ra.x, ra.y], [bx, by] = [rb.x, rb.y]
    const len = Math.hypot(bx - ax, by - ay)
    const bend = (edge(ax / 50 + bx / 90, ay / 50 + by / 90) - 0.5) * len * 0.36
    const mx = (ax + bx) / 2 - ((by - ay) / len) * bend, my = (ay + by) / 2 + ((bx - ax) / len) * bend
    return { a, b, d: `M${r1(ax)} ${r1(ay)}Q${r1(mx)} ${r1(my)} ${r1(bx)} ${r1(by)}` }
  })

  // Trim the sheet to the land, leaving an even border of sea all round.
  const all = regions.flatMap((r) => r.points)
  const PAD = 96
  const tx = PAD - Math.min(...all.map((p) => p[0])), ty = PAD + 26 - Math.min(...all.map((p) => p[1]))
  const moved = regions.map((r) => {
    const points = r.points.map(([x, y]): P => [x + tx, y + ty])
    return {
      ...r, points, d: pathOf(points), x: r1(r.x + tx), y: r1(r.y + ty),
      symbols: r.symbols.map((p) => ({ ...p, x: r1(p.x + tx), y: r1(p.y + ty) })),
      sites: r.sites.map((p) => ({ ...p, x: r1(p.x + tx), y: r1(p.y + ty) })),
    }
  })
  const shifted = routes.map((r) => ({ ...r, d: r.d.replace(/(-?[\d.]+) (-?[\d.]+)/g, (_, x: string, y: string) => `${r1(+x + tx)} ${r1(+y + ty)}`) }))
  const width = Math.max(...all.map((p) => p[0])) + tx + PAD
  const height = Math.max(...all.map((p) => p[1])) + ty + PAD

  const [px, label] = MILES[s.answers.size] ?? MILES.country
  return { w: Math.round(width), h: Math.round(height), regions: moved, routes: shifted, scale: { px, label }, theme }
}

export const siteKind = (s: Setting, id: string) => cueText(CARDS, s.board[id])

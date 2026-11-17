// Draws a setting as a map. Nothing here is random at view time: the land, its coast, the symbols on it
// and the routes across it all come from the setting and its seed, so the same setting always draws the
// same map, and the map always matches what the text says.
//
// Each place gets a region: a blob around its position, cut back wherever a neighbour is nearer, so that
// neighbouring regions meet along a shared border and together make up the landmass. Every outline is
// then pushed about by one smooth noise field, which makes coasts and borders wander while keeping
// shared borders exactly shared.

import { typeKey } from './settlement'
import { EXPANSION_COLORS } from './expansions'
import { cueText, rootOf, subtree } from './logic'
import { rngFrom, type Rng , TONGUES } from './names'
import { rootsOf, terrainOf, type Setting , beyondOf, seasOf } from './setting'
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
export interface MapSite { id: string; name: string; x: number; y: number; kind: 'site' | 'settlement' | 'peril'; /** For a settlement, which kind: 'village', 'city', 'capital' and so on. */ rank?: string }
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
  /** Still water inside the land: its outline, its name, and where the name goes. */
  lakes: { d: string; name: string; x: number; y: number }[]
  /** Running water: each a line from its source to the sea or to a lake, with its name and the stretch the name is set along, running left to right. */
  rivers: { d: string; name: string; along: string }[]
  /** The named seas on the sides with no neighbouring world, lettered along those edges. */
  seas: { name: string; x: number; y: number; turn: number }[]
  scale: { px: number; label: string }
  /** Neighbouring worlds: the land of each, joined to this one and running off its edge of the sheet, and where its name goes. */
  beyond: { id: string; name: string; x: number; y: number; /** A quarter turn for a name set up one of the two sides. */ turn: number; d: string }[]
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

/** How far a ray from a point at an angle travels before it leaves a polygon the point lies in. */
function reachOf(poly: P[], from: P, angle: number): number {
  const [dx, dy] = [Math.cos(angle), Math.sin(angle)]
  let best = Infinity
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length]
    const [ex, ey] = [b[0] - a[0], b[1] - a[1]]
    const den = dx * ey - dy * ex
    if (Math.abs(den) < 1e-9) continue
    const t = ((a[0] - from[0]) * ey - (a[1] - from[1]) * ex) / den
    const u = ((a[0] - from[0]) * dy - (a[1] - from[1]) * dx) / den
    if (t > 0 && u >= 0 && u <= 1 && t < best) best = t
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
  // Neighbouring worlds: each is given a centre of its own out past the last places on its side, so that it
  // shares a border with them like any other place and its land carries on off the sheet.
  const OUT: Record<string, P> = { north: [0, -1], east: [1, 0], south: [0, 1], west: [-1, 0] }
  const outer = beyondOf(s)
  const mid: P = [pts.reduce((a, p) => a + p[0], 0) / pts.length, pts.reduce((a, p) => a + p[1], 0) / pts.length]
  const outerAt = outer.map((b): P => {
    const d = OUT[b.side]
    const far = Math.max(...pts.map((p) => (p[0] - mid[0]) * d[0] + (p[1] - mid[1]) * d[1]))
    return [mid[0] + d[0] * (far + typical * 1.05), mid[1] + d[1] * (far + typical * 1.05)]
  })
  const centres = [...pts, ...outerAt]

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
  const radius = [...weight.map((v) => 92 * v), ...outerAt.map(() => 104)]
  for (let pass = 0, changed = true; changed && pass < 60; pass++) {
    changed = false
    centres.forEach((p, i) => centres.forEach((q, j) => {
      if (i === j || radius[i] <= radius[j]) return
      const room = 0.4 * ((p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2)
      if (radius[i] ** 2 - radius[j] ** 2 > room + 1e-6) { radius[i] = Math.sqrt(room + radius[j] ** 2); changed = true }
    }))
  }
  // How far a place will stretch to meet a neighbour's border; beyond this the border is left to the sea.
  const meet = typical * 1.35
  // Some places are wilder than the rest: their coasts throw out more headlands and their borders wander further.
  const wild = roots.map(() => (rng() < 0.4 ? 0.6 + rng() * 0.4 : 0))

  /** Fit a blob to the ground its centre may take, stretch it to meet its neighbours, and draw its edge in short uneven steps. */
  const outline = (i: number, blob: P[]): P[] => {
    const [gx, gy] = centres[i]
    let poly = blob
    // The ground this place may take: everything nearer to it than to its neighbours, by the rule below.
    const borders = centres.flatMap((q, j) => {
      if (j === i) return []
      const span = (q[0] - gx) ** 2 + (q[1] - gy) ** 2
      const share = 0.5 + (radius[i] ** 2 - radius[j] ** 2) / (2 * span)
      return [[[gx + (q[0] - gx) * share, gy + (q[1] - gy) * share], [q[0] - gx, q[1] - gy]] as [P, P]]
    })
    let cell: P[] = Array.from({ length: 48 }, (_, k): P => [gx + Math.cos((k / 48) * Math.PI * 2) * 5000, gy + Math.sin((k / 48) * Math.PI * 2) * 5000])
    for (const [m, n] of borders) cell = clip(cell, m, n)
    // Where a neighbour's border lies within reach, the place is stretched out to meet it, so that no gap of
    // sea is left between two places that lie side by side. Only its open sides keep the blob's own outline.
    if (inside([gx, gy], cell)) poly = poly.map(([x, y]): P => {
      const far = Math.hypot(x - gx, y - gy), limit = reachOf(cell, [gx, gy], Math.atan2(y - gy, x - gx))
      if (limit > meet || far >= limit * 1.1 + 8) return [x, y]
      const k = (limit * 1.1 + 8) / (far || 1)
      return [gx + (x - gx) * k, gy + (y - gy) * k]
    })
    centres.forEach((q, j) => {
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
    return fine
  }

  const lakes: { c: P; r: number; poly: P[]; region: number }[] = []
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
    const fine = outline(i, poly)
    // The name goes at the roomiest spot in the region, wherever its shape has left that.
    const [cx, cy] = heart(fine)

    const terrain = terrainOf(s, id)
    // A lake, in wet country more often than dry: a small uneven pool set well inside the place, clear of its name.
    const wet = /marsh|lagoon|flood|lake|fen|delta|estuary|mangrove|bog|river|fjord|atoll|archipelago/i.test(terrain)
    const dry = /dune|desert|salt|badland|waste|glacier|tundra|canyon/i.test(terrain)
    const pools: { c: P; r: number; poly: P[] }[] = []
    if (rng() < (wet ? 0.75 : dry ? 0.12 : 0.4)) {
      const fxs = fine.map((p) => p[0]), fys = fine.map((p) => p[1])
      const [bx0, by0, bx1, by1] = [Math.min(...fxs), Math.min(...fys), Math.max(...fxs), Math.max(...fys)]
      for (let tries = 0; tries < 60 && !pools.length; tries++) {
        const c: P = [bx0 + rng() * (bx1 - bx0), by0 + rng() * (by1 - by0)]
        // Mostly ponds and small lakes, now and then a broad one; the long tries start large and settle for less.
        const r = (10 + rng() ** 1.5 * 50) * (tries < 36 ? 1 : 0.6)
        const room = Array.from({ length: 8 }, (_, k): P => [c[0] + Math.cos((k / 8) * Math.PI * 2) * (r * 1.45 + 8), c[1] + Math.sin((k / 8) * Math.PI * 2) * (r * 1.45 + 8)])
        if (!inside(c, fine) || room.some((p) => !inside(p, fine))) continue
        if (Math.abs(c[0] - cx) < 84 + r && c[1] > cy - 60 - r && c[1] < cy + 30 + r) continue
        const tilt = rng() * Math.PI, squash = 0.42 + rng() * 0.55, phase = rng() * 9, arms = [rng() * Math.PI * 2, rng() * Math.PI * 2]
        const poly = Array.from({ length: 34 }, (_, k): P => {
          const a = (k / 34) * Math.PI * 2
          // An uneven shore with a bay or two: noise, and two slow swells at angles of their own.
          const rr = r * (0.6 + 0.62 * edge(i * 3.1 + Math.cos(a) * 1.7 + phase, Math.sin(a) * 1.7 + phase)) * (1 + 0.2 * Math.sin(a * 2 + arms[0]) + 0.14 * Math.sin(a * 3 + arms[1]))
          const [u, v] = [Math.cos(a) * rr, Math.sin(a) * rr * squash]
          return [c[0] + u * Math.cos(tilt) - v * Math.sin(tilt), c[1] + u * Math.sin(tilt) + v * Math.cos(tilt)]
        })
        // Its whole shore, bays and all, must lie within the place.
        if (poly.some((q) => !inside(q, fine))) continue
        pools.push({ c, r, poly })
      }
    }
    lakes.push(...pools.map((p) => ({ ...p, region: i })))
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
          || pools.some((p) => Math.hypot(p.c[0] - spot[0], p.c[1] - spot[1]) < p.r + 22)
        if (inside(spot, fine) && inside([spot[0], spot[1] + 14], fine) && !lettered(spot) && !crowded) break
      }
      const built = s.built?.find((b) => b.id === sid && b.tool === 'settlement')
      sites.push({ id: sid, name: s.names[sid], x: r1(spot[0]), y: r1(spot[1]), kind: marks.get(sid)!, ...(built ? { rank: typeKey(built.rolls) ?? 'town' } : {}) })
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
      if (pools.some((q) => Math.hypot(p[0] - q.c[0], p[1] - q.c[1]) < q.r + 12)) continue
      if (symbols.some((q) => Math.hypot(p[0] - q.x, p[1] - q.y) < 24)) continue
      symbols.push({ x: r1(p[0]), y: r1(p[1]), k: r1(0.85 + rng() * 0.4) })
    }

    return {
      id, name: s.names[id], terrain, d: pathOf(fine), points: fine, x: r1(cx), y: r1(cy),
      colour: washFor(base, theme), glyph, symbols: symbols.sort((a, b) => a.y - b.y), sites,
    }
  })

  // Trim the sheet: an even border of sea on each open side, and on a side with a neighbouring world, far
  // enough out that its land runs off the edge.
  const all = regions.flatMap((r) => r.points)
  // Each open side gets a sea of its own width: some a narrow strait's worth, some a broad ocean.
  const sea = () => 64 + rng() * rng() * 330
  const box = { x0: Math.min(...all.map((p) => p[0])) - sea(), y0: Math.min(...all.map((p) => p[1])) - sea() - 26, x1: Math.max(...all.map((p) => p[0])) + sea(), y1: Math.max(...all.map((p) => p[1])) + sea() }
  outer.forEach((b, n) => {
    const [cx, cy] = outerAt[n], cut = typical * 0.32
    if (b.side === 'north') box.y0 = Math.min(Math.min(...all.map((p) => p[1])) - 40, cy - cut)
    if (b.side === 'south') box.y1 = Math.max(Math.max(...all.map((p) => p[1])) + 40, cy + cut)
    if (b.side === 'west') box.x0 = Math.min(Math.min(...all.map((p) => p[0])) - 40, cx - cut)
    if (b.side === 'east') box.x1 = Math.max(Math.max(...all.map((p) => p[0])) + 40, cx + cut)
  })
  // The land of each neighbouring world: a band along the whole of its edge of the sheet, corners and all,
  // with an uneven shore, swelling inward opposite its centre until it runs under the places it borders.
  // Two neighbours on adjoining sides overlap in the corner between them, so no corner is left to the sea.
  const lands = outerAt.map((c, n) => {
    const side = outer[n].side
    const flat = side === 'north' || side === 'south'
    // `edgeAt` is where the sheet ends on this side, `sign` points from there into the sheet.
    const edgeAt = side === 'north' ? box.y0 : side === 'south' ? box.y1 : side === 'west' ? box.x0 : box.x1
    const sign = side === 'north' || side === 'west' ? 1 : -1
    const [from, to] = flat ? [box.x0 - 80, box.x1 + 80] : [box.y0 - 80, box.y1 + 80]
    const centre = flat ? c[0] : c[1]
    const swell = Math.abs((flat ? c[1] : c[0]) - edgeAt) + typical * 0.72
    const phase = rng() * 50
    const steps = Math.round((to - from) / 12)
    const shore = Array.from({ length: steps + 1 }, (_, k): P => {
      const at = from + ((to - from) * k) / steps
      const depth = 44 + 120 * edge(phase + at / 150, n * 3.7 + 1) + swell * Math.exp(-(((at - centre) / (typical * 1.15)) ** 2))
      return flat ? [at, edgeAt + sign * depth] : [edgeAt + sign * depth, at]
    })
    // Closed far outside the sheet, so that only the shore is ever seen.
    const out = (p: P): P => (flat ? [p[0], edgeAt - sign * 400] : [edgeAt - sign * 400, p[1]])
    return [out(shore[0]), ...shore, out(shore[shore.length - 1])]
  })

  // Rivers. Each rises inside a place and runs to that place's own stretch of open coast, or failing that to its
  // lake; a lake near the coast drains to the sea. A river keeps to its place and stays clear of the lettering.
  // Where each place lies, to rule most of them out at a glance.
  const boxes = regions.map((r) => { const xs = r.points.map((p) => p[0]), ys = r.points.map((p) => p[1]); return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] })
  const inPlace = (p: P, j: number) => p[0] >= boxes[j][0] && p[0] <= boxes[j][2] && p[1] >= boxes[j][1] && p[1] <= boxes[j][3] && inside(p, regions[j].points)
  const coastOf = regions.map((r, i) => r.points.filter((p, k) => {
    if (k % 3) return false
    const out = Math.hypot(p[0] - r.x, p[1] - r.y) || 1
    const beyond: P = [p[0] + ((p[0] - r.x) / out) * 14, p[1] + ((p[1] - r.y) / out) * 14]
    return !regions.some((_, j) => inPlace(beyond, j)) && !lands.some((l) => inside(beyond, l))
  }))
  const rivers: P[][] = []
  const riverHome: number[] = []
  // A river may now cross from place to place on its way down, so what it must keep clear of is everything on the map.
  const onLand = (p: P) => regions.some((_, j) => inPlace(p, j))
  const letteredAt = (p: P) => regions.some((o) => Math.abs(p[0] - o.x) < 76 && p[1] > o.y - 54 && p[1] < o.y + 24)
  const marked = regions.flatMap((o) => o.sites)
  const shores = coastOf.flatMap((list, j) => list.map((p) => ({ p, j })))
  regions.forEach((r, i) => {
    const pool = lakes.find((l) => l.region === i)
    if (!shores.length && !pool) return
    if (rng() > (pool ? 0.85 : 0.65)) return
    for (let tries = 0; tries < 36; tries++) {
      // From the lake to the sea where there is both; otherwise from a spring somewhere inland to the sea or the lake.
      const fromLake = !!pool && shores.length > 0 && tries < 12
      const start: P = fromLake ? pool!.c : (() => {
        const a = rng() * Math.PI * 2, d = 20 + rng() * 70
        return [r.x + Math.cos(a) * d, r.y + Math.sin(a) * d * 0.8] as P
      })()
      if (!inside(start, r.points) || (!fromLake && letteredAt(start))) continue
      // How far it means to run: anything from a short stream to a river that crosses several places.
      const want = 70 + rng() * 620
      const far = (q: P) => Math.hypot(q[0] - start[0], q[1] - start[1])
      // The mouth is the best of a handful of stretches of coast picked at random: the one nearest the length it means to run.
      const mouth = shores.length ? Array.from({ length: 24 }, () => shores[Math.floor(rng() * shores.length)]).sort((p, q) => Math.abs(far(p.p) - want) - Math.abs(far(q.p) - want))[0] : undefined
      const end: P = mouth ? mouth.p : pool!.c
      const len = far(end)
      if (len < 46 || len > 760) continue
      const [nx, ny] = [-(end[1] - start[1]) / len, (end[0] - start[0]) / len]
      const sway = (rng() - 0.5) * 2, phase = rng() * 20
      const steps = Math.max(8, Math.round(len / 11))
      const line = Array.from({ length: steps + 1 }, (_, k): P => {
        const t = k / steps, pin = Math.sin(t * Math.PI)
        // Bends laid over each other, pinned at both ends; a long river winds more than a short one.
        const off = pin * (Math.min(len, 320) * 0.13 * sway + (edge(phase + t * (3.2 + len / 160), i * 1.7) - 0.5) * 38) + Math.sin(t * Math.PI * (3 + Math.round(len / 150)) + phase) * 6 * pin
        return [start[0] + (end[0] - start[0]) * t + nx * off, start[1] + (end[1] - start[1]) * t + ny * off]
      })
      const body = line.slice(fromLake ? Math.ceil((pool!.r * 0.8) / 11) : 0, mouth ? line.length - 1 : line.length - Math.ceil((pool!.r * 0.8) / 11))
      if (body.length < 5) continue
      // It keeps to the land, clear of every name and mark, and runs through no lake but the one it leaves or feeds.
      if (body.some((p) => letteredAt(p) || !onLand(p) || marked.some((m) => Math.hypot(m.x - p[0], m.y - p[1]) < 12)
        || lakes.some((l) => l !== pool && Math.hypot(l.c[0] - p[0], l.c[1] - p[1]) < l.r + 8))) continue
      // The mouth runs on a little past the shore, so that the river opens into the sea.
      if (mouth) { const o = regions[mouth.j], out = Math.hypot(end[0] - o.x, end[1] - o.y) || 1; body.push(end, [end[0] + ((end[0] - o.x) / out) * 7, end[1] + ((end[1] - o.y) / out) * 7]) }
      rivers.push(body)
      riverHome.push(i)
      break
    }
  })
  // Nothing is drawn standing in a river.
  const wetAt = (x: number, y: number) => rivers.some((line) => line.some((p) => Math.hypot(p[0] - x, p[1] - y) < 9))
  for (const r of regions) r.symbols = r.symbols.filter((p) => !wetAt(p.x, p.y))

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

  const tx = -box.x0, ty = -box.y0
  const moved = regions.map((r) => {
    const points = r.points.map(([x, y]): P => [x + tx, y + ty])
    return {
      ...r, points, d: pathOf(points), x: r1(r.x + tx), y: r1(r.y + ty),
      symbols: r.symbols.map((p) => ({ ...p, x: r1(p.x + tx), y: r1(p.y + ty) })),
      sites: r.sites.map((p) => ({ ...p, x: r1(p.x + tx), y: r1(p.y + ty) })),
    }
  })
  const at = ([x, y]: P) => `${r1(x + tx)} ${r1(y + ty)}`
  // Names for the water, each made from the setting's seed in the tongue of the place it lies in.
  const waterName = (kind: 'lake' | 'river', region: number) => {
    const made = rngFrom(`${s.seed}:${s.id}:${kind}:${roots[region]}`)
    const tongue = TONGUES[s.specs[roots[region]]?.tongue ?? 0] ?? TONGUES[0]
    const w = tongue.word(made)
    const forms = kind === 'lake' ? [`Lake ${w}`, `${w} Mere`, `${w} Water`, `Lake ${w}`, `${w} Tarn`] : [`River ${w}`, `the ${w}`, `${w} Run`, `River ${w}`, `${w} Water`]
    return forms[Math.floor(made() * forms.length)]
  }
  const lakePaths = lakes.map((l) => ({
    d: `M${l.poly.map(at).join('L')}Z`, name: waterName('lake', l.region),
    x: r1(l.c[0] + tx), y: r1(Math.max(...l.poly.map((p) => p[1])) + ty + 9),
  }))
  const riverPaths = rivers.map((line, n) => {
    // The name is set along the middle of the river, read from left to right whichever way the water runs.
    const stretch = line.slice(Math.floor(line.length * 0.12), Math.ceil(line.length * 0.88))
    const read = stretch[0][0] <= stretch[stretch.length - 1][0] ? stretch : [...stretch].reverse()
    return { d: `M${line.map(at).join('L')}`, name: waterName('river', riverHome[n]), along: `M${read.map(at).join('L')}` }
  })
  const shifted = routes.map((r) => ({ ...r, d: r.d.replace(/(-?[\d.]+) (-?[\d.]+)/g, (_, x: string, y: string) => `${r1(+x + tx)} ${r1(+y + ty)}`) }))
  const width = box.x1 - box.x0
  const height = box.y1 - box.y0

  // Neighbouring worlds: the land of each as it falls on the sheet, and its name where that land is roomiest.
  const [W, H] = [Math.round(width), Math.round(height)]
  const ours = moved.flatMap((r) => r.points.filter((_, k) => k % 6 === 0))
  // Where each place lies, to rule most of them out at a glance.
  const spans = moved.map((r) => { const xs = r.points.map((p) => p[0]), ys = r.points.map((p) => p[1]); return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] })
  const beyond = outer.map((b, n) => {
    const land = lands[n].map(([x, y]): P => [x + tx, y + ty])
    // Lettered across for a neighbour above or below and up the side for one to the left or right. The name goes
    // where its land is roomiest on the sheet: clear of this world's places and far enough from the sheet's
    // corners that the whole of it shows.
    const turn = b.side === 'west' ? -90 : b.side === 'east' ? 90 : 0
    const half = s.names[b.id].length * 6.4 + 12
    const rim = land.filter((_, k) => k % 2 === 0)
    let best: P = [W / 2, H / 2], room = -1
    for (let gx = 22; gx < W - 20; gx += 22) for (let gy = 22; gy < H - 20; gy += 22) {
      // Along its own line of lettering it needs half its length each way; across it, only a little.
      if (turn ? gy < half + 14 || gy > H - half - 14 : gx < half + 14 || gx > W - half - 14) continue
      const p: P = [gx, gy]
      if (!inside(p, land) || moved.some((r, k) => gx >= spans[k][0] && gx <= spans[k][2] && gy >= spans[k][1] && gy <= spans[k][3] && inside(p, r.points))) continue
      const d = Math.min(
        ...rim.map((q) => Math.hypot(p[0] - q[0], p[1] - q[1])), ...ours.map((q) => Math.hypot(p[0] - q[0], p[1] - q[1])),
        turn ? Math.min(gx, W - gx) : Math.min(gy, H - gy),
      )
      if (d > room) { room = d; best = p }
    }
    return { id: b.id, name: s.names[b.id], x: r1(best[0]), y: r1(best[1]), turn, d: pathOf(land) }
  })
  // The seas, lettered along the open edges: across the top and bottom, and up the two sides.
  const edgeSpot: Record<string, [number, number, number]> = { north: [W / 2, 40, 0], south: [W / 2, H - 28, 0], east: [W - 36, H / 2, 90], west: [36, H / 2, -90] }
  const seas = seasOf(s).map((x) => ({ name: x.name, x: r1(edgeSpot[x.side][0]), y: r1(edgeSpot[x.side][1]), turn: edgeSpot[x.side][2] }))
  const [px, label] = MILES[s.answers.size] ?? MILES.country
  return { beyond, seas, w: Math.round(width), h: Math.round(height), regions: moved, routes: shifted, lakes: lakePaths, rivers: riverPaths, scale: { px, label }, theme }
}

export const siteKind = (s: Setting, id: string) => cueText(CARDS, s.board[id])

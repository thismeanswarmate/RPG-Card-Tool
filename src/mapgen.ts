// Draws a setting as a map. Nothing here is random at view time: the land, its coast, the symbols on it
// and the routes across it all come from the setting and its seed, so the same setting always draws the
// same map, and the map always matches what the text says.
//
// The land comes first. The ground is worked out over a grid: highest at the centre of each place, falling
// away with distance and roughened by noise, and the coast is wherever it drops below the sea. Places are
// then the parts of that land nearest each centre, so neighbours meet along shared borders, and the worlds
// beyond are land that carries on off the sheet. What kind of country a place is shapes it: islands are
// broken up, an atoll rings a lagoon, marsh is full of pools, rugged coasts are deeply cut.

import { typeKey } from './settlement'
import { EXPANSION_COLORS } from './expansions'
import { cueText, rootOf, subtree } from './logic'
import { rngFrom, type Rng , TONGUES } from './names'
import { rootsOf, terrainOf, type Setting , beyondOf, seasOf } from './setting'
import { landOf } from './terrain'
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
  [/asteroid|derelict|ash|crater|salt|dry lake|stony|methane/, 'crater'],
  [/ice|glacier|tundra|snow|frozen|permafrost/, 'snow'],
  // Marks are drawn on land, so the sea's own lands take the mark of what grows or lies on them.
  [/kelp|drowned|lagoon|marsh|fen|floodplain|estuary|tidal|wetland|delta|oasis|moor|bog|swamp/, 'reed'],
  [/shoal|dune|erg|desert|wadi/, 'dune'],
  [/forest|wood|taiga|mangrove|canopy|jungle/, 'tree'],
  [/mountain|peak|highland|caldera|plateau|mesa|cliff|steps|karst|canyon|rift|badland|valley|headland|cave|fjord/, 'peak'],
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
  beyond: { id: string; name: string; x: number; y: number; /** A quarter turn for a name set up one of the two sides. */ turn: number; d: string; /** A thin scatter of marks, so that it reads as country. */ symbols: { x: number; y: number }[] }[]
  theme: 'parchment' | 'blueprint'
}

const SCALE = 0.4

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

/** Trace the outlines of every patch of one owner on the grid: each as a closed run of grid corners, with its area (negative for a hole). */
function loopsOf(own: Int16Array, cols: number, rows: number, label: number): { pts: P[]; area: number }[] {
  const is = (x: number, y: number) => x >= 0 && y >= 0 && x < cols && y < rows && own[y * cols + x] === label
  const key = (x: number, y: number) => y * (cols + 1) + x
  // Every side of a cell that faces something else, as a step along it with the cell on the right hand.
  const next = new Map<number, number[]>()
  const add = (x0: number, y0: number, x1: number, y1: number) => { const k = key(x0, y0); const list = next.get(k); if (list) list.push(key(x1, y1)); else next.set(k, [key(x1, y1)]) }
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    if (own[y * cols + x] !== label) continue
    if (!is(x, y - 1)) add(x, y, x + 1, y)
    if (!is(x + 1, y)) add(x + 1, y, x + 1, y + 1)
    if (!is(x, y + 1)) add(x + 1, y + 1, x, y + 1)
    if (!is(x - 1, y)) add(x, y + 1, x, y)
  }
  const out: { pts: P[]; area: number }[] = []
  for (const [start, list] of next) {
    while (list.length) {
      const pts: P[] = []
      let at = start, to = list.pop()!, from = -1
      for (let guard = 0; guard < 200000; guard++) {
        pts.push([at % (cols + 1), Math.floor(at / (cols + 1))])
        from = at; at = to
        if (at === start) break
        const options = next.get(at)
        if (!options?.length) break
        // Where two patches touch at a corner, turn toward the cell being walked round, so each stays a loop of its own.
        let pick = 0
        if (options.length > 1) {
          const [dx, dy] = [(at % (cols + 1)) - (from % (cols + 1)), Math.floor(at / (cols + 1)) - Math.floor(from / (cols + 1))]
          const turn = (o: number) => { const [ex, ey] = [(o % (cols + 1)) - (at % (cols + 1)), Math.floor(o / (cols + 1)) - Math.floor(at / (cols + 1))]; return dx * ey - dy * ex }
          pick = options.reduce((best, o, k) => (turn(o) > turn(options[best]) ? k : best), 0)
        }
        to = options.splice(pick, 1)[0]
      }
      let area = 0
      for (let k = 0; k < pts.length; k++) { const q = pts[(k + 1) % pts.length]; area += pts[k][0] * q[1] - q[0] * pts[k][1] }
      if (pts.length > 3) out.push({ pts, area: area / 2 })
    }
  }
  return out
}

/**
 * Turn a stepped outline on the grid into a smooth one. The outline is taken through the middle of every step
 * instead of its corners, which lays a slanting staircase out as a straight slope; the points along straight
 * runs are then dropped and every corner rounded twice. Two places that share a border walk the same steps,
 * so they get the same line.
 */
function smooth(loop: P[], g: number, pad: number): P[] {
  const mids = loop.map((p, k): P => { const q = loop[(k + 1) % loop.length]; return [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2] })
  let pts = mids.filter((p, k) => {
    const a = mids[(k + mids.length - 1) % mids.length], b = mids[(k + 1) % mids.length]
    return Math.abs((p[0] - a[0]) * (b[1] - p[1]) - (p[1] - a[1]) * (b[0] - p[0])) > 1e-9
  }).map(([x, y]): P => [(x - pad) * g, (y - pad) * g])
  if (pts.length < 3) pts = mids.map(([x, y]): P => [(x - pad) * g, (y - pad) * g])
  for (let pass = 0; pass < 2; pass++) pts = pts.flatMap((p, k): P[] => {
    const q = pts[(k + 1) % pts.length]
    return [[p[0] * 0.75 + q[0] * 0.25, p[1] * 0.75 + q[1] * 0.25], [p[0] * 0.25 + q[0] * 0.75, p[1] * 0.25 + q[1] * 0.75]]
  })
  // Long outlines are thinned, to keep later work on them quick.
  const keep = pts.length > 240 ? Math.ceil(pts.length / 190) : 1
  return keep > 1 ? pts.filter((_, k) => k % keep === 0) : pts
}

export function buildMap(s: Setting): MapData {
  const rng: Rng = rngFrom(`${s.seed}:map`)
  const roots = rootsOf(s)
  const N = roots.length
  const raw = roots.map((r): P => [s.board[r].x * SCALE, s.board[r].y * SCALE])
  // How far apart places usually lie. A place alone on the map has no neighbour to measure against.
  const gaps = raw.map((p, i) => Math.min(520 * SCALE * (N > 1 ? Infinity : 1), ...raw.filter((_, j) => j !== i).map((q) => Math.hypot(p[0] - q[0], p[1] - q[1]))))
  const spacing = [...gaps].sort((a, b) => a - b)[Math.floor(gaps.length / 2)] || 220
  // Nudge every centre off the grid it was laid out on, so that borders do not fall into a honeycomb.
  const nudged = raw.map(([x, y]): P => {
    const a = rng() * Math.PI * 2, r = spacing * (0.08 + rng() * 0.16)
    return [x + Math.cos(a) * r, y + Math.sin(a) * r]
  })
  const nearest = nudged.map((p, i) => Math.min(N > 1 ? Infinity : 520 * SCALE, ...nudged.filter((_, j) => j !== i).map((q) => Math.hypot(p[0] - q[0], p[1] - q[1]))))
  const typical = [...nearest].sort((a, b) => a - b)[Math.floor(nearest.length / 2)] || 260
  const theme = s.answers.genres[0] === 'scifi' ? 'blueprint' : 'parchment'
  const terrains = roots.map((id) => terrainOf(s, id))
  const kinds = terrains.map(landOf)

  // How much room each place takes: busier places — more sites, powers and people — are larger, with a
  // little chance on top. A border between two places sits nearer the smaller one.
  const busy = (root: string) => {
    const within = new Set(subtree(s.board, root))
    return subtree(s.board, root).filter((x) => CARDS[x].type === 'site').length * 0.3
      + [...s.entities, ...s.people].filter((e) => e.home && within.has(e.home)).length * 0.14
  }
  const loads = roots.map(busy)
  const mean = loads.reduce((a, b) => a + b, 0) / loads.length || 1
  const weight = loads.map((v) => Math.min(2.1, Math.max(0.45, (0.5 + (0.5 * v) / mean) * Math.exp((rng() - 0.45) * 1.25))))

  // Neighbouring worlds: each has a centre of its own out past the last places on its side, so that it shares
  // a border with them like any other place.
  const OUT: Record<string, P> = { north: [0, -1], east: [1, 0], south: [0, 1], west: [-1, 0] }
  const outer = beyondOf(s)
  const mid: P = [nudged.reduce((a, p) => a + p[0], 0) / N, nudged.reduce((a, p) => a + p[1], 0) / N]
  const outerRaw = outer.map((b): P => {
    const d = OUT[b.side]
    const far = Math.max(...nudged.map((p) => (p[0] - mid[0]) * d[0] + (p[1] - mid[1]) * d[1]))
    return [mid[0] + d[0] * (far + typical * 1.05), mid[1] + d[1] * (far + typical * 1.05)]
  })

  // The sheet is a window onto the land. On an open side it reaches out past the last places by a sea of its
  // own width; on a side with a neighbouring world it stops a little beyond that world's centre, so the land runs off it.
  const sea = () => typical * (1.5 + rng() * rng() * 1.6)
  const box = { x0: Math.min(...nudged.map((p) => p[0])) - sea(), y0: Math.min(...nudged.map((p) => p[1])) - sea() - 20, x1: Math.max(...nudged.map((p) => p[0])) + sea(), y1: Math.max(...nudged.map((p) => p[1])) + sea() }
  outer.forEach((b, n) => {
    const [ox, oy] = outerRaw[n], cut = typical * 0.3
    if (b.side === 'north') box.y0 = oy - cut
    if (b.side === 'south') box.y1 = oy + cut
    if (b.side === 'west') box.x0 = ox - cut
    if (b.side === 'east') box.x1 = ox + cut
  })
  const W = Math.round(box.x1 - box.x0), H = Math.round(box.y1 - box.y0)
  const pts = nudged.map(([x, y]): P => [x - box.x0, y - box.y0])
  const outerAt = outerRaw.map(([x, y]): P => [x - box.x0, y - box.y0])
  const centres = [...pts, ...outerAt]

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

  const seed = Math.floor(rng() * 1e6)
  const edge = noise(seed), dx = noise(seed + 1), dy = noise(seed + 2), rough = noise(seed + 3), broken = noise(seed + 4)
  // One smooth field bends everything alike: a broad swell, a middling wobble and a fine tremor.
  const warp = (f: (x: number, y: number) => number, x: number, y: number) =>
    (f(x / 150, y / 150) - 0.5) * 96 + (f(x / 62 + 9, y / 62 + 9) - 0.5) * 52 + (f(x / 24 + 3, y / 24 + 3) - 0.5) * 16

  // THE LAND. The ground is worked out first, over a grid a little finer than a symbol: each cell is land or
  // sea, and if land, whose. A place's land is highest at its centre and falls away with distance; where
  // that height, roughened by noise, drops below the sea, the coast is. Places are then simply the parts of
  // the land nearest each centre. Neighbouring worlds are land in from their edge of the sheet.
  // The grid runs a few cells past the sheet on every side, so that land which leaves the sheet does so cleanly.
  const g = 8, PADC = 4, cols = Math.ceil(W / g) + PADC * 2, rows = Math.ceil(H / g) + PADC * 2
  const own = new Int16Array(cols * rows).fill(-1)
  // Water that is meant to be there — a lagoon behind its spit — and is not to be closed up as a stray hole.
  const meant = new Uint8Array(cols * rows)
  const span = pts.map((_, i) => typical * (1.02 + 0.16 * (weight[i] - 1)))
  const depthOf = outer.map(() => typical * (0.5 + rng() * 0.7))
  // Which way the open sea lies from each place: out from the middle of the world, turned to a side that no
  // neighbouring world holds. A ring opens that way, and a lagoon lies on that coast.
  const worldMid: P = [pts.reduce((a, p) => a + p[0], 0) / N, pts.reduce((a, p) => a + p[1], 0) / N]
  const openSides = Object.entries(OUT).filter(([side]) => !outer.some((b) => b.side === side)).map(([, d]) => d)
  const gapAt = kinds.map((_, i) => {
    const any = rng() * Math.PI * 2
    const v: P = [pts[i][0] - worldMid[0], pts[i][1] - worldMid[1]], len = Math.hypot(v[0], v[1])
    if (N < 2 || len < 1) return any
    if (!openSides.length || openSides.length === 4) return Math.atan2(v[1], v[0])
    const best = openSides.reduce((a, d) => (d[0] * v[0] + d[1] * v[1] > a[0] * v[0] + a[1] * v[1] ? d : a))
    return Math.atan2(best[1] + 0.35 * v[1] / len, best[0] + 0.35 * v[0] / len)
  })
  const SEA = 0.12
  for (let cy = 0; cy < rows; cy++) for (let cx = 0; cx < cols; cx++) {
    const x0 = (cx - PADC) * g + g / 2, y0 = (cy - PADC) * g + g / 2
    const x = x0 + warp(dx, x0, y0), y = y0 + warp(dy, x0, y0)
    // Whose ground this would be: the centre with the least "power", ours and the neighbours' alike.
    let near = 0, least = Infinity, nearOurs = 0, leastOurs = Infinity, height = -Infinity, next = Infinity, nextAt = 0
    for (let i = 0; i < centres.length; i++) {
      const d2 = (x - centres[i][0]) ** 2 + (y - centres[i][1]) ** 2, power = d2 - radius[i] ** 2
      if (power < least) { next = least; nextAt = near; least = power; near = i } else if (power < next) { next = power; nextAt = i }
      if (i < N) {
        if (power < leastOurs) { leastOurs = power; nearOurs = i }
        height = Math.max(height, 1 - Math.sqrt(d2) / span[i])
      }
    }
    const kind = kinds[nearOurs]
    const dist = Math.hypot(x - pts[nearOurs][0], y - pts[nearOurs][1]) / span[nearOurs]
    // The coast: noise counts for most where the land is low, and for little well inland, so the heart of a
    // place is always dry and its edge is cut into bays and headlands, deeper for rugged country.
    // Three scales of roughness: great gulfs and capes, then bays and headlands, then coves.
    const cut = 0.55 * (rough(x / 210 + 3, y / 210 + 3) - 0.5) + (0.55 + 0.7 * kind.rugged) * (rough(x / 92, y / 92) - 0.5) + (0.2 + 0.25 * kind.rugged) * (rough(x / 36 + 7, y / 36 + 7) - 0.5)
    let ground = height + cut * Math.min(1.5, Math.max(0.08, 1 - height * 1.5))
    if (kind.shape === 'isles') {
      // A scatter of islands: the place's ground is broken up by a second, tighter noise, leaving a core island and others round it.
      // How far this cell lies inside the place's own ground, from the border with whoever is next nearest.
      const inFromBorder = near !== nearOurs ? 0 : next === Infinity ? Infinity : (next - least) / (2 * Math.hypot(centres[near][0] - centres[nextAt][0], centres[near][1] - centres[nextAt][1]) || 1)
      // Open water lies all round the group, so that it stands off from the mainland and never joins it.
      const moat = inFromBorder < 30
      // Small islets for shoals and reefs, long thin ones for a barrier chain.
      const grain = kind.grain ?? 31
      const core = grain < 25 ? 0.07 : 0.13
      ground = moat ? -1 : dist < core ? 1 : Math.min(ground, (broken(x / (kind.long ? grain * 2.6 : grain), y / (kind.long ? grain * 0.6 : grain)) - (grain < 25 ? 0.72 : 0.6)) * 2.4 + (1 - dist) * (grain < 25 ? 0.12 : 0.3))
    } else if (kind.shape === 'ring') {
      // A ring of land round a lagoon, open to the sea on one side.
      const a = Math.atan2(y - pts[nearOurs][1], x - pts[nearOurs][0])
      const open = Math.abs(Math.atan2(Math.sin(a - gapAt[nearOurs]), Math.cos(a - gapAt[nearOurs]))) < 0.42
      const width = kind.ringWidth ?? 0.17
      ground = open ? -1 : SEA + (width - Math.abs(dist - 0.5 - width * 0.3)) * 2.4 + 0.22 * (rough(x / 40, y / 40) - 0.5)
    }
    if (kind.lagoon) {
      // A lagoon: a broad sheltered water on the seaward side, shut in by a spit of land with one narrow mouth,
      // and open sea beyond the spit.
      const s0 = span[nearOurs], ca = Math.cos(gapAt[nearOurs]), sa = Math.sin(gapAt[nearOurs])
      const px = x - pts[nearOurs][0], py = y - pts[nearOurs][1]
      const u = (px * ca + py * sa) / s0 - 0.47, v = (-px * sa + py * ca) / s0
      const wob = 0.16 * (rough(x / 60 + 5, y / 60 + 5) - 0.5)
      const e = Math.hypot(u / 0.19, v / 0.4) + wob
      if (e < 1) { ground = -1; meant[cy * cols + cx] = 1 }
      else if (u > -0.05 && e < 1.42) { if (Math.abs(v - 0.12) < 26 / s0) { ground = -1; meant[cy * cols + cx] = 1 } else ground = Math.max(ground, SEA + 0.2) }
      else if (u > 0 && Math.abs(v) < 0.62) ground = -1
    }
    // Fjords: thin winding arms of the sea, cut along the low lines of a second noise, reaching in from the coast.
    if (kind.inlets && height < 0.78) {
      const line = Math.abs(broken(x / 70 + 11, y / 70 + 11) - 0.5)
      if (line < 0.045) ground = Math.min(ground, SEA - 0.2 + line * 6)
    }
    if (dist < (kind.shape === 'isles' ? ((kind.grain ?? 31) < 25 ? 0.07 : 0.13) : 0.16) && kind.shape !== 'ring') ground = 1
    // A neighbouring world's land: in from its edge to an uneven depth, with the same rough coast.
    let band = -Infinity, bandOf = -1
    outer.forEach((b, n) => {
      const flat = b.side === 'north' || b.side === 'south'
      const inFrom = b.side === 'north' ? y : b.side === 'south' ? H - y : b.side === 'west' ? x : W - x
      const along = flat ? x : y
      // Its depth swings widely along the edge, so that it comes in as capes and falls back into gulfs.
      const depth = depthOf[n] * (0.2 + 1.9 * edge(along / 300 + n * 9.1, n * 3.3 + 1) ** 1.4)
      // At both ends of its edge it holds the corner of the sheet, so that no corner beside a neighbour is left to the sea.
      const end = Math.min(along, (flat ? W : H) - along)
      const h = end < 110 && inFrom < 110 - end * 0.5 ? 1 : (1 - inFrom / depth) * 0.6 + cut * 0.9
      if (h > band) { band = h; bandOf = n }
    })
    // An open side always keeps a strip of sea along the edge of the sheet.
    const open = (side: string) => !outer.some((b) => b.side === side)
    if ((y0 < 40 && open('north')) || (y0 > H - 40 && open('south')) || (x0 < 40 && open('west')) || (x0 > W - 40 && open('east'))) ground = -1
    if (ground > SEA) own[cy * cols + cx] = near < N ? nearOurs : near
    else if (band > SEA) own[cy * cols + cx] = N + bandOf
  }

  // No sea is left shut in: water that the open sea cannot reach becomes the land of whoever is nearest. The sea
  // comes in from the edges of the sheet through open water only — cells with water on every side — so a strait
  // one cell wide does not count as a way through, and what lies behind it is closed up too.
  const reached = new Uint8Array(cols * rows), stack: number[] = []
  const water = (x: number, y: number) => x < 0 || y < 0 || x >= cols || y >= rows || own[y * cols + x] < 0
  const openWater = (x: number, y: number) => { for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) if (!water(x + ox, y + oy)) return false; return true }
  const wade = (x: number, y: number) => { const k = y * cols + x; if (x >= 0 && y >= 0 && x < cols && y < rows && !reached[k] && openWater(x, y)) { reached[k] = 1; stack.push(k) } }
  for (let x = 0; x < cols; x++) { wade(x, 0); wade(x, rows - 1) }
  for (let y = 0; y < rows; y++) { wade(0, y); wade(cols - 1, y) }
  while (stack.length) {
    const k = stack.pop()!, x = k % cols, y = (k - x) / cols
    wade(x - 1, y); wade(x + 1, y); wade(x, y - 1); wade(x, y + 1)
  }
  // The fringe of water along a reached shore is sea as well.
  const fringe = new Uint8Array(cols * rows)
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const k = y * cols + x
    if (own[k] < 0 && !reached[k] && ((x > 0 && reached[k - 1]) || (x < cols - 1 && reached[k + 1]) || (y > 0 && reached[k - cols]) || (y < rows - 1 && reached[k + cols]))) fringe[k] = 1
  }
  for (let k = 0; k < fringe.length; k++) if (fringe[k]) reached[k] = 1
  // A lagoon is kept only where it does open on the sea: its water is followed in from the reached sea, and
  // any of it that the sea never gets to is closed up like any other hole.
  const joined = new Uint8Array(cols * rows), todo: number[] = []
  for (let k = 0; k < meant.length; k++) if (meant[k] && own[k] < 0 && reached[k]) { joined[k] = 1; todo.push(k) }
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const k = y * cols + x
    if (meant[k] && own[k] < 0 && !joined[k] && ((x > 0 && reached[k - 1]) || (x < cols - 1 && reached[k + 1]) || (y > 0 && reached[k - cols]) || (y < rows - 1 && reached[k + cols]))) { joined[k] = 1; todo.push(k) }
  }
  while (todo.length) {
    const k = todo.pop()!, x = k % cols, y = (k - x) / cols
    for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
      const n = ny * cols + nx
      if (nx >= 0 && ny >= 0 && nx < cols && ny < rows && meant[n] && own[n] < 0 && !joined[n]) { joined[n] = 1; todo.push(n) }
    }
  }
  for (let k = 0; k < meant.length; k++) meant[k] = joined[k]
  for (let k = 0; k < own.length; k++) {
    if (own[k] >= 0 || reached[k] || meant[k]) continue
    const x = ((k % cols) - PADC) * g + g / 2, y = (Math.floor(k / cols) - PADC) * g + g / 2
    let near = 0, least = Infinity
    centres.forEach((c, i) => { const power = (x - c[0]) ** 2 + (y - c[1]) ** 2 - radius[i] ** 2; if (power < least) { least = power; near = i } })
    own[k] = near
  }
  const ownerAt = (x: number, y: number) => {
    const cx = Math.floor(x / g) + PADC, cy = Math.floor(y / g) + PADC
    return cx < 0 || cy < 0 || cx >= cols || cy >= rows ? -1 : own[cy * cols + cx]
  }
  const onLand = (p: P) => { const o = ownerAt(p[0], p[1]); return o >= 0 && o < N }

  const lakes: { c: P; r: number; poly: P[]; region: number }[] = []
  const regions = roots.map((id, i): MapRegion => {
    // The place's outline: its largest patch of land, with any islands it holds besides.
    const patches = loopsOf(own, cols, rows, i).filter((l) => l.area > 2).sort((a, b) => b.area - a.area)
    const fine = patches.length ? smooth(patches[0].pts, g, PADC) : Array.from({ length: 16 }, (_, k): P => [pts[i][0] + Math.cos(k / 16 * Math.PI * 2) * 30, pts[i][1] + Math.sin(k / 16 * Math.PI * 2) * 30])
    const isles = patches.slice(1).map((l) => smooth(l.pts, g, PADC))
    // The name goes at the roomiest spot in the region, wherever its shape has left that.
    const [cx, cy] = heart(fine)
    const terrain = terrains[i]
    const kind = kinds[i]

    // Still water, by how wet the country is: none in dry land, a pond or lake in ordinary land, and many in marsh and fen.
    const pools: { c: P; r: number; poly: P[] }[] = []
    // Island groups and rings have the sea for their water; everywhere else it is by how wet the country is.
    const want = kind.shape === 'isles' || kind.shape === 'ring' || kind.lagoon ? 0 : kind.pools ? kind.pools[0] + Math.floor(rng() * (kind.pools[1] - kind.pools[0] + 1)) : kind.wet >= 3 ? 8 + Math.floor(rng() * 5) : kind.wet === 2 ? 1 + Math.floor(rng() * 2) : kind.wet === 1 ? (rng() < 0.4 ? 1 : 0) : 0
    const fxs = fine.map((p) => p[0]), fys = fine.map((p) => p[1])
    const [bx0, by0, bx1, by1] = [Math.min(...fxs), Math.min(...fys), Math.max(...fxs), Math.max(...fys)]
    const close = kind.wet >= 3 ? 0.5 : 1
    for (let tries = 0; tries < 50 + want * 30 && pools.length < want; tries++) {
      const c: P = [bx0 + rng() * (bx1 - bx0), by0 + rng() * (by1 - by0)]
      // Marsh pools are small and many; elsewhere mostly ponds, now and then a broad water.
      const r = (kind.poolSize ? kind.poolSize[0] + rng() * (kind.poolSize[1] - kind.poolSize[0]) : kind.wet >= 3 ? 5 + rng() ** 1.6 * 19 : 10 + rng() ** 1.5 * 46) * (tries < 36 ? 1 : 0.6)
      const room = Array.from({ length: 8 }, (_, k): P => [c[0] + Math.cos((k / 8) * Math.PI * 2) * (r * 1.45 + 8 * close), c[1] + Math.sin((k / 8) * Math.PI * 2) * (r * 1.45 + 8 * close)])
      if (!inside(c, fine) || room.some((p) => !inside(p, fine))) continue
      if (Math.abs(c[0] - cx) < 84 + r && c[1] > cy - 60 - r && c[1] < cy + 30 + r) continue
      if (pools.some((q) => Math.hypot(q.c[0] - c[0], q.c[1] - c[1]) < q.r + r + 14 * close)) continue
      // A rift's lakes are long and narrow; a crater lake is nearly round.
      const tilt = rng() * Math.PI, squash = kind.long ? 0.24 + rng() * 0.12 : kind.poolSize && kind.pools?.[1] === 1 ? 0.85 : 0.42 + rng() * 0.55, phase = rng() * 9, arms = [rng() * Math.PI * 2, rng() * Math.PI * 2]
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
      let found = false
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
        if (inside(spot, fine) && inside([spot[0], spot[1] + 14], fine) && !lettered(spot) && !crowded) { found = true; break }
      }
      // On a small island or among many pools there may be no clear spot: then any dry ground close in will do,
      // and failing that the heart of the place, which is always land.
      if (!found) {
        spot = [cx, cy]
        search: for (const r of [34, 22, 48, 12, 64]) for (let t = 0; t < 12; t++) {
          const b = a + (t / 12) * Math.PI * 2, at: P = [cx + Math.cos(b) * r, cy + Math.sin(b) * r]
          if (inside(at, fine) && !pools.some((p) => Math.hypot(p.c[0] - at[0], p.c[1] - at[1]) < p.r + 6) && !sites.some((q) => Math.hypot(q.x - at[0], q.y - at[1]) < 14)) { spot = at; break search }
        }
      }
      const built = s.built?.find((b) => b.id === sid && b.tool === 'settlement')
      sites.push({ id: sid, name: s.names[sid], x: r1(spot[0]), y: r1(spot[1]), kind: marks.get(sid)!, ...(built ? { rank: typeKey(built.rolls) ?? 'town' } : {}) })
    })

    // Scatter the terrain symbol across the region, clear of the lettering, the sites and each other.
    const symbols: MapRegion['symbols'] = []
    for (let tries = 0; tries < 260 && symbols.length < 26; tries++) {
      const p: P = [bx0 + rng() * (bx1 - bx0), by0 + rng() * (by1 - by0)]
      if (!inside(p, fine) || !inside([p[0], p[1] + 9], fine) || !inside([p[0] - 9, p[1]], fine) || !inside([p[0] + 9, p[1]], fine)) continue
      if (Math.abs(p[0] - cx) < 66 && Math.abs(p[1] - cy) < 28) continue
      if (sites.some((q) => Math.abs(p[0] - q.x) < 58 && Math.abs(p[1] - q.y) < 24)) continue
      if (pools.some((q) => Math.hypot(p[0] - q.c[0], p[1] - q.c[1]) < q.r + 12)) continue
      if (symbols.some((q) => Math.hypot(p[0] - q.x, p[1] - q.y) < 24)) continue
      symbols.push({ x: r1(p[0]), y: r1(p[1]), k: r1(0.85 + rng() * 0.4) })
    }

    return {
      id, name: s.names[id], terrain, d: [fine, ...isles].map(pathOf).join(''), points: fine, x: r1(cx), y: r1(cy),
      colour: washFor(base, theme), glyph, symbols: symbols.sort((a, b) => a.y - b.y), sites,
    }
  })

  // The shore: every cell of a place that has open sea beside it, with the way out to that sea.
  const shores: { p: P; j: number; out: P }[] = []
  for (let cy = 1; cy < rows - 1; cy++) for (let cx = 1; cx < cols - 1; cx++) {
    const j = own[cy * cols + cx]
    if (j < 0 || j >= N || (cx + cy * 3) % 2 || cx < PADC + 2 || cy < PADC + 2 || cx >= cols - PADC - 2 || cy >= rows - PADC - 2) continue
    const out = ([[1, 0], [-1, 0], [0, 1], [0, -1]] as P[]).find(([ox, oy]) => own[(cy + oy) * cols + cx + ox] < 0)
    if (out) shores.push({ p: [(cx - PADC) * g + g / 2, (cy - PADC) * g + g / 2], j, out })
  }

  // Rivers. Each rises inside a place — high country and wet country more often than dry — and runs down to the sea,
  // crossing other places on the way if it must, or failing that to its own lake. It keeps to the land and clear of
  // every name and mark, and runs through no lake but the one it leaves or feeds.
  const rivers: P[][] = []
  const riverHome: number[] = []
  const letteredAt = (p: P) => regions.some((o) => Math.abs(p[0] - o.x) < 76 && p[1] > o.y - 54 && p[1] < o.y + 24)
  const marked = regions.flatMap((o) => o.sites)
  regions.forEach((r, i) => {
    const kind = kinds[i]
    if (kind.shape === 'isles' || kind.shape === 'ring') return
    const pools = lakes.filter((l) => l.region === i)
    if (!shores.length && !pools.length) return
    const chance = kind.river ?? (kind.wet === 0 ? 0.12 : kind.wet >= 3 ? 0.95 : kind.high ? 0.85 : pools.length ? 0.8 : 0.6)
    // Wet country runs with several streams.
    const count = rng() > chance ? 0 : kind.wet >= 3 ? 2 + Math.floor(rng() * 2) : 1
    for (let made = 0, tries = 0; made < count && tries < 60; tries++) {
      const pool = pools.length && tries % 3 === 0 ? pools[Math.floor(rng() * pools.length)] : undefined
      const fromLake = !!pool && shores.length > 0
      const start: P = fromLake ? pool!.c : (() => {
        const a = rng() * Math.PI * 2, d = 20 + rng() * 70
        return [r.x + Math.cos(a) * d, r.y + Math.sin(a) * d * 0.8] as P
      })()
      if (ownerAt(start[0], start[1]) !== i || (!fromLake && letteredAt(start))) continue
      // How far it means to run: anything from a short stream to a river that crosses several places.
      const want = 70 + rng() * 620
      const far = (q: P) => Math.hypot(q[0] - start[0], q[1] - start[1])
      // The mouth is the best of a handful of stretches of coast picked at random: the one nearest the length it means to run.
      const mouth = shores.length ? Array.from({ length: 24 }, () => shores[Math.floor(rng() * shores.length)]).sort((p, q) => Math.abs(far(p.p) - want) - Math.abs(far(q.p) - want))[0] : undefined
      const end: P = mouth ? mouth.p : pools[0].c
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
      const body = line.slice(fromLake ? Math.ceil((pool!.r * 0.8) / 11) : 0, mouth ? line.length - 1 : line.length - Math.ceil((pools[0].r * 0.8) / 11))
      if (body.length < 5) continue
      if (body.some((p) => letteredAt(p) || !onLand(p) || marked.some((m) => Math.hypot(m.x - p[0], m.y - p[1]) < 12)
        || lakes.some((l) => l !== pool && (mouth || l !== pools[0]) && Math.hypot(l.c[0] - p[0], l.c[1] - p[1]) < l.r + 8)
        || rivers.some((other) => other.some((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) < 14)))) continue
      // The mouth runs on a little past the shore, so that the river opens into the sea.
      if (mouth) body.push(end, [end[0] + mouth.out[0] * 9, end[1] + mouth.out[1] * 9])
      rivers.push(body)
      riverHome.push(i)
      made++
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
  const routes = [...pairs.values()].sort((p, q) => length(p) - length(q)).slice(0, Math.ceil(N * 1.1)).map(([a, b]) => {
    const ra = regions[index.get(a)!], rb = regions[index.get(b)!]
    const [ax, ay] = [ra.x, ra.y], [bx, by] = [rb.x, rb.y]
    const len = Math.hypot(bx - ax, by - ay) || 1
    const bend = (edge(ax / 50 + bx / 90, ay / 50 + by / 90) - 0.5) * len * 0.36
    const mx = (ax + bx) / 2 - ((by - ay) / len) * bend, my = (ay + by) / 2 + ((bx - ax) / len) * bend
    return { a, b, d: `M${r1(ax)} ${r1(ay)}Q${r1(mx)} ${r1(my)} ${r1(bx)} ${r1(by)}` }
  })

  // Names for the water, each made from the setting's seed in the tongue of the place it lies in.
  const waterName = (kind: 'lake' | 'river', region: number, n: number) => {
    const made = rngFrom(`${s.seed}:${s.id}:${kind}:${roots[region]}:${n}`)
    const tongue = TONGUES[s.specs[roots[region]]?.tongue ?? 0] ?? TONGUES[0]
    const w = tongue.word(made)
    const forms = kind === 'lake' ? [`Lake ${w}`, `${w} Mere`, `${w} Water`, `Lake ${w}`, `${w} Tarn`] : [`River ${w}`, `the ${w}`, `${w} Run`, `River ${w}`, `${w} Water`]
    return forms[Math.floor(made() * forms.length)]
  }
  const at = ([x, y]: P) => `${r1(x)} ${r1(y)}`
  const lakePaths = lakes.map((l, n) => ({
    d: `M${l.poly.map(at).join('L')}Z`, name: waterName('lake', l.region, n),
    x: r1(l.c[0]), y: r1(Math.max(...l.poly.map((p) => p[1])) + 9),
  }))
  const riverPaths = rivers.map((line, n) => {
    // The name is set along the middle of the river, read from left to right whichever way the water runs.
    const stretch = line.slice(Math.floor(line.length * 0.12), Math.ceil(line.length * 0.88))
    const read = stretch[0][0] <= stretch[stretch.length - 1][0] ? stretch : [...stretch].reverse()
    return { d: `M${line.map(at).join('L')}`, name: waterName('river', riverHome[n], n), along: `M${read.map(at).join('L')}` }
  })

  // Neighbouring worlds: the land of each as it falls on the sheet, its name where that land is roomiest, and a
  // thin scatter of marks so that it reads as country and not as blank paper.
  const beyond = outer.map((b, n) => {
    const label = N + n
    const land = loopsOf(own, cols, rows, label).filter((l) => l.area > 2).map((l) => smooth(l.pts, g, PADC))
    // How far each of its cells lies from anything that is not its own: two sweeps over the grid.
    const room = new Float32Array(cols * rows)
    for (let k = 0; k < room.length; k++) room[k] = own[k] === label ? 1e4 : 0
    for (let y = 1; y < rows - 1; y++) for (let x = 1; x < cols - 1; x++) { const k = y * cols + x; if (room[k]) room[k] = Math.min(room[k], room[k - 1] + 1, room[k - cols] + 1) }
    for (let y = rows - 2; y > 0; y--) for (let x = cols - 2; x > 0; x--) { const k = y * cols + x; if (room[k]) room[k] = Math.min(room[k], room[k + 1] + 1, room[k + cols] + 1) }
    // Lettered across for a neighbour above or below and up the side for one to the left or right, far enough
    // from the sheet's corners that the whole name shows.
    const turn = b.side === 'west' ? -90 : b.side === 'east' ? 90 : 0
    const half = s.names[b.id].length * 6.4 + 12
    let best: P = [W / 2, H / 2], most = -1
    for (let y = PADC + 3; y < rows - PADC - 3; y++) for (let x = PADC + 3; x < cols - PADC - 3; x++) {
      const px = (x - PADC) * g + g / 2, py = (y - PADC) * g + g / 2
      if (turn ? py < half + 14 || py > H - half - 14 : px < half + 14 || px > W - half - 14) continue
      const score = Math.min(room[y * cols + x], (turn ? Math.min(x - PADC, cols - PADC - x) : Math.min(y - PADC, rows - PADC - y)) * 1.5)
      if (score > most) { most = score; best = [px, py] }
    }
    const symbols: { x: number; y: number }[] = []
    for (let tries = 0; tries < 400 && symbols.length < 18; tries++) {
      const x = PADC + 2 + Math.floor(rng() * (cols - PADC * 2 - 4)), y = PADC + 2 + Math.floor(rng() * (rows - PADC * 2 - 4))
      if (room[y * cols + x] < 3) continue
      const p = { x: r1((x - PADC) * g + g / 2), y: r1((y - PADC) * g + g / 2) }
      if (Math.abs(p.x - best[0]) < (turn ? 20 : half + 10) && Math.abs(p.y - best[1]) < (turn ? half + 10 : 20)) continue
      if (symbols.some((q) => Math.hypot(q.x - p.x, q.y - p.y) < 56)) continue
      symbols.push(p)
    }
    return { id: b.id, name: s.names[b.id], x: r1(best[0]), y: r1(best[1]), turn, d: land.map(pathOf).join(''), symbols }
  })
  // The seas, lettered along the open edges: across the top and bottom, and up the two sides.
  const edgeSpot: Record<string, [number, number, number]> = { north: [W / 2, 40, 0], south: [W / 2, H - 28, 0], east: [W - 36, H / 2, 90], west: [36, H / 2, -90] }
  const seas = seasOf(s).map((x) => ({ name: x.name, x: r1(edgeSpot[x.side][0]), y: r1(edgeSpot[x.side][1]), turn: edgeSpot[x.side][2] }))

  const [px, label] = MILES[s.answers.size] ?? MILES.country
  return { beyond, seas, w: W, h: H, regions, routes, lakes: lakePaths, rivers: riverPaths, scale: { px, label }, theme }
}

export const siteKind = (s: Setting, id: string) => cueText(CARDS, s.board[id])

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
import { rootsOf, terrainOf, type Setting , beyondOf, seasOf, featuresOf, seaBearings, featureAt } from './setting'
import { featureOf, type FeatureForm } from './features'
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
  /** The features the land is made up of, each where it lies. */
  features: MapFeature[]
  /** Clear ground inside the land where other things can be shown when it is looked at closely. */
  spots: { x: number; y: number; feature?: string }[]
}
/** A feature of a land: where its name goes, the middle of the ground it takes up, and the outline of that ground where the land has more than one. */
export interface MapFeature { id: string; name: string; what: string; form: FeatureForm; x: number; y: number; ax: number; ay: number; d?: string }
export interface MapData {
  w: number
  h: number
  regions: MapRegion[]
  routes: { a: string; b: string; d: string }[]
  /** Still water inside the land: its outline, its name, and where the name goes. */
  lakes: { d: string; name: string; x: number; y: number; feature?: string }[]
  /** Running water: each a line from its source to the sea or to a lake, with its name and the stretch the name is set along, running left to right. */
  /** `d` is the river's course; `shape` its water as an outline, wider and narrower along its length and run on into the lake or sea at each end. */
  rivers: { d: string; shape: string; name: string; along: string }[]
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

export const inside = (p: P, poly: P[]) => {
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
  // The ends of a long straight run are always kept: they are the corners of land that runs off the sheet, and
  // dropping one would cut the corner away.
  const far = (a: P, b: P) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) > 30
  return keep > 1 ? pts.filter((p, k) => k % keep === 0 || far(p, pts[(k + pts.length - 1) % pts.length]) || far(p, pts[(k + 1) % pts.length])) : pts
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
  // The features of each land that change its coast: islands and rings offshore, a lagoon, arms of the sea. Each
  // lies out along its own bearing from the middle of the land, spread round the side that faces open water.
  // They have a chance of their own, so that a land without features is drawn exactly as it was before.
  const frng: Rng = rngFrom(`${s.seed}:features`)
  const feats = roots.map((id) => featuresOf(s, id).map((f) => ({ f, kind: featureOf(f.what) })))
  const carves = feats.map((list, i) => {
    const taken: number[] = []
    // Open sea lies along some bearings and not others; each feature takes one, as far from the rest as may be.
    const open = seaBearings(s, roots[i])
    const apart = (a: number) => Math.min(9, ...taken.map((t) => Math.abs(Math.atan2(Math.sin(t - a), Math.cos(t - a)))))
    return list.filter((x) => x.kind.where === 'coast').map((x, n) => {
      const pick = open.length ? open.map((a) => ({ a: a + (frng() - 0.5) * 0.3, w: apart(a) + frng() * 0.6 })).sort((p, q) => q.w - p.w)[0].a : gapAt[i] + (frng() - 0.5) * 2.6
      const ang = pick
      taken.push(ang)
      // With no sea in reach it is only a name on the land.
      return { id: x.f.id, form: open.length ? x.kind.form : 'mark' as FeatureForm, ang, ca: Math.cos(ang), sa: Math.sin(ang), grain: x.kind.grain ?? 26, long: !!x.kind.long, k: n * 7.3 + i * 1.9 }
    })
  })
  /** How far out along its bearing each kind of coastal feature lies, as a share of the land's reach. */
  const OUTWARD: Record<FeatureForm, number> = { isles: 1.04, islet: 1.08, ring: 1.12, lagoon: 0.62, inlets: 0.72, lake: 0, mark: 0.9 }
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
      const moat = inFromBorder < 38
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
    // The land's features that shape its coast.
    let raised = false
    for (const c of carves[nearOurs]) {
      if (c.form === 'mark' || c.form === 'lake') continue
      const s0 = span[nearOurs], px = x - pts[nearOurs][0], py = y - pts[nearOurs][1]
      const u = (px * c.ca + py * c.sa) / s0, v = (-px * c.sa + py * c.ca) / s0
      const k = cy * cols + cx
      if (c.form === 'isles') {
        // A cluster of islands just off the coast, in what would otherwise be open water.
        const d = Math.hypot((u - 1.04) / 0.2, v / 0.34)
        if (d < 1 && ground <= SEA) {
          ground = SEA + (broken(x / (c.long ? c.grain * 2.6 : c.grain) + c.k, y / (c.long ? c.grain * 0.6 : c.grain) + c.k) - 0.66) * 2.4 + (1 - d) * 0.2
          if (ground <= SEA) meant[k] = 1; else raised = true
        }
      } else if (c.form === 'islet') {
        // One island by itself, with clear water round it.
        const d = Math.hypot(u - 1.08, v) / 0.085 + 0.3 * (rough(x / 30 + c.k, y / 30) - 0.5)
        if (d < 1) { if (ground <= SEA) raised = true; ground = Math.max(ground, SEA + 0.3) }
        else if (d < 1.7 && ground <= SEA) meant[k] = 1
      } else if (c.form === 'ring') {
        // An atoll: a thin ring of land round still water, open on its seaward side.
        const rr = Math.hypot(u - 1.12, v), open = Math.abs(Math.atan2(v, u - 1.12)) < 0.5
        if (ground <= SEA && rr < 0.19) {
          if (Math.abs(rr - 0.115) < 0.034 * (0.8 + 0.6 * rough(x / 26 + c.k, y / 26)) && !open) { ground = SEA + 0.25; raised = true }
          else meant[k] = 1
        }
      } else if (c.form === 'lagoon') {
        // A sheltered water behind a spit, with one narrow mouth and open sea beyond.
        const e = Math.hypot((u - 0.62) / 0.11, v / 0.24) + 0.16 * (rough(x / 60 + 5 + c.k, y / 60 + 5) - 0.5)
        if (e < 1) { ground = -1; meant[k] = 1 }
        else if (u > 0.58 && e < 1.5) { if (Math.abs(v - 0.07) < 22 / s0) { ground = -1; meant[k] = 1 } else ground = Math.max(ground, SEA + 0.2) }
        else if (u > 0.62 && Math.abs(v) < 0.4) ground = -1
      } else if (c.form === 'inlets' && height < 0.78 && Math.hypot(u - 0.72, v) < 0.44) {
        // Arms of the sea, cut into this stretch of the coast.
        const line = Math.abs(broken(x / 70 + 11 + c.k, y / 70 + 11) - 0.5)
        if (line < 0.045) ground = Math.min(ground, SEA - 0.2 + line * 6)
      }
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
      // The corner is judged by where the cell truly lies on the sheet, not by where the bending of the coast puts it.
      const end = Math.min(flat ? x0 : y0, (flat ? W : H) - (flat ? x0 : y0))
      const deep = b.side === 'north' ? y0 : b.side === 'south' ? H - y0 : b.side === 'west' ? x0 : W - x0
      const h = end < 110 && deep < 110 - end * 0.5 ? 1 : (1 - inFrom / depth) * 0.6 + cut * 0.9
      if (h > band) { band = h; bandOf = n }
    })
    // Islands raised offshore give way to a neighbouring world's land, and the corner of the sheet beside a
    // neighbour is always the neighbour's.
    if ((raised && band > SEA) || band === 1) ground = -1
    // An open side always keeps a strip of sea along the edge of the sheet.
    const open = (side: string) => !outer.some((b) => b.side === side)
    if ((y0 < 40 && open('north')) || (y0 > H - 40 && open('south')) || (x0 < 40 && open('west')) || (x0 > W - 40 && open('east'))) ground = -1
    if (ground > SEA) own[cy * cols + cx] = near < N ? nearOurs : near
    else if (band > SEA) own[cy * cols + cx] = N + bandOf
    // The water between and around a group of islands is meant to be there, however narrow its channels.
    if (own[cy * cols + cx] < 0 && kind.shape === 'isles') meant[cy * cols + cx] = 1
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
  // A scrap of one of our places that is cut off from the place itself and lies against a neighbouring world's
  // land belongs to that world: otherwise it shows as a stray patch of our colour inside the neighbour.
  if (outer.length) {
    const part = new Int32Array(cols * rows).fill(-1)
    const home = pts.map((p) => (Math.floor(p[1] / g) + PADC) * cols + Math.floor(p[0] / g) + PADC)
    let parts = 0
    for (let start = 0; start < own.length; start++) {
      if (own[start] < 0 || own[start] >= N || part[start] >= 0) continue
      const label = own[start], cells = [start], touch = new Map<number, number>()
      part[start] = parts
      for (let n = 0; n < cells.length; n++) {
        const k = cells[n], x = k % cols, y = (k - x) / cols
        for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
          if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue
          const j = ny * cols + nx
          if (own[j] === label && part[j] < 0) { part[j] = parts; cells.push(j) }
          else if (own[j] >= N) touch.set(own[j], (touch.get(own[j]) ?? 0) + 1)
        }
      }
      parts++
      if (touch.size && !cells.includes(home[label])) {
        const to = [...touch].sort((a, b) => b[1] - a[1])[0][0]
        for (const k of cells) own[k] = to
      }
    }
  }
  const ownerAt = (x: number, y: number) => {
    const cx = Math.floor(x / g) + PADC, cy = Math.floor(y / g) + PADC
    return cx < 0 || cy < 0 || cx >= cols || cy >= rows ? -1 : own[cy * cols + cx]
  }
  const onLand = (p: P) => { const o = ownerAt(p[0], p[1]); return o >= 0 && o < N }

  const lakes: { c: P; r: number; poly: P[]; region: number; feature?: string }[] = []
  /** The clear ground found in each land, for showing more when it is looked at closely. */
  const spotsOf: P[][] = []
  /**
   * Which of a land's features a spot belongs to. Not simply the nearest: the ground is bent by the same sort of
   * roughness that shapes the coast, in broad swells and smaller wobbles, and some features reach further than
   * others, so that the borders between them wander like the borders of lands and no two are the same size.
   */
  const groundIn = (i: number, list: { at: P }[], q: P): number => {
    const bx = q[0] + (rough(q[0] / 150 + 31 + i, q[1] / 150 + 2) - 0.5) * 150 + (broken(q[0] / 52 + 7, q[1] / 52 + i) - 0.5) * 64 + (edge(q[0] / 21 + i, q[1] / 21 + 5) - 0.5) * 22
    const by = q[1] + (rough(q[0] / 150 + 9, q[1] / 150 + 47 + i) - 0.5) * 150 + (broken(q[0] / 52 + i + 13, q[1] / 52 + 3) - 0.5) * 64 + (edge(q[0] / 21 + 11, q[1] / 21 + i) - 0.5) * 22
    let best = 0, least = Infinity
    list.forEach((m, k) => {
      const d = Math.hypot(m.at[0] - bx, m.at[1] - by) - ((k * 37 + i * 11) % 5) * 9
      if (d < least) { least = d; best = k }
    })
    return best
  }
  /** The middle of the ground each feature takes up within its land, and where its name is lettered. */
  const anchorsOf: { id: string; at: P; label: P }[][] = []
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
    const pools: { c: P; r: number; poly: P[]; feature?: string }[] = []
    // The land's features that are lakes — a caldera, a great lake, hot springs — come first and to their own measure.
    const lakeFeats = feats[i].filter((x) => x.kind.form === 'lake')
    // Island groups and rings have the sea for their water; everywhere else it is by how wet the country is.
    const want = lakeFeats.length + (kind.shape === 'isles' || kind.shape === 'ring' || kind.lagoon ? 0 : kind.pools ? kind.pools[0] + Math.floor(rng() * (kind.pools[1] - kind.pools[0] + 1)) : kind.wet >= 3 ? 8 + Math.floor(rng() * 5) : kind.wet === 2 ? 1 + Math.floor(rng() * 2) : kind.wet === 1 ? (rng() < 0.4 ? 1 : 0) : 0)
    const fxs = fine.map((p) => p[0]), fys = fine.map((p) => p[1])
    const [bx0, by0, bx1, by1] = [Math.min(...fxs), Math.min(...fys), Math.max(...fxs), Math.max(...fys)]
    const close = kind.wet >= 3 ? 0.5 : 1
    // Each kind of land has its own least and greatest lake, and its own lean toward small ones: the higher the
    // lean, the rarer a broad water. A lake is given a size and then looked for a home; a broad one is tried in
    // many spots and at many angles before it is made any smaller, so that it is drawn large wherever it can be.
    const [least, most] = kind.poolSize
    let wish = 0, goes = 0, made = 0
    for (let tries = 0; tries < 90 + want * 45 && pools.length < want; tries++) {
      if (pools.length > made) { made = pools.length; wish = 0 }
      if (wish && ++goes > (wish > 28 ? 18 : 5)) { wish *= 0.74; goes = 0; if (wish < least) wish = 0 }
      const forced = lakeFeats[pools.length]?.kind.size
      if (!wish) { wish = forced ? forced[0] + rng() ** 1.3 * (forced[1] - forced[0]) : least + rng() ** kind.poolSkew * (most - least); goes = 0 }
      const r = wish
      const c: P = [bx0 + rng() * (bx1 - bx0), by0 + rng() * (by1 - by0)]
      if (!inside(c, fine)) continue
      if (pools.some((q) => Math.hypot(q.c[0] - c[0], q.c[1] - c[1]) < q.r + r + 14 * close)) continue
      // A rift's lakes are long and narrow; a crater lake is nearly round.
      const tilt = rng() * Math.PI, squash = forced ? (forced[1] > 100 ? 0.5 + rng() * 0.3 : 0.85) : kind.long ? 0.24 + rng() * 0.12 : kind.pools?.[1] === 1 ? 0.85 : 0.42 + rng() * 0.55, phase = rng() * 9, arms = [rng() * Math.PI * 2, rng() * Math.PI * 2]
      const around = Math.max(34, Math.round(r * 0.8))
      const poly = Array.from({ length: around }, (_, k): P => {
        const a = (k / around) * Math.PI * 2
        // An uneven shore with a bay or two: noise, and two slow swells at angles of their own.
        const rr = r * (0.6 + 0.62 * edge(i * 3.1 + Math.cos(a) * 1.7 + phase, Math.sin(a) * 1.7 + phase)) * (1 + 0.2 * Math.sin(a * 2 + arms[0]) + 0.14 * Math.sin(a * 3 + arms[1]))
        const [u, v] = [Math.cos(a) * rr, Math.sin(a) * rr * squash]
        return [c[0] + u * Math.cos(tilt) - v * Math.sin(tilt), c[1] + u * Math.sin(tilt) + v * Math.cos(tilt)]
      })
      // Its whole shore, bays and all, must lie within the place with a little ground to spare, and clear of the place's name.
      const spare = 5 + 5 * close
      if (poly.some((q) => { const l = Math.hypot(q[0] - c[0], q[1] - c[1]) || 1; return !inside(q, fine) || !inside([q[0] + ((q[0] - c[0]) / l) * spare, q[1] + ((q[1] - c[1]) / l) * spare], fine) })) continue
      if (inside([cx, cy - 15], poly) || poly.some((q) => Math.abs(q[0] - cx) < 88 && q[1] > cy - 62 && q[1] < cy + 32)) continue
      pools.push({ c, r, poly, feature: lakeFeats[pools.length]?.f.id })
    }
    lakes.push(...pools.map((p) => ({ ...p, region: i })))
    const glyph = glyphFor(terrain)
    const base = (TERRAIN_COLORS[terrain] ?? EXPANSION_COLORS[terrain] ?? ['#8a8f7a'])[0]

    // The land's features divide it between them: each has a middle, and the ground nearest that middle is its own.
    // A lake is at its water; a feature of the coast lies where its bearing meets the shore, with its name out
    // at the islands or lagoon themselves; the rest take the emptiest ground left.
    const anchors: { id: string; at: P; label: P }[] = []
    const off = (q: P) => Math.min(9e9, ...anchors.map((m) => Math.hypot(m.at[0] - q[0], m.at[1] - q[1])))
    for (const { f } of feats[i]) {
      const carve = carves[i].find((c) => c.id === f.id), pool = pools.find((p) => p.feature === f.id)
      let at: P | undefined, label: P | undefined
      if (pool) at = label = pool.c
      else if (carve) {
        // Out along the bearing to the last of the land, and a little back from the shore.
        let reach = 0
        while (reach < 900 && inside([cx + carve.ca * (reach + 8), cy + carve.sa * (reach + 8)], fine)) reach += 8
        const back = Math.max(0, reach - 26)
        at = [cx + carve.ca * back, cy + carve.sa * back]
        if (carve.form !== 'mark') { const out = OUTWARD[carve.form] * span[i]; label = [Math.min(W - 60, Math.max(60, pts[i][0] + carve.ca * out)), Math.min(H - 40, Math.max(40, pts[i][1] + carve.sa * out))] }
        if (back < 30 || off(at) < 46) at = undefined
      }
      if (!at) {
        let best: P = [cx, cy + 46], most = -1
        for (let tries = 0; tries < 60; tries++) {
          const q: P = [bx0 + frng() * (bx1 - bx0), by0 + frng() * (by1 - by0)]
          if (!inside(q, fine) || !inside([q[0], q[1] + 22], fine) || pools.some((p) => inside(q, p.poly))) continue
          if (Math.abs(q[0] - cx) < 96 && q[1] > cy - 60 && q[1] < cy + 30) continue
          const room = Math.min(off(q), 220)
          if (room > most) { most = room; best = q }
        }
        at = best
      }
      // A feature is lettered at the middle of its own ground, as a land is.
      void label
      anchors.push({ id: f.id, at, label: at })
    }
    anchorsOf[i] = anchors
    /** Which feature's ground a spot is on. */
    const groundOf = (q: P) => anchors[groundIn(i, anchors, q)]?.id

    // Sites first, then the settlements and dangerous places that stand anywhere in the place.
    const within = new Set(subtree(s.board, id))
    const marks = new Map<string, MapSite['kind']>([
      ...[...within].filter((x) => CARDS[x].type === 'site').map((x) => [x, 'site'] as [string, MapSite['kind']]),
      ...(s.built ?? []).filter((b) => within.has(b.home)).map((b) => [b.id, b.tool] as [string, MapSite['kind']]),
    ])
    const hubs = [...marks.keys()]
    const turn = rng() * Math.PI * 2
    const sites: MapSite[] = []
    // Whether a spot lies in a lake or within a little of its shore, by the lake's true outline.
    const wet = (p: { c: P; r: number; poly: P[] }, at: P, by: number) =>
      Math.hypot(p.c[0] - at[0], p.c[1] - at[1]) < p.r * 1.7 + by && (inside(at, p.poly) || p.poly.some((q) => Math.hypot(q[0] - at[0], q[1] - at[1]) < by))
    hubs.forEach((sid, k) => {
      let a = turn + (k / Math.max(1, hubs.length)) * Math.PI * 2
      // A mark stands on the ground of the feature it lies in, round that feature's middle; in a land with no
      // features, round the land's own.
      const home = anchors.find((m) => m.id === featureAt(s, sid))
      const [ox, oy] = home ? home.at : [cx, cy]
      const mine = (p: P) => !home || (groundOf(p) === home.id && !anchors.some((m) => Math.abs(m.label[0] - p[0]) < 62 && p[1] > m.label[1] - 20 && p[1] < m.label[1] + 22))
      let spot: P = [ox, oy]
      let found = false
      // Step round the centre until the mark sits on its own land, clear of the place's lettering and of the marks before it.
      const half = s.names[id].length * 5.4 + 30
      const lettered = (p: P) => Math.abs(p[0] - cx) < half + s.names[sid].length * 2.4 && p[1] > cy - 52 && p[1] < cy + 22
      // Each ring is walked right round before moving to the next: the usual distance first, then nearer and farther.
      const rings = home ? [46, 30, 64, 84, 104, 126, 150] : [60, 42, 80, 100, 26, 122, 146]
      for (let tries = 0; tries < rings.length * 14; tries++, a += 0.45) {
        const r = rings[Math.floor(tries / 14)]
        spot = [ox + Math.cos(a) * r * 0.95, oy + Math.sin(a) * r + (Math.sin(a) >= 0 ? 16 : -10)]
        const crowded = sites.some((q) => Math.abs(q.x - spot[0]) < 46 && Math.abs(q.y - spot[1]) < 24)
          || pools.some((p) => wet(p, spot, 18))
        if (inside(spot, fine) && inside([spot[0], spot[1] + 14], fine) && !lettered(spot) && !crowded && mine(spot)) { found = true; break }
      }
      // On a small island or among many pools there may be no clear spot: then any dry ground close in will do,
      // and failing that the heart of the place, which is always land.
      if (!found) {
        spot = [ox, oy + (home ? 34 : 0)]
        search: for (const r of [34, 22, 48, 12, 64]) for (let t = 0; t < 12; t++) {
          const b = a + (t / 12) * Math.PI * 2, at: P = [ox + Math.cos(b) * r, oy + Math.sin(b) * r]
          if (inside(at, fine) && !pools.some((p) => wet(p, at, 8)) && !sites.some((q) => Math.hypot(q.x - at[0], q.y - at[1]) < 14)) { spot = at; break search }
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

    // Clear ground for whatever else is shown when the land is looked at closely: inside the land, off its name,
    // its lakes and its marks, and each a little apart from the last.
    const clear: P[] = []
    const lettering = s.names[id].length * 5.4 + 30
    for (let tries = 0; tries < 420 && clear.length < 40; tries++) {
      const q: P = [bx0 + frng() * (bx1 - bx0), by0 + frng() * (by1 - by0)]
      if (Math.abs(q[0] - cx) < lettering && q[1] > cy - 56 && q[1] < cy + 26) continue
      if (clear.some((m) => Math.abs(m[0] - q[0]) < 44 && Math.abs(m[1] - q[1]) < 17)) continue
      if (!inside(q, fine) || !inside([q[0] - 16, q[1] + 10], fine) || !inside([q[0] + 16, q[1] + 10], fine)) continue
      if (pools.some((p) => wet(p, q, 12))) continue
      if (sites.some((m) => Math.abs(m.x - q[0]) < 50 && Math.abs(m.y - q[1]) < 22) || clear.some((m) => Math.abs(m[0] - q[0]) < 44 && Math.abs(m[1] - q[1]) < 17)) continue
      clear.push(q)
    }
    spotsOf[i] = clear
    return {
      id, name: s.names[id], terrain, d: [fine, ...isles].map(pathOf).join(''), points: fine, x: r1(cx), y: r1(cy),
      colour: washFor(base, theme), glyph, symbols: symbols.sort((a, b) => a.y - b.y), sites, features: [], spots: [],
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

  // The ground each feature takes up: every cell of the land goes to the feature whose middle is nearest, and the
  // outline of each share is traced as the land's own was. Clear ground is marked with the feature it lies in.
  const share = new Int16Array(cols * rows).fill(-1)
  const shareIds: string[] = []
  regions.forEach((r, i) => {
    const anchors = anchorsOf[i]
    const base = shareIds.length
    anchors.forEach((m) => shareIds.push(m.id))
    const nearest = (q: P) => groundIn(i, anchors, q)
    if (anchors.length > 1) for (let k = 0; k < own.length; k++) if (own[k] === i) {
      const gx = k % cols, gy = (k - gx) / cols
      share[k] = base + nearest([(gx - PADC) * g + g / 2, (gy - PADC) * g + g / 2])
    }
    feats[i].forEach(({ f, kind }, n) => {
      const m = anchors[n]
      const ground = anchors.length > 1 ? loopsOf(share, cols, rows, base + n).filter((l) => l.area > 2).map((l) => smooth(l.pts, g, PADC)) : []
      r.features.push({
        id: f.id, name: s.names[f.id] ?? f.what, what: f.what, form: kind.form, x: r1(m.label[0]), y: r1(m.label[1]), ax: r1(m.at[0]), ay: r1(m.at[1]),
        ...(ground.length ? { d: ground.map(pathOf).join('') } : {}),
      })
    })
    const taken = (q: P) => r.features.some((f) => Math.abs(f.x - q[0]) < 62 && q[1] > f.y - 22 && q[1] < f.y + 24)
    r.spots = spotsOf[i].filter((q) => !taken(q)).map((q) => ({ x: r1(q[0]), y: r1(q[1]), ...(anchors.length ? { feature: anchors[nearest(q)].id } : {}) }))
  })

  // Rivers. Each rises inside a place — high country and wet country more often than dry — and runs down to the sea,
  // crossing other places on the way if it must, or failing that to its own lake. It keeps to the land and clear of
  // every name and mark, and runs through no lake but the one it leaves or feeds.
  const rivers: P[][] = []
  const riverHome: number[] = []
  // Where each river's water runs on to past its drawn course: into the middle of the lake it leaves, and of the lake or out into the sea it reaches.
  const riverEnds: { head?: P; tail: P; sea: boolean }[] = []
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
        || lakes.some((l) => l !== pool && (mouth || l !== pools[0]) && (Math.hypot(l.c[0] - p[0], l.c[1] - p[1]) < l.r + 8 || inside(p, l.poly)))
        || rivers.some((other) => other.some((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) < 14)))) continue
      // The mouth runs on a little past the shore, so that the river opens into the sea.
      if (mouth) body.push(end, [end[0] + mouth.out[0] * 9, end[1] + mouth.out[1] * 9])
      rivers.push(body)
      riverHome.push(i)
      riverEnds.push({ head: fromLake ? pool!.c : undefined, tail: mouth ? [end[0] + mouth.out[0] * 13, end[1] + mouth.out[1] * 13] : pools[0].c, sea: !!mouth })
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
    // A lake that is one of the land's features goes by the feature's name.
    d: `M${l.poly.map(at).join('L')}Z`, name: l.feature && s.names[l.feature] ? s.names[l.feature] : waterName('lake', l.region, n), ...(l.feature ? { feature: l.feature } : {}),
    x: r1(l.c[0]), y: r1(Math.max(...l.poly.map((p) => p[1])) + 9),
  }))
  const riverPaths = rivers.map((line, n) => {
    // The name is set along the middle of the river, read from left to right whichever way the water runs.
    const stretch = line.slice(Math.floor(line.length * 0.12), Math.ceil(line.length * 0.88))
    const read = stretch[0][0] <= stretch[stretch.length - 1][0] ? stretch : [...stretch].reverse()
    // The water itself: the course run on into what it joins at each end, rounded, and given a width that grows
    // toward the mouth and swells and narrows along the way.
    const ends = riverEnds[n]
    let course: P[] = [...(ends.head ? [ends.head] : []), ...line, ends.tail]
    for (let pass = 0; pass < 2; pass++) course = [course[0], ...course.slice(0, -1).flatMap((p, k): P[] => { const q = course[k + 1]; return [[p[0] * 0.75 + q[0] * 0.25, p[1] * 0.75 + q[1] * 0.25], [p[0] * 0.25 + q[0] * 0.75, p[1] * 0.25 + q[1] * 0.75]] }), course[course.length - 1]]
    const run = course.reduce((a: number[], p, k) => [...a, k ? a[k - 1] + Math.hypot(p[0] - course[k - 1][0], p[1] - course[k - 1][1]) : 0], [])
    const whole = run[run.length - 1] || 1
    const half = (k: number) => {
      const t = run[k] / whole
      const swell = 1 + 0.3 * Math.sin(run[k] / 31 + n * 1.7) + 0.2 * Math.sin(run[k] / 12 + n * 4.1) + 0.14 * Math.sin(run[k] / 67 + n)
      // A river that leaves a lake starts broad enough to be seen; one that reaches the sea opens out at its mouth.
      return (0.9 + (ends.head ? 0.5 : 0) + 2.4 * t ** 0.8 * Math.min(1.5, 0.6 + whole / 400)) * swell * (ends.sea && whole - run[k] < 44 ? 1 + (1 - (whole - run[k]) / 44) * 0.6 : 1)
    }
    const side = (sign: number) => course.map((p, k): P => {
      const a = course[Math.max(0, k - 1)], b = course[Math.min(course.length - 1, k + 1)], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
      return [p[0] - sign * ((b[1] - a[1]) / l) * half(k), p[1] + sign * ((b[0] - a[0]) / l) * half(k)]
    })
    const shape = `M${[...side(1), ...side(-1).reverse()].map(at).join('L')}Z`
    return { d: `M${line.map(at).join('L')}`, shape, name: waterName('river', riverHome[n], n), along: `M${read.map(at).join('L')}` }
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

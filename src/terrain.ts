// What each kind of land is like, for deciding how often it turns up, where in the world it lies and how
// it is drawn. A kind is recognised by words in its name, so lands added later fall into place by themselves.

export interface Land {
  /** How warm: -2 polar, -1 cold, 0 temperate, 1 warm, 2 hot. */
  temp: number
  /** How strongly its warmth decides where it lies: 0 for lands that could be anywhere. */
  bound: number
  /** How much standing and running water it holds: 0 none, 1 some, 2 a good deal, 3 riddled with it. */
  wet: number
  /** Its outline: ordinary land, a scatter of islands, a ring round a lagoon, or land that belongs on the coast or inland. */
  shape: 'land' | 'isles' | 'ring' | 'coast' | 'inland'
  /** How broken its coast is, from 0 smooth to 1 deeply cut. */
  rugged: number
  /** High country, where rivers rise. */
  high: boolean
  /** How common it is: 4 everywhere, 1 a rarity. */
  common: number
  /** How many lakes or pools it holds, least and most; absent leaves it to how wet it is. */
  pools?: [number, number]
  /** How large its lakes are, as the least and the greatest radius. */
  poolSize: [number, number]
  /** How strongly small lakes outnumber large ones: 1 is even, higher makes a broad water ever rarer. */
  poolSkew: number
  /** Its lakes are long and narrow, as in a rift. */
  long?: boolean
  /** The chance that a river rises here, where the land calls for one more or less often than its wetness would. */
  river?: number
  /** For islands, how fine the scatter is: smaller for islets and reefs. */
  grain?: number
  /** A sheltered water lies along its sea coast behind a spit of land, open to the sea by a narrow mouth. */
  lagoon?: boolean
  /** Narrow arms of the sea reach deep into it. */
  inlets?: boolean
  /** For a ring, how broad the band of land is, as a share of its reach. */
  ringWidth?: number
}

const BASE: Land = { temp: 0, bound: 0.5, wet: 1, shape: 'land', rugged: 0.35, high: false, common: 2.5, poolSize: [9, 95], poolSkew: 3 }

/** Rules in order; every one whose words appear in the name adds its part, later ones over earlier. */
const RULES: [RegExp, Partial<Land>][] = [
  // Common, mild country.
  [/forest|wood|steppe|heath|moor|highland|floodplain|savanna|plain|meadow|prairie|downs|farmland|hill country|river valley/, { common: 4 }],
  [/marsh|plateau|estuary|karst|tundra|taiga|dune|mangrove|canyon|fjord|headland|cliff/, { common: 2.5 }],
  [/caldera|atoll|archipelago|glacier|salt|rift|lagoon|badland|isles|islands|crystal|dragon|titan|enchanted|orbital|dome|derelict|asteroid|methane|drowned|bone|sunless|ice|oasis|erg|shoal|kelp|frozen|fungal|petrified|ruined|volcanic|dust bowl|ice sheet/, { common: 1.2 }],
  // Warmth.
  [/glacier|ice|frozen|snow|permafrost/, { temp: -2, bound: 1 }],
  [/tundra|taiga|fjord|boreal/, { temp: -1.2, bound: 1 }],
  [/pine barrens|downs|fenland|lake country/, { temp: -0.4, bound: 0.5 }],
  [/rainforest|jungle/, { temp: 1.5, bound: 1 }],
  [/scrubland|dust bowl/, { temp: 1.3, bound: 0.9 }],
  [/petrified/, { temp: 2, bound: 0.8 }],
  [/moor|heath|highland|sea cliff|headland|karst/, { temp: -0.5, bound: 0.6 }],
  [/steppe|floodplain|rift|caldera|plateau/, { temp: 0.5, bound: 0.5 }],
  [/savanna|mangrove|lagoon|atoll|canyon|badland|mesa/, { temp: 1.3, bound: 0.9 }],
  [/archipelago/, { temp: 0.6, bound: 0.3 }],
  [/dune|erg|desert|salt|dry lake|wadi|oasis|stony|ash waste/, { temp: 2, bound: 1 }],
  [/orbital|dome|derelict|asteroid|terraformed|floating|crystal|enchanted|faerie|blighted|bone|sunless|titan|dragon/, { bound: 0.15 }],
  // Water.
  [/marsh|fen|bog|swamp|mangrove|tidal|wetland|delta|drowned|moor/, { wet: 3 }],
  [/floodplain|estuary|oasis|fjord|tundra|taiga|lagoon|rainforest|lake country|river valley/, { wet: 2 }],
  [/dune|erg|desert|salt|dry lake|stony|badland|mesa|ash|asteroid|bone|glacier|ice|snow|wadi|derelict|orbital|dome|frozen|dust bowl|petrified|volcanic|scrubland/, { wet: 0 }],
  // The size of lakes: mostly small everywhere, with a greatest size and a lean toward small ones that go by the land.
  // Forest and taiga hold the broadest waters and highlands long lochs; open grassland keeps to ponds; marsh and
  // moor are all pools with now and then a mere.
  [/forest|wood|taiga/, { poolSize: [10, 125], poolSkew: 2.6 }],
  [/highland|plateau|peak|steps|fjord/, { poolSize: [10, 110], poolSkew: 2.4 }],
  [/floodplain|estuary|delta|meadow|heath|terraformed/, { poolSize: [9, 85], poolSkew: 3 }],
  [/steppe|savanna|plain|canyon|cliff|headland|valley|cavern/, { poolSize: [8, 60], poolSkew: 3.6 }],
  [/marsh|fen|bog|swamp|mangrove|tidal|wetland/, { poolSize: [5, 70], poolSkew: 3.4 }],
  [/dune|erg|desert|salt|dry lake|stony|badland|mesa|ash|wadi|bone/, { poolSize: [6, 30], poolSkew: 3 }],
  // Thaw ponds on frozen ground, sinkholes in karst, a crater lake in a caldera, long lakes in a rift, one pool in an oasis.
  [/tundra|permafrost/, { wet: 2, pools: [2, 4], poolSize: [6, 48], poolSkew: 3 }],
  [/moor/, { pools: [10, 15], poolSize: [5, 60], poolSkew: 3.8 }],
  [/karst/, { pools: [1, 3], poolSize: [5, 26], poolSkew: 2.5, river: 0.25 }],
  [/caldera/, { pools: [1, 1], poolSize: [18, 70], poolSkew: 1.6, river: 0.3 }],
  [/rift/, { pools: [1, 2], poolSize: [22, 150], poolSkew: 1.8, long: true }],
  [/oasis/, { pools: [1, 1], poolSize: [8, 28], poolSkew: 2.2, river: 0 }],
  // A sea of something other than water is one great lake in its land; a wadi is the bed of a river that sometimes runs.
  [/methane sea/, { wet: 2, pools: [1, 1], poolSize: [45, 160], poolSkew: 1.2, river: 0.5 }],
  [/wadi/, { river: 0.85 }],
  // Country a river made, or that a river always runs through.
  [/floodplain|estuary|delta|canyon|river valley/, { river: 1 }],
  [/lake country/, { pools: [4, 7], poolSize: [12, 90], poolSkew: 2 }],
  // Outline.
  [/archipelago|isles|islands|shoal|kelp|drowned|derelict fleet|asteroid field/, { shape: 'isles', rugged: 0.9 }],
  [/shoal|kelp|asteroid|derelict/, { grain: 19 }],
  [/barrier/, { long: true, grain: 24 }],
  [/atoll/, { shape: 'ring', rugged: 0.5, ringWidth: 0.16 }],
  [/orbital ring/, { shape: 'ring', rugged: 0.2, ringWidth: 0.2 }],
  [/fjord|sea cliff|headland|estuary|mangrove|tidal|ice shelf|frozen sea|delta|lagoon/, { shape: 'coast' }],
  [/lagoon/, { lagoon: true, rugged: 0.3 }],
  // A coast the sea has come up: land cut by arms of the sea.
  [/drowned coast/, { shape: 'coast', inlets: true, wet: 2, rugged: 1 }],
  [/coastal plain/, { shape: 'coast', rugged: 0.15 }],
  [/fjord|sea cliff|headland|karst|canyon|badland/, { rugged: 1 }],
  [/fjord/, { inlets: true }],
  [/dune|erg|steppe|plain|salt|savanna|ice shelf|frozen sea|prairie|farmland|ice sheet|dust bowl/, { rugged: 0.15 }],
  [/steppe|plateau|caldera|rift|canyon|salt|dry lake|mesa|cave|cavern|sunless|oasis|highland|mountain range|prairie|dust bowl/, { shape: 'inland' }],
  // High country.
  [/highland|plateau|caldera|peak|steps|karst|canyon|mesa|glacier|rift|cliff|fjord|mountain|hill country|volcanic|downs/, { high: true }],
]

/** Kinds that are one formation and not a whole country: these are features of a land now, and no longer drawn as lands. */
const FEATURE_KINDS = new Set(['fjord', 'lagoon', 'caldera', 'glacier', 'estuary', 'atoll', 'headland', 'sea cliffs', 'shoals', 'barrier islands', 'kelp forest',
  'floating isles', 'faerie meadow', 'crystal caverns', 'ice caves', 'sunless valley', 'drowned village', 'dry lake bed', 'wadi', 'oasis basin'])
/** Places off the world altogether, kept for a later day and not drawn for now. */
const SPACE_KINDS = new Set(['orbital ring', 'dome colony', 'asteroid field', 'terraformed plain', 'derelict fleet', 'methane sea'])
/** Whether a kind of terrain is a whole land, a feature within one, or a place in space. */
export const scaleOf = (terrain: string): 'land' | 'feature' | 'space' => {
  const name = terrain.toLowerCase()
  return SPACE_KINDS.has(name) ? 'space' : FEATURE_KINDS.has(name) ? 'feature' : 'land'
}

const known = new Map<string, Land>()
export function landOf(terrain: string): Land {
  const name = terrain.toLowerCase()
  let land = known.get(name)
  if (!land) {
    land = RULES.reduce((made, [re, part]) => (re.test(name) ? { ...made, ...part } : made), BASE)
    known.set(name, land)
  }
  return land
}

/** How far down the map a land wants to lie, from 0 at the cold north edge to 1 at the hot south. */
export const latitudeOf = (land: Land) => Math.min(1, Math.max(0, 0.5 + land.temp * 0.24))

/** Lands that only make sense beside the open sea: island groups, rings and coasts. */
export const needsSea = (land: Land) => land.shape === 'isles' || land.shape === 'ring' || land.shape === 'coast'

/**
 * How near each side of the world a spot lies, as north, east, south, west, each from 0 (the far side) to 1
 * (right on that edge), given the box all the places lie in.
 */
export function sideNearness(p: { x: number; y: number }, box: { x0: number; y0: number; x1: number; y1: number }): [number, number, number, number] {
  const u = box.x1 > box.x0 ? (p.x - box.x0) / (box.x1 - box.x0) : 0.5, v = box.y1 > box.y0 ? (p.y - box.y0) / (box.y1 - box.y0) : 0.5
  return [1 - v, u, v, 1 - u]
}

/**
 * How badly a land sits at a spot. `lat` is how far south the spot lies (0 to 1), `edge` how near the
 * outside of the world it is (0 at the heart, 1 on the rim), and `sea` how near the open sea, which is the
 * same thing unless a neighbouring world takes up one of the sides. Lower is better.
 */
export function misfit(land: Land, lat: number, edge: number, sea = edge): number {
  const climate = Math.abs(lat - latitudeOf(land)) * land.bound * 2.2
  const shore = land.shape === 'isles' || land.shape === 'ring' ? (1 - sea) * 1.6 : land.shape === 'coast' ? (1 - sea) * (land.lagoon ? 1.6 : 1.1) : land.shape === 'inland' ? edge * 0.8 : 0
  return climate + shore
}

/**
 * The bearings from a land's middle along which open sea lies just beyond its coast: no other land in the way,
 * and no neighbouring world on that side. Worked out from where the lands lie alone, so that what is decided
 * when a land is made agrees with what the map later draws.
 */
export function openBearings(at: { x: number; y: number }, all: { x: number; y: number }[], taken: boolean[]): number[] {
  const others = all.filter((p) => p !== at && (p.x !== at.x || p.y !== at.y))
  if (!others.length) return Array.from({ length: 16 }, (_, k) => (k / 16) * Math.PI * 2)
  const nearest = all.map((p) => Math.min(...all.filter((q) => q !== p).map((q) => Math.hypot(p.x - q.x, p.y - q.y)))).sort((a, b) => a - b)
  const gap = nearest[Math.floor(nearest.length / 2)]
  const [x0, y0, x1, y1] = [Math.min(...all.map((p) => p.x)), Math.min(...all.map((p) => p.y)), Math.max(...all.map((p) => p.x)), Math.max(...all.map((p) => p.y))]
  return Array.from({ length: 16 }, (_, k) => (k / 16) * Math.PI * 2).filter((a) => {
    const q = { x: at.x + Math.cos(a) * gap * 0.95, y: at.y + Math.sin(a) * gap * 0.95 }
    if (others.some((p) => Math.hypot(p.x - q.x, p.y - q.y) < gap * 0.86)) return false
    // North, east, south, west: a neighbouring world is joined on by land, so its side of the world has no sea.
    if (taken[0] && q.y < y0 + gap * 0.35) return false
    if (taken[1] && q.x > x1 - gap * 0.35) return false
    if (taken[2] && q.y > y1 - gap * 0.35) return false
    if (taken[3] && q.x < x0 + gap * 0.35) return false
    return true
  })
}

/** A draw of one item where each has a weight: heavier items come up more often. */
export function weighted<T>(items: T[], weight: (item: T) => number, random: () => number): T | undefined {
  let at = random() * items.reduce((n, x) => n + weight(x), 0)
  for (const x of items) { at -= weight(x); if (at < 0) return x }
  return items[items.length - 1]
}

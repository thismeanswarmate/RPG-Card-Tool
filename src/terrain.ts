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
  /** How large those are across, least and most. */
  poolSize?: [number, number]
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

const BASE: Land = { temp: 0, bound: 0.5, wet: 1, shape: 'land', rugged: 0.35, high: false, common: 2.5 }

/** Rules in order; every one whose words appear in the name adds its part, later ones over earlier. */
const RULES: [RegExp, Partial<Land>][] = [
  // Common, mild country.
  [/forest|wood|steppe|heath|moor|highland|floodplain|savanna|plain|meadow/, { common: 4 }],
  [/marsh|plateau|estuary|karst|tundra|taiga|dune|mangrove|canyon|fjord|headland|cliff/, { common: 2.5 }],
  [/caldera|atoll|archipelago|glacier|salt|rift|lagoon|badland|isles|islands|crystal|dragon|titan|enchanted|orbital|dome|derelict|asteroid|methane|drowned|bone|sunless|ice|oasis|erg|shoal|kelp|frozen/, { common: 1.2 }],
  // Warmth.
  [/glacier|ice|frozen|snow|permafrost/, { temp: -2, bound: 1 }],
  [/tundra|taiga|fjord/, { temp: -1.2, bound: 1 }],
  [/moor|heath|highland|sea cliff|headland|karst/, { temp: -0.5, bound: 0.6 }],
  [/steppe|floodplain|rift|caldera|plateau/, { temp: 0.5, bound: 0.5 }],
  [/savanna|mangrove|lagoon|atoll|canyon|badland|mesa/, { temp: 1.3, bound: 0.9 }],
  [/archipelago/, { temp: 0.6, bound: 0.3 }],
  [/dune|erg|desert|salt|dry lake|wadi|oasis|stony|ash waste/, { temp: 2, bound: 1 }],
  [/orbital|dome|derelict|asteroid|terraformed|floating|crystal|enchanted|faerie|blighted|bone|sunless|titan|dragon/, { bound: 0.15 }],
  // Water.
  [/marsh|fen|bog|swamp|mangrove|tidal|wetland|delta|drowned|moor/, { wet: 3 }],
  [/floodplain|estuary|oasis|fjord|tundra|taiga|lagoon/, { wet: 2 }],
  [/dune|erg|desert|salt|dry lake|stony|badland|mesa|ash|asteroid|bone|glacier|ice|snow|wadi|derelict|orbital|dome|frozen/, { wet: 0 }],
  // Thaw ponds on frozen ground, sinkholes in karst, a crater lake in a caldera, long lakes in a rift, one pool in an oasis.
  [/tundra|permafrost/, { wet: 2, pools: [2, 4], poolSize: [6, 12] }],
  [/moor/, { pools: [10, 15], poolSize: [5, 17] }],
  [/karst/, { pools: [1, 3], poolSize: [5, 10], river: 0.25 }],
  [/caldera/, { pools: [1, 1], poolSize: [20, 30], river: 0.3 }],
  [/rift/, { pools: [1, 2], poolSize: [20, 34], long: true }],
  [/oasis/, { pools: [1, 1], poolSize: [8, 13], river: 0 }],
  // A sea of something other than water is one great lake in its land; a wadi is the bed of a river that sometimes runs.
  [/methane sea/, { wet: 2, pools: [1, 1], poolSize: [40, 58], river: 0.5 }],
  [/wadi/, { river: 0.85 }],
  // Country a river made, or that a river always runs through.
  [/floodplain|estuary|delta|canyon/, { river: 1 }],
  // Outline.
  [/archipelago|isles|islands|shoal|kelp|drowned|derelict fleet|asteroid field/, { shape: 'isles', rugged: 0.9 }],
  [/shoal|kelp|asteroid|derelict/, { grain: 19 }],
  [/barrier/, { long: true, grain: 24 }],
  [/atoll/, { shape: 'ring', rugged: 0.5, ringWidth: 0.16 }],
  [/orbital ring/, { shape: 'ring', rugged: 0.2, ringWidth: 0.2 }],
  [/fjord|sea cliff|headland|estuary|mangrove|tidal|ice shelf|frozen sea|delta|lagoon/, { shape: 'coast' }],
  [/lagoon/, { lagoon: true, rugged: 0.3 }],
  [/fjord|sea cliff|headland|karst|canyon|badland/, { rugged: 1 }],
  [/fjord/, { inlets: true }],
  [/dune|erg|steppe|plain|salt|savanna|ice shelf|frozen sea/, { rugged: 0.15 }],
  [/steppe|plateau|caldera|rift|canyon|salt|dry lake|mesa|cave|cavern|sunless|oasis|highland/, { shape: 'inland' }],
  // High country.
  [/highland|plateau|caldera|peak|steps|karst|canyon|mesa|glacier|rift|cliff|fjord/, { high: true }],
]

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

/** A draw of one item where each has a weight: heavier items come up more often. */
export function weighted<T>(items: T[], weight: (item: T) => number, random: () => number): T | undefined {
  let at = random() * items.reduce((n, x) => n + weight(x), 0)
  for (const x of items) { at -= weight(x); if (at < 0) return x }
  return items[items.length - 1]
}

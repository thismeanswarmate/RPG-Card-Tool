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
  [/savanna|mangrove|lagoon|atoll|archipelago|canyon|badland|mesa/, { temp: 1.3, bound: 0.9 }],
  [/dune|erg|desert|salt|dry lake|wadi|oasis|stony|ash waste/, { temp: 2, bound: 1 }],
  [/orbital|dome|derelict|asteroid|terraformed|floating|crystal|enchanted|faerie|blighted|bone|sunless|titan|dragon/, { bound: 0.15 }],
  // Water.
  [/marsh|fen|bog|swamp|mangrove|tidal|wetland|delta|drowned/, { wet: 3 }],
  [/floodplain|estuary|lagoon|oasis|fjord/, { wet: 2 }],
  [/dune|erg|desert|salt|dry lake|stony|badland|mesa|ash|asteroid|bone|glacier|ice|snow|permafrost/, { wet: 0 }],
  // Outline.
  [/archipelago|isles|islands|shoal|kelp|drowned|derelict fleet|asteroid field|frozen sea|methane sea/, { shape: 'isles', rugged: 0.9 }],
  [/atoll/, { shape: 'ring', rugged: 0.5 }],
  [/fjord|sea cliff|headland|estuary|lagoon|mangrove|tidal|ice shelf|delta/, { shape: 'coast' }],
  [/fjord|sea cliff|headland|karst|canyon|badland/, { rugged: 1 }],
  [/dune|erg|steppe|plain|salt|savanna/, { rugged: 0.15 }],
  [/steppe|plateau|caldera|rift|canyon|salt|dry lake|mesa|cave|cavern|sunless|oasis|highland/, { shape: 'inland' }],
  // High country.
  [/highland|plateau|caldera|peak|steps|karst|canyon|mesa|glacier|rift|cliff/, { high: true }],
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

/**
 * How badly a land sits at a spot. `lat` is how far south the spot lies (0 to 1) and `edge` how near the
 * outside of the world it is (0 at the heart, 1 on the rim). Lower is better.
 */
export function misfit(land: Land, lat: number, edge: number): number {
  const climate = Math.abs(lat - latitudeOf(land)) * land.bound * 2.2
  const shore = land.shape === 'isles' || land.shape === 'ring' ? (1 - edge) * 1.6 : land.shape === 'coast' ? (1 - edge) * 1.1 : land.shape === 'inland' ? edge * 0.8 : 0
  return climate + shore
}

/** A draw of one item where each has a weight: heavier items come up more often. */
export function weighted<T>(items: T[], weight: (item: T) => number, random: () => number): T | undefined {
  let at = random() * items.reduce((n, x) => n + weight(x), 0)
  for (const x of items) { at -= weight(x); if (at < 0) return x }
  return items[items.length - 1]
}

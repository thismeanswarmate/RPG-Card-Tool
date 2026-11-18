// Features: the smaller formations a land is made up of — a fjord on its coast, a caldera in its hills, a
// string of islands offshore. A land holds several. All text here is original to this project.

import { landOf, type Land } from './terrain'

/** How a feature shows on the map: islands or a ring offshore, a lagoon or sea inlets cut into the coast, a lake, or a named spot. */
export type FeatureForm = 'isles' | 'islet' | 'ring' | 'lagoon' | 'inlets' | 'lake' | 'mark'

export interface FeatureKind {
  what: string
  form: FeatureForm
  /** On the coast (or off it), or inland. */
  where: 'coast' | 'inland'
  /** The coldest and warmest land it suits, on the scale lands use: -2 polar to 2 hot. */
  temp: [number, number]
  /** It belongs to high country, to wet country or to dry. */
  needs?: 'high' | 'wet' | 'dry' | 'wood'
  /** It turns up only with this genre in the mix. */
  genre?: string
  /** For a lake, its least and greatest radius; for islands, how fine the scatter is. */
  size?: [number, number]
  grain?: number
  long?: boolean
  /** A sentence about it: {place} is its name and {land} the land it lies in. */
  text: string
}

const F = (what: string, form: FeatureForm, where: 'coast' | 'inland', temp: [number, number], text: string, more: Partial<FeatureKind> = {}): FeatureKind => ({ what, form, where, temp, text, ...more })
const ANY: [number, number] = [-2, 2], COLD: [number, number] = [-2, -1], COOL: [number, number] = [-2, 0.6], MILD: [number, number] = [-0.6, 1.4], WARM: [number, number] = [0.4, 2], HOT: [number, number] = [1.2, 2]

export const FEATURES: FeatureKind[] = [
  // The coast.
  F('Fjord', 'inlets', 'coast', COOL, 'At {place} sheer rock drops straight into deep, still water, and the sea reaches far into {land}.'),
  F('Headland', 'mark', 'coast', ANY, '{place} stands out into the sea on every side but one, the first of {land} that a ship sights and the last it loses.'),
  F('Sea Cliffs', 'mark', 'coast', ANY, 'Along {place} the land ends all at once, in walls of rock loud with seabirds and surf.'),
  F('Estuary', 'mark', 'coast', ANY, 'At {place} river and sea trade places twice a day, leaving mudflats, channels and clouds of wading birds.'),
  F('Lagoon', 'lagoon', 'coast', WARM, 'A spit of sand holds back the open sea at {place}, keeping the water behind it shallow, warm and calm.'),
  F('Delta', 'mark', 'coast', MILD, 'At {place} the river gives up being one river and reaches the sea by a dozen mouths, none of them the same two years running.'),
  F('Peninsula', 'mark', 'coast', ANY, '{place} runs out from {land} like a pointing arm, joined to it by a neck narrow enough to wall.'),
  F('Bay', 'mark', 'coast', ANY, 'The curve of {place} takes the worst out of any weather, and half the boats of {land} winter there.'),
  F('Sand Spit', 'mark', 'coast', MILD, '{place} is a long finger of sand that the tides lengthen in one decade and shorten in the next.'),
  F('Sea Stacks', 'isles', 'coast', COOL, 'Off {place} pillars of rock stand in the surf where the coast used to be.', { grain: 13 }),
  F('Sunken City', 'mark', 'coast', ANY, 'At low water the roofs of {place} show above the waves, and fishermen know its streets by where their nets catch.'),
  // Islands.
  F('Atoll', 'ring', 'coast', WARM, 'At {place} a thin ring of coral and palm encloses bright water, with nothing beyond the reef but open sea.'),
  F('Barrier Islands', 'isles', 'coast', MILD, 'The low sand islands of {place} lie in a row off the shore, shifting with every storm and sheltering the water behind them.', { grain: 24, long: true }),
  F('Shoals', 'isles', 'coast', ANY, 'At {place} sandbanks lie just under the surface for miles, and the water changes colour over every one of them.', { grain: 17 }),
  F('Kelp Forest', 'isles', 'coast', COOL, 'Off {place} great brown weed grows up from the sea floor to the light, slowing boats and hiding what swims beneath.', { grain: 17 }),
  F('Reef', 'isles', 'coast', WARM, 'The coral of {place} breaks the swell into white water a long way out, and has broken a good many hulls as well.', { grain: 15 }),
  F('Tidal Island', 'islet', 'coast', COOL, '{place} can be walked to at low water and is an island again by the time you would want to walk back.'),
  F('Lone Island', 'islet', 'coast', ANY, '{place} sits by itself off the coast of {land}, near enough to see and far enough to be left alone.'),
  F('Floating Isles', 'isles', 'coast', ANY, 'The rocks of {place} hang above the water, tethered by chains and rope bridges.', { genre: 'fantasy', grain: 22 }),
  // Mountain and rock.
  F('Caldera', 'lake', 'inland', ANY, 'Long ago a mountain collapsed to form {place}, and the ring of cliffs it left still steams in cold weather.', { needs: 'high', size: [18, 60] }),
  F('Glacier', 'mark', 'inland', COLD, 'Down {place} a river of old ice grinds toward the lowlands, groaning at night and shedding milky meltwater.'),
  F('Volcano', 'mark', 'inland', ANY, '{place} smokes most days and rumbles on some, and the soil on its slopes is the best in {land}.', { needs: 'high' }),
  F('Gorge', 'mark', 'inland', ANY, 'The river has cut {place} so deep that the bottom sees the sun for an hour a day.'),
  F('Mountain Pass', 'mark', 'inland', ANY, '{place} is the one way through, open for part of the year and paid for by everyone who uses it.', { needs: 'high' }),
  F('Butte', 'mark', 'inland', WARM, '{place} stands alone on the flat, steep on every side and visible for two days before you reach it.', { needs: 'dry' }),
  F('Sinkhole', 'lake', 'inland', ANY, 'The ground fell in at {place} within living memory, and the pool at the bottom has never been sounded.', { size: [5, 12] }),
  // Water.
  F('Oasis Basin', 'lake', 'inland', HOT, 'Water rises at {place} in the middle of dry country, and everything green for a week in any direction is here.', { needs: 'dry', size: [8, 22] }),
  F('Wadi', 'mark', 'inland', HOT, '{place} is dry for all but a few days a year, and on those days it is a river in a hurry.', { needs: 'dry' }),
  F('Dry Lake Bed', 'mark', 'inland', HOT, 'The cracked clay of {place} lies where water once stood, flat and hard enough to race across.', { needs: 'dry' }),
  F('Hot Springs', 'lake', 'inland', ANY, 'Warm water comes up at {place} smelling of struck matches, and people travel a long way to sit in it.', { size: [5, 11] }),
  F('Great Lake', 'lake', 'inland', COOL, '{place} is wide enough to have its own weather, and the far shore is a rumour on most days.', { size: [60, 150] }),
  F('Waterfall', 'mark', 'inland', ANY, 'The river goes over the edge at {place} and can be heard long before it is seen.'),
  F('Tar Pits', 'lake', 'inland', WARM, 'Black pools seep up at {place}, and now and then give back the bones of something that walked in long ago.', { size: [5, 10] }),
  // Hidden places.
  F('Hidden Valley', 'mark', 'inland', ANY, 'One path leads into {place}, and those who live there have never seen a reason to mark it.'),
  F('Grove', 'mark', 'inland', MILD, 'The trees of {place} were standing before {land} had a name, and nobody has cut one in all that time.', { needs: 'wood' }),
  F('Glen', 'mark', 'inland', COOL, '{place} is a narrow green fold in the hills, wet underfoot and out of the wind.'),
  F('Barrow Downs', 'mark', 'inland', COOL, 'Grassed-over mounds crowd the ridges of {place}, each one somebody once thought worth remembering.'),
  F('Ice Caves', 'mark', 'inland', COLD, 'Inside {place} blue tunnels wind through old ice, lit from above and never quite silent.'),
  F('Crystal Caverns', 'mark', 'inland', ANY, 'The walls of {place} are grown over with crystal that rings when it is struck and glows a little when it is not.', { genre: 'fantasy' }),
  F('Faerie Meadow', 'mark', 'inland', MILD, 'Flowers at {place} bloom out of season, and those who sleep there wake a day or a year later.', { genre: 'fantasy' }),
  F('Sunless Valley', 'mark', 'inland', ANY, 'The walls of {place} are so steep that the floor has not seen the sun in living memory.', { genre: 'horror' }),
  F('Drowned Village', 'mark', 'coast', ANY, 'The water rose over {place} in a single night, and the church bell still sounds in rough weather.', { genre: 'horror' }),
]

export const FEATURE_BY_NAME = new Map(FEATURES.map((f) => [f.what, f]))
export const featureOf = (what: string) => FEATURE_BY_NAME.get(what) ?? F(what, 'mark', 'inland', ANY, '{place} lies in {land}.')

/** Whether a kind of feature suits a land, by its climate, its country and whether it has a coast. */
export function suits(f: FeatureKind, land: Land, terrain: string, coastal: boolean, genres: string[]): boolean {
  if (f.genre && !genres.includes(f.genre)) return false
  if (f.where === 'coast' && !coastal) return false
  if (land.temp < f.temp[0] - 0.01 || land.temp > f.temp[1] + 0.01) return false
  if (f.needs === 'high' && !land.high) return false
  if (f.needs === 'wet' && land.wet < 2) return false
  if (f.needs === 'dry' && !(land.wet === 0 || (land.wet === 1 && land.temp >= 1.2))) return false
  if (f.needs === 'wood' && !/forest|wood|taiga|grove/i.test(terrain)) return false
  // Still water does not stand in desert or on ice, save where the feature is the reason for it.
  if (f.form === 'lake' && land.wet === 0 && f.needs !== 'dry' && f.what !== 'Tar Pits' && f.what !== 'Hot Springs' && f.what !== 'Caldera') return false
  return true
}
/** The kinds of feature that suit a land. */
export const featuresFor = (terrain: string, coastal: boolean, genres: string[]) => FEATURES.filter((f) => suits(f, landOf(terrain), terrain, coastal, genres))

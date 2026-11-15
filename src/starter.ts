import type { CardDef, CardType, Cue } from './types'

// Original starter deck written for Worldloom.

const terrain = [
  'Marsh', 'Steppe', 'Highlands', 'Archipelago', 'Fjord', 'Dunes', 'Old Forest', 'Tundra', 'Salt Flats',
  'Badlands', 'Savanna', 'Moor', 'Rift Valley', 'Lagoon', 'Karst', 'Floodplain', 'Caldera', 'Heath',
]

export const TERRAIN_COLORS: Record<string, [string, string]> = {
  Marsh: ['#4f6b4a', '#2f4a45'], Steppe: ['#a79a5b', '#6f7a44'], Highlands: ['#6c7f6a', '#48525c'],
  Archipelago: ['#2e7f93', '#1d4f6e'], Fjord: ['#3d5f78', '#27394d'], Dunes: ['#d0a465', '#a8743f'],
  'Old Forest': ['#2f5d3a', '#1c3a2b'], Tundra: ['#a9b8bd', '#74878f'], 'Salt Flats': ['#d9d4c7', '#a7a39a'],
  Badlands: ['#b0694a', '#7a4636'], Savanna: ['#b99b4c', '#7c7a3a'], Moor: ['#6b5f73', '#454a55'],
  'Rift Valley': ['#8a6d4b', '#4d5a3c'], Lagoon: ['#3fa39a', '#2a6d80'], Karst: ['#8e9486', '#5b6660'],
  Floodplain: ['#6f8f5a', '#4a6f6c'], Caldera: ['#70504c', '#3b3340'], Heath: ['#8a6f8c', '#5c6b4c'],
}

const sites = [
  ['Lighthouse', 'Ferry Landing'], ['Observatory', 'Mill'], ['Quarry', 'Orchard'], ['Bathhouse', 'Archive'],
  ['Foundry', 'Market Square'], ['Watchtower', 'Cistern'], ['Amphitheatre', 'Shrine'], ['Causeway', 'Hamlet'],
  ['Citadel', 'Harbour'], ['Aqueduct', 'Burial Mound'], ['Hot Spring', 'Mine'], ['Customs House', 'Standing Stones'],
  ['Hermitage', 'Fairground'], ['Sinkhole', 'Cove'], ['Inn', 'Granary'], ['Signal Fire', 'Clocktower'],
  ['Walled Town', 'Sluice Gate'], ['Apiary', 'Rope Bridge'],
]

// First cue opens a name ("The Whispering Marsh"); the other three end it ("The Marsh of Lanterns").
const epithets = [
  ['Whispering', 'of Lanterns', 'of Second Chances', 'That Dreams'],
  ['Drowned', 'of Rust', 'Where Rivers Argue', 'of Unpaid Debts'],
  ['Gilded', 'of Owls', 'That Forgets', 'of Honey'],
  ['Patient', 'Beyond the Bells', 'of Kites', 'Without Shadows'],
  ['Crooked', 'of Ink', 'That Listens', 'of Lost Gloves'],
  ['Thirsty', 'Under the Comet', 'of Thorns', 'of Seven Sisters'],
  ['Borrowed', 'That Never Thaws', 'of Brass', 'of Quiet Bargains'],
  ['Humming', 'Where Maps End', 'of Moths', 'of Old Songs'],
  ['Unmapped', 'That Hungers', 'of Salt', 'of Wandering Doors'],
  ['Ashen', 'Between Tides', 'of Copper', 'of Lullabies'],
  ['Restless', 'That Burned Twice', 'of Crows', 'of Soft Rain'],
  ['Forgiving', 'Where Kings Kneel', 'of Mirrors', 'of Long Shadows'],
  ['Hollow', 'That Bargains', 'of Bones and Barley', 'of Wild Geese'],
  ['Stubborn', 'Before the Dawn', 'of Needles', 'of Amber'],
  ['Salted', 'That Wanders', 'of Echoes', 'of Last Letters'],
  ['Thousandfold', 'Where Wolves Sing', 'of Chalk', 'of Small Mercies'],
]

const legacies = [
  ['Raised by shipwreck survivors', 'Once the floor of a vanished sea', 'Won in a wager between rivals', 'Named for a mistranslation'],
  ['Settled by deserters from a long war', 'Site of the first treaty ever broken', 'Grew around a single well', 'Abandoned and resettled three times'],
  ['Birthplace of a banned philosophy', 'Built atop an older, stranger place', 'Gifted to a hero who never arrived', 'Scarred by a great fire'],
  ['Founded by a guild of mapmakers', 'Once a place of exile', 'Where a famous duel ended in friendship', 'Flooded on purpose long ago'],
  ['Hiding place of a deposed ruler', 'Planted by one devoted gardener', 'Scene of a legendary heist', 'Cut off from the world for a century'],
  ['Founded on a pilgrim’s vision', 'Site of a miraculous harvest', 'Once ruled by children', 'Paid for with a counterfeit fortune'],
  ['Where an invention changed everything', 'Carved out by a fallen star', 'Last refuge of a forgotten language', 'Bought back from its conquerors'],
  ['Began as a travelling show’s winter camp', 'Home of a rebellion that succeeded', 'Cursed, the old stories say', 'Built to guard something'],
  ['Where two migrations met', 'Emptied by plague, then reborn', 'Once the richest place for a thousand miles', 'Promised to two peoples at once'],
  ['Founded by a runaway heir', 'Site of a trial still argued over', 'Shaped by generations of quarrying', 'Discovered by accident'],
  ['Where a beloved ballad was first sung', 'Once a royal hunting preserve', 'Survived a siege of seven years', 'Left unfinished by its architects'],
  ['Sacred to a faith no one remembers', 'Raised by rival families in one season', 'Where a great expedition set out', 'Traded for a shipload of spice'],
]

const traits = [
  ['Famous for its cheese', 'Everyone keeps bees', 'Ruled by a council of grandmothers', 'Fog most mornings'],
  ['Proud of a terrible local wine', 'Bells mark every hour', 'Strangers are fed before questioned', 'Roads are poorly kept'],
  ['Renowned boatbuilders', 'Distrusts written contracts', 'Festival of lights each winter', 'Overrun with cats'],
  ['Debts are settled in song', 'Prized dyes and pigments', 'Windy year-round', 'Governed by lottery'],
  ['Devoted to a local saint', 'Exports fine paper', 'Everyone wears hats of rank', 'Famous hot peppers'],
  ['Rival bakeries feud openly', 'Keeps meticulous records', 'Unusually long-lived residents', 'Haunted by rumour'],
  ['Celebrated storytellers', 'Markets held only at night', 'Protective of its springs', 'Renowned stonemasons'],
  ['Welcomes wanderers', 'Obsessed with a ball game', 'Houses painted in bright colours', 'Taxes paid in grain'],
  ['Trains messenger birds', 'Quiet by custom after dusk', 'Famous for stargazing', 'Suspicious of outsiders'],
  ['Skilled herbalists', 'Ruled by an elected judge', 'Known for elaborate funerals', 'Rich in old ruins'],
  ['Shares everything in lean years', 'Breeds sturdy ponies', 'Carves its history into doorframes', 'Mild in every season'],
  ['Thriving smuggling trade', 'Speaks a distinct dialect', 'Reveres its oldest tree', 'Known for intricate knots'],
  ['Fiercely independent', 'Celebrated glassblowers', 'Rains come all at once', 'Home to a famous school'],
  ['Great lovers of riddles', 'Trades in salvaged goods', 'Keeps an unbroken watch', 'Renowned for smoked fish'],
  ['Governed by a merchant league', 'Masks worn on holy days', 'Abundant wild game', 'Famous for its clocks'],
  ['Children are raised by the whole village', 'Guards an old library', 'Known for bitter winters', 'Music in every tavern'],
]

const omens: [string, string][][] = [
  [['A caravan has arrived a season early', 'bearing warnings, refugees, or goods no one ordered'], ['The river has changed its course', 'stranding a town, uncovering ruins, or redrawing a border']],
  [['An heir no one knew of has come forward', 'with proof, with backers, or with a grudge'], ['The harvest is failing', 'from blight, theft, or weather out of season']],
  [['A long-sealed door has been opened', 'by accident, by decree, or from the inside'], ['Two old rivals have announced an alliance', 'through marriage, shared fear, or secret debt']],
  [['A stranger is buying up land', 'for a patron, a prophecy, or what lies beneath'], ['The great festival may be cancelled', 'over money, mourning, or an ill sign']],
  [['Something valuable has gone missing', 'a relic, a ledger, or a person'], ['A new road is being built', 'bringing trade, soldiers, or unwelcome attention']],
  [['The old leader is stepping down', 'naming no successor, a surprising one, or far too many'], ['Animals are behaving strangely', 'fleeing, gathering, or refusing to cross a line']],
  [['A message has arrived from far away', 'a summons, a plea, or an offer too good to trust'], ['A local custom has been outlawed', 'by distant rulers, new converts, or a nervous council']],
  [['Miners have struck something unexpected', 'a rich vein, an old tunnel, or a thing best left buried'], ['A popular movement is gathering crowds', 'around a preacher, a grievance, or a song']],
  [['The wells are running low', 'from drought, diversion, or sabotage'], ['A contest has drawn rivals from afar', 'for a prize, a title, or a hand in marriage']],
  [['A ship has returned without its crew', 'adrift, well stocked, or carrying something new'], ['Neighbours are disputing a boundary', 'a stream, a pasture, or a toll bridge']],
  [['An old prediction is coming due', 'awaited, dreaded, or half forgotten'], ['Outsiders have come to study the place', 'scholars, surveyors, or spies']],
  [['A sickness is spreading quietly', 'among livestock, travellers, or the well-to-do'], ['Someone long thought dead has returned', 'changed, pursued, or unrepentant']],
]

const make = (type: CardType, rows: Cue[][]): CardDef[] =>
  rows.map((cues, i) => ({ id: `s-${type}-${i}`, type, deck: 'starter', cues }))
const plain = (rows: string[][]) => rows.map((r) => r.map((text) => ({ text })))

export const STARTER: CardDef[] = [
  ...make('terrain', plain(terrain.map((t) => [t]))),
  ...make('site', plain(sites)),
  ...make('epithet', plain(epithets)),
  ...make('legacy', plain(legacies)),
  ...make('trait', plain(traits)),
  ...make('omen', omens.map((r) => r.map(([text, sub]) => ({ text, sub })))),
]

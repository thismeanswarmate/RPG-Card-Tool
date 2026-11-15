// The perils tool: a dangerous place built by rolling on tables, in four steps — a premise, the place
// itself, its surroundings and its danger — with a fifth for whoever is behind it when the danger can
// think. All table text is original to this project.
//
// A table is a list of entries and its die is simply the number of them. Most entries are written to
// complete a sentence in the brief ("It was made …", "It stands …"); the comments beside each table say
// which. Which tables apply depends on earlier rolls: the kind of place, the surroundings and the kind
// of danger each bring their own.

const t = (raw: string) => raw.split('|').map((x) => x.trim()).filter(Boolean)

export interface Table { id: string; label: string; entries: string[] }
export interface Step { title: string; blurb: string; tables: Table[] }
export type Rolls = Record<string, number | undefined>

export const KINDS: Record<string, { label: string; purpose: string[]; feature: string[] }> = {
  burial: {
    label: 'burial ground',
    purpose: t('to honour a single great family | for the dead of a plague | for soldiers fallen in one battle | for those no other ground would take | for the priests of an old faith | for a ruler and their household'),
    feature: t('Every marker faces the same direction, away from the gate. | One grave is far larger and newer than the rest. | The dead were buried with their tools, not their treasures. | A bell hangs at the centre, with a rope leading below ground. | The oldest section has been carefully walled off. | Fresh flowers appear, though no one is seen leaving them.'),
  },
  camp: {
    label: 'encampment',
    purpose: t('by travellers who meant to stay one night | by soldiers on the march | by hunters following the herds | by people driven from their homes | by workers on a nearby project | by those with reason to hide'),
    feature: t('The fires are kept burning even at noon. | The tents are arranged in a strict pattern. | There are far more beds than people. | Everything is packed, ready to leave at once. | A single wagon is guarded more closely than the rest. | Children’s toys lie about, but there are no children.'),
  },
  stronghold: {
    label: 'stronghold',
    purpose: t('to hold a border | to guard a road or crossing | to protect a treasury | to keep something in | as a show of one ruler’s power | as a last refuge in a lost war'),
    feature: t('Its walls are thicker on the inside than the outside. | One tower is taller, older and of different stone. | The gate has been bricked up and a new one cut elsewhere. | It has its own well, deeper than seems necessary. | Arrow slits face inward over the courtyard. | The banner on the keep belongs to no known power.'),
  },
  den: {
    label: 'hideout',
    purpose: t('by smugglers | by a band of outlaws | by rebels against the local ruler | by a secret society | by deserters | by people hiding one of their own'),
    feature: t('It has three ways out and only one way in. | The entrance is disguised as something ordinary. | Stolen goods are stacked and carefully labelled. | A warning system of bells and string runs throughout. | The walls are covered in tally marks. | It is far more comfortable than it has any right to be.'),
  },
  waypost: {
    label: 'outpost',
    purpose: t('to collect tolls | to watch a frontier | to resupply patrols | to relay messages | to trade with people beyond the border | to claim land no one else wanted'),
    feature: t('Its signal fire has not been lit in years. | Supplies arrive on schedule, but no one sees who brings them. | The ledger records travellers who never left. | It is garrisoned by far fewer than it was built for. | Someone has scratched a warning into the door. | The stables are full and the barracks empty.'),
  },
  shrine: {
    label: 'holy site',
    purpose: t('where a miracle is said to have happened | to mark a saint’s grave | to appease something feared | by pilgrims, stone by carried stone | to guard a sacred spring | to honour a god now out of favour'),
    feature: t('Offerings left overnight are gone by morning. | The central image has had its face removed. | Pilgrims must enter barefoot and silent. | Its bell rings by itself in certain winds. | Two faiths share it and do not speak. | The altar is stained, and scrubbed often.'),
  },
  manor: {
    label: 'manor',
    purpose: t('for a wealthy merchant | for a noble family in decline | for a scholar who wanted solitude | as a hunting lodge | for a retired soldier | by someone no one ever met'),
    feature: t('One wing is closed, its furniture under sheets. | The portraits have been turned to face the wall. | The kitchen is stocked for a feast. | Every clock is stopped at a different hour. | The garden is immaculate while the house decays. | A room on the plans cannot be found.'),
  },
  hamlet: {
    label: 'hamlet',
    purpose: t('around a mine or quarry | at a river crossing | by exiles from a larger town | around a single large farm | by followers of a preacher | where a road once ran'),
    feature: t('No one will give a stranger their name. | Every door is painted the same colour. | There are no old people. | The well is covered and padlocked. | The inn is the largest building by far. | A festival is being prepared that no one will explain.'),
  },
  landmark: {
    label: 'landmark',
    purpose: t('as a bridge over a gorge | as a mill | as a lone inn at a crossroads | as a well in dry country | as a monument to a victory | as a ferry station'),
    feature: t('It is in better repair than anything for miles. | Travellers leave small gifts there without knowing why. | It appears on maps under three different names. | Its keeper has not aged in living memory. | Animals will not go near it. | It can be seen from much further off than it should.'),
  },
  tower: {
    label: 'watchtower',
    purpose: t('to watch the sea | to watch a pass | to watch for fire | to watch a neighbour | to watch the stars | to watch something beneath it'),
    feature: t('The stair has more steps going down than coming up. | Its light is lit each night by no one. | The top room is locked from the inside. | Its windows face only one way. | A long list of names is carved by the door, the last unfinished. | The watch log ends mid-sentence.'),
  },
}

export const ENVIRONMENTS: Record<string, { label: string; where: string; sits: string[]; feature: string[]; wildlife: string[] }> = {
  water: {
    label: 'Open water', where: 'on open water',
    sits: t('on an island barely larger than itself | on stilts above the shallows | on a moored raft of lashed hulls | beneath the surface, in a pocket of air | on a reef exposed only at low tide | aboard a great ship that no longer sails'),
    feature: t('The water around it is unnaturally still. | Weed grows thick enough to walk on. | Lights move below the surface at night. | A whirlpool turns slowly nearby. | Wrecks ring it like a fence. | The tide here keeps its own hours.'),
    wildlife: t('shoals of silver fish that scatter at a shadow | seabirds that nest on anything dry | seals that watch from a distance | eels as thick as an arm | something large that surfaces at dusk | crabs that come ashore in thousands'),
  },
  coast: {
    label: 'Coast', where: 'on the coast',
    sits: t('on a headland | in a sheltered cove | among the dunes | on a sea stack joined by a rope bridge | at the mouth of a river | on a tidal flat'),
    feature: t('The cliff beneath it is slowly giving way. | Sea caves run under it. | A wreck lies on the rocks below. | Fog comes in without warning. | The beach is littered with worn glass. | A blowhole roars with every wave.'),
    wildlife: t('gulls that mob anything carrying food | otters | long-legged wading birds | sand fleas in clouds | a colony of noisy sea lions | dogs gone wild'),
  },
  desert: {
    label: 'Desert', where: 'in the desert',
    sits: t('at an oasis | in the lee of a great dune | on a rock outcrop | in a dry riverbed | half buried in sand | on the edge of a salt pan'),
    feature: t('The sand hums when the wind is right. | The bones of some huge animal lie nearby. | A mirage of water shows each afternoon. | The well is good, and guarded. | Glass lies fused in the sand. | Old tracks lead in and none lead out.'),
    wildlife: t('scorpions under every stone | vultures | basking lizards | a herd of wild camels | jackals | snakes that hunt by night'),
  },
  otherworld: {
    label: 'Another world', where: 'in another world',
    sits: t('on a fragment of land adrift in mist | at the meeting of two skies | inside a vast, sleeping thing | on a road that loops back on itself | where a door once stood open | in a place that mirrors somewhere real'),
    feature: t('Shadows fall toward the light. | Time passes faster inside than out. | The ground remembers footsteps. | Voices carry from somewhere else. | The colours are slightly wrong. | Nothing here casts a reflection.'),
    wildlife: t('moths made of ash | birds that fly backward | pale, eyeless hounds | things that copy whatever they see | lights that follow at a distance | nothing living at all'),
  },
  forest: {
    label: 'Forest', where: 'in the forest',
    sits: t('in a clearing | among the roots of a giant tree | on a wooded ridge | beside a forest stream | where an old road is swallowed by trees | high in the canopy'),
    feature: t('The trees lean toward it. | A ring of pale mushrooms surrounds it. | Carved faces look out of the trunks. | No birds sing within sight of it. | The paths near it shift. | Old snares hang from the branches.'),
    wildlife: t('deer | wolves | wild boar | owls | a bear that knows the paths | foxes too bold for comfort'),
  },
  jungle: {
    label: 'Jungle', where: 'in the jungle',
    sits: t('on a river bluff | inside a strangler fig | beside a waterfall | on top of a buried ruin | on a rare patch of open ground | on a platform above the flood line'),
    feature: t('Vines have grown through every opening. | The air is thick with insects. | Rain falls here every afternoon. | Bright flowers hide the smell of rot. | Dripping water sounds like footsteps. | Statues stand half swallowed by roots.'),
    wildlife: t('monkeys that steal | parrots | great cats | snakes in the branches | ants that march in rivers | river beasts with too many teeth'),
  },
  mountain: {
    label: 'Mountains', where: 'in the mountains',
    sits: t('on a ledge | in a high pass | at the tree line | on a peak | at the foot of a cliff | in a hanging valley'),
    feature: t('Rockfalls have scarred the only path. | Snow lies in its shadow all year. | The wind there never stops. | Prayer flags, faded white, hang from every rope. | An echo answers a moment late. | A cave mouth nearby breathes cold air.'),
    wildlife: t('wild goats | eagles | mountain cats | marmots that whistle warnings | bears | ravens'),
  },
  plain: {
    label: 'Plains', where: 'on the plains',
    sits: t('on the only hill for miles | in a fold of the land | beside a lone tree | at a meeting of tracks | by a slow river | amid standing crops'),
    feature: t('It can be seen a day before it is reached. | The grass around it grows in a circle. | Storms break over it first. | Old burial mounds dot the land nearby. | A dry well stands beside it. | The road to it is rutted by heavy wagons.'),
    wildlife: t('herds of grazing beasts | hawks | wild horses | hares | packs of wild dogs | locusts, in season'),
  },
  swamp: {
    label: 'Swamp', where: 'in the swamp',
    sits: t('on a hummock of firm ground | on piles driven into the mud | on a causeway | in a hollow of drowned trees | on a floating mat of reeds | at the edge of black water'),
    feature: t('Marsh gas burns with pale flames at night. | The boardwalks are rotten in places. | Something has gnawed the pilings. | Mist rises at dusk. | The water is warm. | The frogs fall silent all at once.'),
    wildlife: t('herons | leeches | snapping turtles | water snakes | clouds of biting flies | a great pale crocodile'),
  },
  tundra: {
    label: 'Tundra', where: 'on the tundra',
    sits: t('on a frozen shore | in the lee of a ridge | on bare rock scoured of snow | beside a hot spring | on the ice itself | in a valley of dwarf willow'),
    feature: t('Snow has drifted to the eaves. | The ground cracks like gunshots at night. | The sky burns green. | Old bones mark the trail. | Frost flowers cover every surface. | A wind-carved arch of ice stands nearby.'),
    wildlife: t('reindeer | white foxes | lean wolves | snowy owls | seals at the ice edge | a white bear'),
  },
  underground: {
    label: 'Underground', where: 'deep underground',
    sits: t('in a natural cavern | in worked tunnels | beside an underground river | on a ledge above a chasm | in the cellar of something larger | in a bubble of old lava'),
    feature: t('The air is bad in the lower reaches. | Pale fungus gives a little light. | Water drips in a steady rhythm. | The walls are scored with old tool marks. | A draught blows from an unseen opening. | Crystals grow from the roof.'),
    wildlife: t('bats | blind fish | pale crickets | rats | cave spiders | something that leaves slime trails'),
  },
  city: {
    label: 'City', where: 'in a city',
    sits: t('in a wealthy quarter | in the slums | by the docks | against the city wall | beneath the streets | in a forgotten courtyard'),
    feature: t('Newer buildings crowd it on every side. | The neighbours pretend it is not there. | A market sets up outside each morning. | Its street has no name. | Posters are pasted over its doors. | The watch avoids the street.'),
    wildlife: t('rats | pigeons | stray cats | feral dogs | crows | trained monkeys that pick pockets'),
  },
}

/** Each danger has three tables. The first completes "The danger is …"; `second` introduces the next. */
export const DANGERS: Record<string, { label: string; thinks: boolean; what: string[]; second: [string, string]; drive: string[]; twist: string[] }> = {
  beasts: {
    label: 'Wild beasts', thinks: false,
    what: t('a pack hunting together | a single huge animal | a swarm | a nesting mother | scavengers grown bold | animals driven mad'),
    second: ['Why they are here', 'They are here'],
    drive: t('because the place is warm and dry | for the food stored within | because they were driven from their old ground | because something buried draws them | because they were brought and then abandoned | because they always have been'),
    twist: t('They are starving. | They are diseased. | They are far cleverer than they should be. | Someone is feeding them. | They are protecting their young. | They are not the top of the food chain here.'),
  },
  calamity: {
    label: 'A disaster', thinks: false,
    what: t('a fire | a flood | a collapse | a sickness | a famine | a haunting'),
    second: ['How it began', 'It began'],
    drive: t('by accident | through neglect | by someone’s deliberate hand | as a punishment, people say | when something was disturbed | for no reason anyone can find'),
    twist: t('It has only just begun. | It is at its height. | It is nearly over, and the damage is done. | It comes and goes on a pattern. | It is spreading outward. | It has been held back, for now.'),
  },
  people: {
    label: 'People', thinks: true,
    what: t('a band of outlaws | a company of soldiers without a master | a sect of believers | desperate refugees | a rival expedition | a noble’s hired agents'),
    second: ['What they want', 'They want'],
    drive: t('to be left alone | what is hidden here | revenge on someone nearby | to hold the place against all comers | to finish a task before anyone notices | to draw someone here'),
    twist: t('They are divided among themselves. | They are more disciplined than they look. | They are being used by someone else. | They cannot leave, even if they wanted to. | One of them wants out. | They believe they are in the right.'),
  },
  monster: {
    label: 'A thinking monster', thinks: true,
    what: t('a creature that speaks and bargains | something old that has just woken | a shapechanger living among the others | a beast that rules lesser beasts | a spirit bound to the place | a thing from far away, stranded here'),
    second: ['What it wants', 'It wants'],
    drive: t('worship | solitude | a particular person | to grow | to go home | to be amused'),
    twist: t('It has made the place its own. | It keeps prisoners. | It can be reasoned with, at a price. | It is wounded. | It is not alone. | It does not know it is feared.'),
  },
  object: {
    label: 'An object', thinks: false,
    what: t('a weapon that should not be used | a book that should not be read | a relic that draws the wrong attention | a machine no one can stop | a treasure everyone wants | a sealed vessel'),
    second: ['What it does', 'It'],
    drive: t('changes those who hold it | calls to people in their sleep | cannot be moved | cannot be destroyed | works, but at a cost | is not what it appears'),
    twist: t('Several parties are racing for it. | Its last owner is still nearby. | It is in pieces. | It has already been stolen once. | No one here knows what it is. | It wants to be found.'),
  },
  magic: {
    label: 'Magic', thinks: false,
    what: t('a spell that never ended | a place where magic pools | a curse laid on the ground | a ward that has turned on those it guarded | a door that will not stay shut | a wish granted too literally'),
    second: ['What it does', 'It'],
    drive: t('twists whatever grows | bends time | clouds the mind | raises what was dead | silences all sound | makes true what was only said'),
    twist: t('It is getting stronger. | It is fading, and that is the problem. | It reaches only as far as the walls. | It follows those who leave. | Someone is maintaining it. | It can be undone only from inside.'),
  },
}

/** The twelve classic character archetypes: what each wants, where each is strong, and what undoes each. */
export const ARCHETYPES: [string, string, string, string][] = [
  ['Lover', 'wants closeness above all', 'is devoted', 'cannot bear to be left'],
  ['Hero', 'wants to prove themselves', 'is brave', 'cannot refuse a challenge'],
  ['Magician', 'wants to remake the world', 'is clever', 'trusts their own plan too far'],
  ['Outlaw', 'wants to tear down what stands', 'is fearless', 'makes an enemy of everyone'],
  ['Explorer', 'wants to see what lies beyond', 'is resourceful', 'never stays to finish anything'],
  ['Sage', 'wants to understand', 'is patient', 'watches when they should act'],
  ['Innocent', 'wants things to be simple and good', 'is sincere', 'is easily led'],
  ['Creator', 'wants to make something lasting', 'is inventive', 'sacrifices people to the work'],
  ['Ruler', 'wants order under their own hand', 'is commanding', 'cannot share power'],
  ['Caregiver', 'wants to protect their own', 'is generous', 'smothers what they love'],
  ['Everyman', 'wants to belong', 'is steady', 'follows the crowd'],
  ['Jester', 'wants to be entertained', 'is quick-witted', 'takes nothing seriously'],
]

const PREMISE: Table[] = [
  { id: 'theme', label: 'Theme', entries: t('Debt | Homecoming | Hunger | Silence | Rivalry | Mercy | Pride | Secrecy | Loss | Temptation | Duty | Change') },
  // "Before this, the ground held …"
  { id: 'before', label: 'What was here before', entries: t('nothing but wild country | an old battlefield | a crossroads market | a healing spring | a place of execution | a beast’s hunting ground | a quarry or mine | a boundary between two peoples | a place of worship | a wizard’s workings') },
  // "Of that, …"
  { id: 'remains', label: 'What remains of it', entries: t('nothing is left at all | only a few scattered traces remain | the signs are plain to anyone who looks | much still stands, built into the newer work | it has never really gone away | it is coming back') },
  { id: 'kind', label: 'Kind of place', entries: Object.values(KINDS).map((k) => k.label) },
  { id: 'env', label: 'Surroundings', entries: Object.values(ENVIRONMENTS).map((e) => e.label) },
  { id: 'danger', label: 'Kind of danger', entries: Object.values(DANGERS).map((d) => d.label) },
]

const PLACE: Table[] = [
  { id: 'age', label: 'Age', entries: t('raised within the last year | a few years old | a generation old | a lifetime old | several lifetimes old | centuries old | older than any record | so old that no one can say who made it') },
  { id: 'condition', label: 'Condition', entries: t('pristine | well-kept | weathered | neglected | crumbling | half-ruined | ruined | rebuilt') },
  { id: 'size', label: 'Size', entries: t('cramped | small | modest | large | sprawling | vast') },
  // "It is reached …"
  { id: 'access', label: 'Way in', entries: t('by a single well-used path | only by those who know the way | across water | by a hard climb | through something else that must be passed first | easily, which is part of the problem') },
  // "Locals …"
  { id: 'known', label: 'What locals make of it', entries: t('know nothing of it | tell tales of it but keep away | know it well and avoid it | visit it openly | depend on it | argue about what it really is') },
]

const SURROUNDINGS: Table[] = [
  // "Lately the weather has been …"
  { id: 'weather', label: 'Recent weather', entries: t('calm and clear | unsettled | wet for days | bitterly cold | hot and close | stormy | foggy | strange for the season') },
  { id: 'press', label: 'Land and place', entries: t('The land is slowly taking it back. | The place has changed the land around it. | Land and place ignore each other. | It could not survive here without constant work. | The surroundings hide it well. | The surroundings make it hard to leave.') },
]

const STAKES: Table[] = [
  // "No one has dealt with it because …"
  { id: 'unsolved', label: 'Why it has not been dealt with', entries: t('no one knows it is there | those who tried did not come back | someone powerful profits from it | the cure looks worse than the harm | it is on land no one will claim | people have grown used to it | it only harms outsiders | the one person who could is missing') },
  // "Left alone, it will …"
  { id: 'unchecked', label: 'What happens if it is left', entries: t('spread to the nearest settlement | draw something worse | destroy the place entirely | become permanent | make someone very rich | be forgotten, until it is too late | turn neighbours against each other | burn itself out, taking everything with it') },
  // "Outsiders should care because …"
  { id: 'stake', label: 'Why outsiders should care', entries: t('someone they know is inside | a reward has been posted | the road they need runs past it | it holds something they are looking for | they are being blamed for it | an innocent asked for help | it will reach them next | a rival is already on the way') },
]

const BEHIND: Table[] = [
  { id: 'archetype', label: 'Archetype', entries: ARCHETYPES.map((a) => a[0]) },
  { id: 'manner', label: 'Manner', entries: t('soft-spoken and courteous | loud and warm | cold and exact | restless, always moving | weary | theatrical | blunt | watchful and slow to speak') },
  // "… and can be reached through …"
  { id: 'soft', label: 'Soft spot', entries: t('a debt they feel they owe | a person they love | their pride in their work | their fear of being forgotten | an old wound | a promise they made | their curiosity | their exhaustion') },
]

const key = (group: Record<string, unknown>, index: number | undefined) => (index === undefined ? undefined : Object.keys(group)[index])

/** The steps and tables that apply, given what has been rolled so far. */
export function stepsFor(rolls: Rolls): Step[] {
  const kind = key(KINDS, rolls.kind), env = key(ENVIRONMENTS, rolls.env), danger = key(DANGERS, rolls.danger)
  const steps: Step[] = [{
    title: 'Premise', blurb: 'The idea behind the place, and the three choices that shape everything after.',
    tables: PREMISE.filter((tb) => tb.id !== 'remains' || (rolls.before !== undefined && rolls.before !== 0)),
  }]
  if (kind) {
    const k = KINDS[kind]
    steps.push({
      title: `The ${k.label}`, blurb: 'What it is, and what state it is in.',
      tables: [
        // "It was made …"
        { id: `kind.${kind}.purpose`, label: 'Why it was made', entries: k.purpose },
        { id: `kind.${kind}.feature`, label: 'What stands out', entries: k.feature },
        ...PLACE,
      ],
    })
  }
  if (env) {
    const e = ENVIRONMENTS[env]
    steps.push({
      title: `Surroundings: ${e.label.toLowerCase()}`, blurb: 'Where it stands and what the country around it is like.',
      tables: [
        // "It stands …"
        { id: `env.${env}.sits`, label: 'Where it stands', entries: e.sits },
        { id: `env.${env}.feature`, label: 'What is notable nearby', entries: e.feature },
        // "The country around is home to …"
        { id: `env.${env}.wildlife`, label: 'Wildlife', entries: e.wildlife },
        ...SURROUNDINGS,
      ],
    })
  }
  if (danger) {
    const d = DANGERS[danger]
    steps.push({
      title: `Danger: ${d.label.toLowerCase()}`, blurb: 'What makes the place dangerous, and why that matters.',
      tables: [
        { id: `danger.${danger}.what`, label: 'What it is', entries: d.what },
        { id: `danger.${danger}.drive`, label: d.second[0], entries: d.drive },
        { id: `danger.${danger}.twist`, label: 'The complication', entries: d.twist },
        ...STAKES,
      ],
    })
    if (d.thinks) steps.push({ title: 'Who is behind it', blurb: 'A personality for whoever leads the danger.', tables: BEHIND })
  }
  return steps
}

/** Roll every table that applies and is not locked. Later tables depend on earlier ones, so it goes round until none is left. */
export function rollAll(rolls: Rolls, locked: string[] = [], random: () => number = Math.random): Rolls {
  const out: Rolls = { ...rolls }
  const done = new Set<string>()
  for (let guard = 0; guard < 60; guard++) {
    const next = stepsFor(out).flatMap((s) => s.tables).find((tb) => !done.has(tb.id))
    if (!next) break
    done.add(next.id)
    if (!locked.includes(next.id) || out[next.id] === undefined) out[next.id] = Math.floor(random() * next.entries.length)
  }
  return out
}

const an = (w: string) => `${/^[aeiou]/i.test(w) ? 'an' : 'a'} ${w}`

/** The place written up as a brief: one paragraph for each step, leaving out whatever has not been rolled. */
export function brief(name: string, rolls: Rolls): string[] {
  const tables = Object.fromEntries(stepsFor(rolls).flatMap((s) => s.tables).map((tb) => [tb.id, tb]))
  const get = (id: string) => (rolls[id] === undefined ? undefined : tables[id]?.entries[rolls[id]!])
  const say = (strings: TemplateStringsArray, ...values: (string | undefined)[]) =>
    values.some((v) => v === undefined) ? '' : strings.reduce((s, part, i) => s + part + (values[i] ?? ''), '')
  const kind = key(KINDS, rolls.kind), env = key(ENVIRONMENTS, rolls.env), danger = key(DANGERS, rolls.danger)
  const called = name.trim() || 'This place'
  const out: string[] = []

  if (kind) {
    const k = KINDS[kind]
    const looks = [get('condition'), get('size')].filter(Boolean).join(', ')
    out.push([
      `${called} is ${an(`${looks ? `${looks} ` : ''}${k.label}`)}${get('age') ? `, ${get('age')}` : ''}.`,
      say`It was made ${get(`kind.${kind}.purpose`)}.`, get(`kind.${kind}.feature`),
      say`It is reached ${get('access')}.`, say`Locals ${get('known')}.`,
    ].filter(Boolean).join(' '))
  }
  if (env) {
    const e = ENVIRONMENTS[env]
    out.push([
      get(`env.${env}.sits`) ? `It stands ${get(`env.${env}.sits`)}, ${e.where}.` : `It stands ${e.where}.`,
      get(`env.${env}.feature`), say`The country around is home to ${get(`env.${env}.wildlife`)}.`,
      say`Lately the weather has been ${get('weather')}.`, get('press'),
    ].filter(Boolean).join(' '))
  }
  if (get('before')) out.push([say`Before this, the ground held ${get('before')}.`, rolls.before ? say`Of that, ${get('remains')}.` : ''].filter(Boolean).join(' '))
  if (danger) {
    const d = DANGERS[danger]
    out.push([
      say`The danger is ${get(`danger.${danger}.what`)}.`, say`${d.second[1]} ${get(`danger.${danger}.drive`)}.`, get(`danger.${danger}.twist`),
      say`No one has dealt with it because ${get('unsolved')}.`, say`Left alone, it will ${get('unchecked')}.`, say`Outsiders should care because ${get('stake')}.`,
    ].filter(Boolean).join(' '))
    const a = rolls.archetype === undefined ? undefined : ARCHETYPES[rolls.archetype]
    if (d.thinks && a) out.push([
      `At the heart of it is ${an(a[0].toLowerCase())}: ${danger === 'monster' ? 'something' : 'someone'} who ${a[1]}, ${a[2]}, and ${a[3]}.`,
      get('manner') || get('soft') ? `They ${[get('manner') && `are ${get('manner')}`, get('soft') && `can be reached through ${get('soft')}`].filter(Boolean).join(', and ')}.` : '',
    ].filter(Boolean).join(' '))
  }
  if (get('theme')) out.push(`The thread running through it all is ${get('theme')!.toLowerCase()}.`)
  return out
}

/** The word for the kind of place rolled, for naming it. */
export const kindLabel = (rolls: Rolls) => { const k = key(KINDS, rolls.kind); return k ? KINDS[k].label : 'place' }

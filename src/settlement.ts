// The settlements tool: a trading post, village, town, city, capital or fortress town built by rolling on
// tables, in five steps — foundations, people, rule and order, places, and trouble and talk. All table
// text is original to this project.
//
// Most entries complete a sentence in the brief; the comments beside each table say which. The kind of
// settlement brings three tables of its own: what it is known for, how many live there, and one more
// that only that kind has.

import { an, entries as t, reader, rollTables, type Rolls, type Step, type Table } from './roller'

export const TYPES: Record<string, { label: string; known: string[]; size: string[]; extra: [string, string[]] }> = {
  post: {
    label: 'trading post',
    known: t('furs and hides | salt | horses | news from beyond the frontier | tools and repairs | goods that are not asked about'),
    size: t('a dozen permanent residents | a few dozen people | about a hundred people in season | a few hundred people when the caravans are in'),
    extra: ['How trade is run', t('A single family controls every stall. | Anyone may trade who pays the gate fee. | Trade is by barter only. | Prices are set each morning by lot. | Half the trade happens after dark. | A factor from a distant company oversees it all.')],
  },
  village: {
    label: 'village',
    known: t('its cheese | a yearly fair | stubborn independence | fine wool | a healing well | an old feud'),
    size: t('a few dozen people | about a hundred people | a few hundred people | close to a thousand people'),
    extra: ['A hardship remembered', t('A fire took half of it within living memory. | A hard winter emptied many houses. | Its young keep leaving for the towns. | Raiders came once, and are still talked about. | A blight ruined three harvests running. | It has known no real hardship, and it shows.')],
  },
  town: {
    label: 'town',
    known: t('its cloth market | its breweries | a famous school | its bridge and tolls | its metalwork | its law courts'),
    size: t('a thousand people or so | a few thousand people | several thousand people | nearly ten thousand people'),
    extra: ['Market day', t('Market day fills every street once a week. | The market runs daily and never quite closes. | Two rival markets compete on opposite sides of town. | The market is held under a great covered hall. | Market day doubles as court day. | The market has shrunk, and people notice.')],
  },
  city: {
    label: 'city',
    known: t('its great harbour | its university | its banking houses | its theatres | its foundries | its temples'),
    size: t('about ten thousand people | some twenty thousand people | fifty thousand people | more people than anyone has counted'),
    extra: ['Districts', t('It is divided by wealth, the rich uphill and the poor by the water. | Each trade keeps to its own quarter. | Old city and new city barely speak. | Its districts are separated by canals. | Walled quarters lock their gates at night. | Its districts follow no plan anyone can explain.')],
  },
  capital: {
    label: 'capital',
    known: t('its palace | its parliament of guilds | its monuments | its bureaucracy | its intrigue | its festivals'),
    size: t('tens of thousands of people | a hundred thousand people | several hundred thousand people | a number of people its own clerks dispute'),
    extra: ['The court', t('The court is open to petitioners one day in ten. | The court is ruled by ceremony more than by the ruler. | Favourites rise and fall by the season. | Foreign envoys outnumber the courtiers. | The ruler is rarely seen, and the ministers govern. | The court is in mourning, and has been for years.')],
  },
  fort: {
    label: 'fortress town',
    known: t('never having fallen | its engineers | its harsh discipline | its horse breeding | its armouries | its veterans'),
    size: t('a garrison and little else | a garrison and its families | a few thousand people, half of them soldiers | a full town inside the walls'),
    extra: ['The garrison', t('The garrison is under strength and knows it. | The garrison is well drilled and bored. | Half the garrison are hired swords. | The garrison has not been paid in months. | The garrison is devoted to its commander. | The garrison and the townsfolk loathe each other.')],
  },
}

const FOUNDATIONS: Table[] = [
  { id: 'type', label: 'Kind of settlement', entries: Object.values(TYPES).map((x) => x.label) },
  // "It began …"
  { id: 'origin', label: 'How it began', entries: t('as a camp that never moved on | around a river crossing | by royal charter | as a refuge in wartime | around a mine | at a meeting of trade roads | on the ruins of something older | around a shrine') },
  { id: 'age', label: 'Age', entries: t('barely a generation old | a few generations old | centuries old | ancient | older than its own records | newly refounded after a disaster') },
  { id: 'condition', label: 'Condition', entries: t('squalid | shabby | plain | well-kept | prosperous | splendid') },
  // "Visitors are …"
  { id: 'traffic', label: 'Visitors', entries: t('almost unknown | rare | a steady trickle | common | constant | more than it can hold') },
]

const PEOPLE: Table[] = [
  // "Its people are …"
  { id: 'mix', label: 'Who lives there', entries: t('nearly all of one folk | mostly one folk with a few others | two peoples living side by side | a mix with no majority | newcomers who outnumber the old families | whoever washed up here') },
  // "most are …"
  { id: 'wealth', label: 'Wealth', entries: t('destitute | poor | getting by | comfortable | well off | rich, with a poor underside') },
  // "Toward strangers they are …"
  { id: 'mood', label: 'Toward strangers', entries: t('hostile | wary | indifferent | polite but distant | curious | welcoming | eager to sell | desperate for news') },
]

const RULE: Table[] = [
  // "It is run by …"
  { id: 'leader', label: 'Who runs it', entries: t('an elected mayor | a hereditary lord | a council of elders | a merchants’ guild | a priesthood | a military governor | whoever is richest | no one in particular | a distant ruler’s appointee | a hidden hand behind a figurehead') },
  // "The law is …"
  { id: 'law', label: 'The law', entries: t('absent | a volunteer watch | a sheriff and deputies | a paid watch, mostly honest | a strong and strict guard | a guard that answers to whoever pays') },
  // "… and crime is …"
  { id: 'crime', label: 'Crime', entries: t('almost unknown | petty | an everyday nuisance | organised | in the open | the real government') },
  // "It is defended by …"
  { id: 'defence', label: 'Defences', entries: t('nothing | a ditch and fence | a wooden palisade | a stone wall | walls and towers | walls within walls') },
]

const SHOPS = t('a bookbinder | a clockmaker | an apothecary | a mapseller | a locksmith | a dyer | a bowyer | a chandler | a jeweller who asks no questions | a seller of curiosities | a tailor to the gentry | a pawnbroker')

const PLACES: Table[] = [
  { id: 'market', label: 'The market', entries: t('The market square is cobbled and crowded. | Trade spills out along the main road. | The market sits under old trees. | Stalls line the waterfront. | A market cross stands at the centre, worn smooth. | There is no fixed market; sellers go door to door.') },
  // "The best-known inn is …"
  { id: 'inn', label: 'The best-known inn', entries: t('a low, smoky house with excellent stew | a tall, draughty place run by three sisters | a former chapel, pews and all | a coaching inn with a famous cellar | little more than a barn with a fire | spotless, expensive and half empty | always full, with a waiting list for the floor | known for a ghost that the landlord encourages') },
  // "Shops of note include … and …"
  { id: 'shop1', label: 'A shop of note', entries: SHOPS },
  { id: 'shop2', label: 'Another shop of note', entries: SHOPS },
  // "There is also …"
  { id: 'service', label: 'A service', entries: t('a bathhouse | a healer’s house | a public letter-writer | a moneylender | a stable and farrier | a hiring hall | a messenger office | a courthouse') },
  // "The main place of worship is …"
  { id: 'worship', label: 'Place of worship', entries: t('a plain wooden chapel | a grand temple, too large for the place | a shrine at a spring | a row of small shrines to many gods | an old stone circle still in use | a temple fallen out of favour | a new faith’s meeting house | nowhere at all, since people pray at home') },
  // "… and people gather …"
  { id: 'gather', label: 'Where people gather', entries: t('at the well | on the green | in the tavern yard | at the bridge | on the temple steps | at the market cross') },
]

const TROUBLE: Table[] = [
  { id: 'history', label: 'Recent history', entries: t('A new leader took over within the year. | A fire or flood struck not long ago, and the repairs are unfinished. | A great wedding joined two leading families. | A notorious criminal was caught and hanged. | A rich traveller died here, and the will is contested. | Soldiers were billeted here all last winter. | A new vein, spring or trade route was found nearby. | A sickness passed through and left its mark. | An old law was revived, to general annoyance. | Nothing has happened here in years, and people are restless.') },
  { id: 'event', label: 'Happening now', entries: t('A festival is days away. | A succession is under way, and undecided. | A trial has the whole place taking sides. | A caravan or fleet is overdue. | A stranger has been asking questions. | Recruiters are in town. | A feud has just turned violent. | A preacher is drawing crowds.') },
  // "People say …"
  { id: 'rumour', label: 'A rumour', entries: t('that the well has gone bad | that someone important is not who they claim | that there is treasure under the old mill | that the tax collector has vanished with the takings | that lights have been seen on the hill | that a war is coming | that the harvest figures were falsified | that a child was born with a strange mark | that the bridge will not last another winter | that the watch is taking bribes | that an heir has returned in secret | that something is living in the cellars') },
  // "The nearest danger is …"
  { id: 'danger', label: 'The nearest danger', entries: t('bandits on the road | wolves or worse in the hills | a rival settlement | the river in flood season | an old ruin that people avoid | a lord who covets the place | sickness in the poorer streets | its own leaders') },
]

const typeOf = (rolls: Rolls) => (rolls.type === undefined ? undefined : Object.keys(TYPES)[rolls.type])

/** The steps and tables that apply, given what has been rolled so far. */
export function stepsFor(rolls: Rolls): Step[] {
  const type = typeOf(rolls)
  const k = type && TYPES[type]
  return [
    {
      title: 'Foundations', blurb: 'What kind of settlement it is, and how it came to be.',
      // "It is known for …"
      tables: [...FOUNDATIONS, ...(k ? [{ id: `type.${type}.known`, label: 'What it is known for', entries: k.known }] : [])],
    },
    ...(k ? [
      // "It holds …"
      { title: 'People', blurb: 'Who lives there and how they take to strangers.', tables: [{ id: `type.${type}.size`, label: 'How many live there', entries: k.size }, ...PEOPLE] },
      { title: 'Rule and order', blurb: 'Who is in charge, and how well that holds.', tables: [...RULE, { id: `type.${type}.extra`, label: k.extra[0], entries: k.extra[1] }] },
      { title: 'Places', blurb: 'Where to eat, buy, pray and meet.', tables: PLACES },
      { title: 'Trouble and talk', blurb: 'What has happened, what is happening, and what people whisper.', tables: TROUBLE },
    ] : []),
  ]
}

export const rollAll = (rolls: Rolls, locked: string[] = [], random: () => number = Math.random) => rollTables(stepsFor, rolls, locked, random)

export const typeLabel = (rolls: Rolls) => { const k = typeOf(rolls); return k ? TYPES[k].label : undefined }

/** The settlement written up as a brief: one paragraph for each step, leaving out whatever has not been rolled. */
export function brief(name: string, rolls: Rolls): string[] {
  const type = typeOf(rolls)
  if (!type) return []
  const { get, say } = reader(stepsFor, rolls)
  const k = TYPES[type]
  const called = name.trim() || 'This settlement'
  const join = (parts: (string | undefined)[]) => parts.filter(Boolean).join(' ')
  const lawAndCrime = [get('law') && `The law is ${get('law')}`, get('crime') && `crime is ${get('crime')}`].filter(Boolean).join(', and ')
  const shops = [...new Set([get('shop1'), get('shop2')].filter(Boolean))].join(' and ')
  const faith = [get('worship') && `The main place of worship is ${get('worship')}`, get('gather') && `people gather ${get('gather')}`].filter(Boolean).join(', and ')

  return [
    join([
      `${called} is ${an(`${get('condition') ? `${get('condition')} ` : ''}${k.label}`)}${get('age') ? `, ${get('age')}` : ''}.`,
      say`It began ${get('origin')}.`, say`It is known for ${get(`type.${type}.known`)}.`, say`Visitors are ${get('traffic')}.`,
    ]),
    join([
      say`It holds ${get(`type.${type}.size`)}.`,
      get('mix') && `Its people are ${get('mix')}${get('wealth') ? `; most are ${get('wealth')}` : ''}.`,
      say`Toward strangers they are ${get('mood')}.`,
    ]),
    join([say`It is run by ${get('leader')}.`, lawAndCrime && `${lawAndCrime.charAt(0).toUpperCase()}${lawAndCrime.slice(1)}.`, say`It is defended by ${get('defence')}.`, get(`type.${type}.extra`)]),
    join([get('market'), say`The best-known inn is ${get('inn')}.`, shops && `Shops of note include ${shops}.`, say`There is also ${get('service')}.`, faith && `${faith.charAt(0).toUpperCase()}${faith.slice(1)}.`]),
    join([get('history'), get('event'), say`People say ${get('rumour')}.`, say`The nearest danger is ${get('danger')}.`]),
  ].filter(Boolean)
}

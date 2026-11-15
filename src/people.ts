// Character cards and the portrait they add up to. All card text is original to this project.
//
// A character has one card in each of eight slots. Four slots draw from a core deck that suits any
// story; the other four draw from genre packs. Card text may mention the character's Role with
// {role|fallback}, which becomes "a hedge witch" once a Role is drawn and the fallback until then.

export type Slot = 'role' | 'background' | 'motivation' | 'strength' | 'flaw' | 'turning' | 'secret' | 'catalyst'

export const SLOTS: Slot[] = ['role', 'background', 'motivation', 'strength', 'flaw', 'turning', 'secret', 'catalyst']

export const SLOT_INFO: Record<Slot, { label: string; blurb: string; genre: boolean; hint: string }> = {
  role: { label: 'Role', blurb: 'What they do', genre: true, hint: 'A job or station, e.g. “River pilot”' },
  background: { label: 'Background', blurb: 'Where they come from', genre: false, hint: 'Follows “They…”, e.g. “Grew up the youngest of nine”' },
  motivation: { label: 'Motivation', blurb: 'What they want', genre: false, hint: 'Starts with “To”, e.g. “To be left in peace”' },
  strength: { label: 'Strength', blurb: 'What they can count on', genre: false, hint: 'A quality, e.g. “An ear for lies”' },
  flaw: { label: 'Flaw', blurb: 'What trips them up', genre: false, hint: 'A quality, e.g. “A weakness for a wager”' },
  turning: { label: 'Turning point', blurb: 'What made them', genre: true, hint: 'Follows “Years ago they…”, e.g. “Lost a duel on purpose”' },
  secret: { label: 'Secret', blurb: 'What they hide', genre: true, hint: 'Follows “they…”, e.g. “Stole the blade they claim was a gift”' },
  catalyst: { label: 'Catalyst', blurb: 'What sets the story moving', genre: true, hint: 'A full sentence, e.g. “The river has started running backward”' },
}

export const GENRES: Record<string, string> = { fantasy: 'Fantasy', scifi: 'Science fiction', modern: 'Modern', horror: 'Horror' }

export interface PersonCard { id: string; slot: Slot; set: string; text: string }

const CORE: Partial<Record<Slot, string[]>> = {
  motivation: [
    'To earn back a family name', 'To see the sea before they die', 'To pay a debt no one else remembers', 'To be left in peace',
    'To finish what a mentor started', 'To outdo an older sibling', 'To find the person who saved them', 'To build something that outlasts them',
    'To never be hungry again', 'To be told, just once, that they did well', 'To keep a promise made to the dead', 'To learn who sold out their family',
    'To make one honest fortune', 'To protect a place that does not know it needs protecting', 'To be forgotten by the people hunting them',
    'To master a craft no one will teach them', 'To bring a guilty person before a judge', 'To give a child the life they never had',
    'To prove a mad theory right', 'To go home, wherever that turns out to be', 'To be feared rather than pitied',
    'To repay a kindness they did not deserve', 'To win an argument that ended years ago', 'To see what lies past the edge of the map',
  ],
  strength: [
    'A steady nerve when others panic', 'A memory for faces and the names that go with them', 'The patience to wait a full season for the right moment',
    'A laugh that puts strangers at ease', 'Hands that can mend almost anything', 'An ear for lies',
    'The stamina to keep walking after everyone else has stopped', 'A gift for languages', 'The knack of being overlooked',
    'A stubborn sense of fairness', 'A head for numbers and odds', 'The courage to say the unwelcome thing', 'An instinct for where the exits are',
    'A voice people follow without knowing why', 'The habit of finishing what they start', 'A talent for making do with nothing',
    'Kindness that costs them something', 'A nose for weather and trouble', 'The discipline to practise when no one is watching',
    'A way with frightened animals', 'A flair for the well-timed lie', 'Eyes that miss very little',
    'The ability to sleep anywhere and wake at once', 'A reputation that walks into the room first',
  ],
  flaw: [
    'A temper that arrives without warning', 'The belief that asking for help is losing', 'A weakness for a wager', 'A tongue that outruns their judgment',
    'Loyalty to someone who does not deserve it', 'The need to have the last word', 'A habit of vanishing when things get hard',
    'Pride in the work of {role|their trade} that shades into contempt', 'A grudge kept polished for years', 'Fear of deep water',
    'Generosity with other people’s money', 'The certainty that they are the cleverest person present', 'A soft spot for a sad story',
    'An inability to leave a locked door alone', 'Trust given too fast and withdrawn too late', 'A thirst they call a hobby',
    'Envy of anyone at ease in a crowd', 'The conviction that rules are for other people', 'A habit of promising more than they can deliver',
    'Squeamishness at the sight of blood', 'A memory that edits out their own mistakes', 'Restlessness that ruins every good thing',
    'Honesty used as a weapon', 'A superstition they will not explain',
  ],
  background: [
    'Grew up the youngest of nine', 'Were raised by a grandparent who told better stories than truths', 'Have never lived more than a year in one place',
    'Inherited a house they cannot afford to keep', 'Walk with an old injury they refuse to discuss', 'Were born into money that ran out',
    'Learned to read late and now read everything', 'Carry a name that opens some doors and closes others', 'Have a twin who took the other road',
    'Came to the work of {role|their trade} by accident and stayed', 'Owe their upbringing to an institution, not a family',
    'Speak with an accent from somewhere they will not name', 'Are the only one of their old circle still alive',
    'Were promised to a life they walked away from', 'Look after a relative who no longer knows them', 'Have a child they are not allowed to see',
    'Grew up on the wrong side of a border', 'Were famous once, briefly, as a child', 'Keep a pet that everyone else finds alarming',
    'Left a faith and still keep its habits', 'Are far older than they look', 'Send most of what they earn to someone far away',
    'Have been mistaken for someone else all their life', 'Sleep badly and have learned to use the hours',
  ],
}

const PACKS: Record<string, Partial<Record<Slot, string[]>>> = {
  fantasy: {
    role: ['Hedge witch', 'Caravan guard', 'Court cartographer', 'Gravedigger', 'Disgraced knight', 'Ferry keeper', 'Royal food taster',
      'Travelling tinker', 'Temple bell-ringer', 'Dragon-bone merchant', 'Runaway squire', 'Border toll collector', 'Herbalist’s apprentice', 'Wandering minstrel'],
    secret: ['Cannot work a single spell, whatever people believe', 'Carry a royal seal they have no right to',
      'Once opened a gate to an enemy in exchange for a life', 'Are the last heir of a house everyone thinks extinct',
      'Stole the blade they claim was a gift', 'Speak nightly with something that lives in a well', 'Know where a sleeping army is buried',
      'Were never truly trained as {role|what they claim to be}', 'Made a bargain with a river spirit and have not paid',
      'Are being slowly turned to stone by an old curse'],
    turning: ['Watched a village burn and did nothing', 'Were spared by a beast that killed everyone else', 'Found a crown in a ditch and put it back',
      'Spent a winter snowed in with a dying wizard', 'Were sold as an apprentice for the price of a goat', 'Broke an oath sworn on a holy relic',
      'Carried a message that started a war', 'Were the only one to walk out of a fairy ring', 'Lost a duel on purpose', 'Buried a friend under a false name'],
    catalyst: ['A dying stranger presses a sealed map into their hands', 'The old king’s hounds have been seen on the road again',
      'A star has fallen in the next valley, and everyone is going to look', 'Their own trade has been outlawed overnight by royal decree',
      'A child arrives claiming to be their apprentice, sent by someone long dead', 'The bridge home has been burned from the far side',
      'A sword no one can lift has appeared in the market square', 'Their name has been read aloud from a list of traitors',
      'The river has started running backward', 'A dragon has asked for them by name'],
  },
  scifi: {
    role: ['Salvage diver', 'Orbital dock clerk', 'Gene-crop inspector', 'Long-haul freight pilot', 'Station chaplain', 'Black-market coder',
      'Colony schoolteacher', 'Asteroid prospector', 'Android repair technician', 'Customs officer on a border moon', 'Decommissioned soldier',
      'Dream-archive librarian', 'Terraforming surveyor', 'Stowaway'],
    secret: ['Are running on a forged identity chip', 'Sold their crew’s coordinates once, for medicine', 'Have a second set of memories that are not theirs',
      'Never passed the exam to be {role|what they claim to be}', 'Are hiding an unlicensed machine mind in their luggage',
      'Know the colony’s air supply figures are false', 'Are worth more as spare organs than as a worker, and know who has noticed',
      'Deserted in the middle of a battle', 'Have been dead once already, legally', 'Still take orders from an employer everyone thinks is bankrupt'],
    turning: ['Were the sole survivor of a hull breach', 'Woke from cold sleep forty years late', 'Grew up on a ship that never made planetfall',
      'Lost an arm to a machine and kept the machine', 'Blew the whistle on a corporation and lost everything', 'Were raised by a caretaker program',
      'Watched their home station be decommissioned', 'Won a lottery berth off a dying world', 'Spent five years in a debtors’ orbit',
      'Saw something outside the viewport that the logs do not show'],
    catalyst: ['A distress call is repeating in their own voice', 'Their employer has been bought, and all contracts are void at midnight',
      'A sealed cargo pod has started knocking from the inside', 'The only ship off-world leaves in six hours, one seat short',
      'An old war machine has woken and remembers them', 'The station’s lights have gone red and no one will say why',
      'A stranger offers to buy their memories of one particular day', 'Their clearance now opens doors it never should',
      'The colony’s founder has been found alive in storage', 'A message arrives from a planet that was never settled'],
  },
  modern: {
    role: ['Night-shift nurse', 'Small-town reporter', 'Long-distance trucker', 'Public defender', 'Wedding photographer', 'Substitute teacher', 'Line cook',
      'Insurance investigator', 'Locksmith', 'Paramedic', 'Used-book dealer', 'Ferry deckhand', 'Retired boxer', 'Hotel night manager'],
    secret: ['Have been living in their car since spring', 'Took the blame for a crime someone else committed', 'Never finished the degree on their office wall',
      'Have been skimming from the till for years', 'Know exactly what happened the night of the fire', 'Have no licence to work as {role|what they do}',
      'Left a family in another city', 'Are being paid to watch a neighbour', 'Wrote the anonymous letter that ruined a friend',
      'Won a great deal of money and told no one'],
    turning: ['Walked away from a crash that killed the driver', 'Were left at the altar', 'Testified against their own brother',
      'Spent a year unable to leave the house', 'Found a stranger’s wallet and kept it', 'Lost a job for telling the truth',
      'Were briefly famous for the worst day of their life', 'Buried both parents in one month', 'Got sober in a town where no one knew them',
      'Missed the one phone call that mattered'],
    catalyst: ['A box of someone else’s letters is delivered to their door', 'The building has been sold, and everyone must be out by the end of the month',
      'An old photograph of them appears in the news with the wrong name', 'Their estranged sister turns up with a suitcase and a child',
      'A client pays in advance and then disappears', 'The town’s only bridge is closed, with them on the wrong side',
      'A stranger at the bar knows their childhood nickname', 'They are named in the will of someone they never met',
      'The phone they found keeps ringing', 'A storm warning has just been upgraded'],
  },
  horror: {
    role: ['Cemetery night watch', 'Parish archivist', 'Lighthouse relief keeper', 'Mortician’s assistant', 'Folklore lecturer', 'Travelling exterminator',
      'Asylum orderly', 'Antique doll restorer', 'Radio host on the midnight slot', 'Country doctor', 'Estate clearance agent', 'Church organist',
      'Deep-well driller', 'Missing-persons volunteer'],
    secret: ['Have not cast a reflection since childhood', 'Hear their dead mother’s voice on the telephone',
      'Buried something in the garden that will not stay buried', 'Know the true number of rooms in the house', 'Were the one who opened the box',
      'Are older than the town records admit', 'Feed something in the cellar', 'Signed a contract they could not read', 'Have seen their own grave',
      'Took the work of {role|their trade} to stay close to what frightens them'],
    turning: ['Spent a night in a house that is no longer there', 'Were the only child who came back from the woods', 'Read a book that has since been burned',
      'Watched a congregation walk into the sea', 'Woke during their own funeral', 'Answered a knock that no one else heard',
      'Lost three days and gained a scar', 'Made a promise to a voice under the ice', 'Saw a familiar face in a century-old photograph',
      'Dug where they were told not to'],
    catalyst: ['The bells have begun to ring by themselves', 'A door has appeared in a wall that never had one',
      'Every clock in the house has stopped at the same minute', 'The missing child has come home, and is not quite right',
      'Something has been leaving gifts on the step', 'The fog has not lifted in nine days', 'A grave in the old yard has been opened from below',
      'Their own handwriting appears in a diary older than they are', 'The last bus has left, and the driver was the only one who knew the way',
      'The thing in the painting has moved'],
  },
}

const build = (set: string, pack: Partial<Record<Slot, string[]>>): PersonCard[] =>
  SLOTS.flatMap((slot) => (pack[slot] ?? []).map((text, i) => ({ id: `${set}:${slot}:${i}`, slot, set, text })))

export const PERSON_CARDS: PersonCard[] = [...build('core', CORE), ...Object.entries(PACKS).flatMap(([set, pack]) => build(set, pack))]

export interface Person {
  id: string
  name: string
  cards: Partial<Record<Slot, string>>
  locked: Slot[]
  notes: string
}

export type Lookup = Record<string, PersonCard | undefined>

const lowerFirst = (t: string) => t.charAt(0).toLowerCase() + t.slice(1)

/** "a hedge witch", "an asylum orderly" */
export const withArticle = (role: string) => `${/^[aeiou]/i.test(role) ? 'an' : 'a'} ${lowerFirst(role)}`

/** A card's text with any mention of the character's Role filled in. */
export function cardText(card: PersonCard, person: Person, cards: Lookup): string {
  const role = cards[person.cards.role ?? '']?.text
  return card.text.replace(/\{role\|([^}]*)\}/g, (_, fallback: string) => (role ? withArticle(role) : fallback))
}

/** The character written out as a few short paragraphs, one thought per card. */
export function portrait(person: Person, cards: Lookup): string[] {
  const get = (slot: Slot) => {
    const card = cards[person.cards[slot] ?? '']
    return card && lowerFirst(cardText(card, person, cards)).replace(/\.$/, '')
  }
  const name = person.name.trim() || 'This character'
  const [role, background, motivation, strength, flaw, turning, secret, catalyst] = SLOTS.map(get)

  const traits = strength && flaw ? `Their gift is ${strength}, and their flaw is ${flaw}.`
    : strength ? `Their gift is ${strength}.` : flaw ? `Their flaw is ${flaw}.` : ''
  const paragraphs = [
    [role && `${name} is ${withArticle(role)}.`, background && (role ? `They ${background}.` : `Of ${lowerFirst(name) === 'this character' ? 'this character' : name}, this much is known: they ${background}.`)],
    [motivation && `More than anything, they want ${motivation}.`, traits],
    [turning && `Years ago they ${turning}.`, secret && `What almost no one knows is that they ${secret}.`],
    [catalyst && `Now everything is about to change: ${catalyst}.`],
  ]
  return paragraphs.map((p) => p.filter(Boolean).join(' ')).filter(Boolean)
}

/** Cards that may be drawn for a slot, given the genre packs switched on. */
export const poolFor = (all: PersonCard[], slot: Slot, genres: string[]) =>
  all.filter((c) => c.slot === slot && (c.set === 'core' || c.set === 'custom' || genres.includes(c.set)))

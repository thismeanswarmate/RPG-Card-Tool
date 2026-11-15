// The story tool: a prompt is a sentence built from cards — who, what they want, what it concerns,
// and what stands in the way. All card text is original to this project.

export type CardKind = 'character' | 'drive' | 'subject' | 'obstacle' | 'trait' | 'bond' | 'question' | 'past' | 'present'

export const KIND_INFO: Record<CardKind, { label: string; cues: number; hint: string }> = {
  character: { label: 'Character', cues: 4, hint: 'Someone who makes choices' },
  drive: { label: 'Drive', cues: 2, hint: 'What they want to do' },
  subject: { label: 'Subject', cues: 4, hint: 'A thing, place or event that matters' },
  obstacle: { label: 'Obstacle', cues: 2, hint: 'What stands in the way' },
  trait: { label: 'Trait', cues: 4, hint: 'A describing word' },
  bond: { label: 'Bond', cues: 4, hint: 'How two characters are tied' },
  question: { label: 'Question', cues: 4, hint: 'Something to answer about them' },
  past: { label: 'Past', cues: 2, hint: 'What once happened between them' },
  present: { label: 'Present', cues: 2, hint: 'Why it matters again now' },
}

export const PACKS: Record<string, string> = { fantasy: 'Fantasy', scifi: 'Science fiction', horror: 'Horror', mystery: 'Mystery', curios: 'Curios', dynamics: 'Dynamics', pasts: 'Pasts' }

const words = (s: string) => s.split(';').map((w) => w.trim()).filter(Boolean)

const DECKS: Record<string, Partial<Record<CardKind, string[]>>> = {
  core: {
    character: words(`lighthouse keeper; runaway; retired soldier; forger; midwife; gambler; clockmaker; stowaway; judge; street musician; mourner; locksmith;
      ferry pilot; understudy; tax collector; beekeeper; translator; bodyguard; heir; cook; cartographer; night nurse; smuggler; schoolteacher;
      gravedigger; twin; apprentice; bounty hunter; hermit; wedding guest; pickpocket; archivist; lost child; rival; impostor; old friend;
      inventor; deserter; fortune-teller; stranger`),
    drive: words(`find; protect; destroy; steal; escape from; expose the truth about; take revenge on; be rid of; win back; hide; rebuild; return to;
      understand; sell; lay claim to; save; follow; forget; inherit; make peace with`),
    subject: words(`a locked room; an unsigned letter; the last train; a family recipe; a flooded town; a wedding; a stolen painting; an empty grave;
      a broken promise; the only bridge; a lighthouse; a debt; a secret garden; a funeral; an old map; a winning ticket;
      a closed theatre; a storm; a forged will; the family farm; a borrowed name; a sealed box; a reunion; an abandoned ship;
      a rumour; a childhood home; a trial; a bell tower; a missing hour; a small fortune; a locked diary; a festival;
      a border crossing; a rival’s notebook; an inheritance; a burning building; a first love; a final performance; a hiding place; a long winter`),
    obstacle: words(`it will cost them their oldest friendship; someone they love stands in the way; they have only until dawn; they would have to break the law;
      no one will believe them; it means going home; an old enemy wants the same thing; they must first admit a lie;
      the price is more than they own; they are being watched; it would break a promise; they will have to do it alone;
      their body is failing them; the truth would ruin an innocent person; they must trust someone who betrayed them; it can only be done once;
      they have already been warned off; it will mean leaving for good; they owe a favour to the wrong person; their family forbids it`),
    trait: words(`patient; reckless; haunted; cheerful; bitter; forgetful; proud; tender; stubborn; weary; restless; honest; crooked; lonely; brilliant; cautious;
      grieving; charming; ruthless; shy; faded; gilded; borrowed; ancient; fragile; forbidden; half-finished; well-guarded; forgotten; notorious;
      modest; ill-omened; humble; vast; tiny; crowded; silent; stolen; sacred; ruined`),
  },
  fantasy: {
    character: words(`hedge wizard; dragon’s steward; dethroned monarch; changeling; oathbound knight; goblin merchant; court seer; sword-for-hire;
      river spirit; apprentice witch; giant’s child; royal taster`),
    drive: words('break the curse on; swear an oath to; steal the magic of; wake'),
    subject: words(`a sleeping dragon; an enchanted sword; the fairy court; a cursed crown; a wizard’s tower; a prophecy; a dragon’s hoard; a ring of standing stones;
      a spellbook; a haunted forest; a royal wedding; the last unicorn`),
    obstacle: words('the magic demands a price in memory; an old prophecy says they will fail; the fair folk hold their true name; cold iron bars the way'),
    trait: words('enchanted; spellbound; dragon-scarred; moonlit; elven; runic; fey-touched; hexed'),
  },
  scifi: {
    character: words(`station mechanic; clone; ship’s pilot; android nanny; colony doctor; salvage diver; data broker; terraformer;
      cryo-sleeper; alien envoy; bounty drone; memory dealer`),
    drive: words('upload; decode; jump-start; defect from'),
    subject: words(`a derelict starship; a rogue machine mind; the last oxygen farm; a distress signal; a memory archive; a dying sun; a clone vat; a jump gate;
      an alien artefact; the colony charter; a black box; a generation ship`),
    obstacle: words('the air will run out first; the corporation owns their contract; their memories may not be their own; the machine has already predicted it'),
    trait: words('synthetic; zero-gravity; decommissioned; irradiated; orbital; glitching; cloned; neon-lit'),
  },
  horror: {
    character: words(`night porter; exorcist; sole survivor; sleepwalker; taxidermist; medium; doll maker; plague doctor;
      cult runaway; restless ghost; folklorist; undertaker`),
    drive: words('bury; summon; silence; feed'),
    subject: words(`a sealed crypt; a house that was not there yesterday; the thing in the cellar; a cursed photograph; an unmarked grave; a blood pact; a séance; a locked attic;
      the old asylum; a doll with real teeth; a midnight knock; a drowned village`),
    obstacle: words('something follows them home each night; the dead will not stay quiet; they can no longer trust their own eyes; it has already learned their name'),
    trait: words('rotting; whispering; bloodstained; sleepless; hollow-eyed; unhallowed; moth-eaten; nameless'),
  },
  mystery: {
    character: words(`night-shift detective; coroner’s clerk; hotel doorman; crime reporter; insurance adjuster; star witness; safecracker; chief suspect;
      retired inspector; switchboard operator; pawnbroker; alibi for hire`),
    drive: words('find out who killed; clear the name of; frame; cover up'),
    subject: words(`a body in the library; a missing heiress; an unbreakable alibi; a ransom note; a locked safe; the night of the blackout; a cold case; an anonymous tip;
      a stopped clock; a second will; the last witness; a stained glove`),
    obstacle: words('the evidence points at them; the only witness has vanished; someone on the inside is feeding the culprit; the case was closed years ago'),
    trait: words('tight-lipped; double-crossing; unsolved; bloodless; rain-soaked; well-alibied; planted; overlooked'),
  },
  // Things worth owning and things that should never be owned. The traits read as well on a person as on an object.
  curios: {
    subject: words(`a compass that points at what you fear; a coat with too many pockets; a key that fits every third lock; a mirror that runs an hour late;
      a ring that cannot be given away; a lantern that burns without fuel; a deck of cards with one face missing; a music box nobody wound;
      a blade that will not cut its maker; a book that adds a page each night; a coin that always comes back; a bottle of bottled weather`),
    trait: words(`cursed; blessed; counterfeit; priceless; much-mended; long-lost; oath-bound; ill-gotten; unlucky; unbreakable; hungry; heirloom;
      whisper-quiet; twice-stolen; half-awake; uninvited`),
  },
  // What once passed between a character and someone or something else, and why it has come back.
  pasts: {
    past: words(`was saved by; betrayed; was raised beside; swore to protect; walked away from; was nearly ruined by; made; lost;
      lied about; was promised; buried the truth about; won; kept watch over; took the blame for; was forgiven by; owed everything to;
      fled from; taught everything to; hid; gave up; was named after; first found`),
    present: words(`the wrong people have started asking questions; it turns out to have been built on a lie; the debt has come due; someone else has found out;
      it is happening again; the other side remembers it differently; a letter has arrived about it; there is finally a chance to put it right;
      the proof has surfaced; someone is using it against them; nobody else remembers it; it is about to be made public;
      the same choice has come round again; an old witness has returned; it no longer feels like the right thing; what was lost has been found;
      the promise is being called in; a stranger knows every detail; it can no longer be hidden; they are being thanked for it by the wrong person;
      it has been inherited; time is running out to speak of it`),
  },
  dynamics: {
    bond: words(`former teacher and student; estranged siblings; rivals since childhood; bound by a life-debt; secretly in love; keepers of the same lie;
      business partners who no longer speak; guardian and ward; sworn enemies forced to cooperate; strangers who share a face; old comrades-in-arms;
      blackmailer and victim; promised to each other as children; the only two who know the truth; neighbours feuding over a fence; each other’s last living relative`),
    question: words(`What would they never forgive?; Who do they write to?; What do they pretend not to want?; What are they proudest of?;
      Whose approval do they still need?; What did they leave behind?; What do they do when no one is watching?; What would make them walk away?;
      Who taught them to lie?; What do they keep in their pockets?; What can they not say aloud?; When were they last truly afraid?;
      What do they owe, and to whom?; Which rule do they never break?; What do they believe that is not true?; Who would they die for?`),
  },
}

export interface StoryCard { id: string; kind: CardKind; deck: string; cues: string[] }

export const STORY_CARDS: StoryCard[] = Object.entries(DECKS).flatMap(([deck, kinds]) =>
  (Object.entries(kinds) as [CardKind, string[]][]).flatMap(([kind, list]) => {
    const n = KIND_INFO[kind].cues
    return Array.from({ length: Math.floor(list.length / n) }, (_, i) => ({ id: `${deck}:${kind}:${i}`, kind, deck, cues: list.slice(i * n, i * n + n) }))
  }))

export const CARD: Record<string, StoryCard> = Object.fromEntries(STORY_CARDS.map((c) => [c.id, c]))

export interface SlotDef {
  id: string
  kind: CardKind
  label: string
  /** Left empty by a full draw about half the time. */
  optional?: boolean
  /** A second kind this slot may hold instead. */
  alt?: CardKind
}

export interface Held { card: string; active: number; locked?: boolean }
export interface Story { id: string; pattern: string; slots: Record<string, Held | undefined>; notes: string }

type Get = (slot: string) => { kind: CardKind; text: string } | undefined

const article = (w: string) => (/^([aeiou]|heir|hour|honest)/i.test(w) ? 'an' : 'a')
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)

/** "a patient forger" / "a forbidden locked room" / "the quiet last train" */
function phrase(get: Get, slot: string, traitSlot?: string, definite = false): string | undefined {
  const main = get(slot)
  if (!main) return undefined
  const trait = traitSlot && !definite ? get(traitSlot)?.text : undefined
  let lead = ''
  let noun = main.text
  if (main.kind === 'subject') {
    const m = /^(a|an|the) (.*)$/.exec(noun)!
    lead = m[1]
    noun = m[2]
  }
  const body = [trait, noun].filter(Boolean).join(' ')
  if (definite || lead === 'the') return `the ${body}`
  return `${article(body)} ${body}`
}

const sentence = (subject: string | undefined, drive: string | undefined, target: string | undefined, but: string | undefined) => {
  if (!subject) return ''
  const want = drive ? ` wants to ${drive}${target ? ` ${target}` : ' …'}` : target ? ` is drawn to ${target}` : ''
  if (!want) return `${cap(subject)}.`
  return `${cap(subject)}${want}${but ? `, but ${but}` : ''}.`
}

export interface Pattern { id: string; name: string; blurb: string; slots: SlotDef[]; lead: string; /** Who or what the lead's past is with. */ other: string; write(get: Get): string[] }

const T = (id: string, of: string): SlotDef => ({ id, kind: 'trait', label: `Trait for ${of}`, optional: true })

export const PATTERNS: Pattern[] = [
  {
    id: 'seed', name: 'Story seed', blurb: 'One character, one want, one obstacle.', lead: 'who', other: 'what',
    slots: [
      { id: 'who', kind: 'character', label: 'Character' }, T('whoT', 'the character'), { id: 'drive', kind: 'drive', label: 'Drive' },
      { id: 'what', kind: 'subject', label: 'Subject', alt: 'character' }, T('whatT', 'the subject'), { id: 'but', kind: 'obstacle', label: 'Obstacle' },
    ],
    write: (g) => [sentence(phrase(g, 'who', 'whoT'), g('drive')?.text, phrase(g, 'what', 'whatT'), g('but')?.text)],
  },
  {
    id: 'study', name: 'Character study', blurb: 'A fuller character with something they carry.', lead: 'who', other: 'what',
    slots: [
      { id: 'who', kind: 'character', label: 'Character' }, T('whoT', 'the character'),
      { id: 'has', kind: 'subject', label: 'What they carry', optional: true }, T('hasT', 'what they carry'),
      { id: 'drive', kind: 'drive', label: 'Drive' }, { id: 'what', kind: 'subject', label: 'What they want', alt: 'character' }, T('whatT', 'what they want'),
      { id: 'but', kind: 'obstacle', label: 'Obstacle' },
    ],
    write: (g) => {
      const who = phrase(g, 'who', 'whoT')
      const has = phrase(g, 'has', 'hasT')
      return [sentence(who && has ? `${who} with ${has}` : who, g('drive')?.text, phrase(g, 'what', 'whatT'), g('but')?.text)]
    },
  },
  {
    id: 'circle', name: 'Two-way street', blurb: 'Two characters who each want something from the other.', lead: 'a', other: 'b',
    slots: [
      { id: 'a', kind: 'character', label: 'First character' }, T('aT', 'the first'), { id: 'aDrive', kind: 'drive', label: 'First drive' },
      { id: 'aBut', kind: 'obstacle', label: 'First obstacle' },
      { id: 'b', kind: 'character', label: 'Second character' }, T('bT', 'the second'), { id: 'bDrive', kind: 'drive', label: 'Second drive' },
      { id: 'bBut', kind: 'obstacle', label: 'Second obstacle' },
    ],
    write: (g) => [
      sentence(phrase(g, 'a', 'aT'), g('aDrive')?.text, phrase(g, 'b', 'bT'), g('aBut')?.text),
      g('bDrive') ? sentence(phrase(g, 'b', undefined, true), g('bDrive')?.text, phrase(g, 'a', undefined, true), g('bBut')?.text) : '',
    ],
  },
  {
    id: 'clash', name: 'Collision course', blurb: 'Two characters after the same thing for different reasons.', lead: 'a', other: 'x',
    slots: [
      { id: 'a', kind: 'character', label: 'First character' }, T('aT', 'the first'), { id: 'aDrive', kind: 'drive', label: 'First drive' },
      { id: 'aBut', kind: 'obstacle', label: 'First obstacle' },
      { id: 'x', kind: 'subject', label: 'What they both want', alt: 'character' }, T('xT', 'what they want'),
      { id: 'b', kind: 'character', label: 'Second character' }, T('bT', 'the second'), { id: 'bDrive', kind: 'drive', label: 'Second drive' },
      { id: 'bBut', kind: 'obstacle', label: 'Second obstacle' },
    ],
    write: (g) => [
      sentence(phrase(g, 'a', 'aT'), g('aDrive')?.text, phrase(g, 'x', 'xT'), g('aBut')?.text),
      sentence(phrase(g, 'b', 'bT'), g('bDrive')?.text, phrase(g, 'x', undefined, true)?.replace(/^the /, 'the same '), g('bBut')?.text),
    ],
  },
  {
    id: 'torn', name: 'Torn in two', blurb: 'One character pulled between two things they cannot both have.', lead: 'who', other: 'x',
    slots: [
      { id: 'who', kind: 'character', label: 'Character' }, T('whoT', 'the character'),
      { id: 'xDrive', kind: 'drive', label: 'First drive' }, { id: 'x', kind: 'subject', label: 'First desire', alt: 'character' }, T('xT', 'the first desire'),
      { id: 'yDrive', kind: 'drive', label: 'Second drive' }, { id: 'y', kind: 'subject', label: 'Second desire', alt: 'character' }, T('yT', 'the second desire'),
    ],
    write: (g) => {
      const first = sentence(phrase(g, 'who', 'whoT'), g('xDrive')?.text, phrase(g, 'x', 'xT'), undefined)
      const y = phrase(g, 'y', 'yT')
      return [first && g('yDrive') && y ? `${first.slice(0, -1)}, but also wants to ${g('yDrive')!.text} ${y}.` : first]
    },
  },
]

export const PATTERN: Record<string, Pattern> = Object.fromEntries(PATTERNS.map((p) => [p.id, p]))

/** The slots a story has: its pattern's, plus a past and its present with the Pasts pack, and a Question — and a Bond for two characters — with the Dynamics pack. */
export function slotsOf(pattern: string, packs: string[]): SlotDef[] {
  const p = PATTERN[pattern] ?? PATTERNS[0]
  const pair = p.slots.filter((s) => s.kind === 'character').length > 1
  return [
    ...p.slots,
    ...(packs.includes('pasts') ? [{ id: 'past', kind: 'past', label: 'What happened between them' }, { id: 'now', kind: 'present', label: 'Why it matters now' }] as SlotDef[] : []),
    ...(packs.includes('dynamics') && pair ? [{ id: 'bond', kind: 'bond', label: 'Bond between them' } as SlotDef] : []),
    ...(packs.includes('dynamics') ? [{ id: 'ask', kind: 'question', label: 'Question' } as SlotDef] : []),
  ]
}

const getter = (story: Story): Get => (slot) => {
  const held = story.slots[slot]
  const card = held && CARD[held.card]
  return card ? { kind: card.kind, text: card.cues[held.active] } : undefined
}

/** The prompt as sentences, followed by any bond and question. */
export function write(story: Story): string[] {
  const p = PATTERN[story.pattern] ?? PATTERNS[0]
  const g = getter(story)
  const lead = phrase(g, p.lead, undefined, true)
  return [
    ...p.write(g),
    lead && g('past') && phrase(g, p.other, undefined, true)
      ? `Long ago ${lead} ${g('past')!.text} ${phrase(g, p.other, undefined, true)}${g('now') ? `, and now ${g('now')!.text}` : ''}.` : '',
    g('bond') ? `The two are ${g('bond')!.text}.` : '',
    g('ask') ? `${lead ? `About ${lead}: ` : ''}${g('ask')!.text}` : '',
  ].filter(Boolean)
}

/** A random card of a kind from the decks in play, avoiding ones the story already uses. */
export function drawCard(kind: CardKind, packs: string[], avoid: string[] = []): Held | undefined {
  const pool = STORY_CARDS.filter((c) => c.kind === kind && (c.deck === 'core' || packs.includes(c.deck)))
  const fresh = pool.filter((c) => !avoid.includes(c.id))
  const from = fresh.length ? fresh : pool
  const card = from[Math.floor(Math.random() * from.length)]
  return card && { card: card.id, active: Math.floor(Math.random() * card.cues.length) }
}

/** Fill every unlocked slot; optional ones are left empty about half the time. */
export function fill(story: Story, packs: string[]) {
  for (const def of slotsOf(story.pattern, packs)) {
    const held = story.slots[def.id]
    if (held?.locked) continue
    if (def.optional && Math.random() < 0.5) { delete story.slots[def.id]; continue }
    const used = Object.values(story.slots).flatMap((h) => (h ? [h.card] : []))
    const kind = def.alt && Math.random() < 0.3 ? def.alt : def.kind
    story.slots[def.id] = drawCard(kind, packs, used)
  }
}

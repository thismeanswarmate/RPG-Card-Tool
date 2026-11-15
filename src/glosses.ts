// A few words on what each kind of thing is, used to open its description in a setting.
// All text is original to this project.
//
// Lore glosses are keyed "kind:primary". Each is written to follow the noun directly, so it carries its
// own leading punctuation: "a guild: craftsmen bound by dues…", "a key, small enough to lose…",
// "a mirror that does not always show…". Role glosses follow "is a <role>, ".

const parse = (raw: string) =>
  Object.fromEntries(raw.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
    const i = l.indexOf(' = ')
    return [l.slice(0, i), l.slice(i + 3)]
  }))

const lore = (kind: string, lead: string, raw: string) =>
  Object.fromEntries(Object.entries(parse(raw)).map(([k, v]) => [`${kind}:${k}`, /^(that|whose|with|from|on|to|under|showing) /.test(v) ? ` ${v}` : `${lead}${v}`]))

export const GLOSS: Record<string, string> = {
  ...lore('faction', ': ', `
    guild = craftsmen bound by dues, secrets and a long memory for slights
    order = sworn members under a rule that few outsiders have read
    cult = believers gathered around a truth they will not share
    militia = neighbours under arms, drilled on feast days
    court = a ruler's household, where favour is the only coin
    cartel = traders who have agreed, quietly, not to compete
    college = scholars who argue for a living
    caravan = a company of travellers that is a town on the move
    choir = voices trained together since childhood
    council = elders who decide slowly and remember everything
    fellowship = companions joined by an oath made in hard times
    syndicate = partners in a business best not examined
    tribunal = judges who sit in threes and answer to no one
    circus = performers and beast-handlers who winter where they can
    sect = a splinter of an older faith, sure that it alone kept the truth
    league = towns and houses allied against a common fear
    crew = hands who have sailed, or stolen, together for years
    academy = masters and pupils behind a gate that opens rarely
    clan = kin who count cousins to the ninth degree
    watch = wardens who walk the walls so that others may sleep`),
  ...lore('event', ': ', `
    flood = water where no water should have been
    coronation = a crowning that was meant to settle everything
    plague = a sickness that emptied streets and filled churchyards
    siege = a long encirclement that starved both sides
    eclipse = a darkness at noon that no one had predicted
    famine = seasons of hunger that rewrote every will
    wedding = a marriage that joined more than two people
    trial = a judgment that half the country still rejects
    fire = a blaze that burned for days and is argued over still
    betrayal = a trust broken at the worst possible moment
    festival = a celebration that got out of hand
    earthquake = a shaking that moved rivers and reputations
    exodus = a departure of thousands in a single season
    duel = a fight between two that decided things for many
    harvest = a gathering-in so strange it is still spoken of
    mutiny = a refusal of orders that could not be undone
    discovery = a finding that changed what people thought possible
    treaty = an agreement that pleased no one who signed it
    storm = weather that came out of a clear sky
    funeral = a burial that drew far more mourners than expected`),
  ...lore('object', ', ', `
    key = small enough to lose and important enough to kill for
    crown = heavier than it looks and unlucky to wear
    lantern = said never to have gone out
    bell = with a note that carries further than it should
    mirror = that does not always show what stands before it
    ledger = whose columns ruin anyone who reads them closely
    blade = that has changed hands more often than sides
    mask = that no two people describe alike
    compass = that points at something other than north
    chalice = from which oaths are drunk
    drum = whose beat is felt before it is heard
    ring = that fits whoever is meant to wear it
    map = showing roads that are not there yet
    loom = on which something has been left unfinished
    horn = to be blown only once
    coin = that always finds its way back
    banner = under which people have died gladly
    needle = finer than any made since
    hourglass = that runs at its own pace
    flute = that plays one tune and no other`),
  ...lore('material', ', ', `
    ink = black and slow to dry
    glass = clear as water and twice as cold
    salt = coarse, grey and worth more than it looks
    amber = warm to the touch and old beyond counting
    silk = light enough to pass through a ring
    iron = dark and stubborn in the forge
    clay = red and fine and found in one bank only
    resin = bled from trees that take a lifetime to grow
    bone = pale and carved as easily as wood
    ash = soft and grey and never quite cold
    honey = dark and thick and slow to pour
    coral = branching and red and brittle
    wax = sweet-smelling and easily marked
    dye = of a colour no one else can match
    slate = splitting into sheets as thin as paper
    pearl = small and uneven and prized all the same
    tar = black and clinging and sharp in the nose
    moss = deep green and springy underfoot
    copper = bright when cut and green with age
    ice = blue at the heart and slow to melt`),
  ...lore('creature', ', ', `
    heron = grey and patient at the water's edge
    wolf = lean and unafraid of fire
    moth = pale and drawn to any light
    eel = long and dark and hard to hold
    stag = crowned with more points than seems right
    beetle = armoured and bright as enamel
    owl = silent and wide-eyed
    serpent = thick as a wrist and slow to anger
    hare = quick and seldom seen twice in one place
    crab = broad-shelled and stubborn
    bat = small and loud at dusk
    boar = bristled and bad-tempered
    spider = with a web that catches more than flies
    crane = tall and given to dancing
    toad = squat and older than it looks
    lynx = tuft-eared and rarely seen
    wasp = banded and quick to take offence
    tortoise = slow and scarred and very old
    raven = black and far too clever
    pike = long-jawed and lurking in the weed`),
  ...lore('deity', ', ', `
    deity of thresholds = invoked at every door and departure
    deity of salt and tears = thanked for grief that ends
    deity of lost things = to whom the careless pray
    deity of the harvest moon = owed the first cut of every field
    deity of locks = who keeps what is shut from what is open
    deity of small fires = honoured at every hearth
    deity of roads = said to walk beside lone travellers
    deity of second thoughts = blamed for every change of heart
    deity of deep water = never named aboard a boat
    deity of bees = told of every birth and death
    deity of debts = who forgets nothing owed
    deity of storms = whose temper sets the calendar
    deity of sleep = who comes for everyone in the end
    deity of rust = who takes back whatever is made
    deity of laughter = worshipped loudly
    deity of the hunt = owed the first blood of the season`),
}

export const ROLE_GLOSS: Record<string, string> = parse(`
  lighthouse keeper = used to long watches and their own company
  runaway = always ready to leave by the back way
  retired soldier = who still wakes before dawn
  forger = with a steady hand and a flexible conscience
  midwife = who has seen most of the district into the world
  gambler = who counts the odds on everything
  clockmaker = patient with small things and short with people
  stowaway = who knows every hiding place aboard
  judge = more feared than liked
  street musician = who hears everything said in passing
  mourner = who has worn black for longer than seems needed
  locksmith = who notices every door
  ferry pilot = who knows the water's moods
  understudy = who has waited years for one chance
  tax collector = welcome nowhere
  beekeeper = slow-moving and hard to startle
  translator = trusted by both sides and belonging to neither
  bodyguard = who watches hands, never faces
  heir = raised for a future that has not arrived
  cook = who knows what everyone eats and with whom
  cartographer = who distrusts any road not walked in person
  night nurse = who keeps other people's worst hours
  smuggler = who knows which officials can be bought
  schoolteacher = who taught half the town its letters
  gravedigger = on easy terms with the dead
  twin = forever taken for someone else
  apprentice = clever, underpaid and impatient
  bounty hunter = who never forgets a face
  hermit = who came here to be left alone
  wedding guest = who stayed on long after the feast
  pickpocket = with quick fingers and quicker feet
  archivist = who knows where every record is buried
  lost child = who turned up one day and never said from where
  rival = whose name is always spoken alongside another's
  impostor = living comfortably under a borrowed name
  old friend = owed more favours than can be counted
  inventor = whose workshop keeps the neighbours awake
  deserter = who flinches at the sound of drums
  fortune-teller = right just often enough
  stranger = about whom nobody knows anything for certain
  hedge wizard = whose spells mostly work
  dragon’s steward = who answers to a master rarely seen
  dethroned monarch = who still expects to be obeyed
  changeling = who has never quite fitted
  oathbound knight = held by a vow made too young
  goblin merchant = who sells nothing at its true price
  court seer = paid to see what pleases
  sword-for-hire = loyal exactly as long as the purse lasts
  river spirit = who wears a human shape when it suits
  apprentice witch = who knows more than any teacher suspects
  giant’s child = too large for every doorway
  royal taster = who has outlived three predecessors
  station mechanic = who keeps the air moving on spare parts and spite
  clone = one of several, and tired of being told so
  ship’s pilot = happiest with nothing but dark ahead
  android nanny = who has raised three generations of one family
  colony doctor = short of everything except patients
  salvage diver = who makes a living from other people's disasters
  data broker = who knows what everyone would pay to hide
  terraformer = who thinks in centuries
  cryo-sleeper = who woke to a world that had moved on
  alien envoy = whose courtesies are hard to read
  bounty drone = that does not tire and does not bargain
  memory dealer = who trades in other people's pasts
  night porter = who has learned not to answer every bell
  exorcist = called only when all else has failed
  sole survivor = who will not say what happened
  sleepwalker = found each morning somewhere new
  taxidermist = whose work is a little too lifelike
  medium = who would rather not hear what is said
  doll maker = whose dolls all have the same face
  plague doctor = welcome only in the worst weeks
  cult runaway = who still keeps the old hours
  restless ghost = who has not accepted the news
  folklorist = who writes down what others are afraid to say
  undertaker = discreet about what the dead leave behind
  night-shift detective = who does their best thinking after midnight
  coroner’s clerk = who reads every report before it is filed
  hotel doorman = who notices who comes in and who does not leave
  crime reporter = always one phone call ahead of the police
  insurance adjuster = paid to doubt every story
  star witness = whose account changes a little each time
  safecracker = patient, with very good hearing
  chief suspect = who has stopped expecting to be believed
  retired inspector = still bothered by the one that got away
  switchboard operator = who hears more than anyone supposes
  pawnbroker = who knows what everything is really worth
  alibi for hire = who will swear to anything for a fee
`)

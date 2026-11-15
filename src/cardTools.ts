// Races, Cultures and History: three tools on the card-tool engine. All text is original to this project.
// Every cue completes the sentence given in the comment above its aspect.

import { cap, join, say, type ToolDef } from './cardTool'
import { makeCardStore } from './cardToolStore'
import { makeName, TONGUES } from './names'

const PACKS = { fantasy: 'Fantasy', scifi: 'Science fiction', horror: 'Horror' }
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)]
const word = (taken: string[], kind: 'place' | 'world' = 'place') => {
  const tongues = TONGUES.map((t, i) => (t.id === 'star' ? -1 : i)).filter((i) => i >= 0)
  return makeName({ kind, tongue: pick(tongues) }, Math.random, new Set(taken.map((x) => x.toLowerCase())))
}

export const RACES: ToolDef = {
  id: 'races',
  packs: PACKS,
  name: (taken) => `The ${word(taken)}${pick(['', '', 'i', 'ar', 'en', ' folk', ' kin'])}`,
  aspects: [
    // "They are …"
    { id: 'form', label: 'Build', hint: 'What their bodies are like', cues: {
      core: `tall and long-limbed; short and broad; slight and quick; heavy-boned and slow to tire; lean, with long hands; round-shouldered and strong;
        small enough to pass for children; long-necked and graceful; thickset, with deep chests; wiry and weathered; soft-featured and hard to tell apart;
        loose-jointed and tireless walkers; narrow-faced and sharp-eared; big-handed and gentle in their movements; pale and fine-boned;
        dark-eyed and broad-faced; light on their feet and never quite still; stooped from the cradle, and stronger than they look; long-fingered and short-sighted; sturdy, with a rolling walk`,
      fantasy: `horned and cloven-footed; winged, though the wings no longer carry them; scaled along the spine and forearms; half the height of a human, and twice as loud`,
      scifi: `grown to a pattern in vats; adapted to low gravity, long and frail; plated with a shell they shed each decade; part machine by choice, from the age of twelve`,
      horror: `hollow-cheeked and far too still; double-jointed in ways that unsettle; grey-skinned and cold to the touch; always a little out of focus at the edges` } },
    // "… known by …"
    { id: 'mark', label: 'Mark', hint: 'How one of them is recognised at a glance', cues: {
      core: `eyes that catch the light like a cat’s; hair that greys in childhood; a birthmark every one of them carries; voices pitched lower than seems possible;
        skin that freckles in patterns; ears that move with their mood; a sixth finger on the left hand; teeth they file to points;
        the way they never blink first; a sweet smell, like cut hay; palms without lines; their habit of humming when they think;
        scars given at birth; hair worn in a single long braid; a second, clear eyelid; the paint they are never seen without;
        how silently they walk; nails as hard as horn; breath that steams in any weather; shadows that seem a shade too dark`,
      fantasy: `a faint glow about the hands at night; antlers that are shed each winter; eyes of two different metals; runes that rise on the skin when they lie`,
      scifi: `a port at the base of the skull; skin that shifts colour with their mood; a serial mark under the left eye; lenses grown in place of eyes`,
      horror: `the absence of any reflection; a second set of teeth behind the first; eyes with no whites at all; the way dogs will not go near them` } },
    // "They say they …"
    { id: 'origin', label: 'Origin', hint: 'Where they say they came from', cues: {
      core: `were shaped from river clay; came across the sea in a single night; were the first to walk here; are descended from one enormous family;
        were driven out of a better country; woke one morning already knowing their names; climbed up out of the ground; were left behind by a people who moved on;
        are what the mountains dreamed; walked here from the edge of the map; were once animals who chose otherwise; were split from another people by a quarrel;
        fell with the first snow; were raised by another people as servants, and left; are the survivors of a drowned land; were called here by a promise;
        grew from seeds a traveller dropped; were sung into being; have always been here, and find the question rude; lost the story, and argue about it constantly`,
      fantasy: `were carved by a god who then lost interest; hatched from eggs laid by a star; are the children of a dragon and a liar; stepped out of a mirror`,
      scifi: `were engineered for a job that no longer exists; are the crew of a ship that never arrived; were uploaded, and then grown bodies; descend from a colony written off as lost`,
      horror: `were buried, and came back; made a bargain they will not describe; are what was left when something else departed; crawled out of a plague year` } },
    // "They are most at home …"
    { id: 'home', label: 'Home', hint: 'Where they thrive', cues: {
      core: `in high cold places; on the water, in boats they are born aboard; in deep forest; underground, by lamplight; on open grassland, always moving;
        in marsh and reedbed; in crowded cities, the more crowded the better; along rivers; in dry country that others call empty; on small islands;
        in the ruins of older peoples; wherever there is trade; on cliffs and high ledges; in orchards and gardens they tend for generations; in the far north, under the long night;
        in caves behind waterfalls; in other peoples’ towns, in a quarter of their own; on the road, with no home to speak of; in valleys they let no one else enter; by the sea, within sound of it`,
      } },
    // "They have a gift for …"
    { id: 'gift', label: 'Gift', hint: 'What they do better than anyone', cues: {
      core: `remembering everything they are told; finding water; working metal; healing; reading weather; keeping accounts; song; climbing;
        knowing when they are lied to; growing things in poor soil; languages; building in stone; patience; tracking; making peace between others;
        cooking; mathematics; going unnoticed; bearing pain; telling the time without a clock`,
      fantasy: `small, useful magics; talking with birds; seeing a few minutes ahead; binding promises so they cannot be broken`,
      scifi: `repairing machines by ear; living on very little air; calculation faster than any engine; sleeping for years at a stretch`,
      horror: `seeing the dead; going without sleep; knowing when someone will die; surviving what should kill them` } },
    // "… but they …"
    { id: 'flaw', label: 'Burden', hint: 'What they cannot do, or cannot bear', cues: {
      core: `cannot abide iron; sicken if kept from the sea; forget faces within a year; cannot lie without stammering; sleep half the year;
        bear very few children; cannot swim; burn badly in strong sun; are easily lost away from home; cannot keep a secret;
        fall ill at heights; need each other near, and pine alone; trust too quickly; cannot stomach meat; grow reckless when it thunders;
        hold grudges for generations; cannot sing a note; are slow to anger and impossible to calm; lose their sight young; never forgive a debt`,
      fantasy: `are bound to answer three questions truthfully; cannot cross running water; wither if they break an oath; must be invited in`,
      scifi: `depend on a medicine only one company makes; cannot breathe unfiltered air; lose a memory each time they are repaired; are owned, on paper, by someone else`,
      horror: `must feed on something they will not name; cannot enter a place of worship; hear a voice the rest of us do not; are followed, always, by something patient` } },
    // "They live …"
    { id: 'life', label: 'Lifespan', hint: 'How long they live, and how', optional: true, cues: {
      core: `barely thirty years, and hurry; three long lifetimes, and take their time; about as long as anyone, but age all at once at the end; long enough to outlast their own languages;
        short lives in large families; until they choose to stop; in three stages, each with a different name; no one knows how long, since few die in bed;
        twice as long in their own country as away from it; a childhood of twenty years and a short, busy adulthood; long lives with poor memories; slowly, sleeping more each decade;
        fast, hungry lives; as long as their tree does; forty years, almost to the day; many years, most of them old` } },
    // "Other peoples …"
    { id: 'others', label: 'Reputation', hint: 'What other peoples make of them', cues: {
      core: `trust them with money and nothing else; think them unlucky; hire them as guides and then ignore their advice; tell stories about them to frighten children;
        envy them openly; mistake their silence for agreement; rely on them as judges; assume they are all related;
        find them charming for an evening; blame them when the harvest fails; copy their fashions; have never managed to conquer them;
        consider them the best company on a long road; think them simple, to their cost; marry into them gladly; keep them at arm’s length;
        owe them more than they admit; believe they can work curses; underpay them; rarely notice them at all` } },
  ],
  write: (g, name) => join(
    `${name || 'This people'} are ${g('form') ?? 'a people apart'}${g('mark') ? `, known by ${g('mark')}` : ''}.`,
    say`They say they ${g('origin')}.`,
    say`They are most at home ${g('home')}.`,
    g('gift') ? `They have a gift for ${g('gift')}${g('flaw') ? `, but they ${g('flaw')}` : ''}.` : g('flaw') ? `They ${g('flaw')}.` : '',
    say`They live ${g('life')}.`,
    say`Other peoples ${g('others')}.`,
  ),
}

export const CULTURES: ToolDef = {
  id: 'cultures',
  packs: PACKS,
  name: (taken) => `The ${word(taken)} ${pick(['folk', 'way', 'people', 'houses', 'towns', 'clans'])}`,
  aspects: [
    // "They prize … above all."
    { id: 'value', label: 'Prizes', hint: 'What they value most', cues: {
      core: `hospitality; a good name; cleverness; endurance; generosity; privacy; skill with the hands; loyalty to kin; honest dealing; beauty;
        learning; thrift; courage; a quick tongue; quiet; cleanliness; age and the wisdom of it; independence; good food; keeping one’s word` } },
    // "They are governed by …"
    { id: 'rule', label: 'Governed by', hint: 'Who decides', cues: {
      core: `a council of grandmothers; whoever owns the most land; an elected speaker who serves one year; hereditary judges; the heads of the great trades;
        a monarch with little real power; open assemblies that anyone may address; a priesthood; lot, drawn each spring; the eldest of each street;
        two rulers who must agree; written law that no one may change; whoever last won an argument in public; a distant overlord they mostly ignore; the guild of pilots;
        families who take the office in turn; a council that meets only in emergencies; custom alone, with no rulers at all; a paid magistrate from elsewhere; their debts`,
      fantasy: `a ruler chosen by an oracle; an undying monarch; the will of a river spirit, as read by its keepers; a sword that has not yet chosen anyone`,
      scifi: `an algorithm no one fully understands; shareholders; the last surviving officers of the first ship; a vote taken every morning`,
      horror: `something in the old house on the hill; a family no one has seen by daylight; the dead, consulted on every matter; fear of what happened last time` } },
    // "Households are …"
    { id: 'family', label: 'Households', hint: 'How they live together', cues: {
      core: `large, with three generations under one roof; headed by the eldest woman; formed by adoption as often as by birth; small, and fiercely private;
        whole streets that share a kitchen; built around a trade rather than a bloodline; joined by marriages arranged at birth; split, with children raised by their aunts and uncles;
        loose, since people come and go with the seasons; ruled by whoever earns the most; open to any traveller for three nights; bound by contracts renewed every seven years;
        named for their houses, not their parents; kept together by shared debts; made of sworn friends as much as family; quiet, with elders obeyed without question;
        noisy, and argue everything out at table; scattered, meeting once a year; counted through the mother’s line; expected to send one child away to another household` } },
    // "They hold that …"
    { id: 'faith', label: 'Belief', hint: 'What they hold to be true', cues: {
      core: `the dead watch, and judge; luck is a thing that can be owed; every place has its own small god; the world is being told as a story, and may yet end badly;
        nothing is ever truly lost; work is a kind of prayer; the stars are the fires of other camps; a person has three names, one of them secret;
        the sea remembers; the gods left, and good riddance; a debt outlives the debtor; dreams are instructions; the first rain of the year washes away guilt;
        everyone is born owing one good deed; truth must be spoken at dawn; the land was lent to them, not given; animals keep count of how they are treated;
        there is one god, who is tired; silence is holy; whatever is written down becomes true`,
      fantasy: `magic is borrowed and must be paid back; the gods walk among them in disguise; each family has a guardian spirit to feed; the dragons will return, and should be planned for`,
      scifi: `the founders are still watching from orbit; a mind can be copied but a soul cannot; the old world was a warning; the machines are owed courtesy`,
      horror: `something sleeps under the town and must not be woken; the dead come back wrong; a tithe is owed to the dark each winter; names give power to whatever is listening` } },
    // "By custom, …"
    { id: 'custom', label: 'Custom', hint: 'Something everyone does', cues: {
      core: `no one eats before the eldest has spoken; a guest is given the best bed; children are named only after their first year; debts are settled on the shortest day;
        every house keeps a lamp lit for travellers; quarrels are argued in verse; the dead are buried with a tool of their trade; no door is locked;
        a stranger is asked three questions and no more; bread is never cut, only broken; brides and grooms exchange a year’s work; every child plants a tree;
        news is sung, not spoken; the first catch of the season is given away; each person fasts one day a month; contracts are sealed by sharing salt;
        the young leave for a year and a day; shoes are left at the door; a bell is rung for every birth; visitors are fed before they are asked their business`,
      fantasy: `a spell is never cast without asking leave of the house; a saucer of milk is left out for the small folk; oaths are sworn on running water; every sword is given a name`,
      scifi: `the air tithe is paid before anything else; everyone serves two years in the engine rooms; the dead are returned to the gardens; arrivals are quarantined for nine days, with gifts`,
      horror: `mirrors are covered after dark; no one whistles at night; a place is set at table for whoever is missing; the doors are salted at dusk` } },
    // "It is forbidden to …"
    { id: 'taboo', label: 'Forbidden', hint: 'What is never done', cues: {
      core: `speak the names of the dead; refuse a guest; eat alone; point at the moon; sell land; whistle indoors; ask a person’s age; marry within the same street;
        cut down a fruit tree; show anger in public; touch another’s head; count one’s children aloud; wear red before marriage; leave a debt to one’s heirs;
        turn away a beggar; write on walls; kill a bird; draw a blade at table; mention the old country; walk out in the first snow` } },
    // "They are known for …"
    { id: 'craft', label: 'Known for', hint: 'What they make or do that others want', cues: {
      core: `their cheese; fine cloth; boats that never leak; strong drink; their singing; horses; glass; honey; their physicians; salt fish;
        carved doors; clocks; their cooking; iron tools; dyes; maps; their storytellers; pottery; paper; their dogs`,
      fantasy: `charms that actually work; griffon-keeping; rune-cut blades; wines that show the future`,
      scifi: `engines that never fail; cloned orchards; the best pilots; memory-lace`,
      horror: `their funerals; remedies no one asks about twice; lifelike dolls; their silence` } },
    // "… and dress in …"
    { id: 'dress', label: 'Dress', hint: 'How they look', optional: true, cues: {
      core: `undyed wool; bright colours, the brighter the better; long coats with many pockets; layers of fine linen; leather and brass;
        embroidered sashes that tell a life story; wide hats; black, with a single coloured thread; whatever their grandparents wore; veils, for all alike;
        heavy silver; feathers; plain grey, by law; borrowed finery; oiled sealskin; aprons, even at weddings; painted masks on feast days; furs turned inside out;
        ribbons for every child they have raised; boots they are buried in` } },
    // "What divides them now is …"
    { id: 'tension', label: 'Divided by', hint: 'What they are quarrelling about', cues: {
      core: `whether to welcome newcomers; an old feud between two families; a change to the marriage laws; the young leaving for the cities; a disputed inheritance;
        whether the old faith still matters; a new road that will change everything; who should pay for the last war; a prophecy half of them believe; the price of bread;
        whether to trade with an old enemy; a leader who will not step down; the language their children should learn; a discovery under the fields; who may own land;
        how to punish a popular criminal; a marriage across the divide; whether to move or rebuild; the loss of a sacred thing; a secret a few have always known` } },
  ],
  write: (g, name) => join(
    g('value') ? `${cap(name || 'this culture')} prize ${g('value')} above all.` : `${cap(name || 'this culture')} keep to their own ways.`,
    say`They are governed by ${g('rule')}.`,
    say`Households are ${g('family')}.`,
    say`They hold that ${g('faith')}.`,
    say`By custom, ${g('custom')}.`,
    say`It is forbidden to ${g('taboo')}.`,
    g('craft') ? `They are known for ${g('craft')}${g('dress') ? `, and dress in ${g('dress')}` : ''}.` : say`They dress in ${g('dress')}.`,
    say`What divides them now is ${g('tension')}.`,
  ),
}

const AGES = ['one age', 'two ages', 'three ages', 'four ages', 'five ages', 'six ages', 'seven ages', 'eight ages']

export const HISTORY: ToolDef = {
  id: 'history',
  packs: PACKS,
  sections: { label: 'Age', start: 3, max: 8 },
  name: (taken) => `The Chronicle of ${word(taken)}`,
  intro: (name, n) => `${name || 'This history'} is told in ${AGES[n - 1] ?? `${n} ages`}.`,
  aspects: [
    // "The Age of …"
    { id: 'name', label: 'The Age of', hint: 'What the age is called', cues: {
      core: `Ash; Long Roads; Quiet Bells; Salt; the Three Crowns; Open Hands; Iron; Rivers; Lanterns; Hunger; Sails; Broken Oaths;
        the Long Summer; Stone; Wolves; Letters; the Empty Throne; Bridges; Harvests; Smoke; the Many Kings; Glass; Wandering; Thorns` } },
    // "… began when …"
    { id: 'began', label: 'Began when', hint: 'What started it', cues: {
      core: `a river changed its course; the old line of rulers died out; a stranger arrived with a new way of doing things; the harvests failed three years running;
        two rival peoples made peace; a great city fell; a new metal was found in the hills; the sea rose; a law was written down for the first time;
        a long war simply stopped; the roads were opened; a child was crowned; a sickness passed, leaving half the houses empty; a mountain pass was discovered;
        the old gods fell silent; a marriage joined two crowns; the first ships came back from the far shore; a prophet began to preach; a comet was seen for forty nights; the forests began to die`,
      fantasy: `a dragon woke; the last great wizard vanished; a door opened under the hill; the dead rose to defend their graves`,
      scifi: `the first ship landed; the signal from home stopped; the machines were switched on; the sky was closed`,
      horror: `the thing in the lake was first seen; the sun dimmed for a year; the wells turned; a village vanished overnight` } },
    // "In those years … held sway."
    { id: 'power', label: 'Who held sway', hint: 'Who mattered most', cues: {
      core: `a league of river towns; a line of warrior queens; the priests of a single temple; merchant families; a conqueror and then her quarrelling heirs;
        no one, and everyone suffered for it; the horse clans of the plains; an empire ruled from far away; a council of free cities; the keepers of the granaries;
        a brotherhood of builders; two dynasties in turn; the judges; pirates grown respectable; a people now entirely forgotten; an order of healers;
        the mountain holds; the great guilds; a single remarkable family; whoever held the bridge`,
      fantasy: `a circle of mages; the court of the fair folk; a dragon and those who served it; a dynasty of undying kings`,
      scifi: `the founding company; a council of machine minds; the captains of the fleet; whoever controlled the air`,
      horror: `a cult that met by night; a family that did not age; fear, and those who sold protection from it; something that wore a crown` } },
    // "Under them …"
    { id: 'deed', label: 'Under them', hint: 'What was achieved', cues: {
      core: `the great roads were laid; the first laws were carved in stone; the marshes were drained and farmed; trade reached the far coasts; the walls were raised;
        the calendar was fixed; learning flourished, and libraries were founded; the land knew peace for three generations; the mines were opened; the old tongues were written down;
        the fleets were built; the borders doubled; the first coins were struck; cities grew where there had been villages; the temples were built;
        the forests were cleared for fields; bridges were thrown across every river; the arts were prized above war; the canals were dug; the tribes were made one people`,
      fantasy: `the great spells were woven; the dragons were bound by treaty; the standing stones were raised; the roads between worlds were charted`,
      scifi: `the planet was made to breathe; the archive was completed; the gates were opened; the long count of the stars began`,
      horror: `the pits were dug, and filled; the wards were set; the bargain was struck; the old places were sealed` } },
    // "… but …"
    { id: 'loss', label: 'But', hint: 'What it cost', cues: {
      core: `the forests were spent to do it; the poor paid for all of it; the old songs were forgotten; the rivers ran foul; it was built on the labour of the conquered;
        the neighbours never forgave it; faith withered; the countryside emptied; too much depended on too few; the knowledge was kept from the many;
        the treasury was ruined; the old families were destroyed; a people was driven out; no one planned for what came after; the winters grew harder;
        it bred a pride that would be punished; the borders could not be held; the young were sent away to die; corruption crept in from the top; the truth of it was never written down` } },
    // "It ended when …"
    { id: 'end', label: 'Ended when', hint: 'How it finished', cues: {
      core: `the heirs fought among themselves; the money ran out; a plague came up the trade roads; the capital burned; invaders came over the mountains;
        the people simply stopped obeying; a flood took the low country; the last ruler died without naming an heir; a treaty was broken; the mines gave out;
        a rival power rose in the south; the army turned on its masters; a winter lasted two years; the truth about its founders came out; the great bridge fell;
        a new faith swept the old one away; the fleet was lost in a single storm; the cities emptied; a child asked the wrong question in public; it faded so slowly that no one marked the day`,
      fantasy: `the magic failed; the dragon returned; the prophecy was fulfilled, though not as expected; the gods took sides`,
      scifi: `the machines stopped; contact was lost; the reactor failed; the second fleet arrived`,
      horror: `the wards broke; the debt was called in; the dark came early and stayed; the thing beneath woke` } },
    // "What remains of it is …"
    { id: 'remains', label: 'What remains', hint: 'What it left behind', cues: {
      core: `a calendar still in use; roads that run straight to nowhere; a handful of words in the common speech; ruins that farmers plough around; a grudge between two peoples;
        the laws, mostly; a festival whose meaning is forgotten; a line of pretenders to a vanished throne; walls too large for the towns they guard; a song every child knows;
        coins that still turn up in fields; a faith kept by a few old families; the names of the months; a library no one can read; a border that makes no sense;
        the shape of the fields; a sealed tomb; proverbs; a debt that is still being paid; nothing but the name` } },
  ],
  write: (g) => join(
    g('began') ? `${g('name') ? `The Age of ${g('name')}` : 'This age'} began when ${g('began')}.` : g('name') ? `Then came the Age of ${g('name')}.` : '',
    say`In those years ${g('power')} held sway.`,
    g('deed') ? `Under them ${g('deed')}${g('loss') ? `, but ${g('loss')}` : ''}.` : g('loss') ? `${cap(g('loss')!)}.` : '',
    say`It ended when ${g('end')}.`,
    say`What remains of it is ${g('remains')}.`,
  ),
}

export const useRaces = makeCardStore(RACES)
export const useCultures = makeCardStore(CULTURES)
export const useHistory = makeCardStore(HISTORY)

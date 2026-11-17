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

/** "Their skin is …, their hair is … and their eyes are …", with whatever is missing left out. */
function looks(skin?: string, hair?: string, eyes?: string): string {
  const parts = [skin && `skin is ${skin}`, hair && `hair is ${hair}`, eyes && `eyes are ${eyes}`].filter(Boolean) as string[]
  if (!parts.length) return ''
  // Cues with commas of their own are set apart by semicolons so the list still reads.
  const sep = parts.some((p) => p.includes(',')) ? '; ' : ', '
  const list = parts.map((p, i) => (i ? `their ${p}` : `Their ${p}`))
  return `${list.length > 1 ? `${list.slice(0, -1).join(sep)}${sep === '; ' ? '; and ' : ' and '}${list.at(-1)}` : list[0]}.`
}

export const RACES: ToolDef = {
  id: 'races',
  // Besides the genres, an optional deck of animal traits, for beast-folk of any kind.
  packs: { ...PACKS, animal: 'Animal' },
  picture: { lead: 'A portrait of one member of a people, head and shoulders, looking at the viewer.', shape: 'tall' },
  name: (taken) => `The ${word(taken)}${pick(['', '', 'i', 'ar', 'en', ' folk', ' kin'])}`,
  aspects: [
    // "They are …"
    { id: 'form', label: 'Build', hint: 'What their bodies are like', cues: {
      core: `tall and long-limbed; short and broad; slight and quick; heavy-boned and slow to tire; lean, with long hands; round-shouldered and strong;
        small enough to pass for children; long-necked and graceful; thickset, with deep chests; wiry and weathered; soft-featured and hard to tell apart;
        loose-jointed and tireless walkers; narrow-faced and sharp-eared; big-handed and gentle in their movements; pale and fine-boned;
        dark-eyed and broad-faced; light on their feet and never quite still; stooped from the cradle, and stronger than they look; long-fingered and short-sighted; sturdy, with a rolling walk`,
      fantasy: `horned and cloven-footed; winged, though the wings no longer carry them; scaled along the spine and forearms; half the height of a human, and twice as loud;
        tall, slender and seemingly ageless; green-skinned, tusked and heavy with muscle; short, stout and broad as a barrel; no taller than a table, and quick as mice; twice a human’s height, and gentle with it; goat-legged from the waist down; human above and horse below; tree-barked and slow, rooted when they rest`,
      scifi: `grown to a pattern in vats; adapted to low gravity, long and frail; plated with a shell they shed each decade; part machine by choice, from the age of twelve;
        small, grey and slight, with heads too large for their bodies; tall, insect-thin and many-jointed; squat and heavy, built for a crushing world; reptilian, upright and powerfully tailed; soft-bodied and tentacled, at home in water; human in outline, flawless in every proportion; a swarm of small bodies sharing one mind; crystalline, slow and almost motionless`,
      horror: `hollow-cheeked and far too still; double-jointed in ways that unsettle; grey-skinned and cold to the touch; always a little out of focus at the edges;
        gaunt and pale, with a predator’s grace; human until the moon turns; hunched and long-armed, built for digging; bloated and slow, and never quite dry; tall, thin and wrong in the joints; stitched together from more than one body; small, sharp and always in a pack; beautiful in a way that hurts to look at`,
      animal: `cat-like, lithe and upright; wolf-headed and deep-chested; bird-boned, with a beak and folded wings; lizard-like, low-slung and patient; bear-heavy and slow to rouse; rabbit-eared and long in the leg; shelled like a tortoise, and as unhurried; ant-waisted, six-limbed and tireless` } },
    // "… known by …"
    { id: 'mark', label: 'Mark', hint: 'How one of them is recognised at a glance', cues: {
      core: `eyes that catch the light like a cat’s; hair that greys in childhood; a birthmark every one of them carries; voices pitched lower than seems possible;
        skin that freckles in patterns; ears that move with their mood; a sixth finger on the left hand; teeth they file to points;
        the way they never blink first; a sweet smell, like cut hay; palms without lines; their habit of humming when they think;
        scars given at birth; hair worn in a single long braid; a second, clear eyelid; the paint they are never seen without;
        how silently they walk; nails as hard as horn; breath that steams in any weather; shadows that seem a shade too dark`,
      fantasy: `a faint glow about the hands at night; antlers that are shed each winter; eyes of two different metals; runes that rise on the skin when they lie;
        ears as long as a hand; beards they braid with rings, men and women alike; a smell of rain and cut grass; a voice that carries a second, lower note; wings like a dragonfly’s, too small to fly on; the stone-grey patches that spread with age; small flames that dance in their hair when they are angry; footprints in which flowers grow`,
      scifi: `a port at the base of the skull; skin that shifts colour with their mood; a serial mark under the left eye; lenses grown in place of eyes;
        the faint hum they give off; four arms, the lower pair smaller; a breathing mask they never remove; speech made of clicks and light; the barcode at the nape of the neck; a third eye that sees heat; skin that shows their thoughts in colour; the way gravity seems to matter less to them`,
      horror: `the absence of any reflection; a second set of teeth behind the first; eyes with no whites at all; the way dogs will not go near them;
        the cold that comes into a room with them; the smell of turned earth; shadows that move a moment late; teeth that are slightly too many; the way they must be invited; their silence, since they do not breathe; flies that gather round them; a heartbeat you can hear across a room`,
      animal: `whiskers that twitch when they lie; a tail that says what the face will not; the purr or growl under every word; ears that swivel toward a sound; plumage worn like a coat of arms; a forked tongue that tastes the air; the scent-marks they leave on doorposts; antlers hung with ribbons on feast days` } },
    // "Their skin is …"
    { id: 'skin', label: 'Skin', hint: 'Its colour and texture', cues: {
      core: `weathered brown, like old leather; pale as milk, and quick to flush; deep black with a blue sheen; warm copper; olive, darkening with age;
        freckled all over; ruddy and wind-roughened; smooth and dark as river stone; sallow, with shadows under the eyes; golden-brown;
        grey-brown, like bark; so fair the veins show; tawny, with paler palms; dappled light and dark; rough as sand to the touch;
        the red-brown of clay; ashen in winter and bronze by summer; fine-grained and almost poreless; marked with pale birth-lines; dusky, with a faint shine`,
      fantasy: `faintly green, like new leaves; covered in fine pearly scales; the grey of storm cloud; lightly furred, striped down the back;
        moss-green, darkening to olive; the blue-black of deep water; bark-brown and ridged; gold-dusted, as if gilded; pale lavender; red as fired brick; marbled like veined stone; faintly luminous under moonlight`,
      scifi: `chalk-white from generations without sun; patterned with engineered pigment; translucent enough to show the bones of the hand; plated with a soft grown armour;
        smooth, hairless grey; scaled in iridescent green; a hard, segmented carapace; blue, and cool as glass; synthetic, and flawless under a lens; mottled for camouflage, shifting as they move; bioluminescent along the veins; leathery, and folded like a bat’s wing`,
      horror: `waxy, and cold in any weather; mottled like something long under water; thin as paper over the knuckles; seamed with scars no one remembers getting;
        white as a drowned thing; grey and peeling at the edges; flushed only after they have fed; stitched where it has been torn`,
      animal: `hidden under short, dense fur; striped like a tiger’s; spotted, each pattern its own; covered in overlapping scales; feathered, sleek and oiled; a mole’s velvet, grey-black; thick hide, wrinkled and hairless; slick and speckled, like a frog’s` } },
    // "their hair is …"
    { id: 'hair', label: 'Hair', hint: 'Its colour and how it grows or is worn', cues: {
      core: `black and coarse, worn long; white from birth; red as rust, and curled tight; fine and straw-coloured; thick, brown and never cut;
        shaved close by custom; dark, with a streak of grey at the temple; wiry and worn in knots; silver by the age of twenty; the colour of wet sand;
        heavy and blue-black; sparse, growing only on the crown; chestnut, braided with cord; pale gold and very fine; curly and dark, cropped short;
        ash-brown, bleached at the tips by the sun; thick as a pelt, down the neck and shoulders; auburn in the young and iron-grey in the old; straight and black as ink; worn under a cap, and seldom seen`,
      fantasy: `more like fine feathers than hair; moss-green and always damp; threaded with strands of real silver; a mane that runs down the spine;
        silver-white and fine as spider silk; made of leaves that turn with the seasons; thick, with a beard to match, grown from childhood; flame-red and never still; dark vines that flower in spring; long, black and bound with bone; white wool, sheared once a year; quills that rattle when they are alarmed`,
      scifi: `absent entirely, by design; fibre-fine and faintly luminous; grown in a colour chosen at birth; replaced by a crest of soft quills;
        a ridge of fins from brow to nape; sensory tendrils that turn toward sound; fine optic fibres that carry data; a crown of feathers raised in display; thick fur, shed for warm worlds; antennae, long and restless; cable-thick braids that are partly alive; worn as a single stiff crest, dyed by rank`,
      horror: `lank and colourless; falling out in handfuls, and regrowing overnight; white since whatever happened; matted, and never quite dry;
        black, and sleek as oil; coarse fur that comes and goes with the moon; white wisps over a bare scalp; long, wet and always in the face`,
      animal: `a lion’s mane, combed with pride; a crest of long feathers; a ruff of thicker fur at the throat; spines down the back, flat when calm; long ear-tufts, tipped black; a horse’s mane, braided for travel; down that never quite sheds; whiskers and brows, long as fingers` } },
    // "their eyes are …"
    { id: 'eyes', label: 'Eyes', hint: 'Their colour and shape', cues: {
      core: `pale grey; so dark the pupil is lost; green flecked with gold; wide-set and amber; narrow and black; a startling light blue;
        hazel, and heavy-lidded; brown, with long lashes; large, and slow to blink; deep-set under heavy brows; grey-green, like the sea in winter;
        round and bright as a bird’s; almost colourless; two different colours, more often than not; tilted, with a fold at the corner; honey-coloured;
        small and sharp; violet in certain lights; ringed with a darker band; dark brown and very steady`,
      fantasy: `slit-pupilled, like a goat’s; silver, with no visible pupil; faintly glowing in the dark; the colour of whatever they last looked at;
        large, tilted and green as leaves; small, red and deep-set; solid gold; like a cat’s, wide in the dark; star-flecked and far too old; amber, with a sideways pupil; milky, seeing by something other than light; ringed with three colours`,
      scifi: `lensed, with a ring of fine script round the iris; black from lid to lid; able to shutter like a camera; mirrored;
        huge, black and almond-shaped; compound, in a thousand facets; four, in two pairs; a single band of sensor across the face; glowing faintly blue; on stalks, turning separately; replaced at adulthood with something better; pale, slitted and reptile-cold`,
      horror: `filmed over, though they see well enough; red-rimmed and unblinking; far too large for the face; sunk so deep they seem like holes;
        red when they are hungry; yellow, and reflecting like a wolf’s; black, with pinpricks of light far inside; entirely absent, the sockets sewn shut`,
      animal: `gold, with slit pupils; round, orange and unblinking, like an owl’s; set at the sides of the head; dark, wet and gentle, like a deer’s; green, shining back in lamplight; small, bright beads; horizontal-pupilled, like a goat’s; many, in a spider’s cluster` } },
    // "They have …"
    { id: 'features', label: 'Features', hint: 'The face and anything else that stands out', optional: true, cues: {
      core: `high cheekbones and narrow chins; broad noses and strong jaws; long faces and longer ears; small mouths and heavy brows; round faces that keep their youth;
        hooked noses and thin lips; flat, wide faces and short necks; pointed chins and upturned noses; large hands and feet; long necks and sloping shoulders;
        sharp teeth and a ready smile; deep lines from an early age; ears that stand out from the head; delicate wrists and ankles; thick necks and barrel chests;
        a gap between the front teeth; faces that show every feeling; faces that show none; prominent brows and deep voices; fine bones and a quick, darting way of moving`,
      fantasy: `ears that taper to a point; small tusks at the corners of the mouth; a short tail they are shy about; a third, closed eye in the forehead;
        long, fine-boned faces that do not age; heavy jaws and tusks that jut past the lip; short horns that curl back from the brow; noses long enough to be a family joke; hooves in place of feet; webbed fingers and gills behind the ear; feathered forearms; a lion’s tail, expressive as a hand`,
      scifi: `gill-slits along the neck; a second thumb on each hand; ridges of bone along the skull; fingers jointed one time more than ours;
        tiny mouths and no visible nose; mandibles that fold away when they speak; six fingers, long and delicate; a crest that flushes with feeling; a prehensile tail; a long skull swept back in a curve; retractable claws; a pouch in which the young are carried`,
      horror: `mouths a little too wide; fingers a little too long; a stillness about the chest, as if breathing were optional; smiles that never reach the eyes;
        long canines they try to hide; nails like a digger’s claws; jaws that open much too far; faces so perfect they seem carved`,
      animal: `muzzles and wet noses; clawed, padded hands; beaks that clack when they laugh; paws better suited to running than writing; long tails they balance with; tusks and a boar’s bristling jaw; webbed feet and a broad flat tail; great curling horns` } },
    // "They say they …"
    { id: 'origin', label: 'Origin', hint: 'Where they say they came from', cues: {
      core: `were shaped from river clay; came across the sea in a single night; were the first to walk here; are descended from one enormous family;
        were driven out of a better country; woke one morning already knowing their names; climbed up out of the ground; were left behind by a people who moved on;
        are what the mountains dreamed; walked here from the edge of the map; were once animals who chose otherwise; were split from another people by a quarrel;
        fell with the first snow; were raised by another people as servants, and left; are the survivors of a drowned land; were called here by a promise;
        grew from seeds a traveller dropped; were sung into being; have always been here, and find the question rude; lost the story, and argue about it constantly`,
      fantasy: `were carved by a god who then lost interest; hatched from eggs laid by a star; are the children of a dragon and a liar; stepped out of a mirror;
        sang themselves out of the first forest; were bred for a war that ended long ago; were hammered out of stone by a smith-god; are the grandchildren of giants, diminished; fell from the moon in a hard winter; were once the fair folk’s servants, and walked out; grew where a dragon’s blood was spilled; are a wizard’s experiment that went on without him`,
      scifi: `were engineered for a job that no longer exists; are the crew of a ship that never arrived; were uploaded, and then grown bodies; descend from a colony written off as lost;
        came here in silver ships to watch; evolved under a red sun, in the dark; were uplifted from animals by a people now gone; are machines that outlived their makers; diverged from humanity ten thousand years ago; hatched from an ark that crashed; were grown as soldiers for someone else’s war; are refugees from a star that died`,
      horror: `were buried, and came back; made a bargain they will not describe; are what was left when something else departed; crawled out of a plague year;
        were cursed for an ancestor’s crime; rose from the dead and stayed; are what is left of a village that starved; came through a door that should not have been opened`,
      animal: `were beasts who learned to speak; are descended from the first hunters’ dogs; were given human shape as a punishment, or a reward; hatched from one great clutch; followed the herds here and stayed; were raised up by a spirit of the wild; came down from the trees a little later than others; are the animals that remembered the old bargain` } },
    // "They are most at home …"
    { id: 'home', label: 'Home', hint: 'Where they thrive', cues: {
      core: `in high cold places; on the water, in boats they are born aboard; in deep forest; underground, by lamplight; on open grassland, always moving;
        in marsh and reedbed; in crowded cities, the more crowded the better; along rivers; in dry country that others call empty; on small islands;
        in the ruins of older peoples; wherever there is trade; on cliffs and high ledges; in orchards and gardens they tend for generations; in the far north, under the long night;
        in caves behind waterfalls; in other peoples’ towns, in a quarter of their own; on the road, with no home to speak of; in valleys they let no one else enter; by the sea, within sound of it`,
      fantasy: `in forest cities grown, not built; in halls cut deep under mountains; in burrows under green hills; on the steppe, in camps that move with the herds; in the high branches, never touching ground; in the ruins of an empire they once ruled; in drowned cities off the coast; in the clouded peaks where the great eagles nest`,
      scifi: `aboard ships they never leave; on a tide-locked world, in the band of twilight; in the clouds of a gas giant; in orbital rings round a dead planet; in hive-cities, a million to a spire; under the ice of a frozen moon; in the data itself, bodies optional; in the asteroid belts, mining`,
      horror: `in crypts and cellars, away from the sun; in the deep woods, far from roads; in the sewers under great cities; in old houses no one dares buy; in fog-bound villages off every map; in the marsh, under black water; among us, passing; in the places where people have died badly`,
      animal: `in dens dug under tree roots; in cliffside rookeries; in warrens of a hundred rooms; in lodges built across rivers; on the plains, following the grass; in the canopy, on woven platforms; in hives of wax and paper; wherever the hunting is good`,
      } },
    // "They have a gift for …"
    { id: 'gift', label: 'Gift', hint: 'What they do better than anyone', cues: {
      core: `remembering everything they are told; finding water; working metal; healing; reading weather; keeping accounts; song; climbing;
        knowing when they are lied to; growing things in poor soil; languages; building in stone; patience; tracking; making peace between others;
        cooking; mathematics; going unnoticed; bearing pain; telling the time without a clock`,
      fantasy: `small, useful magics; talking with birds; seeing a few minutes ahead; binding promises so they cannot be broken;
        archery beyond anything human; smithing blades that hold an edge for centuries; seeing in the dark; walking unseen in woodland; strength enough to carry a horse; speaking with trees; remembering their past lives; brewing potions from common weeds`,
      scifi: `repairing machines by ear; living on very little air; calculation faster than any engine; sleeping for years at a stretch;
        speaking mind to mind; technology that looks like magic; perfect recall, shared between them; regrowing lost limbs; surviving hard vacuum; flawless mimicry of other species; navigating between stars without instruments; working as one, without orders`,
      horror: `seeing the dead; going without sleep; knowing when someone will die; surviving what should kill them;
        passing for one of us; strength that grows after dark; bending a weaker will with a look; coming back from the grave`,
      animal: `scenting a lie; running down anything on legs; flight, if only short glides; hearing a heartbeat through a wall; climbing sheer walls; digging faster than a team of men; finding their way home from anywhere; stillness, for hours, before the pounce` } },
    // "… but they …"
    { id: 'flaw', label: 'Burden', hint: 'What they cannot do, or cannot bear', cues: {
      core: `cannot abide iron; sicken if kept from the sea; forget faces within a year; cannot lie without stammering; sleep half the year;
        bear very few children; cannot swim; burn badly in strong sun; are easily lost away from home; cannot keep a secret;
        fall ill at heights; need each other near, and pine alone; trust too quickly; cannot stomach meat; grow reckless when it thunders;
        hold grudges for generations; cannot sing a note; are slow to anger and impossible to calm; lose their sight young; never forgive a debt`,
      fantasy: `are bound to answer three questions truthfully; cannot cross running water; wither if they break an oath; must be invited in;
        fade away if they stay too long among mortals; are turned to stone by daylight; cannot refuse a challenge; are bound by any bargain, however foolish; lose themselves in rage once blood is drawn; cannot touch gold without wanting more; must return to their birthplace to die; forget the living when they sleep too long`,
      scifi: `depend on a medicine only one company makes; cannot breathe unfiltered air; lose a memory each time they are repaired; are owned, on paper, by someone else;
        feel nothing, and do not see why they should; die if cut off from the hive; cannot survive our gravity for long; are sterile, and take what they need from others; cannot disobey their makers’ last command; burn up their short lives in a few bright years; cannot lie, since their skin gives them away; are slowly failing as a species`,
      horror: `must feed on something they will not name; cannot enter a place of worship; hear a voice the rest of us do not; are followed, always, by something patient;
        burn in sunlight; lose themselves to the beast each full moon; hunger, always, and it gets worse; cannot cross a threshold unasked`,
      animal: `cannot resist a chase; sleep through the winter, whatever is at stake; bristle and snap when cornered; are ruled by the pack’s order, and miserable outside it; moult once a year, and hide for the shame of it; cannot bear to be caged, even kindly; forget themselves at the smell of blood; follow shining things into trouble` } },
    // "They live …"
    { id: 'life', label: 'Lifespan', hint: 'How long they live, and how', optional: true, cues: {
      core: `barely thirty years, and hurry; three long lifetimes, and take their time; about as long as anyone, but age all at once at the end; long enough to outlast their own languages;
        short lives in large families; until they choose to stop; in three stages, each with a different name; no one knows how long, since few die in bed;
        twice as long in their own country as away from it; a childhood of twenty years and a short, busy adulthood; long lives with poor memories; slowly, sleeping more each decade;
        fast, hungry lives; as long as their tree does; forty years, almost to the day; many years, most of them old`,
      fantasy: `for a thousand years, and are weary by the end; hot and fast, old at forty; until slain, for age does not touch them; one life after another, remembering each`,
      scifi: `a few fevered years; for centuries, between long sleeps; as long as their parts can be replaced; once, and then again in a new body`,
      horror: `for ever, unless someone ends it; until the hunger takes the last of them; a human span, and then a much longer one after; in cycles, waking once a generation`,
      animal: `a dog’s years, and age as fast; long and slow, like a tortoise; one bright summer as adults, after years as young; by the seasons, lean in winter and fat in autumn` } },
    // "Other peoples …"
    { id: 'others', label: 'Reputation', hint: 'What other peoples make of them', cues: {
      core: `trust them with money and nothing else; think them unlucky; hire them as guides and then ignore their advice; tell stories about them to frighten children;
        envy them openly; mistake their silence for agreement; rely on them as judges; assume they are all related;
        find them charming for an evening; blame them when the harvest fails; copy their fashions; have never managed to conquer them;
        consider them the best company on a long road; think them simple, to their cost; marry into them gladly; keep them at arm’s length;
        owe them more than they admit; believe they can work curses; underpay them; rarely notice them at all`,
      fantasy: `find them beautiful, cold and insufferable; fear them as raiders and hire them as soldiers; think them greedy and trust their craftsmanship completely; forget they exist until something goes missing`,
      scifi: `tell stories of being taken by them in the night; depend on their machines and resent it; cannot tell them apart from us; treat them as property`,
      horror: `hunt them with fire and silver; bargain with them and regret it; do not believe in them until it is too late; leave offerings so as to be left alone`,
      animal: `keep them as hunters and never as guests; mistake them for animals, once; envy their freedom and fence their lands; tell fables in which they are always the trickster` } },
  ],
  write: (g, name) => join(
    `${name || 'This people'} are ${g('form') ?? 'a people apart'}${g('mark') ? `, known by ${g('mark')}` : ''}.`,
    looks(g('skin'), g('hair'), g('eyes')),
    say`They have ${g('features')}.`,
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
  picture: { lead: 'A scene of everyday life among a people, in their own street or home.', shape: 'wide' },
  name: (taken) => `The ${word(taken)} ${pick(['folk', 'people', 'houses', 'towns', 'clans'])}`,
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
  // The genres, and an optional deck for the past of beast-folk.
  packs: { ...PACKS, animal: 'Animal' },
  picture: { lead: 'A grand historical scene, as a mural might show it.', shape: 'wide' },
  sections: { label: 'Age', start: 3, max: 8 },
  name: (taken) => `The Chronicle of ${word(taken)}`,
  intro: (name, n) => `${name || 'This history'} is told in ${AGES[n - 1] ?? `${n} ages`}.`,
  aspects: [
    // "The Age of …"
    { id: 'name', label: 'The Age of', hint: 'What the age is called', cues: {
      core: `Ash; Long Roads; Quiet Bells; Salt; the Three Crowns; Open Hands; Iron; Rivers; Lanterns; Hunger; Sails; Broken Oaths;
        the Long Summer; Stone; Wolves; Letters; the Empty Throne; Bridges; Harvests; Smoke; the Many Kings; Glass; Wandering; Thorns`,
      fantasy: `Dragons; the Elder Kings; Wild Magic; the Sundered Crown; Sleeping Gods; the Nine Towers; Starfall; the Green Court`,
      scifi: `First Landing; the Long Silence; the Machines; the Great Fleets; Thin Air; the Two Suns; the Quiet Network; the Exodus`,
      horror: `the Long Night; Plague Bells; the Black Harvest; Whispers; the Hungry Earth; Empty Cradles; the Red Moon; the Shut Doors`,
      animal: `the Great Herds; Claw and Feather; the First Speech; the Long Migration; the Shared Fire; the Broken Pack; Tall Grass; the Antlered Crown` } },
    // "… began when …"
    { id: 'began', label: 'Began when', hint: 'What started it', cues: {
      core: `a river changed its course; the old line of rulers died out; a stranger arrived with a new way of doing things; the harvests failed three years running;
        two rival peoples made peace; a great city fell; a new metal was found in the hills; the sea rose; a law was written down for the first time;
        a long war simply stopped; the roads were opened; a child was crowned; a sickness passed, leaving half the houses empty; a mountain pass was discovered;
        the old gods fell silent; a marriage joined two crowns; the first ships came back from the far shore; a prophet began to preach; a comet was seen for forty nights; the forests began to die`,
      fantasy: `a dragon woke; the last great wizard vanished; a door opened under the hill; the dead rose to defend their graves;
        a sword was drawn from a stone; the elder folk sailed away for good; magic first woke in common people; a star fell and was forged into a crown`,
      scifi: `the first ship landed; the signal from home stopped; the machines were switched on; the sky was closed;
        the colony ships made planetfall; a thinking machine was first switched on; a signal arrived from a dead star; the home world went quiet`,
      horror: `the thing in the lake was first seen; the sun dimmed for a year; the wells turned; a village vanished overnight;
        the dead first refused to stay buried; a bargain was struck at a crossroads; something answered the prayers; the fog came in and did not lift`,
      animal: `the beasts first spoke; the herds turned north and did not return; the packs chose a single leader; the hunters and the hunted made a truce; the great birds came down from the peaks; the rivers filled with salmon as never before; the first den was dug that did not belong to one family; a white stag was seen at midwinter` } },
    // "In those years … held sway."
    { id: 'power', label: 'Who held sway', hint: 'Who mattered most', cues: {
      core: `a league of river towns; a line of warrior queens; the priests of a single temple; merchant families; a conqueror and then her quarrelling heirs;
        no one, and everyone suffered for it; the horse clans of the plains; an empire ruled from far away; a council of free cities; the keepers of the granaries;
        a brotherhood of builders; two dynasties in turn; the judges; pirates grown respectable; a people now entirely forgotten; an order of healers;
        the mountain holds; the great guilds; a single remarkable family; whoever held the bridge`,
      fantasy: `a circle of mages; the court of the fair folk; a dragon and those who served it; a dynasty of undying kings;
        the high kings of the elder folk; an order of dragon-riders; the lords under the mountain; a prophet-queen and her nine paladins`,
      scifi: `the founding company; a council of machine minds; the captains of the fleet; whoever controlled the air;
        the charter companies; a parliament of linked minds; the admirals of the long patrol; the engineers who kept the air`,
      horror: `a cult that met by night; a family that did not age; fear, and those who sold protection from it; something that wore a crown;
        the witch-finders; a court of pale nobles; the gravediggers’ guild; whatever lived in the well`,
      animal: `the wolf-lords of the high forest; a council of old owls; the herd-mothers; the lion courts of the plains; the river clans of otter and beaver; the crows, who traded in secrets; the bear-kings, who ruled by sleeping lightly; the queens of the great hives` } },
    // "Under them …"
    { id: 'deed', label: 'Under them', hint: 'What was achieved', cues: {
      core: `the great roads were laid; the first laws were carved in stone; the marshes were drained and farmed; trade reached the far coasts; the walls were raised;
        the calendar was fixed; learning flourished, and libraries were founded; the land knew peace for three generations; the mines were opened; the old tongues were written down;
        the fleets were built; the borders doubled; the first coins were struck; cities grew where there had been villages; the temples were built;
        the forests were cleared for fields; bridges were thrown across every river; the arts were prized above war; the canals were dug; the tribes were made one people`,
      fantasy: `the great spells were woven; the dragons were bound by treaty; the standing stones were raised; the roads between worlds were charted;
        the great wards were laid along the borders; the giants were driven back beyond the ice; cities were sung up out of the rock; the first schools of magic were founded`,
      scifi: `the planet was made to breathe; the archive was completed; the gates were opened; the long count of the stars began;
        the orbital elevators were raised; a hundred worlds were seeded; the great archive was written into the ice; the first minds were copied`,
      horror: `the pits were dug, and filled; the wards were set; the bargain was struck; the old places were sealed;
        every door was marked and every window barred; the forest was burned back a mile; the sick were walled up with the well; a great cathedral was raised over the pit`,
      animal: `the hunting laws were agreed; the long trails were worn across the continent; the dams were built and the valleys flooded; the small peoples were given a voice in council; the winter stores were first held in common; the cliff-cities were hollowed out; every pack was made to keep its borders; the old songs were taught to the young of every kind` } },
    // "… but …"
    { id: 'loss', label: 'But', hint: 'What it cost', cues: {
      core: `the forests were spent to do it; the poor paid for all of it; the old songs were forgotten; the rivers ran foul; it was built on the labour of the conquered;
        the neighbours never forgave it; faith withered; the countryside emptied; too much depended on too few; the knowledge was kept from the many;
        the treasury was ruined; the old families were destroyed; a people was driven out; no one planned for what came after; the winters grew harder;
        it bred a pride that would be punished; the borders could not be held; the young were sent away to die; corruption crept in from the top; the truth of it was never written down`,
      fantasy: `the old forests were felled for it; every spell cast then is still being paid for; the small folk were pushed to the margins; the gods grew jealous; a dark thing was buried rather than destroyed; the dragons never forgave it; too many true names were written down; the fair folk closed their doors to mortals`,
      scifi: `the home world was stripped to pay for it; the machines were never asked; half the colonies were written off; no one alive understood how it worked; the gene lines were narrowed past mending; the sky was filled with wreckage; memory itself became a thing to be bought; those who stayed behind were forgotten`,
      horror: `it was built on bones; the innocent burned with the guilty; no one could say afterwards who had been spared, or why; something was owed, and still is; the children born then were never quite right; the ground would not take seed for years; faith curdled into fear; the survivors would not speak of it`,
      animal: `the prey peoples paid for the peace; the solitary kinds were driven out; the wild places grew crowded; the old instincts were shamed and hidden; the strong ate first, by law; the grazing was ruined for a generation; no one asked the birds; it made the packs soft` } },
    // "It ended when …"
    { id: 'end', label: 'Ended when', hint: 'How it finished', cues: {
      core: `the heirs fought among themselves; the money ran out; a plague came up the trade roads; the capital burned; invaders came over the mountains;
        the people simply stopped obeying; a flood took the low country; the last ruler died without naming an heir; a treaty was broken; the mines gave out;
        a rival power rose in the south; the army turned on its masters; a winter lasted two years; the truth about its founders came out; the great bridge fell;
        a new faith swept the old one away; the fleet was lost in a single storm; the cities emptied; a child asked the wrong question in public; it faded so slowly that no one marked the day`,
      fantasy: `the magic failed; the dragon returned; the prophecy was fulfilled, though not as expected; the gods took sides;
        the last dragon was slain; the crown was broken into pieces; the dark lord rose in the east; the elder folk and the mountain folk went to war`,
      scifi: `the machines stopped; contact was lost; the reactor failed; the second fleet arrived;
        the jump gates closed; the network woke and chose its own ends; a plague crossed between ships; the fuel ran out`,
      horror: `the wards broke; the debt was called in; the dark came early and stayed; the thing beneath woke;
        the last witch was hanged; the bells stopped; someone finally paid the price; the sun came back, weaker`,
      animal: `the herds scattered; a hard winter broke the truce; the two-legged folk came with fire; the pack turned on its leader; the rivers failed; the young would not keep the old borders; a sickness passed from kind to kind; the great birds flew away for good` } },
    // "What remains of it is …"
    { id: 'remains', label: 'What remains', hint: 'What it left behind', cues: {
      core: `a calendar still in use; roads that run straight to nowhere; a handful of words in the common speech; ruins that farmers plough around; a grudge between two peoples;
        the laws, mostly; a festival whose meaning is forgotten; a line of pretenders to a vanished throne; walls too large for the towns they guard; a song every child knows;
        coins that still turn up in fields; a faith kept by a few old families; the names of the months; a library no one can read; a border that makes no sense;
        the shape of the fields; a sealed tomb; proverbs; a debt that is still being paid; nothing but the name`,
      fantasy: `standing stones that still hum; a sword no one can lift; ruined towers that are larger inside than out; a bloodline that carries the old gift; roads the fair folk still use by night; a sleeping king under a hill; spells that go off when ploughs strike them; the oaths, which still bind`,
      scifi: `dead satellites still in orbit; machines that obey orders no one remembers giving; a dialect of old command words; sealed vaults that open to the right blood; a beacon still calling for help; cities under domes of cracked glass; a ship in the ice, intact; debts owed to a company that no longer exists`,
      horror: `a pit that is never filled in; a rhyme children skip to; doors painted red for luck; a family that keeps to itself; graves weighted with iron; a night each year when no one goes out; the smell, in certain cellars; something that still walks the boundary`,
      animal: `trails still followed without knowing why; borders marked by scent and stone; a truce at the water-holes; the names of the constellations; a taboo against eating one’s neighbours; howling at the full moon; antlers hung over doors; a wariness of fire` } },
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

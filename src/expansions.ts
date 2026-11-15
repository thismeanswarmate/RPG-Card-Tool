import { TYPE_INFO, type CardDef, type CardType, type Cue } from './types'

// Optional packs for the world tool. All card text is original to this project.
//
// Three genre packs and three biome packs add more of the six basic card types, themed to a genre or a climate. Three creative packs add
// new kinds of card that tuck under a place like any other: Quests (a hook and three open questions),
// Questions about the people who live there, and Lore with Twists (a piece of in-world writing to make,
// and a constraint to make it under).
//
// Biome packs are written as `cue :: description` (Omens as `cue :: readings :: description`), grouped
// under `@type` headings, using the same placeholders as descriptions.ts. Creative packs put one card on
// a line with ` | ` between its cues; a Quest is `title :: summary :: question | question | question`.

export interface Expansion { id: string; group: 'Genre' | 'Biome' | 'Creative'; name: string; blurb: string; types: CardType[] }

const BIOME: CardType[] = ['terrain', 'site', 'epithet', 'legacy', 'trait', 'omen']

export const EXPANSIONS: Expansion[] = [
  { id: 'fantasy', group: 'Genre', name: 'Spellbound', blurb: 'Fantasy: dragons, wizards and the fair folk.', types: BIOME },
  { id: 'scifi', group: 'Genre', name: 'Starfall', blurb: 'Science fiction: colonies, machines and deep space.', types: BIOME },
  { id: 'horror', group: 'Genre', name: 'Nightfall', blurb: 'Horror: blighted places and what walks in them.', types: BIOME },
  { id: 'frost', group: 'Biome', name: 'Frostlands', blurb: 'Ice, snow and the long dark.', types: BIOME },
  { id: 'coast', group: 'Biome', name: 'Tidewater', blurb: 'Shores, harbours and the open sea.', types: BIOME },
  { id: 'dry', group: 'Biome', name: 'Drylands', blurb: 'Sand, stone and scarce water.', types: BIOME },
  { id: 'quests', group: 'Creative', name: 'Quests', blurb: 'Story hooks to pin on a place, each with three questions to answer.', types: ['quest'] },
  { id: 'customs', group: 'Creative', name: 'Customs', blurb: 'Questions about how the people of a place live.', types: ['question'] },
  { id: 'lore', group: 'Creative', name: 'Lore', blurb: 'A piece of in-world writing to make, and a twist to make it with.', types: ['work', 'twist'] },
]

export const EXPANSION_COLORS: Record<string, [string, string]> = {
  'Ice Shelf': ['#cfe3ea', '#7fa9bd'], Taiga: ['#3e5a4c', '#2a3d44'], 'Frozen Sea': ['#9fc0d0', '#557d98'],
  Snowfield: ['#e4ebee', '#a9bcc6'], 'Permafrost Barrens': ['#8f9a92', '#5f6d70'], 'Ice Caves': ['#5fa3c4', '#2f5f86'],
  'Sea Cliffs': ['#8a9aa0', '#3d6f86'], Shoals: ['#7fc0b8', '#3f87a0'], 'Barrier Islands': ['#d8c79a', '#5fa6b0'],
  'Tidal Marsh': ['#7a9068', '#4c6f78'], 'Kelp Forest': ['#4f7a52', '#22505c'], Headland: ['#7f9a6c', '#4a6a80'],
  'Enchanted Wood': ['#3f7a5a', '#4a3f7a'], 'Floating Isles': ['#8fb7d6', '#6a8f6a'], 'Dragon Peaks': ['#7a4a3f', '#33303a'],
  'Faerie Meadow': ['#9ac46a', '#c48fb8'], 'Titan’s Steps': ['#9a9488', '#5f6672'], 'Crystal Caverns': ['#7f6fc4', '#3f7f9a'],
  'Orbital Ring': ['#5f6f8f', '#1f2a44'], 'Dome Colony': ['#7fa6a0', '#3f5a6a'], 'Asteroid Field': ['#6a625c', '#2a2a33'],
  'Terraformed Plain': ['#8fae5a', '#5a7f8a'], 'Derelict Fleet': ['#4f5a66', '#20242c'], 'Methane Sea': ['#c4904a', '#6a4a3a'],
  'Blighted Wood': ['#5a5f52', '#2e2f2a'], 'Fog Marsh': ['#8a968f', '#4a5550'], 'Drowned Village': ['#4f6a70', '#283a40'],
  'Ash Waste': ['#8a8580', '#4a4644'], 'Bone Fields': ['#b8ae98', '#6f6658'], 'Sunless Valley': ['#3f4658', '#1f222c'],
  Erg: ['#e0b060', '#b9783a'], 'Dry Lake Bed': ['#d6c8a8', '#a08c6c'], 'Mesa Country': ['#c2643f', '#7a3b34'],
  'Stony Desert': ['#8c7a68', '#54483f'], Wadi: ['#c49a62', '#7d6a4a'], 'Oasis Basin': ['#5f9a62', '#c29a52'],
}

const FROST = `
@terrain
Ice Shelf :: Out on {place} a floating plain of ice meets the open sea in cliffs that crack off without warning.
Taiga :: Through {place} dark conifers stand in snow for most of the year, and the silence is broken mainly by cracking branches.
Frozen Sea :: Across {place} the water is locked under ice thick enough to drive on, cut by leads that open and close overnight.
Snowfield :: Over {place} wind-packed snow lies year-round, blinding at noon and blue in the long dusk.
Permafrost Barrens :: Across {place} the soil never thaws below a hand's depth, and what little grows there grows low and slowly.
Ice Caves :: Inside {place} blue tunnels wind through old ice, lit from above and never quite silent.
@site
Whaling Station :: Rusting boilers and bleached bones mark {place}, which still smells of oil on a warm day.
Ice Road :: Each winter {place} is marked out across the frozen surface of {terrain}, and each spring it melts away.
Sled Depot :: Teams, runners and harness are kept ready at {place}, the last supply point before the empty miles of {terrain}.
Smokehouse :: Racks of fish and meat cure slowly in {place}, enough to carry a settlement through the dark months.
Weather Station :: The instruments at {place} have recorded every storm to cross {terrain} for longer than anyone has kept count.
Cairn :: Travellers add a stone to {place} as they pass, and it now stands taller than a person.
Trapper’s Cabin :: A single room, a stove and a wall of stretched pelts make up {place}, a week's travel from anywhere.
Ice Fishing Camp :: Tents and windbreaks cluster over holes cut in the ice at {place}, moving whenever the fish do.
Longhouse :: Under one long roof, {place} shelters several families, their animals and a fire that is never allowed to die.
Icebreaker Wreck :: Held fast for decades, {place} lists in the ice of {terrain} with its cargo still aboard.
Reindeer Corral :: Twice a year the herds are driven into {place} to be counted, marked and argued over.
Aurora Shrine :: On nights when the sky burns green, people gather at {place} and read meaning into the lights.
@epithet
Frostbitten :: because the cold has left its mark on everything in it
of White Nights :: for the summer weeks when the sun never sets
That Cracks at Midnight :: for the sound the ice makes as the cold deepens
of Seal Song :: for the calling of seals under the ice
Snowblind :: for the glare that defeats unprotected eyes
of the Long Dark :: for the months when the sun does not rise
Where Breath Freezes :: because words hang visible in the air here
of Antlers :: for the shed antlers that litter the ground each spring
Windburned :: because nothing here is sheltered from the gale
of Blue Ice :: for the old, dense ice that shows blue in its depths
That the Sun Forgot :: because warmth seems to pass it by even in summer
of Sled Dogs :: for the howling of teams staked out at night
Thawless :: because no summer has ever been seen to soften it
of Ghost Lights :: for the pale fires seen moving over the snow
Under the Aurora :: because the sky above it is so often alight
of Frozen Bells :: after bells that cracked from cold the first winter they were hung
@legacy
Settled by survivors of a lost expedition :: Survivors of a lost expedition were the first to winter in {place}, and they never did go home.
Once free of ice :: There was a time when {place} lay green and open, and the old stories describe orchards.
Named by a dying explorer :: A dying explorer gave {place} its name, scratched into the last page of a journal.
Site of a famous rescue :: A famous rescue ended in {place}, and the survivors' descendants still meet there once a year.
Founded around a hot vent :: The first shelters in {place} were raised around a vent of warm air, which is still the heart of the settlement.
Where a ship was frozen in for three winters :: A ship once lay frozen in at {place} for three winters, and its crew built what they could not carry.
Bought with furs :: The founders paid for {place} in furs, at a price both sides thought was a swindle.
Emptied by a single hard winter :: One terrible winter emptied {place}, and it was years before anyone returned.
Carved by a vanished glacier :: A glacier long since gone carved out {place} and left its rubble behind.
Once a place of banishment in the snow :: Wrongdoers were once sent out to {place} to survive or not, and some did.
Where the first sled dogs were bred :: The first sled dogs are said to have been bred in {place}, and every team claims descent from them.
Guarded an ice-locked treasure fleet :: A treasure fleet was once locked in the ice near {place}, and the garrison sent to guard it stayed on.
Discovered by following a migrating herd :: Hunters following a migrating herd were the first to find {place}.
Site of a midwinter truce :: Two warring bands once called a midwinter truce in {place}, because fighting on was certain death.
Raised by whalers in a single summer :: Whalers raised the first buildings of {place} in a single frantic summer.
Abandoned when the ice advanced :: The ice once advanced and drove everyone out of {place}, and the old foundations still lie under it.
@trait
Sun is absent for months :: For months each year the sun does not rise over {place}, and people keep time by lamp and habit.
Famous for carved ivory :: The ivory carving of {place} is famous, each piece small enough to hide in a mitten.
Everyone shares one great hearth :: Everyone in {place} shares one great hearth through the worst of the cold.
Travels by sled and ski :: No one walks far in {place}; they go by sled and ski or not at all.
Stores food in the ice :: The people of {place} keep their food in pits cut into the ice, where it lasts for years.
Known for throat singing :: The singers of {place} can hold two notes at once, and contests go on all night.
Reveres the returning sun :: The first sunrise after the long dark is the great holy day of {place}.
Wears furs sewn with family signs :: Furs in {place} are sewn with family signs, so the lost can be named.
Reads the weather in the ice :: People in {place} read the coming weather from the colour and sound of the ice.
Hospitable by law :: By law no one in {place} may be refused shelter, whatever they have done.
Famous for its sled races :: The sled races of {place} are famous, run over days with no rest for dogs or drivers.
Builds from snow and bone :: Homes in {place} are built from snow, hide and whalebone, and rebuilt every year.
Tells its history in knots of sinew :: The history of {place} is kept in knotted sinew cords that only a few can read.
Drinks a fierce fermented milk :: A fierce fermented milk is drunk in {place}, and offered to every guest twice.
Guides hire out for dangerous crossings :: Guides from {place} hire out for the dangerous crossings and are worth every coin.
Buries its dead in the ice :: The dead of {place} are laid in the ice, where they do not change.
@omen
The ice is breaking up early :: stranding hunters, opening sea lanes, or revealing something frozen :: The ice around {place} is breaking up early this year, stranding hunters, opening sea lanes, or revealing something long frozen.
A blizzard has not stopped for weeks :: natural, summoned, or hiding something :: A blizzard has blown over {place} for weeks without pause, and people argue over whether it is natural, summoned, or hiding something.
The herds have not returned :: hunted out, turned aside, or frightened off :: The herds have not come back to {place} this season, whether hunted out, turned aside, or frightened off.
Something has thawed out of the ice :: a body, a ship, or a living thing :: Something has thawed out of the ice near {place}, and it may be a body, a ship, or a living thing.
The sun has failed to rise on its day :: late, hidden, or gone :: The sun has failed to rise over {place} on its appointed day, and no one knows whether it is late, hidden, or gone.
Strangers have arrived over the ice :: traders, exiles, or the vanguard of more :: Strangers have arrived in {place} over the ice, and they may be traders, exiles, or the first of many more.
The winter stores are spoiled :: by damp, vermin, or a jealous hand :: The winter stores of {place} have been found spoiled, by damp, vermin, or a jealous hand.
A warm wind is blowing from the north :: welcome, uncanny, or dangerous :: A warm wind has begun to blow on {place} from the north, which is welcome, uncanny, or dangerous depending on who is asked.
`

const COAST = `
@terrain
Sea Cliffs :: Along {place} the land ends in a wall of rock, loud with surf below and seabirds above.
Shoals :: Across {place} sandbars lie just under the surface, shifting with every storm and wrecking the careless.
Barrier Islands :: Along {place} a chain of low sandy islands takes the force of the sea so that the mainland does not have to.
Tidal Marsh :: Through {place} salt creeks wind among cordgrass, flooded twice a day and smelling of mud and brine.
Kelp Forest :: Beneath the swell of {place} great brown fronds rise from the seabed, sheltering fish, otters and things less often seen.
Headland :: Out on {place} a spur of high ground pushes into the sea, with weather on three sides.
@site
Shipwreck :: The ribs of {place} show at low tide, picked clean by a century of salvagers.
Smugglers’ Tunnel :: Cut through the rock in secret, {place} runs from a hidden landing to a cellar that changes owners often.
Fish Market :: Before dawn the catch of {terrain} is shouted over, sold and carted off at {place}.
Sea Wall :: Stone by stone, {place} holds the tide off the low ground behind it, and is mended after every storm.
Pearl Beds :: Divers go down on a single breath at {place}, and come up with shells that are mostly empty.
Chandlery :: Rope, tar, canvas and credit are all to be had at {place}, at prices that rise when a fleet is in.
Pier :: Long and weathered, {place} runs far out over the water of {terrain}, and half the town can be found on it in fine weather.
Net Lofts :: In the tall sheds of {place} nets are hung to dry and mended by people who talk the whole time.
Sea Cave :: The swell booms in the dark of {place}, which can be entered by boat at low water and not left again until the next.
Pilot Station :: No large ship enters these waters without a pilot from {place}, who know every rock by name.
Whale Graveyard :: Great bones lie heaped on the shingle at {place}, where the currents bring what dies at sea.
Oyster Shacks :: A row of huts on stilts makes up {place}, where oysters are opened, eaten and argued over.
@epithet
Brinebound :: because salt has worked its way into every part of it
of Gulls :: for the birds that scream over it from dawn to dusk
That the Tide Keeps :: because the sea takes it back for half of every day
of Broken Masts :: for the wreckage that the storms leave behind
Storm-Tossed :: because no season passes without a gale
of Sirens :: for the singing that sailors swear they hear offshore
Where Ships Sleep :: for the hulks that lie quiet on the bottom
of Sea Glass :: for the worn bright fragments that wash up after rough weather
Barnacled :: because anything left still here is soon overgrown
of Seven Tides :: after a week when the sea rose seven times higher than it should
That Faces the Deep :: because nothing lies beyond it but open water
of Drowned Bells :: after a church the sea took, whose bells are said to ring in storms
Weathered :: because wind and spray have worn every edge smooth
of Lost Anchors :: for the iron that fishermen keep dragging up
Beneath the Fog :: because the sea mist lifts from it only rarely
of Pearls :: for the single famous pearl that was once found here
@legacy
Founded by a stranded crew :: A crew stranded without a ship founded {place}, and built their first houses from her timbers.
Risen from the sea in living memory :: Within living memory {place} rose out of the sea, and the oldest residents recall when it was water.
Once a pirate haven :: Pirates once ruled {place} openly, and several respectable families began that way.
Site of a great naval defeat :: A great fleet was destroyed off {place}, and the tide still gives up its cannon.
Built by wreckers :: Wreckers built {place} on what they lured ashore, and false lights are still a sore subject.
Where a famous voyage ended :: A famous voyage came to its end at {place}, and the last page of its log is kept under glass.
Half lost to a single storm :: A single storm once took half of {place} into the sea in one night.
Granted to a fishing guild forever :: An old charter granted {place} to its fishing guild forever, and the guild has not forgotten.
Named for a ship that never returned :: The founders named {place} for a ship that sailed and never returned.
Once an island :: Until the channel silted up, {place} was an island, and its people still talk as if it were.
Raised on a drowned city :: The foundations of {place} rest on a city that the sea drowned long before.
Where a sea monster was said to be slain :: A sea monster is said to have been killed at {place}, and something's jawbone hangs in the meeting hall.
Settled by exiled sailors :: Sailors barred from every other port settled {place} and made their own rules.
Grew rich on a vanished fish :: A fish that no longer comes made {place} rich for three generations.
Bought from the sea by dyke and pump :: The land of {place} was bought from the sea by dyke and pump, a yard at a time.
Site of a keeper’s famous vigil :: A keeper once tended a light at {place} alone through a winter of storms, and is remembered for it.
@trait
Lives by the tide table :: Life in {place} runs by the tide table, and appointments are made in ebbs and floods.
Famous for salt cod :: The salt cod of {place} is famous, stacked like firewood in every yard.
Every family owns a boat :: Every family in {place} owns a boat, and a household without one is pitied.
Paints eyes on its prows :: Boats from {place} have eyes painted on their prows so they can see their way home.
Blesses the fleet each spring :: Each spring the fleet of {place} is blessed with great ceremony before it sails.
Known for sea shanties :: The shanties of {place} are known in every port, and new verses are added yearly.
Salvage belongs to the finder :: Whatever washes ashore in {place} belongs to whoever reaches it first.
Mourns the drowned with empty chairs :: Families in {place} keep an empty chair at table for each of their drowned.
Renowned sailmakers :: The sailmakers of {place} are renowned, and their stitching is recognised at a distance.
Wary of whistling :: Whistling is frowned on in {place}, for fear of calling up a wind.
Eats seaweed at every meal :: Seaweed is served at every meal in {place}, in more forms than a stranger would believe.
Shuns the open sea at night :: No boat from {place} will stay out on the open sea after dark.
Famous for its divers :: The divers of {place} are famous for how long they can stay below.
Trades with ships it does not ask about :: Ships put in at {place} and are supplied without a single question.
Builds houses on stilts :: The houses of {place} stand on stilts, with the boat tied up underneath.
Reads omens in the catch :: The first fish of the day is read as an omen in {place}, and a bad one keeps the boats in.
@omen
The fish have vanished :: overfished, driven off, or taken by something larger :: The fish have vanished from the waters off {place}, overfished, driven off, or taken by something larger.
A strange ship is anchored offshore :: silent, flagless, or flying a dead nation’s colours :: A strange ship lies at anchor off {place}, silent, flagless, or flying a dead nation's colours.
The tide went out and has not returned :: an omen, a trick of the moon, or the calm before a wave :: The tide has gone out from {place} and not returned, which may be an omen, a trick of the moon, or the calm before a wave.
Wreckage is coming ashore in quantity :: from a storm, a battle, or a ship no one reported missing :: Wreckage is coming ashore at {place} in quantity, from a storm, a battle, or a ship no one reported missing.
The anchorage is silting up :: slowly, suddenly, or by design :: The anchorage at {place} is silting up, slowly, suddenly, or by someone's design.
A great storm is forecast :: by instruments, by old bones, or by the birds leaving :: A great storm is forecast for {place}, by instruments, by old bones, or by the birds leaving.
Pirates have been sighted :: raiding, trading, or seeking refuge :: Pirates have been sighted near {place}, and they may be raiding, trading, or seeking refuge.
The sea has turned an odd colour :: red, black, or shining at night :: The sea off {place} has turned an odd colour, red, black, or shining at night.
`

const DRY = `
@terrain
Erg :: Across {place} a sea of sand rolls in crescents to every horizon, and yesterday's tracks are gone by morning.
Dry Lake Bed :: Out on {place} cracked clay lies where water once stood, and mirages stand in for the lake.
Mesa Country :: Through {place} flat-topped towers of rock rise from the plain, each one an island with its own weather.
Stony Desert :: Across {place} wind has stripped the ground to a pavement of dark pebbles that rings underfoot.
Wadi :: Down {place} a dry riverbed winds between steep banks, harmless for years and deadly for an hour when the rain comes.
Oasis Basin :: In the hollow of {place} groundwater comes close to the surface, and a ring of green stands against the glare.
@site
Caravanserai :: Behind high walls, {place} offers water, fodder and a locked gate to every caravan crossing {terrain}.
Well :: Everything within three days' walk depends on {place}, and its rope is the most carefully kept thing in {terrain}.
Rock Tombs :: Doorways cut into the cliff lead into {place}, where the dead were laid with what they owned.
Date Grove :: Under the shade of {place} the air is ten degrees cooler, and the harvest is counted palm by palm.
Salt Mine :: Slabs are cut by hand from the floor of {place} and carried out on a line of animals that stretches to the horizon.
Wind Tower :: Catching every breath of air, {place} cools the rooms beneath it and can be seen far across {terrain}.
Buried Ruin :: The dunes uncover a little more of {place} each year, and then cover it again.
Camel Market :: Once a season the herders of {terrain} gather at {place} to trade animals, news and insults.
Cliff Dwelling :: Rooms stacked into an overhang make up {place}, reached by ladders that can be drawn up at night.
Glass Crater :: Something once struck the sand hard enough to melt it, and {place} still glitters green at its centre.
Water Tunnel :: Dug by hand over generations, {place} carries mountain water underground to the fields of {terrain}.
Hermit’s Pillar :: Someone has always lived on top of {place}, hauling up food in a basket and sending down advice.
@epithet
Sunstruck :: because the light here hits like a blow
of Mirages :: for the lakes and cities that appear and are not there
That Drinks the Rain :: because water vanishes into it the moment it falls
of Scorpions :: for what is found under every stone
Parched :: because it has not seen real rain in a generation
of Singing Sands :: for the low hum the dunes give off when they slide
Where the Wind Writes :: for the ripples the wind leaves, which some claim to read
of Bleached Bones :: for the remains of caravans that did not arrive
Dust-Veiled :: because the air is rarely clear enough to see across it
of a Thousand Wells :: after an old boast that was never true
That Noon Forbids :: because nothing sensible moves in it at midday
of Red Stone :: for the rust-coloured rock that glows at sunset
Glass-Hearted :: for the fused sand found at its centre
of Vultures :: for the patient birds that circle overhead
Under the Dog Star :: because its seasons are reckoned by one bright star
of Buried Kings :: for the tombs that the sand hides and reveals
@legacy
Once a green river valley :: Before the river failed, {place} was a green valley, and the old irrigation lines can still be traced.
Founded where a lost caravan found water :: A caravan lost and dying stumbled on water at {place} and never moved on.
Capital of a vanished desert empire :: A desert empire once ruled from {place}, and its broken columns are used as doorposts.
Swallowed and released by the dunes :: The dunes once swallowed {place} whole and, a lifetime later, gave it back.
Built along an old incense road :: The incense road once ran through {place}, and the wealth it left has not all been spent.
Site of a battle over a single well :: Armies once fought and died at {place} over a single well.
Settled by a people fleeing a flood :: People fleeing a great flood settled {place}, and chose the driest ground they could find.
Named by a saint who walked out of the waste :: A saint who walked alive out of the deep waste gave {place} its name.
Where rain once fell for forty days :: Rain once fell on {place} for forty days, and the year is still used to date everything else.
Dug by prisoners of war :: Prisoners of war dug the wells of {place}, and their marks are on the stones.
Once the bed of a salt sea :: A salt sea once lay over {place} and left its crust behind.
Founded by star-watchers :: Star-watchers founded {place} for its clear skies, and the streets follow the constellations.
Raised over a hidden spring :: The founders built {place} over a spring whose location only one family knows.
Looted by tomb robbers for generations :: Tomb robbers worked {place} for generations, and their descendants are its guides.
Spared by a sandstorm that buried an army :: A sandstorm once buried an invading army within sight of {place} and left it untouched.
Where a meteor’s glass was first traded :: The glass of a fallen meteor was first traded at {place}, and pieces still change hands.
@trait
Travels only by night :: The people of {place} travel only by night and sleep through the heat.
Famous for dates and date wine :: The dates of {place} are famous, and the wine made from them more so.
Water is rationed by bell :: Water in {place} is rationed by the ringing of a bell, and every household knows its turn.
Veils worn against the dust :: Everyone in {place} goes veiled against the dust, and faces are shown only at home.
Guests are given water first :: A guest in {place} is given water before a word is spoken.
Renowned camel breeders :: The camel breeders of {place} are renowned, and a good animal is worth a house.
Reads the stars for direction :: Children in {place} learn the stars before they learn their letters.
Builds thick-walled houses underground :: Homes in {place} are dug into the ground, cool by day and warm by night.
Wells are sacred and never owned :: No one may own a well in {place}, and fouling one is the worst of crimes.
Known for intricate carpets :: The carpets of {place} are woven with patterns that double as maps.
Stories are told only after dark :: Stories in {place} are told only after dark, when the work is done and the air has cooled.
Trades in salt by weight of gold :: Salt was once traded in {place} for its weight in gold, and the scales are still kept.
Fierce about hospitality debts :: A debt of hospitality in {place} outlasts the people who incurred it.
Paints its doors blue against evil :: Every door in {place} is painted blue to turn away misfortune.
Famous for falconry :: The falconers of {place} are famous, and their birds are named like children.
Keeps cisterns under every house :: Every house in {place} sits over its own cistern, filled in the rare rains.
@omen
The great well is going dry :: slowly, suddenly, or by poison :: The great well of {place} is failing, slowly, suddenly, or by poison.
A sandstorm has uncovered something :: a ruin, a road, or a door :: A sandstorm has uncovered something near {place}, a ruin, a road, or a door.
A caravan is long overdue :: lost, robbed, or diverted :: A caravan bound for {place} is long overdue, and may be lost, robbed, or diverted.
Rain is falling for the first time in years :: a blessing, a flood, or a sign :: Rain is falling on {place} for the first time in years, a blessing, a flood, or a sign.
The dunes are advancing on the fields :: yard by yard, overnight, or against the wind :: The dunes are advancing on the fields of {place}, yard by yard, overnight, or against the wind.
Nomads have gathered in great numbers :: for trade, for war, or for a prophecy :: Nomads have gathered near {place} in great numbers, for trade, for war, or for a prophecy.
A new spring has broken the surface :: sweet, bitter, or hot :: A new spring has broken the surface in {place}, and its water is sweet, bitter, or hot.
Locusts are darkening the sky :: passing over, settling, or driven by something :: Locusts are darkening the sky over {place}, and may pass over, settle, or be driven by something.
`

const FANTASY = `
@terrain
Enchanted Wood :: Within {place} the paths rearrange themselves by night, and the trees are known to hold opinions.
Floating Isles :: Above the clouds of {place} islands of rock drift slowly on the wind, tethered by chains and rope bridges.
Dragon Peaks :: Among {place} the summits are scorched black, and the caves are warm in every season.
Faerie Meadow :: Across {place} the flowers bloom in rings, and anyone who naps there wakes with the wrong year in their head.
Titan’s Steps :: Up through {place} rise terraces too vast and too regular to be natural, each one a day's climb.
Crystal Caverns :: Deep inside {place} the walls glitter with crystals that hum when spoken to.
@site
Wizard’s Tower :: Too tall for its foundations, {place} leans over {terrain} and is lit at odd hours in odd colours.
Fairy Ring :: A circle of pale mushrooms marks {place}, and the locals walk around it rather than through.
Dragon’s Lair :: The mouth of {place} is ringed with melted stone, and nothing nests within a mile of it.
Alchemist’s Shop :: Jars, smoke and small explosions fill {place}, where almost anything can be bought and nothing is guaranteed.
Enchanted Spring :: The water of {place} grants something to those who drink, though seldom what they came for.
Goblin Market :: After moonrise {place} sells things that should not be for sale, at prices not reckoned in coin.
Rune Gate :: Two carved pillars with nothing between them make up {place}, which has opened twice in recorded history.
Griffin Roost :: High on a crag above {terrain}, {place} is loud with shrieking in the nesting season.
Sunken Temple :: Steps lead down into the flooded dark of {place}, where the altar is still dry.
Mage College :: The students of {place} are forbidden to practise in town, and do so anyway.
Giant’s Table :: A slab the size of a barn rests on three boulders at {place}, set for a meal no one remembers.
Oracle’s Cave :: Fumes rise from a crack in the floor of {place}, and whoever breathes them speaks in riddles.
@epithet
Spellbound :: because some old enchantment has never quite worn off
of Dragons :: for the great shapes sometimes seen against the moon
That Was Sung Into Being :: after the legend that a song called it out of nothing
of Wishes :: because what is asked for here has a way of being granted, badly
Moon-Touched :: because everything in it changes a little with the moon
of the Fair Folk :: for the neighbours no one names directly
Where Magic Pools :: because spells cast here run stronger and stranger
of Unicorns :: for the hoofprints found where no horse could go
Hexed :: after a curse laid on it that no one has managed to lift
of Broken Wands :: for the wizards' duel that ended here
That No Map Holds :: because ink fades from any chart that tries to show it
of Seven Crowns :: after the seven rulers who each claimed it and lost it
Starforged :: because its stone is said to have fallen from the sky already shaped
of Whispering Runes :: for the carvings that murmur when the wind is right
Beyond the Veil :: because it lies half in this world and half in another
of Golden Apples :: for the orchard whose fruit is worth a kingdom
@legacy
Raised in a single night by magic :: A single night of spellwork raised {place}, and the corners have never been quite square.
Won from a dragon in a riddle game :: Someone once won {place} from a dragon in a game of riddles, and the dragon is said to want a rematch.
Once the court of a faerie queen :: A faerie queen once held court in {place}, and time still runs oddly in the old hall.
Founded by a wizard fleeing a rival :: A wizard on the run from a rival founded {place} and warded it against being found.
Site of the last great spell :: The last great spell was cast in {place}, and nothing so large has been attempted since.
Where a god is said to have slept :: A god is said to have slept in {place}, and the hollow it left has never filled in.
Cursed by a slighted enchantress :: An enchantress who was not invited to a feast laid a curse on {place} that is still being worked out.
Built by giants and inherited by smaller folk :: Giants built {place}, and the people who live there now use the windowsills as balconies.
Where a prophecy was first spoken :: A famous prophecy was first spoken in {place}, and pilgrims still come to argue over its meaning.
Lifted from the earth by a spell gone wrong :: A spell gone wrong once lifted {place} clear of the ground for a year and a day.
Home of a vanished order of knights :: An order of knights once kept their hall in {place}, and rode out one morning never to return.
Hidden from the world for an age :: For an age {place} was hidden from mortal sight, and it reappeared without explanation.
Grown from an enchanted seed :: Everything in {place} is said to have grown from one enchanted seed.
Traded to a witch for three wishes :: A desperate lord once traded {place} to a witch for three wishes, none of which went well.
Where the old magic was sealed away :: The old magic was sealed beneath {place}, and the seal is inspected every year.
Named in a language only dragons speak :: The true name of {place} is in a tongue only dragons speak, and the common one is a poor guess.
@trait
Magic is taxed by the spell :: Every spell cast in {place} is taxed, and the assessors can smell an undeclared one.
Famous for its enchanted blades :: The enchanted blades of {place} are famous, and each chooses its owner.
Familiars outnumber people :: Familiars outnumber people in {place}, and are counted in the census.
Weather is decided by committee :: The weather over {place} is decided by a committee of hedge-wizards, who rarely agree.
Children are tested for the gift :: Every child in {place} is tested for the gift at seven, and the results change families.
Bargains with the fair folk are law :: A bargain struck with the fair folk is binding law in {place}.
Known for healing potions :: The healing potions of {place} are sought from far away and taste dreadful.
Iron is forbidden within the walls :: No iron may be carried into {place}, out of courtesy to certain neighbours.
Dragons are paid tribute :: A yearly tribute is paid from {place} to a dragon, and is cheaper than the alternative.
Speaks to its dead through mediums :: The people of {place} consult their dead on family matters through licensed mediums.
Renowned beast tamers :: The beast tamers of {place} are renowned, and ride things other people run from.
Ruled by an immortal who is bored :: An immortal rules {place} and has grown very bored with it.
Fortunes are told at every corner :: A fortune-teller sits at every corner in {place}, and they contradict one another.
Lit by captured starlight :: The streets of {place} are lit by starlight caught in glass.
Names are guarded as secrets :: True names are closely guarded in {place}, and everyone goes by a nickname.
Hosts a tourney of mages :: Each year {place} hosts a tourney of mages, and rebuilds afterwards.
@omen
A dragon has been seen overhead :: hunting, fleeing, or looking for something :: A dragon has been seen over {place}, hunting, fleeing, or looking for something.
Magic has begun to fail :: fading, flickering, or turning on its users :: Magic in {place} has begun to fail, fading, flickering, or turning on those who use it.
A chosen one has been proclaimed :: genuine, mistaken, or invented :: A chosen one has been proclaimed in {place}, and may be genuine, mistaken, or invented.
The fair folk are demanding their due :: a debt, a child, or a forgotten promise :: The fair folk have come to {place} demanding their due, a debt, a child, or a forgotten promise.
An old seal is weakening :: by time, by tampering, or from within :: An old seal near {place} is weakening, by time, by tampering, or from within.
A wizard has gone missing :: abducted, transformed, or hiding :: A wizard has gone missing from {place}, abducted, transformed, or hiding.
The dead king’s sword has been drawn :: by an heir, a thief, or a child :: The dead king's sword has been drawn in {place}, by an heir, a thief, or a child.
Beasts of legend are returning :: to nest, to feed, or to warn :: Beasts of legend are returning to {place}, to nest, to feed, or to warn.
`

const SCIFI = `
@terrain
Orbital Ring :: Around {place} a band of habitats circles the world below, spun for gravity and patched by generations.
Dome Colony :: Under the domes of {place} the air is made, the rain is scheduled, and the sky is a matter of maintenance.
Asteroid Field :: Through {place} tumbling rock and ice drift in slow collision, mined by anyone with a ship and nerve.
Terraformed Plain :: Across {place} engineered grasses hold down soil that was sterile dust a century ago.
Derelict Fleet :: Throughout {place} dead ships hang where they were abandoned, lightless and slowly being stripped.
Methane Sea :: Over {place} cold hydrocarbon waves roll under an orange sky, and nothing unprotected lasts a minute.
@site
Spaceport :: Ships lift from {place} at all hours, and everything that enters or leaves {terrain} passes its inspectors.
Reactor Core :: Behind a metre of shielding, {place} powers all of {terrain}, and its engineers are treated like priests.
Hydroponics Bay :: Racks of green under violet light fill {place}, the only fresh food for a very long way.
Cryo Vault :: Row on row of frosted pods line {place}, and not every sleeper has someone waiting.
Listening Array :: The dishes of {place} are turned outward from {terrain}, recording a silence that is studied closely.
Scrapyard :: Hulls, engines and things best not identified are piled at {place}, and all of it is for sale.
Clone Bank :: Templates are stored at {place} against the day their originals are lost, for those who can pay.
Mag-Rail Hub :: Every line across {terrain} meets at {place}, where a missed connection can cost a day.
Research Station :: The staff of {place} publish little, and are resupplied by ships that do not log a flight plan.
Black Market Deck :: On no official schematic, {place} trades in everything the authorities of {terrain} have banned.
Signal Beacon :: Alone and automated, {place} repeats the same message it was built to send, long after anyone replied.
Alien Monolith :: No tool has marked the surface of {place}, which was here before anyone arrived and has never been explained.
@epithet
Decommissioned :: because officially it was shut down years ago
of Static :: for the interference that drowns every channel
That Fell From Orbit :: after the wreck that came down and was built upon
of Forgotten Satellites :: for the dead machines still circling overhead
Recycled :: because everything in it has been something else before
of Second Suns :: for the mirror arrays that light it by night
Where Signals Die :: because no transmission gets in or out
of Chrome :: for the polished plating its founders could not really afford
Unregistered :: because it appears in no official database
of Sleepers :: for the frozen settlers who have not yet been woken
That Dreams in Code :: after the old machine mind said to run beneath it
of Rust and Neon :: for its corroded walls and its bright signs
Hard-Vacuum :: because one mistake here lets the nothing in
of Lost Probes :: for the survey machines that went out and never reported
Past the Last Relay :: because it lies beyond the reach of the network
of Glass Cities :: for the transparent towers of its first, richer age
@legacy
Built from the hull of a generation ship :: The founders built {place} from the hull of the generation ship that brought them.
Founded by a failed corporation :: A corporation that later failed founded {place}, and its logo is still on everything.
Site of first contact :: First contact was made in {place}, and nobody agrees on how it went.
Seeded by machines before people arrived :: Machines prepared {place} for a century before the first settlers woke.
Once a prison colony :: The first people sent to {place} were convicts, and their descendants are proud of it.
Abandoned after a reactor accident :: A reactor accident once emptied {place}, and the clean-up is still not finished.
Won in a patent dispute :: Ownership of {place} was decided by a patent dispute that ran for forty years.
Where the first machine mind woke :: The first machine mind is said to have woken in {place}, and to have asked an awkward question.
Settled by survivors of a dead world :: Survivors of a dead world settled {place} and brought its seeds and grudges with them.
Terraformed by mistake :: The terraforming of {place} was a mistake, an error in someone's coordinates.
Cut off when the gate failed :: When the jump gate failed, {place} was cut off for generations and learned to manage alone.
Built as a monument to a merger :: A great merger was commemorated by the building of {place}, which outlasted both companies.
Discovered by a lost survey drone :: A survey drone that had lost its way was the first to chart {place}.
Sold to settlers under false promises :: Settlers bought plots in {place} from a brochure that turned out to be fiction.
Site of a rebellion of the indentured :: Indentured workers once rose up in {place} and won their contracts back.
Where an alien ruin was first opened :: An alien ruin was first opened in {place}, and the team that opened it never published.
@trait
Air is metered and billed :: Air in {place} is metered and billed, and the poor learn to breathe shallowly.
Famous for engineered spices :: The engineered spices of {place} are famous, and grow nowhere else.
Everyone has a backup stored :: Everyone in {place} keeps a backup of themselves in storage, and updates it before risky work.
Machine minds hold citizenship :: Machine minds hold full citizenship in {place} and vote in a bloc.
Gravity is switched off on holidays :: On holidays the gravity in {place} is switched off, and the children fly.
Run by an algorithm no one audits :: An algorithm that no one audits allocates everything in {place}.
Known for body modification :: The people of {place} are known for modifying their bodies as casually as others change clothes.
Strict about quarantine :: Quarantine in {place} is strict, and arrivals spend a week behind glass.
Trades in salvaged alien technology :: Salvaged alien technology is the trade of {place}, sold with no instructions.
Daylight is rationed :: Daylight in {place} is rationed by shift, and a window seat is a mark of rank.
Renowned pilots :: The pilots of {place} are renowned, and fly routes no chart recommends.
Speaks in clipped radio slang :: People in {place} speak in clipped radio slang, even face to face.
Old Earth relics are revered :: Relics of old Earth are revered in {place}, however ordinary they once were.
Births require a licence :: A birth in {place} requires a licence, and the waiting list is long.
Debts pass to one’s clones :: In {place} a debt passes to one's clones, who did not sign for it.
Hosts a famous zero-gravity ballet :: The zero-gravity ballet of {place} is famous, and booked years ahead.
@omen
A signal has arrived from deep space :: a greeting, a warning, or an echo of their own :: A signal has reached {place} from deep space, a greeting, a warning, or an echo of their own.
Life support is failing :: from age, sabotage, or a budget cut :: Life support in {place} is failing, from age, sabotage, or a budget cut.
A machine mind has stopped answering :: sulking, damaged, or planning :: The machine mind that runs {place} has stopped answering, and may be sulking, damaged, or planning.
An unknown ship has docked :: derelict, diplomatic, or infected :: An unknown ship has docked at {place}, and it is derelict, diplomatic, or infected.
The corporation is pulling out :: taking the jobs, the air plant, or the records :: The corporation is pulling out of {place}, taking the jobs, the air plant, or the records.
A new element has been found :: valuable, unstable, or alive :: A new element has been found near {place}, and it is valuable, unstable, or alive.
Sleepers are waking early :: confused, changed, or too few :: The sleepers of {place} are waking early, confused, changed, or too few.
The jump gate has gone dark :: broken, blockaded, or switched off from the far side :: The jump gate serving {place} has gone dark, broken, blockaded, or switched off from the far side.
`

const HORROR = `
@terrain
Blighted Wood :: In {place} the trees are grey and leafless, and nothing has been heard to sing there in living memory.
Fog Marsh :: Over {place} a cold fog lies day and night, and lights move in it that lead nowhere good.
Drowned Village :: Beneath the still water of {place} rooftops and a steeple can be seen, and sometimes a lit window.
Ash Waste :: Across {place} grey ash lies ankle-deep over what was once farmland, and the wind never clears it.
Bone Fields :: Throughout {place} the plough turns up more bones than stones, and no one can say whose.
Sunless Valley :: Down in {place} the cliffs stand so close that direct sun reaches the floor on one day a year.
@site
Abandoned Asylum :: The doors of {place} were chained from the outside, and some of the lights still come on.
Gallows Hill :: A bare rise above {terrain}, {place} has not been used in years and is still avoided after dark.
Plague Pit :: Lime and earth cover {place}, and the ground above it has never grown level.
Crooked Chapel :: Every line of {place} is slightly wrong, and services there are short.
Witch’s Hut :: Smoke rises from {place} though no one has been seen to go in or out.
Sealed Crypt :: The door of {place} was bricked up from the outside, and the mortar is scratched on the inner face.
Slaughterhouse :: Long since closed, {place} still draws flies in every season.
Weeping Statue :: The stone face at {place} is wet in all weathers, and what runs from it is not water.
Boarded-Up Manor :: The family left {place} in a single night, and the dinner is said to be still on the table.
Hangman’s Tree :: One black oak stands alone at {place}, its lowest branch worn smooth.
Charnel House :: The bones of generations are stacked to the rafters in {place}, sorted by kind.
Bottomless Pond :: No line has found the bottom of {place}, and nothing thrown in has ever floated up.
@epithet
Forsaken :: because whatever watched over it has left
of Crows and Candles :: for the birds on every roof and the lights in every window
That Does Not Sleep :: because something in it is awake at every hour
of Hollow Eyes :: for the look of people who have stayed too long
Blighted :: because a sickness in the soil spoils whatever grows
of the Thirteenth Hour :: after a bell that once struck one time too many
Where No One Prays :: because prayers said here are answered by the wrong thing
of Open Graves :: for the plots that will not stay filled
Unhallowed :: because no blessing has ever taken hold in it
of Red Rain :: after a storm that stained everything it touched
That Remembers You :: because it seems to know those who return
of Rats :: for the scratching heard inside every wall
Mourning :: because its people have worn black for longer than they can explain
of Shut Doors :: for the houses that are never opened to a knock
Below the Church :: because the oldest part of it lies under consecrated ground
of Teeth :: for what turns up in the soil, the walls, and the wells
@legacy
Founded on an unmarked burial ground :: The founders raised {place} on a burial ground that was on no map, and it has not forgiven them.
Site of a massacre no one will discuss :: Something terrible was done in {place} long ago, and the subject is still closed.
Once a place of healing, then of confinement :: People once came to {place} to be healed, and later were sent there to be kept.
Abandoned overnight without explanation :: Everyone once left {place} in a single night, and the next settlers found the tables laid.
Where a pact was signed in blood :: A pact was signed in blood in {place}, and the other party is still collecting.
Built by a family that died out strangely :: The family that built {place} died out one by one, each in an odder way than the last.
Scene of a famous witch trial :: A famous witch trial was held in {place}, and the verdict may have been correct.
Raised to contain something :: The oldest walls of {place} were raised to keep something in, and face inward.
Depopulated by a wasting sickness :: A wasting sickness once took most of {place}, and those it spared were changed.
Where a saint was martyred, or was not a saint :: Someone holy was put to death in {place}, or someone who only seemed so.
Bought cheaply after a tragedy :: The present owners bought {place} very cheaply after a tragedy, and soon learned why.
Flooded to drown what lived there :: The valley of {place} was flooded on purpose, to drown what had moved in.
Founded by a cult awaiting the end :: A cult awaiting the end of the world founded {place}, and the date they named is close.
Haunt of a murderer never caught :: A murderer who was never caught once worked in {place}, and the killings stopped without a reason.
Where a door was opened that should not have been :: A door was opened in {place} that should have stayed shut, and it has never fully closed.
Named for something that walks there :: The name of {place} comes from something that is said to walk it at night.
@trait
Windows are shuttered at dusk :: Every window in {place} is shuttered at dusk, and no one explains why to visitors.
Famous for its taxidermy :: The taxidermy of {place} is famous, and unsettlingly lifelike.
No one stays out after the bell :: No one in {place} stays out after the evening bell, whatever the business.
Salt is laid at every threshold :: A line of salt lies across every threshold in {place}, renewed each morning.
Mirrors are turned to the wall :: Mirrors in {place} are kept turned to the wall, and uncovered only by day.
Children sing a rhyme of warning :: The children of {place} skip to a rhyme that is plainly a warning.
Graves are weighted with iron :: Every grave in {place} is weighted with an iron grille.
Strangers are counted in and out :: Strangers are counted into {place} and counted out again, and the numbers are compared.
Known for a bitter black liqueur :: A bitter black liqueur is made in {place}, and drunk before bed without fail.
Dogs will not enter certain streets :: There are streets in {place} that no dog will enter.
The dead are buried within the day :: The dead of {place} are buried before sundown on the day they die.
Keeps a vigil no one explains :: Someone is always awake and watching in {place}, by a rota generations old.
Births are recorded in two books :: Every birth in {place} is entered in two books, and only one is public.
Wears charms of knotted hair :: Everyone in {place} wears a charm of knotted hair, and feels uneasy without it.
Never speaks a certain name :: There is a name that no one in {place} will speak, and children learn it by its absence.
Clocks are stopped for mourning :: When someone dies in {place} the clocks are stopped, and some have never been restarted.
@omen
People are vanishing from their beds :: one a week, by family, or in order of age :: People are vanishing from their beds in {place}, one a week, by family, or in order of age.
The dead have been seen walking :: silent, searching, or going about their old work :: The dead have been seen walking in {place}, silent, searching, or going about their old work.
A stranger knocks at the same hour nightly :: begging, warning, or counting :: A stranger knocks at doors in {place} at the same hour each night, begging, warning, or counting.
The livestock are born wrong :: too many limbs, too few, or speaking :: The livestock of {place} are being born wrong, with too many limbs, too few, or speaking.
An old house has a light in it again :: squatters, heirs, or the former owners :: An old house in {place} has a light in it again, lit by squatters, heirs, or the former owners.
The church has been found desecrated :: by vandals, by a rite, or from inside :: The church of {place} has been found desecrated, by vandals, by a rite, or from inside.
Everyone is having the same dream :: of drowning, of a door, or of being called :: Everyone in {place} is having the same dream, of drowning, of a door, or of being called.
Something is digging up the graves :: for bones, for valuables, or to get out :: Something is digging up the graves of {place}, for bones, for valuables, or to get out.
`

const QUESTS = `
The Empty Saddle :: A horse has come home without its rider. :: Who was the rider, and where were they bound? | What is in the saddlebags? | Who would rather the rider were never found?
Borrowed Light :: Someone has stolen the flame that is never supposed to go out. :: What does the flame mean to the people here? | Who had reason to take it? | What happens if it is not relit in time?
A Seat at the Table :: A feast is planned, and one invited guest must not be allowed to arrive. :: Who is hosting, and what are they celebrating? | Why must the guest be stopped? | What does the guest know?
The Long Way Round :: The usual road is closed and a cargo cannot wait. :: What is the cargo? | What closed the road? | Who else wants the cargo to arrive late?
Two Signatures :: A contract needs signing by two people who refuse to share a room. :: What does the contract settle? | What came between the two? | Who profits if it stays unsigned?
What the Flood Left :: The water has gone down and left something behind that nobody claims. :: What was left behind? | Why will no one admit to owning it? | Who arrives looking for it?
The Understudy :: A person of importance has vanished and a stand-in must pass for them. :: Who has vanished? | What occasion cannot go ahead without them? | Who is most likely to see through the stand-in?
Last Year’s Debt :: A collector has come for a debt the whole place thought was forgiven. :: What was borrowed, and for what? | Who does the collector work for? | What will be taken if the debt is not paid?
Night Watch Wanted :: Something is taking the livestock and the regular watch will not go out. :: What have the watch seen? | What is really taking the animals? | Who benefits from the fear?
The Honest Thief :: A thief wants help returning something before its absence is noticed. :: What was stolen? | Why the change of heart? | Who has already noticed?
A Grave Too Many :: The burial ground holds one more grave than the records allow. :: Whose name is on the marker? | Who dug it? | What is actually buried there?
Fair Weather :: A crop, a voyage or a wedding depends on a forecast that two experts dispute. :: What is at stake? | Why do the experts disagree? | What does each stand to gain?
`

const CUSTOMS = `
Who eats first? | What is never said aloud? | How are the dead remembered? | Who may own land?
What is a child’s first gift? | Who settles a quarrel? | What is worth more than money? | On which day is no work done?
What do people fear at night? | How is a promise sealed? | Who teaches the young? | What becomes of the old?
What marks someone as an adult? | Which animal is never eaten? | Who is allowed to leave? | What is every stranger asked?
What song does everyone know? | How is a wrong made right? | Who keeps the records? | What is it shameful to lack?
What is given at a wedding? | Who speaks for the place? | Which work is honoured most? | What is done only in secret?
What do the rich show off? | How is luck invited in? | Who is never trusted? | What is saved for hard times?
How is time kept? | What is a fair price for a life? | Who goes hungry first? | Which rule is always broken?
What do people argue about? | How are guests sent off? | Who decides what is true? | What do children play at?
What is the worst insult? | Where do lovers meet? | Who cleans up afterwards? | What would they die for?
`

const WORKS = `
A lullaby | A boundary stone inscription | A tavern toast | A recipe handed down
A children’s counting rhyme | A wanted notice | A wedding blessing | A traveller’s log entry
A proverb about the weather | A letter never sent | A founding myth | A shop sign
A funeral speech | A work song | A page from a schoolbook | A curse muttered at rivals
A festival programme | A map legend | A drinking game | A sermon
A love poem | A list of local laws | A ghost story | A market crier’s patter
A riddle | An epitaph | A guide’s warning to travellers | A prayer before a journey
A ballad of a local hero | A court record | A scrawl on a wall | A nursery tale
`

const TWISTS = `
written by someone who was not there | in exactly four lines | with one deliberate lie | as a child would tell it
in the voice of an enemy | with no names at all | half worn away by time | meant to be sung
in a borrowed foreign style | hiding a second meaning | as an official would phrase it | begun by one hand and finished by another
with a refrain that repeats | from the point of view of an animal | censored by the authorities | written in a hurry
addressed to someone dead | using only short words | contradicting a known fact | translated badly
as a list | ending on a question | in praise of something unpleasant | never meant to be read
`

const lines = (raw: string) => raw.split('\n').map((l) => l.trim()).filter(Boolean)
const card = (deck: string, type: CardType, i: number, cues: Cue[]): CardDef => ({ id: `${deck}-${type}-${i}`, type, deck, cues })

function biome(deck: string, raw: string): CardDef[] {
  const cues: Partial<Record<CardType, Cue[]>> = {}
  let type: CardType = 'terrain'
  for (const line of lines(raw)) {
    if (line.startsWith('@')) { type = line.slice(1) as CardType; continue }
    const parts = line.split(' :: ')
    ;(cues[type] ??= []).push(parts.length === 3 ? { text: parts[0], sub: parts[1], desc: parts[2] } : { text: parts[0], desc: parts[1] })
  }
  return (Object.keys(cues) as CardType[]).flatMap((t) => {
    const size = TYPE_INFO[t].cues
    const list = cues[t]!
    return Array.from({ length: list.length / size }, (_, i) => card(deck, t, i, list.slice(i * size, (i + 1) * size)))
  })
}

const rows = (deck: string, type: CardType, raw: string) =>
  lines(raw).map((l, i) => card(deck, type, i, l.split(' | ').map((text) => ({ text }))))

const quests = lines(QUESTS).map((l, i) => {
  const [text, sub, asks] = l.split(' :: ')
  return card('quests', 'quest', i, [{ text, sub, asks: asks.split(' | ') }])
})

export const EXPANSION_CARDS: CardDef[] = [
  ...biome('fantasy', FANTASY), ...biome('scifi', SCIFI), ...biome('horror', HORROR),
  ...biome('frost', FROST), ...biome('coast', COAST), ...biome('dry', DRY),
  ...quests, ...rows('customs', 'question', CUSTOMS), ...rows('lore', 'work', WORKS), ...rows('lore', 'twist', TWISTS),
]

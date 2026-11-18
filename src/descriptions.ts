// A sentence of description for every cue in the starter deck, written for Worldloom.
//
// Each line is `cue :: description`. Descriptions may refer to the cards around them:
//   {place}          the Terrain or Site the card sits on ("the Whispering Marsh", then "the marsh")
//   {terrain}        the Terrain of the microsetting ("the marsh")
//   {site|fallback}  another Site in the same microsetting, or the fallback when there is none
// Epithet lines are a reason, completing "They say “of Lanterns” …".

const RAW = `
Marsh :: In {place} the ground is never quite land and never quite water, and paths shift with every season of rain.
Steppe :: Across {place} the grass runs unbroken to the horizon, and weather can be seen coming a full day off.
Highlands :: Up in {place} the air is thin and clean, the valleys are steep, and every village looks down on its neighbour.
Archipelago :: Through {place} run a hundred channels between a hundred islands, and no two charts agree on the count.
Fjord :: Along {place} sheer rock drops straight into deep, still water, and sound carries from shore to shore.
Dunes :: Across {place} the sand ridges creep a little further each year, burying and uncovering whatever lies in their way.
Old Forest :: Under the canopy of {place} it is dusk at noon, and some of the trees were old before anyone thought to name them.
Tundra :: Over {place} the ground stays frozen a hand's depth down, and the short summer comes all at once in flowers and midges.
Salt Flats :: Out on {place} the white crust stretches flat as a table, and distances are impossible to judge.
Badlands :: In {place} wind and flash floods have carved the earth into gullies and striped spires where little will grow.
Savanna :: Across {place} tall grass and flat-topped trees turn gold in the dry months and green overnight when the rains arrive.
Moor :: On {place} heather and peat roll away under a low sky, and mist can close in within the hour.
Rift Valley :: Down the length of {place} the land has split and sunk, leaving steep walls, warm lakes and uneasy ground.
Lagoon :: Around {place} a ring of sandbars holds back the open sea, keeping the water inside shallow, warm and calm.
Karst :: Beneath {place} the limestone is riddled with caves, and streams vanish into the ground only to surface miles away.
Floodplain :: Every year the river spreads across {place} and leaves behind the dark silt that makes it so fertile and so risky.
Caldera :: Long ago a mountain collapsed to form {place}, and the ring of cliffs it left still steams in cold weather.
Heath :: Over {place} gorse and low scrub cover poor sandy soil, bright with flower in spring and tinder-dry by late summer.
Glacier :: Down through {place} a river of old ice grinds toward the lowlands, groaning at night and shedding milky meltwater.
Mangrove :: Through {place} tangled roots stand in brackish water, passable only by boat and only at the right tide.
Plateau :: Up on {place} the land lies high and level, ringed by cliffs that make every road in a climb.
Estuary :: Across {place} river and sea trade places twice a day, leaving mudflats, channels and clouds of wading birds.
Canyonlands :: Through {place} deep red gorges wind between flat-topped mesas, cool in their depths and scorching on the rim.
Atoll :: Around {place} a thin ring of coral and palm encloses bright water, with nothing beyond the reef but open ocean.
Rainforest :: In {place} it rains most afternoons, the canopy closes overhead in layers, and a cleared path is green again within the month.
Pine Barrens :: Across {place} thin pines stand in sand too poor to farm, and fire runs through every few years and leaves them the better for it.
Prairie :: Over {place} the grass stands shoulder-high and moves like water, and a rider can be seen an hour before arriving.
Downs :: Across {place} smooth chalk hills roll under short turf, cropped by sheep and crossed by tracks older than any road.
Farmland :: Through {place} every acre is hedged, ditched and spoken for, and the look of the fields tells the season at a glance.
Mountain Range :: Along {place} peak follows peak further than anyone has walked, snow lies on the heights all year, and the passes decide who trades with whom.
Hill Country :: In {place} no road runs straight and no two valleys agree, and every hilltop has had something built on it at one time or another.
Lake Country :: Across {place} water lies in every hollow, and it is quicker to row between most villages than to walk.
River Valley :: Down {place} one great river does the work of roads, boundary and calendar, and everything of note stands within sight of it.
Fenland :: Over {place} the land is flat, black and half water, drained by dykes that need mending every winter.
Volcanic Fields :: Across {place} the ground is black rock still warm in places, split by vents, and bare where the last flow ran.

Lighthouse :: At the edge of {terrain}, the lamp of {place} can be seen for a day's travel in every direction.
Ferry Landing :: At {place} a flat-bottomed ferry carries people, livestock and gossip across the water of {terrain}.
Observatory :: On the clearest height of {terrain}, the watchers of {place} chart the sky each night and argue about it each morning.
Mill :: The wheel at {place} grinds grain for everyone in {terrain}, and takes a tenth for the trouble.
Quarry :: Generations of cutting have opened {place} like a wound in {terrain}, stepped and echoing.
Orchard :: Row on row of old fruit trees make up {place}, heavy with blossom or fruit depending on the month.
Bathhouse :: Steam, hot stone and the business of the whole district meet in {place}, where no one stays a stranger for long.
Archive :: Shelf upon shelf of ledgers, letters and maps fill {place}, most of them unread for a lifetime.
Foundry :: The furnaces of {place} glow day and night, and their smoke can be smelled across {terrain}.
Market Square :: Everything grown, made or stolen in {terrain} is sooner or later sold in {place}.
Watchtower :: From the top of {place} a keen eye can follow every road and trail across {terrain}.
Cistern :: Deep under cool stone vaults, {place} holds enough water to see {terrain} through its driest season.
Amphitheatre :: The stone tiers of {place} seat thousands, and a whisper from the stage reaches the highest row.
Shrine :: Travellers through {terrain} rarely pass {place} without leaving a coin, a ribbon or a promise.
Causeway :: A raised road of fitted stone, {place} is the one dry way across this part of {terrain}.
Hamlet :: A dozen households and one shared oven make up {place}, where everyone knows whose turn it is to bake.
Citadel :: Thick walls and a single gate make {place} the last place in {terrain} anyone would try to take by force.
Harbour :: Behind its breakwater, {place} shelters fishing boats, traders and the odd ship that would rather not say where it has been.
Aqueduct :: On tall arches, {place} carries clean water across {terrain} from springs a long way off.
Burial Mound :: Grass has long since covered {place}, and nobody now is certain who lies inside.
Hot Spring :: Scalding, mineral-bright water wells up at {place}, and people travel far across {terrain} to soak in it.
Mine :: The shafts of {place} run deeper every year, following a seam that keeps promising more.
Customs House :: Nothing crosses {terrain} untaxed if the clerks of {place} can help it.
Standing Stones :: Older than any record, {place} cast long shadows across {terrain} that line up with something on certain days.
Hermitage :: A few bare cells out of the wind make up {place}, home to people who came to {terrain} to be left alone.
Fairground :: For most of the year {place} is an empty field, and for one loud week it is the centre of {terrain}.
Sinkhole :: The ground simply ends at {place}, a sheer-sided pit whose bottom few have seen.
Cove :: Hidden between two headlands, {place} offers calm water and a beach just wide enough to land a boat unseen.
Inn :: Every road through {terrain} seems to pass {place}, where the stew is hot and the rumours are fresh.
Granary :: Raised on stone feet against rats and damp, {place} holds the grain that stands between {terrain} and a hungry winter.
Signal Fire :: A stack of dry timber is always kept ready at {place}, to be lit when {terrain} needs warning.
Clocktower :: The hours of everyone within earshot are ruled by {place}, whether or not it keeps good time.
Walled Town :: Inside its ring of stone, {place} packs houses, workshops and quarrels tightly together.
Sluice Gate :: Whoever holds the wheel at {place} decides which fields in {terrain} drink and which go dry.
Apiary :: A hillside of straw hives hums at {place}, and the honey tastes of whatever is flowering in {terrain}.
Rope Bridge :: Swaying over a long drop, {place} saves a day's walk for anyone with the nerve to cross.
Ropewalk :: In the long shed of {place}, walkers twist hemp into cable, backing away a step at a time.
Tannery :: The smell announces {place} well before it comes into sight, and its leather is worth the stink.
Monastery :: Behind quiet walls, the community of {place} keeps its hours, its garden and its own counsel.
Toll Gate :: A bar across the road and a keeper with an open palm are all there is to {place}, and all there needs to be.
Windmill :: On the windiest rise in {terrain}, the sails of {place} turn from dawn until the grain runs out.
Boatyard :: Half-built hulls stand in their cradles at {place}, and the air smells of pitch and fresh-cut timber.
Menagerie :: Strange animals from far beyond {terrain} pace, perch and doze behind the bars of {place}.
Salt Works :: Shallow pans at {place} dry slowly in the sun, leaving the grey salt that {terrain} trades for everything else.
Courthouse :: Every dispute in {terrain} ends up before the bench at {place} sooner or later.
Kiln :: The great oven at {place} burns for days at a stretch, and its bricks have built half of {terrain}.
Stepwell :: Flights of carved stairs lead down into {place}, where the water is cool even at midsummer.
Vineyard :: Terraced rows climb the slope at {place}, and the whole district turns out for the harvest.
Barrow :: A long, low hump in the earth, {place} is said to hold someone important and best left undisturbed.
Beacon Hill :: From the bare top of {place} a fire can be seen from one end of {terrain} to the other.
Glassworks :: The blowers of {place} turn sand and ash into vessels that catch the light like water.
Ford :: At {place} the river runs wide and shallow over gravel, the only safe crossing for miles.
Almshouse :: The old, the sick and the luckless of {terrain} are given a bed and a bowl at {place}.
Tide Pool :: Twice a day the sea fills {place} and withdraws, leaving small bright creatures stranded in clear water.
Stockade :: A ring of sharpened logs encloses {place}, raised in a hurry and never quite taken down.
Tea House :: Low tables, quiet talk and a kettle always on the boil draw people to {place}.
Printing House :: The presses of {place} clatter out handbills, almanacs and now and then something that gets someone arrested.
Menhir :: A single tall stone, {place} leans a little further every century, and no one will say who raised it.
Dry Dock :: Ships are floated into {place} and left high on their keels to be scraped, patched and argued over.
Wishing Well :: People drop pins and coins into {place} and are careful never to say aloud what they asked for.

Whispering :: because the wind here never quite stops talking
of Lanterns :: for the lamps hung at every door after dark
of Second Chances :: because so many have come here to start again
That Dreams :: because people who sleep here all wake with the same story
Drowned :: because the water has taken it more than once
of Rust :: for the red stain that iron leaves on everything here
Where Rivers Argue :: for the two currents that meet nearby and never mix
of Unpaid Debts :: because everyone here seems to owe something to someone
Gilded :: for the way it catches fire in the evening light
of Owls :: for the birds that roost here in their hundreds
That Forgets :: because nothing written down here seems to last
of Honey :: for the wild hives found in every hollow
Patient :: because nothing here has ever been done in a hurry
Beyond the Bells :: because it lies just past the reach of the nearest bell
of Kites :: for the bright shapes flown above it on every windy day
Without Shadows :: because at noon here nothing seems to cast one
Crooked :: because not one line in it runs straight
of Ink :: for the dark stain its water leaves on the hands
That Listens :: because secrets spoken here have a way of getting out
of Lost Gloves :: after a joke so old that nobody remembers the first half
Thirsty :: because it swallows rain without ever seeming wet
Under the Comet :: because a comet hung over it the year it was first settled
of Thorns :: for the briars that guard every approach
of Seven Sisters :: after seven sisters who each claimed a share of it
Borrowed :: because by rights it belongs to someone else
That Never Thaws :: for a patch of frost that lingers even at midsummer
of Brass :: for the brassy colour of its stone at sunset
of Quiet Bargains :: for the deals struck here that are never written down
Humming :: for a low note in the air that no one can trace
Where Maps End :: because mapmakers gave up a little way past it
of Moths :: for the pale moths that rise from it at dusk
of Old Songs :: because tunes forgotten elsewhere are still sung here
Unmapped :: because no chart has ever placed it the same way twice
That Hungers :: because it has a way of taking whatever is left unattended
of Salt :: for the white crust that forms on anything left out overnight
of Wandering Doors :: after a tale of a door that is never found in the same wall twice
Ashen :: for the grey dust that settles over everything
Between Tides :: because it can only be reached when the water allows
of Copper :: for the green streaks of copper in its rock
of Lullabies :: for the cradle songs that every child here learns first
Restless :: because nothing in it stays where it was put
That Burned Twice :: after two great fires a generation apart
of Crows :: for the crows that gather here before any change of weather
of Soft Rain :: for the fine drizzle that falls most afternoons
Forgiving :: because it has taken back everyone who ever left it
Where Kings Kneel :: after a ruler who once came here to beg pardon
of Mirrors :: for the still pools that double the sky
of Long Shadows :: because the light comes in low even at midday
Hollow :: because the ground rings underfoot as if nothing lay beneath
That Bargains :: because nothing is given here without something asked in return
of Bones and Barley :: for what the plough turns up alongside the harvest
of Wild Geese :: for the flocks that darken the sky each autumn
Stubborn :: because it has outlasted every attempt to change it
Before the Dawn :: because work here starts while it is still dark
of Needles :: for the sharp-leaved trees that crowd around it
of Amber :: for the golden resin found washed out of its banks
Salted :: because the sea wind has cured everything in it
That Wanders :: because travellers swear it is never quite where they left it
of Echoes :: because a shout here comes back three times
of Last Letters :: for the farewells sent from here by those going further on
Thousandfold :: because whatever is planted here comes back a thousand times over
Where Wolves Sing :: for the howling heard from the hills on clear nights
of Chalk :: for the white rock that shows wherever the turf is cut
of Small Mercies :: because people here have learned to be glad of little things
Sleepless :: because some light or other is always burning
of Broken Oaths :: after a promise made here and famously not kept
That Keeps Count :: because every debt and favour here is remembered exactly
of Tin Whistles :: for the cheap whistles every child carries
Mended :: because it has been broken and put back together more than once
of Burnt Sugar :: for the sweet scorched smell that hangs over it
Where Tides Wait :: for the long slack water before the turn
of Sparrows :: for the small brown birds that own every roof
Giddy :: for the lightheaded feeling that newcomers always report
of Hidden Stairs :: for the steps cut where no one would think to look
That Sings Back :: because any tune sung here returns a moment later, slightly changed
of Pewter :: for the dull grey shine of its water under cloud
Feathered :: for the down that drifts through it in moulting season
of Slow Clocks :: because every timepiece here runs a little behind
Beyond the Last Fence :: because it begins where the farmland gives up
of Foxgloves :: for the purple spires that crowd its edges in summer
Tilted :: because nothing in it stands quite level
of Open Windows :: because shutters here are never closed, whatever the weather
That Owes Nothing :: because it has never paid tribute to anyone
of Driftwood :: for the bleached timber the water leaves behind
Unhurried :: because even the water seems to take its time
of Three Moons :: after a night when three moons were seen reflected here
Where Smoke Rises :: for the thin column of smoke that marks it from afar
of Riddles :: for the puzzles carved where passers-by can see them
Smouldering :: for the warmth that still rises from the ground
of Cold Hearths :: for the abandoned fireplaces that outnumber the lit ones
That Came Back :: because it was given up for lost and then was not
of Sealing Wax :: for the red clay that takes a stamp like wax
Twice-Sold :: after a swindle in which it was sold to two buyers on the same day
of Paper Boats :: for the folded boats children set adrift here each spring
Without a Master :: because no lord has ever managed to hold it for long
of Hazel :: for the hazel thickets that are cut for rods and baskets
Moonlit :: because it is said to look its best by night
of Unsent Gifts :: after a store of presents found here, wrapped and never delivered
That Outlived Its Makers :: because those who built it are long gone and it is not
of Flint :: for the sharp dark stones that work up through the soil
Bitter :: for the taste of the water, which takes some getting used to
of Sweet Water :: for the one spring that runs clean and cold all year
Where Children Rule :: after a festival day when the young are put in charge
of Looms :: for the clack of weaving heard from every doorway
Wayward :: because roads that lead to it seldom arrive where they meant to
of Empty Thrones :: after a seat of honour kept ready for someone who never comes
That Prays for Rain :: for the processions held whenever the sky stays clear too long
of Herons :: for the grey birds standing motionless in the shallows
Painted :: for the bright colours daubed on anything that stands still
of Borrowed Time :: because by every reckoning it should not have lasted this long
Under Lock and Key :: because for years no one could enter without a warrant
of Marigolds :: for the orange flowers planted along every path
Sunken :: because it lies lower than everything around it
of Good Intentions :: after a grand plan that was begun here and never finished
That Speaks in Bells :: because news is passed by ringing rather than by word
of Walnut :: for the old nut trees whose timber is prized by joiners
Tongue-Tied :: because visitors find themselves oddly lost for words
of Lost Causes :: because every doomed venture seems to make its last stand here
Where Roads Forget :: because tracks that enter it fade out without warning
of Starlings :: for the great wheeling flocks that gather at dusk

Raised by shipwreck survivors :: Shipwreck survivors were the first to settle {place}, and the oldest roofs are still framed with ship's timbers.
Once the floor of a vanished sea :: A sea once covered {place}, and shells still turn up wherever anyone digs.
Won in a wager between rivals :: Two rivals once staked {place} on a single wager, and the loser's family has never accepted the result.
Named for a mistranslation :: The name of {place} began as a clerk's mistranslation, which the locals have long since stopped correcting.
Settled by deserters from a long war :: Deserters from a long war settled {place}, and their descendants still dislike drums and uniforms.
Site of the first treaty ever broken :: The first treaty ever broken was signed in {place}, a fact its people mention with odd pride.
Grew around a single well :: Everything in {place} grew outward from a single well, which is still where people meet.
Abandoned and resettled three times :: Three times {place} has been abandoned and three times resettled, each wave building on the last one's foundations.
Birthplace of a banned philosophy :: A philosophy later banned across the land was first taught in {place}, and is still discussed there in low voices.
Built atop an older, stranger place :: Beneath {place} lie the walls of something older and stranger, which builders keep breaking into by accident.
Gifted to a hero who never arrived :: Long ago {place} was promised to a hero who never came to claim it, and the deed has been kept ready ever since.
Scarred by a great fire :: A great fire once swept {place}, and blackened stone still shows under the newer work.
Founded by a guild of mapmakers :: A guild of mapmakers founded {place}, which is why every lane is straight and every corner numbered.
Once a place of exile :: People were once sent to {place} as a punishment, and those who stayed made a point of thriving.
Where a famous duel ended in friendship :: A famous duel fought in {place} ended with the two opponents sharing a meal, and the day is still kept as a holiday.
Flooded on purpose long ago :: Long ago {place} was flooded on purpose to stop an advancing army, and the high-water mark is still pointed out.
Hiding place of a deposed ruler :: A deposed ruler once hid in {place} for years, sheltered by people who never asked for a reward.
Planted by one devoted gardener :: Every old tree in {place} was planted by one devoted gardener, whose name the children learn before their own.
Scene of a legendary heist :: A legendary heist was carried out in {place}, and half the families there claim an ancestor who was in on it.
Cut off from the world for a century :: For a hundred years {place} was cut off from everywhere else, and it kept some customs the world has since lost.
Founded on a pilgrim’s vision :: A pilgrim's vision led the first settlers to {place}, though accounts differ on what exactly was seen.
Site of a miraculous harvest :: In one famous year {place} brought in a harvest so large it was called a miracle, and every year since has been measured against it.
Once ruled by children :: For a short and well-remembered time, {place} was ruled entirely by children.
Paid for with a counterfeit fortune :: The land of {place} was bought with a counterfeit fortune, and the sellers' heirs have not forgotten.
Where an invention changed everything :: An invention first tried in {place} went on to change how everyone lives, and brought the place little thanks.
Carved out by a fallen star :: A falling star struck the earth and carved out {place}, and fragments of it are kept as heirlooms.
Last refuge of a forgotten language :: A language spoken nowhere else survived longest in {place}, and a few words of it linger in the local speech.
Bought back from its conquerors :: After its conquest, the people of {place} bought their home back coin by coin.
Began as a travelling show’s winter camp :: A travelling show once wintered in {place} and never moved on, which explains the local taste for spectacle.
Home of a rebellion that succeeded :: A rebellion that began in {place} actually succeeded, and its leaders' portraits hang in every public room.
Cursed, the old stories say :: The old stories say a curse lies on {place}, though they disagree about who laid it and why.
Built to guard something :: The first builders raised {place} to guard something, and whether it is still there is a matter of debate.
Where two migrations met :: Two great migrations met in {place}, and their descendants still keep to different sides of {site|the main road}.
Emptied by plague, then reborn :: Plague once emptied {place} entirely, and those who came after rebuilt it with wider streets and more wells.
Once the richest place for a thousand miles :: There was a time when {place} outshone everywhere within a thousand miles, and the faded grandeur is still on show.
Promised to two peoples at once :: Long ago {place} was promised to two peoples at once, and both still hold the paper to prove it.
Founded by a runaway heir :: A runaway heir founded {place} to escape a throne, and titles have counted for little there ever since.
Site of a trial still argued over :: A trial held in {place} generations ago is still argued over at every table.
Shaped by generations of quarrying :: Generations of quarrying have shaped {place}, leaving terraces, pits and a great many stonecutters' graves.
Discovered by accident :: The first people to reach {place} were looking for somewhere else entirely.
Where a beloved ballad was first sung :: A ballad known in every tavern was first sung in {place}, and locals will correct anyone who gets the words wrong.
Once a royal hunting preserve :: Royalty once kept {place} as a private hunting ground, and common folk were hanged for a rabbit.
Survived a siege of seven years :: For seven years {place} held out under siege, and the recipes invented then are still eaten on the anniversary.
Left unfinished by its architects :: The architects of {place} walked away with the work half done, and no one since has dared to finish it.
Sacred to a faith no one remembers :: A faith no one now remembers held {place} sacred, and its carvings are still left carefully alone.
Raised by rival families in one season :: Two rival families raised {place} in a single season, each trying to outbuild the other.
Where a great expedition set out :: A great expedition set out from {place} with flags flying, and people there still wait for news of it.
Traded for a shipload of spice :: The whole of {place} once changed hands for a single shipload of spice.
Drained from a swamp by convicts :: Convicts drained the swamp that became {place}, and were given the worst of the land as their pay.
Named after a beloved dog :: The founders named {place} after a beloved dog, whose statue is better kept than any ruler's.
Site of a coronation gone wrong :: A coronation held in {place} went so badly wrong that no monarch has been crowned there since.
Built with stones from a rival city :: The builders of {place} carted their stone from the ruins of a rival city, inscriptions and all.
Founded by shipwrights without a sea :: Shipwrights with no sea to launch on founded {place}, and their skill went into roofs and bridges instead.
Once quarantined for a generation :: For a whole generation {place} was sealed off by quarantine, and it has been wary of closed gates ever since.
Where a peace was signed at swordpoint :: A peace was signed in {place} with a sword at one signer's throat, and it has held all the same.
Grown from a single orchard :: Everything in {place} grew from a single orchard, and its first tree is still tended near {site|the old boundary stone}.
Home of a vanished guild :: A powerful guild once had its seat in {place} and vanished in a single night, leaving its hall locked.
Founded to hide a scandal :: The founders built {place} to keep a scandal out of sight, and the details are still not discussed.
Won by a commoner in a lawsuit :: A commoner once won {place} from a noble house in open court, and lawyers have been welcome there ever since.
Twice destroyed by floods :: Floods have destroyed {place} twice, and everything rebuilt since stands on stilts or stone.
Birthplace of a famous impostor :: A famous impostor was born in {place}, and the locals remain rather proud of the deception.
Once a monastery of silent scholars :: Silent scholars once kept a monastery in {place}, and their unreadable shorthand covers the old walls.
Mapped wrongly for centuries :: For centuries every map put {place} in the wrong spot, which suited its people well enough.
Settled by followers of a comet :: The first settlers followed a comet to {place} and stopped where it seemed to hang overhead.
Site of a festival that never ended :: A festival that began in {place} long ago was never formally closed, and is in theory still going on.
Lost in a game of cards :: An old lord once lost {place} in a game of cards, and the winning hand is painted on the tavern sign.
Built by an exiled queen :: An exiled queen built {place} as a court in miniature, and her manners outlasted her line.
Where the old calendar was abandoned :: The old calendar was first abandoned in {place}, and a few households still keep the lost days.
Refuge for runaway apprentices :: Runaway apprentices found refuge in {place}, and it still asks few questions of the young.
Raised from ruins by its grandchildren :: After its ruin, the grandchildren of the people who fled returned to raise {place} again.
Once famous for a wonder now lost :: Travellers once crossed half the world to see a wonder in {place}, and nothing but descriptions of it remain.
Founded on the wrong side of a border :: The founders put {place} on the wrong side of a border by mistake, and two governments have taxed it ever since.
Chosen by lot as a capital, briefly :: By the drawing of lots, {place} once served as a capital for a single chaotic year.
Where a plague was cured :: A plague that ravaged the land was finally cured in {place}, by a remedy the locals still brew.
Built as a monument to a lie :: The oldest work in {place} was raised to honour a victory that never took place.
Reclaimed from the wild after a long absence :: After a long absence, settlers reclaimed {place} from the wild and found the old hearths still standing.
Meeting place of ancient caravans :: Ancient caravans met and traded in {place}, and their wheel ruts can still be traced near {site|the oldest well}.
Founded by a jilted bride :: A jilted bride founded {place} with her dowry, and weddings there are still held without a groom's toast.
Spared by an invading army :: An invading army marched straight past {place} and spared it, for reasons still guessed at.
Dug out in search of treasure :: Treasure hunters dug out much of {place} and found nothing, though the holes proved useful.
Home of a line of famous twins :: Generation after generation, a line of famous twins has come from {place}.
Once owned by a single family :: A single family once owned every stone of {place}, and their crest is still over half the doors.
Where a prophet was laughed out of town :: The people of {place} once laughed a prophet out of town, and have been uneasy about it ever since.
Shaped by a great landslide :: A great landslide long ago reshaped {place}, burying one half and making the other.
Founded by mutineers :: Mutineers founded {place} and wrote its first laws so that no one could ever be captain.
Once a garden for distant kings :: Distant kings once kept {place} as a pleasure garden, and exotic plants still run wild there.
Site of an unsolved disappearance :: A whole company of people once vanished from {place} between dusk and dawn, and no trace was ever found.
Built on reclaimed tideland :: The ground of {place} was won from the tide with dykes and patience, and the sea has not stopped asking for it back.
Where a long feud began :: A feud that still divides the country began in {place} over something no one can now name.
Settled by a failed crusade :: The stragglers of a failed crusade settled {place}, and kept their banners long after they forgot the cause.
Starting line of a legendary race :: A legendary race once started from {place}, and runners still come to touch the mark.
Left behind by retreating ice :: Retreating ice left {place} behind, along with boulders too large for anyone to move.
Granted as payment for a song :: A ruler once granted {place} to a minstrel as payment for a single song.
Once forbidden to outsiders :: For generations no outsider was allowed into {place}, and visitors are still watched with interest.
Where a river was moved by hand :: The people of {place} once moved a river by hand, and the old bed runs dry past {site|the edge of the fields}.
Rebuilt from memory after a fire :: After a fire took everything, {place} was rebuilt from memory, and not everyone remembered it alike.

Famous for its cheese :: The cheese of {place} is famous, pungent, and jealously guarded against imitation.
Everyone keeps bees :: Every household in {place} keeps bees, and honey passes for small change.
Ruled by a council of grandmothers :: A council of grandmothers governs {place}, and its rulings are seldom questioned twice.
Fog most mornings :: Most mornings fog lies thick over {place} and does not lift until the sun is high.
Proud of a terrible local wine :: The people of {place} are fiercely proud of a local wine that visitors find close to undrinkable.
Bells mark every hour :: Bells ring out every hour in {place}, and no one born there notices them any more.
Strangers are fed before questioned :: By custom, a stranger arriving in {place} is fed before being asked a single question.
Roads are poorly kept :: The roads of {place} are badly kept, and some suspect it is done on purpose.
Renowned boatbuilders :: The boatbuilders of {place} are renowned, and their hulls are known by sight in distant ports.
Distrusts written contracts :: Written contracts are distrusted in {place}, where a handshake before witnesses is thought more binding.
Festival of lights each winter :: Each winter {place} holds a festival of lights that can be seen from {site|the far hills}.
Overrun with cats :: Cats have the run of {place}, and it is bad luck to move one from a chair.
Debts are settled in song :: A debt in {place} can be settled with a song, provided the creditor agrees it is good enough.
Prized dyes and pigments :: The dyes and pigments of {place} are prized, and the streams run a different colour each week.
Windy year-round :: The wind over {place} never drops, and everything is built low and tied down.
Governed by lottery :: The offices of {place} are filled by lottery, and people pray not to be chosen.
Devoted to a local saint :: The people of {place} are devoted to a local saint whom no other region recognises.
Exports fine paper :: Fine paper made in {place} is sent far and wide, each sheet carrying a watermark.
Everyone wears hats of rank :: Everyone in {place} wears a hat that shows their rank, and going bareheaded causes confusion.
Famous hot peppers :: The peppers grown in {place} are famously hot, and eating one whole is a rite of passage.
Rival bakeries feud openly :: Two rival bakeries in {place} feud openly, and every household has taken a side.
Keeps meticulous records :: Meticulous records are kept in {place}, down to the weather on the day of each birth.
Unusually long-lived residents :: People in {place} live unusually long lives and give a different explanation each time they are asked.
Haunted by rumour :: Rumour clings to {place}, and travellers repeat stories that the locals neither confirm nor deny.
Celebrated storytellers :: The storytellers of {place} are celebrated, and a good one eats for free.
Markets held only at night :: The markets of {place} are held only at night, by lamplight, and close at first light.
Protective of its springs :: The springs of {place} are guarded closely, and drawing water without leave is a serious offence.
Renowned stonemasons :: Stonemasons trained in {place} are sought after everywhere, and each leaves a private mark in their work.
Welcomes wanderers :: Wanderers are welcome in {place}, where a bed is kept empty for whoever arrives next.
Obsessed with a ball game :: A ball game with baffling rules obsesses {place}, and work stops on match days.
Houses painted in bright colours :: The houses of {place} are painted in bright colours, and repainting day is a public holiday.
Taxes paid in grain :: Taxes in {place} are paid in grain, measured out before witnesses at {site|the common barn}.
Trains messenger birds :: Messenger birds trained in {place} carry letters across the whole region.
Quiet by custom after dusk :: By old custom {place} falls silent after dusk, and even quarrels wait until morning.
Famous for stargazing :: The night sky over {place} is famously clear, and stargazers come from far away to see it.
Suspicious of outsiders :: Outsiders are regarded with suspicion in {place} until someone local will vouch for them.
Skilled herbalists :: The herbalists of {place} are skilled, and people travel days for their remedies.
Ruled by an elected judge :: An elected judge rules {place}, and may be voted out at any time by a show of hands.
Known for elaborate funerals :: Funerals in {place} are elaborate affairs lasting days, planned by the deceased well in advance.
Rich in old ruins :: Old ruins lie thick around {place}, and children play among fallen columns.
Shares everything in lean years :: In lean years everything in {place} is pooled and shared, and hoarding is the one unforgivable act.
Breeds sturdy ponies :: The sturdy ponies bred in {place} are prized by anyone with rough country to cross.
Carves its history into doorframes :: Families in {place} carve their histories into their doorframes, a notch and a sign for each event.
Mild in every season :: The weather in {place} is mild in every season, which neighbours find faintly suspicious.
Thriving smuggling trade :: A thriving smuggling trade runs through {place}, and the authorities are careful not to look too closely.
Speaks a distinct dialect :: The dialect spoken in {place} is so distinct that visitors need a day to tune their ears.
Reveres its oldest tree :: The oldest tree in {place} is revered, hung with ribbons and consulted on important matters.
Known for intricate knots :: The knots tied in {place} are intricate, and each family has one that works as a signature.
Fiercely independent :: The people of {place} are fiercely independent and have sent more than one tax collector home empty-handed.
Celebrated glassblowers :: The glassblowers of {place} are celebrated, and their workshops glow late into the night.
Rains come all at once :: The year's rain falls on {place} all at once, in a few violent weeks that everyone plans around.
Home to a famous school :: A famous school in {place} draws students from far away, who fill the lodgings and the taverns.
Great lovers of riddles :: The people of {place} love riddles, and a clever one will open most doors.
Trades in salvaged goods :: Salvage is the trade of {place}, where almost everything has had a previous life.
Keeps an unbroken watch :: A watch has been kept over {place} without a break for longer than anyone can say.
Renowned for smoked fish :: The smoked fish of {place} is renowned, and the smokehouses scent the whole district.
Governed by a merchant league :: A league of merchants governs {place}, and every law has a price worked into it.
Masks worn on holy days :: On holy days everyone in {place} goes masked, and what is said behind a mask is not held against the speaker.
Abundant wild game :: Wild game is abundant around {place}, and no one there goes hungry who can set a snare.
Famous for its clocks :: The clocks made in {place} are famous, though no two of them agree.
Children are raised by the whole village :: Children in {place} are raised by everyone at once and answer to any adult in earshot.
Guards an old library :: An old library is guarded in {place}, and few are permitted past its first room.
Known for bitter winters :: Winters in {place} are bitter, and the woodpile is the measure of a household.
Music in every tavern :: There is music in every tavern in {place}, and a stranger is expected to contribute a verse.
Famous for its pickles :: The pickles of {place} are famous, and every cellar holds jars older than its owner.
Everyone can swim :: Everyone in {place} can swim, taught before they can properly walk.
Ruled by whoever is oldest :: Whoever is oldest governs {place}, which makes for short reigns and long memories.
Dust storms in spring :: Each spring, dust storms roll over {place} and turn noon to dusk.
Proud of its crooked streets :: The streets of {place} are crooked and its people are proud of them, giving directions by landmark alone.
Whistled signals carry for miles :: People in {place} speak across great distances in whistles, a language outsiders never quite learn.
Guests must tell a story :: A guest in {place} is expected to pay for supper with a story no one there has heard.
Bridges are privately owned :: Every bridge in {place} is privately owned, and each owner sets a different toll.
Renowned ropemakers :: The ropemakers of {place} are renowned, and ships wait weeks for their cable.
Suspicious of mirrors :: Mirrors are distrusted in {place}, and are kept covered or not kept at all.
Lantern boats each midsummer :: Each midsummer the people of {place} set lantern boats adrift, one for every year of their lives.
Overrun with goats :: Goats wander {place} freely, and are found on roofs, walls and anywhere else they should not be.
Disputes are settled by footrace :: Disputes in {place} are settled by a footrace, usually out to {site|the boundary stone} and back.
Prized wool :: The wool of {place} is prized, and shearing week empties every other workplace.
Mist rolls in at noon :: Mist rolls over {place} at noon each day as if on a schedule.
Offices are held for one day :: Public office in {place} is held for a single day, so everyone takes a turn and nobody grows grand.
Devoted to an ancestral hero :: The people of {place} are devoted to an ancestral hero, whose supposed descendants make up half the population.
Exports fine ink :: Ink made in {place} is sent to scribes everywhere, black as a moonless night.
Hair is braided by trade :: In {place} people braid their hair according to their trade, so a stranger's work can be read at a glance.
Famous sour bread :: The sour bread of {place} is famous, raised from a starter said to be centuries old.
Rival choirs compete fiercely :: Rival choirs in {place} compete so fiercely that the judges are brought in from elsewhere.
Forgets nothing, forgives slowly :: Nothing is forgotten in {place}, and forgiveness comes slowly when it comes at all.
Remarkably tall residents :: The people of {place} are remarkably tall, and the doorways are built to match.
Plagued by gossip :: Gossip travels through {place} faster than any messenger, and is right about half the time.
Celebrated puppeteers :: The puppeteers of {place} are celebrated, and their shows say what no one else dares to.
Shops open only at dawn :: The shops of {place} open only for the first hours after dawn, and latecomers go without.
Protective of its recipes :: Recipes in {place} are kept as closely as deeds, and passed on only at a deathbed.
Renowned bellfounders :: The bellfounders of {place} are renowned, and their bells ring in towers across the land.
Generous to beggars :: Beggars are treated generously in {place}, where turning one away is thought to invite bad luck.
Obsessed with kite fighting :: Kite fighting obsesses {place}, and the sky on a breezy day is full of duels.
Doors are never locked :: No door in {place} is ever locked, and a lock for sale would find no buyer.
Tolls paid in firewood :: Tolls in {place} are paid in firewood, stacked high beside every gate.
Trains rescue dogs :: Rescue dogs trained in {place} are sent out whenever a traveller is overdue.
Silent on one day each week :: One day each week {place} keeps complete silence, and business is done by gesture.
Famous for its echoes :: The echoes of {place} are famous, and visitors cannot resist shouting to test them.
Wary of bargains :: A bargain is viewed with suspicion in {place}, where a fair price is expected to hurt a little.
Skilled bonesetters :: The bonesetters of {place} are skilled, and the injured are carried to them from far away.
Governed by a rotating council :: A council whose seats change hands each season governs {place}, so no decision lasts long.
Known for lavish weddings :: Weddings in {place} are lavish and long, and families save for a decade to host one.
Rich in hot springs :: Hot springs rise all around {place}, and no house there needs a hearth for bathing.
Feeds its poor first :: At every public feast in {place} the poor are served first and the wealthy wait.
Breeds racing pigeons :: Racing pigeons bred in {place} fetch high prices, and race days empty the streets.
Paints its dead on walls :: The people of {place} paint portraits of their dead on the walls, so every street is lined with faces.
Sudden summer hailstorms :: Sudden summer hailstorms strike {place} without warning and are gone again within minutes.
Thriving trade in secrets :: Secrets are bought and sold in {place} like any other goods, and priced by how many already know them.
Uses its own calendar :: A calendar of its own is kept in {place}, and visitors are forever arriving on the wrong day.
Reveres a local river :: A local river is revered in {place}, greeted aloud by anyone who crosses it.
Known for fine lacework :: The lace of {place} is fine enough to pass through a ring, and patterns are handed from parent to child.
Stubbornly old-fashioned :: The people of {place} are stubbornly old-fashioned and regard anything new as a passing fad.
Celebrated tilemakers :: The tilemakers of {place} are celebrated, and every roof and floor shows off their work.
Snowbound half the year :: For half the year snow cuts {place} off, and the other half is spent preparing for it.
Home to a famous infirmary :: A famous infirmary in {place} takes in the sick from far away and turns no one out for lack of money.
Great lovers of chess :: Chess is the passion of {place}, and games are left set up in doorways for passers-by to continue.
Trades in second-hand books :: Second-hand books are the trade of {place}, stacked on every sill and stair.
Lights a beacon every night :: A beacon is lit in {place} every night without fail, for reasons that are no longer explained.
Renowned for honey cakes :: The honey cakes of {place} are renowned, and the recipe is argued over more than politics.

A caravan has arrived a season early :: Lately a caravan has reached {place} a full season early, and people wonder whether it brings warnings, refugees, or goods no one ordered.
The river has changed its course :: Now the river has changed its course near {place}, and it may strand a town, uncover ruins, or redraw a border.
An heir no one knew of has come forward :: An heir no one knew of has come forward in {place}, and may have proof, powerful backers, or simply a grudge.
The harvest is failing :: This year the harvest around {place} is failing, and people blame blight, theft, or weather out of season.
A long-sealed door has been opened :: A long-sealed door has been opened in {place}, and no one will say whether it was by accident, by decree, or from the inside.
Two old rivals have announced an alliance :: Two old rivals of {place} have announced an alliance, and marriage, shared fear, or a secret debt may lie behind it.
A stranger is buying up land :: A stranger has begun buying up land around {place}, perhaps for a patron, a prophecy, or what lies beneath it.
The great festival may be cancelled :: The great festival of {place} may be cancelled this year, over money, mourning, or an ill sign.
Something valuable has gone missing :: Something valuable has gone missing from {place}, and whether it is a relic, a ledger, or a person depends on who is asked.
A new road is being built :: A new road is being driven toward {place}, and with it will come trade, soldiers, or unwelcome attention.
The old leader is stepping down :: The old leader of {place} is stepping down, having named no successor, a surprising one, or far too many.
Animals are behaving strangely :: The animals around {place} have begun behaving strangely, fleeing, gathering, or refusing to cross some unseen line.
A message has arrived from far away :: A message has reached {place} from far away, and it reads as a summons, a plea, or an offer too good to trust.
A local custom has been outlawed :: A custom long kept in {place} has just been outlawed, by distant rulers, new converts, or a nervous council.
Miners have struck something unexpected :: Diggers near {place} have struck something unexpected, which may be a rich vein, an old tunnel, or a thing best left buried.
A popular movement is gathering crowds :: A popular movement is drawing crowds in {place}, gathered around a preacher, a grievance, or a song.
The wells are running low :: The wells of {place} are running low, and drought, diversion, or sabotage could each be to blame.
A contest has drawn rivals from afar :: A contest in {place} has drawn rivals from afar, competing for a prize, a title, or a hand in marriage.
A ship has returned without its crew :: A ship has come back to {place} without its crew, found adrift, well stocked, or carrying something new.
Neighbours are disputing a boundary :: Neighbours in {place} have fallen out over a boundary, be it a stream, a pasture, or a toll bridge.
An old prediction is coming due :: An old prediction about {place} is coming due, and it has been awaited, dreaded, or half forgotten.
Outsiders have come to study the place :: Outsiders have arrived to study {place}, calling themselves scholars or surveyors, though some say spies.
A sickness is spreading quietly :: A sickness is spreading quietly through {place}, so far among livestock, travellers, or the well-to-do.
Someone long thought dead has returned :: Someone long thought dead has walked back into {place}, and seems changed, pursued, or entirely unrepentant.
A bridge has collapsed :: A bridge on the way to {place} has collapsed, and neglect, flood, or a deliberate hand may be responsible.
A travelling court is on its way :: A travelling court is on its way to {place}, coming to judge, to tax, or to hide.
A child has been born under strange signs :: A child has been born in {place} under strange signs, and is being hailed, feared, or quietly hidden.
The mill has stopped turning :: The great wheel of {place} has stopped turning, for lack of water, workers, or will.
A rich traveller has fallen ill here :: A rich traveller has fallen ill in {place}, and has proved generous, demanding, or not who they claim to be.
The old charter has been found :: The old charter of {place} has been found, and it grants rights, records debts, or reveals an inconvenient truth.
Smoke is rising beyond the border :: Smoke is rising beyond the border of {place}, from war, wildfire, or a new settlement.
A marriage is uniting two feuding houses :: A marriage is about to unite two feuding houses of {place}, and they go to it gladly, grudgingly, or under false names.
Coins of an unknown mint are circulating :: Coins of an unknown mint have begun to circulate in {place}, and they may be forged, foreign, or very old.
The young are leaving in numbers :: The young are leaving {place} in numbers, for work, adventure, or a distant cause.
A beloved landmark is to be torn down :: A beloved landmark of {place} is to be torn down, for profit, safety, or spite.
A stranger claims to speak for the dead :: A stranger in {place} claims to speak for the dead, and may be comforting the bereaved, extorting them, or telling the truth.
The price of bread has doubled :: The price of bread in {place} has doubled, after a bad harvest, a blockade, or a hoarder's scheme.
Something is washing ashore :: Something keeps washing ashore near {place}, whether wreckage, cargo, or letters in bottles.
A long drought has broken :: A long drought over {place} has finally broken, bringing floods, celebration, or a ruined crop.
An old tunnel has been rediscovered :: An old tunnel has been rediscovered under {place}, leading to cellars, a vault, or somewhere unexpected.
The night watch has gone on strike :: The night watch of {place} has gone on strike, over pay, a death, or something they saw.
A famous artist has come to stay :: A famous artist has come to stay in {place}, seeking quiet, a subject, or sanctuary.
Rival claimants are raising banners :: Rival claimants are raising banners around {place}, over a title, an inheritance, or an insult.
The bells will not ring :: The bells of {place} will not ring, having been cracked, stolen, or silenced by decree.
A census is being taken :: A census is being taken in {place}, and people suspect it is meant for taxes, conscription, or a search.
Lights have been seen on the water :: Lights have been seen on the water near {place}, put down to smugglers, fishermen, or something unexplained.
The trade fair has drawn a record crowd :: The trade fair at {place} has drawn a record crowd, bringing wealth, thieves, or old enemies.
A grave has been found empty :: A grave in {place} has been found empty, whether robbed, mistaken, or never filled.
`

export const DESCRIPTIONS: Record<string, string> = Object.fromEntries(
  RAW.split('\n').filter((l) => l.includes(' :: ')).map((l) => {
    const i = l.indexOf(' :: ')
    return [l.slice(0, i).trim(), l.slice(i + 4).trim()]
  }),
)

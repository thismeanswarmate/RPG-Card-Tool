# Storyloom

Eleven tools on one page, switched from the top menu.

**Perils** builds a dangerous place by rolling on tables, in steps: a premise (theme, what stood there before, and the kind of place and danger), then tables for the place itself and for what makes it dangerous, with a personality for whoever is behind it when the danger can think. Roll everything at once, reroll single tables, pick results by hand and lock the ones to keep. The result is written up as a brief. Ten kinds of place and six kinds of danger, each with tables of its own.

**Settlements** builds a trading post, village, town, city, capital or fortress town the same way, in five steps: foundations, people, rule and order, places, and trouble and talk. Each kind of settlement has tables of its own for what it is known for, how many live there and one thing only that kind has. The result is written up as a brief and given a name.

**Setting** is the front door. Answer five questions — size, genre, landscape, focus and depth — and it generates one connected setting from the Worlds, Lore and Stories decks: a map of named places, the factions and other powers at work, the people who live there, and stories waiting to happen. It is built in layers so each part points at the others: a faction's sacred place is a real spot on the map and its founder is one of the people. A built-in name generator names everything in a few related "tongues"; any name can be redrawn or typed over, and the change shows wherever the thing is mentioned. The setting is drawn as an ink map on parchment (a blueprint for science fiction): each place is a region of land with its terrain's wash and symbols, sites are marked, and dotted routes join places that a faction, person or story connects. The map is made from the setting and its seed, so it always matches the text, and can be saved as an SVG. Settings are saved separately from the other tools, repeat exactly for the same seed, and export as Markdown.

A new setting starts one of two ways. **Let me build it for you** generates the whole thing from five answers, now including settlements and dangerous places rolled on the tables of those tools. **I’ll build it** starts empty and is built by hand: add a place, fill it with sites, factions, people, settlements, dangers and other things, then add the next place. Each addition is described in terms of what is already there. Either kind of setting can be edited afterwards: add, rewrite, rename, reroll or remove any part.

**Lore** grows a web of linked story elements — factions, figures, events, places, objects, materials and creatures. Each element takes a primary cue and up to four details; a detail can hold links, completed with a new cue or an element already in the web, and any link can be expanded into an element of its own. Optional Deities, Emblems and Names packs, a one-click web generator, and a written account of the whole web.

**Stories** builds story prompts from Character, Drive, Subject, Obstacle and Trait cards, in five patterns from a single story seed to two characters on a collision course. Turn a card to its next cue, lock what you like and redraw the rest. Optional Fantasy, Science fiction and Horror packs, and a Dynamics pack that adds a bond between two characters and a question to answer. Three more optional packs: **Mystery** (a genre pack), **Curios** (remarkable objects and words to describe them) and **Pasts**, which adds what once happened between the lead and someone or something else, and why it matters again now.

**Characters** builds a cast: each character draws one card for Role, Background, Motivation, Strength, Flaw, Turning point, Secret and Catalyst from a core deck plus Fantasy, Science fiction, Modern and Horror packs. Lock the cards you like, redraw the rest, add your own cards, and read the result as a written portrait.

**Worlds** is a browser tool for building story settings from cards. Draw a Terrain, tuck Sites, Epithets, Legacies, Traits and
Omens under its edges, and arrange the resulting microsettings into a world map.

- **Two tabs:** *Custom* is the hands-on table. *Auto* deals a whole world in one click: a meta row, then 5–20 microsettings (by map size) alternating simple and complex, which you can then edit like any other. Each tab keeps its own world.
- **Guided or free:** follow the six-step guide (with an optional "complex" mode that draws two and lets you keep one or both), or draw from any pile.
- **Table:** drag cards, tuck them under a Terrain or Site edge, double-click to turn a card to its next cue, pan and zoom.
- **World tools:** a sideboard of face-up cards, a world-wide meta row, discards, links between cards, and notes per microsetting.
- **Written descriptions:** every cue carries a sentence, and the cards of a microsetting are woven into prose that names the places and sites around them. Select a card to read its area, or open the chronicle for the whole world.
- **Expansions:** nine optional packs, all off until you switch them on in Decks. Three genre packs (fantasy, science fiction, horror) and three biome packs (frost, coast, desert) add more of the six basic card types. Three creative packs add new kinds of card: Quests, Questions about a place's people, and Lore with Twists. Tick Advanced to choose exactly which card types each pack contributes.
- **Decks:** an original starter deck plus your own cards, added in the deck manager.
- **Saving:** the world is kept in the browser and can be exported to or imported from a JSON file.

## Pictures

The Setting tool can make a picture of every place, power, thing and person, using [ComfyUI](https://www.comfy.org/) running on your own
computer with the Qwen Image 2.1 model. Nothing is sent anywhere else. It makes one picture at a time, sends nothing while ComfyUI has
other work in its queue, never touches jobs it did not submit, and asks ComfyUI to free its memory when a batch ends. Pictures are kept
in the browser.

- **Running the app on the same computer** (`npm run dev` or `npm run preview`): it works as is. Requests go through `/comfy`, which the
  dev server passes on to `http://127.0.0.1:8188`.
- **Opening the published site**: the page talks to `http://127.0.0.1:8188` directly, and ComfyUI turns away pages it has not been
  told to allow. In ComfyUI Desktop, open Settings → Server-Config, put the site's address (for example
  `https://thismeanswarmate.github.io`, with no path) in "Enable CORS header", and restart ComfyUI. The Pictures panel shows the exact
  address to enter. The browser may also ask for permission to reach the local network. A page opened as a file is always blocked.
- **From another device, such as a phone**: give ComfyUI a secure (`https://`) address that only your own devices can reach, for
  example through a private network tool, and enter that address in the Pictures panel. The "Enable CORS header" setting is still needed.

## Development

```
npm install
npm run dev      # local dev server
npm test         # unit tests
npm run build    # static site in dist/
```

**Decks.** Setting, Lore and Stories each have a Decks button, like the one in Worlds, for choosing what is in the mix. In Stories it lists the core deck and every pack, and with Advanced each kind of card within one. In Lore it lists the element types and the extras. In a setting it lists the decks for lands and sites, the decks for people and stories, and whether there are deities; the choice applies to whatever is added or redrawn from then on.

**Races**, **Cultures** and **History** are three more generators on one shared engine. Each aspect is drawn like a card and shown as the few options that came up: pick one, redraw for a fresh set, or lock it. A race has a build, a mark, its looks (skin, hair, eyes and features), an origin, a home, a gift and its burden, a lifespan and a reputation. A culture has what it prizes, who governs, its households, belief, a custom, a taboo, what it is known for, its dress and what divides it. A history is told in ages, each with a name, a beginning, who held sway, what was done and at what cost, an ending and what remains; ages can be added and removed. Each has a core deck and optional fantasy, science-fiction and horror decks, chosen under Decks.

**Pictures everywhere.** Every element can have a picture: in a setting, the sites, settlements and dangerous places as well as the places, powers, things and people; and in each standalone tool, whatever is on screen (a world's area, a character, a lore element in the Read view, a story, a peril, a settlement, a race, a culture, a history). Standalone pictures are prompted from the written description and use the ComfyUI address set under Pictures in a setting.

**Races, cultures and history in a setting.** A generated setting now comes with the races of its world, a culture for some of its places and its history in ages, drawn on the same cards as the standalone tools and from the setting's own genre decks. A culture belongs to a place and says which race mostly keeps it. In a hand-built setting, add a race or the history to the world and a culture to any place. Each can be edited aspect by aspect, renamed, pictured, minimised and removed like everything else, and all three are in the text export.

**Ties to race, culture and history.** Every person in a setting has a race and a culture: the culture of the place they live in where there is one, and usually the race that keeps it. A faction is founded in an age of the history and among a culture; events, objects and deities date from an age; a settlement keeps the culture of its place. These are written into the descriptions, listed under “Tied to” in both directions, can be changed while editing, and a portrait is told how the person's race looks.

**More kinds of race.** The optional Fantasy, Science fiction and Horror decks for Races now cover every aspect, drawing on familiar kinds (the tall and ageless, the tusked and green, the small and grey, the pale and hungry) alongside new ones. An optional Animal deck adds beast-folk traits. Any of them can be used alone by unticking Core under Decks, and a setting can switch the Animal deck on for its own races.

**Theme marks.** Every deck has a small mark of its own: a diamond for the core and starter decks, a star for fantasy, a ringed planet for science fiction, a skull for horror, a paw for animal, a magnifying glass for mystery, a snowflake, wave and sun for the frost, coast and desert lands, and so on. The mark is shown on every card and beside every draw, in all the tools, and next to each deck's name in the Decks dialogs, which serve as the key.

**History in every theme.** The optional Fantasy, Science fiction and Horror decks for History now cover every part of an age, from its name to what remains of it, and an Animal deck tells the past of beast-folk. Each can tell a whole history alone with Core unticked. In a setting, the history follows the setting's genres, and the Animal tick box in its Decks dialog applies to the history as well as the races.

**Emblems.** An emblem is put together from a shape, a field pattern, a border, three colours and an icon: ten shapes, twenty-five patterns, eight borders, eighteen colours and over fifty icons, in three arrangements. The Emblems tool shows a sheet of ideas, lets every part be chosen, and saves the result as an SVG. In a setting, every land, race and culture bears an emblem, made from the setting itself and suited to the country where it can be (a coast tends to an anchor or a ship). People, powers, things, settlements and cultures wear the emblems of what they belong to as badges, which lead there when clicked. While editing, an emblem can be redrawn or opened and changed part by part. On the map, each place carries its emblem above its name, with the smaller emblems of the cultures kept there beside it.

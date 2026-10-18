# Far Horizons

A local-view browser seafaring game inspired by [Uncharted Waters: New Horizons](https://en.wikipedia.org/wiki/Uncharted_Waters#Uncharted_Waters:_New_Horizons). The sailing screen and command structure now draw from the original [SNES manual](https://unchartedwatersnewhorizons.com/files/UWNH_manual.pdf) and sampled gameplay in [SNESdrunk's review](https://www.youtube.com/watch?v=nXjmZfUZjiI). The code, pixel font, and drawn graphics are original. No ROM or original game assets are required.

## Run

Use [Node.js](https://nodejs.org/) 20 or later. There are no package dependencies to install.

```sh
npm run dev
```

Open [the game](http://localhost:5173). The server listens on your computer only. Set `PORT` to select another port.

## Controls

- Arrow keys or WASD set a heading. The ship continues on that heading until you stop, turn, or encounter land. The camera follows the fleet.
- Enter or Z opens the sea or port commands. Use Up/Down and Enter to select, or click a command. Escape closes a menu.
- M opens or closes the recorded chart. Drag and scroll there to inspect your notes. The sailing view cannot pan or zoom away from the fleet.
- F opens fleet commands. R opens sailing data. P reopens the current harbor menu. Harbors open automatically when you arrive.
- Space pauses or resumes sailing. T cycles 1X, 4X, and 16X time. N turns music on or off. The controls below the screen also work with a mouse or touch.
- Click nearby open water to quick-sail to that location. Click a visible harbor or enemy ship to inspect it.

Menus, landfall, low provisions, combat, and leaving the browser tab pause time. Closing a menu leaves the voyage paused; press Space to resume.

## First passage

In Lisbon, visit Butler Marco at the Franco residence from the harbor menu. Sign a discovery contract, ask for a rumour, then ask about Olives. Palma becomes a known destination. Olives can teach Cartography and buy reports of your newly charted waters. See [port specialists and reporting](SPECIALISTS.md) for the full roster and rules.

In Lisbon's harbor menu, visit the market and buy five units of Olive Oil. Choose **Auto sail** and select Madeira. Use T twice for 16X travel if desired. Landfall pauses the game and opens the harbor menu automatically. Enter Madeira's market and sell the Olive Oil at its higher regional price.

Use Harbor / Supply to choose 10, 25, 50, or 100 days of provisions. Food and water take cargo space. Each ten crew consume one unit of each per day, with a minimum of one unit. Water is free in port. Order ships at regional shipyards, wait for construction, then return to the ordering port to launch them. Or capture pirates by weakening them with gunfire and boarding. Provision again after expanding the fleet.

Invest separately in a port's Economy to add goods and its Industry to unlock ships and hull materials. Development costs 300 gold per point and settles at the start of the next calendar month. Each department accepts up to 50,000 gold per month, with development capped at 1,000. Capitals have fixed development. The investment window shows pending funding, the settlement date, and unlock requirements. Wait in harbor to advance the calendar.

English shipyards at Bristol and Dublin unlock the Sloop at 850 Industry, then the Frigate and Barge at 1,000. Antwerp and Hamburg unlock the Frigate and Full-rigged Ship at 1,000. Nagasaki and Sakai unlock the Steel-hulled Tekkousen at 1,000. Macau builds Junks. Ships have trading, standard, and battle fitting presets that divide capacity between cargo, crew berths, and guns. The fleet holds ten ships, including places reserved for construction orders.

The economy uses the original game's regional goods and shipyard catalog from documented fan references. See [the economy notes](economy/README.md) for sources, exact fields, save compatibility, and prototype pricing and simulation rules. Milestones still reward the first Madeira passage, an Atlantic crossing, a three-ship fleet, and arrival in India.

## Local awareness and charting

The sailing screen shows remaining supply days below the date, based on whichever runs out first: food or water at the current fleet's consumption rate. The counter turns red at ten days or fewer.

Daylight follows the fractional voyage day, with a restrained blue night tint, warm dawn and dusk, and lit harbor windows. A small phase and season indicator sits below the supplies. Lighting eases during fast travel and stays fixed while paused. Temperate foliage and ground colors shift through the calendar, with reversed seasons south of the equator and longer summer days. Tropical forests, mangroves, deserts, and permanent ice keep their regional palettes. Monthly scenery colors blend in sixteen small cached steps; ordinary frames reuse those composites within the existing 32-tile limit, and open ocean shares its tiles across seasons.

The lookout's range is eight world units, approximately 96 nautical miles. Only nearby harbors, discoveries, and enemy fleets are rendered in the sailing view. Pirate encounters require close contact. The fixed camera follows the ship rather than revealing the world around it through panning or zooming.

The chart shows recorded water and coastlines, plus known harbor positions. It never shows live enemy fleets. Known positions can be used for Auto sail without revealing distant terrain. New harbors are charted only when your fleet approaches within lookout range. Landmarks require an even closer visit.

The chosen range is a design setting for this prototype, not a claim about the original game's exact sight distance. The manual's Sea Display, View, and separate Chart Command guided the distinction between current sight and recorded geography.

## Rendering

The game draws its sea view, sprites, and bitmap text into a 512 × 384 pixel framebuffer. A WebGPU presenter uploads that frame to a texture and displays it with a WGSL shader. When no adapter is available, initialization fails, or the device is lost, it uses Canvas 2D. The console fits the browser window while keeping its 4:3 playfield. Controls and menus scale up with large displays, and CSS enlarges the same framebuffer with nearest-neighbor filtering. Append [`?renderer=canvas`](http://localhost:5173/?renderer=canvas) to force the fallback for comparison.

This is a pixel renderer with a WebGPU presentation backend. Terrain and sprite drawing still happen on the CPU. It does not yet use GPU tile batching or GPU water simulation. Command windows use HTML with a locally generated bitmap font, so they retain keyboard and screen-reader controls. There are no remote font or graphics requests.

Terrain and scenery use a bounded cache of 32 tiles, each covering 256 × 256 pixels with a 32-pixel margin for trees crossing tile boundaries. Sailing reuses these tiles as the camera scrolls, and the sight mask is drawn once. The sea renders at up to 30 FPS while sailing; at anchor, it wakes only for sprite animation changes. The paused chart repaints on input or notice expiry, menus stop background animation, and hidden tabs stop the render and simulation loops. Paused simulation checks run at four per second, with steering and other commands waking it immediately.

Coastal surf rolls from the shallows toward shore in eight steps, advancing every 300 milliseconds. Each tile caches the foam positions for all eight steps when it is built, and reuses a transparent overlay between steps. Animating the surf updates only those small water patches, without resampling terrain or regenerating scenery. The waves stay anchored to the coast as the camera moves; sailing and collision use the same geographic terrain as before.

The font is checked in at `assets/far-horizons.ttf`. To regenerate it from the shared bitmap alphabet, run the dependency-declared script with [uv](https://docs.astral.sh/uv/):

```sh
uv run scripts/build-pixel-font.py
```

## Geography

The world uses a 7,200 × 3,600 raster generated from [Natural Earth coastlines](https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-land/) and geographic city coordinates. Sailing, charts, collision, and navigation share that terrain. All 100 trading ports and 30 supply ports from the [original-game roster](https://unchartedwatersnewhorizons.com/?p=36) are playable, alongside the prototype's Azores and Cape Verde anchorages. Inland river ports use sourced river channels. Regional labels and inland cities with coastal gateways have explicit location notes in [the geography documentation](geography/README.md).

[Open the full map](http://localhost:5173/world-map.html) and choose Mediterranean or Baltic Sea to inspect the coastline and ports. The in-game chart continues to show only recorded terrain and known ports. Diagonal hatching marks unknown areas.

## Regional scenery

Coastlines have regional pixel palettes and scenery from [RESOLVE Ecoregions 2017](https://developers.google.com/earth-engine/datasets/catalog/RESOLVE_ECOREGIONS_2017): dunes and sparse scrub in deserts, rainforest canopies and palms in the tropics, rooted mangroves in coastal swamps, olive scrub on Mediterranean shores, conifers in northern forests, and tundra and ice farther north. Savannas, grasslands, and highlands have their own ground and vegetation. Scenery stays fixed to geographic positions as you sail. The recorded chart and [full map](http://localhost:5173/world-map.html) use the same regional colors.

Biomes are a visual layer; collision, supplies, and navigation continue to use the coastline mask. The modern ecoregion boundaries guide broad regional character rather than reconstructing vegetation in 1522. Attribution and rebuild instructions are in [the geography notes](geography/README.md#biomes-and-scenery).

## Music

Each sea has its own lo-fi soundtrack: dusty swung drums, warm keys, round bass, tape wobble, and vinyl crackle under a regional lead voice. Fourteen coastal regions and the open ocean each have three songs. The Iberian Atlantic uses Phrygian nylon guitar, the Mediterranean dorian mandolin, the Red Sea and Arabian Sea an oud-like pluck in a Hijaz mode over the maqsum rhythm, Malabar a sitar-like lead over a tanpura drone, the Spice Islands pelog gamelan bells, the East China Sea koto in the in scale, and the Caribbean steel pan. Songs crossfade a few seconds after you cross into new waters. In harbor, the mix darkens and the drums fall back, as if heard from a tavern.

The first time you hear a song, it is added to the Songbook (Expedition reports or Voyage / Songbook), where you can replay any song you have found. Press N to turn music on or off; set the volume under Voyage. The music preference is stored per browser, while the songbook travels with the save.

All music is synthesized in the browser with the [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) from seeded, deterministic scores in `music-score.js`; there are no audio files. Scales are twelve-tone approximations of regional modes chosen for character, not reconstructions of sixteenth-century music. Browsers only start audio after your first key press or click.

## Port specialists

Cartographers in Amsterdam, Antwerp, Barcelona, Palma, and Venice pay for unreported chart squares. Collectors in Lisbon, Pisa, Alexandria, and Bordeaux pay for landmark discoveries and provide regional rumours. Their rewards differ. Professor Juliano in Naples teaches Celestial Navigation for a 15% fleet speed bonus; Dr. Wolf in Hamburg teaches Gunnery for 25% more broadside damage. The Expedition reports ledger records your patrons, field notes, skills, and known contacts.

Each resident has an original pixel portrait and dialogue. Ask residents for introductions to learn another specialist's address and chart their port without revealing the terrain around it. All NPC roles and locations are sourced; fees, bonuses, and reporting rates are prototype rules documented in [SPECIALISTS.md](SPECIALISTS.md).

## Landmarks

Explore Giza's pyramids, Qaitbay Citadel, Leptis Magna, the Colosseum, Gibraltar, Vesuvius, Kilwa, Borobudur, Kamakura's Great Buddha, and the moai of Rapa Nui. Each has an original pixel sprite, geographic coordinates, a collector clue, and reportable field notes. Sail up the Nile from the Mediterranean to find Giza. Click a visible landmark or choose it under View to explore its approach. Inland visits represent shore parties; the game has no walking mode. Only discovered sites appear on the recorded chart. The [full-map overview](http://localhost:5173/world-map.html) lists all of them. See [landmark sources and adaptations](geography/LANDMARKS.md).

## Saves

The voyage autosaves in browser storage every four seconds and after transactions or orders. Reloading resumes paused. Enter commands, choose **Voyage / Save**, and export a JSON copy for a portable backup. Existing version 1, 2, and 3 saves migrate automatically to version 4. They retain their ships and fittings, money, cargo, supplies, milestones, and discovered ports. Version 1 and 2 port investments are refunded once. Those earlier ships keep their original prototype statistics and cannot be refitted. Generic old trade goods can still be sold. Version 1's old wide-area visibility memory is replaced with local chart records. Previously rewarded exploration is marked as already reported; new exploration and discoveries can be submitted to patrons. Contracts, lessons, unsubmitted notes, and contacts persist in version 4 saves.

## Validation and scope

```sh
npm test
```

The tests cover all harbor-to-harbor routes, land avoidance, supplies, trade, fleet growth, monthly port development, regional ship unlocks, construction, refits, capture, combat, local sightings, manual steering, specialist contracts, report payments, lessons, regional music and songbook saves, and save migration. Browser verification covers WebGPU and forced Canvas rendering, market fill-hold purchases, monthly investment settlement, advanced ship construction and launch, refits, supply selection, specialist contracts, report payments, skill training, and responsive menus.

The current sandbox has 132 ports, 11 named specialists, seventeen discoveries including eleven real landmarks, a catalog of 25 original ship types, and four pirate fleets. All 46 original commodities and all 25 ship blueprints can be reached through port development. Coastlines use rasterized geographic data; prices and unlock requirements use fan reference tables. Taxes, fluctuating market indices, cannon equipment, figureheads, and the original sailing physics are not implemented. The original game's walkable towns, character stories, diplomacy, crew job allocation, and tactical battle map are not implemented. Harbor activity uses command menus and combat remains a simplified round-based system.

## Reference points

- [SNES manual](https://unchartedwatersnewhorizons.com/files/UWNH_manual.pdf), printed pages 28–31: recorded chart, port display, harbor commands, and investment.
- The same manual, printed pages 48–52: local sea display, separate fleet and sail data, View, Auto Sail, Go Ashore, and Quick Sail.
- [Review at 2:23](https://www.youtube.com/watch?v=nXjmZfUZjiI&t=143s): command icons overlaying the playfield.
- [Review at 4:04](https://www.youtube.com/watch?v=nXjmZfUZjiI&t=244s): blue-water sailing, terrain palette, small ship sprites, and minimal persistent interface.
- [Review at 4:30](https://www.youtube.com/watch?v=nXjmZfUZjiI&t=270s): fleet information presented separately.

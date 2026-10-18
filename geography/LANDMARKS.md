# Landmarks

Ten real landmarks supplement the six original prototype discoveries. [landmarks.json](landmarks.json) stores approximate geographic coordinates, history references, original field notes, collector clues, base rewards, and sprite choices. The world builder preserves each coordinate and chooses the nearest ocean-connected water cell as its approach. It writes the playable catalog to [world-landmarks.js](../assets/world-landmarks.js).

| Landmark | Location | Historical reference |
| --- | --- | --- |
| Pyramids of Giza | 31.1342° E, 29.9792° N | [Egyptian Ministry of Tourism and Antiquities](https://egymonuments.gov.eg/monuments/the-great-pyramid/) |
| Citadel of Qaitbay | 29.8855° E, 31.2138° N | [Egyptian Ministry of Tourism and Antiquities](https://egymonuments.gov.eg/en/monuments/qaitbay-fort/) |
| Leptis Magna | 14.2931° E, 32.6383° N | [UNESCO](https://whc.unesco.org/en/list/183/) |
| Colosseum | 12.4922° E, 41.8902° N | [Parco archeologico del Colosseo](https://colosseo.it/en/area/the-colosseum/) |
| Rock of Gibraltar | 5.3500° W, 36.1333° N | [Gibraltar National Museum](https://www.gibmuseum.gi/) |
| Mount Vesuvius | 14.4260° E, 40.8210° N | [Vesuvius National Park](https://www.parconazionaledelvesuvio.it/en/) |
| Kilwa Kisiwani | 39.5230° E, 8.9570° S | [UNESCO](https://whc.unesco.org/en/list/144/) |
| Borobudur | 110.2036° E, 7.6078° S | [UNESCO](https://whc.unesco.org/en/list/592/) |
| Great Buddha of Kamakura | 139.5358° E, 35.3167° N | [Kotoku-in](https://www.kotoku-in.jp/en/about.html) |
| Moai of Rapa Nui | 109.2770° W, 27.1260° S | [UNESCO](https://whc.unesco.org/en/list/715/) |

These are original pixel interpretations of places that existed in 1522. Qaitbay replaces the long-lost Pharos lighthouse; Kamakura's Buddha stands outdoors, and Kilwa is a trading settlement rather than only an abandoned ruin. Borobudur has vegetation, Vesuvius has no perpetual eruption, the Colosseum has broken walls, and the moai group does not reproduce the modern restoration at Ahu Tongariki. Exact monument dimensions and historical appearances are abstracted at this game scale. The coordinate identifies a representative point, not the full extent of a complex. Sprite footprints are exaggerated for recognition. Giza's artwork shifts thirty screen pixels west so it does not cover the Nile; navigation, discovery and chart coordinates stay geographic.

The Nile, Rosetta Branch and Damietta Branch are rasterized from the same [Natural Earth river data](https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-rivers-lake-centerlines/) as the existing river harbors. Three-cell widths keep the branches connected. Both Mediterranean-to-Giza travel and the return passage are tested. The original roster's Cairo trading port keeps its documented Suez gateway; the Giza discovery is on the actual Nile. The modern Suez Canal remains closed.

Landmark sprites appear only inside the local lookout radius. Click a sprite or select it under View to inspect it and sail to its approach. Close approaches record observations, award ten renown, and leave the gold reward for a collector. For inland monuments such as Borobudur and the Colosseum, the approach represents anchoring and sending a shore party. The game has no separate walking simulation. Recorded charts mark only discoveries already found. The separate full-world overview reveals all locations and includes them in its selector.

Field notes, collector reports and rumours use the existing expedition save fields. New IDs extend the catalog without changing old IDs. Terrain revisions recalculate saved courses on import or reload. Existing cargo, ships, supplies, gold, discovery records and pending reports remain intact.

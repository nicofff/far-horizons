# Geographic data

Coastlines come from [Natural Earth 1:10m land](https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-land/), not hand-drawn continent outlines. The offline build rasterizes those polygons into a 7,200 × 3,600 land mask in an equirectangular projection. Each raster cell spans 0.05° and 0.25 game world units. Natural Earth data is [public domain](https://www.naturalearthdata.com/about/terms-of-use/).

The sailing view, recorded chart, collision checks, and route planner all read the same mask. The full-map viewer uses a PNG generated from that mask. The compressed terrain module is checked in, so playing requires no external map requests or Python dependencies.

## Ports

[The reference port list](https://unchartedwatersnewhorizons.com/?p=36) is preserved in [original-ports.csv](original-ports.csv). It contains 100 trading ports and 30 supply ports. Its latitude and longitude columns are coordinates in the original game's stylized map; they are not used to place cities on the geographic raster. The list is a fan reference, not a verified extraction from a ROM.

All 100 trading ports and all 30 supply ports in that reference roster are implemented, plus the prototype's Azores and Cape Verde supply anchorages, for 132 playable destinations. Each original roster name appears exactly once. Existing IDs remain stable: San Jorge is represented by Elmina, Macao by Macau, and Cape Town by Cape of Good Hope. Markets and shipyard development use the [sourced economy catalog](../economy/README.md).

[ports.json](ports.json) records each selected place and any name or coordinate override. Most city positions come from [Natural Earth populated places](https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-populated-places/). Small places absent from that gazetteer have explicit coordinates and individual source links. Island groups use a named harbor, such as Funchal for Madeira and Ponta Delgada for the Azores. Goa uses Panaji, Pernambuco uses Recife, Danzig uses Gdansk, and Copenhagen uses Kobenhavn. Historical labels remain visible in the game.

For each city, the generator chooses the nearest raster water cell connected to the ocean as its anchorage, then the nearest land cell for its town sprite. These positions are separate from the source city coordinates. London uses the north bank. Amsterdam's sprite uses an explicit offset from its anchorage to stand beside the waterfront; its sourced city coordinates and sailing destination stay unchanged. This preserves a land-based town and a reachable harbor without moving the entire coastline to accommodate a port. In the local sailing view, each port name sits beneath its town sprite.

## Narrow passages

The [Natural Earth river layer](https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-rivers-lake-centerlines/) supplies the Thames, Guadalquivir, Elbe, Scheldt, Garonne, Loire, Danube and delta branches, Niger, Shatt al-Arab, Red, Wei, Yellow, and Nile with its Rosetta and Damietta branches. Existing river harbors retain two-cell channels; the added rivers use three-cell channels so steep bends stay connected through shared water edges. Where the river layer ends upstream of the tidal estuary in the land layer, the generator connects its endpoint closest to the ocean to the nearest ocean cell. These short connections and minimum widths are gameplay accommodations.

The Dardanelles, Bosporus, Strait of Messina, Danish straits, Stockholm archipelago, Kerch Strait, Oslofjord, Narvik fjords, and Juneau approaches are sampled at sixteen times the output resolution before reduction. Any water in a fine cell is retained in the corresponding game cell. Modern Suez, Panama, and Kiel canals remain closed. Tests check narrow passages, manual and automatic sailing, geographic city placement, and every playable harbor-to-harbor route.

Western Japan and the Tsugaru Strait also use sixteen-times sampling. The western window preserves Kanmon, Bungo, Akashi, Naruto, Kitan, and the Seto Inland Sea channels. Fine source water opens cells that the coarse raster had filled, while existing water stays open. Honshu, Hokkaido, Kyushu, Shikoku, and Awaji remain separate even when diagonal land contacts are counted. Reopening Osaka Bay places Sakai's ocean-connected anchorage beside the town instead of outside the blocked bay. Saved harbor positions and active courses update through terrain revision 5.

The island relationships follow [Japan's national parks guide to the Seto Inland Sea](https://www.japan.travel/national-parks/parks/setonaikai/explore/), the [official Awaji guide](https://www.japan.travel/en/destinations/kansai/hyogo/awaji-island/), and the [Naruto Strait description](https://www.japan.travel/en/japans-local-treasures/naruto-strait-whirlpools/). Tests check short strait crossings, manual steering, and closed water loops around each of the five islands. Each loop must enclose its intended island and exclude the other four. Every Japanese harbor is tested to and from every playable harbor.

Sunda Strait uses the same sixteen-times source sampling, opening the passage between Sumatra and Java while preserving existing water. The Java Sea–Indian Ocean route passes through the strait instead of detouring around Java. Tests cover both travel directions, manual steering through the narrows, separate land components for Sumatra and Java, and recalculation of saved courses through the newly opened water. Port locations remain unchanged.

The northern Gulf of Riga route follows the Hari and Suur straits through the Väinameri, with Soela and Voosi providing the other approaches. These connections are described in [H. Mardiste's study of Väinameri strait currents](https://dspace.ut.ee/server/api/core/bitstreams/c04b497a-48e0-4cae-acae-6a6691b0c416/content), printed page 67. The builder finds water-only paths in the sixteen-times Natural Earth coastline and gives them three-cell clearance at game scale. Only the corridors are opened, preserving the islands, including small Vormsi. Tests cover manual and automatic crossings in both directions, island separation from the mainland, and saved-route recalculation under terrain revision 7.

The southern Malacca and Singapore passages use a different treatment to preserve the larger islands. The builder finds water-only routes through the sixteen-times-resolution Natural Earth coastline between approach points, including a southern waypoint for Singapore Strait and a north–south route west of Batam through the Durian approach. It draws those routes with a three-cell water stroke into the regular collision mask. Only the corridor edges change; island coasts elsewhere retain their original raster. This is a gameplay width adjustment rather than a hydrographic shipping chart. [manifest.json](manifest.json) records the approach points and stroke widths.

The Paraná and lower Iguazú use a connected route extracted from [HydroRIVERS v1.0](https://www.hydrosheds.org/products/hydrorivers), developed by WWF and McGill University. [parana-iguazu.geojson](parana-iguazu.geojson) retains 436 linked river reaches and 1,576 source vertices, starting below Iguazú Falls and following `NEXT_DOWN` links to the Paraná delta. It includes the short Río de la Plata estuary connection needed to meet the Natural Earth coastline. The three-cell channel follows that geometry and stops below the cataracts; modern dams and reservoirs are not added. Widths and unrestricted fleet passage through river rapids are gameplay abstractions. [UNESCO describes the Iguazú–Paraná connection](https://whc.unesco.org/en/list/303/). The builder opens only the traced river corridor, preserves existing water and port positions, and records the route checksum in [manifest.json](manifest.json). Terrain revision 8 refreshes saved routes without changing cargo, fleet, supplies, or prior discoveries.

HydroRIVERS attribution: Lehner, B., Grill G. (2013), “Global river hydrography and network routing: baseline data and new approaches to study the world’s large river systems,” Hydrological Processes, 27(15), 2171–2186. See the [data terms and license references](https://www.hydrosheds.org/products/hydrorivers). To regenerate the checked-in river extract, run `uv run scripts/extract-parana.py`; it downloads the South America archive into `tmp/geography/` and verifies its SHA-256 before following the source network. Normal world rebuilds use the checked-in extract.

The route planner subdivides coastal areas to individual terrain cells while using larger water rectangles offshore. Adjacent rectangles connect through their shared water edges. Segment checks traverse every crossed raster cell, including diagonal corners, so smoothing a route cannot cut across land.

## Rebuild

From the project root:

```sh
uv run scripts/build-world.py
uv run scripts/build-biomes.py
npm test
```

The script declares its dependencies using PEP 723 and uses an isolated environment managed by [uv](https://docs.astral.sh/uv/). It caches downloaded ZIPs under `tmp/geography/` and writes `assets/world-terrain.js`, `assets/world-ports.js`, `assets/world-landmarks.js`, `assets/world-map.png`, and [manifest.json](manifest.json). The manifest records source URLs, archive SHA-256 hashes, projection, resolution, river windows, and strait sampling windows. A rebuild checks source archives against those hashes.

Old saves keep their ships, gold, cargo, provisions, visited ports, and recorded cells. Docked fleets move to the corrected anchorage. Fleets that would be on land move to the nearest water cell. Existing courses are recalculated against the new terrain, and the restored game pauses for inspection.

## Regional labels and coastal gateways

Most labels use the named city directly. These entries need an explicit interpretation when moving from the original stylized world to real geographic coastlines. The chosen place supplies the coordinate. Placement explanations stay in this document and the source metadata; port menus and the full-map inspector show in-world descriptions.

| Game label | Geographic place | Placement note |
| --- | --- | --- |
| Hekla | Reykjavik | The Iceland supply label uses Reykjavik as a regional anchorage, not the inland volcano. |
| Nicosia | Kyrenia | Nicosia is inland. The game uses its nearby maritime gateway at Kyrenia. |
| Mecca | Jeddah | Mecca is served by its historical Red Sea gateway at Jeddah. |
| Cairo | Suez | Cairo is represented by Suez, preserving the original Red Sea approach without opening a canal. |
| Hormuz | Bandar-e-Abbas | The original label uses the Bandar Abbas harbor region. |
| Shiraz | Bandar Lengeh | The reference roster identifies this label with Bandar Lengeh, not inland Shiraz. |
| Diu | Diu | Diu uses the named Indian harbor rather than the fan list's Karachi identification. |
| Ceylon | Colombo | The island label uses Colombo as its harbor. |
| Pasei | Singkil | The reference roster identifies this port with Singkil. |
| Bankao | Pangkalpinang | Bankao is represented by Pangkalpinang on Bangka. This is a regional interpretation of the original label. |
| Zeiton | Quanzhou | Zeiton uses Quanzhou, the historical Zayton port, rather than the fan list's Fuzhou identification. |
| Forel | Timmiarmiut | The eastern Greenland supply label uses Timmiarmiut as a regional anchorage. |
| Naalehu | Naalehu | The supply label uses Naalehu on Hawaii, rather than the fan list's Honolulu identification. |
| Guatemala | San Jose | The inland country/city label uses Puerto San Jose on the Pacific coast. |
| Porto Velho | Colon | The reference roster identifies this label with Colon on the Caribbean side of Panama. |

[UNESCO documents Jeddah as Mecca's historical maritime gateway](https://whc.unesco.org/en/list/1361/). [The reference roster](https://unchartedwatersnewhorizons.com/?p=36) supplies the Bandar Lengeh, Singkil, and Colon aliases. Bankao's Bangka placement and the Iceland and Greenland supply anchorages are regional interpretations, recorded explicitly rather than claimed as verified original harbor identities. Changan uses Xian and the Wei/Yellow river route; Timbuktu uses the Niger, and Belgrade uses the Danube.

## Biomes and scenery

Regional character comes from [RESOLVE Ecoregions 2017, Dinerstein et al.](https://developers.google.com/earth-engine/datasets/catalog/RESOLVE_ECOREGIONS_2017), distributed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). The [source archive](https://storage.googleapis.com/teow2016/Ecoregions2017.zip) is rasterized offline at 3,600 × 1,800 cells, or 0.1° per cell. The fourteen source biome classes retain their numbers; Rock and Ice is represented as class 15. Small gaps between ecoregion and coastline datasets inherit the nearest source ecoregion. The land mask remains authoritative.

[biomes.json](biomes.json) defines original pixel palettes and scenery choices. [build-biomes.py](../scripts/build-biomes.py) generates the compressed [biome module](../assets/world-biomes.js), the colored [overview image](../assets/world-biomes.png), and [biomes-manifest.json](biomes-manifest.json). The manifest pins the archive checksum and the navigation terrain used to generate the image. Run the biome builder after changing the navigation terrain.

The sailing renderer adds deterministic dune ridges, rocks, palms, broadleaf canopies, mangrove roots, olive scrub, acacias, conifers, grasses, reeds, tundra vegetation, and ice details. Scenery follows world coordinates and is culled away from narrow water channels. The recorded chart applies biome colors only to recorded cells; the overview shows the complete biome map. Playing makes no requests to the source provider.

These colors and sprites are artistic adaptations. Ecoregions describe broad ecosystems, and their modern boundaries are not a vegetation survey of the year 1522. They preserve local distinctions such as mangroves and swamp forest in the Niger delta, savanna farther inland, and Mediterranean scrub along parts of the North African shore before the desert begins.

## Landmarks

Twelve real landmarks have original pixel sprites and collector reports. Their geographic placement, history sources, Nile approach, exploration rules, and save compatibility are documented in [LANDMARKS.md](LANDMARKS.md).

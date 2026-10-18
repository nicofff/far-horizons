# Wind and sailing

Prevailing winds use the monthly 10 m eastward and northward wind normals from [NCEP/NCAR Reanalysis 1, NOAA Physical Sciences Laboratory](https://psl.noaa.gov/data/gridded/data.ncep.reanalysis.html), averaged over 1991–2020. [build-winds.py](../scripts/build-winds.py) reads the Gaussian latitude grid, wraps longitude, resamples both vector components to 2.5°, and quantizes them to 0.25 m/s. The checked-in [world-winds.js](../assets/world-winds.js) contains twelve monthly fields in about 337 KB of Base64 text. Playing makes no external weather requests. [winds-manifest.json](winds-manifest.json) pins both downloads and the generated asset by SHA-256 and records the source registration and adaptations.

Data acknowledgement: NCEP/NCAR Reanalysis 1 data provided by NOAA PSL, Boulder, Colorado, USA, from [their website](https://psl.noaa.gov). These modern monthly normals guide broad wind patterns; they do not reconstruct weather in 1522. Monthly vector means also smooth away individual storms, gusts, and local coastal effects.

The patterns include westward tropical trade winds, eastward midlatitude westerlies, and the seasonal reversal of the northern Indian Ocean monsoon. See [NOAA's trade-wind explanation](https://scijinks.gov/about/k-12-education/atmosphere/what-are-trade-winds), [NOAA's Roaring Forties description](https://oceanservice.noaa.gov/facts/roaring-forties.html), and the [Met Office explanation of monsoons](https://www.metoffice.gov.uk/blog/2025/met-office-explains-what-are-monsoons). Local winds interpolate bilinearly between geographic samples and linearly between monthly midpoints, including December–January and longitude boundaries.

## Weather variation

The game adds smooth seeded changes to direction and strength, with a small variable breeze even where the mean vector is weak. Weather cells span 12° and three voyage days, with smooth interpolation between cells. Strong prevailing winds usually retain their broad direction; light winds can wander more. Weather follows position, calendar time, and an immutable `weatherSeed`. It never draws from the mutable event/combat random stream, rerolls on a rendered frame, or advances while the voyage clock is paused. Reloading, opening a menu, and changing between 1X, 4X, and 16X preserve the same field.

This variation is synthetic weather, not a historical forecast. The existing squall event remains separate; wind strength does not add a new damage or storm system.

## Sailing response

The slowest fleet member still determines base speed. Morale and Celestial Navigation retain their existing modifiers. Wind then changes progress according to its strength and alignment with the current leg or manual heading. With a strong following wind, the fleet can reach 140% of base speed; directly opposing winds reduce it to 45%. Light-air progress bottoms out at 55%. These bounds are gameplay settings. They abstract sail handling and tacking rather than modeling a particular hull's measured polar diagram.

The selected heading remains authoritative. Wind changes speed without pushing the fleet sideways into land. Each bend of an automatic course recalculates speed and spends the remaining simulation time on that leg, so a following-wind speed cannot carry over into a headwind leg. Supplies continue to be consumed per voyage day, making a slow passage more expensive in provisions.

## Courses, estimates, and display

For passages at least 60 world units long, Auto sail weights the existing navigation graph by prevailing-wind travel cost. Its A* heuristic uses the maximum possible wind bonus as a lower bound, and route smoothing preserves favorable detours as well as land clearance. Costs integrate wind along longer segments. Short local courses keep the existing precise coastal routing. Both use the same actual wind response when sailed. No route construction changes the collision mask or opens a canal.

Planning uses departure-season normals. Passage estimates integrate normal winds and the changing calendar along the chosen course. They deliberately omit the synthetic future weather, which can make the actual passage shorter or longer. No route or estimate is recomputed every animation frame. The Sail data menu computes the remaining estimate when opened.

The sailing gauge names the direction the wind comes **from**. Its arrow points **downwind**. When a heading is selected, the gauge shows light, fair, cross, or head wind and the resulting percentage of base fleet speed. Sail data also shows wind strength, current speed, and the estimated passage remaining. Muted arrows on the recorded chart show seasonal normals over recorded water only. They reveal no new coastline or distant fleets, and the chart retains its idle rendering behavior.

Old version 4 saves remain valid. On their first load, they receive a stable weather seed and wind revision, and any active course is recalculated with the prevailing-wind costs. Ships, cargo, supplies, gold, discoveries, and specialist progress are retained. Existing wind-era saves keep their seed and course when reloaded. The old numeric `wind` field remains for save compatibility but no longer supplies the speed modifier.

## Rebuild and checks

The [full world overview](../world-map.html) uses the same prevailing sampler at each month's midpoint, without synthetic weather. Its month selector and one-second yearly playback show seasonal changes; adaptive ocean arrows point downwind, with length and color indicating knots. Click the sea or select a location to compare all twelve months, January and July directions, and the annual strength range. The Indian Ocean preset starts at an Arabian Sea probe where the monsoon reverses. Hemisphere season labels use meteorological seasons. These are geographic planning aids, independent of the active voyage date and save. The map redraws only on interaction, resizing, or a playback month change, and stops playback when hidden.

Run `uv run scripts/build-winds.py` to regenerate the wind asset with its dependency-declared isolated environment. Cached source files live under `tmp/winds/`. A changed source checksum stops the rebuild.

The wind tests cover sourced circulation and monsoon direction, weather continuity, reproducible save roundtrips, independence from combat randomness, bounded sailing speeds, directional passage times and provision costs, optimized Atlantic routes, and migration of active voyages. Strait tests calculate manual crossing time from the current wind-adjusted speed instead of assuming every heading has the same fixed speed. Geometry and clearance assertions remain in place.

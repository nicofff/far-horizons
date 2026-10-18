# Economy and shipyard data

[catalog.json](catalog.json) is the curated data snapshot used by the game. [build-economy.mjs](../scripts/build-economy.mjs) validates it and generates the compact browser module at [assets/economy-catalog.js](../assets/economy-catalog.js). Playing requires no requests to reference sites.

## Sources

- [FatRatKnight's Market/Shipyard FAQ, version 1.16](https://gamefaqs.gamespot.com/snes/588823-new-horizons/faqs/62703), also [mirrored on Neoseeker](https://www.neoseeker.com/uncharted-waters-new-horizons/faqs/1975155-new-horizons-market.html), supplies regional market lists, purchase prices, Economy requirements, shipyard groups, ship statistics, Industry requirements, hull materials, and construction timing.
- [Koei Tecmo Wiki's Trading Data](https://koeitecmo.wiki/wiki/Uncharted_Waters:_New_Horizons/Trading_Data) supplies the 46-commodity regional sale-price matrix and the starting port development and specialty tables.
- The fan site's [port information archive](https://unchartedwatersnewhorizons.com/files/portsinfo.zip), linked from its [downloads page](https://unchartedwatersnewhorizons.com/?page_id=48), provides 100 individual trading-port records for comparison. Its recorded transaction prices can include market conditions and tax, so they are not treated as the base-price table.

These are community references, not an extraction from the SNES ROM. [original-ports.json](original-ports.json) records all 100 trading-port rows from FatRatKnight's newer FAQ, including the internal index, starting Economy and Industry, specialty base price and threshold, market group, and shipyard group. All playable trading ports match that snapshot. It takes precedence over conflicting older wiki values. Prices are integer base values; transaction prices in the original game also depend on tax and market conditions.

## What the catalog records

| Field | Meaning |
| --- | --- |
| `goods` | The original 46 commodity names and sale prices for 13 regions. Six sale-only prototype goods preserve old saves. |
| `markets` | Regional goods, base purchase prices, and the local Economy needed to buy them. |
| `ports` | Starting Economy and Industry, separate market and shipyard groups, specialty, specialty threshold and price, capital status, or supply-only status. |
| `ships` | All 25 original ship blueprints: price, Industry requirement, shipyard groups, base hull, capacity, minimum and maximum crew, gun limit, tacking, power, wind class, and oars. |
| `materials` | Teak, Cedar, Beech, Oak, Copper, and Steel, with development requirements and durability multipliers. Steel is exclusive to the Tekkousen. |

All 100 original trading ports and 30 original supply ports are playable. The Azores and Cape Verde remain additional supply anchorages. All 46 original commodities and all 25 ship blueprints are obtainable through this roster and local development. The full table also corrects Goa, Calicut, and Malacca to shipyard group G. Arabian, Indian, and Southeast Asian group G ports can unlock the Dhow at 300 Industry and Xebec at 500.

Copenhagen sells Glassware and Riga sells Wood immediately. Lubeck unlocks Silver at 500 Economy and Stockholm unlocks Copper Ore at 500 Economy; Danzig has the Northern European regional market without a specialty. All five Baltic ports use shipyard group D, including La Reale at 600 Industry.

| Shipyard | Progression |
| --- | --- |
| Bristol and Dublin | Sloop at 850 Industry; Frigate and Barge at 1,000. |
| Antwerp and Hamburg | Frigate and Full-rigged Ship at 1,000 Industry. |
| Macau | Junk at 300 Industry. It starts at 490. |
| Nagasaki and Sakai | Tekkousen at 1,000 Industry, always with a Steel hull. |

London and Amsterdam share the English and Dutch shipyard groups, but their fixed capital Industry prevents them from reaching those top unlocks. Lisbon, Seville, Genoa, and Istanbul also have fixed development.

## Development and construction

Economy and Industry are separate local tracks. Investments cost 300 gold per point, accept at most 50,000 gold per department per calendar month, and settle on the first day of the next month. Fractional development points are discarded. Each track caps at 1,000. Settlement checks markets and shipyards and records newly unlocked goods and designs in the journal. Sailing and waiting in port both advance the same calendar.

Oak requires 700 Industry and Copper requires 900. Teak, Cedar, and Beech are available at ordinary yards. New construction takes `ceil(base Beech hull × (1 − Industry / 5000))` days. Payment is taken when ordering; the ship must be launched at the ordering port after its completion date. Orders reserve places in the ten-ship fleet.

## Prototype rules retained or added

The sourced catalog replaces the former global renown tiers and automatic 60-day design unlock. It does not reproduce every original-game economic or naval system.

- Transactions use the base regional prices at a fixed 100% market index without tax, bargaining, inflation, or finite port stock. Local specialties sell back for half their local base purchase price.
- The game provides three fitting presets instead of arbitrary crew and gun allocation: Standard uses minimum crew berths and maximum guns, Trading uses minimum berths and no guns, and Battle uses maximum berths and guns. Berths and guns each consume one unit of total ship capacity. New ships start with minimum crew; recruiting fills their assigned berths.
- Hull durability uses the catalog multipliers. Purchase cost scales by the same multiplier, as listed in the reference. Refits are immediate, cost 10% of the blueprint price plus any positive material-price difference, and preserve the hull's damage ratio. A refit cannot discard loaded cargo or provisions.
- Supplies use the existing food and water model. Harbor waits preserve ship stores and do not charge wages or lodging. The supply menu offers 10, 25, 50, or 100 days so ships with crowded battle fittings can provision for shorter voyages.
- Sailing speed still uses the prototype's fleet-speed formula. Tacking, wind classes, and oars are stored in the catalog but do not yet drive the original sailing physics. Combat remains simplified; cannons and figureheads are not separate equipment purchases.
- Discovery commissions, milestones, pirate rewards, and repair and recruitment prices remain prototype rules.

## Saves and validation

Version 1, 2, and 3 voyages migrate to version 4. Version 1 and 2 ships retain their old hull limits, cargo capacities, guns, crew, and speed as legacy vessels and cannot be refitted. Their old port investments are refunded once. Generic old goods remain saleable; the old `silk` cargo becomes sale-only `fine-silk` so it is not confused with the original game's raw Silk commodity. Discovered ports, chart records, milestones, gold, and supplies are retained.

```sh
node scripts/build-economy.mjs
npm test
```

Tests cover development boundaries, calendar settlement, fixed capitals, regional ship availability, hull materials, construction and collection, fitting and supply capacity, reserved fleet places, legacy cargo sales, migration refunds, and malformed save data. Geography tests check every passage between all 132 ports.

# Port specialists and expedition reports

Ports now have named residents with original pixel portraits, dialogue, and local services. Open a harbor and choose a resident under Ashore. The separate Expedition reports ledger, available in sea commands and fleet commands, keeps contracts, field notes, training, and addresses. Selecting an address visits a local resident or plots a course to their port.

## Residents

| Port | Resident | Service |
| --- | --- | --- |
| Amsterdam | Mercator | Cartography lessons and mapmaking contract |
| Antwerp | Gerard de Jode | Cartography lessons and mapmaking contract |
| Barcelona | Diogo Ribeiro | Cartography lessons and mapmaking contract |
| Palma | Olives | Cartography lessons and mapmaking contract |
| Venice | Giovanni da Verrazzano | Cartography lessons and mapmaking contract |
| Lisbon | Butler Marco, at the Franco residence | Discovery contract and rumours |
| Pisa | Joan, Duke of Modena | Discovery contract and rumours |
| Alexandria | Ranajame | Discovery contract and rumours |
| Bordeaux | Professor Mordes | Discovery contract and rumours |
| Naples | Professor Juliano | Celestial Navigation lessons |
| Hamburg | Dr. Wolf | Gunnery lessons |

Bordeaux is a new playable port. Its location comes from the same Natural Earth gazetteer as the other cities, with the Garonne river channel connected to the tidal estuary so the anchorage remains reachable. Its starting Economy is 600, Industry is 580, regional market is Northern European, shipyard group is D, and Raisins specialty unlocks at 200 Economy with a base purchase price of 32.

## Reporting loop

A new voyage begins with an introduction to Butler Marco in Lisbon. Sign his discovery contract, ask for a rumour, and ask about Olives. That introduction records Palma's position and Olives's address. It does not reveal Palma's surrounding terrain. Other residents can introduce another specialist, giving the player further destinations to investigate.

Cartography costs 800 gold to learn at any of the five studios. It enables a contract with one cartographer. New squares in the recorded chart accumulate as unsubmitted notes. Return to the contracted studio to earn 4 gold per square and one renown per eight squares. The starting horizon is excluded. The game tracks a single paid prefix of the append-only chart record, avoiding a second full copy of the explored map in saves.

A collector contract is separate, so a cartographer and collector can sponsor the same expedition. Finding a landmark now earns 10 renown and records its field notes. Gold is paid when those notes are reported to the contracted collector, together with 25 renown per discovery. The six prototype discoveries retain their base rewards, and ten [real landmarks](geography/LANDMARKS.md) add new reports and clues; Marco pays 120% of base, the Duke pays 60%, Ranajame pays 100%, and Mordes pays 150%. The quote is displayed before reporting. These multipliers are prototype balance settings, not the original game's exact reward formula.

Charts and discoveries can each be paid only once across all patrons. Changing either contract preserves unsubmitted reports. Notes collected before signing a contract remain eligible in this version. Collectors repeat an outstanding discovery clue until the discovery is found, then offer another. Asking repeatedly does not generate more journal entries, reveal map cells, or expose distant fleets.

## Lessons

| Skill | Teacher | Cost | Effect in this game |
| --- | --- | --- | --- |
| Cartography | Any cartographer | 800 gold | Enables mapmaking contracts and chart submissions |
| Celestial Navigation | Professor Juliano, Naples | 2,000 gold | Increases the entire fleet's sailing speed by 15%, including route estimates |
| Gunnery | Dr. Wolf, Hamburg | 2,500 gold | Increases broadside damage by 25% |

Training is paid once per skill, shared by the fleet, and persists through saving and loading. Existing auto-sail remains available without training. The original game's captain attribute requirements, variable teaching fees, mate skills, and training time are not reproduced. These fixed fees and effects fit the current simplified captain and battle systems.

## Save compatibility

New voyages use save version 4. Versions 1, 2, and 3 migrate automatically. Existing exploration rewards, ships, money, crew, cargo, supplies, investments, construction orders, and chart records are retained. Previously charted squares and discovered landmarks are treated as already paid, so importing or reloading cannot duplicate their old rewards. Newly explored squares and discoveries after migration become reportable. The existing version 1 and 2 investment refund and legacy ship migration still apply once.

## Sources and adaptations

- The [SNES text dump by supernova54321](https://gamefaqs.gamespot.com/snes/588823-new-horizons/faqs/23219) names the cartographers, their home ports, the two teachers, and the collectors. Its dialogue establishes Mordes's generosity and the Duke of Modena's stinginess.
- The [original manual](https://unchartedwatersnewhorizons.com/files/UWNH_manual.pdf) describes separate cartographer and collector contracts, geographical and discovery reporting, skill lessons, and collectors' rumours. Only one contract of each type can be held at once.
- [Eastpolar's walkthrough](https://gamefaqs.gamespot.com/snes/588823-new-horizons/faqs/9311) and the [character reference](https://koeitecmo.wiki/wiki/Uncharted_Waters:_New_Horizons) identify Professor Mordes in Bordeaux and Ranajame in Alexandria.
- The [Market/Shipyard FAQ](https://gamefaqs.gamespot.com/snes/588823-new-horizons/faqs/62703) and [Trading Data](https://koeitecmo.wiki/wiki/Uncharted_Waters:_New_Horizons/Trading_Data) supply Bordeaux's market and development data.

Names, home ports, and specialist roles follow those references. Portraits, dialogue, introductions between residents, landmark clues, fixed lesson fees, reporting rates, and mechanical bonuses are original adaptations. The current game retains a single renown score, rather than separate Adventure, Trade, and Piracy fame. No original portraits or ROM assets are used. Named recruitable officers, equipment shops, and full character story campaigns remain future work. The five [guild assignment types](GUILDS.md) are available independently of specialist contracts.

## Validation

```sh
npm test
```

Specialist tests check local access, introductions and fog of war, contract requirements and switching, one-time reporting, collector pricing, persistent clues, lesson effects and payment, old-save compatibility, and malformed progress data. Geography checks every harbor-to-harbor passage, including Bordeaux, and sailing through the Strait of Messina in both directions.

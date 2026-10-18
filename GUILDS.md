# Guild assignments

All 100 trading ports have a Guild / Assignments command. Supply anchorages do not. Sea commands and fleet commands open the Guild quest log, which keeps the active contract, next stop, deadline, and the latest 30 outcomes. One guild assignment can be active at a time, independently of cartographer and collector contracts.

## Jobs

| Assignment | What completes it | Fee | Renown |
| --- | --- | --- | --- |
| Deliver Letter | Deliver the sealed letter at the destination guild. | 700 | 50 |
| Buy Goods | Bring 10 units of the requested commodity to the issuing guild. A supplier is named in the orders. Existing cargo also qualifies. | 1,000 | 200 |
| Transport Goods | Purchase 15 units at the issuing port after accepting, then deliver that quantity at the destination guild. | 2,000 | 200 |
| Collect Debt | Visit the named debtor at the destination cafe, collect the sealed purse, then report at the issuing guild. | 5,000 | 300 |
| Defeat Pirates | Sink or capture the contracted ship, then report at the issuing guild. Defeating a different pirate does not satisfy the contract. | 10,000 | 300 |

Cargo jobs pay the quoted purchase allowance in addition to the fee. The allowance is fixed when the job is accepted; cheaper procurement increases the captain's profit. Delivery consumes only the requested quantity, leaving surplus aboard. Transport records purchases at its specified source and also requires enough cargo still aboard at delivery. Selling the cargo leaves the assignment unfinished until replacement goods are obtained.

Debt collections stay in a sealed purse outside the ship's spendable gold. A debtor can pay only once. Bounty ships spawn in reachable water along a nearby shipping route, remain near the reported position, and use ordinary local sightings, encounters, combat, and capture rules. Their contract bounty is paid only after reporting, while capturing the ship still adds it to the fleet under the existing fleet limit.

## Offers and deadlines

Each port offers one job of each type per calendar month. Destinations, cargo, contact names, and pirate names vary by port, month, and voyage seed. Closing a menu, reloading, completing, or abandoning an offer cannot immediately generate another copy of that offer. Other ports have their own boards. New-month boards refresh independently of an unfinished contract.

Offers use nearby trading ports reachable by the actual navigation graph, with market stocks checked against local development. The planner estimates passage time with the fleet's speed and seasonal winds. A deadline allows at least 30 days, or 1.75 times the estimated journey plus six days, rounded up. Procurement and debt collection include the return journey. This avoids offering impossible thirty-day passages across our geographic map. The weather can still change, and detours or a slower fleet can use up the margin.

Deadlines run on voyage time, including shore leave and construction waits. Pausing or viewing menus freezes them. Delivery at the deadline is accepted. After it passes, the assignment expires, its reward is lost, and renown falls by half the promised amount, capped at the captain's current renown. Abandoning has the same penalty and requires confirmation. Expired or abandoned contracts cannot pay later.

Accepting work records the relevant port positions, so the captain can set a course there. It does not reveal terrain, remote ships, or discoveries. The quest log's next-stop button follows the current objective, including returning to the issuer after collecting a debt or winning a bounty battle.

## Sources and adaptations

The [original SNES manual](https://unchartedwatersnewhorizons.com/files/UWNH_manual.pdf), under Guild / Job Assignment, lists these five job types, the one-job limit, deadlines, payment, and fame penalties for failure. The [Koei Tecmo Wiki guild tables](https://koeitecmo.wiki/wiki/Uncharted_Waters:_New_Horizons/Legend#Guild) supply introductory fees and fame, plus larger rank-dependent rewards. The [contemporary debt-collection discussion](https://gamefaqs.gamespot.com/boards/588823-new-horizons/50270773) describes finding debtors through cafe and lodge encounters.

This version uses the introductory fees. It has one shared renown score, so debt collection awards 300 renown rather than maintaining separate Adventure and Piracy fame. Royal ranks and their higher job tiers are not implemented. Cargo allowances, fixed quantities, travel-adjusted deadlines, monthly boards, immediate cafe collections, the half-renown failure penalty, and locally commissioned pirate ships are adaptations for this game. Contact names and dialogue are original. They are not claimed as an extracted roster of original quests or NPCs. Debtors do not yet move ports or flee. Treasure-map quests are not included.

## Saves and verification

Guild data is an optional addition to version 4 saves. Older voyages gain an empty ledger and retain ships, cargo, money, exploration, patrons, skills, and weather. Accepted contract terms, purchase progress, debt receipts, bounty victories, deadlines, used monthly offers, and recent history persist. Saves reject malformed job types, destinations, numeric fields, purchase progress, and bounty targets. Active bounty routes and battles are valid saved states.

`node --test tests/guild.test.js` checks all five objectives, one-time payouts, wrong-port reporting, cargo purchases and consumption, debt receipts, sinking and capturing bounty ships, actual passages, deadlines at sea and in harbor, abandonment, board refresh, save migration, malformed saves, and all 100 trading-port boards.

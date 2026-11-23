# Glint: design from first principles

## 1. What makes a simulator stick?
The simulators that made real money in 2025–26 share one shape. AppMagic's Steam data has Schedule I at $189M+, Supermarket Simulator at $45M+, PowerWash Simulator 2 at $17.8M+ and Quarantine Zone at $18.5M. On the portals, Grow a Garden-likes top the CrazyGames simulation charts.

> **A fantasy you can explain in one sentence + a tactile verb that feels good on its own + numbers that compound + a loop that removes manual work over time.**

| Ingredient | Proven by | Glint's version |
|---|---|---|
| One-sentence fantasy | "Run a supermarket", "power-wash a house" | **"Crack rocks, cut gems, get rich."** |
| Tactile, satisfying verb | PowerWash's dirt vanishing, cleanup sims | Tapping a rock until it bursts, holding the lap until the facets *meet*, rubbing a stone to mirror shine |
| Variable reward | TCG Card Shop pack openings, Grow a Garden mutations | Mystery rocks (real-world "stone gambling" is a viral livestream genre); 5 rarity tiers up to the Red Diamond |
| Buy, sell, upgrade | Every business sim | Rough market → bench → display cases → better tools, premises and staff |
| Removing manual work | "Just one more task" | Apprentices cut with *your* recipe book; a clerk sells while you're away |

## 2. The idea nobody else has: the price is real physics
Every gem-cutting game we found treats cutting as a minigame with an arbitrary score: LAPIDARY on Steam, plus the 2026 wave of announced titles (Jeweler Simulator, Gemmy Gems, RigidGems). **In Glint, a gem's value comes from actually ray-tracing light through the stone you cut.**

- Every stone is a convex polyhedron (a list of planes). The rough crystal, the stone mid-grind and the finished gem are all the same data.
- **On the GPU**, every pixel's ray refracts into the stone. It bounces by total internal reflection and Fresnel, picks up body colour (Beer–Lambert) and hits inclusions. It leaves with a per-channel refractive index, so you see real *fire* (dispersion). The 4-point star glints are bloom + Kawase streaks.
- **On the CPU**, a light-performance analyser fires ~3,000 rays from a viewer's eye across five viewing tilts, like the ASET and Ideal-Scope machines real labs use. It reports light return, fire, sparkle, windowing (light leaking out of the bottom) and extinction (dark centre).
- The constants are real: refractive index, dispersion, density and hardness for 20 species. **Quartz wants a steeper pavilion than diamond** because its critical angle is larger. Ovals show a real bow-tie, and deep cuts keep weight but go dark. Players who learn this feel the knowledge pay off in dollars.
- `tools/optics-table.mjs` searches every cut × refractive index for the optical optimum. A gem's cut grade is measured against that ceiling, so "100% brilliance" means you found the true optimum.

## 3. The loop
| Layer | Time | Dopamine source |
|---|---|---|
| Crack | 3 s | Taps, a growing crack, the shatter, a rarity-coloured reveal ring and a chime |
| Plan | 10 s | Spatial puzzle: a bigger outline means more carats, but you must dodge the inclusions you can see |
| Cut | 20 s | Turn the protractor dial and watch a live ray-traced **value** meter climb to the sweet spot. Then **hold to grind** and release in the green: "PERFECT MEET!" |
| Polish | 5 s | Rubbing turns matte facets to glass (cleanup-sim satisfaction) |
| Appraise | 5 s | The certificate prints, the value counts up with coin ticks, stamps slam: IDEAL CUT, FLAWLESS, NEW RECORD |
| Sell | ongoing | Customers walk in, browse, haggle; VIP commissions pay 2–3× |
| Grow | hours | Tools, showcase lights, décor, ads, clerk, apprentices, five premises from Market Stall to Maison Royale |
| Collect | days | 55 varieties in the Codex, Hall of Fame, 26 achievements, the Stone of the Day |

**Real decisions, not busywork:**
- *Carats vs. clarity:* move the cut away from a flaw and the gem shrinks.
- *Weight vs. brilliance:* a steeper pavilion keeps more carats (more money for diamonds) but leaks less light. The value meter makes this trade-off visible.
- *Shape vs. rough:* elongated tourmaline crystals yield far more as an Emerald or Oval cut laid along the crystal.
- *Markup vs. speed:* higher price tags earn more per sale but sell slower; haggling customers counter-offer.
- *Gamble vs. certainty:* mystery rocks are cheap and swingy; dealer rough is visible but priced fairly; auctions pit you against rival dealers.

## 4. Built-in engagement engineering
- **The first 10 seconds:** a guaranteed amethyst inside the first river rock. The first gem (worth about $1,200) plus three achievements lands in the first two minutes.
- **Coach marks** for every first-time step, and they disappear once learned.
- **Variable schedules everywhere:** rarity rolls, customer wishes, commission timing, dealer restocks every 4 minutes, a new auction lot every 7 minutes.
- **Reasons to come back:** offline clerk sales (2–12 h), apprentices keep cutting, expeditions take 5 min to 8 h, the Stone of the Day (same seed worldwide, shareable result).
- **Diegetic immersion:** a rain-streaked window at night, a brass lamp, the hum and hiss of the lap rising in pitch as you near the meet, the shop's door bell. A generative late-night lounge trio (FM piano, walking bass, brushed hats) never repeats. Nothing is a static sprite.

## 5. Balance (measured)
`node tools/sim.mjs [skill] [hours]` plays the economy headlessly. A simulated player cuts a stone every 70 s with real physics (the apprentice cutter at a given skill), buys rough, stocks cases, sells to simulated customers, hires and trains apprentices, buys upgrades and moves up the premises ladder. At skill 8 the **Corner Shop arrives at ~35 min** and the **Boutique at ~1 h 50 min**. The Grand Salon and Maison Royale are multi-session goals, and legendary varieties are the long tail.

## 6. Fair monetisation
- **Nothing is sold for real money.** Every upgrade is bought with money earned by cutting and selling.
- **Rewarded ads (optional):** a free mystery rock (3 per day) and halving an expedition's remaining time.
- **Midgame ads** only at the natural break after finishing a gem, never in the first three gems, and at least 3 minutes apart.
- No loot boxes for money: mystery rocks cost in-game money only.

# Fuseworks: design from first principles

## 1. What actually produces "one more run"?
The games that hold people for hundreds of hours share one shape:

> **A tiny input → a large, escalating, partly unpredictable output that the player feels they caused.**

- **Balatro:** one hand → a cascade of joker triggers → a number that can explode. The suspense before the reveal *is* the game.
- **Peggle:** one shot → a ricochet cascade, with notes rising as it climbs, ending in the *Extreme Fever* finale.
- **Ball x Pit** (2M sales in 2025–26): one aim → dozens of bouncing balls.
- **Slot machines and Candy Crush cascades:** one pull or swap → a chain whose length you can't fully predict.

Our previous games were "skill per second" games (shoot, drift, merge). They're fun for 5 minutes, but nothing in them *compounds*. The missing ingredient was **compounding cause and effect**: setting something up, then watching it detonate far beyond the effort.

## 2. The concept
**A fireworks chain-reaction roguelike with Balatro-style multiplier scoring.**

| Layer | Timescale | Dopamine source |
|---|---|---|
| Burst | 0.1 s | Light, boom, a rising musical note, a floating number |
| Chain | 2–6 s | Cascade suspense ("will it jump the gap?"), with the score bar filling live |
| Launch | 10 s | The **Sparks × Heat slam**, plus TARGET!, GRAND FINALE! |
| Act | ~1 min | Beat the crowd's target, then cash out |
| Bazaar | 30 s | Slot-machine choices: catalysts, packs, rerolls, blueprints |
| Run | 10–35 min | Builds that "break the game": numbers in the millions and billions |
| Days | — | Unlocking 52 catalysts, 11 shells, 6 crates, 5 heat levels, the Collection, the Daily Show and Endless |

Why fireworks: they are *literally* engineered to produce delight, they are culturally universal (no language needed), and they are the one art style that procedural code renders *better* than hand-drawn sprites: thousands of additive particles with HDR bloom, reflected in water. Zero art budget, yet a premium look.

## 3. The core rule (simple to learn, deep to master)
- Every shell has a **reach shape**: circle (Peony), long drip below (Willow), cone above (Palm), four beams (Crossette), outer ring only (Ring), flying path (Comet), "two nearest anywhere" (Spider), and more.
- Lighting one shell ignites every shell inside its reach, which ignites theirs, and so on.
- Each burst adds **Sparks** (blue) and **Heat** (red). Score = **Sparks × Heat**.
- Because Heat grows with every link, **score grows roughly with chain length squared**. Linking two islands of fireworks doesn't add a little, it multiplies. This is the percolation hook: a small improvement in reach suddenly makes the *whole sky* connect.
- **Moves** (3 per act) let you drag shells to bridge gaps. **Launches** (4 per act) are your hands.
- **Crowns** multiply Heat when they burst, so *where* they sit in the chain matters (late is better). This creates real spatial strategy.

## 4. Built-in dopamine engineering
- **The first tap is a guaranteed Grand Finale.** The tutorial sky is a heart of shells spaced to chain completely. Players see the game's best moment in the first 8 seconds (Poki: the first seconds decide everything).
- **Live score bar:** Sparks × Heat updates during the chain, so you *watch* yourself approach the target. Crossing it mid-chain triggers a slow-motion "TARGET!" with a fanfare.
- **Musical chains:** each burst plays the next note of a pentatonic scale in the music's key, so long chains become rising arpeggios (the Peggle trick).
- **The end-of-launch tally:** catalysts fire left to right one at a time (with card jiggle, a tick sound and rising pitch), then the slam: product, boom, shake.
- **Callouts:** STREAK ×n, RAINBOW!, LUCKY!, SUPERNOVA, GRAND FINALE.
- **Crowd:** silhouettes on the promenade jump and raise their arms as excitement builds. Applause is synthesized live.
- **Variable rewards:** shop rarities (Common 70% / Uncommon 25% / Rare 5% / Legendary only in Catalyst Packs), lucky shells, Loaded Dice.

## 5. Depth (so it isn't "AI slop")
- **52 catalysts** with real rule changes, not just stat lines: *Mirror Image* copies its neighbour, *Butterfly Effect* triples the starter's reach, *Supernova* re-bursts the last shell, *Glass Cannon* trades sky size for ×3, *Zen Master* rewards not moving, *Big Bang* lights the whole sky. **Order matters** (additive effects first, multipliers last), and you drag cards to reorder.
- **Shell economy:** your crate is your deck. Formulas level shell types (planet cards), rites dye, gild, twin, glass, transmute, duplicate or scrap shells (tarot cards), and blueprints are permanent run upgrades (vouchers).
- **Bosses** change the puzzle: The Gale blows reaches sideways, The Drizzle dampens shells, The Fog hides types, The Tremor shakes the sky, The Thief disables a catalyst, The Eclipse hides reaches entirely.
- **Clustered skies:** fireworks spawn in islands. Chains run wild inside an island, and Moves and long-reach shells bridge the gaps. Every sky is a small spatial puzzle.

## 6. Balance (measured, not guessed)
`tools/sim.mjs` runs the real rules headlessly with two bots:
- **Skilled bot:** best starter plus a move search. Wins **40%** on Warm, **3%** on Inferno.
- **Novice bot:** no moves, random choice among the top 4 starters. Wins **4%**, never loses on Night 1, and most runs end on Nights 3–6.

That gives the curve we want: new players feel powerful for 2 nights, then hit a wall that good builds break, with 5 heat levels and Endless for the long tail. Endless targets grow super-exponentially so a run *eventually* ends, but builds can push scores to scientific notation.

## 7. Competitive check (November 2026)
- **Boom Bloom!** (three.js forum showcase): fireworks chain puzzles with 3-star levels. No roguelike, no scoring engine, no portal presence.
- **Starfire Skies** and **Bombo Combo** (itch.io): small jam-scale projects.
- **Balatro-likes:** dozens of them, but almost all are card games. None has a *physical, spatial* chain core.
- **CrazyGames / Poki:** no fireworks roguelike on either portal.

**Fuseworks' position:** the first spatial chain-reaction roguelike on web portals, with festival visuals that sell themselves in a thumbnail.

## 8. Fair monetization
- **Nothing is for sale.** Stardust (earned by playing) buys cosmetics only: sky themes, rocket trails, heart, star, smiley or Saturn-shaped peonies.
- **Rewarded ads:** Second Wind (one extra launch, once per run, only on Night 3+ close calls, never in the Daily Show), ×2 Stardust, and +25 Stardust (3 per day).
- **Midgame ads** only between acts, at the Bazaar's Start button.
- **Daily Show:** identical seed worldwide, no revives, plus a shareable result card. This is a free virality loop.

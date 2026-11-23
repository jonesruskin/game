// STARWARD: the campaign spine. Chapters of objectives that guide the player and pay out rewards.
// kinds: build {b, lvl}, hq {lvl}, tech {id}, rate {res, n}, energy {n}
export const CHAPTERS = [
  {
    id: 'ch1', name: 'Chapter 1 · Humble Beginnings', intro: 'A patch of coastal scrubland, a borrowed budget and a dream. Build the programme that will carry humanity to the stars.',
    steps: [
      { id: 'o1', text: 'Upgrade Mission Control to level 2', kind: 'hq', lvl: 2, reward: { credits: 400, metal: 300 } },
      { id: 'o2', text: 'Build a Research Center', kind: 'build', b: 'research', lvl: 1, reward: { credits: 300, dm: 5 } },
      { id: 'o3', text: 'Research Rocketry Fundamentals', kind: 'tech', id2: 'rocketry', reward: { science: 120, credits: 400 } },
      { id: 'o4', text: 'Build a Fuel Refinery', kind: 'build', b: 'refinery', lvl: 1, reward: { fuel: 300, metal: 300 } },
      { id: 'o5', text: 'Reach 400 metal per hour', kind: 'rate', res: 'metal', n: 400, reward: { credits: 800, dm: 5 } },
      { id: 'o6', text: 'Keep the grid powered: +20 spare energy', kind: 'energy', n: 20, reward: { metal: 600, credits: 600 } },
      { id: 'o7', text: 'Build the Launch Complex', kind: 'build', b: 'launch', lvl: 1, reward: { fuel: 600, dm: 10 } },
      { id: 'o8', text: 'Research Multistage Rockets', kind: 'tech', id2: 'multistage', reward: { science: 300, credits: 1200 } },
      { id: 'o9', text: 'Build the Vehicle Assembly building', kind: 'build', b: 'vab', lvl: 1, reward: { metal: 2000, dm: 10 } },
      { id: 'o10', text: 'Upgrade Mission Control to level 4', kind: 'hq', lvl: 4, reward: { credits: 3000, metal: 2000, dm: 10 } },
      { id: 'o11', text: 'Research Orbital Mechanics', kind: 'tech', id2: 'orbital', reward: { science: 800, dm: 15 } },
    ],
  },
];
export const allSteps = () => CHAPTERS.flatMap((c) => c.steps.map((s) => ({ ...s, ch: c.id })));

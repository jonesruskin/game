// STARWARD: the campaign spine. Chapters of objectives that guide the player and pay out rewards.
// kinds: build {b, lvl}, hq {lvl}, tech {id}, rate {res, n}, energy {n}
export const CHAPTERS = [
  {
    id: 'ch1', name: 'Chapter 1 · Humble Beginnings', intro: 'A patch of coastal scrubland, a borrowed budget and a dream. Build the programme that will carry humanity to the stars.',
    steps: [
      { id: 'o1', text: 'Upgrade Mission Control to level 2', kind: 'hq', lvl: 2, reward: { credits: 500, metal: 900 } },
      { id: 'o2', text: 'Build a Research Center', kind: 'build', b: 'research', lvl: 1, reward: { credits: 600, metal: 500, dm: 5 } },
      { id: 'o3', text: 'Research Rocketry Fundamentals', kind: 'tech', id2: 'rocketry', reward: { science: 120, credits: 600, metal: 600 } },
      { id: 'o7', text: 'Build the Launch Complex', kind: 'build', b: 'launch', lvl: 1, reward: { fuel: 600, dm: 10 } },
      { id: 'p1', text: 'Assemble a Kestrel sounding rocket', kind: 'rockets', n: 1, reward: { credits: 2000, fuel: 800 } },
      { id: 'p2', text: 'Fly a suborbital test flight', kind: 'flag', flag: 'suborbital', reward: { science: 600, dm: 10 } },
      { id: 'o4', text: 'Build a Fuel Refinery', kind: 'build', b: 'refinery', lvl: 1, reward: { fuel: 400, metal: 800 } },
      { id: 'o5', text: 'Upgrade the Metal Mine to level 3', kind: 'build', b: 'mine', lvl: 3, reward: { credits: 800, dm: 5 } },
      { id: 'o6', text: 'Keep the grid powered: +10 spare energy', kind: 'energy', n: 10, reward: { metal: 600, credits: 600 } },
      { id: 'o8', text: 'Research Multistage Rockets', kind: 'tech', id2: 'multistage', reward: { science: 300, credits: 1200 } },
      { id: 'o8b', text: 'Upgrade Mission Control to level 3', kind: 'hq', lvl: 3, reward: { credits: 1500, metal: 1500 } },
      { id: 'o9', text: 'Build the Vehicle Assembly building', kind: 'build', b: 'vab', lvl: 1, reward: { metal: 2000, dm: 10 } },
      { id: 'o10', text: 'Upgrade Mission Control to level 4', kind: 'hq', lvl: 4, reward: { credits: 3000, metal: 2000, dm: 10 } },
      { id: 'o11', text: 'Research Orbital Mechanics', kind: 'tech', id2: 'orbital', reward: { science: 800, dm: 15 } },
    ],
  },
  {
    id: 'ch2', name: 'Chapter 2 · Reaching Orbit', intro: 'The world is watching. Rockets that fall are lessons; rockets that rise are history.',
    steps: [
      { id: 'p3', text: 'Research Communication Satellites', kind: 'tech', id2: 'satComms', reward: { credits: 4000, dm: 10 } },
      { id: 'p4', text: 'Put the first satellite in orbit', kind: 'flag', flag: 'firstOrbit', reward: { metal: 6000, dm: 15 } },
      { id: 'p5', text: 'Operate a Comms Satellite', kind: 'sat', sat: 'comms', reward: { credits: 8000, dm: 10 } },
      { id: 'p6', text: 'Build the Tracking Station', kind: 'build', b: 'tracking', lvl: 1, reward: { science: 2000 } },
      { id: 'p7', text: 'Build the Astronaut Academy', kind: 'build', b: 'academy', lvl: 1, reward: { credits: 10000, dm: 10 } },
      { id: 'p8', text: 'Send a crew into orbit', kind: 'flag', flag: 'crewOrbit', reward: { dm: 30, credits: 20000 } },
    ],
  },
  {
    id: 'ch3', name: 'Chapter 3 · Destination Moon', intro: 'Three days away, a quarter of a million miles. The Moon has waited four billion years for visitors.',
    steps: [
      { id: 'q1', text: 'Launch the station Core Module', kind: 'module', mod: 'core', lvl: 1, reward: { science: 10000, dm: 15 } },
      { id: 'q2', text: 'Dock a Laboratory module', kind: 'module', mod: 'lab', lvl: 1, reward: { credits: 30000 } },
      { id: 'q3', text: 'Launch the Lunar Survey Probe', kind: 'flag', flag: 'lunarProbe', reward: { science: 15000, dm: 15 } },
      { id: 'q4', text: 'Land astronauts on the Moon', kind: 'flag', flag: 'lunarLanding', reward: { dm: 50, credits: 80000 } },
      { id: 'q5', text: 'Establish the Lunar Outpost', kind: 'flag', flag: 'moonBase', reward: { dm: 50, metal: 100000 } },
      { id: 'q6', text: 'Build a He-3 Extractor on the Moon', kind: 'build', b: 'he3x', lvl: 1, reward: { he3: 400, dm: 20 } },
      { id: 'q7', text: 'Upgrade the Colony Hub to level 3', kind: 'hubLvl', lvl: 3, reward: { dm: 40, credits: 300000 } },
    ],
  },
];
export const allSteps = () => CHAPTERS.flatMap((c) => c.steps.map((s) => ({ ...s, ch: c.id })));

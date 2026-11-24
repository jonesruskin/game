// Rocket parts. Players design their own rockets: up to three stages (an engine and a tank each), strap-on boosters,
// a payload top (probe nose, fairing, crew capsule, lander) and optional landing legs. Research unlocks the parts.
// A design's lift rating D decides its class (what it can fly) and payload; parts set cost, build time and
// reliability. The five presets reproduce Starward's original rockets (Kestrel → Leviathan) exactly by class.
export interface Engine { name: string; P: number; E: number; R: number; cost: Record<string, number>; req: string; upper?: boolean; color: string; desc: string; }
export interface Tank { name: string; cap: number; cost: number; vab: number; req?: string; r: number; h: number; }
export interface Top { name: string; cost: Record<string, number>; req?: string; crew?: boolean; lander?: boolean; h: number; desc: string; }
export const ENGINES: Record<string, Engine> = {
  solid: { name: 'Solid motor', P: 1.0, E: 0.6, R: 0.86, cost: { credits: 400, metal: 330, fuel: 130 }, req: 'rocketry', color: '#e8e8e8', desc: 'Simple, cheap and punchy. Lights once and burns until empty.' },
  kerolox: { name: 'Kerolox engine', P: 1.6, E: 1.0, R: 0.89, cost: { credits: 600, metal: 650, fuel: 230 }, req: 'liquidProp', color: '#3a3f47', desc: 'Kerosene and liquid oxygen: throttleable, restartable, the workhorse of the early space age.' },
  hydrolox: { name: 'Hydrolox engine', P: 1.4, E: 1.6, R: 0.9, cost: { credits: 1300, metal: 1600, fuel: 700 }, req: 'cryo', color: '#c9d6e6', desc: 'Liquid hydrogen: the most efficient chemical rocket, superb for upper stages.' },
  methalox: { name: 'Methalox engine', P: 2.2, E: 1.3, R: 0.93, cost: { credits: 2500, metal: 3000, fuel: 1100 }, req: 'reusable', color: '#8a929c', desc: 'Full-flow methane engines: powerful, clean-burning and built to fly again and again.' },
  nuclear: { name: 'Nuclear thermal', P: 1.0, E: 3.0, R: 0.92, cost: { credits: 6000, metal: 8000, fuel: 3000 }, req: 'nuclearThermal', upper: true, color: '#d9c34a', desc: 'A reactor heats hydrogen to 2,500 °C. Upper stages only: never lit in the atmosphere.' },
};
export const TANKS: Record<string, Tank> = {
  S: { name: 'S', cap: 1, cost: 1, vab: 0, r: 0.26, h: 1.0 },
  M: { name: 'M', cap: 1.6, cost: 2.2, vab: 1, r: 0.34, h: 1.45 },
  L: { name: 'L', cap: 2.6, cost: 5, vab: 3, r: 0.44, h: 2.0 },
  XL: { name: 'XL', cap: 4.2, cost: 12, vab: 5, req: 'heavy', r: 0.56, h: 2.6 },
  XXL: { name: 'XXL', cap: 7, cost: 30, vab: 7, req: 'reusable', r: 0.7, h: 3.3 },
};
export const TOPS: Record<string, Top> = {
  probe: { name: 'Probe nose', cost: { credits: 150, metal: 100 }, h: 0.6, desc: 'A pointed nose over instruments or a small satellite.' },
  fairing: { name: 'Payload fairing', cost: { credits: 900, metal: 1100 }, req: 'orbital', h: 1.1, desc: 'A big clamshell for satellites and station modules.' },
  capsule: { name: 'Crew capsule', cost: { credits: 5000, metal: 4000, fuel: 600 }, req: 'crewed', crew: true, h: 1.0, desc: 'Seats, life support and a launch-escape tower. Needed for crewed missions.' },
  lander: { name: 'Lunar lander', cost: { credits: 22000, metal: 26000, fuel: 6000 }, req: 'lunarLanders', crew: true, lander: true, h: 1.6, desc: 'A capsule riding a legged descent stage. Needed to land people on another world.' },
};
export const STAGE_REQ = [null, 'multistage', 'orbital']; // tech for the 1st, 2nd and 3rd stage
export const BOOST_REQ: Record<number, string> = { 2: 'multistage', 4: 'heavy' };
export const CLASS_D = [0.5, 4, 10, 22, 45, 90, 180, 360];
export const CLASS_T = [0.1, 1.2, 9, 28, 120, 400, 1200, 4000];
export const CLASS_NAME = ['', 'Sounding rocket', 'Light launcher', 'Medium launcher', 'Heavy lifter', 'Super-heavy', 'Nuclear shuttle', 'Interplanetary', 'Deep-space'];
export interface Stage { eng: string; tank: string; }
export interface Design { id: string; name: string; stages: Stage[]; boost: { n: number; tank: string }; top: string; legs: boolean; color?: string; }
export interface DesignStats { D: number; cls: number; payload: number; rel: number; cost: Record<string, number>; time: number; vab: number; height: number; reqs: string[]; crew: boolean; lander: boolean; }
export function designStats(d: Design): DesignStats {
  let D = 0, rel = 1, vab = 0; const cost: Record<string, number> = {}; const add = (c: Record<string, number>, k = 1) => { for (const r in c) cost[r] = (cost[r] || 0) + c[r] * k; }; const reqs = new Set<string>();
  d.stages.forEach((st, i) => { const e = ENGINES[st.eng], t = TANKS[st.tank]; if (!e || !t) return; D += e.P * t.cap * Math.sqrt(e.E) * (i > 0 ? 1.4 : 1); rel = Math.min(rel, e.R); add(e.cost, t.cost); vab = Math.max(vab, t.vab); reqs.add(e.req); if (t.req) reqs.add(t.req); if (STAGE_REQ[i]) reqs.add(STAGE_REQ[i]!); });
  if (d.boost.n > 0) { const t = TANKS[d.boost.tank]; D += d.boost.n * 1.2 * t.cap; rel = Math.min(rel, ENGINES.solid.R + 0.06 - 0.003 * d.boost.n); add(ENGINES.solid.cost, t.cost * 0.6 * d.boost.n); vab = Math.max(vab, t.vab, 1); reqs.add(BOOST_REQ[d.boost.n] || 'multistage'); if (t.req) reqs.add(t.req); }
  rel -= 0.012 * (d.stages.length - 1); if (d.stages.length > 1) vab = Math.max(vab, 1);
  const top = TOPS[d.top] || TOPS.probe; add(top.cost); if (top.req) reqs.add(top.req);
  if (d.legs) { for (const r in cost) cost[r] *= 1.2; reqs.add('reusable'); rel += 0.01; }
  let cls = 0; for (let i = 0; i < CLASS_D.length; i++) if (D >= CLASS_D[i]) cls = i + 1;
  const payload = cls === 0 ? 0 : cls >= CLASS_D.length ? CLASS_T[CLASS_T.length - 1] * D / CLASS_D[CLASS_D.length - 1] : CLASS_T[cls - 1] * Math.pow(CLASS_T[cls] / CLASS_T[cls - 1], (D - CLASS_D[cls - 1]) / (CLASS_D[cls] - CLASS_D[cls - 1]));
  for (const r in cost) cost[r] = Math.round(cost[r] / 10) * 10;
  const time = Math.round(120 * Math.pow(Math.max(0.7, D), 1.6) * (top.crew ? 1.3 : 1));
  const height = d.stages.reduce((a, st) => a + (TANKS[st.tank]?.h || 1), 0) + top.h + 0.3;
  return { D, cls, payload, rel: Math.max(0.05, Math.min(0.99, rel)), cost, time, vab, height, reqs: [...reqs], crew: !!top.crew, lander: !!top.lander };
}
// starting designs, unlocked as their parts are researched (players copy and edit them)
export const PRESETS: Design[] = [
  { id: 'kestrel', name: 'Kestrel', stages: [{ eng: 'solid', tank: 'S' }], boost: { n: 0, tank: 'S' }, top: 'probe', legs: false },
  { id: 'swift', name: 'Swift', stages: [{ eng: 'kerolox', tank: 'M' }, { eng: 'kerolox', tank: 'S' }], boost: { n: 0, tank: 'S' }, top: 'probe', legs: false },
  { id: 'meridian', name: 'Meridian', stages: [{ eng: 'kerolox', tank: 'L' }, { eng: 'kerolox', tank: 'M' }], boost: { n: 2, tank: 'M' }, top: 'fairing', legs: false },
  { id: 'meridianCrew', name: 'Meridian Crew', stages: [{ eng: 'kerolox', tank: 'L' }, { eng: 'kerolox', tank: 'M' }], boost: { n: 2, tank: 'M' }, top: 'capsule', legs: false },
  { id: 'colossus', name: 'Colossus', stages: [{ eng: 'hydrolox', tank: 'XL' }, { eng: 'hydrolox', tank: 'L' }], boost: { n: 4, tank: 'L' }, top: 'fairing', legs: false },
  { id: 'colossusLunar', name: 'Colossus Lunar', stages: [{ eng: 'hydrolox', tank: 'XL' }, { eng: 'hydrolox', tank: 'L' }], boost: { n: 4, tank: 'L' }, top: 'lander', legs: false },
  { id: 'leviathan', name: 'Leviathan', stages: [{ eng: 'methalox', tank: 'XXL' }, { eng: 'methalox', tank: 'XL' }], boost: { n: 4, tank: 'XL' }, top: 'fairing', legs: true },
];

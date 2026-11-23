// GLINT: apprentices. They cut real stones with the same physics you do: placement search, the sweet-spot
// angles from your recipe book (or the textbook), grind error and polish that depend on their skill.
import { rng, clamp } from './math.js';
import { buildPoly } from './poly.js';
import { CUTS } from './cuts.js';
import { SPECIES, variety } from './species.js';
import { autoPlace, stonePlanes, clarityOf, caratOf, lightPerf, bestAngles, appraise, CLARITY_MULT, colorGrade } from './stone.js';
import { cutMult } from './bench.js';
import { uid, tierCuts } from './economy.js';
import { STAGE } from './cuts.js';

export function apprenticeCut(save, r, skill) {
  const R = rng(r.seed ^ 0xa11ce ^ skill);
  const cuts = tierCuts(save.tier); const rec = save.recipes[r.sp]; const cut = rec && cuts.includes(rec.cut) ? rec.cut : 'round';
  const place = autoPlace(r, cut, 2 + Math.floor(skill / 2));
  const S = SPECIES[r.sp]; const book = save.recipes[r.sp + ':' + cut]; const ba = bestAngles(cut, S.ri);
  const err = (10.5 - skill) * 0.55; const base = book || { pav: ba.pav, crown: ba.crown, table: CUTS[cut].table };
  const P = { pav: base.pav + R.gauss() * err, crown: base.crown + R.gauss() * err, table: clamp(base.table + R.gauss() * err * 0.01, 0.45, 0.72), uG: 1 };
  const win = 0.03; const mq = {}; for (const k of ['uP', 'uC', 'uT']) { const e = R.gauss() * (10.5 - skill) * 0.012; P[k] = 1 + e; mq[k] = clamp(1 - Math.abs(e) / win, 0, 1); }
  const st = stonePlanes(r, place, cut, P); const poly = buildPoly(st.planes, 8); const used = new Set(poly.faces.map((f) => f.pi)); const planes = st.planes.filter((_, i) => used.has(i));
  const polish = clamp(0.8 + skill * 0.02 + R.range(-0.04, 0.04), 0, 1);
  const lp = lightPerf(planes, null, r.sp, cut, 12); let natA = 0, totA = 0; for (const f of poly.faces) { totA += f.area; if (st.planes[f.pi] && st.planes[f.pi].stage === STAGE.ROUGH) natA += f.area; } const natF = totA ? natA / totA : 0; const naturals = natF > 0.004 ? 1 : 0;
  const meetAvg = (mq.uP + mq.uC + mq.uT) / 3; let score = lp.ratio * (0.9 + 0.1 * meetAvg) * (0.92 + 0.08 * polish); if (naturals) score *= clamp(1 - natF * 2.5, 0.7, 1); if (score >= 0.975) score = 0.974;
  const ct = caratOf(poly.volume * place.s ** 3, r.sp); const cl = clarityOf(st.inc, planes);
  const g = { id: uid(), sp: r.sp, vid: r.vid, tone: r.tone, cut, ct: +ct.toFixed(ct < 10 ? 2 : 1), clarity: cl.grade, score: +score.toFixed(3), polish, brill: lp.ratio, fire: lp.fire, leak: lp.leak, ext: lp.ext, naturals,
    rough: { seed: r.seed, sp: r.sp, size: r.size, clarity: r.clarity }, place: { m: place.m, t: place.t, s: place.s }, P, made: Date.now(), src: 'apprentice' };
  const V = variety(r.sp, r.vid); const cm = CLARITY_MULT[cl.grade] || 1; const clM = r.sp === 'emerald' ? 1 + (cm - 1) * 0.5 : cm; const ap = appraise(g);
  g.value = Math.round(V.ppc * Math.pow(Math.max(0.02, ct), 1.28) * cutMult(score) * clM * colorGrade(r.sp, r.vid, r.tone).mult * ({ Excellent: 1.08, 'Very Good': 1, Good: 0.92, Fair: 0.8 }[ap.polishG] || 1));
  g.cutG = ap.cut; g.polishG = ap.polishG; g.colorG = ap.color; g.perfectMeets = 0;
  return g;
}

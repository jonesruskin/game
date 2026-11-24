// STARWARD: shared UI for funded projects (pool bars, Invest, Route surplus) and price tags that warn when a cost
// is more than the player's storage can hold.
import { icon } from './icons.js';
import { fmt, esc } from '../util.js';
import { RES } from '../data/resources.js';
import * as G from '../core/game.js';
import * as F from '../core/fund.js';
import { projectCost } from '../core/beyond.js';
let capC = null, capT = 0;
export const capNow = (s) => { const t = Date.now(); if (!capC || t - capT > 1000) { capC = G.rates(s).cap; capT = t; } return capC; };
export const costTags = (c, s) => { const cap = capNow(s); let over = false;
  const h = Object.entries(c).map(([r, n]) => { const o = cap[r] > 0 && n > cap[r] * 1.0001; over = over || o; return `<span class="cost ${(s.res[r] || 0) < n ? 'short' : ''} ${o ? 'over' : ''}" data-r="${r}" data-n="${n}" style="--rc:${RES[r].color}"${o ? ` title="More than you can store (${fmt(cap[r])})"` : ''}>${icon(r, 'xs')}${fmt(n)}</span>`; }).join('');
  return h + (over ? `<span class="overnote">${icon('info', 'xs')} More than your storage holds: build or upgrade Logistics Depots</span>` : ''); };
// the funding block for one project
export function fundHTML(s, key, cost, label = 'Begin') {
  const p = F.pool(s, key), pct = Math.floor(F.progress(s, key, cost) * 100), on = F.routed(s, key), ready = F.funded(s, key, cost);
  const rows = Object.entries(cost).map(([r, n]) => { const have = Math.min(n, p[r] || 0); return `<div class="frow" style="--rc:${RES[r].color}">${icon(r, 'xs')}<div class="fbar"><i style="width:${(have / n) * 100}%"></i></div><span>${fmt(Math.floor(have))} / ${fmt(n)}</span></div>`; }).join('');
  return `<div class="fund"><div class="fhead"><b>Funding · ${pct}%</b>${on ? `<span class="tag ok">${icon('bolt', 'xs')} surplus routed here</span>` : ''}</div>${rows}
    <div class="fbtns"><button class="btn small" data-a="invest" data-key="${esc(key)}">${icon('up', 'xs')} Invest all but 10%</button><button class="btn small ${on ? 'on' : ''}" data-a="route" data-key="${esc(key)}">${icon('bolt', 'xs')} ${on ? 'Stop routing' : 'Route surplus here'}</button></div>
    <p class="muted small">${ready ? 'Fully funded: the rest comes from storage.' : 'Production that would overflow full storage flows into the routed project, even while you are away.'}</p></div>`; }
// Invest / Route buttons (returns true when it handled the click)
export function fundClick(app, s, t) { const a = t.dataset.a; if (a !== 'invest' && a !== 'route') return false; const key = t.dataset.key, cost = projectCost(s, key); if (!cost) return true;
  if (a === 'invest') { const cap = capNow(s), max = {}; for (const r in cost) max[r] = Math.max(0, (s.res[r] || 0) - 0.1 * (cap[r] || 0)); const n = F.invest(s, key, cost, max); app.audio.play(n ? 'claim' : 'deny'); app.ui.toast(n ? `Invested ${fmt(n)} into the project` : 'Nothing to invest yet', n ? 'gold' : 'bad'); }
  else { const on = F.routed(s, key); F.setRoute(s, on ? null : key, cost); app.audio.play('tap'); app.ui.toast(on ? 'Surplus routing stopped' : 'Surplus production now flows into this project', on ? '' : 'gold'); }
  app.changed(); return true; }

// Runs the real worker against SQLite (Node's built-in node:sqlite behind a tiny D1-compatible shim).
// npx tsx server/test/run.ts
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import worker, { Env } from '../src/worker';
import { academyLayout, aiDeploys } from '../../src/core/war';
import { run } from '../../src/core/battle';
const db = new DatabaseSync(':memory:'); db.exec(readFileSync(new URL('../schema.sql', import.meta.url), 'utf8'));
const D1 = { prepare(sql: string) { const st = db.prepare(sql); let args: any[] = []; const o: any = { bind(...v: any[]) { args = v; return o; }, async first() { return (st.get(...args) as any) ?? null; }, async all() { return { results: st.all(...args) }; }, async run() { return st.run(...args); } }; return o; } };
const env: Env = { DB: D1 as any, VERIFY: 'on', ALLOWED_ORIGIN: '*' };
type Who = { id: string; token: string };
const call = async (method: string, path: string, body?: unknown, who?: Who, e = env) => { const r = await worker.fetch(new Request('https://war.test' + path, { method, headers: { 'content-type': 'application/json', ...(who ? { authorization: `Bearer ${who.id}:${who.token}` } : {}) }, body: body ? JSON.stringify(body) : undefined }), e); return { status: r.status, body: (await r.json()) as any }; };
let pass = 0, failN = 0; const ok = (c: boolean, msg: string) => { if (c) pass++; else { failN++; console.log('FAIL', msg); } };
const army = [{ sp: 'thunderhead', lvl: 14 }, { sp: 'prism', lvl: 14 }, { sp: 'umbra', lvl: 14 }, { sp: 'mirrorplate', lvl: 14 }, { sp: 'tidepool', lvl: 14 }, { sp: 'digger', lvl: 14 }];
(async () => {
  ok((await call('GET', '/v1/health')).body.ok === true, 'health');
  const reg = async (name: string) => (await call('POST', '/v1/register', { name })).body as Who;
  const A = await reg('Cape Horizon'), B = await reg('Okafor Ridge'), C = await reg('Moreau Bay<script>');
  ok(/^[a-f0-9]{16}$/.test(A.id) && A.token.length === 64, 'register returns id and token');
  ok((await call('GET', '/v1/me', undefined, { id: A.id, token: 'f'.repeat(64) })).status === 401, 'bad token refused');
  const me = await call('GET', '/v1/me', undefined, C); ok(me.status === 200 && !me.body.name.includes('<'), 'names are cleaned');
  for (const [w, seed] of [[B, 11], [C, 22], [A, 33]] as [Who, number][]) { const r = await call('PUT', '/v1/snapshot', { layout: academyLayout(6, seed, 0.7), look: { primary: '#c0392b', accent: '#ffffff' }, power: 100 }, w); ok(r.status === 200, 'snapshot accepted ' + seed); }
  // impossible layouts are refused: overlapping buildings, outside the buildable square, too many turrets
  const L = academyLayout(6, 44, 0.7); const bad1 = { ...L, items: [...L.items, { ...L.items[0], id: 'dup' }] }; ok((await call('PUT', '/v1/snapshot', { layout: bad1 }, A)).status === 400, 'overlap refused');
  const bad2 = { ...L, items: L.items.map((i, k) => (k === 1 ? { ...i, x: 0, z: 0 } : i)) }; ok((await call('PUT', '/v1/snapshot', { layout: bad2 }, A)).status === 400, 'outside the square refused');
  const bad3 = { ...L, items: [...L.items, ...Array.from({ length: 6 }, (_, k) => ({ id: 't' + k, b: 'turret', lvl: 1, x: L.lo + k * 2, z: L.hi - 2, r: 0 }))] }; ok((await call('PUT', '/v1/snapshot', { layout: bad3 }, A)).status === 400, 'over the count limit refused');
  // matchmaking and a verified attack
  const op = await call('GET', '/v1/opponents', undefined, A); ok(op.status === 200 && op.body.opponents.length === 2 && op.body.opponents.every((o: any) => o.match && o.layout.items.length > 10), 'opponents: the two other commanders');
  const target = op.body.opponents.find((o: any) => o.name === 'Okafor Ridge'); const deploys = aiDeploys(target.layout, army, 5);
  const local = run({ layout: target.layout, army, deploys, seed: 0 });
  const res = await call('POST', '/v1/result', { match: target.match, army, deploys, stars: 3, pct: 100 }, A);
  ok(res.status === 200 && res.body.verified && res.body.stars === local.stars && res.body.pct === local.pct, `server result matches the client engine (${res.body.stars}★ ${res.body.pct}% vs ${local.stars}★ ${local.pct}%)`);
  ok((await call('POST', '/v1/result', { match: target.match, army, deploys }, A)).status === 404, 'a match can only be used once');
  const def = await call('GET', '/v1/defences?since=0', undefined, B); ok(def.body.attacks.length === 1 && def.body.attacks[0].who === 'Cape Horizon', 'defender sees the attack');
  const rep = run(def.body.attacks[0].input); ok(rep.stars === res.body.stars && rep.pct === res.body.pct, 'the stored replay reproduces the result');
  const tA = (await call('GET', '/v1/me', undefined, A)).body, tB = (await call('GET', '/v1/me', undefined, B)).body; ok(tA.trophies === res.body.trophies && tA.sorties === 2, `attacker trophies ${tA.trophies}, sorties ${tA.sorties}`); ok(res.body.stars > 0 ? tB.trophies === 0 : tB.trophies > 0, `defender trophies ${tB.trophies}`);
  // invalid inputs
  const op2 = (await call('GET', '/v1/opponents', undefined, A)).body.opponents[0]; ok((await call('POST', '/v1/result', { match: op2.match, army: [{ sp: 'nope', lvl: 3 }], deploys: [] }, A)).status === 400, 'unknown robot refused');
  ok((await call('POST', '/v1/result', { match: op2.match, army, deploys: [{ t: 0, i: 0, x: (op2.layout.lo + op2.layout.hi) / 2, z: (op2.layout.lo + op2.layout.hi) / 2 }] }, A)).status === 400, 'deploying inside the base refused');
  ok((await call('POST', '/v1/result', { match: op2.match, army: Array.from({ length: 20 }, () => army[0]), deploys: [] }, A)).status === 400, 'oversized squad refused');
  // sorties run out
  for (let k = 0; k < 2; k++) { const o = (await call('GET', '/v1/opponents', undefined, A)).body.opponents[0]; const r = await call('POST', '/v1/result', { match: o.match, army, deploys: aiDeploys(o.layout, army, k) }, A); ok(r.status === 200, 'sortie ' + (k + 2)); }
  const o4 = (await call('GET', '/v1/opponents', undefined, A)).body.opponents[0]; ok((await call('POST', '/v1/result', { match: o4.match, army, deploys: aiDeploys(o4.layout, army, 9) }, A)).status === 429, 'fourth sortie refused');
  // Workers Free mode: the client's result is accepted after sanity checks
  const envOff: Env = { ...env, VERIFY: 'off' }; const oc = (await call('GET', '/v1/opponents', undefined, C, envOff)).body.opponents[0]; const rc = await call('POST', '/v1/result', { match: oc.match, army, deploys: aiDeploys(oc.layout, army, 1), stars: 2, pct: 61 }, C, envOff); ok(rc.status === 200 && rc.body.stars === 2 && rc.body.pct === 61 && !rc.body.verified, 'unverified mode takes the client result');
  const lb = await call('GET', '/v1/leaderboard'); ok(lb.body.top.length === 3 && lb.body.top[0].trophies >= lb.body.top[2].trophies, 'leaderboard sorted');
  const t0 = Date.now(); for (let k = 0; k < 5; k++) run({ layout: target.layout, army, deploys, seed: 0 }); console.log(`battle verification: ${((Date.now() - t0) / 5).toFixed(1)} ms of CPU each (Workers Free allows 10 ms per request)`);
  console.log(`${pass} passed, ${failN} failed`); process.exit(failN ? 1 : 0);
})();

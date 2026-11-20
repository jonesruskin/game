// Procedural arena: walls, rocks, bushes, crates, spawn points + spatial grid for fast collision.
import { rand, randi, chance, pick, circleRect, dist2, TAU, clamp } from '../util.js';

export const CELL = 200;

export function generateWorld(size, nSpawns) {
  const W = size, H = size;
  const walls = [], rocks = [], bushes = [], crates = [], decor = [];
  const free = (x, y, r, pad = 0) => {
    if (x < r + 40 || y < r + 40 || x > W - r - 40 || y > H - r - 40) return false;
    for (const w of walls) if (circleRect(x, y, r + pad, w.x, w.y, w.w, w.h)) return false;
    for (const o of rocks) if (dist2(x, y, o.x, o.y) < (r + o.r + pad) ** 2) return false;
    for (const o of crates) if (dist2(x, y, o.x, o.y) < (r + o.r + pad) ** 2) return false;
    return true;
  };
  // Structures on a jittered grid — guarantees cover spread everywhere.
  const step = 340;
  for (let gx = step / 2; gx < W; gx += step) for (let gy = step / 2; gy < H; gy += step) {
    if (!chance(0.62)) continue;
    const cx = gx + rand(-70, 70), cy = gy + rand(-70, 70);
    const t = Math.random(); const th = 34;
    const add = (x, y, w, h) => { if (free(x + w / 2, y + h / 2, 10, 30)) walls.push({ x, y, w, h }); };
    if (t < 0.25) { const L = randi(120, 220); chance(0.5) ? add(cx - L / 2, cy - th / 2, L, th) : add(cx - th / 2, cy - L / 2, th, L); }
    else if (t < 0.45) { const L = randi(110, 170); const sx = pick([-1, 1]), sy = pick([-1, 1]); add(cx - L / 2, cy, L, th); add(sx > 0 ? cx + L / 2 - th : cx - L / 2, sy > 0 ? cy : cy - L + th, th, L); }
    else if (t < 0.6) { const n = randi(2, 3); for (let i = 0; i < n; i++) { const r = randi(30, 52); const x = cx + rand(-60, 60), y = cy + rand(-60, 60); if (free(x, y, r, 30)) rocks.push({ x, y, r }); } }
    else if (t < 0.72) { add(cx - 60, cy - 60, 120, 120); }
    else { // crates cluster
      const n = randi(1, 3); for (let i = 0; i < n; i++) { const x = cx + rand(-50, 50), y = cy + rand(-50, 50); if (free(x, y, 24, 14)) crates.push({ x, y, r: 24, hp: 60, maxHp: 60, crate: true }); }
    }
  }
  // Bushes (stealth) — clustered blobs.
  for (let i = 0; i < Math.round((W * H) / 230000); i++) {
    const cx = rand(150, W - 150), cy = rand(150, H - 150); const n = randi(3, 6); const cluster = [];
    for (let k = 0; k < n; k++) { const r = randi(46, 70); const x = cx + rand(-90, 90), y = cy + rand(-90, 90); if (free(x, y, r * 0.6, 0)) cluster.push({ x, y, r, seed: rand(1000) }); }
    bushes.push(...cluster);
  }
  // Extra loose crates.
  for (let i = 0; i < Math.round((W * H) / 300000); i++) { for (let tries = 0; tries < 20; tries++) { const x = rand(100, W - 100), y = rand(100, H - 100); if (free(x, y, 24, 40)) { crates.push({ x, y, r: 24, hp: 60, maxHp: 60, crate: true }); break; } } }
  // Ground decor (pebbles / flowers) purely visual.
  for (let i = 0; i < (W * H) / 40000; i++) decor.push({ x: rand(W), y: rand(H), k: randi(0, 3), s: rand(0.6, 1.3), rot: rand(TAU) });
  // Spawn points on a ring, nudged to free spots.
  const spawns = [];
  for (let i = 0; i < nSpawns; i++) {
    let best = null, bd = -1;
    for (let tries = 0; tries < 60; tries++) {
      const x = rand(380, W - 380), y = rand(380, H - 380); if (!free(x, y, 40, 10)) continue;
      let md = Infinity; for (const s of spawns) md = Math.min(md, dist2(x, y, s.x, s.y));
      if (md > bd) { bd = md; best = { x, y }; }
    }
    spawns.push(best || { x: W / 2, y: H / 2 });
  }
  const world = { W, H, walls, rocks, bushes, crates, decor, spawns, free };
  buildGrid(world);
  return world;
}

export function buildGrid(world) {
  const gw = Math.ceil(world.W / CELL), gh = Math.ceil(world.H / CELL);
  const grid = Array.from({ length: gw * gh }, () => []);
  const ins = (o, x0, y0, x1, y1) => {
    for (let gx = Math.max(0, Math.floor(x0 / CELL)); gx <= Math.min(gw - 1, Math.floor(x1 / CELL)); gx++)
      for (let gy = Math.max(0, Math.floor(y0 / CELL)); gy <= Math.min(gh - 1, Math.floor(y1 / CELL)); gy++) grid[gy * gw + gx].push(o);
  };
  for (const w of world.walls) { w.kind = 'rect'; ins(w, w.x, w.y, w.x + w.w, w.y + w.h); }
  for (const r of world.rocks) { r.kind = 'circ'; ins(r, r.x - r.r, r.y - r.r, r.x + r.r, r.y + r.r); }
  for (const c of world.crates) { c.kind = 'circ'; ins(c, c.x - c.r, c.y - c.r, c.x + c.r, c.y + c.r); }
  world.grid = grid; world.gw = gw; world.gh = gh;
  const bgrid = Array.from({ length: gw * gh }, () => []);
  for (const b of world.bushes) for (let gx = Math.max(0, Math.floor((b.x - b.r) / CELL)); gx <= Math.min(gw - 1, Math.floor((b.x + b.r) / CELL)); gx++)
    for (let gy = Math.max(0, Math.floor((b.y - b.r) / CELL)); gy <= Math.min(gh - 1, Math.floor((b.y + b.r) / CELL)); gy++) bgrid[gy * gw + gx].push(b);
  world.bgrid = bgrid;
}

// Collect static obstacles overlapping a box (dedup via stamp).
let stamp = 1;
export function queryObstacles(world, x0, y0, x1, y1, out) {
  out.length = 0; stamp++;
  const { gw, gh, grid } = world;
  for (let gx = Math.max(0, Math.floor(x0 / CELL)); gx <= Math.min(gw - 1, Math.floor(x1 / CELL)); gx++)
    for (let gy = Math.max(0, Math.floor(y0 / CELL)); gy <= Math.min(gh - 1, Math.floor(y1 / CELL)); gy++)
      for (const o of grid[gy * gw + gx]) { if (o._s === stamp || o.dead) continue; o._s = stamp; out.push(o); }
  return out;
}
export function inBush(world, x, y) {
  const gx = Math.floor(x / CELL), gy = Math.floor(y / CELL);
  if (gx < 0 || gy < 0 || gx >= world.gw || gy >= world.gh) return null;
  for (const b of world.bgrid[gy * world.gw + gx]) if (dist2(x, y, b.x, b.y) < (b.r * 0.8) ** 2) return b;
  return null;
}

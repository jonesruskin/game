// GLINT: CPU geometric-optics tracer. This is the "gemologist" of the game: it decides how brilliant a stone
// really is by firing rays from a viewer's eye into the gem and following refraction, total internal
// reflection and Fresnel splitting, exactly like light-performance machines (ASET / Ideal-Scope).
//   lr    light return: share of light coming back to the eye from bright overhead light (0..1)
//   fire  dispersion: rainbow flashes from light exiting the crown near the critical angle
//   scint sparkle: contrast pattern (dark/bright facets switching as the stone moves)
//   leak  light lost through the pavilion (a "window": the stone looks see-through)
//   ext   dark zones (extinction: cut too deep)
//   tone  mean internal path length (longer → deeper body colour)
const SQ = Math.sqrt;

function fresnel(cosi, n1, n2) {
  const sint = (n1 / n2) * SQ(Math.max(0, 1 - cosi * cosi)); if (sint >= 1) return 1;
  const cost = SQ(1 - sint * sint); const rs = (n1 * cosi - n2 * cost) / (n1 * cosi + n2 * cost); const rp = (n2 * cosi - n1 * cost) / (n2 * cosi + n1 * cost);
  return (rs * rs + rp * rp) / 2;
}
// light arriving from direction (x,y,z) (pointing away from the gem, toward the light) as seen in a
// jeweller's showroom: bright ceiling, dim walls, dark floor, and the viewer's own head blocking the zenith
export function envScore(x, y, z) {
  if (y <= 0.02) return 0;
  const e = Math.asin(Math.min(1, y)) * 57.29578;
  const b = 0.18 + 0.82 * Math.min(1, Math.max(0, (e - 8) / 40));
  const h = Math.min(1, Math.max(0, (e - 74) / 12)); return b * (1 - 0.6 * h * h * (3 - 2 * h)); // soft head shadow at the zenith
}

// planes: [{n:[x,y,z], d}], frost: per-plane 0..1 (rough / unpolished), o: { ri, disp, grid, bounces, bx, bz }
export function analyze(planes, frost, o) {
  const N = o.grid || 26, B = o.bounces || 10, ri = o.ri, dn = o.disp || 0.01; const bx = o.bx || 1, bz = o.bz || 1;
  const P = planes.length; const nx = new Float64Array(P), ny = new Float64Array(P), nz = new Float64Array(P), dd = new Float64Array(P), fr = new Float64Array(P);
  for (let i = 0; i < P; i++) { nx[i] = planes[i].n[0]; ny[i] = planes[i].n[1]; nz[i] = planes[i].n[2]; dd[i] = planes[i].d; fr[i] = frost ? frost[i] || 0 : 0; }
  const E = 7; // eye height (gem units, ~25 cm for a 7 mm stone)
  // the stone is judged while being rocked: average several viewing tilts (also smooths aliasing)
  const TILTS = o.tilts || [[0, 0], [0.14, 0], [-0.14, 0], [0, 0.14], [0, -0.14]];
  let hits = 0, lrSum = 0, fireSum = 0, leakSum = 0, extN = 0, toneSum = 0, toneW = 0, glare = 0;
  const vals = new Float32Array(N * N).fill(-1);
  let seed = 12345; const jr = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let ti = 0; ti < TILTS.length; ti++) { const [ax, az] = TILTS[ti]; const cax = Math.cos(ax), sax = Math.sin(ax), caz = Math.cos(az), saz = Math.sin(az);
  for (let gy = 0; gy < N; gy++) for (let gx = 0; gx < N; gx++) {
    const tx = ((gx + jr()) / N * 2 - 1) * bx * 1.02, tz = ((gy + jr()) / N * 2 - 1) * bz * 1.02;
    // eye position rotated around x then z (tilting the stone = moving the eye)
    let ex = 0, ey = E * cax, ez = E * sax; const ex2 = ex * caz - ey * saz, ey2 = ex * saz + ey * caz; ex = ex2; ey = ey2;
    let ox = ex, oy = ey, oz = ez; let dx = tx - ex, dy = -ey, dz = tz - ez; const l = SQ(dx * dx + dy * dy + dz * dz); dx /= l; dy /= l; dz /= l;
    // entry
    let t0 = -1e9, t1 = 1e9, i0 = -1, miss = false;
    for (let i = 0; i < P; i++) { const den = nx[i] * dx + ny[i] * dy + nz[i] * dz, dist = dd[i] - (nx[i] * ox + ny[i] * oy + nz[i] * oz); if (Math.abs(den) < 1e-12) { if (dist < 0) { miss = true; break; } continue; } const t = dist / den; if (den < 0) { if (t > t0) { t0 = t; i0 = i; } } else if (t < t1) t1 = t; if (t0 > t1) { miss = true; break; } }
    if (miss || i0 < 0 || t1 < 0) continue;
    hits++;
    let px = ox + dx * t0, py = oy + dy * t0, pz = oz + dz * t0;
    if (fr[i0] > 0.5) { if (ti === 0) vals[gy * N + gx] = 0.22; lrSum += 0.22 * (1 - fr[i0]) + 0.1; continue; } // frosted skin: dull grey
    let cosi = -(nx[i0] * dx + ny[i0] * dy + nz[i0] * dz); const F0 = fresnel(cosi, 1, ri);
    // external reflection (glare / lustre)
    { const rx = dx + 2 * cosi * nx[i0], ry = dy + 2 * cosi * ny[i0], rz = dz + 2 * cosi * nz[i0]; glare += F0 * envScore(rx, ry, rz); }
    // refract in
    { const eta = 1 / ri; const k = 1 - eta * eta * (1 - cosi * cosi); const c2 = SQ(Math.max(0, k)); dx = eta * dx + (eta * cosi - c2) * nx[i0]; dy = eta * dy + (eta * cosi - c2) * ny[i0]; dz = eta * dz + (eta * cosi - c2) * nz[i0]; }
    let w = 1 - F0, ret = 0, fire = 0, path = 0, leak = 0;
    for (let b = 0; b < B && w > 0.015; b++) {
      let tm = 1e9, j = -1;
      for (let i = 0; i < P; i++) { const den = nx[i] * dx + ny[i] * dy + nz[i] * dz; if (den <= 1e-9) continue; const t = (dd[i] - (nx[i] * px + ny[i] * py + nz[i] * pz)) / den; if (t < tm) { tm = t; j = i; } }
      if (j < 0) break; if (tm < 0) tm = 0;
      px += dx * tm; py += dy * tm; pz += dz * tm; path += tm;
      if (fr[j] > 0.5) { ret += w * 0.08; break; } // light scatters out of rough skin
      cosi = nx[j] * dx + ny[j] * dy + nz[j] * dz; const sini = SQ(Math.max(0, 1 - cosi * cosi)); const sint = ri * sini;
      if (sint < 1) {
        const F = fresnel(cosi, ri, 1); const cost = SQ(1 - sint * sint);
        // refracted direction out of the stone
        const ox2 = ri * dx + (cost - ri * cosi) * nx[j], oy2 = ri * dy + (cost - ri * cosi) * ny[j], oz2 = ri * dz + (cost - ri * cosi) * nz[j];
        const L = envScore(ox2, oy2, oz2); const tw = w * (1 - F);
        ret += tw * L; toneSum += tw * L * path; toneW += tw * L;
        if (ny[j] < -0.05) leak += tw; // escaped through the pavilion
        const spread = Math.min(0.35, (dn * sini) / Math.max(0.05, cost)); fire += tw * L * spread * (oy2 > 0.3 ? 1 : 0.3);
        w *= F;
      }
      // reflect (TIR or the Fresnel-reflected part)
      dx -= 2 * cosi * nx[j]; dy -= 2 * cosi * ny[j]; dz -= 2 * cosi * nz[j];
    }
    if (ti === 0) vals[gy * N + gx] = ret; lrSum += ret; fireSum += fire; leakSum += leak; if (ret < 0.2) extN++;
  } }
  if (!hits) return { lr: 0, fire: 0, scint: 0, leak: 1, ext: 1, tone: 0, glare: 0, hits: 0, vals, N };
  // scintillation: mean contrast between neighbouring samples
  let cs = 0, cn = 0; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const v = vals[y * N + x]; if (v < 0) continue; if (x + 1 < N && vals[y * N + x + 1] >= 0) { cs += Math.abs(v - vals[y * N + x + 1]); cn++; } if (y + 1 < N && vals[(y + 1) * N + x] >= 0) { cs += Math.abs(v - vals[(y + 1) * N + x]); cn++; } }
  return { lr: lrSum / hits, fire: (fireSum / hits) * 10, scint: cn ? cs / cn : 0, leak: leakSum / hits, ext: extN / hits, tone: toneW ? toneSum / toneW : 0, glare: glare / hits, hits, vals, N };
}

// one number the economy uses: weighted light performance
export const perf = (a) => a.lr + 0.35 * Math.min(1, a.fire) * 0.3 + 0.15 * Math.min(0.5, a.scint);

// Build every target (or the ones named): node tools/build.mjs [crazygames] [web] [mobile]
//   crazygames → dist/crazygames/ + dist/helioscend-crazygames.zip   (CrazyGames SDK v3 injected)
//   web        → dist/web/        + dist/helioscend-web.zip          (itch.io / own site)
//   mobile     → dist/mobile/     (web assets for the Capacitor shell: see mobile/README.md)
import fs from 'node:fs'; import path from 'node:path'; import zlib from 'node:zlib'; import { execSync } from 'node:child_process';
import { build } from 'vite';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const want = process.argv.slice(2); const targets = want.length ? want : ['crazygames', 'web', 'mobile'];
try { execSync('npx tsc --noEmit', { cwd: root, stdio: 'inherit' }); } catch (e) { console.error('✖ type check failed'); process.exit(1); }
function walk(d, base = d, out = []) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); fs.statSync(p).isDirectory() ? walk(p, base, out) : out.push(path.relative(base, p).split(path.sep).join('/')); } return out; }
const CRC = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc32 = (b) => { let c = -1; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
function zip(dir, outFile) {
  const parts = [], central = []; let off = 0;
  for (const name of walk(dir)) { const data = fs.readFileSync(path.join(dir, name)); const comp = zlib.deflateRawSync(data, { level: 9 }); const nb = Buffer.from(name);
    const h = Buffer.alloc(30); h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(20, 4); h.writeUInt16LE(0, 6); h.writeUInt16LE(8, 8); h.writeUInt32LE(0, 10); h.writeUInt32LE(crc32(data), 14); h.writeUInt32LE(comp.length, 18); h.writeUInt32LE(data.length, 22); h.writeUInt16LE(nb.length, 26); h.writeUInt16LE(0, 28);
    parts.push(h, nb, comp);
    const c = Buffer.alloc(46); c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(0, 8); c.writeUInt16LE(8, 10); c.writeUInt32LE(0, 12); c.writeUInt32LE(crc32(data), 16); c.writeUInt32LE(comp.length, 20); c.writeUInt32LE(data.length, 24); c.writeUInt16LE(nb.length, 28); c.writeUInt32LE(off, 42);
    central.push(c, nb); off += 30 + nb.length + comp.length; }
  const cd = Buffer.concat(central); const e = Buffer.alloc(22); e.writeUInt32LE(0x06054b50, 0); e.writeUInt16LE(central.length / 2, 8); e.writeUInt16LE(central.length / 2, 10); e.writeUInt32LE(cd.length, 12); e.writeUInt32LE(off, 16);
  fs.writeFileSync(outFile, Buffer.concat([...parts, cd, e]));
}
for (const t of targets) {
  await build({ root, mode: t, logLevel: 'warn' });
  { const o = path.join(root, 'dist', t); // third-party licences travel with every build (three.js: MIT; Barlow and Oxanium: SIL Open Font License)
    const lic = ['HELIOSCEND: third-party software and fonts', '', 'All game code, 3D models, textures, icons, music and sound effects are original and were made for Helioscend.', '', '== three.js (MIT License) ==', fs.readFileSync(path.join(root, 'node_modules/three/LICENSE'), 'utf8'), '', '== Barlow (SIL Open Font License 1.1) ==', fs.readFileSync(path.join(root, 'src/ui/fonts/OFL-Barlow.txt'), 'utf8'), '', '== Oxanium (SIL Open Font License 1.1) ==', fs.readFileSync(path.join(root, 'src/ui/fonts/OFL-Oxanium.txt'), 'utf8')].join('\n');
    fs.writeFileSync(path.join(o, 'LICENSES.txt'), lic); }
  { const o = path.join(root, 'dist', t); // third-party licences travel with every build (three.js: MIT; Barlow and Oxanium: SIL Open Font License)
    const lic = ['HELIOSCEND: third-party software and fonts', '', 'All game code, 3D models, textures, icons, music and sound effects are original and were made for Helioscend.', '', '== three.js (MIT License) ==', fs.readFileSync(path.join(root, 'node_modules/three/LICENSE'), 'utf8'), '', '== Barlow (SIL Open Font License 1.1) ==', fs.readFileSync(path.join(root, 'src/ui/fonts/OFL-Barlow.txt'), 'utf8'), '', '== Oxanium (SIL Open Font License 1.1) ==', fs.readFileSync(path.join(root, 'src/ui/fonts/OFL-Oxanium.txt'), 'utf8')].join('\n');
    fs.writeFileSync(path.join(o, 'LICENSES.txt'), lic); }
  const out = path.join(root, 'dist', t); const files = walk(out); const size = files.reduce((a, f) => a + fs.statSync(path.join(out, f)).size, 0);
  if (t !== 'mobile') { const zf = path.join(root, 'dist', `helioscend-${t}.zip`); zip(out, zf); console.log(`✔ ${t.padEnd(11)} ${files.length} files, ${(size / 1024).toFixed(0)} KB → ${path.relative(root, zf)} (${(fs.statSync(zf).size / 1024).toFixed(0)} KB zipped)`); }
  else console.log(`✔ ${t.padEnd(11)} ${files.length} files, ${(size / 1024).toFixed(0)} KB → dist/mobile/ (wrap with Capacitor)`);
}

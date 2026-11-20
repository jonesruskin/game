// Build per-portal packages: node tools/build.mjs  →  dist/<portal>/ + dist/driftline-<portal>.zip
// Zero dependencies. Injects the right SDK <script> for each portal.
import fs from 'node:fs'; import path from 'node:path'; import zlib from 'node:zlib';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SDK = {
  crazygames: '<script src="https://sdk.crazygames.com/crazygames-sdk-v3.js"></script>',
  poki: '<script src="https://game-cdn.poki.com/scripts/v2/poki-sdk.js"></script>',
  web: '', // itch.io, GameDistribution-less hosting, your own site
};
const GAME = path.basename(root) === 'game' ? 'stealstorm' : path.basename(root);
const FILES = ['index.html', 'css', 'src'];
function copy(src, dst) { const st = fs.statSync(src); if (st.isDirectory()) { fs.mkdirSync(dst, { recursive: true }); for (const f of fs.readdirSync(src)) copy(path.join(src, f), path.join(dst, f)); } else fs.copyFileSync(src, dst); }
function walk(d, base = d, out = []) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); fs.statSync(p).isDirectory() ? walk(p, base, out) : out.push(path.relative(base, p).split(path.sep).join('/')); } return out; }
// Minimal ZIP writer (deflate) with CRC32.
const CRC = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc32 = (b) => { let c = -1; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
function zip(dir, outFile) {
  const parts = [], central = []; let off = 0;
  for (const name of walk(dir)) {
    const data = fs.readFileSync(path.join(dir, name)); const comp = zlib.deflateRawSync(data, { level: 9 }); const nb = Buffer.from(name);
    const h = Buffer.alloc(30); h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(20, 4); h.writeUInt16LE(0, 6); h.writeUInt16LE(8, 8); h.writeUInt32LE(0, 10); h.writeUInt32LE(crc32(data), 14); h.writeUInt32LE(comp.length, 18); h.writeUInt32LE(data.length, 22); h.writeUInt16LE(nb.length, 26); h.writeUInt16LE(0, 28);
    parts.push(h, nb, comp);
    const c = Buffer.alloc(46); c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(0, 8); c.writeUInt16LE(8, 10); c.writeUInt32LE(0, 12); c.writeUInt32LE(crc32(data), 16); c.writeUInt32LE(comp.length, 20); c.writeUInt32LE(data.length, 24); c.writeUInt16LE(nb.length, 28); c.writeUInt32LE(off, 42);
    central.push(c, nb); off += 30 + nb.length + comp.length;
  }
  const cd = Buffer.concat(central); const e = Buffer.alloc(22); e.writeUInt32LE(0x06054b50, 0); e.writeUInt16LE(central.length / 2, 8); e.writeUInt16LE(central.length / 2, 10); e.writeUInt32LE(cd.length, 12); e.writeUInt32LE(off, 16);
  fs.writeFileSync(outFile, Buffer.concat([...parts, cd, e]));
}
const dist = path.join(root, 'dist'); fs.rmSync(dist, { recursive: true, force: true }); fs.mkdirSync(dist);
for (const [portal, tag] of Object.entries(SDK)) {
  const out = path.join(dist, portal); fs.mkdirSync(out, { recursive: true });
  for (const f of FILES) copy(path.join(root, f), path.join(out, f));
  const idx = path.join(out, 'index.html'); fs.writeFileSync(idx, fs.readFileSync(idx, 'utf8').replace('<!--SDK-->', tag));
  const zf = path.join(dist, `${GAME}-${portal}.zip`); zip(out, zf);
  console.log(`✔ ${portal.padEnd(11)} ${(fs.statSync(zf).size / 1024).toFixed(1)} KB  → ${path.relative(root, zf)}`);
}

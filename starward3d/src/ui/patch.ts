// Mission patches: one for every Programme Rank, drawn here as an embroidered badge. The shape, colours, emblem and
// stars all follow from the rank number, so every patch is different and the collection reads as a journey:
// rockets first, then moons, ringed worlds, stars and finally galaxies (gold-edged once the emblems come round again).
const hsl = (h: number, s: number, l: number) => `hsl(${Math.round(h)} ${s}% ${l}%)`;
const SHAPES = ['<circle cx="50" cy="50" r="46"/>', '<path d="M50 4 L92 17 V50 C92 75 73 89 50 97 C27 89 8 75 8 50 V17 Z"/>', '<path d="M50 4 L91 27 V73 L50 96 L9 73 V27 Z"/>', '<ellipse cx="50" cy="50" rx="41" ry="47"/>'];
const star = (x: number, y: number, r: number, n = 5, k = 0.45) => { let d = ''; for (let i = 0; i < n * 2; i++) { const a = (Math.PI * i) / n - Math.PI / 2, q = i % 2 ? r * k : r; d += `${i ? 'L' : 'M'}${(x + Math.cos(a) * q).toFixed(1)} ${(y + Math.sin(a) * q).toFixed(1)}`; } return d + 'Z'; };
function emblem(t: number, ring: string, deep: string, gold: string) { const w = '#eef6ff';
  switch (t % 5) {
    case 0: return `<path d="M50 20 C59 29 61 42 58 56 H42 C39 42 41 29 50 20Z" fill="${w}"/><circle cx="50" cy="37" r="4.5" fill="${deep}"/><path d="M42 47 L34 60 L42 57Z M58 47 L66 60 L58 57Z" fill="${ring}"/><path d="M44 57 L50 70 L56 57Z" fill="${gold}"/>`;
    case 1: return `<ellipse cx="50" cy="46" rx="31" ry="9" fill="none" stroke="${ring}" stroke-width="2.4" transform="rotate(-18 50 46)"/><circle cx="50" cy="46" r="15" fill="${w}"/><circle cx="57" cy="41" r="12.5" fill="${deep}"/><circle cx="76" cy="37" r="2.6" fill="${gold}"/>`;
    case 2: return `<circle cx="50" cy="46" r="14" fill="${ring}"/><path d="M38 41 A14 14 0 0 1 62 40" fill="none" stroke="${w}" stroke-width="2" opacity=".55"/><ellipse cx="50" cy="46" rx="28" ry="7" fill="none" stroke="${gold}" stroke-width="3" transform="rotate(-20 50 46)"/>`;
    case 3: return `<path d="${star(50, 46, 19, 8, 0.42)}" fill="${gold}"/><circle cx="50" cy="46" r="6" fill="${w}"/>`;
    default: return `<g transform="rotate(-24 50 46)" fill="none" stroke-linecap="round"><path d="M50 46 C62 34 80 42 72 56" stroke="${ring}" stroke-width="4"/><path d="M50 46 C38 58 20 50 28 36" stroke="${ring}" stroke-width="4"/><path d="M50 46 C58 40 68 44 64 51" stroke="${w}" stroke-width="2" opacity=".7"/><path d="M50 46 C42 52 32 48 36 41" stroke="${w}" stroke-width="2" opacity=".7"/></g><circle cx="50" cy="46" r="5.5" fill="${w}"/>`;
  } }
export function patchSVG(r: number, size = 64, locked = false) { const h = (r * 137.508 + 205) % 360, t = Math.floor((r - 1) / 5), shape = SHAPES[r % 4];
  const deep = hsl(h, 48, 17), mid = hsl((h + 24) % 360, 55, 30), ring = hsl(h, 78, 64), gold = '#ffd36a', edge = t >= 5 ? gold : ring; const n = 1 + ((r - 1) % 5);
  const stars = Array.from({ length: n }, (_, i) => { const o = i - (n - 1) / 2; return `<path d="${star(50 + o * 8.5, 16 + Math.abs(o) * 1.8, 3.2)}" fill="${gold}"/>`; }).join('');
  const body = `<g fill="${deep}" stroke="${edge}" stroke-width="5">${shape}</g><g fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="1.1" stroke-dasharray="2.2 2.2" transform="translate(50 50) scale(.86) translate(-50 -50)">${shape}</g>
    <g transform="translate(50 50) scale(.78) translate(-50 -50)" fill="${mid}" opacity=".55">${shape}</g>${stars}${emblem(t, ring, deep, gold)}
    <path d="M22 70 H78 L73 79 L78 88 H22 L27 79Z" fill="${gold}" stroke="${deep}" stroke-width="1.5"/><text x="50" y="83.5" text-anchor="middle" font-family="Oxanium, sans-serif" font-weight="700" font-size="${r > 99 ? 10 : 13}" fill="#2a1a00">${r}</text>`;
  return `<svg class="patch${locked ? ' locked' : ''}" viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true">${body}</svg>`; }

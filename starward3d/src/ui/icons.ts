// Resource icons: one distinctive, multi-colour SVG per resource, drawn for this game (no font glyphs). They scale with
// the text they sit in (1em by default) and stay readable from 14 px in a cost line to 30 px in the HUD.
const P: Record<string, string> = {
  // Aurivane: a gold coin stamped with a sun rising over the horizon
  credits: '<circle cx="12" cy="12" r="10.5" fill="#c98a12"/><circle cx="12" cy="12" r="9" fill="#ffcf4d"/><circle cx="12" cy="12" r="7.2" fill="#f7b928"/><path d="M6.2 14.6h11.6" stroke="#fff3c4" stroke-width="1.6" stroke-linecap="round"/><path d="M8.6 14.6a3.4 3.4 0 0 1 6.8 0z" fill="#fff3c4"/><path d="M12 7.2v2M8.3 8.8l1.2 1.5M15.7 8.8l-1.2 1.5" stroke="#fff3c4" stroke-width="1.4" stroke-linecap="round"/>',
  // metal: a stacked pair of ingots
  metal: '<path d="M3 15.5l3-4h9l3 4z" fill="#eef3f8"/><path d="M3 15.5h15v3.5H3z" fill="#9aa8ba"/><path d="M18 15.5l3-4v3.5l-3 4z" fill="#6c7a8c"/><path d="M7 10.5l2.5-3.5h8l2.5 3.5z" fill="#dfe7f0"/><path d="M7 10.5h13V12H7z" fill="#8a98aa"/><path d="M9 8.6h6" stroke="#ffffff" stroke-width="0.9" stroke-linecap="round" opacity="0.8"/>',
  // fuel: a propellant drop with a flame inside
  fuel: '<path d="M12 2.5C9 7 5.5 10.6 5.5 14.6a6.5 6.5 0 0 0 13 0C18.5 10.6 15 7 12 2.5z" fill="#ff7a45"/><path d="M12 9.5c-1.6 2.3-3.1 3.8-3.1 5.6a3.1 3.1 0 0 0 6.2 0c0-1.8-1.5-3.3-3.1-5.6z" fill="#ffd36a"/><path d="M12 13c-.7 1-1.3 1.6-1.3 2.4a1.3 1.3 0 0 0 2.6 0c0-.8-.6-1.4-1.3-2.4z" fill="#fff6d8"/><path d="M8.4 9.6a6 6 0 0 0-1.2 2.6" stroke="#ffd0b8" stroke-width="1.1" stroke-linecap="round"/>',
  // science: an atom
  science: '<ellipse cx="12" cy="12" rx="10" ry="4" fill="none" stroke="#6ee7ff" stroke-width="1.6"/><ellipse cx="12" cy="12" rx="10" ry="4" fill="none" stroke="#6ee7ff" stroke-width="1.6" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="4" fill="none" stroke="#3fb6d9" stroke-width="1.6" transform="rotate(-60 12 12)"/><circle cx="12" cy="12" r="2.6" fill="#e9fbff"/><circle cx="20.6" cy="9.6" r="1.3" fill="#e9fbff"/>',
  // power cells: a charged cell with a bolt
  cells: '<rect x="5.5" y="4" width="13" height="18" rx="2.6" fill="#1f5a3a"/><rect x="9" y="2" width="6" height="2.6" rx="1" fill="#7cf29a"/><rect x="7" y="5.6" width="10" height="14.8" rx="1.6" fill="#7cf29a"/><path d="M13 7.2l-4 6h3l-1 5.6 4.2-6.6h-3.1z" fill="#0f2f1e"/>',
  // helium-3: a glowing fusion pellet with an orbit ring
  he3: '<circle cx="12" cy="12" r="6.2" fill="#b892ff"/><circle cx="10.3" cy="10.2" r="2.2" fill="#e6d8ff"/><ellipse cx="12" cy="12" rx="10.2" ry="3.4" fill="none" stroke="#d6c4ff" stroke-width="1.4" transform="rotate(-24 12 12)"/><text x="12" y="15.6" text-anchor="middle" font-size="8.5" font-weight="800" font-family="Oxanium,sans-serif" fill="#3a1f74">3</text>',
  // rare elements: a cut emerald
  rare: '<path d="M7 3.5h10l4.5 5.5L12 21.5 2.5 9z" fill="#2fbf8a"/><path d="M7 3.5l2.4 5.5h5.2L17 3.5z" fill="#7df2c4"/><path d="M2.5 9h19L12 21.5z" fill="#21a174"/><path d="M9.4 9L12 21.5 14.6 9z" fill="#4fe0a8"/><path d="M5.5 6.4l1.4-1.6" stroke="#e8fff6" stroke-width="1.1" stroke-linecap="round"/>',
  // exotic matter: a magenta vortex
  exotic: '<circle cx="12" cy="12" r="10" fill="#3a0f3a"/><path d="M12 3a9 9 0 0 1 9 9 6 6 0 0 1-6 6 4 4 0 0 1-4-4 2.6 2.6 0 0 1 2.6-2.6" fill="none" stroke="#ff5cf0" stroke-width="2.2" stroke-linecap="round"/><path d="M12 21a9 9 0 0 1-9-9 6 6 0 0 1 6-6 4 4 0 0 1 4 4" fill="none" stroke="#ffa8f6" stroke-width="1.6" stroke-linecap="round"/><circle cx="12" cy="12" r="1.5" fill="#fff"/>',
  // antimatter: a magnetic containment capsule with a glowing core
  antimatter: '<rect x="4" y="6" width="16" height="12" rx="6" fill="#2a1016"/><rect x="4" y="6" width="16" height="12" rx="6" fill="none" stroke="#ff8fa3" stroke-width="1.4"/><circle cx="12" cy="12" r="3.4" fill="#ff4d6d"/><circle cx="12" cy="12" r="1.4" fill="#ffe1e7"/><path d="M8 6v12M16 6v12" stroke="#9aa3ad" stroke-width="1.6"/>',
  // influence: a laurel seal
  influence: '<circle cx="12" cy="12" r="5.6" fill="#ffb3c7"/><path d="M12 8.4l1.1 2.3 2.5.3-1.8 1.7.5 2.5-2.3-1.2-2.3 1.2.5-2.5-1.8-1.7 2.5-.3z" fill="#7a2240"/><path d="M5 16c-1.6-2.4-1.8-5.6-.4-8.4M19 16c1.6-2.4 1.8-5.6.4-8.4" fill="none" stroke="#ffd7e2" stroke-width="1.6" stroke-linecap="round"/><path d="M4.4 10.6l1.6.4M4.8 13.6l1.6-.1M19.6 10.6l-1.6.4M19.2 13.6l-1.6-.1" stroke="#ffd7e2" stroke-width="1.4" stroke-linecap="round"/>',
  // xenodata: an alien glyph tablet
  xeno: '<path d="M12 2.5l8.2 4.75v9.5L12 21.5l-8.2-4.75v-9.5z" fill="#1e3a10"/><path d="M12 2.5l8.2 4.75v9.5L12 21.5l-8.2-4.75v-9.5z" fill="none" stroke="#9dff5c" stroke-width="1.4"/><ellipse cx="12" cy="12" rx="4.4" ry="2.8" fill="#9dff5c"/><circle cx="12" cy="12" r="1.5" fill="#1e3a10"/><path d="M12 5.6v2M12 16.4v2" stroke="#9dff5c" stroke-width="1.3" stroke-linecap="round"/>',
  // dark matter: a dark crystal with a violet halo
  dm: '<circle cx="12" cy="12" r="10" fill="none" stroke="#c9b6ff" stroke-width="1" opacity="0.6"/><path d="M12 3l6 9-6 9-6-9z" fill="#5a3fa8"/><path d="M12 3l6 9h-6z" fill="#c9b6ff"/><path d="M12 12h-6l6 9z" fill="#3a2575"/><path d="M12 3v18" stroke="#e8deff" stroke-width="0.8" opacity="0.7"/>',
  // energy (the HUD's live balance)
  energy: '<path d="M13.5 2L5 13.5h6L9.5 22 19 9.8h-6.2z" fill="#ffd36a"/><path d="M13.5 2L5 13.5h6z" fill="#fff0b8"/>',
  // construction drones
  crews: '<rect x="8" y="10" width="8" height="4" rx="1.4" fill="#e8eef5"/><rect x="9" y="14" width="6" height="2" fill="#f5c542"/><path d="M8 11L4 8M16 11l4-3M8 13l-4 3M16 13l4 3" stroke="#9aa3ad" stroke-width="1.4"/><ellipse cx="4" cy="8" rx="2.6" ry="0.9" fill="#6ee7ff"/><ellipse cx="20" cy="8" rx="2.6" ry="0.9" fill="#6ee7ff"/><ellipse cx="4" cy="16" rx="2.6" ry="0.9" fill="#6ee7ff"/><ellipse cx="20" cy="16" rx="2.6" ry="0.9" fill="#6ee7ff"/><circle cx="12" cy="17.6" r="1" fill="#7ff5ff"/>',
  // time (build and research timers)
  time: '<circle cx="12" cy="13" r="8.5" fill="#1d2a40" stroke="#9fd0ff" stroke-width="1.6"/><path d="M12 13V8.4M12 13l3.2 2" stroke="#e8f4ff" stroke-width="1.8" stroke-linecap="round"/><rect x="10" y="2" width="4" height="2" rx="0.8" fill="#9fd0ff"/>',
};
export const ICON_IDS = Object.keys(P);
/** An inline SVG icon for a resource (or 'energy', 'crews', 'time'); size in CSS units. */
export const ri = (k: string, size = '1.25em') => P[k] ? `<svg class="ri" viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true">${P[k]}</svg>` : '';

// STARWARD: line icons (24×24, stroke = currentColor).
const P = {
  credits: '<circle cx="12" cy="12" r="8.5"/><path d="M14.8 9.2c-.6-1-1.6-1.5-2.8-1.5-1.7 0-2.8.9-2.8 2 0 2.8 5.6 1.6 5.6 4.5 0 1.1-1.2 2-2.8 2-1.3 0-2.4-.6-2.9-1.6M12 6v1.7M12 16.3V18"/>',
  metal: '<path d="M4 15l3-6h10l3 6zM7 9l2-3h6l2 3M4 15v3h16v-3"/>',
  fuel: '<path d="M12 3c3.5 4.5 6 7.6 6 11a6 6 0 0 1-12 0c0-3.4 2.5-6.5 6-11z"/><path d="M9.5 14.5a2.6 2.6 0 0 0 2.5 2.5"/>',
  science: '<circle cx="12" cy="12" r="1.6"/><ellipse cx="12" cy="12" rx="9" ry="3.6"/><ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(120 12 12)"/>',
  energy: '<path d="M13 2L5 13.5h6L10 22l9-12.5h-6z"/>',
  dm: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5a9.5 9.5 0 0 1 9.5 9.5M21.5 12A9.5 9.5 0 0 1 12 21.5M12 21.5A9.5 9.5 0 0 1 2.5 12M2.5 12A9.5 9.5 0 0 1 12 2.5" stroke-dasharray="3 3"/>',
  he3: '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8" stroke-dasharray="2 3"/>', rare: '<path d="M12 3l7 6-7 12L5 9z"/>', exotic: '<path d="M4 12c4-8 12 8 16 0M4 12c4 8 12-8 16 0"/>', antimatter: '<circle cx="12" cy="12" r="7"/><path d="M8 12h8"/>', influence: '<path d="M4 18l4-10 4 6 4-8 4 12"/>', xeno: '<path d="M12 3c5 0 7 4 7 8s-4 10-7 10-7-6-7-10 2-8 7-8z"/><path d="M8.5 11l2 1.5M15.5 11l-2 1.5"/>',
  crew: '<circle cx="9" cy="8" r="3"/><path d="M3 20c.5-4 3-6 6-6s5.5 2 6 6"/><path d="M16 5.5a3 3 0 0 1 0 6M18 14c1.8.6 3 2.4 3.3 6"/>',
  research: '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.7 3h10.6a2 2 0 0 0 1.7-3l-5-9V3"/><path d="M7.5 15h9"/>',
  base: '<path d="M3 20h18M5 20V10l7-5 7 5v10M9 20v-6h6v6"/>',
  rocket: '<path d="M12 2c3 2 5 6 5 10l-2 4H9l-2-4c0-4 2-8 5-10z"/><circle cx="12" cy="9" r="1.6"/><path d="M9 16l-2 4 3-1M15 16l2 4-3-1M10.5 19h3"/>',
  earth: '<circle cx="12" cy="12" r="9"/><path d="M4 9c3 0 4 2 6 2s2-3 4-3 3 1 6 1M5 17c2-1 4 0 5-1s1-3 3-3 3 2 6 1"/>',
  moon: '<path d="M19 15.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 9.5 11.5z"/><circle cx="10" cy="14" r="1.2"/><circle cx="13.5" cy="17" r=".8"/>',
  orbit: '<circle cx="12" cy="12" r="4"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(-20 12 12)"/><circle cx="20.5" cy="9" r="1.3" fill="currentColor"/>',
  sat: '<path d="M9 9l6 6M7 11l4-4 6 6-4 4z"/><path d="M3 7l4 4M7 3l4 4M17 13l4 4M13 17l4 4"/><path d="M18 3a3 3 0 0 1 3 3"/>',
  map: '<circle cx="12" cy="12" r="2.5"/><ellipse cx="12" cy="12" rx="9.5" ry="4"/><circle cx="20" cy="10" r="1"/>',
  cog: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', check: '<path d="M4 12l5 5L20 6"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>', lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  up: '<path d="M12 19V5M6 11l6-6 6 6"/>', bolt: '<path d="M13 2L5 13.5h6L10 22l9-12.5h-6z"/>', star: '<path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z"/>', flag: '<path d="M5 21V4M5 4h12l-2 4 2 4H5"/>', info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>', play: '<path d="M7 4l13 8-13 8z"/>', book: '<path d="M4 4h6a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4zM20 4h-6a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h6z"/>', target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
};
export const icon = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${P[n] || P.info}</svg>`;

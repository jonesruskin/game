// Google Play / App Store shell (Capacitor). The web assets in dist/mobile are wrapped natively; this adapter
// talks to native plugins when they exist (local notifications now; AdMob and in-app purchases slot in here
// later) and falls back to the web behaviour otherwise, so the mobile build also runs in a browser.
import { PlatformAPI, local } from './types';
const cap = () => (window as any).Capacitor;
const plugin = (n: string) => { const c = cap(); return c && c.Plugins ? c.Plugins[n] : null; };
const nid = (id: string) => { let h = 0; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0; return Math.abs(h) % 2000000000; };
export const Platform: PlatformAPI = {
  name: 'mobile', adsAvailable: false, onMute: null,
  async init() { const ln = plugin('LocalNotifications'); if (ln) { try { await ln.requestPermissions(); } catch (e) { /* denied */ } } },
  loadingStart() {}, loadingStop() {}, gameplayStart() {}, gameplayStop() {}, happytime() {},
  async rewarded() { return false; }, async midgame() { return false; },
  save: local.save, load: local.load, muted: () => false,
  notify(id, at, title, body) { const ln = plugin('LocalNotifications'); if (!ln || at <= Date.now()) return;
    try { ln.schedule({ notifications: [{ id: nid(id), title, body, schedule: { at: new Date(at) } }] }); } catch (e) { /* noop */ } },
  cancelNotify(id) { const ln = plugin('LocalNotifications'); if (!ln) return; try { ln.cancel({ notifications: [{ id: nid(id) }] }); } catch (e) { /* noop */ } },
};

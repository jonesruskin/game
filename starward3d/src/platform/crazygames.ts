// CrazyGames SDK v3: loading + gameplay events, happytime, midgame and rewarded ads, and cloud saves through
// the data module (localStorage stays as a fallback so a save is never lost). Every call is a safe no-op when
// the SDK is unavailable (local testing of the CrazyGames build).
import { PlatformAPI, local } from './types';
let sdk: any = null; let playing = false;
// Basic Launch (every new game) allows no ads, even with the SDK in: build with VITE_CG_ADS=on once CrazyGames selects the game for Full Launch
const ADS = (import.meta as any).env?.VITE_CG_ADS === 'on';
const on = () => !!sdk;
export const Platform: PlatformAPI = {
  name: 'crazygames', adsAvailable: false, onMute: null,
  async init() {
    const cg = window.CrazyGames && window.CrazyGames.SDK; if (!cg) return;
    try { await Promise.race([cg.init(), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 5000))]); if (cg.environment && cg.environment !== 'disabled') { /* never hold the game up for the SDK */ sdk = cg; this.adsAvailable = ADS; // rewarded ads only once CrazyGames moves the game to Full Launch (Basic Launch allows no ads)
      try { cg.game.addSettingsChangeListener((s: any) => this.onMute && this.onMute(!!(s && s.muteAudio))); } catch (e) { /* older sdk */ } } }
    catch (e) { console.warn('CrazyGames SDK init failed; running standalone', e); sdk = null; }
  },
  device() { try { return (on() && sdk.user && sdk.user.systemInfo && sdk.user.systemInfo.device && sdk.user.systemInfo.device.type) || null; } catch (e) { return null; } },
  async username() { try { if (!on() || !sdk.user || !sdk.user.isUserAccountAvailable) return null; const u = await Promise.race([sdk.user.getUser(), new Promise((r) => setTimeout(() => r(null), 3000))]) as any; return u && u.username ? String(u.username).slice(0, 24) : null; } catch (e) { return null; } },
  loadingStart() { try { on() && sdk.game.loadingStart(); } catch (e) { /* noop */ } },
  loadingStop() { try { on() && sdk.game.loadingStop(); } catch (e) { /* noop */ } },
  gameplayStart() { if (playing) return; playing = true; try { on() && sdk.game.gameplayStart(); } catch (e) { /* noop */ } },
  gameplayStop() { if (!playing) return; playing = false; try { on() && sdk.game.gameplayStop(); } catch (e) { /* noop */ } },
  happytime() { try { on() && sdk.game.happytime(); } catch (e) { /* noop */ } },
  midgame(onStart) { return ad('midgame', onStart); },
  rewarded(onStart) { return ad('rewarded', onStart); },
  save(key, data) { local.save(key, data); try { on() && sdk.data.setItem(key, data); } catch (e) { /* noop */ } },
  load(key) { let v: string | null = null; try { if (on()) v = sdk.data.getItem(key); } catch (e) { v = null; } return v || local.load(key); },
  muted() { try { return on() && !!sdk.game.settings.muteAudio; } catch (e) { return false; } },
  notify() {}, cancelNotify() {},
};
function ad(kind: 'midgame' | 'rewarded', onStart?: () => void): Promise<boolean> {
  return new Promise((res) => { if (!on()) return res(false);
    try { sdk.ad.requestAd(kind, { adStarted: () => onStart && onStart(), adFinished: () => res(true), adError: () => res(false) }); } catch (e) { res(false); } });
}

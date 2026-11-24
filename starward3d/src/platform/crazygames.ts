// CrazyGames SDK v3: loading + gameplay events, happytime, midgame and rewarded ads, and cloud saves through
// the data module (localStorage stays as a fallback so a save is never lost). Every call is a safe no-op when
// the SDK is unavailable (local testing of the CrazyGames build).
import { PlatformAPI, local } from './types';
let sdk: any = null; let playing = false;
const on = () => !!sdk;
export const Platform: PlatformAPI = {
  name: 'crazygames', adsAvailable: false, onMute: null,
  async init() {
    const cg = window.CrazyGames && window.CrazyGames.SDK; if (!cg) return;
    try { await cg.init(); if (cg.environment && cg.environment !== 'disabled') { sdk = cg; this.adsAvailable = true;
      try { cg.game.addSettingsChangeListener((s: any) => this.onMute && this.onMute(!!(s && s.muteAudio))); } catch (e) { /* older sdk */ } } }
    catch (e) { console.warn('CrazyGames SDK init failed; running standalone', e); sdk = null; }
  },
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

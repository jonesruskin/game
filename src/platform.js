// Portal abstraction: CrazyGames SDK v3, Poki SDK v2, or standalone (itch.io / own site / local dev).
// The build script injects the right SDK <script>. All calls are safe no-ops when unavailable.
export const Platform = {
  name: 'local', ready: false, sdk: null, adsAvailable: false, purchasesAvailable: false, lastMidgame: 0, adPlaying: false,
  locale: (navigator.language || 'en').slice(0, 2), isMobile: false,
  onMuteChange: null,
  async init() {
    const cg = window.CrazyGames && window.CrazyGames.SDK;
    try {
      if (cg) {
        await cg.init();
        if (cg.environment && cg.environment !== 'disabled') {
          this.name = 'crazygames'; this.sdk = cg; this.adsAvailable = true;
          try { const si = cg.user && cg.user.systemInfo; if (si) { this.isMobile = si.device && si.device.type !== 'desktop'; if (si.locale) this.locale = si.locale.slice(0, 2); } } catch (e) {}
          try { cg.game.addSettingsChangeListener && cg.game.addSettingsChangeListener((s) => this.onMuteChange && this.onMuteChange(!!(s && s.muteAudio))); } catch (e) {}
          // In-game purchases on CrazyGames are invite-only (Xsolla). Flip this on once approved & wired in purchase().
          this.purchasesAvailable = false;
        }
      } else if (window.PokiSDK) {
        await window.PokiSDK.init().catch(() => {});
        this.name = 'poki'; this.sdk = window.PokiSDK; this.adsAvailable = true; this.purchasesAvailable = false; // Poki forbids IAP
      }
    } catch (e) { console.warn('SDK init failed, running standalone', e); this.name = 'local'; }
    if (!this.isMobile) this.isMobile = matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) < 900;
    this.ready = true;
  },
  muteAudioSetting() { try { return this.name === 'crazygames' && !!this.sdk.game.settings.muteAudio; } catch (e) { return false; } },
  loadingStart() { try { if (this.name === 'crazygames') this.sdk.game.loadingStart(); } catch (e) {} },
  loadingStop() { try { if (this.name === 'crazygames') this.sdk.game.loadingStop(); else if (this.name === 'poki') this.sdk.gameLoadingFinished(); } catch (e) {} },
  _playing: false,
  gameplayStart() { if (this._playing) return; this._playing = true; try { if (this.name === 'crazygames') this.sdk.game.gameplayStart(); else if (this.name === 'poki') this.sdk.gameplayStart(); } catch (e) {} },
  gameplayStop() { if (!this._playing) return; this._playing = false; try { if (this.name === 'crazygames') this.sdk.game.gameplayStop(); else if (this.name === 'poki') this.sdk.gameplayStop(); } catch (e) {} },
  happytime() { try { if (this.name === 'crazygames') this.sdk.game.happytime(); } catch (e) {} },
  // Midgame ad at natural breaks (after a match). Resolves when finished either way.
  midgame(onStart) {
    return new Promise((res) => {
      if (!this.adsAvailable) return res(false);
      const done = (ok) => { this.adPlaying = false; res(ok); };
      try {
        if (this.name === 'crazygames') {
          this.sdk.ad.requestAd('midgame', { adStarted: () => { this.adPlaying = true; onStart && onStart(); }, adFinished: () => done(true), adError: () => done(false) });
        } else if (this.name === 'poki') {
          this.sdk.commercialBreak(() => { this.adPlaying = true; onStart && onStart(); }).then(() => done(true)).catch(() => done(false));
        } else res(false);
      } catch (e) { done(false); }
    });
  },
  // Rewarded ad: resolves true ONLY when the ad was fully watched.
  rewarded(onStart) {
    return new Promise((res) => {
      if (!this.adsAvailable) return res(false);
      const done = (ok) => { this.adPlaying = false; res(ok); };
      try {
        if (this.name === 'crazygames') {
          this.sdk.ad.requestAd('rewarded', { adStarted: () => { this.adPlaying = true; onStart && onStart(); }, adFinished: () => done(true), adError: () => done(false) });
        } else if (this.name === 'poki') {
          this.sdk.rewardedBreak(() => { this.adPlaying = true; onStart && onStart(); }).then((ok) => done(!!ok)).catch(() => done(false));
        } else res(false);
      } catch (e) { done(false); }
    });
  },
  // Cloud-capable save. CrazyGames data module syncs across devices for logged-in users.
  storage() {
    if (this.name === 'crazygames' && this.sdk.data) return { get: (k) => this.sdk.data.getItem(k), set: (k, v) => this.sdk.data.setItem(k, String(v)) };
    return { get: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };
  },
  // Real-money purchase hook. Wire to Xsolla (CrazyGames) / Stripe (own site) here. Never grants gameplay power.
  async purchase(sku) {
    if (!this.purchasesAvailable) return { ok: false, reason: 'unavailable' };
    // Example for CrazyGames Xsolla once approved:
    // const token = await this.sdk.user.getXsollaUserToken(); ... open Xsolla pay station with token & sku ...
    return { ok: false, reason: 'not_configured' };
  },
};

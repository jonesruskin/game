// Portal abstraction: CrazyGames SDK v3, Poki SDK v2, or standalone (itch.io / own site / local dev).
// The build script injects the right SDK <script>. Every call is a safe no-op when unavailable.
export const Platform = {
  name: 'local', sdk: null, adsAvailable: false, purchasesAvailable: false, adPlaying: false, onMuteChange: null, _playing: false,
  async init() {
    const cg = window.CrazyGames && window.CrazyGames.SDK;
    try {
      if (cg) {
        await cg.init();
        if (cg.environment && cg.environment !== 'disabled') {
          this.name = 'crazygames'; this.sdk = cg; this.adsAvailable = true;
          try { cg.game.addSettingsChangeListener && cg.game.addSettingsChangeListener((s) => this.onMuteChange && this.onMuteChange(!!(s && s.muteAudio))); } catch (e) {}
          this.purchasesAvailable = false; // CrazyGames IAP (Xsolla) is invite-only; Starward sells nothing for real money
        }
      } else if (window.PokiSDK) {
        await window.PokiSDK.init().catch(() => {});
        this.name = 'poki'; this.sdk = window.PokiSDK; this.adsAvailable = true; this.purchasesAvailable = false;
      }
    } catch (e) { console.warn('SDK init failed, running standalone', e); this.name = 'local'; }
  },
  muteAudioSetting() { try { return this.name === 'crazygames' && !!this.sdk.game.settings.muteAudio; } catch (e) { return false; } },
  loadingStart() { try { if (this.name === 'crazygames') this.sdk.game.loadingStart(); } catch (e) {} },
  loadingStop() { try { if (this.name === 'crazygames') this.sdk.game.loadingStop(); else if (this.name === 'poki') this.sdk.gameLoadingFinished(); } catch (e) {} },
  gameplayStart() { if (this._playing) return; this._playing = true; try { if (this.name === 'crazygames') this.sdk.game.gameplayStart(); else if (this.name === 'poki') this.sdk.gameplayStart(); } catch (e) {} },
  gameplayStop() { if (!this._playing) return; this._playing = false; try { if (this.name === 'crazygames') this.sdk.game.gameplayStop(); else if (this.name === 'poki') this.sdk.gameplayStop(); } catch (e) {} },
  happytime() { try { if (this.name === 'crazygames') this.sdk.game.happytime(); } catch (e) {} },
  // midgame/commercial break at a natural pause. Resolves when finished either way.
  midgame(onStart) {
    return new Promise((res) => {
      if (!this.adsAvailable) return res(false);
      const done = (ok) => { this.adPlaying = false; res(ok); };
      try {
        if (this.name === 'crazygames') this.sdk.ad.requestAd('midgame', { adStarted: () => { this.adPlaying = true; onStart && onStart(); }, adFinished: () => done(true), adError: () => done(false) });
        else if (this.name === 'poki') this.sdk.commercialBreak(() => { this.adPlaying = true; onStart && onStart(); }).then(() => done(true)).catch(() => done(false));
        else res(false);
      } catch (e) { done(false); }
    });
  },
  // rewarded ad: resolves true ONLY when fully watched
  rewarded(onStart) {
    return new Promise((res) => {
      if (!this.adsAvailable) return res(false);
      const done = (ok) => { this.adPlaying = false; res(ok); };
      try {
        if (this.name === 'crazygames') this.sdk.ad.requestAd('rewarded', { adStarted: () => { this.adPlaying = true; onStart && onStart(); }, adFinished: () => done(true), adError: () => done(false) });
        else if (this.name === 'poki') this.sdk.rewardedBreak(() => { this.adPlaying = true; onStart && onStart(); }).then((ok) => done(!!ok)).catch(() => done(false));
        else res(false);
      } catch (e) { done(false); }
    });
  },
  // CrazyGames data module syncs saves across devices for logged-in players
  storage() {
    if (this.name === 'crazygames' && this.sdk && this.sdk.data) return { get: (k) => this.sdk.data.getItem(k), set: (k, v) => this.sdk.data.setItem(k, String(v)) };
    return { get: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };
  },
};

// itch.io / own site / local dev: no SDK, no ads, saves in localStorage.
import { PlatformAPI, local } from './types';
export const Platform: PlatformAPI = {
  name: 'web', adsAvailable: false, onMute: null,
  async init() {}, loadingStart() {}, loadingStop() {}, gameplayStart() {}, gameplayStop() {}, happytime() {},
  async rewarded() { return false; }, async midgame() { return false; },
  save: local.save, load: local.load, muted: () => false,
  notify() {}, cancelNotify() {},
};

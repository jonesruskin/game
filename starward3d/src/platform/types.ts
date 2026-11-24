// What the game needs from the outside world. Each build target implements it; nothing else in the game
// touches an SDK, so the CrazyGames, web and mobile builds stay separate and swappable.
export interface PlatformAPI {
  name: string;
  adsAvailable: boolean;
  init(): Promise<void>;
  loadingStart(): void;
  loadingStop(): void;
  gameplayStart(): void;
  gameplayStop(): void;
  happytime(): void;
  /** resolves true only when the rewarded ad was watched to the end */
  rewarded(onStart?: () => void): Promise<boolean>;
  midgame(onStart?: () => void): Promise<boolean>;
  save(key: string, data: string): void;
  load(key: string): string | null;
  muted(): boolean;
  onMute: ((m: boolean) => void) | null;
  /** schedule a local notification (mobile; no-op on the web) */
  notify(id: string, at: number, title: string, body: string): void;
  cancelNotify(id: string): void;
}
export const local = {
  save(key: string, data: string) { try { localStorage.setItem(key, data); } catch (e) { /* private mode */ } },
  load(key: string) { try { return localStorage.getItem(key); } catch (e) { return null; } },
};

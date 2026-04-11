'use client';

let masterVolume = 0.5;
let muted = false;

const audioCache: Record<string, HTMLAudioElement> = {};

function getAudio(path: string): HTMLAudioElement {
  if (!audioCache[path]) {
    audioCache[path] = new Audio(path);
  }
  return audioCache[path];
}

function play(path: string, volume: number = 1) {
  if (typeof window === 'undefined' || muted) return;
  try {
    const audio = getAudio(path);
    audio.volume = Math.max(0, Math.min(1, volume * masterVolume));
    audio.currentTime = 0;
    audio.play().catch(() => {});
  } catch {
    // silent fail
  }
}

export const SFX = {
  get muted() {
    return muted;
  },
  set muted(value: boolean) {
    muted = value;
  },

  setVolume(v: number) {
    masterVolume = Math.max(0, Math.min(1, v));
  },

  getVolume(): number {
    return masterVolume;
  },

  playerJoin()  { play('/sounds/player-join.mp3', 0.5) },
  gameStart()   { play('/sounds/game-start.mp3', 0.6) },
  drawCard()    { play('/sounds/draw-card.mp3', 0.4) },
  playCard()    { play('/sounds/play-card.mp3', 0.5) },
  uiClick()     { play('/sounds/ui-click.mp3', 0.3) },
  coinFlip()    { play('/sounds/coin-flip.mp3', 0.5) },
  diceRoll()    { play('/sounds/dice-roll.mp3', 0.5) },
  shuffle()     { play('/sounds/shuffle.mp3', 0.4) },
  tap()         { play('/sounds/tap.mp3', 0.4) },
};

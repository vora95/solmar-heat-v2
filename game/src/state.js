// state.js — the single shared game state: player, cash, wanted level,
// mission progress and the autosave. Every other module reads/writes S.
export const SAVE_KEY = 'solmar-heat-save-v1';

export const S = {
  mode: 'menu', // menu | play | pause | dead | busted | won
  time: 0,
  cash: 120,
  health: 100,
  wanted: 0,
  wantedHeat: 0, // 0..100, fills toward next star
  lastSeen: 0, // seconds since police last saw the player
  missionIndex: 0, // next mission to unlock (0..6)
  missionActive: null, // runtime mission object or null
  missionDone: [false, false, false, false, false, false],
  player: null, // {x,y,angle,speed,onFoot,car}
  cars: [], // all cars incl. player car and traffic
  peds: [],
  cops: [],
  enemies: [],
  bullets: [],
  pickups: [], // pistol + ammo crates
  particles: [],
  floats: [], // floating score text
  cam: { x: 0, y: 0 },
  scene: null,
  muted: false,
  stats: { stolen: 0, punches: 0, shots: 0, busted: 0 },
  msg: '',
  msgT: 0,
};

export function showMsg(text, seconds = 3) {
  S.msg = text.length > 110 ? text.slice(0, 107) + '…' : text;
  S.msgT = seconds;
}

export function addCash(n) {
  S.cash += n;
  showMsg((n >= 0 ? '+' : '') + '$' + Math.abs(n));
}

export function addWanted(n, reason) {
  const before = S.wanted;
  S.wantedHeat = Math.max(0, Math.min(100, S.wantedHeat + n));
  S.wanted = S.wantedHeat >= 90 ? 5 : S.wantedHeat >= 70 ? 4 : S.wantedHeat >= 50 ? 3
    : S.wantedHeat >= 30 ? 2 : S.wantedHeat >= 12 ? 1 : 0;
  if (S.wanted > before) showMsg('WANTED LEVEL ' + S.wanted + ' — ' + (reason || 'the law is on you'), 3);
  S.lastSeen = 0;
}

export function saveGame() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      cash: S.cash, missionIndex: S.missionIndex, missionDone: S.missionDone,
      stats: S.stats, px: S.player ? S.player.x : 1600, py: S.player ? S.player.y : 1500,
    }));
  } catch (e) { /* storage unavailable: play on without saving */ }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) { return null; }
}

export function resetRun() {
  S.time = 0; S.health = 100; S.wanted = 0; S.wantedHeat = 0; S.lastSeen = 0;
  S.missionActive = null; S.cops = []; S.enemies = []; S.bullets = [];
  S.particles = []; S.floats = []; S.mode = 'play';
}

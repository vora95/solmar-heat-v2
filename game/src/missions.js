// missions.js — six chained story missions for Rico, working for Mama Luz.
// Each mission: a title, a briefing, an objective marker and a win check.
// Completing one unlocks the next and pays cash; finishing all six wins the game.
import { S, addCash, showMsg, saveGame } from './state.js';
import { PLACES } from './city.js';

export const MISSIONS = [
  {
    id: 'first-wheels', title: '1 — First Wheels',
    brief: "Mama Luz needs wheels. Steal any car on the street and bring it to her house in Old Town. Press E near a car to take it.",
    objective: 'Steal a car and drive to Mama Luz',
    target: PLACES.luzHouse, radius: 90, reward: 200,
    check() { return S.player && !S.player.onFoot; },
  },
  {
    id: 'courier-run', title: '2 — Courier Run',
    brief: 'A package for the Marina Bay pier — 90 seconds on the clock. Drive fast, but the cops love a speeder. Grab the van at the market first if you want.',
    objective: 'Deliver the package to Marina Bay Pier (90s)',
    target: PLACES.marina, radius: 90, reward: 350, timeLimit: 90,
    check() { return true; },
  },
  {
    id: 'the-pickup', title: '3 — The Pickup',
    brief: 'Luz\'s cousin is waiting at Downtown Plaza. Pick him up and drive him to the Palm Heights villa. No scratches — he complains to Luz.',
    objective: 'Pick up the cousin, then drive to Palm Heights',
    target: PLACES.downtown, radius: 80, reward: 400,
    stages: ['Go to Downtown Plaza', 'Drive the cousin to Palm Heights'],
    check() { return true; },
  },
  {
    id: 'dockside-deal', title: '4 — Dockside Deal',
    brief: 'A rival crew is muscling in on Dock 7. Luz wants them gone. A pistol crate is waiting near the docks — take out the whole crew.',
    objective: 'Clear the rival crew at Dock 7',
    target: PLACES.docks, radius: 320, reward: 600,
    check() { return S.enemies.length === 0; },
  },
  {
    id: 'getaway-driver', title: '5 — Getaway Driver',
    brief: 'Luz just lifted a safe from a Downtown bank. Cops everywhere — wanted level 3 incoming. Lose them, then reach the Sunset Pier.',
    objective: 'Escape the police and reach Sunset Pier',
    target: PLACES.pier, radius: 90, reward: 800,
    check() { return S.wanted <= 1; },
  },
  {
    id: 'king-of-solmar', title: '6 — King of Solmar',
    brief: 'One last job: the rival boss is holding court at the Marina. Take his crew down, then stand on the pier as the new King of Solmar.',
    objective: 'Defeat the boss crew, then reach the Marina pier',
    target: PLACES.marina, radius: 90, reward: 1500,
    check() { return S.enemies.length === 0; },
  },
];

export function currentMission() {
  return S.missionIndex < MISSIONS.length ? MISSIONS[S.missionIndex] : null;
}

export function startMission(i) {
  const m = MISSIONS[i];
  if (!m) return;
  S.missionActive = { def: m, stage: 0, t: 0, started: true };
  showMsg(m.title + ' — ' + m.objective, 6);
  if (m.id === 'dockside-deal') {
    for (let k = 0; k < 4; k++) {
      S.enemies.push({ x: PLACES.docks.x - 120 + k * 80, y: PLACES.docks.y - 60 + (k % 2) * 120, hp: 60, angle: 0, aggro: false, shootT: 1, hasGun: true, dead: false });
    }
  }
  if (m.id === 'king-of-solmar') {
    for (let k = 0; k < 5; k++) {
      S.enemies.push({ x: PLACES.marina.x - 100 + k * 60, y: PLACES.marina.y - 80 + (k % 2) * 140, hp: k === 2 ? 140 : 60, angle: 0, aggro: false, shootT: 1, hasGun: true, dead: false });
    }
  }
  if (m.id === 'getaway-driver') {
    S.wantedHeat = 55; S.wanted = 3; S.lastSeen = 0;
    showMsg('The alarm is up — wanted level 3! Lose the cops!', 4);
  }
  saveGame();
}

export function missionMarker() {
  const a = S.missionActive;
  if (!a) return null;
  const m = a.def;
  if (m.id === 'the-pickup' && a.stage === 1) return PLACES.heights;
  return m.target;
}

export function missionObjectiveText() {
  const a = S.missionActive;
  if (!a) {
    const next = currentMission();
    return next ? 'Next: ' + next.title + ' — press M to start' : 'All missions complete!';
  }
  const m = a.def;
  if (m.stages) return m.stages[a.stage] || m.objective;
  return m.objective;
}

export function updateMissions(dt) {
  const a = S.missionActive;
  if (!a || S.mode !== 'play') return;
  a.t += dt;
  const m = a.def;
  const p = S.player;
  if (m.timeLimit && a.t > m.timeLimit) {
    S.missionActive = null;
    showMsg('Too slow! Courier Run failed — press M to try again.', 4);
    return;
  }
  const marker = missionMarker();
  const d = marker ? Math.hypot(p.x - marker.x, p.y - marker.y) : 1e9;
  if (m.id === 'the-pickup' && a.stage === 0 && d < m.radius) {
    a.stage = 1;
    showMsg('Cousin picked up! Now drive him to Palm Heights.', 3);
    return;
  }
  if (m.id === 'dockside-deal' || m.id === 'king-of-solmar') {
    if (S.enemies.length > 0) return;
    if (m.id === 'dockside-deal' && d > m.radius) return;
    if (m.id === 'king-of-solmar' && d > m.radius) return;
  } else if (d > m.radius) return;
  if (!m.check()) return;
  completeMission(m);
}

export function completeMission(m) {
  S.missionActive = null;
  S.missionDone[S.missionIndex] = true;
  S.missionIndex++;
  addCash(m.reward);
  showMsg('MISSION COMPLETE: ' + m.title + ' — $' + m.reward + ' earned!', 5);
  S.floats.push({ x: S.player.x, y: S.player.y - 40, text: 'MISSION COMPLETE +$' + m.reward, life: 2, color: '#ffd94a' });
  if (S.missionIndex >= MISSIONS.length) {
    S.mode = 'won';
    addCash(500);
  }
  saveGame();
}

// main.js — Solmar Heat bootstrap and game loop.
// Rico walks and drives around Solmar; the loop updates traffic, police,
// pedestrians, combat and missions, then renders one Canvas 2D frame.
import { S, saveGame, loadGame, resetRun, addWanted, showMsg } from './state.js';
import { WORLD, collidesBuilding } from './city.js';
import { spawnParkedCars, spawnTraffic, drivePlayer, nearestCar, updateTraffic } from './vehicles.js';
import { spawnPeds, updatePeds, updatePolice } from './people.js';
import { punch, shoot, updateCombat, spawnPistolPickup } from './combat.js';
import { startMission, updateMissions, currentMission } from './missions.js';
import { render } from './render.js';
import { input, bindInput, wasPressed, endFrame } from './input.js';
import { audio } from './audio.js';
import { applyScene } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
let W = 1280, H = 800;

function resize() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  W = window.innerWidth; H = window.innerHeight;
  canvas.width = Math.floor(W * dpr);
  canvas.height = Math.floor(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resize);
resize();
bindInput(canvas);

function newPlayer(x, y) {
  return { x, y, angle: -Math.PI / 2, speed: 0, onFoot: true, car: null, hasGun: false, ammo: 0, punchT: 0 };
}

function initWorld() {
  const save = loadGame();
  S.player = newPlayer(save ? save.px : 1060, save ? save.py : 480);
  if (save) {
    S.cash = save.cash; S.missionIndex = save.missionIndex;
    S.missionDone = save.missionDone || S.missionDone;
    S.stats = save.stats || S.stats;
  }
  spawnParkedCars();
  spawnTraffic(14);
  spawnPeds(26);
  spawnPistolPickup(2350, 1980);
  spawnPistolPickup(1275, 720);
}

function enterCar() {
  const p = S.player;
  const car = nearestCar(p.x, p.y, 75);
  if (!car) return;
  if (car.driver === 'traffic') {
    // Stealing a car with a driver inside: the driver bails, heat rises.
    car.driver = 'player';
    addWanted(12, 'grand theft auto');
    S.stats.stolen++;
    showMsg('You jacked a ' + car.model + '! The driver ran for the cops.', 3);
    audio.blip(220, 0.15, 0.1);
  } else if (car.driver === 'cop') {
    showMsg('That is a police cruiser — too hot to steal right now.', 2);
    return;
  } else {
    car.driver = 'player';
    addWanted(6, 'car theft');
    S.stats.stolen++;
    showMsg('You took the ' + car.model + '.', 2);
  }
  p.onFoot = false; p.car = car; p.x = car.x; p.y = car.y;
  audio.ensure();
}

function exitCar() {
  const p = S.player;
  if (!p.car) return;
  const car = p.car;
  car.driver = null; car.speed = 0;
  p.onFoot = true; p.car = null;
  p.x = car.x + Math.cos(car.angle + Math.PI / 2) * 34;
  p.y = car.y + Math.sin(car.angle + Math.PI / 2) * 34;
}

function updatePlayer(dt) {
  const p = S.player;
  if (p.onFoot) {
    const mx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const my = (input.down ? 1 : 0) - (input.up ? 1 : 0);
    if (mx || my) {
      const a = Math.atan2(my, mx);
      p.angle = a;
      const sp = 175;
      const nx = p.x + Math.cos(a) * sp * dt, ny = p.y + Math.sin(a) * sp * dt;
      if (!collidesBuilding(nx, p.y, 12)) p.x = nx;
      if (!collidesBuilding(p.x, ny, 12)) p.y = ny;
    }
    p.x = Math.max(130, Math.min(WORLD.w - 30, p.x));
    p.y = Math.max(30, Math.min(WORLD.h - 30, p.y));
  } else if (p.car) {
    const speed = drivePlayer(p.car, input, dt);
    // Screenshot scenes keep the car cruising so the shot shows motion.
    if ((S.scene === 'chase' || S.scene === 'drive') && Math.abs(p.car.speed) < 260) p.car.speed = 260;
    p.x = p.car.x; p.y = p.car.y; p.angle = p.car.angle;
    // Speeding past a cop car earns heat.
    if (Math.abs(p.car.speed) > 320) {
      for (const cop of S.cops) {
        if (Math.hypot(cop.car.x - p.x, cop.car.y - p.y) < 320) { addWanted(2 * dt, 'speeding'); break; }
      }
    }
    audio.setEngine(Math.abs(speed) / 420, true);
  } else {
    audio.setEngine(0, false);
  }
}

function update(dt) {
  S.time += dt;
  if (S.msgT > 0) S.msgT -= dt;
  updatePlayer(dt);
  updateTraffic(dt);
  updatePeds(dt);
  updatePolice(dt);
  updateCombat(dt);
  updateMissions(dt);
  audio.setSiren(S.wanted > 0, dt);
  if (S.health <= 0 && S.mode === 'play') S.mode = 'dead';
  // Autosave every 10 seconds of play.
  if (Math.floor(S.time) % 10 === 0 && Math.floor(S.time - dt) % 10 !== 0) saveGame();
}

function handleKeys() {
  if (wasPressed('Enter')) {
    audio.ensure();
    if (S.mode === 'menu') { resetRun(); S.mode = 'play'; showMsg('Welcome to Solmar, Rico. Press M to start your first mission.', 4); }
    else if (S.mode === 'dead' || S.mode === 'busted' || S.mode === 'won') {
      S.health = 100; S.wanted = 0; S.wantedHeat = 0;
      S.player.x = 1060; S.player.y = 480; S.player.onFoot = true; S.player.car = null;
      S.mode = 'play';
    }
  }
  if (wasPressed('KeyP') || wasPressed('Escape')) {
    if (S.mode === 'play') { S.mode = 'pause'; saveGame(); }
    else if (S.mode === 'pause') S.mode = 'play';
  }
  if (S.mode !== 'play') return;
  if (wasPressed('KeyE')) {
    if (S.player.onFoot) enterCar(); else exitCar();
  }
  if (wasPressed('KeyF')) punch();
  if (wasPressed('KeyG') && S.player.hasGun) {
    const wx = S.cam.x + input.mouseX, wy = S.cam.y + input.mouseY;
    shoot(wx, wy);
  }
  if (wasPressed('Mouse0') && S.player.hasGun && S.player.onFoot) {
    const wx = S.cam.x + input.mouseX, wy = S.cam.y + input.mouseY;
    shoot(wx, wy);
  }
  if (wasPressed('KeyM')) {
    const next = currentMission();
    if (next && !S.missionActive) { startMission(S.missionIndex); audio.jingle(); }
  }
  if (wasPressed('KeyN')) { audio.setMuted(!audio.muted); S.muted = audio.muted; }
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  handleKeys();
  if (S.mode === 'play') update(dt);
  render(ctx, W, H);
  statusEl.textContent = 'Solmar Heat — cash $' + S.cash + ', wanted ' + S.wanted + ' stars, mission ' + (S.missionIndex + 1) + ' of 6';
  endFrame();
  requestAnimationFrame(frame);
}

initWorld();
const params = new URLSearchParams(location.search);
const scene = params.get('scene') || params.get('shot');
if (scene) applyScene(scene);
requestAnimationFrame(frame);

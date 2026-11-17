// vehicles.js — five stealable car models and the traffic AI.
// Traffic follows the road grid, slows at intersections and never
// drives through buildings; the player car is just a car with a driver.
import { S } from './state.js';
import { ROADS_X, ROADS_Y, WORLD, nearestRoadX, nearestRoadY, collidesBuilding, mulberry32 } from './city.js';

export const CAR_MODELS = {
  sedan: { name: 'Solmar Sedan', top: 300, accel: 210, turn: 2.6, color: '#4a7fc9', len: 52, wid: 26 },
  taxi: { name: 'Bay Taxi', top: 290, accel: 220, turn: 2.7, color: '#e8c33a', len: 52, wid: 26 },
  pickup: { name: 'Dock Pickup', top: 270, accel: 190, turn: 2.3, color: '#7a5a3a', len: 56, wid: 28 },
  sport: { name: 'Vento Sport', top: 420, accel: 320, turn: 3.4, color: '#c93d3d', len: 54, wid: 26 },
  van: { name: 'Cargo Van', top: 230, accel: 150, turn: 2.0, color: '#8a8f96', len: 62, wid: 30 },
};

const MODEL_KEYS = Object.keys(CAR_MODELS);
const rnd = mulberry32(777);

export function makeCar(model, x, y, angle = 0, opts = {}) {
  const m = CAR_MODELS[model];
  return {
    model, x, y, angle, speed: 0, top: m.top, accel: m.accel, turn: m.turn,
    color: opts.color || m.color, len: m.len, wid: m.wid,
    driver: opts.driver || null, // 'player' | 'traffic' | 'cop' | null (parked)
    target: null, brake: false, honk: 0, stuck: 0,
  };
}

export function spawnParkedCars() {
  const spots = [
    ['sedan', 640, 200], ['taxi', 1060, 130], ['pickup', 1480, 520], ['sport', 2125, 200],
    ['van', 2550, 520], ['sedan', 2975, 200], ['taxi', 2125, 850], ['pickup', 640, 850],
    ['sport', 2975, 1170], ['sedan', 1700, 1170], ['van', 1060, 1170], ['taxi', 2550, 1170],
    ['pickup', 700, 2050], ['van', 1500, 2200], ['sedan', 2900, 2050],
  ];
  for (const [model, x, y] of spots) S.cars.push(makeCar(model, x, y, (rnd() > 0.5 ? 0 : Math.PI / 2)));
}

export function spawnTraffic(n = 14) {
  for (let i = 0; i < n; i++) {
    const model = MODEL_KEYS[Math.floor(rnd() * MODEL_KEYS.length)];
    const vertical = rnd() > 0.5;
    const x = vertical ? ROADS_X[Math.floor(rnd() * ROADS_X.length)] : 200 + rnd() * (WORLD.w - 400);
    const y = vertical ? 200 + rnd() * (WORLD.h - 400) : ROADS_Y[Math.floor(rnd() * ROADS_Y.length)];
    const car = makeCar(model, x, y, vertical ? Math.PI / 2 : 0, { driver: 'traffic' });
    car.speed = 90 + rnd() * 60;
    car.target = pickTarget(car);
    S.cars.push(car);
  }
}

function pickTarget(car) {
  // Next intersection along the current heading, then a random turn.
  const vertical = Math.abs(Math.sin(car.angle)) > 0.7;
  if (vertical) {
    const dir = Math.sin(car.angle) > 0 ? 1 : -1;
    const ys = ROADS_Y.filter((y) => (dir > 0 ? y > car.y + 40 : y < car.y - 40));
    const ty = ys.length ? ys[0] : (dir > 0 ? ROADS_Y[ROADS_Y.length - 1] : ROADS_Y[0]);
    return { x: nearestRoadX(car.x), y: ty, turn: rnd() > 0.4 };
  }
  const dir = Math.cos(car.angle) > 0 ? 1 : -1;
  const xs = ROADS_X.filter((x) => (dir > 0 ? x > car.x + 40 : x < car.x - 40));
  const tx = xs.length ? xs[0] : (dir > 0 ? ROADS_X[ROADS_X.length - 1] : ROADS_X[0]);
  return { x: tx, y: nearestRoadY(car.y), turn: rnd() > 0.4 };
}

export function updateTraffic(dt) {
  for (const car of S.cars) {
    if (car.driver !== 'traffic') continue;
    // Slow for the car ahead and near intersections.
    let want = car.top * 0.55;
    const ahead = 70;
    const ax = car.x + Math.cos(car.angle) * ahead, ay = car.y + Math.sin(car.angle) * ahead;
    for (const o of S.cars) {
      if (o === car) continue;
      if (Math.hypot(o.x - ax, o.y - ay) < 46) { want = 0; break; }
    }
    if (car.target && Math.hypot(car.target.x - car.x, car.target.y - car.y) < 60) want = Math.min(want, 70);
    car.speed += Math.sign(want - car.speed) * Math.min(Math.abs(want - car.speed), 160 * dt);
    if (car.speed < 2 && car.target) {
      // Arrived: pick a new leg (turn or go straight).
      const t = car.target;
      if (t.turn) car.angle = Math.abs(Math.sin(car.angle)) > 0.7 ? (rnd() > 0.5 ? 0 : Math.PI) : (rnd() > 0.5 ? Math.PI / 2 : -Math.PI / 2);
      car.target = pickTarget(car);
    }
    const nx = car.x + Math.cos(car.angle) * car.speed * dt;
    const ny = car.y + Math.sin(car.angle) * car.speed * dt;
    if (!collidesBuilding(nx, ny, 20)) { car.x = nx; car.y = ny; }
    else { car.angle += Math.PI / 2; car.target = pickTarget(car); }
    car.x = Math.max(60, Math.min(WORLD.w - 60, car.x));
    car.y = Math.max(60, Math.min(WORLD.h - 60, car.y));
  }
}

// Player driving: arcade handling with drift on handbrake.
export function drivePlayer(car, input, dt) {
  const m = CAR_MODELS[car.model];
  const fwd = (input.up ? 1 : 0) - (input.down ? 0.6 : 0);
  car.speed += fwd * m.accel * dt;
  car.speed -= car.speed * (input.handbrake ? 2.2 : 0.55) * dt;
  if (Math.abs(car.speed) < 4 && !input.up) car.speed = 0;
  car.speed = Math.max(-m.top * 0.35, Math.min(m.top, car.speed));
  const steer = (input.left ? -1 : 0) + (input.right ? 1 : 0);
  const grip = input.handbrake ? 1.6 : 1;
  car.angle += steer * m.turn * grip * dt * Math.sign(car.speed || 1) * Math.min(1, Math.abs(car.speed) / 120 + 0.25);
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  if (collidesBuilding(nx, car.y, 20)) { car.speed *= -0.25; }
  else car.x = nx;
  if (collidesBuilding(car.x, ny, 20)) { car.speed *= -0.25; }
  else car.y = ny;
  car.x = Math.max(50, Math.min(WORLD.w - 50, car.x));
  car.y = Math.max(50, Math.min(WORLD.h - 50, car.y));
  return Math.abs(car.speed);
}

export function nearestCar(x, y, maxD = 70) {
  let best = null, bd = maxD;
  for (const c of S.cars) {
    const d = Math.hypot(c.x - x, c.y - y);
    if (d < bd) { bd = d; best = c; }
  }
  return best;
}

// people.js — pedestrians who stroll the sidewalks and flee danger,
// and the Solmar police: spawn by wanted level, chase, ram and arrest.
import { S, addWanted, showMsg } from './state.js';
import { WORLD, nearestRoadX, nearestRoadY, collidesBuilding, mulberry32 } from './city.js';
import { makeCar } from './vehicles.js';

const rnd = mulberry32(4242);
const PED_COLORS = ['#e8b04b', '#7fb069', '#c96a8a', '#5b8dd9', '#d96a3d', '#8a6fd9', '#3da8a0'];

export function spawnPeds(n = 26) {
  for (let i = 0; i < n; i++) {
    const vertical = rnd() > 0.5;
    const x = vertical ? nearestRoadX(200 + rnd() * (WORLD.w - 400)) + (rnd() > 0.5 ? 52 : -52)
      : 200 + rnd() * (WORLD.w - 400);
    const y = vertical ? 200 + rnd() * (WORLD.h - 400)
      : nearestRoadY(200 + rnd() * (WORLD.h - 400)) + (rnd() > 0.5 ? 52 : -52);
    S.peds.push({
      x, y, angle: rnd() * Math.PI * 2, speed: 28 + rnd() * 22,
      color: PED_COLORS[Math.floor(rnd() * PED_COLORS.length)],
      flee: 0, panic: 0, walkT: 1 + rnd() * 4,
    });
  }
}

export function updatePeds(dt) {
  const p = S.player;
  const danger = S.wanted >= 2 || S.bullets.length > 0;
  for (const ped of S.peds) {
    let fleeX = 0, fleeY = 0;
    if (p) {
      const d = Math.hypot(p.x - ped.x, p.y - ped.y);
      const speeding = !p.onFoot && p.car && Math.abs(p.car.speed) > 180;
      if ((d < 160 && (danger || speeding)) || d < 60) {
        fleeX = (ped.x - p.x) / (d || 1); fleeY = (ped.y - p.y) / (d || 1);
        ped.panic = 1.5;
      }
    }
    ped.walkT -= dt;
    if (ped.walkT <= 0) { ped.angle = rnd() * Math.PI * 2; ped.walkT = 2 + rnd() * 4; }
    let vx, vy, sp = ped.speed;
    if (ped.panic > 0) { ped.panic -= dt; vx = fleeX; vy = fleeY; sp = 130; }
    else { vx = Math.cos(ped.angle); vy = Math.sin(ped.angle); }
    const nx = ped.x + vx * sp * dt, ny = ped.y + vy * sp * dt;
    if (!collidesBuilding(nx, ny, 8) && nx > 40 && nx < WORLD.w - 40 && ny > 40 && ny < WORLD.h - 40) {
      ped.x = nx; ped.y = ny;
      if (ped.panic <= 0) ped.angle = Math.atan2(vy, vx);
    } else ped.walkT = 0;
  }
}

// --- Police ---
export function wantedCopTarget() {
  return 1 + S.wanted; // wanted 1 -> 2 cars, wanted 5 -> 6 cars
}

export function updatePolice(dt) {
  const p = S.player;
  if (!p) return;
  // Decay: lie low and the heat fades, faster at low wanted levels.
  if (S.wanted > 0) {
    S.lastSeen += dt;
    if (S.lastSeen > 14) {
      S.wantedHeat = Math.max(0, S.wantedHeat - dt * (S.wanted >= 3 ? 1.2 : 3));
      S.wanted = S.wantedHeat >= 90 ? 5 : S.wantedHeat >= 70 ? 4 : S.wantedHeat >= 50 ? 3
        : S.wantedHeat >= 30 ? 2 : S.wantedHeat >= 12 ? 1 : 0;
      if (S.wanted === 0) showMsg('You lost the cops. Heat is off.', 3);
    }
  }
  const want = S.wanted > 0 ? wantedCopTarget() : 0;
  // Spawn cruisers off-screen near the player.
  while (S.cops.length < want) {
    const a = rnd() * Math.PI * 2;
    const x = Math.max(80, Math.min(WORLD.w - 80, p.x + Math.cos(a) * 700));
    const y = Math.max(80, Math.min(WORLD.h - 80, p.y + Math.sin(a) * 700));
    const car = makeCar('sedan', x, y, 0, { color: '#222831', driver: 'cop' });
    car.top = 330 + S.wanted * 12;
    S.cars.push(car);
    S.cops.push({ car, ramT: 0, siren: rnd() });
  }
  // Despawn extras when heat drops.
  while (S.cops.length > want) {
    const cop = S.cops.pop();
    const i = S.cars.indexOf(cop.car);
    if (i >= 0) S.cars.splice(i, 1);
  }
  for (const cop of S.cops) {
    const car = cop.car;
    const dx = p.x - car.x, dy = p.y - car.y;
    const d = Math.hypot(dx, dy);
    const wantAngle = Math.atan2(dy, dx);
    let diff = wantAngle - car.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    car.angle += Math.max(-2.8 * dt, Math.min(2.8 * dt, diff));
    const targetSpeed = d > 260 ? car.top : d > 60 ? car.top * 0.7 : 60;
    car.speed += Math.sign(targetSpeed - car.speed) * Math.min(Math.abs(targetSpeed - car.speed), 300 * dt);
    const nx = car.x + Math.cos(car.angle) * car.speed * dt;
    const ny = car.y + Math.sin(car.angle) * car.speed * dt;
    if (!collidesBuilding(nx, ny, 20)) { car.x = nx; car.y = ny; }
    else if (!collidesBuilding(nx, car.y, 20)) { car.x = nx; car.angle += 0.6 * dt * 10; }
    else if (!collidesBuilding(car.x, ny, 20)) { car.y = ny; car.angle -= 0.6 * dt * 10; }
    else car.angle += Math.PI / 3 * dt * 4; // blocked head-on: swing around the building
    // Ram the player car / knock the player down.
    if (d < 52) {
      S.lastSeen = 0;
      if (p.onFoot) {
        if (Math.abs(car.speed) > 40) { S.health -= 14 * dt * 4; }
        if (S.health <= 0) return;
        // Busted on foot when a cruiser sits on you at low health or long contact.
        cop.ramT += dt;
        if (cop.ramT > 2.2) { bustPlayer(); return; }
      } else if (p.car) {
        p.car.speed *= 0.94;
        car.speed *= 0.9;
        if (Math.abs(p.car.speed) < 25) {
          cop.ramT += dt;
          if (cop.ramT > 3) { bustPlayer(); return; }
        }
      }
    } else cop.ramT = Math.max(0, cop.ramT - dt);
    // Wanted 5: roadblock cruisers park ahead of the player.
    if (S.wanted >= 5 && d > 300 && rnd() < dt * 0.05) {
      const bx = p.x + Math.cos(p.angle || 0) * 260, by = p.y + Math.sin(p.angle || 0) * 260;
      const block = makeCar('sedan', bx, by, (p.angle || 0) + Math.PI / 2, { color: '#222831', driver: 'cop' });
      S.cars.push(block);
      S.cops.push({ car: block, ramT: 0, siren: 0 });
    }
  }
}

function bustPlayer() {
  S.mode = 'busted';
  S.stats.busted++;
  S.cash = Math.max(0, S.cash - 150);
  showMsg('BUSTED! The Solmar PD took $150 bail money.');
}

// shots.js — dev scene hooks for screenshots: ?scene=chase|drive|mission|foot
// (and ?shot= as an alias). Each scene drops Rico into a live moment of the
// game with the HUD, minimap and a mission objective already on screen.
// Positions sit ON roads (grid lines x=1912/2337, y=812/2112) so no car
// ever spawns inside a building.
import { S, resetRun } from './state.js';
import { startMission } from './missions.js';
import { makeCar } from './vehicles.js';
import { spawnPistolPickup } from './combat.js';
import { PLACES } from './city.js';

export function applyScene(name) {
  resetRun();
  S.scene = name;
  const p = S.player;
  if (name === 'chase') {
    // Rico in a red sport car racing east along the Downtown road,
    // three cruisers on his tail, wanted 3.
    const car = makeCar('sport', 1912, 812, 0, { driver: 'player' });
    car.speed = 300;
    S.cars.push(car);
    p.onFoot = false; p.car = car; p.x = car.x; p.y = car.y;
    S.wantedHeat = 55; S.wanted = 3;
    startMission(1); // Courier Run: timer + objective visible
    S.missionActive.t = 12;
    // Two cruisers already on the player's tail, on the same road.
    for (const dx of [300, 540]) {
      const cop = makeCar('sedan', 1912 - dx, 812, 0, { color: '#222831', driver: 'cop' });
      cop.top = 370; cop.speed = 330;
      S.cars.push(cop);
      S.cops.push({ car: cop, ramT: 0, siren: 0 });
    }
  } else if (name === 'drive') {
    const car = makeCar('taxi', 2337, 812, Math.PI / 2, { driver: 'player' });
    car.speed = 220;
    S.cars.push(car);
    p.onFoot = false; p.car = car; p.x = car.x; p.y = car.y;
    startMission(0);
  } else if (name === 'mission') {
    // Dockside Deal: rival crew + pistol in hand at the docks.
    p.x = 2337; p.y = 2112; p.onFoot = true; p.angle = Math.PI / 4;
    p.hasGun = true; p.ammo = 18;
    spawnPistolPickup(2380, 2140);
    startMission(3);
  } else if (name === 'foot') {
    // On foot in Old Town market, traffic rolling past.
    p.x = 1275; p.y = 812; p.onFoot = true; p.angle = 0;
    startMission(0);
  }
  S.mode = 'play';
}

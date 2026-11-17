// city.js — Solmar, a coastal city of five districts on one road grid.
// Deterministic layout (seeded RNG) so every run has the same streets.
export const WORLD = { w: 3400, h: 2600 };

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const DISTRICTS = [
  { name: 'Marina Bay', x: 0, y: 0, w: 850, h: 1300, ground: '#c9b183', accent: '#2e7f9e', label: 'MARINA BAY' },
  { name: 'Old Town', x: 850, y: 0, w: 850, h: 1300, ground: '#b99c6e', accent: '#c96a2e', label: 'OLD TOWN' },
  { name: 'Downtown', x: 1700, y: 0, w: 850, h: 1300, ground: '#8d99a8', accent: '#3b5bdb', label: 'DOWNTOWN' },
  { name: 'Palm Heights', x: 2550, y: 0, w: 850, h: 1300, ground: '#7fae6a', accent: '#e8a13c', label: 'PALM HEIGHTS' },
  { name: 'Industrial Docks', x: 0, y: 1300, w: 3400, h: 1300, ground: '#6e6a63', accent: '#d8b13a', label: 'INDUSTRIAL DOCKS' },
];

export function districtAt(x, y) {
  for (const d of DISTRICTS) if (x >= d.x && x < d.x + d.w && y >= d.y && y < d.y + d.h) return d;
  return DISTRICTS[0];
}

// Road centre-lines: verticals every 425px, horizontals every 325px.
export const ROADS_X = [];
for (let x = 212; x < WORLD.w; x += 425) ROADS_X.push(x);
export const ROADS_Y = [];
for (let y = 162; y < WORLD.h; y += 325) ROADS_Y.push(y);
export const ROAD_HALF = 34;

export function nearestRoadX(x) {
  let best = ROADS_X[0], bd = 1e9;
  for (const rx of ROADS_X) { const d = Math.abs(rx - x); if (d < bd) { bd = d; best = rx; } }
  return best;
}
export function nearestRoadY(y) {
  let best = ROADS_Y[0], bd = 1e9;
  for (const ry of ROADS_Y) { const d = Math.abs(ry - y); if (d < bd) { bd = d; best = ry; } }
  return best;
}
export function onRoad(x, y) {
  return Math.abs(x - nearestRoadX(x)) < ROAD_HALF + 6 || Math.abs(y - nearestRoadY(y)) < ROAD_HALF + 6;
}
export function distToRoad(x, y) {
  return Math.min(Math.abs(x - nearestRoadX(x)), Math.abs(y - nearestRoadY(y)));
}

// Buildings fill the blocks between roads; docks get container yards instead.
export const BUILDINGS = [];
export const CONTAINERS = [];
(function buildCity() {
  const rnd = mulberry32(20261118);
  for (let ix = 0; ix < ROADS_X.length - 1; ix++) {
    for (let iy = 0; iy < ROADS_Y.length - 1; iy++) {
      const x0 = ROADS_X[ix] + ROAD_HALF + 14, x1 = ROADS_X[ix + 1] - ROAD_HALF - 14;
      const y0 = ROADS_Y[iy] + ROAD_HALF + 14, y1 = ROADS_Y[iy + 1] - ROAD_HALF - 14;
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
      const d = districtAt(cx, cy);
      if (d.name === 'Industrial Docks') {
        for (let k = 0; k < 5; k++) {
          CONTAINERS.push({
            x: x0 + 10 + rnd() * (x1 - x0 - 90), y: y0 + 10 + rnd() * (y1 - y0 - 40),
            w: 62 + rnd() * 30, h: 26,
            color: ['#c94f3d', '#3d7fc9', '#d8b13a', '#4f9e57', '#8a5fc9'][Math.floor(rnd() * 5)],
          });
        }
        continue;
      }
      const tall = d.name === 'Downtown';
      const n = tall ? 1 : 2 + Math.floor(rnd() * 2);
      for (let k = 0; k < n; k++) {
        const w = tall ? 150 + rnd() * 60 : 70 + rnd() * 90;
        const h = tall ? 150 + rnd() * 60 : 60 + rnd() * 80;
        const bx = x0 + rnd() * Math.max(1, x1 - x0 - w);
        const by = y0 + rnd() * Math.max(1, y1 - y0 - h);
        BUILDINGS.push({
          x: bx, y: by, w, h, tall,
          color: tall ? ['#5a6b80', '#46586e', '#6e7f95'][Math.floor(rnd() * 3)]
            : ['#d8c49a', '#c9a06a', '#e0d3b3', '#b98d5f', '#a8c686'][Math.floor(rnd() * 5)],
          roof: rnd() > 0.5,
        });
      }
      // Palm Heights gets palm trees, Marina gets a pier strip.
      if (d.name === 'Palm Heights') {
        for (let k = 0; k < 3; k++) BUILDINGS.push({ x: x0 + rnd() * (x1 - x0), y: y0 + rnd() * (y1 - y0), w: 10, h: 10, tall: false, palm: true, color: '#2f7d3a', roof: false });
      }
    }
  }
})();

export function collidesBuilding(x, y, r) {
  for (const b of BUILDINGS) {
    if (b.palm) continue;
    if (x + r > b.x && x - r < b.x + b.w && y + r > b.y && y - r < b.y + b.h) return b;
  }
  for (const c of CONTAINERS) {
    if (x + r > c.x && x - r < c.x + c.w && y + r > c.y && y - r < c.y + c.h) return c;
  }
  return null;
}

// Fixed story locations.
export const PLACES = {
  luzHouse: { x: 1060, y: 480, label: "Mama Luz's House" },
  marina: { x: 300, y: 900, label: 'Marina Bay Pier' },
  market: { x: 1275, y: 800, label: 'Old Town Market' },
  docks: { x: 2400, y: 2050, label: 'Dock 7 — Industrial Docks' },
  downtown: { x: 2125, y: 650, label: 'Downtown Plaza' },
  heights: { x: 2975, y: 650, label: 'Palm Heights Villa' },
  pier: { x: 180, y: 1150, label: 'Sunset Pier' },
};

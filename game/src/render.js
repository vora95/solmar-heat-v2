// render.js — draws the whole of Solmar on one Canvas 2D: sun-soaked
// streets, districts, cars, people, police lights, HUD and minimap.
import { S } from './state.js';
import { WORLD, DISTRICTS, ROADS_X, ROADS_Y, ROAD_HALF, BUILDINGS, CONTAINERS, districtAt, PLACES } from './city.js';
import { CAR_MODELS } from './vehicles.js';
import { MISSIONS, missionMarker, missionObjectiveText, currentMission } from './missions.js';

export function drawCar(ctx, car) {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  const m = CAR_MODELS[car.model];
  const L = m.len, W = m.wid;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(-L / 2 + 3, -W / 2 + 4, L, W);
  ctx.fillStyle = car.color;
  roundRect(ctx, -L / 2, -W / 2, L, W, 8); ctx.fill();
  ctx.fillStyle = '#1d2733';
  roundRect(ctx, -L * 0.18, -W / 2 + 4, L * 0.32, W - 8, 5); ctx.fill(); // cabin
  ctx.fillStyle = '#cfe8ff';
  roundRect(ctx, L * 0.28, -W / 2 + 4, 6, W - 8, 3); ctx.fill(); // windshield
  ctx.fillStyle = '#fff8c9';
  ctx.fillRect(L / 2 - 3, -W / 2 + 2, 3, 6); ctx.fillRect(L / 2 - 3, W / 2 - 8, 3, 6);
  ctx.fillStyle = '#ff4444';
  ctx.fillRect(-L / 2, -W / 2 + 2, 3, 6); ctx.fillRect(-L / 2, W / 2 - 8, 3, 6);
  if (car.model === 'taxi') { ctx.fillStyle = '#222'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('TAXI', 0, 3); }
  if (car.driver === 'cop') {
    ctx.fillStyle = '#fff'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('PD', 0, 3);
    const t = S.time * 6;
    ctx.fillStyle = Math.sin(t) > 0 ? '#ff2222' : '#2266ff';
    ctx.beginPath(); ctx.arc(-L * 0.18, 0, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = Math.sin(t) > 0 ? '#2266ff' : '#ff2222';
    ctx.beginPath(); ctx.arc(L * 0.1, 0, 5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawPerson(ctx, x, y, angle, color, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(2, 3, 9 * scale, 6 * scale, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(0, 0, 8 * scale, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f2c89b';
  ctx.beginPath(); ctx.arc(6 * scale, 0, 4 * scale, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

export function render(ctx, W, H) {
  const p = S.player;
  const camX = p ? p.x - W / 2 : WORLD.w / 2 - W / 2;
  const camY = p ? p.y - H / 2 : WORLD.h / 2 - H / 2;
  S.cam.x = camX; S.cam.y = camY;
  ctx.fillStyle = '#0b1622';
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.translate(-camX, -camY);

  // Sea along the west edge + beach.
  ctx.fillStyle = '#2e7f9e';
  ctx.fillRect(camX - 40, camY - 40, 130, H + 80);
  ctx.fillStyle = '#e8d9a8';
  ctx.fillRect(camX + 88, camY - 40, 26, H + 80);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  for (let i = 0; i < 8; i++) {
    const wy = camY + ((i * 173 + Math.floor(S.time * 30)) % (H + 120)) - 60;
    ctx.fillRect(camX + 10, wy, 90, 3);
  }

  // District ground.
  for (const d of DISTRICTS) {
    ctx.fillStyle = d.ground;
    ctx.fillRect(d.x, d.y, d.w, d.h);
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    ctx.fillRect(d.x, d.y + d.h - 4, d.w, 4);
  }
  // Palm Heights lawns.
  ctx.fillStyle = '#6da35a';
  for (let i = 0; i < 12; i++) ctx.fillRect(2620 + (i % 4) * 190, 120 + Math.floor(i / 4) * 380, 120, 90);

  // Roads.
  for (const rx of ROADS_X) { ctx.fillStyle = '#3a3f46'; ctx.fillRect(rx - ROAD_HALF, 0, ROAD_HALF * 2, WORLD.h); }
  for (const ry of ROADS_Y) { ctx.fillStyle = '#3a3f46'; ctx.fillRect(0, ry - ROAD_HALF, WORLD.w, ROAD_HALF * 2); }
  ctx.fillStyle = '#e8c33a';
  for (const rx of ROADS_X) for (let y = 0; y < WORLD.h; y += 48) ctx.fillRect(rx - 2, y, 4, 24);
  for (const ry of ROADS_Y) for (let x = 0; x < WORLD.w; x += 48) ctx.fillRect(x, ry - 2, 24, 4);
  // Crosswalks.
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  for (const rx of ROADS_X) for (const ry of ROADS_Y) {
    for (let k = -3; k <= 3; k++) ctx.fillRect(rx + k * 9 - 3, ry - ROAD_HALF + 4, 6, 12);
  }

  // Containers in the docks.
  for (const c of CONTAINERS) {
    ctx.fillStyle = c.color; ctx.fillRect(c.x, c.y, c.w, c.h);
    ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.strokeRect(c.x, c.y, c.w, c.h);
  }
  // Buildings with roofs / windows; Downtown towers cast long shadows.
  for (const b of BUILDINGS) {
    if (b.palm) {
      ctx.fillStyle = '#7a5230'; ctx.fillRect(b.x - 2, b.y - 2, 4, 12);
      ctx.fillStyle = '#2f9e44';
      ctx.beginPath(); ctx.arc(b.x, b.y - 6, 11, 0, Math.PI * 2); ctx.fill();
      continue;
    }
    if (b.tall) { ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(b.x + 14, b.y + 16, b.w, b.h); }
    ctx.fillStyle = b.color; ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.strokeRect(b.x, b.y, b.w, b.h);
    if (b.tall) {
      ctx.fillStyle = 'rgba(180,220,255,0.7)';
      for (let wy = b.y + 12; wy < b.y + b.h - 10; wy += 22)
        for (let wx = b.x + 10; wx < b.x + b.w - 10; wx += 20) ctx.fillRect(wx, wy, 10, 12);
    } else if (b.roof) {
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.fillRect(b.x + 6, b.y + 6, b.w - 12, b.h - 12);
    }
  }

  // District labels on the ground.
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = 'bold 26px sans-serif'; ctx.textAlign = 'center';
  for (const d of DISTRICTS) ctx.fillText(d.label, d.x + d.w / 2, d.y + d.h / 2);

  // Mission marker: bouncing gold diamond + beacon.
  const marker = missionMarker();
  if (marker && S.mode === 'play') {
    const bob = Math.sin(S.time * 4) * 8;
    ctx.fillStyle = 'rgba(255,217,74,0.25)';
    ctx.beginPath(); ctx.arc(marker.x, marker.y, 46 + Math.sin(S.time * 3) * 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffd94a';
    ctx.save(); ctx.translate(marker.x, marker.y + bob - 30); ctx.rotate(Math.PI / 4);
    ctx.fillRect(-12, -12, 24, 24); ctx.restore();
    ctx.strokeStyle = '#ffd94a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(marker.x, marker.y - 18 + bob); ctx.lineTo(marker.x, marker.y); ctx.stroke();
  }

  // Pickups.
  for (const pk of S.pickups) {
    ctx.fillStyle = pk.kind === 'pistol' ? '#ffd94a' : '#7dff8a';
    ctx.fillRect(pk.x - 12, pk.y - 12, 24, 24);
    ctx.fillStyle = '#222'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(pk.kind === 'pistol' ? 'GUN' : 'AMMO', pk.x, pk.y + 4);
  }

  // Pedestrians, enemies, bullets, particles.
  for (const ped of S.peds) drawPerson(ctx, ped.x, ped.y, ped.angle, ped.color);
  for (const e of S.enemies) {
    drawPerson(ctx, e.x, e.y, e.angle, '#c93d3d', 1.15);
    ctx.fillStyle = '#222'; ctx.fillRect(e.x - 14, e.y - 20, 28, 5);
    ctx.fillStyle = '#ff4444'; ctx.fillRect(e.x - 14, e.y - 20, 28 * Math.max(0, e.hp / 100), 5);
  }
  for (const car of S.cars) drawCar(ctx, car);
  if (p) {
    if (p.onFoot) {
      drawPerson(ctx, p.x, p.y, p.angle, '#2b6cb0', 1.2);
      ctx.fillStyle = '#ffd94a'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('RICO', p.x, p.y - 18);
      if (p.punchT > 0) {
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(p.x + Math.cos(p.angle) * 26, p.y + Math.sin(p.angle) * 26, 9, 0, Math.PI * 2); ctx.fill();
      }
    }
  }
  ctx.fillStyle = '#ffe9a8';
  for (const b of S.bullets) { ctx.beginPath(); ctx.arc(b.x, b.y, 3, 0, Math.PI * 2); ctx.fill(); }
  for (const pt of S.particles) {
    ctx.globalAlpha = Math.max(0, pt.life / pt.max);
    ctx.fillStyle = pt.color;
    ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center';
  for (const f of S.floats) {
    ctx.globalAlpha = Math.min(1, f.life);
    ctx.fillStyle = f.color; ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  if (S.mode === 'menu') drawMenu(ctx, W, H);
  else if (S.mode === 'pause') { drawHud(ctx, W, H); drawPause(ctx, W, H); }
  else if (S.mode === 'dead') drawEnd(ctx, W, H, 'WASTED', 'Rico got taken down. The streets of Solmar are unforgiving.');
  else if (S.mode === 'busted') drawEnd(ctx, W, H, 'BUSTED', 'The Solmar PD caught Rico. $150 bail, and the heat is off... for now.');
  else if (S.mode === 'won') drawEnd(ctx, W, H, 'KING OF SOLMAR', 'All six missions complete. Rico runs this city now.');
  else drawHud(ctx, W, H);
}

function drawHud(ctx, W, H) {
  const p = S.player;
  // Wanted stars.
  ctx.textAlign = 'left';
  for (let i = 0; i < 5; i++) {
    ctx.font = '28px sans-serif';
    ctx.fillStyle = i < S.wanted ? '#ffd94a' : 'rgba(255,255,255,0.25)';
    ctx.fillText('★', 16 + i * 30, 40);
  }
  // Health bar.
  ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(14, 52, 170, 16);
  ctx.fillStyle = S.health > 40 ? '#4ade80' : '#ff4444';
  ctx.fillRect(16, 54, 166 * Math.max(0, S.health / 100), 12);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 11px sans-serif';
  ctx.fillText('HP ' + Math.max(0, Math.ceil(S.health)), 20, 63);
  // Cash.
  ctx.fillStyle = '#7dff8a'; ctx.font = 'bold 22px sans-serif';
  ctx.fillText('$' + S.cash.toLocaleString('en-US'), 16, 96);
  // Ammo / weapon.
  ctx.fillStyle = '#fff'; ctx.font = '13px sans-serif';
  ctx.fillText(p && p.hasGun ? '🔫 Ammo ' + p.ammo + '  (G / click to shoot)' : 'Fists only — find a yellow GUN crate', 16, 118);
  // Objective.
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  const obj = missionObjectiveText();
  ctx.fillRect(14, H - 66, Math.min(W - 260, 34 + obj.length * 7.2), 52);
  ctx.fillStyle = '#ffd94a'; ctx.font = 'bold 14px sans-serif';
  ctx.fillText('OBJECTIVE', 24, H - 46);
  ctx.fillStyle = '#fff'; ctx.font = '13px sans-serif';
  ctx.fillText(obj, 24, H - 26);
  // Mission timer, under the minimap so it never overlaps it.
  const a = S.missionActive;
  if (a && a.def.timeLimit) {
    ctx.fillStyle = '#ff8888'; ctx.font = 'bold 20px sans-serif'; ctx.textAlign = 'right';
    ctx.fillText('⏱ ' + Math.max(0, Math.ceil(a.def.timeLimit - a.t)) + 's', W - 16, 188);
    ctx.textAlign = 'left';
  }
  // Speed when driving.
  if (p && !p.onFoot && p.car) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(W - 240, H - 66, 226, 52);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 24px sans-serif'; ctx.textAlign = 'right';
    ctx.fillText(Math.round(Math.abs(p.car.speed) * 0.55) + ' km/h', W - 30, H - 30);
    ctx.font = '12px sans-serif'; ctx.fillStyle = '#ffd94a';
    ctx.fillText(CAR_MODELS[p.car.model].name, W - 30, H - 52);
    ctx.textAlign = 'left';
  }
  // Toast message.
  if (S.msgT > 0 && S.msg) {
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(W / 2 - 260, 14, 520, 34);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(S.msg, W / 2, 36);
    ctx.textAlign = 'left';
  }
  drawMinimap(ctx, W, H);
}

function drawMinimap(ctx, W, H) {
  const mw = 190, mh = 145, mx = W - mw - 14, my = 14;
  const sx = mw / WORLD.w, sy = mh / WORLD.h;
  ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(mx - 4, my - 4, mw + 8, mh + 8);
  for (const d of DISTRICTS) { ctx.fillStyle = d.accent; ctx.globalAlpha = 0.55; ctx.fillRect(mx + d.x * sx, my + d.y * sy, d.w * sx, d.h * sy); }
  ctx.globalAlpha = 1;
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  for (const rx of ROADS_X) { ctx.beginPath(); ctx.moveTo(mx + rx * sx, my); ctx.lineTo(mx + rx * sx, my + mh); ctx.stroke(); }
  for (const ry of ROADS_Y) { ctx.beginPath(); ctx.moveTo(mx, my + ry * sy); ctx.lineTo(mx + mw, my + ry * sy); ctx.stroke(); }
  const marker = missionMarker();
  if (marker) {
    ctx.fillStyle = '#ffd94a';
    ctx.save(); ctx.translate(mx + marker.x * sx, my + marker.y * sy); ctx.rotate(Math.PI / 4);
    ctx.fillRect(-5, -5, 10, 10); ctx.restore();
  }
  for (const cop of S.cops) {
    ctx.fillStyle = '#3d7bff';
    ctx.beginPath(); ctx.arc(mx + cop.car.x * sx, my + cop.car.y * sy, 3.5, 0, Math.PI * 2); ctx.fill();
  }
  if (S.player) {
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(mx + S.player.x * sx, my + S.player.y * sy, 4.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2b6cb0';
    ctx.beginPath(); ctx.arc(mx + S.player.x * sx, my + S.player.y * sy, 3, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = '#fff'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'left';
  ctx.fillText('SOLMAR', mx + 2, my + mh - 4);
}

function drawMenu(ctx, W, H) {
  ctx.fillStyle = 'rgba(5,12,20,0.78)'; ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd94a'; ctx.font = 'bold 64px sans-serif';
  ctx.fillText('SOLMAR HEAT', W / 2, H / 2 - 130);
  ctx.fillStyle = '#ff7a3d'; ctx.font = 'bold 20px sans-serif';
  ctx.fillText('An open-world crime story on the Solmar coast', W / 2, H / 2 - 96);
  ctx.fillStyle = '#fff'; ctx.font = '16px sans-serif';
  ctx.fillText('Rico, a newcomer driver, works for fixer Mama Luz. Steal cars, outrun the', W / 2, H / 2 - 56);
  ctx.fillText('Solmar PD, fight rival crews and climb from nobody to King of Solmar.', W / 2, H / 2 - 32);
  ctx.fillStyle = '#7dff8a'; ctx.font = 'bold 18px sans-serif';
  ctx.fillText('▶  Press ENTER to play  ·  M starts your next mission', W / 2, H / 2 + 8);
  ctx.fillStyle = '#cfe8ff'; ctx.font = '14px sans-serif';
  ctx.fillText('WASD / Arrows — move & drive   ·   E — enter / steal car   ·   F — punch   ·   G / Click — shoot', W / 2, H / 2 + 44);
  ctx.fillText('Space — handbrake   ·   P / Esc — pause   ·   6 story missions   ·   Progress autosaves', W / 2, H / 2 + 66);
  const next = currentMission();
  if (next) { ctx.fillStyle = '#ffd94a'; ctx.font = 'bold 15px sans-serif'; ctx.fillText('Next mission: ' + next.title, W / 2, H / 2 + 104); }
  ctx.fillText('Five districts: Marina Bay · Old Town · Downtown · Palm Heights · Industrial Docks', W / 2, H / 2 + 132);
  ctx.textAlign = 'left';
}

function drawPause(ctx, W, H) {
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff'; ctx.font = 'bold 40px sans-serif';
  ctx.fillText('PAUSED', W / 2, H / 2 - 20);
  ctx.font = '16px sans-serif';
  ctx.fillText('Press P or Esc to resume  ·  M — mission  ·  Progress autosaves', W / 2, H / 2 + 16);
  ctx.textAlign = 'left';
}

function drawEnd(ctx, W, H, big, sub) {
  ctx.fillStyle = 'rgba(0,0,0,0.72)'; ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = big === 'KING OF SOLMAR' ? '#ffd94a' : '#ff5555';
  ctx.font = 'bold 52px sans-serif';
  ctx.fillText(big, W / 2, H / 2 - 30);
  ctx.fillStyle = '#fff'; ctx.font = '17px sans-serif';
  ctx.fillText(sub, W / 2, H / 2 + 8);
  ctx.fillStyle = '#7dff8a'; ctx.font = 'bold 16px sans-serif';
  ctx.fillText('Press ENTER to keep playing — cash $' + S.cash.toLocaleString('en-US'), W / 2, H / 2 + 44);
  ctx.textAlign = 'left';
}

// combat.js — fists (F), pistol pickup with limited ammo (G / mouse click),
// enemy crew AI and the player's health.
import { S, addWanted, showMsg, addCash } from './state.js';
import { mulberry32 } from './city.js';

const rnd = mulberry32(9911);

export function spawnPistolPickup(x, y) {
  S.pickups.push({ kind: 'pistol', x, y, ammo: 24 });
}
export function spawnAmmo(x, y) {
  S.pickups.push({ kind: 'ammo', x, y, ammo: 18 });
}

export function punch() {
  const p = S.player;
  if (!p || !p.onFoot || S.mode !== 'play') return;
  p.punchT = 0.28;
  S.stats.punches++;
  const range = 46;
  const px = p.x + Math.cos(p.angle) * 30, py = p.y + Math.sin(p.angle) * 30;
  let hit = false;
  for (const e of S.enemies) {
    if (Math.hypot(e.x - px, e.y - py) < range) { hurtEnemy(e, 34, p); hit = true; }
  }
  for (const ped of S.peds) {
    if (Math.hypot(ped.x - px, ped.y - py) < range) {
      ped.panic = 2; hit = true;
      addWanted(8, 'assault on a civilian');
      showMsg('You punched a pedestrian! The cops were called.', 3);
    }
  }
  if (!hit) S.particles.push({ x: px, y: py, vx: 0, vy: 0, life: 0.15, max: 0.15, color: '#fff', size: 4 });
}

export function shoot(tx, ty) {
  const p = S.player;
  if (!p || S.mode !== 'play' || p.ammo <= 0) {
    if (p && p.ammo <= 0) showMsg('No ammo — find a pistol crate (yellow box).', 2);
    return;
  }
  p.ammo--;
  S.stats.shots++;
  const a = Math.atan2(ty - p.y, tx - p.x);
  S.bullets.push({ x: p.x + Math.cos(a) * 22, y: p.y + Math.sin(a) * 22, vx: Math.cos(a) * 620, vy: Math.sin(a) * 620, life: 0.9, from: 'player' });
  addWanted(4, 'shots fired');
  if (p.onFoot) p.angle = a;
}

export function hurtEnemy(e, dmg, src) {
  e.hp -= dmg;
  e.aggro = true;
  S.particles.push({ x: e.x, y: e.y, vx: 0, vy: -20, life: 0.3, max: 0.3, color: '#ff5555', size: 5 });
  if (e.hp <= 0) {
    e.dead = true;
    addCash(40);
    S.floats.push({ x: e.x, y: e.y, text: '+$40', life: 1.2, color: '#7dff8a' });
    S.particles.push({ x: e.x, y: e.y, vx: 0, vy: 0, life: 0.5, max: 0.5, color: '#c93d3d', size: 14 });
    if (rnd() < 0.5) spawnAmmo(e.x + 20, e.y);
  }
}

export function updateCombat(dt) {
  const p = S.player;
  // Bullets fly and hit enemies, peds or the player.
  for (const b of S.bullets) {
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    if (b.from === 'player') {
      for (const e of S.enemies) {
        if (!e.dead && Math.hypot(e.x - b.x, e.y - b.y) < 16) { hurtEnemy(e, 26, p); b.life = 0; break; }
      }
    } else if (p) {
      if (Math.hypot(p.x - b.x, p.y - b.y) < 16) {
        S.health -= 9; b.life = 0;
        S.particles.push({ x: p.x, y: p.y, vx: 0, vy: 0, life: 0.3, max: 0.3, color: '#ff2222', size: 8 });
        if (S.health <= 0) { S.mode = 'dead'; }
      }
    }
  }
  S.bullets = S.bullets.filter((b) => b.life > 0);
  // Enemy crew: chase and shoot when close, melee when very close.
  for (const e of S.enemies) {
    if (e.dead) continue;
    const d = Math.hypot(p.x - e.x, p.y - e.y);
    if (d > 520 && !e.aggro) continue;
    e.aggro = true;
    const a = Math.atan2(p.y - e.y, p.x - e.x);
    e.angle = a;
    e.shootT -= dt;
    if (d > 90) {
      e.x += Math.cos(a) * 95 * dt;
      e.y += Math.sin(a) * 95 * dt;
    } else if (d < 40) {
      S.health -= 12 * dt;
      if (S.health <= 0) S.mode = 'dead';
    }
    if (d < 380 && e.shootT <= 0 && e.hasGun) {
      e.shootT = 1.1 + rnd() * 0.8;
      S.bullets.push({ x: e.x, y: e.y, vx: Math.cos(a) * 420, vy: Math.sin(a) * 420, life: 1.1, from: 'enemy' });
    }
  }
  S.enemies = S.enemies.filter((e) => !e.dead);
  // Pickups.
  for (const pk of S.pickups) {
    if (Math.hypot(p.x - pk.x, p.y - pk.y) < 30) {
      pk.taken = true;
      if (pk.kind === 'pistol') { p.hasGun = true; p.ammo += pk.ammo; showMsg('Pistol picked up! ' + pk.ammo + ' rounds. Press G or click to shoot.', 3); }
      else { p.ammo += pk.ammo; showMsg('Ammo +' + pk.ammo, 2); }
    }
  }
  S.pickups = S.pickups.filter((pk) => !pk.taken);
  // Particles and floating text.
  for (const pt of S.particles) { pt.life -= dt; pt.x += (pt.vx || 0) * dt; pt.y += (pt.vy || 0) * dt; }
  S.particles = S.particles.filter((pt) => pt.life > 0);
  for (const f of S.floats) { f.life -= dt; f.y -= 24 * dt; }
  S.floats = S.floats.filter((f) => f.life > 0);
  if (p) p.punchT = Math.max(0, (p.punchT || 0) - dt);
}

// Combat module
// Manages projectiles, collision detection, health and energy.
// The shooter is authoritative over all projectile positions and streams them.
// Other clients lerp to the streamed positions and run collision against local ship.

import { WEAPONS, createProjectile, updateProjectile, acquireTarget } from './weapons.js';
import { spawnExplosion, spawnDeathExplosion } from './effects.js';

const ENERGY_REGEN_RATE = 0.12; // per second
const MOVEMENT_ENERGY_RATE = 0.10; // per second at full thrust (slightly below regen)
const BOOST_ENERGY_RATE = 0.14; // per second while boosting (slightly above regen)
const REPAIR_RATE = 0.15; // health per second while channeling
const REPAIR_ENERGY_COST = 0.2; // energy per second while repairing
const SHIP_RADIUS = 18;
const LERP_RATE = 15;
const RESPAWN_TIME = 3; // seconds

export function createCombatState() {
  return {
    health: 1,
    energy: 1,
    weapon: 0,
    cooldown: 0,
    projectiles: [],
    remoteProjectiles: [],
    dead: false,
    respawnTimer: 0,
    kills: 0,
    lastHitBy: null,
  };
}

export function cycleWeapon(combat, direction) {
  combat.weapon = (combat.weapon + direction + WEAPONS.length) % WEAPONS.length;
}

export function tryFire(combat, ship, lockedTarget) {
  const weapon = WEAPONS[combat.weapon];
  if (weapon.isRepair) return null;
  if (combat.cooldown > 0) return null;
  if (combat.energy < weapon.energyCost) return null;

  combat.energy -= weapon.energyCost;
  combat.cooldown = weapon.cooldown;

  const projectiles = [];
  for (let i = 0; i < weapon.count; i++) {
    const p = createProjectile(ship, weapon, i, lockedTarget);
    combat.projectiles.push(p);
    projectiles.push(p);
  }
  return projectiles;
}

export function updateCombat(combat, ship, dt, remotes, isFireHeld, thrustMag = 0, boost = false) {
  // Handle respawn timer
  if (combat.dead) {
    combat.respawnTimer -= dt;
    if (combat.respawnTimer <= 0) {
      combat.dead = false;
      combat.health = 1;
      combat.energy = 1;
      return { hits: [], died: false, respawned: true };
    }
    return { hits: [], died: false, respawned: false };
  }

  combat.cooldown = Math.max(0, combat.cooldown - dt);
  combat.energy = Math.min(1, combat.energy + ENERGY_REGEN_RATE * dt);

  // Movement energy drain (scaled by input magnitude)
  combat.energy = Math.max(0, combat.energy - thrustMag * MOVEMENT_ENERGY_RATE * dt);
  if (boost) combat.energy = Math.max(0, combat.energy - BOOST_ENERGY_RATE * dt);

  const weapon = WEAPONS[combat.weapon];
  if (weapon.isRepair && isFireHeld && combat.energy >= REPAIR_ENERGY_COST * dt) {
    combat.energy -= REPAIR_ENERGY_COST * dt;
    combat.health = Math.min(1, combat.health + REPAIR_RATE * dt);
  }

  // Update local projectiles (we simulate these)
  const targets = remotes.map((r, i) => ({ id: i, x: r.x, y: r.y }));
  for (let i = combat.projectiles.length - 1; i >= 0; i--) {
    const p = combat.projectiles[i];
    updateProjectile(p, dt, targets);
    if (p.life <= 0) combat.projectiles.splice(i, 1);
  }

  // Update remote projectiles (lerp toward streamed positions)
  for (let i = combat.remoteProjectiles.length - 1; i >= 0; i--) {
    const p = combat.remoteProjectiles[i];
    if (p.tx != null) {
      const t = 1 - Math.exp(-LERP_RATE * dt);
      p.x += (p.tx - p.x) * t;
      p.y += (p.ty - p.y) * t;
    }
    p.life -= dt;
    if (p.life <= 0) combat.remoteProjectiles.splice(i, 1);
  }

  // Collision: remote projectiles hitting local ship
  const hits = [];
  for (let i = combat.remoteProjectiles.length - 1; i >= 0; i--) {
    const p = combat.remoteProjectiles[i];
    const dx = p.x - ship.x;
    const dy = p.y - ship.y;
    if (dx * dx + dy * dy < (SHIP_RADIUS + p.size) ** 2) {
      combat.health = Math.max(0, combat.health - p.damage);
      combat.lastHitBy = p.owner || null;
      spawnExplosion(p.x, p.y, p.damage);
      hits.push({ id: p.id, x: p.x, y: p.y, damage: p.damage });
      combat.remoteProjectiles.splice(i, 1);
    }
  }

  // Check for death
  let died = false;
  let killedBy = null;
  if (combat.health <= 0) {
    combat.dead = true;
    combat.respawnTimer = RESPAWN_TIME;
    spawnDeathExplosion(ship.x, ship.y);
    died = true;
    killedBy = combat.lastHitBy;
    combat.kills = 0;
    combat.lastHitBy = null;
  }

  return { hits, died, respawned: false, killedBy };
}

export function receiveProjectiles(combat, projectiles, owner) {
  for (const p of projectiles) {
    combat.remoteProjectiles.push({ ...p, tx: p.x, ty: p.y, owner });
  }
}

// Streamed position updates from shooter
export function updateRemoteProjectilePositions(combat, updates) {
  for (const u of updates) {
    const p = combat.remoteProjectiles.find(rp => rp.id === u.id);
    if (p) {
      p.tx = u.x;
      p.ty = u.y;
      p.angle = u.angle;
    } else {
      // Missed the initial spawn — add it now
      combat.remoteProjectiles.push({ ...u, tx: u.x, ty: u.y });
    }
  }
}

export function receiveHits(combat, hits) {
  for (const h of hits) {
    spawnExplosion(h.x, h.y, h.damage);
    const idx = combat.projectiles.findIndex(p => p.id === h.id);
    if (idx !== -1) combat.projectiles.splice(idx, 1);
  }
}

// Get all local projectile positions for streaming
export function getLocalProjectilePositions(combat) {
  return combat.projectiles.map(p => ({ id: p.id, x: p.x, y: p.y, angle: p.angle, size: p.size, damage: p.damage, homing: p.homing, life: p.life }));
}

export function getAllProjectiles(combat) {
  return combat.projectiles.concat(combat.remoteProjectiles);
}

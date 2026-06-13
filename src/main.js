import { pollInput, initKeyboardMouse } from './input.js';
import { createShip, updateShip } from './physics.js';
import { initRenderer, render } from './renderer.js';
import { getCamera } from './camera.js';
import { drawHUD } from './hud.js';
import { createNavigation } from './navigation.js';
import { createRemotePlayers } from './remote-players.js';
import { createCombatState, cycleWeapon, tryFire, updateCombat, receiveProjectiles, updateRemoteProjectilePositions, receiveHits, getLocalProjectilePositions, getAllProjectiles } from './combat.js';
import { updateEffects, getParticles, getFlashes, spawnExplosion } from './effects.js';
import { WEAPONS, acquireTarget } from './weapons.js';
import { spawnBlackHole, addRemoteBlackHole, applyGravity, getBlackHoles } from './black-holes.js';
import { traceLaser } from './laser.js';

const canvas = document.getElementById('game');
const uiContainer = document.getElementById('ui');

let ctx = null;
let ship = null;
let combat = null;
let lastTime = null;
let running = false;
let network = null;
let remotePlayers = null;
let localHue = 0;

const BROADCAST_INTERVAL = 50; // ms between state broadcasts
let lastBroadcast = 0;
let remoteLasers = new Map(); // peerId -> points[]

function onGameData(peerId, payload) {
  if (payload.type === 'ship' && remotePlayers) {
    remotePlayers.update(peerId, payload.state, payload.info);
  } else if (payload.type === 'projectiles' && combat) {
    receiveProjectiles(combat, payload.projectiles, peerId);
  } else if (payload.type === 'projectile_update' && combat) {
    updateRemoteProjectilePositions(combat, payload.positions);
  } else if (payload.type === 'hits') {
    receiveHits(combat, payload.hits);
  } else if (payload.type === 'laser') {
    remoteLasers.set(peerId, payload.points);
  } else if (payload.type === 'laser_hit') {
    // If we are the target, apply damage
    if (network && payload.target === network.getLocalId() && combat) {
      combat.health = Math.max(0, combat.health - payload.damage);
      combat.lastHitBy = peerId;
      spawnExplosion(payload.x, payload.y, payload.damage);
    }
  } else if (payload.type === 'death') {
    addRemoteBlackHole(payload.blackHole.id, payload.blackHole.x, payload.blackHole.y);
    if (remotePlayers) remotePlayers.markDead(peerId);
    if (network && payload.killedBy === network.getLocalId()) {
      combat.kills++;
    }
  }
}

function startGame(net, sessionState) {
  network = net;
  localHue = sessionState?.localHue ?? 0;
  ctx = initRenderer(canvas);
  initKeyboardMouse(canvas);

  const playerCount = sessionState?.players?.length || 1;
  const localIndex = sessionState?.isHost ? 0 : playerCount - 1;
  const angle = (2 * Math.PI * localIndex) / playerCount;
  const spawnRadius = 300;
  ship = createShip(Math.cos(angle) * spawnRadius, Math.sin(angle) * spawnRadius);
  ship.angle = angle + Math.PI;

  combat = createCombatState();
  remotePlayers = createRemotePlayers();
  lastTime = performance.now();
  lastBroadcast = 0;
  running = true;
  requestAnimationFrame(loop);
}

function loop(now) {
  if (!running) return;
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;

  const input = pollInput(dt);
  if (!combat.dead) updateShip(ship, input, dt, combat.kills);
  remotePlayers.tick(dt);

  // Weapon cycling: × = prev, ○ = next
  if (!combat.dead && input.prevWeaponPressed) cycleWeapon(combat, -1);
  if (!combat.dead && input.nextWeaponPressed) cycleWeapon(combat, 1);

  // Firing: R2 / click
  const remotes = remotePlayers.getAll();
  const currentWeapon = WEAPONS[combat.weapon];
  const lockedTarget = (!combat.dead && currentWeapon?.homingAccel) ? acquireTarget(ship, remotes) : null;
  let laserBeam = null;
  if (!combat.dead && currentWeapon?.isLaser && input.fire && combat.energy >= currentWeapon.energyCost * dt) {
    combat.energy -= currentWeapon.energyCost * dt;
    const { points, hitTarget } = traceLaser(ship, remotes, dt);
    laserBeam = points;
    if (network) {
      network.broadcast({ type: 'laser', points });
    }
    if (hitTarget && network) {
      network.broadcast({ type: 'laser_hit', target: remotes[hitTarget.index]?.peerId, damage: hitTarget.damage, x: hitTarget.x, y: hitTarget.y });
    }
  } else if (!combat.dead && input.firePressed && !currentWeapon?.isLaser) {
    const fired = tryFire(combat, ship, lockedTarget);
    if (fired && network) {
      network.broadcast({ type: 'projectiles', projectiles: fired });
    }
  }

  // Update combat (energy regen, repair, projectile movement, collision)
  const thrustMag = Math.min(1, Math.sqrt(input.moveX * input.moveX + input.moveY * input.moveY));
  const { hits, died, respawned, killedBy } = updateCombat(combat, ship, dt, remotes, input.fire, thrustMag, input.boost);
  if (respawned) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 500 + Math.random() * 1500;
    ship.x = Math.cos(angle) * dist;
    ship.y = Math.sin(angle) * dist;
    ship.vx = 0; ship.vy = 0; ship.angularVel = 0;
    ship.angle = Math.random() * Math.PI * 2;
  }
  if (hits.length > 0 && network) {
    network.broadcast({ type: 'hits', hits });
  }
  if (died) {
    const bh = spawnBlackHole(ship.x, ship.y);
    if (network) {
      network.broadcast({ type: 'death', blackHole: bh, killedBy });
    }
  }

  // Apply black hole gravity to all projectiles
  const allProjectiles = getAllProjectiles(combat);
  applyGravity(allProjectiles, dt);

  updateEffects(dt);

  // Broadcast local state periodically
  if (network && now - lastBroadcast > BROADCAST_INTERVAL) {
    lastBroadcast = now;
    if (!combat.dead) {
      network.broadcast({
        type: 'ship',
        state: { x: ship.x, y: ship.y, vx: ship.vx, vy: ship.vy, angle: ship.angle, angularVel: ship.angularVel },
        info: { hue: localHue, kills: combat.kills },
      });
    }
    const positions = getLocalProjectilePositions(combat);
    if (positions.length > 0) {
      network.broadcast({ type: 'projectile_update', positions });
    }
  }

  render(ctx, canvas, ship, input, remotes, localHue, allProjectiles, getParticles(), getFlashes(), lockedTarget, getBlackHoles(), combat.dead, combat.kills, laserBeam, remoteLasers);
  remoteLasers.clear();

  const cam = getCamera(ship, canvas.width, canvas.height);
  drawHUD(ctx, canvas.width, canvas.height, { health: combat.health, energy: combat.energy, weapon: combat.weapon, kills: combat.kills, dead: combat.dead }, remotes, cam);

  requestAnimationFrame(loop);
}

createNavigation(uiContainer, canvas, { start: startGame, onGameData });

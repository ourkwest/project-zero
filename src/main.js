import { pollGamepad } from './input.js';
import { createShip, updateShip } from './physics.js';
import { initRenderer, render } from './renderer.js';
import { getCamera } from './camera.js';
import { drawHUD } from './hud.js';
import { createNavigation } from './navigation.js';
import { createRemotePlayers } from './remote-players.js';
import { createCombatState, cycleWeapon, tryFire, updateCombat, receiveProjectiles, updateRemoteProjectilePositions, receiveHits, getLocalProjectilePositions, getAllProjectiles } from './combat.js';
import { updateEffects, getParticles, getFlashes } from './effects.js';

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

function onGameData(peerId, payload) {
  if (payload.type === 'ship' && remotePlayers) {
    remotePlayers.update(peerId, payload.state, payload.info);
  } else if (payload.type === 'projectiles' && combat) {
    receiveProjectiles(combat, payload.projectiles);
  } else if (payload.type === 'projectile_update' && combat) {
    updateRemoteProjectilePositions(combat, payload.positions);
  } else if (payload.type === 'hits') {
    receiveHits(combat, payload.hits);
  }
}

function startGame(net, sessionState) {
  network = net;
  localHue = sessionState?.localHue ?? 0;
  ctx = initRenderer(canvas);

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

  const input = pollGamepad();
  updateShip(ship, input, dt);
  remotePlayers.tick(dt);

  // Weapon cycling: button1 = prev, button2 = next
  if (input.button1Pressed) cycleWeapon(combat, -1);
  if (input.button2Pressed) cycleWeapon(combat, 1);

  // Firing: button0
  const remotes = remotePlayers.getAll();
  if (input.button0Pressed) {
    const fired = tryFire(combat, ship, remotes);
    if (fired && network) {
      network.broadcast({ type: 'projectiles', projectiles: fired });
    }
  }

  // Update combat (energy regen, repair, projectile movement, collision)
  const hits = updateCombat(combat, ship, dt, remotes, input.button0);
  if (hits.length > 0 && network) {
    network.broadcast({ type: 'hits', hits });
  }
  updateEffects(dt);

  // Broadcast local state periodically
  if (network && now - lastBroadcast > BROADCAST_INTERVAL) {
    lastBroadcast = now;
    network.broadcast({
      type: 'ship',
      state: { x: ship.x, y: ship.y, vx: ship.vx, vy: ship.vy, angle: ship.angle, angularVel: ship.angularVel },
      info: { hue: localHue },
    });
    const positions = getLocalProjectilePositions(combat);
    if (positions.length > 0) {
      network.broadcast({ type: 'projectile_update', positions });
    }
  }

  const allProjectiles = getAllProjectiles(combat);
  render(ctx, canvas, ship, input, remotes, localHue, allProjectiles, getParticles(), getFlashes());

  const cam = getCamera(ship, canvas.width, canvas.height);
  drawHUD(ctx, canvas.width, canvas.height, { health: combat.health, energy: combat.energy, weapon: combat.weapon }, remotes, cam);

  requestAnimationFrame(loop);
}

createNavigation(uiContainer, canvas, { start: startGame, onGameData });

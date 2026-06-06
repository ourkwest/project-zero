import { pollGamepad } from './input.js';
import { createShip, updateShip } from './physics.js';
import { initRenderer, render } from './renderer.js';
import { getCamera } from './camera.js';
import { drawHUD } from './hud.js';
import { createNavigation } from './navigation.js';
import { createRemotePlayers } from './remote-players.js';

const canvas = document.getElementById('game');
const uiContainer = document.getElementById('ui');

let ctx = null;
let ship = null;
let playerState = null;
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
  }
}

function startGame(net, sessionState) {
  network = net;
  localHue = sessionState?.localHue ?? 0;
  ctx = initRenderer(canvas);

  // Spread players around a circle
  const playerCount = sessionState?.players?.length || 1;
  const localIndex = sessionState?.isHost ? 0 : playerCount - 1;
  const angle = (2 * Math.PI * localIndex) / playerCount;
  const spawnRadius = 300;
  ship = createShip(Math.cos(angle) * spawnRadius, Math.sin(angle) * spawnRadius);
  ship.angle = angle + Math.PI; // face toward center

  playerState = { health: 1, energy: 1, weapon: 0 };
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

  // Broadcast local state periodically
  if (network && now - lastBroadcast > BROADCAST_INTERVAL) {
    lastBroadcast = now;
    network.broadcast({
      type: 'ship',
      state: { x: ship.x, y: ship.y, vx: ship.vx, vy: ship.vy, angle: ship.angle, angularVel: ship.angularVel },
      info: { hue: localHue },
    });
  }

  const remotes = remotePlayers.getAll();
  render(ctx, canvas, ship, input, remotes, localHue);

  const cam = getCamera(ship, canvas.width, canvas.height);
  drawHUD(ctx, canvas.width, canvas.height, playerState, remotes, cam);

  requestAnimationFrame(loop);
}

createNavigation(uiContainer, canvas, { start: startGame, onGameData });

// Unified input module
// Produces a single input state from gamepad + mouse/keyboard simultaneously.
// Output: { steer, moveX, moveY, fire, firePressed, prevWeaponPressed, nextWeaponPressed, boost }

const DEADZONE = 0.15;

let selectedIndex = 0;
let prevGpFire = false;
let prevGpL1 = false;
let prevGpR1 = false;

// Keyboard state
const keys = {};
let mouseSteer = 0;
let mouseFire = false;
let mouseFirePressed = false;
let scrollDelta = 0;
let pointerLocked = false;

// Mouse sensitivity (radians-equivalent per pixel of movement)
const MOUSE_SENSITIVITY = 0.003;
const MOUSE_STEER_DECAY = 8; // decay rate per second when no mouse movement

let lastMouseMoveTime = 0;

export function setGamepadIndex(index) { selectedIndex = index; }

export function getConnectedGamepads() {
  const gps = navigator.getGamepads();
  const result = [];
  for (let i = 0; i < gps.length; i++) {
    if (gps[i] && gps[i].axes.length >= 4 && gps[i].buttons.length >= 6) {
      result.push({ index: i, id: gps[i].id });
    }
  }
  return result;
}

export function initKeyboardMouse(canvas) {
  window.addEventListener('keydown', e => { keys[e.code] = true; });
  window.addEventListener('keyup', e => { keys[e.code] = false; });

  canvas.addEventListener('click', () => {
    if (!pointerLocked) canvas.requestPointerLock();
  });

  document.addEventListener('pointerlockchange', () => {
    pointerLocked = document.pointerLockElement != null;
    if (!pointerLocked) mouseSteer = 0;
  });

  document.addEventListener('mousemove', e => {
    if (!pointerLocked) return;
    mouseSteer += e.movementX * MOUSE_SENSITIVITY;
    mouseSteer = Math.max(-1, Math.min(1, mouseSteer));
    lastMouseMoveTime = performance.now();
  });

  document.addEventListener('mousedown', e => {
    if (!pointerLocked) return;
    if (e.button === 0) { mouseFirePressed = !mouseFire; mouseFire = true; }
  });
  document.addEventListener('mouseup', e => {
    if (e.button === 0) mouseFire = false;
  });

  document.addEventListener('wheel', e => {
    if (!pointerLocked) return;
    scrollDelta += Math.sign(e.deltaY);
  }, { passive: true });

  document.addEventListener('keydown', e => {
    if (e.code === 'Escape' && pointerLocked) document.exitPointerLock();
  });
}

function applyDeadzone(value) {
  return Math.abs(value) < DEADZONE ? 0 : value;
}

export function pollInput(dt) {
  // --- Gamepad ---
  const gamepads = navigator.getGamepads();
  const gp = gamepads[selectedIndex];

  let gpSteer = 0, gpMoveX = 0, gpMoveY = 0;
  let gpFire = false, gpFirePressed = false;
  let gpL1Pressed = false, gpR1Pressed = false;
  let gpBoost = false;

  if (gp) {
    gpSteer = applyDeadzone(gp.axes[0] || 0); // left stick X = steering
    gpMoveX = applyDeadzone(gp.axes[2] || 0); // right stick X = strafe
    gpMoveY = -applyDeadzone(gp.axes[3] || 0); // right stick Y = forward/backward

    gpFire = gp.buttons[7]?.pressed || false;  // R2
    gpFirePressed = gpFire && !prevGpFire;
    prevGpFire = gpFire;

    const l1 = gp.buttons[4]?.pressed || false; // L1
    const r1 = gp.buttons[5]?.pressed || false; // R1
    gpL1Pressed = l1 && !prevGpL1;
    gpR1Pressed = r1 && !prevGpR1;
    prevGpL1 = l1;
    prevGpR1 = r1;

    gpBoost = gp.buttons[6]?.pressed || false; // L2
  }

  // --- Keyboard ---
  let kbMoveX = 0, kbMoveY = 0;
  if (keys['ArrowUp'] || keys['KeyW']) kbMoveY += 1;
  if (keys['ArrowDown'] || keys['KeyS']) kbMoveY -= 1;
  if (keys['ArrowRight'] || keys['KeyD']) kbMoveX += 1;
  if (keys['ArrowLeft'] || keys['KeyA']) kbMoveX -= 1;
  const kbBoost = keys['ShiftLeft'] || keys['ShiftRight'] || false;

  // Decay mouse steer toward 0 when no recent movement
  const now = performance.now();
  if (now - lastMouseMoveTime > 50) {
    mouseSteer *= Math.exp(-MOUSE_STEER_DECAY * dt);
    if (Math.abs(mouseSteer) < 0.001) mouseSteer = 0;
  }

  // --- Merge (take max magnitude from each source) ---
  const steer = clamp(gpSteer + mouseSteer, -1, 1);
  const moveX = clamp(gpMoveX + kbMoveX, -1, 1);
  const moveY = clamp(gpMoveY + kbMoveY, -1, 1);
  const fire = gpFire || mouseFire;
  const firePressed = gpFirePressed || mouseFirePressed;
  const boost = gpBoost || kbBoost;

  // Weapon cycling from scroll or L1/R1
  let prevWeaponPressed = gpL1Pressed;
  let nextWeaponPressed = gpR1Pressed;
  if (scrollDelta < 0) { prevWeaponPressed = true; }
  if (scrollDelta > 0) { nextWeaponPressed = true; }
  scrollDelta = 0;

  // Reset edge-detected mouse fire
  mouseFirePressed = false;

  return {
    steer, moveX, moveY,
    fire, firePressed,
    prevWeaponPressed, nextWeaponPressed,
    boost,
    connected: !!gp || pointerLocked,
  };
}

function clamp(v, min, max) { return v < min ? min : v > max ? max : v; }

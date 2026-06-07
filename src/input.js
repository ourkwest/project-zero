// Gamepad input module
// Supports selecting a specific gamepad by index.
// Provides both raw state and edge-detected presses.
// Mapping: R1(5)=fire, ×(0)=prev weapon, ○(1)=next weapon

const DEADZONE = 0.15;

const NEUTRAL = Object.freeze({
  leftX: 0, leftY: 0,
  rightX: 0, rightY: 0,
  fire: false, firePressed: false,
  prevWeapon: false, prevWeaponPressed: false,
  nextWeapon: false, nextWeaponPressed: false,
  connected: false,
});

let selectedIndex = 0;
let prevButtons = [false, false, false];

export function setGamepadIndex(index) { selectedIndex = index; }
export function getGamepadIndex() { return selectedIndex; }

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

function applyDeadzone(value) {
  return Math.abs(value) < DEADZONE ? 0 : value;
}

export function pollGamepad() {
  const gamepads = navigator.getGamepads();
  const gp = gamepads[selectedIndex];

  if (!gp) return NEUTRAL;

  const fire = gp.buttons[5]?.pressed || false;   // R1
  const prev = gp.buttons[0]?.pressed || false;   // ×
  const next = gp.buttons[1]?.pressed || false;   // ○

  const result = {
    leftX: applyDeadzone(gp.axes[2] || 0),
    leftY: applyDeadzone(gp.axes[3] || 0),
    rightX: applyDeadzone(gp.axes[0] || 0),
    rightY: applyDeadzone(gp.axes[1] || 0),
    fire,
    firePressed: fire && !prevButtons[0],
    prevWeapon: prev,
    prevWeaponPressed: prev && !prevButtons[1],
    nextWeapon: next,
    nextWeaponPressed: next && !prevButtons[2],
    connected: true,
  };

  prevButtons = [fire, prev, next];
  return result;
}

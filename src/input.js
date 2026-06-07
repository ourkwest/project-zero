// Gamepad input module
// Supports selecting a specific gamepad by index.
// Provides both raw state and edge-detected presses.

const DEADZONE = 0.15;

const NEUTRAL = Object.freeze({
  leftX: 0, leftY: 0,
  rightX: 0, rightY: 0,
  button0: false, button1: false, button2: false,
  button0Pressed: false, button1Pressed: false, button2Pressed: false,
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
    if (gps[i] && gps[i].axes.length >= 4 && gps[i].buttons.length >= 3) {
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

  const b0 = gp.buttons[0]?.pressed || false;
  const b1 = gp.buttons[1]?.pressed || false;
  const b2 = gp.buttons[2]?.pressed || false;

  const result = {
    leftX: applyDeadzone(gp.axes[2] || 0),
    leftY: applyDeadzone(gp.axes[3] || 0),
    rightX: applyDeadzone(gp.axes[0] || 0),
    rightY: applyDeadzone(gp.axes[1] || 0),
    button0: b0,
    button1: b1,
    button2: b2,
    button0Pressed: b0 && !prevButtons[0],
    button1Pressed: b1 && !prevButtons[1],
    button2Pressed: b2 && !prevButtons[2],
    connected: true,
  };

  prevButtons = [b0, b1, b2];
  return result;
}

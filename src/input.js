// Gamepad input module
// Supports selecting a specific gamepad by index.

const DEADZONE = 0.15;

const NEUTRAL = Object.freeze({
  leftX: 0, leftY: 0,
  rightX: 0, rightY: 0,
  button0: false, button1: false, button2: false,
  connected: false,
});

let selectedIndex = 0;

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

  return {
    leftX: applyDeadzone(gp.axes[2] || 0),
    leftY: applyDeadzone(gp.axes[3] || 0),
    rightX: applyDeadzone(gp.axes[0] || 0),
    rightY: applyDeadzone(gp.axes[1] || 0),
    button0: gp.buttons[0]?.pressed || false,
    button1: gp.buttons[1]?.pressed || false,
    button2: gp.buttons[2]?.pressed || false,
    connected: true,
  };
}

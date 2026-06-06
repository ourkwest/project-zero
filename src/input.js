// Gamepad input module
// Reads two joysticks (4 axes) and 3 buttons from the first connected gamepad.
// Returns a neutral input object when no gamepad is connected.

const DEADZONE = 0.15;

const NEUTRAL = Object.freeze({
  leftX: 0, leftY: 0,
  rightX: 0, rightY: 0,
  button0: false, button1: false, button2: false,
  connected: false,
});

function applyDeadzone(value) {
  return Math.abs(value) < DEADZONE ? 0 : value;
}

export function pollGamepad() {
  const gamepads = navigator.getGamepads();
  const gp = gamepads[0] || gamepads[1] || gamepads[2] || gamepads[3];

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

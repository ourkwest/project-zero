// Ship physics module
// Dual-thruster model: each joystick controls one thruster in full 2D.
// Both axes of each stick determine thrust direction for that side.
// Thrust is applied in world-space (stick direction rotated by ship heading).
// Differential Y thrust between sticks produces rotation.

const THRUST_FORCE = 600;    // pixels/s² at full stick
const ROTATION_FORCE = 8;    // radians/s² at full opposing sticks
const LINEAR_DRAG = 0.8;     // fraction of velocity lost per second (≈3s to stop)
const ANGULAR_DRAG = 0.8;    // fraction of angular velocity lost per second

export function createShip(x, y) {
  return {
    x, y,
    vx: 0, vy: 0,
    angle: 0,         // radians, 0 = pointing right
    angularVel: 0,
  };
}

export function updateShip(ship, input, dt) {
  // Each stick provides a 2D thrust vector in ship-local space
  // X = strafe (positive = right), Y = forward/back (negative = forward)
  const leftLocalX = input.leftX;
  const leftLocalY = -input.leftY;
  const rightLocalX = input.rightX;
  const rightLocalY = -input.rightY;

  // Rotational thrust from Y-axis difference (forward/back differential)
  const rotationalThrust = (rightLocalY - leftLocalY) / 2;
  ship.angularVel += rotationalThrust * ROTATION_FORCE * dt;

  // Combined thrust vector in ship-local space
  const localX = (leftLocalX + rightLocalX) / 2;
  const localY = (leftLocalY + rightLocalY) / 2;

  // Rotate to world space by ship heading
  const cos = Math.cos(ship.angle);
  const sin = Math.sin(ship.angle);
  const ax = (cos * localY - sin * localX) * THRUST_FORCE;
  const ay = (sin * localY + cos * localX) * THRUST_FORCE;

  ship.vx += ax * dt;
  ship.vy += ay * dt;

  // Apply drag (exponential decay)
  const linearDecay = Math.pow(1 - LINEAR_DRAG, dt);
  ship.vx *= linearDecay;
  ship.vy *= linearDecay;
  ship.angularVel *= Math.pow(1 - ANGULAR_DRAG, dt);

  // Integrate position
  ship.x += ship.vx * dt;
  ship.y += ship.vy * dt;
  ship.angle += ship.angularVel * dt;
}

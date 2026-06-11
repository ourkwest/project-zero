// Ship physics module
// Steer+move model: steering causes differential thrust (rotation),
// move causes translational thrust in the ship's reference frame.
// Both are summed into the dual-thruster physics.

const THRUST_FORCE = 600;    // pixels/s² at full input
const ROTATION_FORCE = 8;    // radians/s² at full steer
const LINEAR_DRAG = 0.8;     // fraction of velocity lost per second
const ANGULAR_DRAG = 0.8;    // fraction of angular velocity lost per second
const BOOST_MULTIPLIER = 1.8;

export function createShip(x, y) {
  return {
    x, y,
    vx: 0, vy: 0,
    angle: 0,         // radians, 0 = pointing right
    angularVel: 0,
  };
}

export function updateShip(ship, input, dt, kills = 0) {
  // Steering → angular acceleration
  const massMult = 1 + kills * 0.05; // +5% mass per kill
  ship.angularVel += input.steer * ROTATION_FORCE * dt / massMult;

  // Movement → translational thrust in ship-local frame
  const thrustMult = input.boost ? BOOST_MULTIPLIER : 1;
  const localX = input.moveX;
  const localY = input.moveY;

  // Rotate to world space by ship heading
  const cos = Math.cos(ship.angle);
  const sin = Math.sin(ship.angle);
  const ax = (cos * localY - sin * localX) * THRUST_FORCE * thrustMult / massMult;
  const ay = (sin * localY + cos * localX) * THRUST_FORCE * thrustMult / massMult;

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

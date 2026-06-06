// Camera module
// The camera rotates with the ship (ship nose always points up on screen).
// The ship sits in the lower portion of the screen to show more of what's ahead.

const SHIP_SCREEN_Y = 0.72; // ship is at 72% down the screen

export function getCamera(ship, w, h) {
  return {
    // World position the camera is centered on (the ship)
    x: ship.x,
    y: ship.y,
    // Ship's angle (used to rotate world)
    angle: ship.angle,
    // Ship's screen-space position
    screenX: w / 2,
    screenY: h * SHIP_SCREEN_Y,
  };
}

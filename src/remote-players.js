// Remote players module
// Stores latest state from other players and interpolates for smooth rendering.

const LERP_RATE = 12; // interpolation speed (higher = snappier)
const STALE_TIMEOUT = 5000; // remove player after 5s of no updates

export function createRemotePlayers() {
  const players = new Map(); // peerId -> { target, rendered, info, lastUpdate }

  return {
    update(peerId, shipState, playerInfo) {
      const existing = players.get(peerId);
      if (existing) {
        existing.target = shipState;
        existing.info = playerInfo;
        existing.lastUpdate = performance.now();
      } else {
        players.set(peerId, {
          target: shipState,
          rendered: { ...shipState },
          info: playerInfo,
          lastUpdate: performance.now(),
        });
      }
    },

    tick(dt) {
      const now = performance.now();
      for (const [id, p] of players) {
        if (now - p.lastUpdate > STALE_TIMEOUT) {
          players.delete(id);
          continue;
        }
        // Lerp rendered state toward target
        const t = 1 - Math.exp(-LERP_RATE * dt);
        p.rendered.x += (p.target.x - p.rendered.x) * t;
        p.rendered.y += (p.target.y - p.rendered.y) * t;
        p.rendered.vx += (p.target.vx - p.rendered.vx) * t;
        p.rendered.vy += (p.target.vy - p.rendered.vy) * t;
        // Lerp angle (handle wrapping)
        let da = p.target.angle - p.rendered.angle;
        da = ((da + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
        p.rendered.angle += da * t;
      }
    },

    getAll() {
      const result = [];
      for (const [id, p] of players) {
        result.push({ peerId: id, ...p.rendered, hue: p.info?.hue ?? 0, name: p.info?.name ?? '' });
      }
      return result;
    },

    remove(peerId) { players.delete(peerId); },
  };
}

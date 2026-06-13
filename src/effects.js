// Effects module
// Lightweight particle explosions, impact flashes, and death collapse animations.

const particles = [];
const flashes = [];

export function spawnExplosion(x, y, damage) {
  const count = Math.floor(8 + damage * 40);
  const speed = 100 + damage * 400;
  const size = 2 + damage * 6;
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const v = (0.3 + Math.random() * 0.7) * speed;
    particles.push({
      x, y,
      vx: Math.cos(angle) * v,
      vy: Math.sin(angle) * v,
      life: 0.3 + Math.random() * 0.4,
      maxLife: 0.3 + Math.random() * 0.4,
      size: size * (0.5 + Math.random() * 0.5),
    });
  }
  flashes.push({ x, y, life: 0.2, maxLife: 0.2, radius: 40 + damage * 100 });
}

// Death explosion: expands outward then collapses inward
const EXPAND_TIME = 0.5;
const COLLAPSE_TIME = 0.6;
const TOTAL_DEATH_TIME = EXPAND_TIME + COLLAPSE_TIME;

export function spawnDeathExplosion(x, y) {
  const count = 60;
  const speed = 500;
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const v = (0.4 + Math.random() * 0.6) * speed;
    particles.push({
      x, y,
      vx: Math.cos(angle) * v,
      vy: Math.sin(angle) * v,
      life: TOTAL_DEATH_TIME,
      maxLife: TOTAL_DEATH_TIME,
      size: 3 + Math.random() * 5,
      collapse: true,
      cx: x, cy: y, // collapse center
    });
  }
  flashes.push({ x, y, life: 0.3, maxLife: 0.3, radius: 200 });
}

export function updateEffects(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    if (p.collapse) {
      const elapsed = p.maxLife - p.life;
      if (elapsed < EXPAND_TIME) {
        // Expanding outward with deceleration
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.92;
        p.vy *= 0.92;
      } else {
        // Collapse phase: accelerate toward center
        const dx = p.cx - p.x;
        const dy = p.cy - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 5) {
          const collapseProgress = (elapsed - EXPAND_TIME) / COLLAPSE_TIME;
          const strength = 800 + collapseProgress * 2000;
          p.vx += (dx / dist) * strength * dt;
          p.vy += (dy / dist) * strength * dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
        } else {
          // Snapped to center — kill it early
          p.life = 0;
        }
      }
    } else {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.95;
      p.vy *= 0.95;
    }
    p.life -= dt;
    if (p.life <= 0) particles.splice(i, 1);
  }
  for (let i = flashes.length - 1; i >= 0; i--) {
    flashes[i].life -= dt;
    if (flashes[i].life <= 0) flashes.splice(i, 1);
  }
  for (let i = ripples.length - 1; i >= 0; i--) {
    ripples[i].life -= dt;
    if (ripples[i].life <= 0) ripples.splice(i, 1);
  }
}

const ripples = [];

export function getParticles() { return particles; }
export function getFlashes() { return flashes; }
export function getRipples() { return ripples; }

export function spawnFlash(x, y) {
  flashes.push({ x, y, life: 0.12, maxLife: 0.12, radius: 15 });
}

export function spawnRipple(x, y) {
  ripples.push({ x, y, life: 0.4, maxLife: 0.4, radius: 30 });
}

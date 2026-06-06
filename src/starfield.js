// Parallax starfield backdrop
// Stars tile across a large region and scroll at different parallax depths.

const LAYERS = [
  { count: 120, depth: 0.1, size: 1, color: 'rgba(255,255,255,0.3)' },
  { count: 80, depth: 0.3, size: 1.5, color: 'rgba(255,255,255,0.5)' },
  { count: 40, depth: 0.6, size: 2, color: 'rgba(255,255,255,0.7)' },
];

const FIELD_SIZE = 3000;

let stars = null;

function generateStars() {
  stars = LAYERS.map(layer =>
    Array.from({ length: layer.count }, () => ({
      x: Math.random() * FIELD_SIZE,
      y: Math.random() * FIELD_SIZE,
    }))
  );
}

export function drawStarfield(ctx, viewW, viewH, camX, camY) {
  if (!stars) generateStars();

  LAYERS.forEach((layer, i) => {
    ctx.fillStyle = layer.color;
    const px = camX * layer.depth;
    const py = camY * layer.depth;

    stars[i].forEach(star => {
      const sx = ((star.x - px) % FIELD_SIZE + FIELD_SIZE) % FIELD_SIZE - FIELD_SIZE / 2;
      const sy = ((star.y - py) % FIELD_SIZE + FIELD_SIZE) % FIELD_SIZE - FIELD_SIZE / 2;

      if (Math.abs(sx) < viewW / 2 && Math.abs(sy) < viewH / 2) {
        ctx.fillRect(sx, sy, layer.size, layer.size);
      }
    });
  });
}

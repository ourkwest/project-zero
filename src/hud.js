// HUD module
// Displays health, energy, current weapon, and off-screen player indicators.

const WEAPONS = ['Small Gun', 'Big Gun', 'Shotgun', 'Homing Missile', 'Repair'];
const BAR_WIDTH = 160;
const BAR_HEIGHT = 14;
const MARGIN = 16;

export function drawHUD(ctx, w, h, playerState, otherPlayers, camera) {
  ctx.save();

  // Health bar (top-left)
  drawBar(ctx, MARGIN, MARGIN, playerState.health, '#4caf50', 'HP');

  // Energy bar (below health)
  drawBar(ctx, MARGIN, MARGIN + BAR_HEIGHT + 8, playerState.energy, '#29b6f6', 'EN');

  // Current weapon (below energy)
  ctx.font = '13px monospace';
  ctx.fillStyle = '#ccc';
  ctx.textBaseline = 'top';
  ctx.fillText(WEAPONS[playerState.weapon] || 'Unknown', MARGIN, MARGIN + (BAR_HEIGHT + 8) * 2);

  // Off-screen player indicators
  drawPlayerIndicators(ctx, w, h, otherPlayers, camera);

  ctx.restore();
}

function drawBar(ctx, x, y, fraction, color, label) {
  // Background
  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  ctx.fillRect(x, y, BAR_WIDTH, BAR_HEIGHT);

  // Fill
  ctx.fillStyle = color;
  ctx.fillRect(x, y, BAR_WIDTH * Math.max(0, Math.min(1, fraction)), BAR_HEIGHT);

  // Border
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, BAR_WIDTH, BAR_HEIGHT);

  // Label
  ctx.font = '11px monospace';
  ctx.fillStyle = '#fff';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${label} ${Math.round(fraction * 100)}%`, x + 4, y + BAR_HEIGHT / 2);
}

function drawPlayerIndicators(ctx, w, h, otherPlayers, camera) {
  if (!otherPlayers || otherPlayers.length === 0) return;

  const edgeMargin = 20;
  const shipSX = camera.screenX;
  const shipSY = camera.screenY;
  const CAM_HEIGHT = 600;

  otherPlayers.forEach(player => {
    const dx = player.x - camera.x;
    const dy = player.y - camera.y;
    const cos = Math.cos(camera.angle);
    const sin = Math.sin(camera.angle);
    const rx = -(dx * sin - dy * cos);
    const ry = dx * cos + dy * sin;

    // Project with perspective
    const depth = CAM_HEIGHT + ry * 0.5;
    let psx, psy;
    if (depth > 10) {
      const scale = CAM_HEIGHT / depth;
      psx = shipSX + rx * scale;
      psy = shipSY - ry * scale;
    } else {
      // Behind camera — push far in opposite direction
      psx = shipSX - rx * 10;
      psy = shipSY + ry * 10;
    }

    // If on-screen, don't draw indicator
    if (psx >= edgeMargin && psx <= w - edgeMargin && psy >= edgeMargin && psy <= h - edgeMargin) return;

    // Clamp to screen rectangle
    const dirX = psx - shipSX;
    const dirY = psy - shipSY;

    // Find intersection with screen edges from ship position
    let t = Infinity;
    if (dirX > 0) t = Math.min(t, (w - edgeMargin - shipSX) / dirX);
    if (dirX < 0) t = Math.min(t, (edgeMargin - shipSX) / dirX);
    if (dirY > 0) t = Math.min(t, (h - edgeMargin - shipSY) / dirY);
    if (dirY < 0) t = Math.min(t, (edgeMargin - shipSY) / dirY);
    if (!isFinite(t)) return;

    const edgeX = shipSX + dirX * t;
    const edgeY = shipSY + dirY * t;
    const angle = Math.atan2(dirY, dirX);

    ctx.save();
    ctx.translate(edgeX, edgeY);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(8, 0);
    ctx.lineTo(-4, -5);
    ctx.lineTo(-4, 5);
    ctx.closePath();
    ctx.fillStyle = `hsl(${player.hue ?? 0}, 100%, 50%)`;
    ctx.fill();
    ctx.restore();
  });
}

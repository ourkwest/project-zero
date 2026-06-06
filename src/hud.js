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

  const cx = w / 2;
  const cy = h / 2;
  const edgeMargin = 30;

  otherPlayers.forEach(player => {
    // Position relative to camera center
    const dx = player.x - (camera.x + cx);
    const dy = player.y - (camera.y + cy);

    // Skip if on-screen
    if (Math.abs(dx) < cx && Math.abs(dy) < cy) return;

    // Angle to player
    const angle = Math.atan2(dy, dx);

    // Clamp to edge of screen
    const edgeX = Math.max(edgeMargin, Math.min(w - edgeMargin, cx + Math.cos(angle) * (cx - edgeMargin)));
    const edgeY = Math.max(edgeMargin, Math.min(h - edgeMargin, cy + Math.sin(angle) * (cy - edgeMargin)));

    // Draw indicator triangle
    ctx.save();
    ctx.translate(edgeX, edgeY);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(8, 0);
    ctx.lineTo(-4, -5);
    ctx.lineTo(-4, 5);
    ctx.closePath();
    ctx.fillStyle = player.color || '#ff5722';
    ctx.fill();
    ctx.restore();
  });
}

// HUD module
// Ship-centered: energy bar below ship, weapon below energy, health as arc around ship.
// Leaderboard top-right. Off-screen player indicators at edges.

const WEAPONS = ['Small Gun', 'Big Gun', 'Shotgun', 'Homing Missile', 'Laser', 'Repair'];
const MARGIN = 16;
const ENERGY_BAR_W = 80;
const ENERGY_BAR_H = 6;
const HEALTH_ARC_RADIUS = 32;

export function drawHUD(ctx, w, h, playerState, otherPlayers, camera) {
  ctx.save();
  const sx = camera.screenX;
  const sy = camera.screenY;

  if (!playerState.dead) {
    // Health arc around ship (green, shrinks from behind)
    drawHealthArc(ctx, sx, sy, playerState.health);

    // Energy bar below ship
    const barX = sx - ENERGY_BAR_W / 2;
    const barY = sy + HEALTH_ARC_RADIUS + 10;
    drawEnergyBar(ctx, barX, barY, playerState.energy);

    // Weapon name below energy bar
    ctx.font = '11px monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(WEAPONS[playerState.weapon] || 'Unknown', sx, barY + ENERGY_BAR_H + 4);
  }

  // Kill count leaderboard (top-right)
  drawLeaderboard(ctx, w, playerState.kills, otherPlayers);

  // Off-screen player indicators
  drawPlayerIndicators(ctx, w, h, otherPlayers, camera);

  ctx.restore();
}

function drawHealthArc(ctx, cx, cy, health) {
  if (health <= 0) return;
  const extent = health * Math.PI * 2;
  const startAngle = Math.PI / 2 - extent / 2;
  const endAngle = Math.PI / 2 + extent / 2;

  // Outer glow (wide, faint)
  ctx.beginPath();
  ctx.arc(cx, cy, HEALTH_ARC_RADIUS, startAngle, endAngle);
  ctx.strokeStyle = `rgba(80, 220, 80, 0.08)`;
  ctx.lineWidth = 10;
  ctx.stroke();

  // Mid glow
  ctx.beginPath();
  ctx.arc(cx, cy, HEALTH_ARC_RADIUS, startAngle, endAngle);
  ctx.strokeStyle = `rgba(80, 220, 80, 0.2)`;
  ctx.lineWidth = 5;
  ctx.stroke();

  // Bright center
  ctx.beginPath();
  ctx.arc(cx, cy, HEALTH_ARC_RADIUS, startAngle, endAngle);
  ctx.strokeStyle = `rgba(130, 255, 130, 0.7)`;
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawEnergyBar(ctx, x, y, energy) {
  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  ctx.fillRect(x, y, ENERGY_BAR_W, ENERGY_BAR_H);
  ctx.fillStyle = '#29b6f6';
  ctx.fillRect(x, y, ENERGY_BAR_W * Math.max(0, Math.min(1, energy)), ENERGY_BAR_H);
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, ENERGY_BAR_W, ENERGY_BAR_H);
}

function drawLeaderboard(ctx, w, localKills, otherPlayers) {
  const entries = [{ name: 'You', kills: localKills || 0 }];
  if (otherPlayers) {
    for (const p of otherPlayers) {
      entries.push({ name: p.name || '???', kills: p.kills || 0 });
    }
  }
  entries.sort((a, b) => b.kills - a.kills);

  ctx.font = '12px monospace';
  ctx.textBaseline = 'top';
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillText('KILLS', w - MARGIN, MARGIN);
  for (let i = 0; i < entries.length; i++) {
    const ey = MARGIN + 16 + i * 16;
    ctx.fillStyle = i === 0 ? '#ff0' : 'rgba(255,255,255,0.5)';
    ctx.fillText(`${entries[i].name}  ${entries[i].kills}`, w - MARGIN, ey);
  }
  ctx.textAlign = 'left';
}

function drawPlayerIndicators(ctx, w, h, otherPlayers, camera) {
  if (!otherPlayers || otherPlayers.length === 0) return;

  const edgeMargin = 20;
  const shipSX = camera.screenX;
  const shipSY = camera.screenY;
  const CAM_HEIGHT = 600;

  otherPlayers.forEach(player => {
    if (player.dead) return;
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
      // Behind camera — use raw direction (no perspective)
      psx = shipSX + rx;
      psy = shipSY - ry;
    }

    // If on-screen, don't draw indicator
    if (psx >= edgeMargin && psx <= w - edgeMargin && psy >= edgeMargin && psy <= h - edgeMargin) return;

    // Use angle from ship screen position to projected position
    const dirX = psx - shipSX;
    const dirY = psy - shipSY;
    const dirLen = Math.sqrt(dirX * dirX + dirY * dirY);
    if (dirLen < 1) return;

    // Normalized direction
    const nx = dirX / dirLen;
    const ny = dirY / dirLen;

    // Find intersection with screen edges from ship position
    let t = Infinity;
    if (nx > 0) t = Math.min(t, (w - edgeMargin - shipSX) / nx);
    if (nx < 0) t = Math.min(t, (edgeMargin - shipSX) / nx);
    if (ny > 0) t = Math.min(t, (h - edgeMargin - shipSY) / ny);
    if (ny < 0) t = Math.min(t, (edgeMargin - shipSY) / ny);
    if (!isFinite(t) || t < 0) return;

    const edgeX = shipSX + nx * t;
    const edgeY = shipSY + ny * t;
    const angle = Math.atan2(ny, nx);

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

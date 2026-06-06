// UI Screens for lobby flow
// Each screen is a function that returns an HTML string.
// The active screen is rendered into a #ui container.

import { ADJ1, ADJ2, ANIMALS } from './session-id.js';

export function splashScreen() {
  return `
    <div class="screen splash">
      <h1 class="title">PROJECT ZERO</h1>
      <p class="subtitle">Space Dogfighting</p>
      <div class="menu">
        <button data-action="host">Host Game</button>
        <button data-action="join">Join Game</button>
      </div>
    </div>
  `;
}

export function hostScreen({ name = '', hue = 180, gamepadConnected = false, gamepads = [], gamepadIndex = 0 }) {
  return `
    <div class="screen host">
      <h2>Host Game</h2>
      <label>Name<input type="text" id="player-name" value="${escHtml(name)}" maxlength="16" placeholder="Enter your name"></label>
      <label>Color
        <input type="range" id="player-hue" min="0" max="360" value="${hue}">
        <span class="color-preview" style="background:hsl(${hue},100%,50%)"></span>
      </label>
      <label style="${gamepads.length > 1 ? '' : 'display:none'}">Gamepad
        <select id="gamepad-select">${gamepads.map(g => `<option value="${g.index}" ${g.index === gamepadIndex ? 'selected' : ''}>${g.id || 'Gamepad ' + g.index}</option>`).join('')}</select>
      </label>
      <div class="gamepad-status ${gamepadConnected ? 'connected' : ''}">
        Gamepad: ${gamepadConnected ? '✓ Connected' : '✗ Not detected'}
      </div>
      <button data-action="start-host" ${(!gamepadConnected || !name) ? 'disabled' : ''}>Start Game</button>
      <button data-action="back" class="secondary">Back</button>
    </div>
  `;
}

export function joinScreen({ name = '', hue = 180, gamepadConnected = false, adj1 = '', adj2 = '', animal = '', gamepads = [], gamepadIndex = 0 }) {
  return `
    <div class="screen join">
      <h2>Join Game</h2>
      <label>Name<input type="text" id="player-name" value="${escHtml(name)}" maxlength="16" placeholder="Enter your name"></label>
      <label>Color
        <input type="range" id="player-hue" min="0" max="360" value="${hue}">
        <span class="color-preview" style="background:hsl(${hue},100%,50%)"></span>
      </label>
      <div class="session-id-input">
        <select id="sel-adj1">${options(ADJ1, adj1)}</select>
        <select id="sel-adj2">${options(ADJ2, adj2)}</select>
        <select id="sel-animal">${options(ANIMALS, animal)}</select>
      </div>
      <label style="${gamepads.length > 1 ? '' : 'display:none'}">Gamepad
        <select id="gamepad-select">${gamepads.map(g => `<option value="${g.index}" ${g.index === gamepadIndex ? 'selected' : ''}>${g.id || 'Gamepad ' + g.index}</option>`).join('')}</select>
      </label>
      <div class="gamepad-status ${gamepadConnected ? 'connected' : ''}">
        Gamepad: ${gamepadConnected ? '✓ Connected' : '✗ Not detected'}
      </div>
      <button data-action="join-session" ${(!gamepadConnected || !name || !adj1 || !adj2 || !animal) ? 'disabled' : ''}>Join</button>
      <button data-action="back" class="secondary">Back</button>
    </div>
  `;
}

export function sessionScreen({ sessionId, players = [], isHost = false }) {
  return `
    <div class="screen session">
      <h2>Session</h2>
      <div class="session-code">${escHtml(sessionId)}</div>
      <div class="players">
        <h3>Players (${players.length})</h3>
        <ul>${players.map(p => `<li><span class="dot" style="background:hsl(${p.hue},100%,50%)"></span>${escHtml(p.name)}</li>`).join('')}</ul>
      </div>
      ${isHost ? '<button data-action="play">Play</button>' : '<p class="waiting">Waiting for host to start...</p>'}
    </div>
  `;
}

function options(list, selected) {
  return '<option value="">—</option>' + list.map(v =>
    `<option value="${v}" ${v === selected ? 'selected' : ''}>${v}</option>`
  ).join('');
}

function escHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

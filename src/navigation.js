// Screen navigation / state machine
// Manages transitions between UI screens and the game canvas.

import { splashScreen, hostScreen, joinScreen, sessionScreen } from './screens.js';
import { generateSessionId, sessionIdToString, sessionIdToKey } from './session-id.js';
import { createHost, joinSession } from './network.js';
import { getConnectedGamepads, setGamepadIndex } from './input.js';

const GAMEPAD_POLL_INTERVAL = 500;

export function createNavigation(uiContainer, canvas, onGameStart) {
  let currentScreen = 'splash';
  let state = { name: 'Player 1', hue: Math.floor(Math.random() * 360), gamepadConnected: false, gamepadIndex: 0, gamepads: [], adj1: 'Big', adj2: 'Angry', animal: 'Shark' };
  let sessionState = { sessionId: null, players: [], isHost: false };
  let network = null;
  let gamepadTimer = null;
  let isJoin = false;

  function show(screen) {
    currentScreen = screen;
    canvas.style.display = screen === 'game' ? 'block' : 'none';
    uiContainer.style.display = screen === 'game' ? 'none' : 'flex';
    if (screen !== 'game') renderScreen();
    if (screen === 'host' || screen === 'join') startGamepadPolling();
    else stopGamepadPolling();
  }

  function renderScreen() {
    let html = '';
    if (currentScreen === 'splash') html = splashScreen();
    else if (currentScreen === 'host') html = hostScreen(state);
    else if (currentScreen === 'join') html = joinScreen(state);
    else if (currentScreen === 'session') html = sessionScreen(sessionState);
    uiContainer.innerHTML = html;
    bindEvents();
  }

  function updateButtons() {
    const btn = uiContainer.querySelector('[data-action="start-host"], [data-action="join-session"]');
    if (!btn) return;
    if (currentScreen === 'host') {
      btn.disabled = !state.gamepadConnected || !state.name;
    } else if (currentScreen === 'join') {
      btn.disabled = !state.gamepadConnected || !state.name || !state.adj1 || !state.adj2 || !state.animal;
    }
  }

  function bindEvents() {
    uiContainer.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', () => handleAction(btn.dataset.action));
    });
    const nameInput = uiContainer.querySelector('#player-name');
    if (nameInput) nameInput.addEventListener('input', e => { state.name = e.target.value.trim(); updateButtons(); });

    const hueInput = uiContainer.querySelector('#player-hue');
    if (hueInput) hueInput.addEventListener('input', e => {
      state.hue = parseInt(e.target.value);
      const preview = uiContainer.querySelector('.color-preview');
      if (preview) preview.style.background = `hsl(${state.hue},100%,50%)`;
    });

    const gpSelect = uiContainer.querySelector('#gamepad-select');
    if (gpSelect) gpSelect.addEventListener('change', e => {
      state.gamepadIndex = parseInt(e.target.value);
    });

    // Session ID selects
    ['sel-adj1', 'sel-adj2', 'sel-animal'].forEach(id => {
      const el = uiContainer.querySelector('#' + id);
      if (el) el.addEventListener('change', () => {
        state.adj1 = uiContainer.querySelector('#sel-adj1')?.value || '';
        state.adj2 = uiContainer.querySelector('#sel-adj2')?.value || '';
        state.animal = uiContainer.querySelector('#sel-animal')?.value || '';
        updateButtons();
      });
    });
  }

  function handleAction(action) {
    if (action === 'host') { isJoin = false; show('host'); }
    else if (action === 'join') { isJoin = true; state.name = 'Player 2'; show('join'); }
    else if (action === 'back') { destroyNetwork(); show('splash'); }
    else if (action === 'start-host') { setGamepadIndex(state.gamepadIndex); startHost(); }
    else if (action === 'join-session') { setGamepadIndex(state.gamepadIndex); joinGame(); }
    else if (action === 'play') startPlay();
  }

  function spreadHue(players) {
    // Minimum separation: 360 / max_players = 30°
    const MIN_SEP = 30;
    // First player keeps their exact hue. Subsequent players get nudged if too close.
    for (let i = 1; i < players.length; i++) {
      let hue = players[i].hue;
      // Check against all previously assigned hues
      for (let attempt = 0; attempt < 360; attempt++) {
        let tooClose = false;
        for (let j = 0; j < i; j++) {
          const diff = Math.abs(((hue - players[j].hue + 180) % 360 + 360) % 360 - 180);
          if (diff < MIN_SEP) { tooClose = true; break; }
        }
        if (!tooClose) break;
        // Nudge clockwise
        hue = (hue + 1) % 360;
      }
      players[i].hue = hue;
    }
  }

  function startHost() {
    const id = { adj1: 'Big', adj2: 'Angry', animal: 'Shark' };
    const key = sessionIdToKey(id);
    sessionState = {
      sessionId: sessionIdToString(id),
      players: [{ name: state.name, hue: state.hue }],
      isHost: true,
    };
    network = createHost(key, {
      onReady: () => show('session'),
      onPlayerJoin: (peerId, info) => {
        sessionState.players.push({ peerId, ...info });
        spreadHue(sessionState.players);
        state.hue = sessionState.players[0].hue;
        network.broadcastPlayers(sessionState.players);
        renderScreen();
      },
      onPlayerLeave: (peerId) => {
        sessionState.players = sessionState.players.filter(p => p.peerId !== peerId);
        spreadHue(sessionState.players);
        state.hue = sessionState.players[0].hue;
        network.broadcastPlayers(sessionState.players);
        renderScreen();
      },
      onPlayerList: () => {},
      onGameData: (peerId, payload) => onGameStart?.onGameData?.(peerId, payload),
      onError: err => console.error('Host error:', err),
    }, { name: state.name, hue: state.hue });
  }

  function joinGame() {
    const key = `${state.adj1}-${state.adj2}-${state.animal}`.toLowerCase();
    const playerInfo = { name: state.name, hue: state.hue };
    sessionState = { sessionId: `${state.adj1} ${state.adj2} ${state.animal}`, players: [], isHost: false };

    network = joinSession(key, playerInfo, {
      onReady: () => show('session'),
      onPlayerList: (players) => {
        sessionState.players = players;
        // Pick our assigned hue from the host's player list
        const me = players.find(p => p.name === state.name && p.peerId !== 'host');
        if (me) state.hue = me.hue;
        renderScreen();
      },
      onGameData: (peerId, payload) => onGameStart?.onGameData?.(peerId, payload),
      onGameStart: () => { show('game'); sessionState.localHue = state.hue; onGameStart?.start?.(network, sessionState); },
      onDisconnect: () => { destroyNetwork(); show('splash'); },
      onError: err => console.error('Join error:', err),
    });
  }

  function startPlay() {
    network.startGame();
    show('game');
    sessionState.localHue = state.hue;
    onGameStart?.start?.(network, sessionState);
  }

  function startGamepadPolling() {
    stopGamepadPolling();
    gamepadTimer = setInterval(() => {
      const gps = getConnectedGamepads();
      const connected = gps.length > 0;
      const changed = connected !== state.gamepadConnected || gps.length !== state.gamepads.length;
      state.gamepads = gps;
      state.gamepadConnected = connected;

      if (connected && state.gamepadIndex === 0 && isJoin && gps.length > 1) {
        state.gamepadIndex = gps[gps.length - 1].index;
      } else if (connected && !isJoin) {
        state.gamepadIndex = gps[0].index;
      }

      if (changed) {
        const statusEl = uiContainer.querySelector('.gamepad-status');
        if (statusEl) {
          statusEl.className = 'gamepad-status' + (connected ? ' connected' : '');
          statusEl.textContent = 'Gamepad: ' + (connected ? `✓ ${gps.length} connected` : '✗ Not detected');
        }
        // Update gamepad dropdown
        const gpSelect = uiContainer.querySelector('#gamepad-select');
        if (gpSelect && gps.length > 1) {
          gpSelect.innerHTML = gps.map(g => `<option value="${g.index}" ${g.index === state.gamepadIndex ? 'selected' : ''}>${g.id || 'Gamepad ' + g.index}</option>`).join('');
          gpSelect.parentElement.style.display = '';
        } else if (gpSelect) {
          gpSelect.parentElement.style.display = 'none';
        }
        updateButtons();
      }
    }, GAMEPAD_POLL_INTERVAL);
  }

  function stopGamepadPolling() {
    if (gamepadTimer) { clearInterval(gamepadTimer); gamepadTimer = null; }
  }

  function destroyNetwork() {
    if (network) { network.destroy(); network = null; }
  }

  function checkUrlParams() {
    const params = new URLSearchParams(window.location.search);
    if (params.has('session')) {
      const parts = params.get('session').split('-');
      if (parts.length === 3) {
        state.adj1 = parts[0]; state.adj2 = parts[1]; state.animal = parts[2];
        show('join');
        return;
      }
    }
    show('splash');
  }

  checkUrlParams();
  return { show, getNetwork: () => network, getSessionState: () => sessionState };
}

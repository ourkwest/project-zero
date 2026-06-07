// Network abstraction layer
// Star topology: host relays all messages between peers.
// Interface designed to allow swapping PeerJS for Trystero later.

import Peer from 'peerjs';

const PEER_ID_PREFIX = 'p0-';
const MAX_PLAYERS = 12;

// Creates a host network session
export function createHost(sessionKey, callbacks, hostInfo) {
  const peerId = PEER_ID_PREFIX + sessionKey;
  const peer = new Peer(peerId);
  const connections = new Map(); // peerId -> { conn, playerInfo }

  peer.on('open', () => callbacks.onReady?.());

  peer.on('connection', conn => {
    conn.on('open', () => {
      if (connections.size >= MAX_PLAYERS - 1) {
        conn.send({ type: 'error', message: 'Session full' });
        conn.close();
        return;
      }
    });

    conn.on('data', data => {
      if (data.type === 'join') {
        connections.set(conn.peer, { conn, playerInfo: data.playerInfo });
        callbacks.onPlayerJoin?.(conn.peer, data.playerInfo);
        broadcastPlayerList(connections, callbacks, hostInfo);
      } else if (data.type === 'game') {
        // Relay game data to all other peers
        for (const [id, { conn: c }] of connections) {
          if (id !== conn.peer) {
            c.send(data);
          }
        }
        callbacks.onGameData?.(conn.peer, data.payload);
      }
    });

    conn.on('close', () => {
      connections.delete(conn.peer);
      callbacks.onPlayerLeave?.(conn.peer);
      broadcastPlayerList(connections, callbacks, hostInfo);
    });
  });

  peer.on('error', err => callbacks.onError?.(err));

  return {
    // Send game data to all peers
    broadcast(payload) {
      const msg = { type: 'game', peerId: peer.id, payload };
      for (const { conn } of connections.values()) {
        conn.send(msg);
      }
    },
    // Broadcast an explicit player list (e.g. after hue spreading)
    broadcastPlayers(players) {
      const msg = { type: 'players', players };
      for (const { conn } of connections.values()) {
        conn.send(msg);
      }
    },
    startGame() {
      const msg = { type: 'start' };
      for (const { conn } of connections.values()) {
        conn.send(msg);
      }
    },
    getPlayerCount() { return connections.size + 1; },
    destroy() { peer.destroy(); },
  };
}

// Joins an existing host session
export function joinSession(sessionKey, playerInfo, callbacks) {
  const peerId = PEER_ID_PREFIX + sessionKey + '-' + Math.random().toString(36).slice(2, 8);
  const peer = new Peer(peerId);
  let conn = null;

  peer.on('open', () => {
    conn = peer.connect(PEER_ID_PREFIX + sessionKey, { reliable: true });

    conn.on('open', () => {
      conn.send({ type: 'join', playerInfo });
      callbacks.onReady?.();
    });

    conn.on('data', data => {
      if (data.type === 'players') {
        callbacks.onPlayerList?.(data.players);
      } else if (data.type === 'game') {
        callbacks.onGameData?.(data.peerId, data.payload);
      } else if (data.type === 'start') {
        callbacks.onGameStart?.();
      } else if (data.type === 'error') {
        callbacks.onError?.(new Error(data.message));
      }
    });

    conn.on('close', () => callbacks.onDisconnect?.());
  });

  peer.on('error', err => callbacks.onError?.(err));

  return {
    broadcast(payload) {
      if (conn) conn.send({ type: 'game', peerId: peer.id, payload });
    },
    destroy() { peer.destroy(); },
  };
}

function broadcastPlayerList(connections, callbacks, hostInfo) {
  const players = [{ peerId: 'host', ...hostInfo }];
  for (const [id, { playerInfo }] of connections) {
    players.push({ peerId: id, ...playerInfo });
  }
  callbacks.onPlayerList?.(players);
  const msg = { type: 'players', players };
  for (const { conn } of connections.values()) {
    conn.send(msg);
  }
}

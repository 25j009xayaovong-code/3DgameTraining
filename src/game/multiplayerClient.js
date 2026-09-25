const DEFAULT_SERVER_URL = 'ws://localhost:3001';

export function connectMultiplayer({ onStatus, onWelcome, onPlayerJoined, onPlayerState, onPlayerLeft }) {
  const serverUrl = import.meta.env.VITE_MULTIPLAYER_URL || DEFAULT_SERVER_URL;
  const socket = new WebSocket(serverUrl);
  let heartbeat;

  onStatus('connecting');
  socket.addEventListener('open', () => {
    onStatus('online');
    heartbeat = window.setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: 'ping' }));
    }, 15000);
  });
  socket.addEventListener('message', (event) => {
    try {
      const message = JSON.parse(event.data);
      if (message.type === 'welcome') onWelcome(message);
      if (message.type === 'player-joined') onPlayerJoined(message.player);
      if (message.type === 'player-state') onPlayerState(message.player);
      if (message.type === 'player-left') onPlayerLeft(message.id);
    } catch {
      // Ignore malformed server messages.
    }
  });
  socket.addEventListener('error', () => onStatus('offline'));
  socket.addEventListener('close', () => {
    window.clearInterval(heartbeat);
    onStatus('offline');
  });

  return {
    sendState(state) {
      if (socket.readyState !== WebSocket.OPEN) return;
      socket.send(JSON.stringify({ type: 'state', ...state }));
    },
    close() {
      window.clearInterval(heartbeat);
      socket.close();
    }
  };
}
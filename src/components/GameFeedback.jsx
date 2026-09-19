export default function GameFeedback() {
  return (
    <>
      <div id="minimap"><canvas id="minimap-canvas" width="170" height="170" /></div>
      <div id="altitude-indicator">⛰️ <span id="altitude-value">0</span>m</div>
      <div id="hit-marker" />
      <div id="damage-vignette" />
      <div id="pickup-toast" />
      <div id="interact-prompt">
        Press <kbd style={{ background: '#ffcc00', color: '#000', padding: '2px 8px', borderRadius: 4 }}>E</kbd> to Open
      </div>
      <div id="loot-notification" />
      <div id="message">
        <h1 id="message-title">Victory!</h1>
        <p id="message-text">You collected all the cubes!</p>
        <button id="message-btn">Play Again</button>
      </div>
      <div id="crosshair" />
      <div id="controls-hint" style={{ display: 'none' }}>
        <kbd>WASD</kbd> Move • <kbd>Space</kbd> Jump • <kbd>Shift</kbd> Sprint • <kbd>LMB</kbd> Attack • <kbd>R</kbd> Fireball • <kbd>F</kbd> Shield • <kbd>V</kbd> Slow-Mo • <kbd>G</kbd> Grapple • <kbd>T</kbd> Skills
      </div>
    </>
  );
}

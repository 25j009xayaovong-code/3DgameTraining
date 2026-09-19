export default function ProgressionOverlays() {
  return (
    <>
      <div id="levelup-screen">
        <div id="levelup-content">
          <div className="levelup-title">LEVEL UP!</div>
          <div className="levelup-number" id="levelup-number">2</div>
          <div className="levelup-subtitle" id="levelup-subtitle">+1 SKILL POINT</div>
          <div className="levelup-hint">
            Press <kbd style={{ background: '#2a2a4a', padding: '3px 8px', borderRadius: 4, color: '#7eff7e' }}>T</kbd> to open skill tree
          </div>
          <button id="levelup-continue">CONTINUE</button>
        </div>
      </div>
      <div id="skill-tree">
        <button id="skill-close">✕</button>
        <div id="skill-header">
          <h1>🌳 SKILL TREE</h1>
          <div className="points">Available Points: <span id="skill-points">0</span></div>
          <div className="hint">Click a highlighted skill to spend 1 point</div>
        </div>
        <div id="skill-branches" />
      </div>
    </>
  );
}

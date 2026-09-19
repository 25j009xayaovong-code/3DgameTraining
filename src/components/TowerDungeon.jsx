const details = [
  ['THREAT', 'tower-threat', '1 / 10'],
  ['ENEMIES', 'tower-enemies', 'Skeleton Warriors'],
  ['REWARD', 'tower-reward', 'Rare cache'],
  ['ZONE', 'tower-zone', 'Combat floor'],
];

export default function TowerDungeon() {
  return (
    <div id="tower-dungeon">
      <div id="tower-dungeon-content">
        <div className="tower-kicker">ENDGAME ASCENSION</div>
        <h1>🏰 THE SKYFALL TOWER</h1>
        <div className="tower-subtitle">100 floors above the world · checkpoint every 10 floors</div>
        <div id="tower-floor-card">
          <div id="tower-floor-number">FLOOR 1</div>
          <div id="tower-theme">ANCIENT RUINS</div>
          <div id="tower-boss" />
          <div id="tower-floor-details">
            {details.map(([label, id, value]) => (
              <div className="tower-detail" key={id}><strong>{label}</strong><span id={id}>{value}</span></div>
            ))}
          </div>
          <div id="tower-floor-log">The gate opens onto an endless ascent.</div>
          <div id="tower-progress"><div id="tower-progress-fill" /></div>
          <div id="tower-checkpoint">Checkpoint: Floor 1</div>
          <div id="tower-actions">
            <button id="tower-fight-btn">⚔️ ENTER FLOOR</button>
            <button id="tower-rest-btn" style={{ display: 'none' }}>✦ REST AT CHECKPOINT</button>
            <button id="tower-leave-btn">↩ LEAVE TOWER</button>
          </div>
        </div>
      </div>
    </div>
  );
}

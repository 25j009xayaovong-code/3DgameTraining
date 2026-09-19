const features = [
  ['⭐ XP & Levels', true],
  ['🌳 Skill Tree', true],
  ['💥 6 Abilities', true],
  ['💾 Auto-Save', true],
  ['⚔️ Combat Juice'],
  ['🔥 Combos'],
  ['💎 Loot Rarity'],
  ['🎁 Chests'],
  ['🪄 Spells'],
  ['⚓ Grapple'],
  ['🐉 Dragon'],
  ['🗿 Titan Colossus', true],
  ['🏰 100-Floor Tower', true],
];

function ModeCard({ mode, icon, title, children, selected = false }) {
  return (
    <div className={`mode-card${selected ? ' selected' : ''}`} data-mode={mode}>
      <div className="mode-icon">{icon}</div>
      <div className="mode-title">{title}</div>
      <div className="mode-desc">{children}</div>
    </div>
  );
}

export default function StartScreen() {
  return (
    <div id="start-screen">
      <h1>⛏️ MINECRAFT ADVENTURE</h1>
      <div className="subtitle">Drop 3 — Player Progression · Skill Tree · Abilities</div>
      <div id="features-list">
        {features.map(([feature, isNew]) => (
          <div className={`feat${isNew ? ' new' : ''}`} key={feature}>{feature}</div>
        ))}
      </div>
      <div id="mode-selector">
        <ModeCard mode="adventure" icon="🗺️" title="ADVENTURE" selected>
          <>Collect cubes.<br />Fight the dragon.</>
        </ModeCard>
        <ModeCard mode="battleroyale" icon="⚔️" title="BATTLE ROYALE">
          <>20 NPC players.<br />Shrinking zone.</>
        </ModeCard>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button id="continue-btn">▶ CONTINUE (Level 1)</button>
        <button id="start-btn">▶ NEW GAME</button>
      </div>
      <div className="instructions">
        <kbd>W A S D</kbd> Move • <kbd>Mouse</kbd> Look • <kbd>Space</kbd> Jump / Fly • <kbd>Shift</kbd> Sprint / Dash<br />
        <kbd>LMB</kbd> Attack • <kbd>R</kbd> Fireball • <kbd>F</kbd> Shield • <kbd>V</kbd> Time Slow • <kbd>G</kbd> Grapple<br />
        <kbd>T</kbd> Skill Tree • <kbd>C</kbd> Camera • <kbd>E</kbd> Open Chest • <kbd>Q</kbd> Drop Weapon
      </div>
    </div>
  );
}

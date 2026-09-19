const abilities = [
  ['dash', '⇧W', 'Dash'],
  ['fireball', 'R', 'Fireball'],
  ['doublejump', '␣', '2×Jump'],
  ['shield', 'F', 'Shield'],
  ['fly', '␣', 'Fly'],
  ['timeslow', 'V', 'Slow-Mo'],
];

function BossBar({ id, title, fillId, className }) {
  return (
    <div id={id}>
      <div className={className}>{title}</div>
      <div id={`${id}-health-bar`}>
        <div id={fillId} />
      </div>
    </div>
  );
}

export default function GameHud() {
  return (
    <>
      <div id="hud" style={{ display: 'none' }}>
        <div className="stat">🟨 Cubes: <span id="cube-count">0</span> / 50</div>
        <div className="stat">💀 Kills: <span id="kill-count">0</span></div>
        <div className="stat">❤️ Health</div>
        <div id="health-bar"><div id="health-fill" /></div>
        <div className="stat" style={{ padding: '6px 14px', fontSize: 13 }}>⭐ XP</div>
        <div id="xp-bar"><div id="xp-fill" /></div>
        <div id="xp-text">0 / 100 XP</div>
      </div>

      <div id="br-hud">
        <div className="br-title">⚔️ BATTLE ROYALE</div>
        <div className="br-stats">
          <span>ALIVE <span id="br-alive-value">21</span></span>
          <span>KILLS <span id="br-kills-value">0</span></span>
          <span>ZONE <span id="br-zone-value">100%</span></span>
        </div>
        <div id="br-zone-bar"><div id="br-zone-fill" /></div>
      </div>

      <div id="level-display">
        <span className="lv">LV <span id="level-value">1</span></span>
        <span className="sp" id="skill-points-display">🎯 0 Skill Points (T)</span>
      </div>
      <div id="time-display">
        <span className="time" id="time-label">12:00 PM</span>
        <span className="weather" id="weather-label">☀️ Clear</span>
      </div>
      <div id="combo-display">
        <div className="combo-count" id="combo-count">0</div>
        <div className="combo-label">COMBO</div>
        <div className="combo-bar"><div className="combo-fill" id="combo-fill" /></div>
      </div>

      <BossBar id="dragon-bar" title="🐉 ANCIENT DRAGON 🐉" className="dragon-title" fillId="dragon-health-fill" />
      <BossBar id="titan-bar" title="🗿 TITAN COLOSSUS 🗿" className="titan-title" fillId="titan-health-fill" />
      <div id="weather-banner" />
      <div id="camera-toggle-btn">📷 Camera: <span className="mode" id="mode-label">FIRST PERSON</span> (C)</div>
      <div id="weapon-hud">
        <div className="weapon-name" id="weapon-name">— No Weapon —</div>
        <div className="weapon-desc" id="weapon-desc">Find a weapon on the map</div>
        <div className="weapon-stats" id="weapon-stats" />
      </div>
      <div id="anchor-cooldown" style={{ display: 'none' }}>⚓ <span className="ready" id="anchor-status">READY</span></div>
      <div id="ability-bar">
        {abilities.map(([id, keyLabel, label]) => (
          <div className="ability" id={`ability-${id}`} key={id}>
            <span className="key">{keyLabel}</span>{label}<span className="cd" id={`cd-${id}`} />
          </div>
        ))}
      </div>
    </>
  );
}

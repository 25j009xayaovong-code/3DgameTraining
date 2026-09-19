// Static balancing and world configuration kept apart from the runtime engine.
export const SAVE_KEY = 'mc_adventure_save_v3';

export const SKILLS = {
  combat: [
    { id: 'power1', name: 'Strength I', desc: '+15% weapon damage', cost: 1, requires: null },
    { id: 'power2', name: 'Strength II', desc: '+30% weapon damage (total)', cost: 1, requires: 'power1' },
    { id: 'crit1', name: 'Critical Eye', desc: '+10% crit chance', cost: 1, requires: null },
    { id: 'crit2', name: 'Deadly Precision', desc: 'Crits deal 3× damage', cost: 2, requires: 'crit1' },
    { id: 'speed1', name: 'Swift Strikes', desc: '-20% weapon cooldown', cost: 1, requires: null },
  ],
  movement: [
    { id: 'dash', name: 'Dash', desc: 'Press Shift+W to dash forward', cost: 1, requires: null, ability: 'dash' },
    { id: 'doublejump', name: 'Double Jump', desc: 'Jump twice in mid-air', cost: 2, requires: 'dash', ability: 'doublejump' },
    { id: 'speedboost', name: 'Swift Feet', desc: '+15% movement speed', cost: 1, requires: null },
    { id: 'fly', name: 'Flight', desc: 'Hold Space in mid-air to fly', cost: 3, requires: 'doublejump', ability: 'fly' },
  ],
  survival: [
    { id: 'hp1', name: 'Toughness I', desc: '+25 max HP', cost: 1, requires: null },
    { id: 'hp2', name: 'Toughness II', desc: '+25 max HP (total +50)', cost: 2, requires: 'hp1' },
    { id: 'regen', name: 'Regeneration', desc: 'Slowly regenerate HP', cost: 2, requires: 'hp1' },
    { id: 'shield', name: 'Energy Shield', desc: 'Press F for 3s invulnerability', cost: 2, requires: 'regen', ability: 'shield' },
  ],
  magic: [
    { id: 'fireball', name: 'Fireball', desc: 'Press R to launch a fireball', cost: 1, requires: null, ability: 'fireball' },
    { id: 'spellpower', name: 'Arcane Power', desc: '+30% spell damage', cost: 1, requires: 'fireball' },
    { id: 'timeslow', name: 'Time Slow', desc: 'Press V to slow time for 5s', cost: 3, requires: 'spellpower', ability: 'timeslow' },
  ],
};

export const WEAPON_TYPES = {
  sword: { name: '⚔️ Sword', desc: 'Melee slash', damage: 15, range: 3.5, cooldown: 0.5, type: 'melee', swingStyle: 'slash' },
  bow: { name: '🏹 Bow', desc: 'Ranged arrow', damage: 25, range: 25, cooldown: 1.2, type: 'ranged', swingStyle: 'draw' },
  wand: { name: '🪄 Magic Wand', desc: 'Magic bolt', damage: 40, range: 20, cooldown: 1.5, type: 'magic', swingStyle: 'cast', spellColor: 0x9b59b6, spellGlow: 0xd888ff },
  thunderHammer: { name: '⚡ Thunder Hammer', desc: 'Shockwave slam', damage: 34, range: 4.5, cooldown: 1, type: 'melee', swingStyle: 'slash', ability: 'shockwave' },
  dragonSlayer: { name: '🐉 Dragon Slayer Sword', desc: 'Double damage to dragons', damage: 42, range: 4.5, cooldown: 0.7, type: 'melee', swingStyle: 'slash', ability: 'dragonSlayer' },
  voidBow: { name: '🌌 Void Bow', desc: 'Piercing void shot', damage: 38, range: 32, cooldown: 1, type: 'ranged', swingStyle: 'draw', ability: 'voidShot' },
  frostAxe: { name: '❄️ Frost Axe', desc: 'Freezes enemies', damage: 30, range: 4.2, cooldown: 0.9, type: 'melee', swingStyle: 'slash', ability: 'freeze' },
};

export const RARITY = {
  common: { name: 'Common', color: 0xcccccc, glow: 0x999999, cubeBonus: 1 },
  rare: { name: 'Rare', color: 0x4a9fff, glow: 0x2a6fcf, cubeBonus: 3 },
  epic: { name: 'Epic', color: 0xa050dc, glow: 0x7038a8, cubeBonus: 8 },
  legendary: { name: 'Legendary', color: 0xffb400, glow: 0xff8800, cubeBonus: 20 },
};

export const WEATHERS = {
  clear: { name: '☀️ Clear', fogNear: 80, fogFar: 260, sun: 1, amb: 0.55, rain: 0 },
  cloudy: { name: '☁️ Cloudy', fogNear: 60, fogFar: 220, sun: 0.6, amb: 0.5, rain: 0 },
  rain: { name: '🌧️ Rain', fogNear: 40, fogFar: 160, sun: 0.35, amb: 0.4, rain: 1 },
  storm: { name: '⛈️ Storm', fogNear: 25, fogFar: 120, sun: 0.2, amb: 0.3, rain: 2, lightning: true },
  fog: { name: '🌫️ Foggy', fogNear: 15, fogFar: 80, sun: 0.4, amb: 0.5, rain: 0 },
};

export const MAP = {
  groundSize: 700,
  treeCount: 420,
  rockCount: 240,
  cubeCount: 120,
  enemyCount: 60,
  weaponCount: 36,
  worldBound: 330,
  terrainSegments: 160,
  riverWidth: 22,
  riverDepth: 4,
};

export const START_POSITION = { x: 20, z: 130 };

import * as THREE from 'three';
import { MAP, RARITY, SAVE_KEY, SKILLS, START_POSITION, WEAPON_TYPES, WEATHERS } from './gameData.js';

/**
 * The original Three.js gameplay loop. It is deliberately isolated from React so
 * the rendering, physics, keyboard controls, and saved-game behavior remain intact.
 */
export function startGameEngine() {
    // ============================================================
    //  AUDIO
    // ============================================================
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    let audioCtx = null, masterGain = null;
    function initAudio() {
      if (audioCtx) return;
      audioCtx = new AudioCtx();
      masterGain = audioCtx.createGain();
      masterGain.gain.value = 0.4;
      masterGain.connect(audioCtx.destination);
    }
    function playTone(freq, dur, type = 'sine', vol = 0.3, detune = 0) {
      if (!audioCtx) return;
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.type = type; o.frequency.value = freq; o.detune.value = detune;
      g.gain.setValueAtTime(vol, audioCtx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
      o.connect(g); g.connect(masterGain);
      o.start(); o.stop(audioCtx.currentTime + dur);
    }
    function playNoise(dur, filterFreq, vol = 0.2) {
      if (!audioCtx) return;
      const sz = audioCtx.sampleRate * dur;
      const buf = audioCtx.createBuffer(1, sz, audioCtx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < sz; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / sz);
      const s = audioCtx.createBufferSource(); s.buffer = buf;
      const f = audioCtx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = filterFreq;
      const g = audioCtx.createGain();
      g.gain.setValueAtTime(vol, audioCtx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
      s.connect(f); f.connect(g); g.connect(masterGain); s.start();
    }
    const SFX = {
      footstepGrass: () => playNoise(0.08, 600, 0.15),
      footstepWood: () => { playTone(180, 0.06, 'square', 0.15); playNoise(0.05, 400, 0.1); },
      footstepWater: () => playNoise(0.15, 300, 0.2),
      footstepStone: () => playNoise(0.08, 1200, 0.18),
      hitLight: () => { playTone(340, 0.08, 'square', 0.35); playNoise(0.06, 800, 0.25); },
      hitHeavy: () => { playTone(160, 0.15, 'sawtooth', 0.45); playTone(90, 0.2, 'square', 0.4); playNoise(0.1, 400, 0.3); },
      hitMagic: () => { playTone(600, 0.1, 'sine', 0.3); playTone(1200, 0.15, 'sine', 0.25); },
      swordSwing: () => playNoise(0.15, 2500, 0.15),
      bowShot: () => { playTone(600, 0.1, 'triangle', 0.25); playNoise(0.1, 3000, 0.1); },
      magicCast: () => { playTone(880, 0.3, 'sine', 0.2); playTone(1320, 0.3, 'sine', 0.15); },
      fireball: () => { playTone(200, 0.2, 'sawtooth', 0.35); playNoise(0.15, 1500, 0.2); },
      pickup: () => { playTone(660, 0.1, 'sine', 0.3); setTimeout(() => playTone(880, 0.15, 'sine', 0.3), 80); },
      chestOpen: () => { playTone(440, 0.1, 'sine', 0.3); setTimeout(() => playTone(660, 0.1, 'sine', 0.3), 100); setTimeout(() => playTone(880, 0.2, 'sine', 0.3), 200); },
      damage: () => { playTone(120, 0.2, 'sawtooth', 0.3); playNoise(0.15, 800, 0.2); },
      dragonRoar: () => { playTone(80, 1.2, 'sawtooth', 0.5, -20); playTone(120, 1.0, 'square', 0.3, -10); playNoise(0.8, 400, 0.3); },
      titanRoar: () => { playTone(42, 2.4, 'sawtooth', 0.65, -30); playTone(68, 2.0, 'square', 0.45, -12); playNoise(1.8, 180, 0.5); },
      titanRumble: () => { playTone(30, 1.6, 'sine', 0.24, -24); playNoise(1.2, 110, 0.18); },
      titanStep: () => { playTone(38, 0.45, 'sine', 0.55, -18); playNoise(0.35, 120, 0.5); },
      thunder: () => { playNoise(1.5, 200, 0.5); playTone(60, 1.5, 'sine', 0.4, -30); },
      ambientBird: () => { playTone(1400 + Math.random() * 400, 0.1, 'sine', 0.15); setTimeout(() => playTone(1600 + Math.random() * 400, 0.08, 'sine', 0.12), 120); },
      ambientCricket: () => { for (let i = 0; i < 3; i++) setTimeout(() => playTone(3000 + Math.random() * 500, 0.04, 'square', 0.08), i * 60); },
      ambientWind: () => playNoise(2, 500, 0.05),
      legendary: () => { playTone(880, 0.15, 'sine', 0.4); setTimeout(() => playTone(1320, 0.15, 'sine', 0.4), 100); setTimeout(() => playTone(1760, 0.4, 'sine', 0.4), 200); },
      grappleFire: () => { playTone(200, 0.15, 'square', 0.3); playNoise(0.1, 1500, 0.2); },
      grappleHit: () => { playTone(400, 0.1, 'square', 0.35); playTone(600, 0.1, 'triangle', 0.25); },
      levelUp: () => {
        const notes = [523, 659, 784, 1047];
        notes.forEach((n, i) => setTimeout(() => playTone(n, 0.3, 'sine', 0.4), i * 100));
      },
      dash: () => { playNoise(0.15, 3000, 0.25); playTone(200, 0.1, 'sawtooth', 0.2); },
      shield: () => { playTone(400, 0.3, 'sine', 0.3); playTone(800, 0.3, 'sine', 0.25); },
      timeSlow: () => { playTone(600, 0.8, 'sine', 0.3, -200); playTone(300, 0.8, 'sine', 0.25, -200); }
    };

    // ============================================================
    //  GAME STATE
    // ============================================================
    const game = {
      active: false, mode: 'adventure',
      score: 0, maxScore: 50, kills: 0,
      health: 100, maxHealth: 100,
      lastDamageTime: 0, invincibleTime: 1.5,
      won: false, lost: false, cameraMode: 'first',
      dragonKilled: false, brAlive: 20, brTotalKills: 0,
      combo: 0, comboTimer: 0, comboTimerMax: 2.5,
      // Progression
      level: 1, xp: 0, xpNext: 100, skillPoints: 0,
      timeScale: 1, timeSlowTimer: 0
    };
    const towerDungeon = {
      active: false, floor: 1, checkpoint: 1, cleared: 0, secretFound: false,
      saveKey: 'skyfall_tower_checkpoint_v1'
    };
    const brPlayers = [];
    const brState = {
      zoneCenter: new THREE.Vector3(0, 0, 0), zoneRadius: 280, startRadius: 280,
      targetRadius: 280, shrinkTimer: 28, matchTime: 0, npcTimer: 2.5,
      zoneMesh: null
    };
    const companionState = { type: null, mesh: null, attackTimer: 0, types: ['Wolf', 'Dragon Hatchling', 'Golem', 'Fairy'] };
    const arenaState = { active: false, round: 0, maxRound: 10, enemies: [], nextRoundTimer: 0 };
    const mountState = { active: false, type: null, mesh: null, types: ['Horse', 'Wolf', 'Giant Bird', 'Dragon'] };
    const MOVE_EPSILON = 0.001;

    // ============================================================
    //  SKILL TREE DATA
    // ============================================================

    // Player's unlocked skills
    let unlockedSkills = {};

    // ============================================================
    //  ABILITIES STATE
    // ============================================================
    const abilities = {
      dash: { cooldown: 2, timer: 0, active: false, activeTimer: 0 },
      fireball: { cooldown: 1.5, timer: 0 },
      doublejump: { used: false },
      shield: { cooldown: 15, timer: 0, active: false, activeTimer: 0 },
      fly: { active: false },
      timeslow: { cooldown: 30, timer: 0 }
    };

    // ============================================================
    //  SAVE / LOAD
    // ============================================================
    function saveGame() {
      try {
        const data = {
          level: game.level,
          xp: game.xp,
          xpNext: game.xpNext,
          skillPoints: game.skillPoints,
          unlockedSkills: unlockedSkills,
          maxHealth: game.maxHealth,
          savedAt: Date.now()
        };
        localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      } catch (e) { console.warn('Save failed:', e); }
    }
    function loadGame() {
      try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (!raw) return false;
        const data = JSON.parse(raw);
        game.level = data.level || 1;
        game.xp = data.xp || 0;
        game.xpNext = data.xpNext || 100;
        game.skillPoints = data.skillPoints || 0;
        unlockedSkills = data.unlockedSkills || {};
        game.maxHealth = data.maxHealth || 100;
        return true;
      } catch (e) { return false; }
    }
    function hasSave() {
      return localStorage.getItem(SAVE_KEY) !== null;
    }
    function resetSave() {
      localStorage.removeItem(SAVE_KEY);
      game.level = 1; game.xp = 0; game.xpNext = 100;
      game.skillPoints = 0; unlockedSkills = {};
      game.maxHealth = 100;
    }

    // ============================================================
    //  XP + LEVELING
    // ============================================================
    function addXP(amount) {
      game.xp += amount;
      updateXPBar();
      while (game.xp >= game.xpNext && game.level < 50) {
        game.xp -= game.xpNext;
        game.level++;
        game.xpNext = Math.floor(100 * Math.pow(1.15, game.level - 1));
        game.skillPoints++;
        onLevelUp();
      }
      updateXPBar();
    }
    function onLevelUp() {
      SFX.levelUp();
      // Screen shake
      addShake(0.6);
      // Show level up screen
      document.getElementById('levelup-number').textContent = game.level;
      document.getElementById('levelup-screen').style.display = 'flex';
      // Pause game briefly
      game.active = false;
      if (document.pointerLockElement === canvas) document.exitPointerLock();
      // Update display
      document.getElementById('level-value').textContent = game.level;
      document.getElementById('skill-points-display').textContent = `🎯 ${game.skillPoints} Skill Points (T)`;
      // Burst effect
      for (let i = 0; i < 40; i++) {
        const color = 0xffcc00;
        const geo = new THREE.SphereGeometry(0.15, 6, 6);
        const mat = new THREE.MeshBasicMaterial({ color: color });
        const p = new THREE.Mesh(geo, mat);
        p.position.copy(player.position);
        const vel = new THREE.Vector3(
          (Math.random() - 0.5) * 12,
          Math.random() * 8 + 2,
          (Math.random() - 0.5) * 12
        );
        hitParticles.push({ mesh: p, vel, life: 1.5, maxLife: 1.5 });
        scene.add(p);
      }
      saveGame();
    }
    function updateXPBar() {
      const pct = Math.min(100, (game.xp / game.xpNext) * 100);
      document.getElementById('xp-fill').style.width = pct + '%';
      document.getElementById('xp-text').textContent = `${game.xp} / ${game.xpNext} XP`;
      document.getElementById('level-value').textContent = game.level;
    }

    // ============================================================
    //  SKILL TREE UI
    // ============================================================
    function isSkillUnlocked(id) {
      return !!unlockedSkills[id];
    }
    function canUnlockSkill(skill) {
      if (isSkillUnlocked(skill.id)) return false;
      if (game.skillPoints < skill.cost) return false;
      if (skill.requires && !isSkillUnlocked(skill.requires)) return false;
      return true;
    }
    function unlockSkill(skill) {
      if (!canUnlockSkill(skill)) return;
      game.skillPoints -= skill.cost;
      unlockedSkills[skill.id] = true;
      // Apply skill effects
      applySkillEffects(skill);
      // Sound
      SFX.pickup();
      // Save
      saveGame();
      // Refresh UI
      renderSkillTree();
      updateAbilityBar();
    }
    function applySkillEffects(skill) {
      switch (skill.id) {
        case 'hp1': game.maxHealth += 25; game.health = game.maxHealth; break;
        case 'hp2': game.maxHealth += 25; game.health = game.maxHealth; break;
        case 'shield': abilities.shield.timer = 0; break;
        default: break;
      }
      document.getElementById('health-fill').style.width = (game.health / game.maxHealth * 100) + '%';
    }
    function renderSkillTree() {
      const container = document.getElementById('skill-branches');
      container.innerHTML = '';
      document.getElementById('skill-points').textContent = game.skillPoints;

      Object.keys(SKILLS).forEach(branchKey => {
        const branch = document.createElement('div');
        branch.className = 'skill-branch ' + branchKey;
        const branchNames = { combat: '⚔️ COMBAT', movement: '💨 MOVEMENT', survival: '❤️ SURVIVAL', magic: '✨ MAGIC' };
        branch.innerHTML = `<h2>${branchNames[branchKey]}</h2>`;

        SKILLS[branchKey].forEach(skill => {
          const node = document.createElement('div');
          node.className = 'skill-node';

          const unlocked = isSkillUnlocked(skill.id);
          const available = canUnlockSkill(skill);

          if (unlocked) node.classList.add('unlocked');
          else if (available) node.classList.add('available');
          else node.classList.add('locked');

          node.innerHTML = `
        <div class="skill-name">${skill.name}</div>
        <div class="skill-desc">${skill.desc}</div>
        <div class="skill-cost">${unlocked ? 'LEARNED' : (skill.cost + ' SP')}</div>
      `;

          if (!unlocked && available) {
            node.addEventListener('click', () => unlockSkill(skill));
          }

          branch.appendChild(node);
        });

        container.appendChild(branch);
      });
    }
    function toggleSkillTree() {
      const st = document.getElementById('skill-tree');
      if (st.style.display === 'block') {
        st.style.display = 'none';
        game.active = true;
        canvas.requestPointerLock();
      } else {
        st.style.display = 'block';
        game.active = false;
        if (document.pointerLockElement === canvas) document.exitPointerLock();
        renderSkillTree();
      }
    }

    // ============================================================
    //  WEAPON DEFINITIONS
    // ============================================================
    const currentWeapon = { type: null, lastAttackTime: 0, swinging: 0 };

    function getWeaponDamageMultiplier() {
      let m = 1;
      if (isSkillUnlocked('power1')) m *= 1.15;
      if (isSkillUnlocked('power2')) m *= 1.30;
      return m;
    }
    function getCritChance() {
      let c = 0.15;
      if (isSkillUnlocked('crit1')) c += 0.10;
      return c;
    }
    function getCritMultiplier() {
      return isSkillUnlocked('crit2') ? 3.0 : 2.0;
    }
    function getCooldownMultiplier() {
      return isSkillUnlocked('speed1') ? 0.8 : 1.0;
    }
    function getSpellMultiplier() {
      return isSkillUnlocked('spellpower') ? 1.30 : 1.0;
    }
    function getMoveSpeedMultiplier() {
      return isSkillUnlocked('speedboost') ? 1.15 : 1.0;
    }

    // ============================================================
    //  LOOT RARITY
    // ============================================================
    function rollRarity() {
      const r = Math.random() * 100;
      if (r < 1) return 'legendary';
      if (r < 5) return 'epic';
      if (r < 20) return 'rare';
      return 'common';
    }

    // ============================================================
    //  DAY/NIGHT + WEATHER
    // ============================================================
    const sky = {
      timeOfDay: 0.25, daySpeed: 1 / 300, sunAngle: 0,
      currentWeather: 'clear', nextWeatherChange: 30, weatherTimer: 0,
      rainParticles: null, lightningTimer: 0
    };
    function getSkyColors() {
      const t = sky.timeOfDay;
      const midnight = new THREE.Color(0x050510);
      const dawn = new THREE.Color(0xff8844);
      const noon = new THREE.Color(0x87CEEB);
      const dusk = new THREE.Color(0x6b3aa0);
      let top, bot;
      if (t < 0.2) { const p = t / 0.2; top = midnight.clone().lerp(dawn, p); bot = top.clone(); }
      else if (t < 0.3) { const p = (t - 0.2) / 0.1; top = dawn.clone().lerp(noon, p); bot = top.clone(); }
      else if (t < 0.7) { top = noon.clone(); bot = new THREE.Color(0xd0e8f5); }
      else if (t < 0.8) { const p = (t - 0.7) / 0.1; top = noon.clone().lerp(dusk, p); bot = new THREE.Color(0xd0e8f5).lerp(dusk, p); }
      else { const p = (t - 0.8) / 0.2; top = dusk.clone().lerp(midnight, p); bot = top.clone(); }
      return { top, bot };
    }
    function updateDayNight(dt) {
      sky.timeOfDay = (sky.timeOfDay + sky.daySpeed * dt) % 1;
      sky.sunAngle = sky.timeOfDay * Math.PI * 2 - Math.PI / 2;
      const sunR = 200;
      const sunX = Math.cos(sky.sunAngle) * sunR;
      const sunY = Math.sin(sky.sunAngle) * sunR;
      sunLight.position.set(player.position.x + sunX, Math.max(20, sunY), player.position.z + 30);
      const colors = getSkyColors();
      scene.background = colors.top;
      scene.fog.color = colors.bot;
      const sunH = Math.max(0, Math.sin(sky.sunAngle));
      const dayFactor = Math.min(1, sunH * 1.5);
      const w = WEATHERS[sky.currentWeather];
      sunLight.intensity += (w.sun * dayFactor - sunLight.intensity) * Math.min(dt * 2, 1);
      ambientLight.intensity += (w.amb * (0.3 + dayFactor * 0.7) - ambientLight.intensity) * Math.min(dt * 2, 1);
      const nightFactor = 1 - dayFactor;
      stars.visible = nightFactor > 0.3;
      stars.material.opacity = Math.min(1, nightFactor * 1.5);
      if (scene.fog) {
        scene.fog.near += (w.fogNear - scene.fog.near) * Math.min(dt * 0.5, 1);
        scene.fog.far += (w.fogFar - scene.fog.far) * Math.min(dt * 0.5, 1);
      }
      updateTimeUI();
    }
    function updateTimeUI() {
      const t = sky.timeOfDay;
      const h24 = ((t * 24) + 24 - 6) % 24;
      let h12 = Math.floor(h24);
      const m = Math.floor((h24 - h12) * 60);
      const ampm = h12 >= 12 ? 'PM' : 'AM';
      h12 = h12 % 12; if (h12 === 0) h12 = 12;
      document.getElementById('time-label').textContent = `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
      document.getElementById('weather-label').textContent = WEATHERS[sky.currentWeather].name;
    }
    function updateWeather(dt) {
      sky.weatherTimer += dt;
      if (sky.weatherTimer > sky.nextWeatherChange) {
        sky.weatherTimer = 0;
        sky.nextWeatherChange = 40 + Math.random() * 50;
        const roll = Math.random();
        let next;
        if (roll < 0.35) next = 'clear';
        else if (roll < 0.55) next = 'cloudy';
        else if (roll < 0.75) next = 'rain';
        else if (roll < 0.90) next = 'storm';
        else next = 'fog';
        if (next !== sky.currentWeather) {
          sky.currentWeather = next;
          showWeatherBanner(WEATHERS[next].name);
        }
      }
      const w = WEATHERS[sky.currentWeather];
      if (w.rain > 0) {
        if (!sky.rainParticles) createRainParticles();
        sky.rainParticles.visible = true;
        updateRainParticles(dt, w.rain);
      } else if (sky.rainParticles) sky.rainParticles.visible = false;
      if (w.lightning) {
        sky.lightningTimer -= dt;
        if (sky.lightningTimer <= 0) {
          sky.lightningTimer = 3 + Math.random() * 5;
          triggerLightning();
        }
      }
    }
    function showWeatherBanner(name) {
      const el = document.getElementById('weather-banner');
      el.textContent = name;
      el.style.display = 'block';
      setTimeout(() => { el.style.display = 'none'; }, 3000);
    }
    function createRainParticles() {
      const count = 500;
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(count * 3);
      for (let i = 0; i < count * 3; i += 3) {
        pos[i] = (Math.random() - 0.5) * 60;
        pos[i + 1] = Math.random() * 40;
        pos[i + 2] = (Math.random() - 0.5) * 60;
      }
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const mat = new THREE.PointsMaterial({ color: 0x88aaff, size: 0.15, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false });
      sky.rainParticles = new THREE.Points(geo, mat);
      scene.add(sky.rainParticles);
    }
    function updateRainParticles(dt, intensity) {
      const pos = sky.rainParticles.geometry.attributes.position;
      const arr = pos.array;
      for (let i = 0; i < arr.length; i += 3) {
        arr[i + 1] -= (15 + Math.random() * 10) * dt * (1 + intensity);
        if (arr[i + 1] < 0) {
          arr[i] = player.position.x + (Math.random() - 0.5) * 60;
          arr[i + 1] = 40;
          arr[i + 2] = player.position.z + (Math.random() - 0.5) * 60;
        }
      }
      pos.needsUpdate = true;
      sky.rainParticles.material.opacity = 0.3 + intensity * 0.4;
    }
    function triggerLightning() {
      SFX.thunder();
      const flash = document.createElement('div');
      flash.style.cssText = 'position:fixed;inset:0;background:white;z-index:250;pointer-events:none;opacity:0.8;transition:opacity 0.4s;';
      document.body.appendChild(flash);
      setTimeout(() => flash.style.opacity = '0', 100);
      setTimeout(() => flash.remove(), 500);
    }
    let stars = null;
    function createStars() {
      const count = 800;
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(Math.random() * 0.9);
        const r = 300;
        pos[i * 3] = Math.sin(phi) * Math.cos(theta) * r;
        pos[i * 3 + 1] = Math.cos(phi) * r * 0.8 + 50;
        pos[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * r;
      }
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const mat = new THREE.PointsMaterial({ color: 0xffffff, size: 1.5, transparent: true, opacity: 0, depthWrite: false });
      stars = new THREE.Points(geo, mat);
      scene.add(stars);
    }

    // ============================================================
    //  SCREEN SHAKE
    // ============================================================
    const shake = { intensity: 0, decay: 8 };
    function addShake(amount) { shake.intensity = Math.min(1.5, shake.intensity + amount); }
    function applyShake(dt) {
      if (shake.intensity > 0.001) {
        const s = shake.intensity * 0.6;
        camera.position.x += (Math.random() - 0.5) * s;
        camera.position.y += (Math.random() - 0.5) * s;
        camera.position.z += (Math.random() - 0.5) * s;
        shake.intensity -= shake.decay * dt;
        if (shake.intensity < 0) shake.intensity = 0;
      }
    }

    // ============================================================
    //  DAMAGE NUMBERS
    // ============================================================
    const damageNumbers = [];
    function spawnDamageNumber(position, damage, isCrit, color) {
      const canvas = document.createElement('canvas');
      canvas.width = 128; canvas.height = 64;
      const ctx = canvas.getContext('2d');
      const fs = isCrit ? 48 : 36;
      ctx.font = `bold ${fs}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.strokeStyle = '#000'; ctx.lineWidth = 6;
      ctx.strokeText(damage, 64, 32);
      ctx.fillStyle = color || (isCrit ? '#ffff00' : '#ffffff');
      ctx.fillText(damage, 64, 32);
      const tex = new THREE.CanvasTexture(canvas);
      const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false });
      const sprite = new THREE.Sprite(mat);
      sprite.scale.set(2, 1, 1);
      sprite.position.copy(position);
      sprite.position.y += 1.2;
      sprite.position.x += (Math.random() - 0.5) * 0.5;
      scene.add(sprite);
      damageNumbers.push({
        sprite, life: 1.2, maxLife: 1.2,
        vy: isCrit ? 4.5 : 3.5,
        vx: (Math.random() - 0.5) * 1.5,
        vz: (Math.random() - 0.5) * 1.5,
        scale: isCrit ? 1.3 : 1.0
      });
    }
    function updateDamageNumbers(dt) {
      for (let i = damageNumbers.length - 1; i >= 0; i--) {
        const d = damageNumbers[i];
        d.life -= dt;
        d.sprite.position.y += d.vy * dt;
        d.sprite.position.x += d.vx * dt;
        d.sprite.position.z += d.vz * dt;
        d.vy -= 6 * dt;
        const p = d.life / d.maxLife;
        d.sprite.material.opacity = p > 0.3 ? 1 : p / 0.3;
        const sc = d.scale * (1 + (1 - p) * 0.5);
        d.sprite.scale.set(2 * sc, sc, 1);
        if (d.life <= 0) {
          scene.remove(d.sprite);
          d.sprite.material.map.dispose();
          d.sprite.material.dispose();
          damageNumbers.splice(i, 1);
        }
      }
    }

    // ============================================================
    //  HIT PARTICLES
    // ============================================================
    const hitParticles = [];
    function spawnHitParticles(position, color, count) {
      count = count || 8;
      for (let i = 0; i < count; i++) {
        const geo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
        const mat = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 1 });
        const p = new THREE.Mesh(geo, mat);
        p.position.copy(position);
        const vel = new THREE.Vector3(
          (Math.random() - 0.5) * 6,
          Math.random() * 4 + 2,
          (Math.random() - 0.5) * 6
        );
        scene.add(p);
        hitParticles.push({ mesh: p, vel, life: 0.6, maxLife: 0.6 });
      }
    }
    function updateHitParticles(dt) {
      for (let i = hitParticles.length - 1; i >= 0; i--) {
        const p = hitParticles[i];
        p.life -= dt;
        p.vel.y -= 15 * dt;
        p.mesh.position.x += p.vel.x * dt;
        p.mesh.position.y += p.vel.y * dt;
        p.mesh.position.z += p.vel.z * dt;
        p.mesh.rotation.x += dt * 8;
        p.mesh.rotation.y += dt * 6;
        const t = p.life / p.maxLife;
        p.mesh.material.opacity = t;
        p.mesh.scale.setScalar(0.5 + t * 0.5);
        if (p.life <= 0) {
          scene.remove(p.mesh);
          p.mesh.geometry.dispose();
          p.mesh.material.dispose();
          hitParticles.splice(i, 1);
        }
      }
    }

    // ============================================================
    //  SPELL EFFECTS
    // ============================================================
    const spellEffects = [];
    function spawnSpellEffect(origin, direction, color, glowColor) {
      const orbGeo = new THREE.SphereGeometry(0.25, 12, 12);
      const orbMat = new THREE.MeshBasicMaterial({ color: glowColor, transparent: true, opacity: 0.9 });
      const orb = new THREE.Mesh(orbGeo, orbMat);
      orb.position.copy(origin);
      scene.add(orb);
      const glowSprite = new THREE.Sprite(new THREE.SpriteMaterial({
        color: glowColor, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending
      }));
      glowSprite.scale.set(1.8, 1.8, 1);
      orb.add(glowSprite);
      const light = new THREE.PointLight(glowColor, 2, 8);
      orb.add(light);
      spellEffects.push({
        mesh: orb, direction: direction.clone(), speed: 35, traveled: 0,
        maxDist: 25, color: glowColor, trailTimer: 0, life: 2, damage: 40
      });
      for (let i = 0; i < 12; i++) {
        const p = new THREE.Mesh(
          new THREE.SphereGeometry(0.08, 4, 4),
          new THREE.MeshBasicMaterial({ color: glowColor, transparent: true, opacity: 1 })
        );
        p.position.copy(origin);
        const vel = new THREE.Vector3(
          (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8
        );
        hitParticles.push({ mesh: p, vel, life: 0.4, maxLife: 0.4 });
        scene.add(p);
      }
    }
    function updateSpellEffects(dt) {
      for (let i = spellEffects.length - 1; i >= 0; i--) {
        const s = spellEffects[i];
        const step = s.speed * dt;
        s.mesh.position.x += s.direction.x * step;
        s.mesh.position.y += s.direction.y * step;
        s.mesh.position.z += s.direction.z * step;
        s.traveled += step;
        s.life -= dt;
        s.trailTimer -= dt;
        if (s.trailTimer <= 0) {
          s.trailTimer = 0.02;
          const tp = new THREE.Mesh(
            new THREE.SphereGeometry(0.12, 6, 6),
            new THREE.MeshBasicMaterial({ color: s.color, transparent: true, opacity: 0.7 })
          );
          tp.position.copy(s.mesh.position);
          scene.add(tp);
          hitParticles.push({ mesh: tp, vel: new THREE.Vector3(0, 0.3, 0), life: 0.5, maxLife: 0.5 });
        }
        s.mesh.children.forEach(c => {
          if (c.isLight) c.intensity = 1.5 + Math.sin(performance.now() * 0.02) * 0.5;
        });
        let exploded = false;
        for (let j = enemies.length - 1; j >= 0; j--) {
          const enemy = enemies[j];
          if (s.mesh.position.distanceTo(enemy.position) < 1.8) {
            applyDamageToEnemy(enemy, s.damage);
            spawnHitParticles(s.mesh.position.clone(), s.color, 20);
            addShake(0.4);
            exploded = true;
            break;
          }
        }
        if (!exploded && game.mode === 'battleroyale') {
          for (let j = brPlayers.length - 1; j >= 0; j--) {
            const rival = brPlayers[j];
            if (s.mesh.position.distanceTo(rival.position) < 2.2) {
              applyDamageToBRPlayer(rival, s.damage, true);
              spawnHitParticles(s.mesh.position.clone(), s.color, 20);
              addShake(0.5);
              exploded = true;
              break;
            }
          }
        }
        if (!exploded && titanColossus && titanColossus.userData.hp > 0) {
          if (s.mesh.position.distanceTo(titanColossus.position) < 9) {
            applyDamageToTitan(s.damage);
            spawnHitParticles(s.mesh.position.clone(), s.color, 25);
            addShake(0.7);
            exploded = true;
          }
        }
        if (!exploded && dragon) {
          if (s.mesh.position.distanceTo(dragon.position) < 4) {
            applyDamageToDragon(s.damage);
            spawnHitParticles(s.mesh.position.clone(), s.color, 25);
            addShake(0.5);
            exploded = true;
          }
        }
        if (exploded || s.traveled >= s.maxDist || s.life <= 0) {
          scene.remove(s.mesh);
          s.mesh.geometry.dispose();
          s.mesh.material.dispose();
          spellEffects.splice(i, 1);
        }
      }
    }

    // ============================================================
    //  ANCHOR / GRAPPLE
    // ============================================================
    const anchor = {
      active: false, anchored: false,
      anchorPoint: new THREE.Vector3(),
      hookVelocity: new THREE.Vector3(),
      rope: null, hookMesh: null,
      cooldown: 0, pullSpeed: 45, maxRange: 50, ropePositions: null
    };
    function createAnchorVisuals() {
      const ropeGeo = new THREE.BufferGeometry();
      const positions = new Float32Array(6);
      ropeGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const ropeMat = new THREE.LineBasicMaterial({ color: 0x8b5a2b, linewidth: 2 });
      anchor.rope = new THREE.Line(ropeGeo, ropeMat);
      anchor.rope.frustumCulled = false;
      anchor.rope.visible = false;
      scene.add(anchor.rope);
      anchor.ropePositions = positions;
      const hookGroup = new THREE.Group();
      const hookMat = new THREE.MeshStandardMaterial({ color: 0x777777, metalness: 0.9, roughness: 0.3 });
      const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 0.6), hookMat);
      shaft.position.z = -0.3;
      hookGroup.add(shaft);
      const clawL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.4), hookMat);
      clawL.position.set(-0.15, 0, -0.5);
      clawL.rotation.y = 0.5;
      hookGroup.add(clawL);
      const clawR = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.4), hookMat);
      clawR.position.set(0.15, 0, -0.5);
      clawR.rotation.y = -0.5;
      hookGroup.add(clawR);
      anchor.hookMesh = hookGroup;
      anchor.hookMesh.visible = false;
      scene.add(anchor.hookMesh);
    }
    function fireAnchor() {
      if (!game.active) return;
      if (anchor.cooldown > 0) return;
      if (anchor.active) releaseAnchor();
      const forward = getAimDirection();
      anchor.active = true;
      anchor.anchored = false;
      anchor.hookVelocity.copy(forward).multiplyScalar(60);
      anchor.anchorPoint.copy(player.position);
      anchor.anchorPoint.y -= 0.3;
      anchor.hookMesh.visible = true;
      anchor.rope.visible = true;
      anchor.hookMesh.position.copy(anchor.anchorPoint);
      SFX.grappleFire();
    }
    function releaseAnchor() {
      anchor.active = false;
      anchor.anchored = false;
      anchor.hookMesh.visible = false;
      anchor.rope.visible = false;
      anchor.cooldown = 0.4;
    }
    function updateAnchor(dt, now) {
      if (anchor.cooldown > 0) anchor.cooldown -= dt;
      const el = document.getElementById('anchor-status');
      if (el) {
        if (anchor.cooldown > 0) { el.className = 'cooldown'; el.textContent = anchor.cooldown.toFixed(1) + 's'; }
        else { el.className = 'ready'; el.textContent = 'READY'; }
      }
      if (!anchor.active) return;
      if (!anchor.anchored) {
        const travel = anchor.hookVelocity.clone().multiplyScalar(dt);
        anchor.anchorPoint.add(travel);
        anchor.hookVelocity.y -= 25 * dt;
        let hit = false;
        const groundY = getHeight(anchor.anchorPoint.x, anchor.anchorPoint.z);
        if (anchor.anchorPoint.y <= groundY) { anchor.anchorPoint.y = groundY; hit = true; }
        if (!hit) {
          for (let t of trees) {
            const dx = anchor.anchorPoint.x - t.x;
            const dz = anchor.anchorPoint.z - t.z;
            if (dx * dx + dz * dz < (t.radius + 0.5) ** 2 && anchor.anchorPoint.y < t.y + 5) { hit = true; break; }
          }
        }
        if (!hit && dragon && anchor.anchorPoint.distanceTo(dragon.position) < 4) hit = true;
        if (!hit && titanColossus && anchor.anchorPoint.distanceTo(titanColossus.position) < 10) hit = true;
        if (anchor.anchorPoint.distanceTo(player.position) > anchor.maxRange) hit = true;
        if (hit) {
          anchor.anchored = true;
          anchor.hookVelocity.set(0, 0, 0);
          addShake(0.15);
          SFX.grappleHit();
        }
        anchor.hookMesh.position.copy(anchor.anchorPoint);
        if (anchor.hookVelocity.lengthSq() > 0.1) {
          const dir = anchor.hookVelocity.clone().normalize();
          anchor.hookMesh.lookAt(anchor.anchorPoint.clone().add(dir));
        }
      } else {
        const toAnchor = new THREE.Vector3().subVectors(anchor.anchorPoint, player.position);
        const dist = toAnchor.length();
        if (dist < 3) { releaseAnchor(); return; }
        toAnchor.normalize();
        const pull = anchor.pullSpeed;
        player.velocity.x = toAnchor.x * pull;
        player.velocity.z = toAnchor.z * pull;
        player.velocity.y = Math.max(player.velocity.y, toAnchor.y * pull);
        player.onGround = false;
        player.isJumping = true;
        anchor.hookMesh.position.copy(anchor.anchorPoint);
      }
      const handOffset = new THREE.Vector3(0.3, -0.3, -0.5);
      handOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), player.yaw);
      const hand = player.position.clone().add(handOffset);
      anchor.ropePositions[0] = hand.x;
      anchor.ropePositions[1] = hand.y;
      anchor.ropePositions[2] = hand.z;
      anchor.ropePositions[3] = anchor.anchorPoint.x;
      anchor.ropePositions[4] = anchor.anchorPoint.y;
      anchor.ropePositions[5] = anchor.anchorPoint.z;
      anchor.rope.geometry.attributes.position.needsUpdate = true;
    }

    // ============================================================
    //  COMBO
    // ============================================================
    function addCombo() {
      game.combo++;
      game.comboTimer = game.comboTimerMax;
      const display = document.getElementById('combo-display');
      display.style.display = 'block';
      display.classList.add('pop');
      setTimeout(() => display.classList.remove('pop'), 100);
      document.getElementById('combo-count').textContent = game.combo;
    }
    function updateCombo(dt) {
      if (game.comboTimer > 0) {
        game.comboTimer -= dt;
        if (game.comboTimer <= 0) {
          game.combo = 0;
          game.comboTimer = 0;
          document.getElementById('combo-display').style.display = 'none';
        } else {
          const pct = game.comboTimer / game.comboTimerMax;
          document.getElementById('combo-fill').style.width = (pct * 100) + '%';
        }
      }
    }
    function getComboMultiplier() {
      if (game.combo < 3) return 1;
      if (game.combo < 10) return 1.25;
      if (game.combo < 20) return 1.5;
      return 2.0;
    }

    // ============================================================
    //  MAP + TERRAIN
    // ============================================================
    function hash(x, z) {
      const h = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
      return h - Math.floor(h);
    }
    function smoothNoise(x, z, scale) {
      const sx = x / scale, sz = z / scale;
      const ix = Math.floor(sx), iz = Math.floor(sz);
      const fx = sx - ix, fz = sz - iz;
      const ux = fx * fx * (3 - 2 * fx), uz = fz * fz * (3 - 2 * fz);
      const a = hash(ix, iz), b = hash(ix + 1, iz), c = hash(ix, iz + 1), d = hash(ix + 1, iz + 1);
      return a * (1 - ux) * (1 - uz) + b * ux * (1 - uz) + c * (1 - ux) * uz + d * ux * uz;
    }
    function getRiverCenterZ(x) { return Math.sin(x * 0.03) * 25 + Math.sin(x * 0.008) * 15; }
    function riverDistance(x, z) { return Math.abs(z - getRiverCenterZ(x)); }
    function getHeight(x, z) {
      let h = 0;
      h += smoothNoise(x, z, 60) * 4;
      h += smoothNoise(x + 100, z + 200, 35) * 3;
      h += smoothNoise(x - 50, z + 80, 18) * 1.5;
      const d1 = Math.sqrt((x + 120) ** 2 + (z + 110) ** 2);
      if (d1 < 70) { const t = 1 - d1 / 70; h += t * t * 28; }
      const d2 = Math.sqrt((x - 130) ** 2 + (z + 100) ** 2);
      if (d2 < 60) { const t = 1 - d2 / 60; h += t * t * 22; }
      const d3 = Math.sqrt((x - 20) ** 2 + (z - 130) ** 2);
      if (d3 < 90) { const t = 1 - d3 / 90; h += t * t * 35; }
      const d4 = Math.sqrt((x + 150) ** 2 + (z - 40) ** 2);
      if (d4 < 55) { const t = 1 - d4 / 55; h += t * t * 18; }
      const rd = riverDistance(x, z);
      if (rd < MAP.riverWidth) {
        const t = rd / MAP.riverWidth;
        const st = t * t * (3 - 2 * t);
        h = h * st + (-MAP.riverDepth) * (1 - st);
      } else if (rd < MAP.riverWidth + 6) {
        const t = (rd - MAP.riverWidth) / 6;
        h = h * (0.85 + 0.15 * t) + (-MAP.riverDepth * 0.3) * (1 - t);
      }
      const sd = Math.sqrt(x * x + z * z);
      if (sd < 20) {
        const t = sd / 20;
        const st = t * t * (3 - 2 * t);
        h = h * st;
      }
      return h;
    }

    // ============================================================
    //  SCENE
    // ============================================================
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    scene.fog = new THREE.Fog(0x87CEEB, 120, 700);
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1200);
    scene.add(camera);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('game-canvas-host').appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.55);
    scene.add(ambientLight);
    const sunLight = new THREE.DirectionalLight(0xffffff, 1);
    sunLight.position.set(60, 90, 30);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 250;
    sunLight.shadow.camera.left = -100;
    sunLight.shadow.camera.right = 100;
    sunLight.shadow.camera.top = 100;
    sunLight.shadow.camera.bottom = -100;
    sunLight.shadow.bias = -0.0005;
    scene.add(sunLight);
    const sunTarget = new THREE.Object3D();
    scene.add(sunTarget);
    sunLight.target = sunTarget;
    scene.add(new THREE.HemisphereLight(0x87CEEB, 0x3a5a3a, 0.5));
    createStars();

    // Terrain
    const terrainGeo = new THREE.PlaneGeometry(MAP.groundSize, MAP.groundSize, MAP.terrainSegments, MAP.terrainSegments);
    terrainGeo.rotateX(-Math.PI / 2);
    const posAttr = terrainGeo.attributes.position;
    const colorAttr = new Float32Array(posAttr.count * 3);
    const cGrass = new THREE.Color(0x5a9e4a), cGrassD = new THREE.Color(0x3d7a30);
    const cRock = new THREE.Color(0x7a7a72), cRockD = new THREE.Color(0x555555);
    const cSnow = new THREE.Color(0xf0f5ff), cSand = new THREE.Color(0xd4c89a);
    const cBed = new THREE.Color(0x6b5a3e);
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i), z = posAttr.getZ(i);
      posAttr.setY(i, getHeight(x, z));
    }
    terrainGeo.computeVertexNormals();
    const normAttr = terrainGeo.attributes.normal;
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i), y = posAttr.getY(i), z = posAttr.getZ(i);
      const ny = normAttr.getY(i);
      let col;
      if (y < -0.5) col = cBed.clone();
      else if (y < 0.4) col = cSand.clone();
      else if (y < 8) { const n = smoothNoise(x, z, 15); col = cGrass.clone().lerp(cGrassD, n); }
      else if (y < 18) {
        const t = (y - 8) / 10;
        col = cGrass.clone().lerp(cRock, t);
        if (ny < 0.7) col.lerp(cRockD, 0.4);
      } else {
        const t = Math.min(1, (y - 18) / 12);
        col = cRock.clone().lerp(cSnow, t);
        if (ny < 0.75) col.lerp(cRockD, 0.3);
      }
      colorAttr[i * 3] = col.r; colorAttr[i * 3 + 1] = col.g; colorAttr[i * 3 + 2] = col.b;
    }
    terrainGeo.setAttribute('color', new THREE.BufferAttribute(colorAttr, 3));
    const terrainMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 });
    const terrain = new THREE.Mesh(terrainGeo, terrainMat);
    terrain.receiveShadow = true;
    terrain.castShadow = true;
    scene.add(terrain);

    // ============================================================
    //  WORLD LANDMARKS + BIOMES
    // ============================================================
    const worldLandmarks = [];
    const worldAchievements = new Set();

    function addWorldAchievement(name) {
      if (!worldAchievements.has(name)) {
        worldAchievements.add(name);
        showLootNotification('rare', `Discovery: ${name}`);
      }
    }

    function createRuinedHouse(x, z, scale = 1) {
      const g = new THREE.Group();
      const wallMat = new THREE.MeshStandardMaterial({ color: 0x6a5245, roughness: 0.95 });
      const roofMat = new THREE.MeshStandardMaterial({ color: 0x46362d, roughness: 0.85 });
      const base = new THREE.Mesh(new THREE.BoxGeometry(3.6 * scale, 2.4 * scale, 3.2 * scale), wallMat);
      base.position.y = 1.2 * scale; g.add(base);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(2.8 * scale, 2.1 * scale, 4), roofMat);
      roof.rotation.y = Math.PI / 4; roof.position.y = 2.8 * scale; g.add(roof);
      const wall = new THREE.Mesh(new THREE.BoxGeometry(1.8 * scale, 1.5 * scale, 0.2 * scale), wallMat);
      wall.position.set(0, 1.2 * scale, 1.6 * scale); g.add(wall);
      const ruin = new THREE.Mesh(new THREE.BoxGeometry(1.4 * scale, 1.1 * scale, 0.25 * scale), wallMat);
      ruin.position.set(-1.2 * scale, 0.9 * scale, 0.3 * scale); ruin.rotation.y = 0.7; g.add(ruin);
      g.position.set(x, getHeight(x, z), z);
      return g;
    }

    function createTemple(x, z) {
      const g = new THREE.Group();
      const stone = new THREE.MeshStandardMaterial({ color: 0x9c8e77, roughness: 0.9 });
      const gold = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.9, roughness: 0.2, emissive: 0x4a3900, emissiveIntensity: 0.3 });
      const floor = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 6.2, 1.2, 8), stone); floor.position.y = 0.5; g.add(floor);
      const center = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 2.2, 4.8, 8), stone); center.position.y = 3.2; g.add(center);
      const top = new THREE.Mesh(new THREE.ConeGeometry(3.2, 2.2, 8), gold); top.position.y = 6.7; g.add(top);
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const col = new THREE.Mesh(new THREE.BoxGeometry(0.8, 4.0, 0.8), stone);
        col.position.set(Math.cos(angle) * 4.5, 2.2, Math.sin(angle) * 4.5); g.add(col);
      }
      const chestSpot = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.8, 1.2), gold);
      chestSpot.position.set(0, 1.3, 3.3); g.add(chestSpot);
      g.position.set(x, getHeight(x, z), z);
      return g;
    }

    function createCaveEntrance(x, z, isHidden = false) {
      const g = new THREE.Group();
      const rockMat = new THREE.MeshStandardMaterial({ color: 0x4d4b50, roughness: 0.95 });
      const cave = new THREE.Mesh(new THREE.BoxGeometry(3.8, 3.2, 3.2), rockMat);
      cave.position.y = 1.5; g.add(cave);
      const arch = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.5, 0.7, 20, 1, true), rockMat);
      arch.position.y = 2.2; g.add(arch);
      const glow = new THREE.Mesh(new THREE.SphereGeometry(0.7, 16, 16), new THREE.MeshStandardMaterial({ color: 0x7ef9ff, emissive: 0x7ef9ff, emissiveIntensity: 1.0 }));
      glow.position.set(0, 1.8, 1.4); g.add(glow);
      if (isHidden) {
        const waterfall = new THREE.Mesh(new THREE.BoxGeometry(4.2, 4.5, 0.3), new THREE.MeshStandardMaterial({ color: 0x4ba9ff, transparent: true, opacity: 0.7 }));
        waterfall.position.set(0, 3, -2.8); g.add(waterfall);
      }
      g.position.set(x, getHeight(x, z), z);
      return g;
    }

    function createWizardTower(x, z) {
      const g = new THREE.Group();
      const base = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.8, 7.5, 12), new THREE.MeshStandardMaterial({ color: 0x8f8f9d, roughness: 0.8 }));
      base.position.y = 3.8; g.add(base);
      const top = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.2, 2.4, 12), new THREE.MeshStandardMaterial({ color: 0x6c5ba3, emissive: 0x2c1540, emissiveIntensity: 0.35 }));
      top.position.y = 8.5; g.add(top);
      const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.8), new THREE.MeshStandardMaterial({ color: 0x89d1ff, emissive: 0x89d1ff, emissiveIntensity: 1.1 }));
      crystal.position.y = 9.9; g.add(crystal);
      g.position.set(x, getHeight(x, z), z);
      return g;
    }

    function createBanditCamp(x, z) {
      const g = new THREE.Group();
      const tentMat = new THREE.MeshStandardMaterial({ color: 0x8d5c2c, roughness: 0.95 });
      const tent = new THREE.Mesh(new THREE.ConeGeometry(2.1, 2.8, 5), tentMat); tent.position.y = 1.5; g.add(tent);
      const fire = new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 12), new THREE.MeshStandardMaterial({ color: 0xff8c00, emissive: 0xff6a00, emissiveIntensity: 1.2 }));
      fire.position.set(0, 0.8, 0); g.add(fire);
      const crate = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 1.1), new THREE.MeshStandardMaterial({ color: 0x6f4a2f, roughness: 0.9 }));
      crate.position.set(-2.2, 0.55, 1.4); g.add(crate);
      const crate2 = crate.clone(); crate2.position.set(2.2, 0.6, -1.2); g.add(crate2);
      g.position.set(x, getHeight(x, z), z);
      return g;
    }

    function createBattlefield(x, z) {
      const g = new THREE.Group();
      const brokenMat = new THREE.MeshStandardMaterial({ color: 0x999191, roughness: 0.9 });
      for (let i = 0; i < 6; i++) {
        const sp = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1, 0.3), brokenMat);
        sp.position.set((Math.random() - 0.5) * 8, 0.5, (Math.random() - 0.5) * 8); sp.rotation.z = (Math.random() - 0.5) * 1.2; g.add(sp);
      }
      const skullMat = new THREE.MeshStandardMaterial({ color: 0xf4f0eb, roughness: 0.9 });
      for (let i = 0; i < 4; i++) {
        const skull = new THREE.Mesh(new THREE.SphereGeometry(0.45, 10, 10), skullMat);
        skull.position.set((Math.random() - 0.5) * 7, 0.8, (Math.random() - 0.5) * 7); g.add(skull);
      }
      g.position.set(x, getHeight(x, z), z);
      return g;
    }

    function createDungeon(x, z) {
      const g = new THREE.Group();
      const stone = new THREE.MeshStandardMaterial({ color: 0x4d5863, roughness: 0.9 });
      const gate = new THREE.Mesh(new THREE.BoxGeometry(3.4, 3.6, 0.8), stone); gate.position.set(0, 1.8, 0); g.add(gate);
      const pillar1 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 4.2, 0.8), stone); pillar1.position.set(-3.2, 2.1, 0); g.add(pillar1);
      const pillar2 = pillar1.clone(); pillar2.position.set(3.2, 2.1, 0); g.add(pillar2);
      const glow = new THREE.Mesh(new THREE.OctahedronGeometry(0.8), new THREE.MeshStandardMaterial({ color: 0xf5b942, emissive: 0xf5b942, emissiveIntensity: 1.0 }));
      glow.position.set(0, 2.8, 1.8); g.add(glow);
      g.position.set(x, getHeight(x, z), z);
      return g;
    }

    function createSacredForest(x, z) {
      const g = new THREE.Group();
      const glowMat = new THREE.MeshStandardMaterial({ color: 0x7af79a, emissive: 0x7af79a, emissiveIntensity: 1.0, roughness: 0.6 });
      for (let i = 0; i < 18; i++) {
        const p = new THREE.Mesh(new THREE.ConeGeometry(0.25, 1.4, 8), glowMat);
        p.position.set((Math.random() - 0.5) * 11, 0.7, (Math.random() - 0.5) * 11); g.add(p);
      }
      const altar = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.5, 1.2, 8), new THREE.MeshStandardMaterial({ color: 0xb9d7a8, roughness: 0.8 }));
      altar.position.y = 0.6; g.add(altar);
      g.position.set(x, getHeight(x, z), z);
      return g;
    }

    function createFloatingIsland(x, z) {
      const g = new THREE.Group();
      const stone = new THREE.MeshStandardMaterial({ color: 0x7d8ca6, roughness: 0.8 });
      const island = new THREE.Mesh(new THREE.CylinderGeometry(6.5, 8, 2.6, 18), stone); island.position.y = 0; g.add(island);
      const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(1.4), new THREE.MeshStandardMaterial({ color: 0x9be8ff, emissive: 0x9be8ff, emissiveIntensity: 1.2 }));
      crystal.position.y = 4.2; g.add(crystal);
      g.position.set(x, 28, z);
      return g;
    }

    const towerSteps = [];
    function createSkyfallTower(x, z) {
      const g = new THREE.Group();
      const basalt = new THREE.MeshStandardMaterial({ color: 0x283746, roughness: 0.92, metalness: 0.15 });
      const stone = new THREE.MeshStandardMaterial({ color: 0x52616b, roughness: 0.88 });
      const rune = new THREE.MeshStandardMaterial({ color: 0x86fff0, emissive: 0x27d8c2, emissiveIntensity: 2.4, roughness: 0.25 });
      const gold = new THREE.MeshStandardMaterial({ color: 0xd7a84b, emissive: 0x684316, emissiveIntensity: 0.45, roughness: 0.4, metalness: 0.6 });
      const add = (mesh, px, py, pz, material) => {
        mesh.material = material || mesh.material;
        mesh.position.set(px, py, pz);
        mesh.castShadow = true; mesh.receiveShadow = true;
        g.add(mesh);
        return mesh;
      };
      add(new THREE.Mesh(new THREE.BoxGeometry(48, 5, 48), basalt), 0, 2.5, 0);
      add(new THREE.Mesh(new THREE.BoxGeometry(36, 184, 36), stone), 0, 94, 0);
      add(new THREE.Mesh(new THREE.BoxGeometry(42, 8, 42), basalt), 0, 12, 0);
      for (let floor = 0; floor < 10; floor++) {
        const y = 20 + floor * 18;
        add(new THREE.Mesh(new THREE.BoxGeometry(29, 1.2, 29), basalt), 0, y, 0);
        for (const side of [-1, 1]) {
          add(new THREE.Mesh(new THREE.BoxGeometry(1.2, 5.5, 7), rune), side * 18.3, y + 4, 0, rune);
          add(new THREE.Mesh(new THREE.BoxGeometry(7, 5.5, 1.2), rune), 0, y + 4, side * 18.3, rune);
        }
      }
      for (const side of [-1, 1]) {
        add(new THREE.Mesh(new THREE.BoxGeometry(5, 30, 5), basalt), side * 23, 18, side * 23);
        add(new THREE.Mesh(new THREE.BoxGeometry(5, 30, 5), basalt), side * 23, 18, -side * 23);
      }
      add(new THREE.Mesh(new THREE.BoxGeometry(10, 12, 1.2), gold), 0, 8, 18.1, gold);
      add(new THREE.Mesh(new THREE.BoxGeometry(6, 7, 1.4), rune), 0, 8, 18.8, rune);
      for (let floor = 0; floor < 100; floor++) {
        const angle = Math.PI / 2 + floor * 0.24;
        const radius = 26;
        const px = Math.cos(angle) * radius;
        const pz = Math.sin(angle) * radius;
        const py = 1 + floor * 1.8;
        const step = add(new THREE.Mesh(new THREE.BoxGeometry(8, 1.2, 5), basalt), px, py, pz, basalt);
        step.rotation.y = -angle;
        towerSteps.push({ x: x + px, z: z + pz, topY: getHeight(x, z) + py + 0.6 });
      }
      for (const side of [-1, 1]) {
        add(new THREE.Mesh(new THREE.ConeGeometry(4.5, 14, 4), basalt), side * 16, 195, 0);
        add(new THREE.Mesh(new THREE.ConeGeometry(4.5, 14, 4), basalt), 0, 195, side * 16);
      }
      const crown = add(new THREE.Mesh(new THREE.OctahedronGeometry(6), rune), 0, 209, 0, rune);
      crown.rotation.z = Math.PI / 4;
      const crownLight = new THREE.PointLight(0x48f3dc, 5, 120);
      crownLight.position.set(0, 204, 0); g.add(crownLight);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(22, 0.45, 8, 48), new THREE.MeshBasicMaterial({ color: 0x62f6df, transparent: true, opacity: 0.55 }));
      ring.rotation.x = Math.PI / 2; ring.position.y = 175; g.add(ring);
      g.userData.tower = true;
      return g;
    }

    function getTowerStairGround(x, z) {
      let highest = null;
      for (const step of towerSteps) {
        const dx = x - step.x, dz = z - step.z;
        if (dx * dx + dz * dz < 4.5 * 4.5 && (highest === null || step.topY > highest)) highest = step.topY;
      }
      return highest;
    }

    function createArenaLandmark(x, z) {
      const arena = new THREE.Group();
      const stone = new THREE.MeshStandardMaterial({ color: 0x4d5660, roughness: 0.9 });
      const glow = new THREE.MeshStandardMaterial({ color: 0xffb347, emissive: 0xff6a1a, emissiveIntensity: 1.8 });
      const floor = new THREE.Mesh(new THREE.CylinderGeometry(18, 20, 1.2, 16), stone); floor.position.y = 0.6; arena.add(floor);
      for (let i = 0; i < 8; i++) {
        const angle = i / 8 * Math.PI * 2;
        const pillar = new THREE.Mesh(new THREE.BoxGeometry(1.8, 7, 1.8), stone);
        pillar.position.set(Math.cos(angle) * 16, 3.5, Math.sin(angle) * 16); pillar.castShadow = true; arena.add(pillar);
        const rune = new THREE.Mesh(new THREE.BoxGeometry(0.35, 3, 0.2), glow);
        rune.position.set(Math.cos(angle) * 15, 4, Math.sin(angle) * 15); arena.add(rune);
      }
      arena.userData.arena = true;
      return arena;
    }

    function createForestCluster(x, z) {
      const g = new THREE.Group();
      for (let i = 0; i < 10; i++) {
        const sx = (Math.random() - 0.5) * 12;
        const sz = (Math.random() - 0.5) * 12;
        const scale = 0.55 + Math.random() * 1.35;
        const t = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.6, 2.4, 8), new THREE.MeshStandardMaterial({ color: 0x5c3d28, roughness: 0.9 }));
        t.position.set(sx, 1.2 * scale, sz); t.scale.setScalar(scale); g.add(t);
        const crown = new THREE.Mesh(new THREE.SphereGeometry(1.4, 8, 8), new THREE.MeshStandardMaterial({ color: 0x3a8d3d, roughness: 0.8 }));
        crown.position.set(sx, 3.0 * scale, sz); crown.scale.setScalar(scale); g.add(crown);
      }
      g.scale.setScalar(0.8 + Math.random() * 0.8);
      g.position.set(x, getHeight(x, z), z);
      return g;
    }

    function createWorldLandmarks() {
      const poiDefs = [
        { type: 'village', x: -150, z: -150, name: 'Abandoned Village', func: (x, z) => { const g = new THREE.Group(); for (let i = 0; i < 5; i++) g.add(createRuinedHouse(x + (i % 2) * 6 - 6, z + Math.floor(i / 2) * 6 - 6, 0.9)); return g; } },
        { type: 'temple', x: 110, z: -120, name: 'Ancient Temple', func: createTemple },
        { type: 'dragon', x: -20, z: -200, name: 'Dragon Nest', func: (x, z) => { const g = new THREE.Group(); const peak = new THREE.Mesh(new THREE.ConeGeometry(12, 16, 10), new THREE.MeshStandardMaterial({ color: 0x868b92, roughness: 0.8 })); peak.position.y = 8; g.add(peak); const cave = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 2.8, 2.4, 12), new THREE.MeshStandardMaterial({ color: 0x3b3b3d, roughness: 0.9 })); cave.position.set(0, 1.2, 0); g.add(cave); return g; } },
        { type: 'cave', x: 180, z: 40, name: 'Dark Cave', func: (x, z) => createCaveEntrance(x, z, false) },
        { type: 'tower', x: -180, z: 110, name: 'Wizard Tower', func: createWizardTower },
        { type: 'camp', x: 180, z: -170, name: 'Bandit Camp', func: createBanditCamp },
        { type: 'battlefield', x: 0, z: 180, name: 'Forgotten Battlefield', func: createBattlefield },
        { type: 'dungeon', x: -120, z: 190, name: 'Underground Dungeon', func: createDungeon },
        { type: 'forest', x: 150, z: 170, name: 'Sacred Forest', func: createSacredForest },
        { type: 'floating', x: -200, z: -60, name: 'Floating Island', func: createFloatingIsland },
        { type: 'tower', x: 0, z: -285, name: 'Skyfall Tower', func: createSkyfallTower },
        { type: 'arena', x: 220, z: -80, name: 'Champion Arena', func: createArenaLandmark }
      ];

      const extraPoiDefs = [
        { type: 'village', x: 240, z: -215, name: 'Mossy Village', func: (x, z) => { const g = new THREE.Group(); for (let i = 0; i < 4; i++) g.add(createRuinedHouse(x + (i % 2) * 5 - 4, z + Math.floor(i / 2) * 5 - 4, 0.8)); const camp = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.2, 1.3, 8), new THREE.MeshStandardMaterial({ color: 0xeab56d, roughness: 0.8 })); camp.position.set(0, 0.65, 0); g.add(camp); return g; } },
        { type: 'graveyard', x: 120, z: 230, name: 'Moonlit Graveyard', func: (x, z) => { const g = new THREE.Group(); for (let i = 0; i < 8; i++) { const stone = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.9, 0.2), new THREE.MeshStandardMaterial({ color: 0xc5d0d4, roughness: 0.9 })); const ang = (i / 8) * Math.PI * 2; stone.position.set(Math.cos(ang) * 4.2, 0.45, Math.sin(ang) * 4.2); stone.rotation.z = ((Math.random() - 0.5) * 0.35); g.add(stone); } return g; } },
        { type: 'watchtower', x: -260, z: 20, name: 'Sentinel Watchtower', func: (x, z) => { const g = new THREE.Group(); const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.8, 7, 12), new THREE.MeshStandardMaterial({ color: 0x8e8f8e, roughness: 0.8 })); tower.position.y = 3.5; g.add(tower); const top = new THREE.Mesh(new THREE.ConeGeometry(2.2, 2.4, 8), new THREE.MeshStandardMaterial({ color: 0x7a5d3b, roughness: 0.9 })); top.position.y = 8.2; g.add(top); return g; } },
        { type: 'mine', x: 310, z: 60, name: 'Crystal Mine', func: (x, z) => { const g = new THREE.Group(); const rock = new THREE.Mesh(new THREE.BoxGeometry(5.5, 3.6, 4.6), new THREE.MeshStandardMaterial({ color: 0x5d6470, roughness: 0.95 })); rock.position.y = 1.8; g.add(rock); const shaft = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.7, 2.5, 12), new THREE.MeshStandardMaterial({ color: 0x3a4047, roughness: 0.9 })); shaft.position.set(0, 1.4, 0); g.add(shaft); const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.8), new THREE.MeshStandardMaterial({ color: 0x7fe7ff, emissive: 0x7fe7ff, emissiveIntensity: 1.2 })); crystal.position.set(0, 3.7, 0); g.add(crystal); return g; } },
        { type: 'hidden', x: -210, z: 210, name: 'Hidden Treasure', func: (x, z) => { const g = new THREE.Group(); const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.5, 1.2, 10), new THREE.MeshStandardMaterial({ color: 0x8a765d, roughness: 0.9 })); pedestal.position.y = 0.6; g.add(pedestal); const chest = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.7, 0.9), new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.8 })); chest.position.y = 1.5; g.add(chest); return g; } },
        { type: 'cave', x: -130, z: -260, name: 'Whispering Cave', func: (x, z) => createCaveEntrance(x, z, true) }
      ];

      for (const poi of extraPoiDefs) {
        const mesh = poi.func(poi.x, poi.z);
        mesh.scale.setScalar(0.8 + Math.random() * 0.55);
        mesh.userData = { poiType: poi.type, name: poi.name, x: poi.x, z: poi.z, radius: 18 };
        mesh.position.set(poi.x, getHeight(poi.x, poi.z), poi.z);
        scene.add(mesh);
        worldLandmarks.push(mesh);
      }

      for (const poi of poiDefs) {
        const mesh = poi.func(poi.x, poi.z);
        mesh.scale.setScalar(0.85 + Math.random() * 0.5);
        mesh.userData = { poiType: poi.type, name: poi.name, x: poi.x, z: poi.z, radius: 16 };
        scene.add(mesh);
        worldLandmarks.push(mesh);
      }

      // Extra hidden secret and biome content to encourage exploration
      const hiddenSecrets = [
        { x: 90, z: 220, name: 'Waterfall Cave', func: (x, z) => createCaveEntrance(x, z, true) },
        { x: 230, z: 130, name: 'Crystal Cavern', func: (x, z) => { const g = new THREE.Group(); const crystalLarge = new THREE.Mesh(new THREE.OctahedronGeometry(2.5), new THREE.MeshStandardMaterial({ color: 0x7fe6ff, emissive: 0x7fe6ff, emissiveIntensity: 1.4 })); crystalLarge.position.y = 5; g.add(crystalLarge); return g; } },
        { x: -70, z: 260, name: 'Snow Pass', func: (x, z) => { const g = new THREE.Group(); const rock = new THREE.Mesh(new THREE.ConeGeometry(8, 14, 10), new THREE.MeshStandardMaterial({ color: 0xf4f8ff, roughness: 0.8 })); rock.position.y = 7; g.add(rock); return g; } },
        { x: 260, z: -30, name: 'Volcanic Ridge', func: (x, z) => { const g = new THREE.Group(); const lava = new THREE.Mesh(new THREE.ConeGeometry(3.5, 5.5, 12), new THREE.MeshStandardMaterial({ color: 0xf04d23, emissive: 0xf04d23, emissiveIntensity: 0.8 })); lava.position.y = 2.5; g.add(lava); return g; } },
        { x: -260, z: -180, name: 'Sunken Ruin', func: (x, z) => { const g = new THREE.Group(); const base = new THREE.Mesh(new THREE.BoxGeometry(6, 2, 6), new THREE.MeshStandardMaterial({ color: 0x7f6b57, roughness: 0.95 })); base.position.y = 1; g.add(base); return g; } }
      ];

      for (const secret of hiddenSecrets) {
        const mesh = secret.func(secret.x, secret.z);
        mesh.scale.setScalar(0.8 + Math.random() * 0.55);
        mesh.userData = { poiType: 'secret', name: secret.name, x: secret.x, z: secret.z, radius: 12 };
        mesh.position.set(secret.x, getHeight(secret.x, secret.z), secret.z);
        if (secret.name === 'Floating Island' || secret.name === 'Volcanic Ridge') {
          mesh.position.y += 15;
        }
        scene.add(mesh);
        worldLandmarks.push(mesh);
      }

      // Dense forests and biome clutter to make the world feel alive
      for (let i = 0; i < 14; i++) {
        const px = (Math.random() - 0.5) * 540;
        const pz = (Math.random() - 0.5) * 540;
        if (Math.abs(px) < 60 && Math.abs(pz) < 60) continue;
        if (Math.sqrt(px * px + pz * pz) < 40) continue;
        const cluster = createForestCluster(px, pz);
        cluster.userData = { poiType: 'forestPatch', name: 'Dense Forest', x: px, z: pz, radius: 10 };
        scene.add(cluster);
        worldLandmarks.push(cluster);
      }

      scatterNaturalDetails();
    }

    function createBush(x, z, scale = 1) {
      const g = new THREE.Group();
      const mat = new THREE.MeshStandardMaterial({ color: 0x3e8f3c, roughness: 0.9 });
      const b1 = new THREE.Mesh(new THREE.SphereGeometry(0.9 * scale, 8, 8), mat); b1.position.set(-0.4, 0.6, 0.1); g.add(b1);
      const b2 = new THREE.Mesh(new THREE.SphereGeometry(0.8 * scale, 8, 8), mat); b2.position.set(0.5, 0.6, -0.1); g.add(b2);
      const b3 = new THREE.Mesh(new THREE.SphereGeometry(0.6 * scale, 8, 8), mat); b3.position.set(0.1, 0.8, 0.4); g.add(b3);
      g.position.set(x, getHeight(x, z), z);
      return g;
    }

    function createFlowerPatch(x, z, color = 0xff66cc) {
      const g = new THREE.Group();
      for (let i = 0; i < 10; i++) {
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.04, 0.45, 6), new THREE.MeshStandardMaterial({ color: 0x4ea24a, roughness: 0.9 }));
        stem.position.set((Math.random() - 0.5) * 1.2, 0.22, (Math.random() - 0.5) * 1.2); g.add(stem);
        const bloom = new THREE.Mesh(new THREE.SphereGeometry(0.11, 6, 6), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.15 }));
        bloom.position.set(stem.position.x, 0.5, stem.position.z); g.add(bloom);
      }
      g.position.set(x, getHeight(x, z), z);
      return g;
    }

    function createMushroomCluster(x, z) {
      const g = new THREE.Group();
      for (let i = 0; i < 7; i++) {
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.2, 6), new THREE.MeshStandardMaterial({ color: 0xf5e5d2, roughness: 0.9 }));
        stem.position.set((Math.random() - 0.5) * 1.1, 0.1, (Math.random() - 0.5) * 1.1); g.add(stem);
        const cap = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), new THREE.MeshStandardMaterial({ color: i % 2 ? 0xff9e6f : 0xef5a8c, emissive: 0x220000, emissiveIntensity: 0.18 }));
        cap.position.set(stem.position.x, 0.28, stem.position.z); g.add(cap);
      }
      g.position.set(x, getHeight(x, z), z);
      return g;
    }

    function createLog(x, z, rotation = 0) {
      const g = new THREE.Group();
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 2.4, 8), new THREE.MeshStandardMaterial({ color: 0x7a4a29, roughness: 0.95 }));
      log.rotation.z = Math.PI / 2;
      log.rotation.y = rotation;
      g.add(log);
      g.position.set(x, getHeight(x, z) + 0.2, z);
      return g;
    }

    function createCliff(x, z, scale = 1) {
      const g = new THREE.Group();
      const rock = new THREE.Mesh(new THREE.ConeGeometry(3 * scale, 7 * scale, 8), new THREE.MeshStandardMaterial({ color: 0x7d8588, roughness: 0.9 }));
      rock.position.y = 3.5 * scale; g.add(rock);
      g.position.set(x, getHeight(x, z), z);
      return g;
    }

    function createLake(x, z, radius = 14) {
      const g = new THREE.Group();
      const water = new THREE.Mesh(new THREE.CircleGeometry(radius, 20), new THREE.MeshStandardMaterial({ color: 0x4ab8ff, transparent: true, opacity: 0.8, roughness: 0.2 }));
      water.rotation.x = -Math.PI / 2;
      water.position.y = 0.2;
      g.add(water);
      g.position.set(x, getHeight(x, z) - 0.3, z);
      return g;
    }

    function createWaterfall(x, z) {
      const g = new THREE.Group();
      const rock = new THREE.Mesh(new THREE.BoxGeometry(3.6, 5, 1.2), new THREE.MeshStandardMaterial({ color: 0x6d7f8e, roughness: 0.9 }));
      rock.position.set(0, 2.5, 0); g.add(rock);
      const fall = new THREE.Mesh(new THREE.BoxGeometry(2.5, 3.8, 0.35), new THREE.MeshStandardMaterial({ color: 0x72d7ff, transparent: true, opacity: 0.7, emissive: 0x3ca7ff, emissiveIntensity: 0.5 }));
      fall.position.set(0, 2.3, -1.3); g.add(fall);
      g.position.set(x, getHeight(x, z), z);
      return g;
    }

    function createVillageCamp(x, z) {
      const g = new THREE.Group();
      const hut = new THREE.Mesh(new THREE.ConeGeometry(1.5, 2.4, 6), new THREE.MeshStandardMaterial({ color: 0x9d6b46, roughness: 0.95 }));
      hut.position.y = 1.3; g.add(hut);
      const fire = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 10), new THREE.MeshStandardMaterial({ color: 0xff8a00, emissive: 0xff6a00, emissiveIntensity: 1.2 }));
      fire.position.set(0, 0.5, 0); g.add(fire);
      g.position.set(x, getHeight(x, z), z);
      return g;
    }

    function createWatchTower(x, z) {
      const g = new THREE.Group();
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.5, 6.5, 10), new THREE.MeshStandardMaterial({ color: 0x9ea4ab, roughness: 0.8 }));
      tower.position.y = 3.2; g.add(tower);
      const top = new THREE.Mesh(new THREE.ConeGeometry(1.8, 2.2, 8), new THREE.MeshStandardMaterial({ color: 0x6f5638, roughness: 0.8 }));
      top.position.y = 7.2; g.add(top);
      g.position.set(x, getHeight(x, z), z);
      return g;
    }

    function createGraveyard(x, z) {
      const g = new THREE.Group();
      for (let i = 0; i < 9; i++) {
        const cross = new THREE.Group();
        const bar = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.9, 0.2), new THREE.MeshStandardMaterial({ color: 0xcdd7dc, roughness: 0.9 }));
        bar.position.y = 0.45; cross.add(bar);
        const stem = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.45, 0.2), new THREE.MeshStandardMaterial({ color: 0xcdd7dc, roughness: 0.9 }));
        stem.position.y = 0.2; cross.add(stem);
        cross.position.set((Math.random() - 0.5) * 10, 0, (Math.random() - 0.5) * 10); g.add(cross);
      }
      g.position.set(x, getHeight(x, z), z);
      return g;
    }

    function createMineEntrance(x, z) {
      const g = new THREE.Group();
      const rock = new THREE.Mesh(new THREE.BoxGeometry(5, 3.2, 5), new THREE.MeshStandardMaterial({ color: 0x5d6770, roughness: 0.95 }));
      rock.position.y = 1.6; g.add(rock);
      const hole = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 2, 2.4, 12), new THREE.MeshStandardMaterial({ color: 0x272d32, roughness: 0.9 }));
      hole.position.set(0, 1.2, 0); g.add(hole);
      g.position.set(x, getHeight(x, z), z);
      return g;
    }

    function createHiddenTreasure(x, z) {
      const g = new THREE.Group();
      const base = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.5, 0.8, 8), new THREE.MeshStandardMaterial({ color: 0x857c70, roughness: 0.9 }));
      base.position.y = 0.4; g.add(base);
      const chest = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.7, 0.9), new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.7 }));
      chest.position.y = 1.2; g.add(chest);
      g.position.set(x, getHeight(x, z), z);
      return g;
    }

    function scatterNaturalDetails() {
      const details = [
        { kind: 'bush', count: 90 },
        { kind: 'flower', count: 120 },
        { kind: 'mushroom', count: 80 },
        { kind: 'log', count: 60 },
        { kind: 'cliff', count: 22 },
        { kind: 'lake', count: 10 },
        { kind: 'waterfall', count: 8 },
        { kind: 'camp', count: 18 },
        { kind: 'watchtower', count: 10 },
        { kind: 'graveyard', count: 6 },
        { kind: 'mine', count: 6 },
        { kind: 'treasure', count: 12 }
      ];

      for (const entry of details) {
        for (let i = 0; i < entry.count; i++) {
          let x, z, valid = false, attempts = 0;
          do {
            x = (Math.random() - 0.5) * (MAP.groundSize - 80);
            z = (Math.random() - 0.5) * (MAP.groundSize - 80);
            valid = Math.hypot(x, z) > 22;
            if (valid && riverDistance(x, z) < MAP.riverWidth + 4) valid = false;
            attempts++;
          } while (!valid && attempts < 200);
          if (!valid) continue;

          let mesh;
          switch (entry.kind) {
            case 'bush': mesh = createBush(x, z, 0.8 + Math.random() * 0.7); break;
            case 'flower': mesh = createFlowerPatch(x, z, Math.random() > 0.5 ? 0xff7ab6 : 0x7ae8a4); break;
            case 'mushroom': mesh = createMushroomCluster(x, z); break;
            case 'log': mesh = createLog(x, z, Math.random() * Math.PI); break;
            case 'cliff': mesh = createCliff(x, z, 0.7 + Math.random() * 1.1); break;
            case 'lake': mesh = createLake(x, z, 8 + Math.random() * 10); break;
            case 'waterfall': mesh = createWaterfall(x, z); break;
            case 'camp': mesh = createVillageCamp(x, z); break;
            case 'watchtower': mesh = createWatchTower(x, z); break;
            case 'graveyard': mesh = createGraveyard(x, z); break;
            case 'mine': mesh = createMineEntrance(x, z); break;
            case 'treasure': mesh = createHiddenTreasure(x, z); break;
          }
          if (mesh) {
            const sizeRanges = {
              bush: [0.65, 1.5], flower: [0.7, 1.35], mushroom: [0.65, 1.4], log: [0.7, 1.5],
              cliff: [0.8, 1.5], lake: [0.75, 1.35], waterfall: [0.8, 1.35], camp: [0.75, 1.35],
              watchtower: [0.8, 1.35], graveyard: [0.75, 1.25], mine: [0.8, 1.4], treasure: [0.7, 1.3]
            }[entry.kind] || [0.8, 1.2];
            const propScale = sizeRanges[0] + Math.random() * (sizeRanges[1] - sizeRanges[0]);
            mesh.scale.setScalar(propScale);
            mesh.userData = { poiType: entry.kind, name: entry.kind, x, z, radius: 12 };
            scene.add(mesh);
            worldLandmarks.push(mesh);
          }
        }
      }
    }

    createWorldLandmarks();

    // ============================================================
    //  WORLD EVENTS + EXPLORATION FEED
    // ============================================================
    const worldEventState = {
      timer: 0,
      nextEvent: 24,
      merchantCooldown: 0,
      raidCooldown: 0,
      meteorCooldown: 0,
      dragonFlyoverCooldown: 0,
      activeEvents: [], bloodMoonTimer: 0
    };

    const MONSTER_TYPES = {
      shadowWolf: { name: 'Shadow Wolf', color: 0x302d4f, emissive: 0x6b48c7, hp: 85, speed: 6.5, damage: 12, scale: 0.9, xp: 24 },
      crystalGolem: { name: 'Crystal Golem', color: 0x62d8e8, emissive: 0x1b8ea8, hp: 260, speed: 1.2, damage: 24, scale: 2.0, xp: 70 },
      skeletonKing: { name: 'Skeleton King', color: 0xd9d2b8, emissive: 0x8a4b32, hp: 340, speed: 2.4, damage: 22, scale: 1.5, xp: 100 },
      demonKnight: { name: 'Demon Knight', color: 0xa72828, emissive: 0xff3b17, hp: 220, speed: 5.2, damage: 26, scale: 1.35, xp: 80 },
      iceGiant: { name: 'Ice Giant', color: 0xb7e8ff, emissive: 0x4f9dff, hp: 520, speed: 1.4, damage: 35, scale: 3.0, xp: 160 },
      fireDrake: { name: 'Fire Drake', color: 0xd84b21, emissive: 0xff6b16, hp: 280, speed: 4.0, damage: 28, scale: 1.7, xp: 100 },
      seaSerpent: { name: 'Sea Serpent', color: 0x277f8b, emissive: 0x25e0cf, hp: 380, speed: 2.8, damage: 30, scale: 2.2, xp: 130 },
      voidDragon: { name: 'Void Dragon', color: 0x271743, emissive: 0x9b35ff, hp: 900, speed: 3.0, damage: 42, scale: 3.3, xp: 300 },
      goldenSkeleton: { name: 'Golden Skeleton', color: 0xffd34e, emissive: 0xff9f1c, hp: 180, speed: 3.2, damage: 28, scale: 1.2, xp: 120 },
      ancientKnight: { name: 'Ancient Knight', color: 0x596875, emissive: 0x9fd5ff, hp: 420, speed: 3.6, damage: 38, scale: 1.55, xp: 180 },
      shadowAssassin: { name: 'Shadow Assassin', color: 0x171329, emissive: 0x9e4dff, hp: 200, speed: 7.5, damage: 34, scale: 1.15, xp: 150 },
      crystalBeast: { name: 'Crystal Beast', color: 0x48e4e8, emissive: 0x2bffff, hp: 360, speed: 2.8, damage: 32, scale: 1.65, xp: 170 },
      treant: { name: 'Treant', color: 0x5d3e25, emissive: 0x57c85c, hp: 460, speed: 1.3, damage: 40, scale: 2.0, xp: 190 },
      sandWorm: { name: 'Sand Worm', color: 0xb88945, emissive: 0xffc05c, hp: 520, speed: 2.1, damage: 45, scale: 2.2, xp: 220 },
      scorpionKing: { name: 'Scorpion King', color: 0x6f2f19, emissive: 0xff5b25, hp: 580, speed: 3.4, damage: 48, scale: 1.8, xp: 240 },
      frostDragon: { name: 'Frost Dragon', color: 0x8edcff, emissive: 0x5ac8ff, hp: 700, speed: 3.4, damage: 50, scale: 2.8, xp: 280 },
      lavaTitan: { name: 'Lava Titan', color: 0x6b2620, emissive: 0xff3d18, hp: 900, speed: 1.5, damage: 60, scale: 2.7, xp: 340 },
      fallenAngel: { name: 'Fallen Angel', color: 0x46365f, emissive: 0xe07bff, hp: 1100, speed: 4.5, damage: 58, scale: 2.2, xp: 450 }
    };

    function createMonsterMesh(typeKey, hard = false) {
      const type = MONSTER_TYPES[typeKey];
      const material = new THREE.MeshStandardMaterial({ color: type.color, emissive: type.emissive, emissiveIntensity: 0.65, roughness: 0.55, metalness: typeKey === 'crystalGolem' ? 0.65 : 0.1 });
      let geometry;
      if (typeKey === 'shadowWolf') geometry = new THREE.BoxGeometry(1.8, 0.9, 2.8);
      else if (typeKey === 'crystalGolem') geometry = new THREE.IcosahedronGeometry(1.35, 1);
      else if (typeKey === 'skeletonKing') geometry = new THREE.ConeGeometry(0.85, 2.4, 8);
      else if (typeKey === 'demonKnight') geometry = new THREE.BoxGeometry(1.4, 2.4, 1.1);
      else if (typeKey === 'iceGiant') geometry = new THREE.DodecahedronGeometry(1.5, 1);
      else if (typeKey === 'fireDrake') geometry = new THREE.ConeGeometry(1.2, 2.8, 8);
      else if (typeKey === 'seaSerpent') geometry = new THREE.CylinderGeometry(0.8, 1.1, 4.4, 10);
      else if (typeKey === 'goldenSkeleton') geometry = new THREE.ConeGeometry(0.95, 2.8, 8);
      else if (typeKey === 'ancientKnight') geometry = new THREE.BoxGeometry(1.8, 2.8, 1.4);
      else if (typeKey === 'shadowAssassin') geometry = new THREE.ConeGeometry(0.9, 2.6, 5);
      else if (typeKey === 'crystalBeast') geometry = new THREE.IcosahedronGeometry(1.45, 1);
      else if (typeKey === 'treant') geometry = new THREE.CylinderGeometry(1.0, 1.5, 3.8, 8);
      else if (typeKey === 'sandWorm') geometry = new THREE.CylinderGeometry(0.9, 1.2, 4.0, 10);
      else if (typeKey === 'scorpionKing') geometry = new THREE.DodecahedronGeometry(1.5, 1);
      else if (typeKey === 'frostDragon') geometry = new THREE.ConeGeometry(1.4, 3.4, 8);
      else if (typeKey === 'lavaTitan') geometry = new THREE.DodecahedronGeometry(1.7, 1);
      else if (typeKey === 'fallenAngel') geometry = new THREE.OctahedronGeometry(1.7, 1);
      else geometry = new THREE.IcosahedronGeometry(1.6, 1);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.scale.setScalar(type.scale * (hard ? 1.15 : 1));
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      return mesh;
    }

    function spawnEnemyAt(x, z, hard = false, typeKey = null) {
      const type = typeKey ? MONSTER_TYPES[typeKey] : null;
      const enemy = type ? createMonsterMesh(typeKey, hard) : new THREE.Mesh(new THREE.BoxGeometry(hard ? 1.5 : 1.2, hard ? 1.8 : 1.2, hard ? 1.5 : 1.2),
        new THREE.MeshStandardMaterial({
          color: hard ? 0xff9900 : 0xff3333,
          emissive: hard ? 0x661100 : 0xaa0000,
          emissiveIntensity: hard ? 0.8 : 0.6,
          roughness: 0.4
        }));
      const groundOffset = hard ? 0.9 : 0.6;
      enemy.position.set(x, getHeight(x, z) + groundOffset, z);
      if (!type) enemy.scale.setScalar(hard ? 1.15 + Math.random() * 0.35 : 0.8 + Math.random() * 0.45);
      enemy.castShadow = true; enemy.receiveShadow = true;
      enemy.userData = {
        hp: type ? type.hp : (hard ? 120 : 60),
        maxHp: type ? type.hp : (hard ? 120 : 60),
        hitFlash: 0,
        knockbackVel: new THREE.Vector3(0, 0, 0),
        xpValue: type ? type.xp : (hard ? 35 : 15),
        rare: hard,
        monsterType: typeKey,
        speed: type ? type.speed : 2.5,
        attackDamage: type ? type.damage : 15,
        groundOffset,
        specialTimer: 3 + Math.random() * 4,
        reflectedHit: false
      };
      const eyeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffff00, emissiveIntensity: 0.4 });
      const el = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.05), eyeMat); el.position.set(-0.25, 0.15, 0.61); enemy.add(el);
      const er = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.05), eyeMat); er.position.set(0.25, 0.15, 0.61); enemy.add(er);
      if (typeKey === 'shadowWolf' || typeKey === 'demonKnight') {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), new THREE.MeshStandardMaterial({ color: 0xff3f66, emissive: 0xff174f, emissiveIntensity: 1.5 }));
        eye.position.set(0, 0.25, 0.9); enemy.add(eye);
      }
      enemy.userData.displayName = type ? type.name : (hard ? 'Elite Monster' : 'Wilderness Beast');
      scene.add(enemy);
      enemies.push(enemy);
      return enemy;
    }

    function spawnPriorityMonsters() {
      const spawns = [
        ['shadowWolf', -75, -70], ['shadowWolf', -82, -64],
        ['crystalGolem', 230, 130],
        ['skeletonKing', 0, 180],
        ['demonKnight', 180, -170],
        ['iceGiant', -70, 260],
        ['fireDrake', 260, -30],
        ['seaSerpent', 90, 220],
        ['treant', 150, 170], ['sandWorm', 270, 120],
        ['scorpionKing', -250, -80], ['frostDragon', -70, 260],
        ['lavaTitan', 260, -30], ['fallenAngel', -260, 210],
        ['voidDragon', -200, -60]
      ];
      for (const [typeKey, x, z] of spawns) spawnEnemyAt(x, z, true, typeKey);
    }

    function triggerMerchantEvent() {
      const x = (Math.random() - 0.5) * 500;
      const z = (Math.random() - 0.5) * 500;
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.8, 0.8), new THREE.MeshStandardMaterial({ color: 0x6d4c41, roughness: 0.9 }));
      body.position.y = 1; g.add(body);
      const hat = new THREE.Mesh(new THREE.ConeGeometry(0.7, 0.9, 8), new THREE.MeshStandardMaterial({ color: 0x9f7d5b, roughness: 0.8 }));
      hat.position.y = 2.3; g.add(hat);
      const crate = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), new THREE.MeshStandardMaterial({ color: 0x9b6d3a, roughness: 0.8 }));
      crate.position.set(1.4, 0.6, 0); g.add(crate);
      g.position.set(x, getHeight(x, z), z);
      g.userData = { type: 'merchant', name: 'Traveling Merchant', x, z };
      scene.add(g);
      worldEventState.activeEvents.push({ type: 'merchant', mesh: g, life: 30, x, z });
      showLootNotification('rare', 'Merchant arrived');
    }

    function triggerTreasureEvent() {
      const x = (Math.random() - 0.5) * 500;
      const z = (Math.random() - 0.5) * 500;
      const chest = createChest(x, z);
      chest.userData.glowSprite.visible = true;
      chest.userData.eventChest = true;
      worldEventState.activeEvents.push({ type: 'treasure', mesh: chest, life: 50, x, z });
      showLootNotification('epic', 'Treasure cache spotted');
    }

    function triggerRaidEvent() {
      const centerX = (Math.random() - 0.5) * 500;
      const centerZ = (Math.random() - 0.5) * 500;
      for (let i = 0; i < 4; i++) {
        const x = centerX + (Math.random() - 0.5) * 14;
        const z = centerZ + (Math.random() - 0.5) * 14;
        spawnEnemyAt(x, z, i === 3);
      }
      showLootNotification('legendary', 'Village under attack!');
    }

    function triggerRareMonsterEvent() {
      const x = (Math.random() - 0.5) * 500;
      const z = (Math.random() - 0.5) * 500;
      const rareTypes = ['goldenSkeleton', 'ancientKnight', 'shadowAssassin', 'crystalBeast'];
      const typeKey = rareTypes[Math.floor(Math.random() * rareTypes.length)];
      spawnEnemyAt(x, z, true, typeKey);
      showLootNotification('legendary', `${MONSTER_TYPES[typeKey].name} sighted`);
    }

    function triggerGoblinInvasion() {
      const centerX = (Math.random() - 0.5) * 420;
      const centerZ = (Math.random() - 0.5) * 420;
      for (let i = 0; i < 8; i++) spawnEnemyAt(centerX + (Math.random() - 0.5) * 18, centerZ + (Math.random() - 0.5) * 18, i === 7, 'shadowWolf');
      showLootNotification('legendary', 'Goblin invasion! Defend the frontier');
    }

    function triggerBloodMoonEvent() {
      worldEventState.bloodMoonTimer = 55;
      sky.timeOfDay = 0.88;
      showLootNotification('legendary', 'Blood Moon rising · monsters grow stronger');
      worldEventState.activeEvents.push({ type: 'bloodMoon', life: 55 });
    }

    function triggerTitanDragonEvent() {
      if (!titanColossus || !dragon) return;
      const x = (Math.random() - 0.5) * 280;
      const z = (Math.random() - 0.5) * 280;
      titanColossus.position.set(x, getHeight(x, z), z);
      dragon.position.set(x + 18, getHeight(x + 18, z + 18) + 3, z + 18);
      dragonState.mode = 'ground'; dragonState.modeTimer = 0; dragonState.groundTimer = 18;
      worldEventState.activeEvents.push({ type: 'titanDragon', life: 35, timer: 0 });
      showLootNotification('legendary', 'Titan Colossus vs Ancient Dragon · Join the world battle');
      SFX.titanRoar();
    }

    function triggerMeteorEvent() {
      const x = (Math.random() - 0.5) * 500;
      const z = (Math.random() - 0.5) * 500;
      const meteor = new THREE.Mesh(new THREE.SphereGeometry(1.4, 16, 16), new THREE.MeshStandardMaterial({ color: 0xff8f3b, emissive: 0xff5e00, emissiveIntensity: 1.5 }));
      meteor.position.set(x, 30, z);
      scene.add(meteor);
      const crater = new THREE.Mesh(new THREE.CylinderGeometry(3, 4, 1.2, 16), new THREE.MeshStandardMaterial({ color: 0x51443d, roughness: 0.9 }));
      crater.position.set(x, getHeight(x, z) + 0.4, z); crater.rotation.x = Math.PI / 2; scene.add(crater);
      worldEventState.activeEvents.push({ type: 'meteor', mesh: meteor, crater, x, z, life: 14 });
      const chest = createChest(x + 2, z + 2); chest.userData.eventChest = true; chest.userData.glowSprite.visible = true;
      worldEventState.activeEvents.push({ type: 'meteorLoot', mesh: chest, life: 30, x: x + 2, z: z + 2 });
      showLootNotification('legendary', 'Meteor shower! Loot zone');
    }

    function triggerDragonFlyoverEvent() {
      if (!dragon) return;
      dragon.position.set((Math.random() - 0.5) * 420, 32 + Math.random() * 14, (Math.random() - 0.5) * 420);
      dragonState.mode = 'patrol';
      showLootNotification('legendary', 'Dragon flyover detected');
    }

    function updateWorldEvents(dt) {
      worldEventState.timer += dt;
      if (worldEventState.timer >= worldEventState.nextEvent) {
        worldEventState.timer = 0;
        worldEventState.nextEvent = 20 + Math.random() * 12;

        const roll = Math.random();
        if (roll < 0.14) triggerTitanDragonEvent();
        else if (roll < 0.27) triggerMeteorEvent();
        else if (roll < 0.40) triggerTreasureEvent();
        else if (roll < 0.52) triggerMerchantEvent();
        else if (roll < 0.66) triggerRaidEvent();
        else if (roll < 0.77) triggerRareMonsterEvent();
        else if (roll < 0.87) triggerGoblinInvasion();
        else if (roll < 0.94) triggerBloodMoonEvent();
        else if (dragon) triggerDragonFlyoverEvent();
      }

      for (let i = worldEventState.activeEvents.length - 1; i >= 0; i--) {
        const evt = worldEventState.activeEvents[i];
        evt.life -= dt;
        if (evt.type === 'meteor') {
          evt.mesh.position.y -= 8 * dt;
          if (evt.life <= 5) evt.mesh.material.emissiveIntensity = 0.2;
          if (evt.life <= 0) {
            scene.remove(evt.mesh);
            scene.remove(evt.crater);
            worldEventState.activeEvents.splice(i, 1);
          }
        } else if (evt.type === 'merchant') {
          evt.mesh.rotation.y += dt * 0.8;
          if (evt.life <= 0) {
            scene.remove(evt.mesh);
            worldEventState.activeEvents.splice(i, 1);
          }
        } else if (evt.type === 'titanDragon') {
          evt.timer += dt;
          if (evt.timer > 2 && titanColossus && dragon) {
            evt.timer = 0;
            applyDamageToDragon(35);
            if (titanColossus) applyDamageToTitan(30);
            createTitanShockwave(titanColossus ? titanColossus.position.clone() : new THREE.Vector3(), 20, 18);
          }
          if (evt.life <= 0 || (!titanColossus && !dragon)) {
            const x = titanColossus ? titanColossus.position.x : player.position.x;
            const z = titanColossus ? titanColossus.position.z : player.position.z;
            const chest = createChest(x + 3, z + 3);
            chest.userData.eventChest = true; chest.userData.glowSprite.visible = true;
            showLootNotification('legendary', 'Titan-Dragon battle treasure discovered');
            worldEventState.activeEvents.splice(i, 1);
          }
        } else if (evt.type === 'bloodMoon') {
          if (evt.life <= 0) {
            worldEventState.bloodMoonTimer = 0;
            sky.currentWeather = 'clear';
            worldEventState.activeEvents.splice(i, 1);
            showLootNotification('rare', 'The Blood Moon fades');
          }
        } else if (evt.type === 'treasure' || evt.type === 'meteorLoot') {
          if (evt.life <= 0) {
            if (evt.mesh && evt.mesh.userData && evt.mesh.userData.glowSprite) evt.mesh.userData.glowSprite.visible = false;
            scene.remove(evt.mesh);
            worldEventState.activeEvents.splice(i, 1);
          }
        }
      }

      for (const landmark of worldLandmarks) {
        const dx = player.position.x - landmark.position.x;
        const dz = player.position.z - landmark.position.z;
        const dist = Math.hypot(dx, dz);
        if (landmark.userData && landmark.userData.name && dist < landmark.userData.radius + 10 && !worldAchievements.has(landmark.userData.name)) {
          addWorldAchievement(landmark.userData.name);
        }
      }
    }

    // ============================================================
    //  SCENE
    // ============================================================
    // River + bridge
    const riverGeo = new THREE.PlaneGeometry(MAP.groundSize, MAP.groundSize);
    riverGeo.rotateX(-Math.PI / 2);
    const riverMat = new THREE.MeshStandardMaterial({ color: 0x2a8fbf, transparent: true, opacity: 0.75, roughness: 0.2, metalness: 0.3, side: THREE.DoubleSide });
    const river = new THREE.Mesh(riverGeo, riverMat);
    river.position.y = -0.3;
    scene.add(river);

    const bridge = new THREE.Group();
    const bridgeCenterZ = getRiverCenterZ(0);
    bridge.position.set(0, 0, bridgeCenterZ);
    const plankMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.85 });
    const postMat = new THREE.MeshStandardMaterial({ color: 0x5c3a1e, roughness: 0.9 });
    const bridgeY = Math.max(getHeight(-MAP.riverWidth - 2, bridgeCenterZ), getHeight(MAP.riverWidth + 2, bridgeCenterZ)) + 0.1;
    const bridgeLength = (MAP.riverWidth * 2) + 8;
    const plankCount = 24, plankWidth = bridgeLength / plankCount;
    for (let i = 0; i < plankCount; i++) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(3, 0.2, plankWidth * 0.9), plankMat);
      p.position.set(0, bridgeY, -bridgeLength / 2 + i * plankWidth + plankWidth / 2);
      p.castShadow = true; p.receiveShadow = true;
      bridge.add(p);
    }
    for (let i = 0; i <= 6; i++) {
      const zPos = -bridgeLength / 2 + (i / 6) * bridgeLength;
      const pl = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.4, 0.2), postMat);
      pl.position.set(-1.5, bridgeY + 0.7, zPos); pl.castShadow = true; bridge.add(pl);
      const pr = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.4, 0.2), postMat);
      pr.position.set(1.5, bridgeY + 0.7, zPos); pr.castShadow = true; bridge.add(pr);
    }
    scene.add(bridge);
    const bridgeBounds = { minX: -1.8, maxX: 1.8, minZ: bridgeCenterZ - bridgeLength / 2, maxZ: bridgeCenterZ + bridgeLength / 2, y: bridgeY + 0.2 };
    bridge.userData = { damage: 0 };

    // Trees
    const trees = [];
    const treePositions = [];
    function createTree(x, z, baseY, scale = 1) {
      const g = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.BoxGeometry(0.6, 2, 0.6), new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.9 }));
      trunk.position.y = 1; trunk.castShadow = true; g.add(trunk);
      const lm = new THREE.MeshStandardMaterial({ color: 0x2d8e2d, roughness: 0.8 });
      const l1 = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 2), lm); l1.position.y = 2.5; l1.castShadow = true; g.add(l1);
      const l2 = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.8, 1.5), lm); l2.position.y = 3.3; l2.castShadow = true; g.add(l2);
      const l3 = new THREE.Mesh(new THREE.BoxGeometry(1, 0.8, 1), lm); l3.position.y = 4; l3.castShadow = true; g.add(l3);
      g.scale.setScalar(scale);
      g.position.set(x, baseY, z);
      scene.add(g);
      trees.push({ group: g, x, z, y: baseY, radius: 1.2 * scale });
      treePositions.push({ x, z, radius: 1.2 * scale });
    }
    for (let i = 0; i < MAP.treeCount; i++) {
      let x, z, valid, a = 0;
      do {
        a++;
        x = (Math.random() - 0.5) * (MAP.groundSize - 30);
        z = (Math.random() - 0.5) * (MAP.groundSize - 30);
        valid = Math.sqrt(x * x + z * z) > 20;
        const y = getHeight(x, z);
        if (y < 0.5 || y > 12) valid = false;
        if (valid) {
          const h1 = getHeight(x + 1, z), h2 = getHeight(x, z + 1);
          if (Math.max(Math.abs(h1 - y), Math.abs(h2 - y)) > 0.6) valid = false;
        }
        if (valid) for (let tp of treePositions) if (Math.sqrt((x - tp.x) ** 2 + (z - tp.z) ** 2) < 4.5 + tp.radius) { valid = false; break; }
        if (valid && riverDistance(x, z) < MAP.riverWidth + 3) valid = false;
        if (valid && Math.abs(x) < 6 && Math.abs(z - bridgeCenterZ) < 20) valid = false;
        if (a > 500) break;
      } while (!valid);
      if (valid) {
        const roll = Math.random();
        const scale = roll < 0.08 ? 2.4 + Math.random() * 1.2 : roll < 0.28 ? 1.35 + Math.random() * 0.55 : 0.65 + Math.random() * 0.6;
        createTree(x, z, getHeight(x, z), scale);
      }
    }
    const worldRocks = [];
    for (let i = 0; i < MAP.rockCount; i++) {
      const size = 0.4 + Math.random() * 0.8;
      const rock = new THREE.Mesh(new THREE.BoxGeometry(size, size * 0.7, size), new THREE.MeshStandardMaterial({ color: 0x7f8c8d, roughness: 0.95 }));
      let x, z, valid, a = 0;
      do {
        a++;
        x = (Math.random() - 0.5) * (MAP.groundSize - 30);
        z = (Math.random() - 0.5) * (MAP.groundSize - 30);
        valid = Math.sqrt(x * x + z * z) > 35;
        if (valid && riverDistance(x, z) < MAP.riverWidth + 2) valid = false;
        if (valid && Math.abs(x) < 10 && Math.abs(z - bridgeCenterZ) < bridgeLength / 2 + 8) valid = false;
        if (a > 200) break;
      } while (!valid);
      if (!valid) continue;
      const y = getHeight(x, z);
      rock.position.set(x, y + size * 0.35, z);
      rock.rotation.y = Math.random() * Math.PI;
      rock.castShadow = true; rock.receiveShadow = true;
      scene.add(rock);
      worldRocks.push(rock);
    }

    // Cubes
    const cubes = [];
    for (let i = 0; i < MAP.cubeCount; i++) {
      const cube = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8),
        new THREE.MeshStandardMaterial({ color: 0xffcc00, emissive: 0xff8800, emissiveIntensity: 0.5, roughness: 0.3, metalness: 0.5 }));
      let x, z, valid, a = 0;
      do {
        a++;
        x = (Math.random() - 0.5) * (MAP.groundSize - 40);
        z = (Math.random() - 0.5) * (MAP.groundSize - 40);
        valid = Math.sqrt(x * x + z * z) > 12;
        if (valid && riverDistance(x, z) < MAP.riverWidth + 2) valid = false;
        if (valid) for (let t of trees) if (Math.sqrt((x - t.x) ** 2 + (z - t.z) ** 2) < 3) { valid = false; break; }
        if (a > 500) break;
      } while (!valid);
      if (!valid) continue;
      cube.position.set(x, getHeight(x, z) + 0.8, z);
      cube.scale.setScalar(0.75 + Math.random() * 0.65);
      cube.castShadow = true; cube.receiveShadow = true;
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0xffcc00, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending }));
      sprite.scale.set(2.5, 2.5, 1);
      cube.add(sprite);
      scene.add(cube);
      cubes.push(cube);
    }

    // Chests
    const chests = [];
    function createChest(x, z) {
      const g = new THREE.Group();
      const baseMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.7, metalness: 0.2 });
      const lidMat = new THREE.MeshStandardMaterial({ color: 0x6b3a1b, roughness: 0.6, metalness: 0.3 });
      const goldMat = new THREE.MeshStandardMaterial({ color: 0xffcc00, metalness: 0.9, roughness: 0.3, emissive: 0x443300, emissiveIntensity: 0.3 });
      const base = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.7, 0.9), baseMat);
      base.position.y = 0.35; base.castShadow = true; base.receiveShadow = true; g.add(base);
      const lid = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.35, 0.95), lidMat);
      lid.position.y = 0.85; lid.castShadow = true; g.add(lid);
      const trim1 = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.1, 0.15), goldMat);
      trim1.position.set(0, 0.85, 0.5); g.add(trim1);
      const trim2 = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.1, 0.15), goldMat);
      trim2.position.set(0, 0.85, -0.5); g.add(trim2);
      const lock = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 0.1), goldMat);
      lock.position.set(0, 0.5, 0.5); g.add(lock);
      const glowSprite = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0xffcc00, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending }));
      glowSprite.scale.set(2.5, 2.5, 1); glowSprite.position.y = 0.5; g.add(glowSprite);
      const light = new THREE.PointLight(0xffcc00, 0.8, 8);
      light.position.y = 1; g.add(light);
      const y = getHeight(x, z);
      g.position.set(x, y, z);
      g.scale.setScalar(0.8 + Math.random() * 0.45);
      g.userData = { opened: false, baseY: y, glowSprite, lid, base };
      scene.add(g);
      chests.push(g);
    }
    for (let i = 0; i < 15; i++) {
      let x, z, valid, a = 0;
      do {
        a++;
        x = (Math.random() - 0.5) * (MAP.groundSize - 50);
        z = (Math.random() - 0.5) * (MAP.groundSize - 50);
        valid = Math.sqrt(x * x + z * z) > 20;
        if (valid && riverDistance(x, z) < MAP.riverWidth + 3) valid = false;
        if (valid && Math.abs(x) < 6 && Math.abs(z - bridgeCenterZ) < 20) valid = false;
        if (valid) for (let c of chests) if (Math.sqrt((x - c.position.x) ** 2 + (z - c.position.z) ** 2) < 25) { valid = false; break; }
        if (a > 500) break;
      } while (!valid);
      if (valid) createChest(x, z);
    }

    // Weapon pickups
    const weaponPickups = [];
    function createWeaponPickup(typeKey, x, z, rarity) {
      rarity = rarity || 'common';
      const r = RARITY[rarity];
      const g = new THREE.Group();
      if (typeKey === 'sword') {
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.4, 0.12),
          new THREE.MeshStandardMaterial({ color: r.color, metalness: 0.9, roughness: 0.2, emissive: r.glow, emissiveIntensity: 0.4 }));
        blade.position.y = 0.9; blade.castShadow = true; g.add(blade);
        const guard = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.15), new THREE.MeshStandardMaterial({ color: 0xffcc00, metalness: 0.7 }));
        guard.position.y = 0.2; g.add(guard);
        const handle = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.4, 0.15), new THREE.MeshStandardMaterial({ color: 0x8b5a2b }));
        handle.position.y = 0; g.add(handle);
      } else if (typeKey === 'bow') {
        const bowGeo = new THREE.TorusGeometry(0.7, 0.05, 8, 16, Math.PI);
        const bow = new THREE.Mesh(bowGeo, new THREE.MeshStandardMaterial({ color: r.color, roughness: 0.7, emissive: r.glow, emissiveIntensity: 0.3 }));
        bow.rotation.z = -Math.PI / 2; bow.position.y = 0.7; bow.castShadow = true; g.add(bow);
        const arrow = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.2, 0.05), new THREE.MeshStandardMaterial({ color: 0x5c3a1e }));
        arrow.position.set(0, 0.7, -0.15); g.add(arrow);
      } else {
        const staff = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.5, 0.1), new THREE.MeshStandardMaterial({ color: 0x5c3a1e }));
        staff.position.y = 0.75; staff.castShadow = true; g.add(staff);
        const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.25),
          new THREE.MeshStandardMaterial({ color: r.color, emissive: r.glow, emissiveIntensity: 0.9, metalness: 0.5, roughness: 0.2 }));
        crystal.position.y = 1.65; g.add(crystal);
      }
      const y = getHeight(x, z);
      g.position.set(x, y, z);
      g.scale.setScalar(0.75 + Math.random() * 0.55);
      g.userData = { typeKey, baseY: y, rarity };
      scene.add(g);
      weaponPickups.push(g);
    }
    const weaponTypes = ['sword', 'bow', 'wand', 'thunderHammer', 'dragonSlayer', 'voidBow', 'frostAxe'];
    for (let i = 0; i < MAP.weaponCount; i++) {
      let x, z, valid, a = 0;
      do {
        a++;
        x = (Math.random() - 0.5) * (MAP.groundSize - 40);
        z = (Math.random() - 0.5) * (MAP.groundSize - 40);
        valid = Math.sqrt(x * x + z * z) > 15;
        if (valid && riverDistance(x, z) < MAP.riverWidth + 2) valid = false;
        if (valid) for (let t of trees) if (Math.sqrt((x - t.x) ** 2 + (z - t.z) ** 2) < 3) { valid = false; break; }
        if (a > 500) break;
      } while (!valid);
      if (valid) createWeaponPickup(weaponTypes[i % 3], x, z, 'common');
    }

    // Enemies
    const enemies = [];
    function spawnEnemy() {
      const enemy = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2),
        new THREE.MeshStandardMaterial({ color: 0xff3333, emissive: 0xaa0000, emissiveIntensity: 0.6, roughness: 0.4 }));
      let x, z, valid, a = 0;
      do {
        a++;
        x = (Math.random() - 0.5) * (MAP.groundSize - 50);
        z = (Math.random() - 0.5) * (MAP.groundSize - 50);
        valid = Math.sqrt(x * x + z * z) > 40;
        if (valid && riverDistance(x, z) < MAP.riverWidth + 3) valid = false;
        if (valid && getHeight(x, z) > 15) valid = false;
        if (a > 500) break;
      } while (!valid);
      enemy.position.set(x, getHeight(x, z) + 0.6, z);
      enemy.scale.setScalar(0.8 + Math.random() * 0.45);
      enemy.castShadow = true; enemy.receiveShadow = true;
      enemy.userData = { hp: 60, maxHp: 60, hitFlash: 0, knockbackVel: new THREE.Vector3(0, 0, 0), xpValue: 15 };
      const eyeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffff00, emissiveIntensity: 0.3 });
      const el = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.05), eyeMat); el.position.set(-0.25, 0.15, 0.61); enemy.add(el);
      const er = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.05), eyeMat); er.position.set(0.25, 0.15, 0.61); enemy.add(er);
      scene.add(enemy);
      enemies.push(enemy);
      return enemy;
    }

    // Dragon
    let dragon = null;
    const dragonState = {
      mode: 'patrol', modeTimer: 0, patrolAngle: 0, patrolRadius: 90, patrolSpeed: 0.4,
      hitFlash: 0, walkCycle: 0, tailWag: 0, fireCooldown: 0, wingPhase: 0, groundTimer: 0
    };
    function createDragon() {
      const dg = new THREE.Group();
      const bodyMat = new THREE.MeshStandardMaterial({ color: 0x8b1a1a, roughness: 0.7, metalness: 0.1 });
      const body = new THREE.Mesh(new THREE.BoxGeometry(3.5, 2.2, 6), bodyMat);
      body.position.y = 1.5; body.castShadow = true; dg.add(body);
      const belly = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.8, 5.5), new THREE.MeshStandardMaterial({ color: 0xd4a373 }));
      belly.position.y = 0.6; belly.castShadow = true; dg.add(belly);
      const head = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.6, 2.5), bodyMat);
      head.position.set(0, 2.2, 4); head.castShadow = true; dg.add(head);
      const eyeMat = new THREE.MeshStandardMaterial({ color: 0xffff00, emissive: 0xffff00, emissiveIntensity: 0.9 });
      const eL = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.2), eyeMat); eL.position.set(-0.6, 2.5, 5.1); dg.add(eL);
      const eR = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.2), eyeMat); eR.position.set(0.6, 2.5, 5.1); dg.add(eR);
      const hornMat = new THREE.MeshStandardMaterial({ color: 0x2a1a0a });
      const hL = new THREE.Mesh(new THREE.ConeGeometry(0.3, 1.5, 4), hornMat); hL.position.set(-0.8, 3.5, 3.5); hL.rotation.x = -0.3; dg.add(hL);
      const hR = new THREE.Mesh(new THREE.ConeGeometry(0.3, 1.5, 4), hornMat); hR.position.set(0.8, 3.5, 3.5); hR.rotation.x = -0.3; dg.add(hR);
      const wingMat = new THREE.MeshStandardMaterial({ color: 0x6b0a0a, side: THREE.DoubleSide });
      const lwp = new THREE.Group(); lwp.position.set(-1.8, 2.5, 0); dg.add(lwp);
      const lw = new THREE.Mesh(new THREE.BoxGeometry(8, 0.3, 4), wingMat);
      lw.position.set(-4, 0, 0); lw.castShadow = true; lwp.add(lw);
      const rwp = new THREE.Group(); rwp.position.set(1.8, 2.5, 0); dg.add(rwp);
      const rw = new THREE.Mesh(new THREE.BoxGeometry(8, 0.3, 4), wingMat);
      rw.position.set(4, 0, 0); rw.castShadow = true; rwp.add(rw);
      const tailSegs = [];
      let tp = dg;
      for (let i = 0; i < 5; i++) {
        const seg = new THREE.Group();
        const size = 1.5 - i * 0.2;
        const tm = new THREE.Mesh(new THREE.BoxGeometry(size, size * 0.7, size), bodyMat);
        tm.position.z = -size * 0.5 - 0.4;
        seg.add(tm);
        seg.position.z = i === 0 ? -3 : -1.0;
        tp.add(seg);
        tp = seg;
        tailSegs.push(seg);
      }
      const legMat = new THREE.MeshStandardMaterial({ color: 0x6b0a0a });
      const legPos = [{ x: -1.3, z: 1.8 }, { x: 1.3, z: 1.8 }, { x: -1.3, z: -1.8 }, { x: 1.3, z: -1.8 }];
      const dragonLegs = [];
      for (const lp of legPos) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2.0, 0.8), legMat);
        leg.position.set(lp.x, -0.3, lp.z); leg.castShadow = true;
        dg.add(leg); dragonLegs.push(leg);
        const foot = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.3, 1.2), legMat);
        foot.position.set(lp.x, -1.4, lp.z + 0.1); dg.add(foot);
      }
      dg.userData = { leftWingPivot: lwp, rightWingPivot: rwp, tailSegments: tailSegs, dragonLegs, materials: [bodyMat, wingMat, legMat], xpValue: 200 };
      dg.position.set(0, 30, 150);
      dg.scale.set(1.2, 1.2, 1.2);
      scene.add(dg);
      return dg;
    }

    // ============================================================
    //  TITAN COLOSSUS WORLD BOSS
    // ============================================================
    let titanColossus = null;
    const titanEffects = [];
    const titanState = {
      mode: 'patrol', regionIndex: 0, target: new THREE.Vector3(),
      stepTimer: 0, attackTimer: 5, roarTimer: 12, rumbleTimer: 8, eventTimer: 30,
      walkPhase: 0, footprintTimer: 0, lastDamageTime: 0, chargeTimer: 0
    };
    const titanRegions = [
      [-235, -220], [-40, -245], [210, -190], [245, 35],
      [175, 225], [-40, 235], [-230, 180], [-250, 15]
    ];

    function createTitanColossus() {
      const titan = new THREE.Group();
      const skin = new THREE.MeshStandardMaterial({ color: 0x8b6a56, roughness: 0.92, metalness: 0.05 });
      const skinDark = new THREE.MeshStandardMaterial({ color: 0x533e36, roughness: 0.98 });
      const armor = new THREE.MeshStandardMaterial({ color: 0x4a5560, roughness: 0.78, metalness: 0.5 });
      const cloth = new THREE.MeshStandardMaterial({ color: 0x2c2430, roughness: 0.96, side: THREE.DoubleSide });
      const crystal = new THREE.MeshStandardMaterial({ color: 0x76f2dc, emissive: 0x1abda8, emissiveIntensity: 2.2, roughness: 0.2, metalness: 0.45 });
      const energy = new THREE.MeshStandardMaterial({ color: 0xbafff2, emissive: 0x39e8cf, emissiveIntensity: 3 });
      const scar = new THREE.MeshStandardMaterial({ color: 0x361b1b, emissive: 0x5f2020, emissiveIntensity: 0.25, roughness: 1 });
      const parts = [skin, skinDark, armor, cloth, crystal, energy, scar];
      const crystals = [], cracks = [];
      const add = (mesh, x, y, z, material) => {
        mesh.material = material;
        mesh.position.set(x, y, z);
        mesh.castShadow = true; mesh.receiveShadow = true;
        titan.add(mesh);
        return mesh;
      };
      add(new THREE.Mesh(new THREE.BoxGeometry(10, 15, 6), skin), 0, 22, 0, skin);
      add(new THREE.Mesh(new THREE.BoxGeometry(7.5, 8, 6.4), armor), 0, 25, 0.4, armor);
      add(new THREE.Mesh(new THREE.BoxGeometry(8.5, 2.2, 6.8), armor), 0, 31, 0.2, armor);
      add(new THREE.Mesh(new THREE.BoxGeometry(5.8, 6.2, 5.8), skin), 0, 37, 0.1, skin);
      add(new THREE.Mesh(new THREE.BoxGeometry(6.5, 2.8, 6.2), skinDark), 0, 41.2, -0.1, skinDark);
      add(new THREE.Mesh(new THREE.BoxGeometry(6.8, 1.8, 6.4), cloth), 0, 44, -0.2, cloth);
      add(new THREE.Mesh(new THREE.BoxGeometry(7.4, 2, 1.4), skinDark), 0, 40.2, 3.0, skinDark);
      add(new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.75, 0.25), energy), -1.6, 38.2, 3.02, energy);
      add(new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.75, 0.25), energy), 1.6, 38.2, 3.02, energy);
      for (const [x, y, angle] of [[-1.3, 36.2, -0.3], [0.3, 34.2, 0.2], [1.5, 36.5, 0.35], [-0.6, 28.3, -0.2]]) {
        const mark = add(new THREE.Mesh(new THREE.BoxGeometry(0.24, 3.8, 0.18), scar), x, y, 3.16, scar);
        mark.rotation.z = angle;
      }
      for (const [x, y, scale] of [[-2.2, 29, 1.2], [2.2, 29, 1.2], [-1.7, 41.2, 0.8], [1.7, 41.2, 0.8]]) {
        const c = add(new THREE.Mesh(new THREE.OctahedronGeometry(scale), crystal), x, y, 3.1, crystal);
        c.rotation.set(Math.random(), Math.random(), Math.random());
        crystals.push(c);
      }
      const leftArm = new THREE.Group(); leftArm.position.set(-7, 29, 0); titan.add(leftArm);
      const rightArm = new THREE.Group(); rightArm.position.set(7, 29, 0); titan.add(rightArm);
      const addLimb = (group, x, y, z, sx, sy, sz, material) => {
        const limb = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), material);
        limb.position.set(x, y, z); limb.castShadow = true; limb.receiveShadow = true; group.add(limb); return limb;
      };
      addLimb(leftArm, 0, -5, 0, 4.2, 10, 4.2, skin);
      addLimb(leftArm, 0, -12, 0.2, 3.7, 6, 3.8, skinDark);
      addLimb(rightArm, 0, -5, 0, 4.2, 10, 4.2, skin);
      addLimb(rightArm, 0, -12, 0.2, 3.7, 6, 3.8, skinDark);
      const leftFist = addLimb(leftArm, 0, -17, 0.5, 5.2, 5.2, 5.2, armor);
      const rightFist = addLimb(rightArm, 0, -17, 0.5, 5.2, 5.2, 5.2, armor);
      add(new THREE.Mesh(new THREE.BoxGeometry(5, 7, 5), skin), -3.4, 8, 0, skin);
      add(new THREE.Mesh(new THREE.BoxGeometry(5, 7, 5), skin), 3.4, 8, 0, skin);
      const leftLeg = new THREE.Group(); leftLeg.position.set(-3.4, 14, 0); titan.add(leftLeg);
      const rightLeg = new THREE.Group(); rightLeg.position.set(3.4, 14, 0); titan.add(rightLeg);
      addLimb(leftLeg, 0, -5, 0, 5, 10, 5, skinDark);
      addLimb(leftLeg, 0, -11, 0.4, 4.7, 5, 5.2, armor);
      addLimb(rightLeg, 0, -5, 0, 5, 10, 5, skinDark);
      addLimb(rightLeg, 0, -11, 0.4, 4.7, 5, 5.2, armor);
      add(new THREE.Mesh(new THREE.BoxGeometry(6.2, 2.2, 7.5), armor), -3.4, 1.1, 1.1, armor);
      add(new THREE.Mesh(new THREE.BoxGeometry(6.2, 2.2, 7.5), armor), 3.4, 1.1, 1.1, armor);
      const cape = add(new THREE.Mesh(new THREE.BoxGeometry(12, 22, 0.35), cloth), 0, 22, -3.5, cloth);
      cape.rotation.z = 0.04;
      for (const [x, y, sx, sy, angle] of [[-2.2, 24, 0.22, 7, -0.3], [0, 20, 0.18, 8, 0.15], [2.1, 27, 0.2, 6, 0.3]]) {
        const crack = add(new THREE.Mesh(new THREE.BoxGeometry(sx, sy, 0.12), energy), x, y, 3.28, energy);
        crack.rotation.z = angle; cracks.push(crack);
      }
      const beacon = new THREE.PointLight(0x49e7ca, 5, 150);
      beacon.position.set(0, 39, 3); titan.add(beacon);

      titan.userData = { materials: parts, crystals, cracks, leftArm, rightArm, leftFist, rightFist, leftLeg, rightLeg, beacon, hp: 12000, maxHp: 12000, hitFlash: 0, displayName: 'Titan Colossus' };
      titan.position.set(-235, getHeight(-235, -220), -220);
      scene.add(titan);
      return titan;
    }

    function createTitanDust(position, count = 18) {
      spawnHitParticles(position, 0x9b8b72, count);
      for (const p of hitParticles.slice(-count)) {
        p.mesh.material.color.setHex(0x9b8b72);
        p.mesh.scale.setScalar(1.8);
        p.vel.y += 1.5;
      }
    }

    function createTitanFootprint(x, z) {
      const mark = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 5.5, 0.08, 10), new THREE.MeshStandardMaterial({ color: 0x3e3933, roughness: 1, transparent: true, opacity: 0.8 }));
      mark.position.set(x, getHeight(x, z) + 0.04, z);
      mark.rotation.y = titanColossus.rotation.y;
      scene.add(mark);
      titanEffects.push({ type: 'footprint', mesh: mark, life: 90 });
      if (Math.random() < 0.12) {
        const chest = createChest(x + 2, z - 1);
        chest.userData.eventChest = true;
        chest.userData.glowSprite.visible = true;
        showLootNotification('legendary', 'Rare treasure near a Titan footprint');
      }
    }

    function createTitanShockwave(position, radius = 20, damage = 28) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(2, 0.35, 8, 32), new THREE.MeshBasicMaterial({ color: 0x9fffee, transparent: true, opacity: 0.9 }));
      ring.rotation.x = Math.PI / 2;
      ring.position.copy(position); ring.position.y = getHeight(position.x, position.z) + 0.25;
      scene.add(ring);
      titanEffects.push({ type: 'shockwave', mesh: ring, life: 1.2, maxLife: 1.2, radius, damage, hit: false });
    }

    function throwTitanBoulder(target) {
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(1.5, 1), new THREE.MeshStandardMaterial({ color: 0x595752, roughness: 1 }));
      const start = titanColossus.position.clone().add(new THREE.Vector3(0, 36, 3));
      rock.position.copy(start);
      const destination = target.clone(); destination.y = getHeight(target.x, target.z) + 1;
      const velocity = destination.sub(start).normalize().multiplyScalar(26);
      scene.add(rock);
      titanEffects.push({ type: 'boulder', mesh: rock, velocity, life: 3.5, target: target.clone() });
    }

    function damageTitanWorld() {
      const tx = titanColossus.position.x, tz = titanColossus.position.z;
      for (const tree of trees) {
        if (tree.group.visible && Math.hypot(tree.x - tx, tree.z - tz) < 24) {
          tree.group.visible = false;
          tree.destroyedByTitan = true;
          createTitanDust(new THREE.Vector3(tree.x, tree.y + 2, tree.z), 5);
        }
      }
      for (const landmark of worldLandmarks) {
        const distance = Math.hypot(landmark.position.x - tx, landmark.position.z - tz);
        if (landmark.userData.poiType === 'village' && distance < 35 && !landmark.userData.titanWarning) {
          landmark.userData.titanWarning = true;
          showLootNotification('rare', 'Villagers request help: the Titan is approaching!');
        }
        if (!landmark.userData.titanDamaged && distance < 10 && landmark.userData.poiType !== 'floating') {
          landmark.userData.titanDamaged = true;
          landmark.scale.multiplyScalar(0.35);
          showLootNotification('rare', `${landmark.userData.name || 'Village'} damaged by the Titan`);
        }
      }
      if (tx > bridgeBounds.minX - 12 && tx < bridgeBounds.maxX + 12 && tz > bridgeBounds.minZ - 12 && tz < bridgeBounds.maxZ + 12) {
        bridge.userData.damage = (bridge.userData.damage || 0) + 1;
        bridge.scale.y = Math.max(0.25, 1 - bridge.userData.damage * 0.12);
        if (bridge.userData.damage > 5) bridge.visible = false;
      }
    }

    function titanRoarAttack() {
      const distance = player.position.distanceTo(titanColossus.position);
      SFX.titanRoar();
      if (distance < 110) {
        addShake(0.9);
        const away = player.position.clone().sub(titanColossus.position).setY(0).normalize();
        player.velocity.x += away.x * 12; player.velocity.z += away.z * 12; player.velocity.y = 5;
        showDamageVignette();
      }
      for (const enemy of enemies) {
        if (enemy.position.distanceTo(titanColossus.position) < 85) {
          enemy.userData.knockbackVel.x += (enemy.position.x - titanColossus.position.x) * 0.25;
          enemy.userData.knockbackVel.z += (enemy.position.z - titanColossus.position.z) * 0.25;
        }
      }
    }

    function updateTitanEffects(dt) {
      for (let i = titanEffects.length - 1; i >= 0; i--) {
        const effect = titanEffects[i];
        effect.life -= dt;
        if (effect.type === 'shockwave') {
          const progress = 1 - effect.life / effect.maxLife;
          effect.mesh.scale.setScalar(1 + progress * effect.radius / 2);
          effect.mesh.material.opacity = effect.life / effect.maxLife;
          const d = player.position.distanceTo(effect.mesh.position);
          if (!effect.hit && d < effect.radius * progress && d > 2) {
            effect.hit = true; game.health = Math.max(0, game.health - effect.damage); showDamageVignette(); addShake(0.8);
            document.getElementById('health-fill').style.width = Math.max(0, game.health / game.maxHealth * 100) + '%';
            if (game.health <= 0) endGame(false);
          }
          for (const enemy of enemies) {
            if (!enemy.userData.titanShockwaveHit && enemy.position.distanceTo(effect.mesh.position) < effect.radius * progress) {
              enemy.userData.titanShockwaveHit = true;
              applyDamageToEnemy(enemy, effect.damage);
            }
          }
          if (dragon && !effect.dragonHit && dragon.position.distanceTo(effect.mesh.position) < effect.radius * progress) {
            effect.dragonHit = true;
            applyDamageToDragon(effect.damage);
          }
        } else if (effect.type === 'boulder') {
          effect.velocity.y -= 18 * dt;
          effect.mesh.position.addScaledVector(effect.velocity, dt);
          effect.mesh.rotation.x += dt * 5; effect.mesh.rotation.z += dt * 4;
          if (effect.mesh.position.y <= getHeight(effect.mesh.position.x, effect.mesh.position.z) + 1 || effect.life <= 0) {
            createTitanShockwave(effect.mesh.position, 12, 20);
            createTitanDust(effect.mesh.position, 12);
            scene.remove(effect.mesh); titanEffects.splice(i, 1); continue;
          }
        }
        if (effect.life <= 0) {
          scene.remove(effect.mesh);
          if (effect.mesh.material) effect.mesh.material.dispose();
          titanEffects.splice(i, 1);
        }
      }
    }

    function updateTitan(dt, now) {
      if (!titanColossus || game.mode !== 'adventure') return;
      const ud = titanColossus.userData;
      if (ud.hitFlash > 0) {
        ud.hitFlash -= dt;
        if (ud.hitFlash <= 0) ud.materials.forEach(m => { m.emissive.setHex(m === ud.materials[4] ? 0x1abda8 : m === ud.materials[5] ? 0x39e8cf : 0x000000); });
      }
      const region = titanRegions[titanState.regionIndex];
      titanState.target.set(region[0], 0, region[1]);
      const dx = titanState.target.x - titanColossus.position.x;
      const dz = titanState.target.z - titanColossus.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 12) {
        titanState.regionIndex = (titanState.regionIndex + 1) % titanRegions.length;
        showLootNotification('rare', 'The Titan Colossus changes regions');
      }
      const speed = 3.2;
      if (dist > 1) {
        const nx = dx / dist, nz = dz / dist;
        const moveSpeed = titanState.chargeTimer > 0 ? 12 : speed;
        titanColossus.position.x += nx * moveSpeed * dt;
        titanColossus.position.z += nz * moveSpeed * dt;
        const yaw = Math.atan2(nx, nz);
        titanColossus.rotation.y += Math.atan2(Math.sin(yaw - titanColossus.rotation.y), Math.cos(yaw - titanColossus.rotation.y)) * Math.min(dt * 3, 1);
        titanState.walkPhase += dt * 3.2;
        ud.leftLeg.rotation.x = Math.sin(titanState.walkPhase) * 0.28;
        ud.rightLeg.rotation.x = Math.sin(titanState.walkPhase + Math.PI) * 0.28;
        ud.leftArm.rotation.x = Math.sin(titanState.walkPhase + Math.PI) * 0.18;
        ud.rightArm.rotation.x = Math.sin(titanState.walkPhase) * 0.18;
        titanState.stepTimer -= dt;
        if (titanState.stepTimer <= 0) {
          titanState.stepTimer = titanState.chargeTimer > 0 ? 0.45 : 1.15;
          const foot = titanColossus.position.clone(); foot.y = getHeight(foot.x, foot.z);
          createTitanDust(foot, 22); createTitanFootprint(foot.x, foot.z); damageTitanWorld();
          addShake(titanColossus.position.distanceTo(player.position) < 75 ? 0.35 : 0.08);
          SFX.titanStep();
        }
      }
      titanState.roarTimer -= dt;
      if (titanState.roarTimer <= 0) { titanState.roarTimer = 24 + Math.random() * 20; titanRoarAttack(); }
      titanState.rumbleTimer -= dt;
      if (titanState.rumbleTimer <= 0) { titanState.rumbleTimer = 9 + Math.random() * 8; SFX.titanRumble(); }
      titanState.attackTimer -= dt;
      if (titanState.chargeTimer > 0) {
        titanState.chargeTimer -= dt;
        if (titanState.chargeTimer <= 0) createTitanShockwave(titanColossus.position.clone(), 22, 30);
      }
      const playerDist = titanColossus.position.distanceTo(player.position);
      const dragonDist = dragon ? titanColossus.position.distanceTo(dragon.position) : Infinity;
      if (titanState.attackTimer <= 0) {
        titanState.attackTimer = 7 + Math.random() * 5;
        if (dragon && dragonDist < 120 && Math.random() < 0.45) {
          createTitanShockwave(dragon.position.clone(), 24, 30);
          applyDamageToDragon(45);
          showLootNotification('legendary', 'Titan Colossus clashes with the Ancient Dragon');
        } else if (playerDist < 55) {
          if (Math.random() < 0.5) {
            titanColossus.userData.leftFist.rotation.x = -0.8;
            titanColossus.userData.rightFist.rotation.x = -0.8;
            createTitanShockwave(titanColossus.position.clone(), 28, 36);
          } else {
            throwTitanBoulder(player.position);
          }
        } else if (playerDist < 120) {
          titanState.chargeTimer = 3.2;
          showLootNotification('legendary', 'Titan Colossus charge attack!');
        }
      }
      titanState.eventTimer -= dt;
      if (titanState.eventTimer <= 0 && Math.random() < 0.25) {
        titanState.eventTimer = 35;
        const target = player.position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 80, 0, (Math.random() - 0.5) * 80));
        titanColossus.position.set(target.x, getHeight(target.x, target.z), target.z);
        showLootNotification('legendary', 'The Titan Colossus has appeared nearby!');
        titanRoarAttack();
      }
      const nearby = playerDist < 130;
      const bar = document.getElementById('titan-bar');
      bar.style.display = nearby ? 'block' : 'none';
      if (nearby) document.getElementById('titan-health-fill').style.width = Math.max(0, ud.hp / ud.maxHp * 100) + '%';
      ud.beacon.intensity = 2.5 + Math.sin(now * 2) * 0.7;
      ud.crystals.forEach((crystal, i) => { crystal.material.emissiveIntensity = 1.8 + Math.sin(now * 2.4 + i) * 0.7; });
      ud.cracks.forEach((crack, i) => { crack.material.emissiveIntensity = 2.2 + Math.sin(now * 3.1 + i * 0.8) * 1.1; });
    }

    function applyDamageToTitan(baseDamage) {
      if (!titanColossus || titanColossus.userData.hp <= 0) return;
      const isCrit = Math.random() < getCritChance();
      const finalDamage = Math.max(1, Math.floor(baseDamage * getComboMultiplier() * (isCrit ? getCritMultiplier() : 1) * 0.55));
      titanColossus.userData.hp -= finalDamage;
      titanColossus.userData.hitFlash = 0.16;
      titanColossus.userData.materials.forEach(m => { m.emissive.setHex(0xffffff); m.emissiveIntensity = 1.2; });
      spawnDamageNumber(titanColossus.position.clone().add(new THREE.Vector3(0, 28, 3)), finalDamage, isCrit, '#9fffee');
      spawnHitParticles(titanColossus.position.clone().add(new THREE.Vector3(0, 24, 0)), 0x7af79a, 24);
      addShake(isCrit ? 0.8 : 0.35); addCombo();
      if (titanColossus.userData.hp <= 0) killTitanColossus();
    }

    function killTitanColossus() {
      const pos = titanColossus.position.clone();
      for (let i = 0; i < 7; i++) createTitanDust(pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 15, 3, (Math.random() - 0.5) * 15)), 14);
      createTitanShockwave(pos, 36, 50);
      scene.remove(titanColossus); titanColossus = null;
      game.kills += 25; document.getElementById('kill-count').textContent = game.kills;
      addXP(2500); showLootNotification('legendary', 'Titan Colossus defeated! Ancient Relics acquired');
      document.getElementById('titan-bar').style.display = 'none';
    }

    // ============================================================
    //  PLAYER MODEL
    // ============================================================
    const MODEL_SCALE = 0.55;
    const playerModel = new THREE.Group();
    playerModel.scale.set(MODEL_SCALE, MODEL_SCALE, MODEL_SCALE);
    playerModel.visible = false;
    scene.add(playerModel);

    const pHead = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: '#d4a373' }));
    pHead.position.set(0, 3.5, 0); pHead.castShadow = true; playerModel.add(pHead);
    const faceZ = 0.51;
    const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: '#ffffff' });
    const pLE = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.05), eyeWhiteMat); pLE.position.set(-0.22, 0.15, faceZ); pHead.add(pLE);
    const pRE = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.05), eyeWhiteMat); pRE.position.set(0.22, 0.15, faceZ); pHead.add(pRE);
    const pupilMat = new THREE.MeshStandardMaterial({ color: '#000000' });
    const pLP = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.05), pupilMat); pLP.position.set(-0.22, 0.15, faceZ + 0.03); pHead.add(pLP);
    const pRP = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.05), pupilMat); pRP.position.set(0.22, 0.15, faceZ + 0.03); pHead.add(pRP);
    const pNose = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.1), new THREE.MeshStandardMaterial({ color: '#8b5a2b' }));
    pNose.position.set(0, -0.1, faceZ + 0.02); pHead.add(pNose);
    const pMouth = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.07, 0.05), new THREE.MeshStandardMaterial({ color: '#8b0000' }));
    pMouth.position.set(0, -0.28, faceZ); pHead.add(pMouth);

    const pBody = new THREE.Mesh(new THREE.BoxGeometry(1, 1.5, 0.5), new THREE.MeshStandardMaterial({ color: '#4dc9ff' }));
    pBody.position.set(0, 2.25, 0); pBody.castShadow = true; playerModel.add(pBody);

    const armLength = 1.5;
    const armMat = new THREE.MeshStandardMaterial({ color: '#ff8c42' });
    const leftArmPivot = new THREE.Group(); leftArmPivot.position.set(-0.75, 3.0, 0); playerModel.add(leftArmPivot);
    const pLA = new THREE.Mesh(new THREE.BoxGeometry(0.5, armLength, 0.5), armMat);
    pLA.position.set(0, -armLength / 2, 0); pLA.castShadow = true; leftArmPivot.add(pLA);
    const rightArmPivot = new THREE.Group(); rightArmPivot.position.set(0.75, 3.0, 0); playerModel.add(rightArmPivot);
    const pRA = new THREE.Mesh(new THREE.BoxGeometry(0.5, armLength, 0.5), armMat);
    pRA.position.set(0, -armLength / 2, 0); pRA.castShadow = true; rightArmPivot.add(pRA);

    const legLength = 1.5;
    const legMat = new THREE.MeshStandardMaterial({ color: '#2c3e50' });
    const leftLegPivot = new THREE.Group(); leftLegPivot.position.set(-0.25, 1.5, 0); playerModel.add(leftLegPivot);
    const pLL = new THREE.Mesh(new THREE.BoxGeometry(0.5, legLength, 0.5), legMat);
    pLL.position.set(0, -legLength / 2, 0); pLL.castShadow = true; leftLegPivot.add(pLL);
    const rightLegPivot = new THREE.Group(); rightLegPivot.position.set(0.25, 1.5, 0); playerModel.add(rightLegPivot);
    const pRL = new THREE.Mesh(new THREE.BoxGeometry(0.5, legLength, 0.5), legMat);
    pRL.position.set(0, -legLength / 2, 0); pRL.castShadow = true; rightLegPivot.add(pRL);

    // TP Weapon
    const tpWeapon = new THREE.Group();
    tpWeapon.position.set(0, -armLength + 0.15, 0);
    tpWeapon.rotation.x = Math.PI / 2;
    tpWeapon.visible = false;
    rightArmPivot.add(tpWeapon);

    const tpSword = new THREE.Group();
    {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.2, 0.1),
        new THREE.MeshStandardMaterial({ color: 0xc0c0c0, metalness: 0.9, roughness: 0.2 }));
      blade.position.y = 0.9; blade.castShadow = true; tpSword.add(blade);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.2, 4),
        new THREE.MeshStandardMaterial({ color: 0xd0d0d0, metalness: 0.9 }));
      tip.position.y = 1.5; tpSword.add(tip);
      const guard = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.08, 0.15),
        new THREE.MeshStandardMaterial({ color: 0xffcc00, metalness: 0.7 }));
      guard.position.y = 0.25; tpSword.add(guard);
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.3, 0.12),
        new THREE.MeshStandardMaterial({ color: 0x8b5a2b }));
      handle.position.y = 0.05; tpSword.add(handle);
    }
    tpSword.visible = false; tpWeapon.add(tpSword);

    const tpBow = new THREE.Group();
    {
      const bowGeo = new THREE.TorusGeometry(0.55, 0.05, 8, 24, Math.PI);
      const bow = new THREE.Mesh(bowGeo, new THREE.MeshStandardMaterial({ color: 0x8b5a2b }));
      bow.rotation.z = -Math.PI / 2; bow.position.y = 0.6; bow.castShadow = true; tpBow.add(bow);
      const arrow = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.0, 0.04),
        new THREE.MeshStandardMaterial({ color: 0x5c3a1e }));
      arrow.position.set(0, 0.6, -0.05); tpBow.add(arrow);
      const head = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.16, 4),
        new THREE.MeshStandardMaterial({ color: 0xc0c0c0, metalness: 0.9 }));
      head.position.set(0, 1.15, -0.05); tpBow.add(head);
    }
    tpBow.visible = false; tpWeapon.add(tpBow);

    const tpWand = new THREE.Group();
    {
      const staff = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.0, 0.08),
        new THREE.MeshStandardMaterial({ color: 0x5c3a1e }));
      staff.position.y = 0.5; tpWand.add(staff);
      const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.2),
        new THREE.MeshStandardMaterial({ color: 0x9b59b6, emissive: 0x9b59b6, emissiveIntensity: 0.8 }));
      crystal.position.y = 1.1; tpWand.add(crystal);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({
        color: 0x9b59b6, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending
      }));
      glow.scale.set(1.0, 1.0, 1); glow.position.y = 1.1; tpWand.add(glow);
    }
    tpWand.visible = false; tpWeapon.add(tpWand);

    // FP Weapon
    const fpWeapon = new THREE.Group();
    fpWeapon.visible = false;
    fpWeapon.scale.set(0.35, 0.35, 0.35);
    camera.add(fpWeapon);
    const FP_BASE_POS = new THREE.Vector3(0.38, -0.32, -0.65);
    const FP_BASE_ROT = new THREE.Euler(0, -0.5, 0.35);

    const fpSword = new THREE.Group();
    {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.2, 0.1),
        new THREE.MeshStandardMaterial({ color: 0xc0c0c0, metalness: 0.9, roughness: 0.2 }));
      blade.position.y = 0.5; fpSword.add(blade);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.2, 4),
        new THREE.MeshStandardMaterial({ color: 0xd0d0d0, metalness: 0.9 }));
      tip.position.y = 1.2; fpSword.add(tip);
      const guard = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.08, 0.15),
        new THREE.MeshStandardMaterial({ color: 0xffcc00, metalness: 0.7 }));
      guard.position.y = -0.15; fpSword.add(guard);
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.3, 0.12),
        new THREE.MeshStandardMaterial({ color: 0x8b5a2b }));
      handle.position.y = -0.35; fpSword.add(handle);
    }
    fpSword.visible = false; fpWeapon.add(fpSword);

    const fpBow = new THREE.Group();
    {
      const bowGeo = new THREE.TorusGeometry(0.55, 0.05, 8, 24, Math.PI);
      const bow = new THREE.Mesh(bowGeo, new THREE.MeshStandardMaterial({ color: 0x8b5a2b }));
      bow.rotation.z = -Math.PI / 2; fpBow.add(bow);
      const arrow = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.0, 0.04),
        new THREE.MeshStandardMaterial({ color: 0x5c3a1e }));
      arrow.position.set(0, 0, -0.05); fpBow.add(arrow);
    }
    fpBow.visible = false; fpWeapon.add(fpBow);

    const fpWand = new THREE.Group();
    {
      const staff = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.0, 0.08),
        new THREE.MeshStandardMaterial({ color: 0x5c3a1e }));
      staff.position.y = 0.2; fpWand.add(staff);
      const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.2),
        new THREE.MeshStandardMaterial({ color: 0x9b59b6, emissive: 0x9b59b6, emissiveIntensity: 0.8 }));
      crystal.position.y = 0.85; fpWand.add(crystal);
    }
    fpWand.visible = false; fpWeapon.add(fpWand);
    fpWeapon.position.copy(FP_BASE_POS);
    fpWeapon.rotation.copy(FP_BASE_ROT);

    // Shield visual (sphere around player)
    const shieldMesh = new THREE.Mesh(
      new THREE.SphereGeometry(1.5, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0x4dc9ff, transparent: true, opacity: 0.25, side: THREE.DoubleSide })
    );
    shieldMesh.visible = false;
    scene.add(shieldMesh);

    // ============================================================
    //  PLAYER STATE
    // ============================================================
    function createCompanionMesh(type) {
      const companion = new THREE.Group();
      const bodyMat = new THREE.MeshStandardMaterial({ color: type === 'Golem' ? 0x71808b : type === 'Dragon Hatchling' ? 0xb53b46 : type === 'Wolf' ? 0x4a4a58 : 0xf2c6ff, emissive: type === 'Fairy' ? 0x9b59b6 : 0x000000, emissiveIntensity: type === 'Fairy' ? 1.5 : 0, roughness: 0.7 });
      const body = new THREE.Mesh(type === 'Golem' ? new THREE.DodecahedronGeometry(0.75, 1) : new THREE.BoxGeometry(0.9, 0.8, 1.3), bodyMat);
      body.position.y = 0.8; body.castShadow = true; companion.add(body);
      const head = new THREE.Mesh(type === 'Fairy' ? new THREE.SphereGeometry(0.38, 10, 10) : new THREE.BoxGeometry(0.7, 0.7, 0.7), bodyMat);
      head.position.y = 1.5; head.castShadow = true; companion.add(head);
      if (type === 'Dragon Hatchling') {
        const wingMat = new THREE.MeshStandardMaterial({ color: 0x6b1e2c, side: THREE.DoubleSide });
        for (const side of [-1, 1]) {
          const wing = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.12, 0.7), wingMat);
          wing.position.set(side * 0.65, 1.1, -0.1); wing.rotation.z = side * 0.35; companion.add(wing);
        }
      } else if (type === 'Fairy') {
        const wingMat = new THREE.SpriteMaterial({ color: 0x9fffee, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending });
        for (const side of [-1, 1]) { const wing = new THREE.Sprite(wingMat); wing.scale.set(0.8, 1.1, 1); wing.position.set(side * 0.45, 1.2, 0); companion.add(wing); }
      }
      companion.userData.type = type;
      companion.position.copy(player.position).add(new THREE.Vector3(2, -player.height + 0.2, 2));
      scene.add(companion);
      return companion;
    }
    function recruitNextCompanion() {
      if (!game.active || game.mode !== 'adventure') return;
      if (companionState.mesh) scene.remove(companionState.mesh);
      const index = companionState.type ? (companionState.types.indexOf(companionState.type) + 1) % companionState.types.length : 0;
      companionState.type = companionState.types[index];
      companionState.mesh = createCompanionMesh(companionState.type);
      companionState.attackTimer = 0;
      showPickupToast(`${companionState.type} recruited · Press P to change`);
    }
    function updateCompanion(dt, now) {
      if (!companionState.mesh || game.mode !== 'adventure') return;
      const companion = companionState.mesh;
      const behind = new THREE.Vector3(-Math.sin(player.yaw) * 2.5, -player.height + 0.2, -Math.cos(player.yaw) * 2.5);
      const side = new THREE.Vector3(Math.cos(player.yaw) * 1.4, 0, -Math.sin(player.yaw) * 1.4);
      const target = player.position.clone().add(behind).add(side);
      if (companion.position.distanceTo(player.position) > 18) companion.position.copy(target);
      else companion.position.lerp(target, Math.min(dt * 4, 1));
      companion.position.y = getHeight(companion.position.x, companion.position.z) + Math.sin(now * 4) * 0.08;
      companion.rotation.y = Math.atan2(player.position.x - companion.position.x, player.position.z - companion.position.z);
      companionState.attackTimer -= dt;
      if (companionState.attackTimer <= 0) {
        companionState.attackTimer = 1.8;
        let nearest = null, nearestDistance = 18;
        for (const enemy of enemies) {
          const distance = companion.position.distanceTo(enemy.position);
          if (distance < nearestDistance) { nearest = enemy; nearestDistance = distance; }
        }
        if (nearest) applyDamageToEnemy(nearest, 12);
        else if (titanColossus && companion.position.distanceTo(titanColossus.position) < 28) applyDamageToTitan(10);
      }
    }
    function toggleMount() {
      if (!game.active || game.mode !== 'adventure') return;
      if (mountState.active) {
        mountState.active = false;
        if (mountState.mesh) mountState.mesh.visible = false;
        showPickupToast('Dismounted');
        return;
      }
      const index = mountState.type ? (mountState.types.indexOf(mountState.type) + 1) % mountState.types.length : 0;
      mountState.type = mountState.types[index];
      const color = mountState.type === 'Dragon' ? 0xb53b46 : mountState.type === 'Giant Bird' ? 0xd7a84b : mountState.type === 'Wolf' ? 0x4a4a58 : 0x8b5a2b;
      const mount = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.1, 2.2), new THREE.MeshStandardMaterial({ color, roughness: 0.8 }));
      body.position.y = 0.9; body.castShadow = true; mount.add(body);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.9), new THREE.MeshStandardMaterial({ color, roughness: 0.8 }));
      head.position.set(0, 1.5, 1.0); head.castShadow = true; mount.add(head);
      if (mountState.type === 'Dragon' || mountState.type === 'Giant Bird') {
        for (const side of [-1, 1]) { const wing = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.15, 1.2), new THREE.MeshStandardMaterial({ color: 0x6b1e2c, side: THREE.DoubleSide })); wing.position.set(side * 1.1, 1.3, 0); wing.rotation.z = side * 0.2; mount.add(wing); }
      }
      mountState.mesh = mount;
      mountState.active = true;
      scene.add(mount);
      showPickupToast(`${mountState.type} mount equipped · Press M to dismount`);
    }
    function updateMount() {
      if (!mountState.mesh || !mountState.active) return;
      mountState.mesh.visible = true;
      mountState.mesh.position.set(player.position.x, player.groundY, player.position.z);
      mountState.mesh.rotation.y = player.yaw;
    }

    const player = {
      position: new THREE.Vector3(0, 1.6, 0),
      velocity: new THREE.Vector3(0, 0, 0),
      yaw: 0, pitch: 0, onGround: true,
      walkSpeed: 8, sprintSpeed: 15, jumpSpeed: 9,
      radius: 0.4, height: 1.6,
      walkCycle: 0, moveIntensity: 0,
      isMoving: false, isJumping: false, isSprinting: false,
      groundY: 0,
      jumpsUsed: 0
    };
    const cameraController = {
      yaw: 0,
      pitch: -0.7,
      distance: 7,
      minDistance: 3.5,
      maxDistance: 10,
      heightOffset: 2.6,
      minPitch: -1.15,
      maxPitch: 0.85,
      smoothing: 0.12,
      collisionRadius: 0.8,
      lookTarget: new THREE.Vector3(),
      desiredPos: new THREE.Vector3(),
      currentPos: new THREE.Vector3()
    };
    player.groundY = getHeight(START_POSITION.x, START_POSITION.z);
    player.position.set(START_POSITION.x, player.groundY + player.height, START_POSITION.z);
    cameraController.yaw = 0;
    cameraController.pitch = -0.7;
    cameraController.currentPos.copy(player.position);
    camera.position.copy(player.position);

    // ============================================================
    //  INPUT
    // ============================================================
    const moveState = { forward: false, backward: false, left: false, right: false, jump: false, sprint: false, attack: false };

    function toggleCameraMode() {
      if (!game.active) return;
      if (game.cameraMode === 'first') {
        game.cameraMode = 'third'; playerModel.visible = true;
        document.getElementById('mode-label').textContent = 'THIRD PERSON';
        document.getElementById('crosshair').style.opacity = '0.3';
      } else {
        game.cameraMode = 'first'; playerModel.visible = false;
        document.getElementById('mode-label').textContent = 'FIRST PERSON';
        document.getElementById('crosshair').style.opacity = '1';
      }
      updateWeaponHUD();
    }
    function fireFireball() {
      if (!isSkillUnlocked('fireball')) return;
      if (abilities.fireball.timer > 0) return;
      abilities.fireball.timer = abilities.fireball.cooldown;
      const forward = getAimDirection();
      const origin = player.position.clone();
      origin.y -= 0.2;
      origin.x += forward.x * 0.8;
      origin.z += forward.z * 0.8;
      spawnSpellEffect(origin, forward, 0xff4400, 0xffaa00);
      addShake(0.3);
      SFX.fireball();
    }
    function activateShield() {
      if (!isSkillUnlocked('shield')) return;
      if (abilities.shield.timer > 0) return;
      abilities.shield.active = true;
      abilities.shield.activeTimer = 3;
      abilities.shield.timer = abilities.shield.cooldown;
      SFX.shield();
    }
    function activateTimeSlow() {
      if (!isSkillUnlocked('timeslow')) return;
      if (abilities.timeslow.timer > 0) return;
      abilities.timeslow.timer = abilities.timeslow.cooldown;
      game.timeSlowTimer = 5;
      SFX.timeSlow();
    }
    function activateDash() {
      if (!isSkillUnlocked('dash')) return;
      if (abilities.dash.timer > 0) return;
      abilities.dash.timer = abilities.dash.cooldown;
      abilities.dash.active = true;
      abilities.dash.activeTimer = 0.25;
      SFX.dash();
    }

    document.addEventListener('keydown', (e) => {
      if (!game.active) {
        if (e.code === 'KeyT') { toggleSkillTree(); e.preventDefault(); }
        return;
      }
      switch (e.code) {
        case 'KeyW': moveState.forward = true; break;
        case 'KeyS': moveState.backward = true; break;
        case 'KeyA': moveState.left = true; break;
        case 'KeyD': moveState.right = true; break;
        case 'Space': moveState.jump = true; e.preventDefault(); break;
        case 'ShiftLeft': case 'ShiftRight':
          // Dash check: if moving forward and dash unlocked
          if (moveState.forward && isSkillUnlocked('dash') && abilities.dash.timer <= 0) {
            activateDash();
          } else {
            moveState.sprint = true;
          }
          break;
        case 'KeyC': e.preventDefault(); toggleCameraMode(); break;
        case 'KeyQ': if (currentWeapon.type) dropWeapon(); break;
        case 'KeyE': tryInteractChest(); break;
        case 'KeyG': fireAnchor(); break;
        case 'KeyR': fireFireball(); break;
        case 'KeyF': activateShield(); break;
        case 'KeyV': activateTimeSlow(); break;
        case 'KeyP': recruitNextCompanion(); break;
        case 'KeyM': toggleMount(); break;
        case 'KeyT': toggleSkillTree(); e.preventDefault(); break;
      }
    });
    document.addEventListener('keyup', (e) => {
      switch (e.code) {
        case 'KeyW': moveState.forward = false; break;
        case 'KeyS': moveState.backward = false; break;
        case 'KeyA': moveState.left = false; break;
        case 'KeyD': moveState.right = false; break;
        case 'Space': moveState.jump = false; e.preventDefault(); break;
        case 'ShiftLeft': case 'ShiftRight': moveState.sprint = false; break;
      }
    });
    const canvas = renderer.domElement;
    canvas.addEventListener('click', () => {
      if (game.active) {
        if (!audioCtx) initAudio();
        canvas.requestPointerLock();
      }
    });
    document.addEventListener('mousedown', (e) => {
      if (e.button === 0 && game.active && document.pointerLockElement === canvas) moveState.attack = true;
      if (e.button === 2 && game.active && document.pointerLockElement === canvas) fireAnchor();
    });
    document.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('mouseup', (e) => { if (e.button === 0) moveState.attack = false; });
    document.addEventListener('mousemove', (e) => {
      if (document.pointerLockElement !== canvas || !game.active) return;

      if (game.cameraMode === 'first') {
        player.yaw -= e.movementX * 0.0022;
        cameraController.yaw = player.yaw;
        player.pitch -= e.movementY * 0.0022;
        player.pitch = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, player.pitch));
      } else {
        cameraController.yaw -= e.movementX * 0.0022;
        cameraController.pitch -= e.movementY * 0.0022;
        cameraController.pitch = Math.max(cameraController.minPitch, Math.min(cameraController.maxPitch, cameraController.pitch));
      }
    });

    // Collision grid
    const CELL_SIZE = 8;
    const treeGrid = new Map();
    for (let t of trees) {
      const key = `${Math.floor(t.x / CELL_SIZE)},${Math.floor(t.z / CELL_SIZE)}`;
      if (!treeGrid.has(key)) treeGrid.set(key, []);
      treeGrid.get(key).push(t);
    }
    function checkTreeCollision(newX, newZ) {
      const cx = Math.floor(newX / CELL_SIZE), cz = Math.floor(newZ / CELL_SIZE);
      for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
        const ct = treeGrid.get(`${cx + dx},${cz + dz}`);
        if (!ct) continue;
        for (let t of ct) {
          if (!t.group.visible) continue;
          const ddx = newX - t.x, ddz = newZ - t.z;
          if (ddx * ddx + ddz * ddz < (t.radius + player.radius) ** 2) return true;
        }
      }
      return false;
    }
    function checkWorldCollision(newX, newZ) {
      if (checkTreeCollision(newX, newZ)) return true;
      const playerBottom = player.position.y - player.height;
      const playerTop = player.position.y + 0.15;
      for (const landmark of worldLandmarks) {
        if (!landmark.visible || landmark.userData.titanDamaged || landmark.userData.poiType === 'tower') continue;
        const bounds = new THREE.Box3().setFromObject(landmark);
        if (bounds.max.y < playerBottom || bounds.min.y > playerTop) continue;
        if (newX > bounds.min.x - player.radius && newX < bounds.max.x + player.radius &&
          newZ > bounds.min.z - player.radius && newZ < bounds.max.z + player.radius) return true;
      }
      return false;
    }

    // ============================================================
    //  HUD
    // ============================================================
    function updateWeaponHUD() {
      const hud = document.getElementById('weapon-hud');
      const isFirstPerson = game.cameraMode === 'first';
      if (!currentWeapon.type) {
        hud.classList.add('empty');
        document.getElementById('weapon-name').textContent = '— No Weapon —';
        document.getElementById('weapon-desc').textContent = 'Walk over a weapon to pick it up';
        document.getElementById('weapon-stats').textContent = '';
        fpWeapon.visible = false; tpWeapon.visible = false;
        return;
      }
      const def = WEAPON_TYPES[currentWeapon.type];
      hud.classList.remove('empty');
      document.getElementById('weapon-name').textContent = def.name;
      document.getElementById('weapon-desc').textContent = def.desc;
      const dmgMul = getWeaponDamageMultiplier();
      const finalDmg = Math.floor(def.damage * dmgMul);
      document.getElementById('weapon-stats').textContent = `⚔ ${finalDmg} dmg • 🎯 ${def.range}m • ⏱ ${(def.cooldown * getCooldownMultiplier()).toFixed(1)}s`;
      fpWeapon.visible = isFirstPerson;
      fpSword.visible = isFirstPerson && currentWeapon.type === 'sword';
      fpBow.visible = isFirstPerson && currentWeapon.type === 'bow';
      fpWand.visible = isFirstPerson && currentWeapon.type === 'wand';
      tpWeapon.visible = !isFirstPerson;
      tpSword.visible = !isFirstPerson && currentWeapon.type === 'sword';
      tpBow.visible = !isFirstPerson && currentWeapon.type === 'bow';
      tpWand.visible = !isFirstPerson && currentWeapon.type === 'wand';
    }
    function updateAbilityBar() {
      const map = {
        dash: 'ability-dash', fireball: 'ability-fireball',
        doublejump: 'ability-doublejump', shield: 'ability-shield',
        fly: 'ability-fly', timeslow: 'ability-timeslow'
      };
      Object.keys(map).forEach(skill => {
        const el = document.getElementById(map[skill]);
        if (!el) return;
        if (isSkillUnlocked(skill)) el.classList.add('unlocked');
        else el.classList.remove('unlocked');
      });
    }
    function updateAbilityCooldowns(dt) {
      // Dash
      if (abilities.dash.timer > 0) {
        abilities.dash.timer -= dt;
        document.getElementById('cd-dash').textContent = ' ' + abilities.dash.timer.toFixed(1);
        document.getElementById('ability-dash').classList.add('cooldown');
      } else {
        document.getElementById('cd-dash').textContent = '';
        document.getElementById('ability-dash').classList.remove('cooldown');
      }
      if (abilities.dash.activeTimer > 0) {
        abilities.dash.activeTimer -= dt;
        if (abilities.dash.activeTimer <= 0) abilities.dash.active = false;
      }
      // Fireball
      if (abilities.fireball.timer > 0) {
        abilities.fireball.timer -= dt;
        document.getElementById('cd-fireball').textContent = ' ' + abilities.fireball.timer.toFixed(1);
        document.getElementById('ability-fireball').classList.add('cooldown');
      } else {
        document.getElementById('cd-fireball').textContent = '';
        document.getElementById('ability-fireball').classList.remove('cooldown');
      }
      // Shield
      if (abilities.shield.timer > 0) {
        abilities.shield.timer -= dt;
        document.getElementById('cd-shield').textContent = ' ' + abilities.shield.timer.toFixed(1);
        document.getElementById('ability-shield').classList.add('cooldown');
      } else {
        document.getElementById('cd-shield').textContent = '';
        document.getElementById('ability-shield').classList.remove('cooldown');
      }
      if (abilities.shield.activeTimer > 0) {
        abilities.shield.activeTimer -= dt;
        if (abilities.shield.activeTimer <= 0) {
          abilities.shield.active = false;
          shieldMesh.visible = false;
        } else {
          shieldMesh.visible = true;
          shieldMesh.position.copy(player.position);
        }
      }
      // Time slow
      if (abilities.timeslow.timer > 0) {
        abilities.timeslow.timer -= dt;
        document.getElementById('cd-timeslow').textContent = ' ' + abilities.timeslow.timer.toFixed(1);
        document.getElementById('ability-timeslow').classList.add('cooldown');
      } else {
        document.getElementById('cd-timeslow').textContent = '';
        document.getElementById('ability-timeslow').classList.remove('cooldown');
      }
      if (game.timeSlowTimer > 0) {
        game.timeSlowTimer -= dt;
        game.timeScale = 0.3;
      } else {
        game.timeScale = 1;
      }
    }
    function showPickupToast(text) {
      const toast = document.getElementById('pickup-toast');
      toast.textContent = text;
      toast.style.display = 'block';
      clearTimeout(toast._timeout);
      toast._timeout = setTimeout(() => { toast.style.display = 'none'; }, 1500);
    }
    function showLootNotification(rarity, itemName) {
      const el = document.getElementById('loot-notification');
      el.className = 'loot-' + rarity;
      el.textContent = `${RARITY[rarity].name} ${itemName}`;
      el.style.display = 'block';
      if (rarity === 'legendary') SFX.legendary();
      setTimeout(() => { el.style.display = 'none'; }, 2500);
    }

    // ============================================================
    //  SKYFALL TOWER DUNGEON
    // ============================================================
    const towerThemes = [
      { min: 1, max: 20, name: 'ANCIENT RUINS', enemies: ['Skeleton Warriors', 'Shadow Assassins'], color: '#c7a879' },
      { min: 21, max: 40, name: 'CRYSTAL CAVERNS', enemies: ['Crystal Golems', 'Void Creatures'], color: '#7fe7ff' },
      { min: 41, max: 60, name: 'FROZEN CITADEL', enemies: ['Frost Giants', 'Skeleton Warriors'], color: '#b7e8ff' },
      { min: 61, max: 80, name: 'INFERNAL FORTRESS', enemies: ['Demon Knights', 'Fire Drakes'], color: '#ff7650' },
      { min: 81, max: 99, name: 'VOID REALM', enemies: ['Void Creatures', 'Shadow Assassins'], color: '#c98cff' },
      { min: 100, max: 100, name: "TITAN KING'S THRONE", enemies: ['Titan King', 'Void Creatures'], color: '#ffe08a' }
    ];
    const towerBosses = { 20: 'SKELETON KING', 40: 'CRYSTAL TITAN', 60: 'ICE COLOSSUS', 80: 'INFERNAL DRAGON', 100: 'TITAN KING' };
    function getTowerFloorData(floor) {
      const theme = towerThemes.find(t => floor >= t.min && floor <= t.max) || towerThemes[0];
      const isBoss = !!towerBosses[floor];
      const isSafe = floor % 10 === 0;
      const enemyCount = isBoss ? 1 + Math.floor(floor / 25) : 2 + Math.floor(floor / 12) + Math.floor(Math.random() * 3);
      const enemyNames = isBoss ? [towerBosses[floor]] : [...theme.enemies].sort(() => Math.random() - 0.5);
      const secret = floor > 5 && (floor % 7 === 0 || Math.random() < 0.08);
      return {
        theme, isBoss, isSafe, secret, enemyCount,
        enemyNames, threat: Math.min(10, Math.ceil(floor / 10)),
        reward: floor === 100 ? 'Titan King Relic + exclusive title' : floor % 10 === 0 ? 'Legendary equipment cache' : floor > 80 ? 'Ancient artifact' : floor > 50 ? 'Epic weapon' : 'Rare cache'
      };
    }
    function saveTowerCheckpoint() {
      localStorage.setItem(towerDungeon.saveKey, JSON.stringify({ checkpoint: towerDungeon.checkpoint, cleared: towerDungeon.cleared }));
    }
    function loadTowerCheckpoint() {
      try {
        const saved = JSON.parse(localStorage.getItem(towerDungeon.saveKey) || 'null');
        if (saved) {
          towerDungeon.checkpoint = Math.max(1, Math.min(100, saved.checkpoint || 1));
          towerDungeon.cleared = Math.max(0, Math.min(100, saved.cleared || 0));
        }
      } catch (e) { towerDungeon.checkpoint = 1; towerDungeon.cleared = 0; }
    }
    function renderTowerDungeon(message) {
      const floor = towerDungeon.floor;
      const data = getTowerFloorData(floor);
      document.getElementById('tower-floor-number').textContent = `FLOOR ${floor}`;
      document.getElementById('tower-theme').textContent = data.theme.name;
      document.getElementById('tower-theme').style.color = data.theme.color;
      document.getElementById('tower-boss').textContent = data.isBoss ? `⚔️ BOSS FLOOR: ${towerBosses[floor]} ⚔️` : '';
      document.getElementById('tower-threat').textContent = `${data.threat} / 10`;
      document.getElementById('tower-enemies').textContent = `${data.enemyCount}× ${data.enemyNames.join(' · ')}`;
      document.getElementById('tower-reward').textContent = data.reward;
      document.getElementById('tower-zone').textContent = data.isSafe ? 'Safe zone + checkpoint' : data.secret ? 'Secret passage detected' : 'Combat floor';
      document.getElementById('tower-floor-log').textContent = message || (data.isBoss ? 'The guardian waits beyond the sealed gate.' : data.secret ? 'A hidden passage flickers behind the masonry.' : 'The tower groans as new enemies gather above.');
      document.getElementById('tower-progress-fill').style.width = `${floor}%`;
      document.getElementById('tower-checkpoint').textContent = `Checkpoint: Floor ${towerDungeon.checkpoint} · Cleared: ${towerDungeon.cleared} / 100`;
      document.getElementById('tower-rest-btn').style.display = data.isSafe || towerDungeon.checkpoint === floor - 1 ? 'inline-block' : 'none';
      document.getElementById('tower-fight-btn').textContent = floor === 100 ? '⚔️ CHALLENGE TITAN KING' : data.isSafe ? '⚔️ CLEAR CHECKPOINT FLOOR' : '⚔️ ENTER FLOOR';
    }
    function enterTowerDungeon() {
      if (!game.active || towerDungeon.active) return;
      loadTowerCheckpoint();
      towerDungeon.active = true;
      towerDungeon.floor = towerDungeon.checkpoint;
      game.active = false;
      if (document.pointerLockElement === canvas) document.exitPointerLock();
      document.getElementById('tower-dungeon').style.display = 'flex';
      document.getElementById('interact-prompt').style.display = 'none';
      addWorldAchievement('Skyfall Tower Entrance');
      renderTowerDungeon();
    }
    function leaveTowerDungeon() {
      towerDungeon.active = false;
      saveTowerCheckpoint();
      document.getElementById('tower-dungeon').style.display = 'none';
      game.active = true;
      setTimeout(() => { if (game.active && document.pointerLockElement !== canvas) canvas.requestPointerLock(); }, 100);
    }
    function fightTowerFloor() {
      if (!towerDungeon.active) return;
      const floor = towerDungeon.floor;
      const data = getTowerFloorData(floor);
      const rewardXP = 35 + floor * 12 + (data.isBoss ? floor * 20 : 0);
      addXP(rewardXP);
      if (floor % 10 === 0) {
        towerDungeon.checkpoint = floor;
        towerDungeon.cleared = Math.max(towerDungeon.cleared, floor);
        saveTowerCheckpoint();
      } else {
        towerDungeon.cleared = Math.max(towerDungeon.cleared, floor);
      }
      if (data.secret) {
        towerDungeon.secretFound = true;
        showLootNotification('epic', `Secret floor discovered on ${floor}`);
      }
      if (data.isBoss) {
        const rarity = floor >= 80 ? 'legendary' : 'epic';
        createWeaponPickup(['thunderHammer', 'dragonSlayer', 'voidBow', 'frostAxe'][floor % 4], player.position.x + 2, player.position.z + 2, rarity);
        showLootNotification('legendary', `${towerBosses[floor]} defeated · ${rarity} equipment dropped`);
      }
      if (floor === 100) {
        towerDungeon.cleared = 100;
        towerDungeon.checkpoint = 100;
        saveTowerCheckpoint();
        addWorldAchievement('World Ascender');
        document.getElementById('tower-floor-log').textContent = 'The Titan King falls. You claim the Skyfall Crown and the title WORLD ASCENDER.';
        document.getElementById('tower-fight-btn').textContent = '🏆 TOWER CONQUERED';
        document.getElementById('tower-fight-btn').disabled = true;
        showLootNotification('legendary', 'World Ascender title + Titan King Relic');
        return;
      }
      towerDungeon.floor = floor + 1;
      renderTowerDungeon(`${data.isBoss ? towerBosses[floor] : 'Floor cleared'} · +${rewardXP} XP · The ascent continues.`);
    }
    function restAtTowerCheckpoint() {
      game.health = game.maxHealth;
      document.getElementById('health-fill').style.width = '100%';
      renderTowerDungeon(`You rest at checkpoint ${towerDungeon.checkpoint}. Health and resolve restored.`);
    }
    document.getElementById('tower-fight-btn').addEventListener('click', fightTowerFloor);
    document.getElementById('tower-rest-btn').addEventListener('click', restAtTowerCheckpoint);
    document.getElementById('tower-leave-btn').addEventListener('click', leaveTowerDungeon);

    // ============================================================
    //  CHEST INTERACTION
    // ============================================================
    function tryInteractChest() {
      if (!game.active) return;
      const arena = worldLandmarks.find(landmark => landmark.userData && landmark.userData.poiType === 'arena');
      if (arena && Math.hypot(player.position.x - arena.position.x, player.position.z - arena.position.z) < 26) {
        enterArena();
        return;
      }
      const tower = worldLandmarks.find(landmark => landmark.userData && landmark.userData.poiType === 'tower');
      if (tower && Math.hypot(player.position.x - tower.position.x, player.position.z - tower.position.z) < 28) {
        enterTowerDungeon();
        return;
      }
      for (let i = chests.length - 1; i >= 0; i--) {
        const c = chests[i];
        const dx = player.position.x - c.position.x;
        const dz = player.position.z - c.position.z;
        if (dx * dx + dz * dz < 3 * 3) {
          if (!c.userData.opened) openChest(c);
          return;
        }
      }
    }
    function openChest(chest) {
      chest.userData.opened = true;
      SFX.chestOpen();
      const lid = chest.userData.lid;
      let angle = 0;
      const lidAnim = setInterval(() => {
        angle += 0.15;
        lid.rotation.x = -angle;
        lid.position.z = -angle * 0.4;
        if (angle >= 1.5) clearInterval(lidAnim);
      }, 16);
      chest.userData.glowSprite.visible = false;
      const rarity = rollRarity();
      const bonusCubes = RARITY[rarity].cubeBonus;
      game.score += bonusCubes;
      document.getElementById('cube-count').textContent = game.score;
      addXP(25); // Chest XP
      const colors = { common: 0xffffff, rare: 0x4a9fff, epic: 0xa050dc, legendary: 0xffb400 };
      spawnHitParticles(chest.position.clone().add(new THREE.Vector3(0, 1, 0)), colors[rarity], rarity === 'legendary' ? 30 : 15);
      const wTypes = ['sword', 'bow', 'wand'];
      const wx = chest.position.x + (Math.random() - 0.5) * 3;
      const wz = chest.position.z + (Math.random() - 0.5) * 3;
      createWeaponPickup(wTypes[Math.floor(Math.random() * 3)], wx, wz, rarity);
      showLootNotification(rarity, `Chest! +${bonusCubes} cubes`);
      addShake(0.3);
    }

    // ============================================================
    //  WEAPON PICKUPS
    // ============================================================
    function pickupWeapon(pickup) {
      currentWeapon.type = pickup.userData.typeKey;
      scene.remove(pickup);
      const idx = weaponPickups.indexOf(pickup);
      if (idx >= 0) weaponPickups.splice(idx, 1);
      showPickupToast(`Picked up ${WEAPON_TYPES[currentWeapon.type].name}`);
      if (pickup.userData.rarity && pickup.userData.rarity !== 'common') {
        showLootNotification(pickup.userData.rarity, WEAPON_TYPES[currentWeapon.type].name);
      }
      updateWeaponHUD();
      SFX.pickup();
    }
    function dropWeapon() {
      if (!currentWeapon.type) return;
      createWeaponPickup(currentWeapon.type, player.position.x + Math.sin(player.yaw) * 1.5, player.position.z + Math.cos(player.yaw) * 1.5, 'common');
      currentWeapon.type = null;
      updateWeaponHUD();
    }
    function updateWeaponPickups(dt, now) {
      for (let i = weaponPickups.length - 1; i >= 0; i--) {
        const pickup = weaponPickups[i];
        pickup.rotation.y += dt * 1.5;
        pickup.position.y = pickup.userData.baseY + 0.5 + Math.sin(now * 2 + i) * 0.2;
        const dx = player.position.x - pickup.position.x;
        const dz = player.position.z - pickup.position.z;
        if (dx * dx + dz * dz < 2.5 * 2.5) pickupWeapon(pickup);
      }
    }

    // ============================================================
    //  ATTACK
    // ============================================================
    function applyDamageToEnemy(enemy, baseDamage) {
      const now = performance.now() / 1000;
      const comboMult = getComboMultiplier();
      const critChance = getCritChance();
      const isCrit = Math.random() < critChance;
      const comboDamage = Math.floor(baseDamage * comboMult);
      let finalDamage = isCrit ? Math.floor(comboDamage * getCritMultiplier()) : comboDamage;
      if (enemy.userData.monsterType === 'crystalGolem') {
        finalDamage = Math.max(1, Math.floor(finalDamage * 0.55));
        if (now - game.lastDamageTime > game.invincibleTime && !abilities.shield.active) {
          game.health = Math.max(0, game.health - 4);
          game.lastDamageTime = now;
          document.getElementById('health-fill').style.width = Math.max(0, (game.health / game.maxHealth) * 100) + '%';
          showDamageVignette();
          if (game.health <= 0) endGame(false);
        }
      }
      enemy.userData.hp -= finalDamage;
      enemy.userData.hitFlash = 0.15;
      enemy.material.emissive.setHex(0xffffff);

      const dx = player.position.x - enemy.position.x;
      const dz = player.position.z - enemy.position.z;
      const d = Math.sqrt(dx * dx + dz * dz);
      const kb = isCrit ? 4 : 2.5;
      const kx = (enemy.position.x - player.position.x) / (d + 0.01);
      const kz = (enemy.position.z - player.position.z) / (d + 0.01);
      enemy.userData.knockbackVel.x = kx * kb;
      enemy.userData.knockbackVel.z = kz * kb;
      enemy.userData.knockbackVel.y = isCrit ? 3 : 2;

      spawnDamageNumber(enemy.position.clone().add(new THREE.Vector3(0, 0.6, 0)), finalDamage, isCrit);
      spawnHitParticles(enemy.position.clone(), 0xffaa00, isCrit ? 15 : 8);
      addShake(isCrit ? 0.5 : 0.3);
      if (isCrit) SFX.hitHeavy(); else SFX.hitLight();
      addCombo();

      if (enemy.userData.hp <= 0) {
        scene.remove(enemy);
        const idx = enemies.indexOf(enemy);
        if (idx >= 0) enemies.splice(idx, 1);
        game.kills++;
        document.getElementById('kill-count').textContent = game.kills;
        addXP(enemy.userData.xpValue || 15);
        if (Math.random() < 0.4) {
          const rarity = rollRarity();
          const dropType = weaponTypes[Math.floor(Math.random() * 3)];
          createWeaponPickup(dropType, enemy.position.x, enemy.position.z, rarity);
        } else {
          game.score += 1;
          document.getElementById('cube-count').textContent = game.score;
        }
      }
    }
    function applyDamageToDragon(baseDamage) {
      const comboMult = getComboMultiplier();
      const critChance = getCritChance();
      const isCrit = Math.random() < critChance;
      const comboDamage = Math.floor(baseDamage * comboMult);
      const finalDamage = isCrit ? Math.floor(comboDamage * getCritMultiplier()) : comboDamage;
      dragon.userData.hp -= finalDamage;
      dragon.userData.hitFlash = 0.15;
      for (const m of dragon.userData.materials) { m.emissive.setHex(0xffffff); m.emissiveIntensity = 0.8; }
      document.getElementById('dragon-health-fill').style.width = Math.max(0, dragon.userData.hp / 500) * 100 + '%';
      spawnDamageNumber(dragon.position.clone().add(new THREE.Vector3(0, 2, 0)), finalDamage, isCrit);
      spawnHitParticles(dragon.position.clone().add(new THREE.Vector3(0, 1.5, 0)), 0xff4400, 12);
      addShake(isCrit ? 0.6 : 0.4);
      addCombo();
      if (isCrit) SFX.hitHeavy(); else SFX.hitLight();
      if (dragon.userData.hp <= 0) killDragon();
    }
    function performAttack() {
      if (!currentWeapon.type) return;
      const now = performance.now() / 1000;
      const def = WEAPON_TYPES[currentWeapon.type];
      const cdMult = getCooldownMultiplier();
      if (now - currentWeapon.lastAttackTime < def.cooldown * cdMult) return;
      currentWeapon.lastAttackTime = now;
      currentWeapon.swinging = 1.0;

      if (def.type === 'melee') SFX.swordSwing();
      else if (def.type === 'ranged') SFX.bowShot();
      else SFX.magicCast();

      const forward = getAimDirection();
      const origin = player.position.clone();
      const weaponDamage = def.damage * getWeaponDamageMultiplier();
      let hitAny = false;
      const threshold = def.type === 'melee' ? 0.3 : 0.7;

      if (def.type === 'magic') {
        const spellOrigin = origin.clone();
        spellOrigin.y -= 0.2;
        spellOrigin.x += forward.x * 0.8;
        spellOrigin.z += forward.z * 0.8;
        const aimDir = getAimDirection();
        spawnSpellEffect(spellOrigin, aimDir, def.spellColor, def.spellGlow);
        addShake(0.15);
      }
      if (def.type === 'ranged') {
        const arrowOrigin = origin.clone();
        arrowOrigin.y -= 0.15;
        const aimDir = getAimDirection();
        spawnProjectileEffect(arrowOrigin, aimDir, 0x8b5a2b, 'arrow');
        if (def.ability === 'voidShot') spawnSpellEffect(arrowOrigin, aimDir, 0x5425a8, 0xb77cff);
      }

      for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        if (!enemy.visible) continue;
        const toE = new THREE.Vector3().subVectors(enemy.position, origin);
        const d = toE.length();
        if (d > def.range) continue;
        toE.y = 0; toE.normalize();
        const dot = toE.dot(forward);
        if (dot < threshold) continue;
        applyDamageToEnemy(enemy, weaponDamage);
        if (def.ability === 'freeze') enemy.userData.frozenTimer = 2.5;
        hitAny = true;
      }

      if (game.mode === 'battleroyale') {
        for (let i = brPlayers.length - 1; i >= 0; i--) {
          const rival = brPlayers[i];
          const toRival = new THREE.Vector3().subVectors(rival.position, origin);
          const d = toRival.length();
          if (d > def.range + 1) continue;
          toRival.y = 0; toRival.normalize();
          if (toRival.dot(forward) < threshold) continue;
          applyDamageToBRPlayer(rival, weaponDamage, true);
          hitAny = true;
          if (def.type === 'melee') break;
        }
      }

      if (dragon && game.mode === 'adventure' && dragon.userData.hp > 0) {
        const toD = new THREE.Vector3().subVectors(dragon.position, origin);
        const d = toD.length();
        if (d < def.range + 4) {
          toD.y = 0; toD.normalize();
          if (toD.dot(forward) > 0.2) {
            applyDamageToDragon(def.ability === 'dragonSlayer' ? weaponDamage * 2 : weaponDamage);
            hitAny = true;
          }
        }
      }
      if (def.ability === 'shockwave') createTitanShockwave(origin, 14, 22);
      if (titanColossus && game.mode === 'adventure' && titanColossus.userData.hp > 0) {
        const toT = new THREE.Vector3().subVectors(titanColossus.position, origin);
        const d = toT.length();
        if (d < def.range + 10) {
          toT.y = 0; toT.normalize();
          if (toT.dot(forward) > 0.08) {
            applyDamageToTitan(weaponDamage);
            hitAny = true;
          }
        }
      }
      if (hitAny) showHitMarker();
    }
    function killDragon() {
      SFX.dragonRoar();
      const pos = dragon.position.clone();
      for (let i = 0; i < 8; i++) {
        const dir = new THREE.Vector3(Math.cos(i * Math.PI / 4), 0.5, Math.sin(i * Math.PI / 4)).normalize();
        spawnProjectileEffect(pos, dir, 0xff4400, 'magic');
      }
      spawnHitParticles(pos, 0xff4400, 40);
      addShake(1.2);
      scene.remove(dragon);
      dragon = null;
      game.dragonKilled = true;
      game.kills += 10;
      document.getElementById('kill-count').textContent = game.kills;
      document.getElementById('dragon-bar').style.display = 'none';
      addXP(200); // Dragon XP
      showLootNotification('legendary', 'Dragon Slain! +200 XP');
      createWeaponPickup('dragonSlayer', player.position.x + 3, player.position.z, 'legendary');
    }
    function spawnProjectileEffect(origin, direction, color, style) {
      const geo = style === 'arrow' ? new THREE.BoxGeometry(0.08, 0.08, 1.0) : new THREE.SphereGeometry(0.15, 8, 8);
      const mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: style === 'magic' ? 1 : 0.3 });
      const proj = new THREE.Mesh(geo, mat);
      proj.position.copy(origin);
      proj.position.y -= 0.2;
      proj.lookAt(origin.x + direction.x, origin.y + direction.y, origin.z + direction.z);
      scene.add(proj);
      const speed = 40, maxDist = 25;
      const sp = proj.position.clone(), st = performance.now();
      const anim = () => {
        const el = (performance.now() - st) / 1000;
        const tr = el * speed;
        if (tr >= maxDist) { scene.remove(proj); proj.geometry.dispose(); proj.material.dispose(); return; }
        proj.position.x = sp.x + direction.x * tr;
        proj.position.y = sp.y + direction.y * tr;
        proj.position.z = sp.z + direction.z * tr;
        requestAnimationFrame(anim);
      };
      anim();
    }
    function showHitMarker() {
      const m = document.getElementById('hit-marker');
      m.classList.add('show');
      setTimeout(() => m.classList.remove('show'), 200);
    }
    function showDamageVignette() {
      const v = document.getElementById('damage-vignette');
      v.classList.add('show');
      setTimeout(() => v.classList.remove('show'), 300);
      addShake(0.5);
      SFX.damage();
    }

    // ============================================================
    //  START / END
    // ============================================================
    function clearStartArea() {
      for (const tree of trees) {
        if (Math.hypot(tree.x - START_POSITION.x, tree.z - START_POSITION.z) < 12) tree.group.visible = false;
      }
      for (const rock of worldRocks) {
        if (Math.hypot(rock.position.x - START_POSITION.x, rock.position.z - START_POSITION.z) < 12) rock.visible = false;
      }
    }
    function startGame(loadSave) {
      if (!audioCtx) initAudio();
      if (audioCtx.state === 'suspended') audioCtx.resume();

      if (loadSave) {
        const hasLoaded = loadGame();
        if (!hasLoaded) resetSave();
      } else {
        resetSave();
      }

      game.active = true;
      game.score = 0; game.kills = 0;
      game.health = game.maxHealth;
      game.won = false; game.lost = false;
      game.dragonKilled = false;
      game.lastDamageTime = 0; game.cameraMode = 'first';
      game.combo = 0; game.comboTimer = 0;
      game.brAlive = 21; game.brTotalKills = 0;
      game.timeScale = 1; game.timeSlowTimer = 0;

      // Reset abilities
      abilities.dash.timer = 0; abilities.dash.active = false; abilities.dash.activeTimer = 0;
      abilities.fireball.timer = 0;
      abilities.shield.timer = 0; abilities.shield.active = false; abilities.shield.activeTimer = 0;
      abilities.timeslow.timer = 0;

      document.getElementById('start-screen').style.display = 'none';
      document.getElementById('hud').style.display = 'block';
      document.getElementById('controls-hint').style.display = 'block';
      document.getElementById('camera-toggle-btn').style.display = 'block';
      document.getElementById('minimap').style.display = 'block';
      document.getElementById('altitude-indicator').style.display = 'block';
      document.getElementById('weapon-hud').style.display = 'block';
      document.getElementById('anchor-cooldown').style.display = 'block';
      document.getElementById('ability-bar').style.display = 'flex';
      document.getElementById('message').style.display = 'none';
      document.getElementById('time-display').style.display = 'block';
      document.getElementById('level-display').style.display = 'block';
      document.getElementById('combo-display').style.display = 'none';
      document.getElementById('cube-count').textContent = '0';
      document.getElementById('kill-count').textContent = '0';
      document.getElementById('health-fill').style.width = (game.health / game.maxHealth * 100) + '%';
      document.getElementById('mode-label').textContent = 'FIRST PERSON';
      document.getElementById('crosshair').style.opacity = '1';

      if (game.mode === 'adventure') {
        document.getElementById('dragon-bar').style.display = 'block';
        document.getElementById('dragon-health-fill').style.width = '100%';
        document.getElementById('hud').querySelectorAll('.stat')[0].style.display = 'flex';
        document.getElementById('br-hud').style.display = 'none';
        if (brState.zoneMesh) { scene.remove(brState.zoneMesh); brState.zoneMesh = null; }
      } else {
        document.getElementById('dragon-bar').style.display = 'none';
        document.getElementById('hud').querySelectorAll('.stat')[0].style.display = 'none';
        document.getElementById('titan-bar').style.display = 'none';
        document.getElementById('br-hud').style.display = 'block';
      }

      playerModel.visible = false;
      player.groundY = getHeight(START_POSITION.x, START_POSITION.z);
      player.position.set(START_POSITION.x, player.groundY + player.height, START_POSITION.z);
      player.position.y = player.groundY + player.height;
      player.velocity.set(0, 0, 0);
      player.yaw = 0; player.pitch = 0;
      cameraController.yaw = 0;
      cameraController.pitch = -0.55;
      cameraController.distance = 7;
      cameraController.currentPos.copy(player.position);
      player.walkCycle = 0; player.moveIntensity = 0;
      player.isMoving = false; player.isJumping = false; player.isSprinting = false;
      player.onGround = true; player.jumpsUsed = 0;
      camera.position.copy(player.position);

      leftArmPivot.rotation.x = 0; rightArmPivot.rotation.x = 0;
      leftLegPivot.rotation.x = 0; rightLegPivot.rotation.x = 0;
      pBody.rotation.x = 0;

      currentWeapon.type = null;
      currentWeapon.lastAttackTime = 0;
      currentWeapon.swinging = 0;
      updateWeaponHUD();
      updateAbilityBar();
      renderSkillTree();
      updateXPBar();
      document.getElementById('level-value').textContent = game.level;
      document.getElementById('skill-points-display').textContent = `🎯 ${game.skillPoints} Skill Points (T)`;

      fpWeapon.position.copy(FP_BASE_POS);
      fpWeapon.rotation.copy(FP_BASE_ROT);
      tpWeapon.visible = false;

      if (!anchor.rope) createAnchorVisuals();
      releaseAnchor();

      sky.timeOfDay = 0.3;
      sky.currentWeather = 'clear';
      sky.weatherTimer = 0;
      sky.nextWeatherChange = 30;
      if (sky.rainParticles) scene.remove(sky.rainParticles);
      sky.rainParticles = null;

      for (const tree of trees) { tree.group.visible = true; tree.destroyedByTitan = false; }
      bridge.visible = true;
      bridge.scale.y = 1;
      bridge.userData.damage = 0;
      for (const landmark of worldLandmarks) landmark.userData.titanWarning = false;
      clearStartArea();

      if (dragon) { scene.remove(dragon); dragon = null; }
      if (companionState.mesh) { scene.remove(companionState.mesh); companionState.mesh = null; }
      companionState.type = null;
      mountState.active = false;
      if (mountState.mesh) { scene.remove(mountState.mesh); mountState.mesh = null; }
      mountState.type = null;

      for (const c of chests) {
        c.userData.opened = false;
        c.userData.lid.rotation.x = 0;
        c.userData.lid.position.z = 0;
        c.userData.glowSprite.visible = true;
      }

      for (const p of weaponPickups) scene.remove(p);
      weaponPickups.length = 0;
      for (let i = 0; i < MAP.weaponCount; i++) {
        let x, z, valid, a = 0;
        do {
          a++;
          x = (Math.random() - 0.5) * (MAP.groundSize - 40);
          z = (Math.random() - 0.5) * (MAP.groundSize - 40);
          valid = Math.sqrt(x * x + z * z) > 15;
          if (valid && riverDistance(x, z) < MAP.riverWidth + 2) valid = false;
          if (valid) for (let t of trees) if (Math.sqrt((x - t.x) ** 2 + (z - t.z) ** 2) < 3) { valid = false; break; }
          if (a > 500) break;
        } while (!valid);
        if (valid) createWeaponPickup(weaponTypes[i % 3], x, z, 'common');
      }

      for (const e of enemies) scene.remove(e);
      enemies.length = 0;
      for (const effect of titanEffects) scene.remove(effect.mesh);
      titanEffects.length = 0;
      if (titanColossus) scene.remove(titanColossus);
      titanColossus = null;
      if (game.mode === 'adventure') {
        for (let i = 0; i < MAP.enemyCount; i++) spawnEnemy();
        spawnPriorityMonsters();
      }

      if (game.mode === 'adventure') {
        titanColossus = createTitanColossus();
        titanState.regionIndex = Math.floor(Math.random() * titanRegions.length);
        titanState.stepTimer = 1;
        titanState.attackTimer = 5;
        titanState.roarTimer = 10;
        titanState.eventTimer = 35;
        titanState.chargeTimer = 0;
        dragon = createDragon();
        dragon.userData = Object.assign(dragon.userData, { hp: 500, maxHp: 500, hitFlash: 0 });
        dragonState.mode = 'patrol'; dragonState.modeTimer = 0;
        dragonState.patrolAngle = Math.random() * Math.PI * 2;
        dragonState.fireCooldown = 0;
      } else {
        startBattleRoyale();
      }

      cubes.forEach(cube => {
        cube.visible = true;
        cube.scale.set(1, 1, 1);
        cube.position.y = getHeight(cube.position.x, cube.position.z) + 0.8;
      });

      canvas.requestPointerLock();
      saveGame();
    }
    function endGame(won) {
      game.active = false;
      game.won = won; game.lost = !won;
      document.getElementById('sprint-indicator') && (document.getElementById('sprint-indicator').style.display = 'none');
      document.getElementById('combo-display').style.display = 'none';
      document.getElementById('br-hud').style.display = 'none';
      moveState.forward = false; moveState.backward = false;
      moveState.left = false; moveState.right = false;
      moveState.jump = false; moveState.sprint = false; moveState.attack = false;
      if (document.pointerLockElement === canvas) document.exitPointerLock();
      saveGame();
      const titleEl = document.getElementById('message-title');
      const textEl = document.getElementById('message-text');
      const btnEl = document.getElementById('message-btn');
      if (game.mode === 'battleroyale') {
        if (won) { titleEl.textContent = '👑 VICTORY ROYALE 👑'; titleEl.style.color = '#ffaa00'; textEl.textContent = `Last one standing!\nKills: ${game.brTotalKills}`; }
        else { titleEl.textContent = '💀 ELIMINATED 💀'; titleEl.style.color = '#ff4444'; textEl.textContent = `You placed #${game.brAlive - 1}\nKills: ${game.brTotalKills}`; }
      } else {
        if (won) {
          titleEl.textContent = '🏆 VICTORY! 🏆';
          titleEl.style.color = '#ffcc00';
          let m = `You collected all ${game.maxScore} cubes!`;
          if (game.dragonKilled) m += `\n🐉 Dragon defeated!`;
          m += `\n⭐ Level ${game.level} • ${game.kills} kills`;
          textEl.textContent = m;
        } else {
          titleEl.textContent = '💀 GAME OVER 💀';
          titleEl.style.color = '#ff4444';
          textEl.textContent = `You defeated ${game.kills} enemies.\nLevel ${game.level}`;
        }
      }
      btnEl.textContent = won ? 'Play Again' : 'Try Again';
      document.getElementById('message').style.display = 'block';
    }

    // ============================================================
    //  MINIMAP
    // ============================================================
    const mmCanvas = document.getElementById('minimap-canvas');
    const mmCtx = mmCanvas.getContext('2d');
    const MM_S = 170, MM_R = 90;
    function drawMinimap() {
      const ctx = mmCtx;
      const cx = MM_S / 2, cy = MM_S / 2;
      const sc = MM_S / (MM_R * 2);
      ctx.fillStyle = 'rgba(10,20,15,0.9)';
      ctx.fillRect(0, 0, MM_S, MM_S);
      ctx.save();
      ctx.translate(cx, cy);
      const px = player.position.x, pz = player.position.z;
      ctx.strokeStyle = 'rgba(60,160,220,0.7)';
      ctx.lineWidth = MAP.riverWidth * sc;
      ctx.beginPath();
      const minX = px - MM_R, maxX = px + MM_R;
      for (let i = 0; i <= 30; i++) {
        const wx = minX + (maxX - minX) * (i / 30);
        const wz = getRiverCenterZ(wx);
        const dx = (wx - px) * sc, dz = (wz - pz) * sc;
        if (i === 0) ctx.moveTo(dx, dz); else ctx.lineTo(dx, dz);
      }
      ctx.stroke();
      ctx.fillStyle = '#2d8e2d';
      for (let t of trees) {
        const dx = (t.x - px) * sc, dz = (t.z - pz) * sc;
        if (Math.abs(dx) < cx + 5 && Math.abs(dz) < cy + 5) { ctx.beginPath(); ctx.arc(dx, dz, 2.5, 0, Math.PI * 2); ctx.fill(); }
      }
      for (const chest of chests) {
        if (chest.userData.opened) continue;
        const dx = (chest.position.x - px) * sc, dz = (chest.position.z - pz) * sc;
        if (Math.abs(dx) < cx + 5 && Math.abs(dz) < cy + 5) {
          ctx.fillStyle = '#ffdd00';
          ctx.beginPath(); ctx.arc(dx, dz, 4, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.stroke();
        }
      }
      for (let wp of weaponPickups) {
        const dx = (wp.position.x - px) * sc, dz = (wp.position.z - pz) * sc;
        if (Math.abs(dx) < cx + 5 && Math.abs(dz) < cy + 5) {
          const rarity = wp.userData.rarity || 'common';
          const col = { common: '#ccc', rare: '#4af', epic: '#c8f', legendary: '#fb0' }[rarity];
          ctx.fillStyle = col;
          ctx.beginPath(); ctx.arc(dx, dz, 3, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.fillStyle = '#ffcc00';
      for (let c of cubes) {
        if (!c.visible) continue;
        const dx = (c.position.x - px) * sc, dz = (c.position.z - pz) * sc;
        if (Math.abs(dx) < cx + 5 && Math.abs(dz) < cy + 5) { ctx.beginPath(); ctx.arc(dx, dz, 3, 0, Math.PI * 2); ctx.fill(); }
      }
      ctx.fillStyle = '#ff3333';
      for (let e of enemies) {
        if (!e.visible) continue;
        const dx = (e.position.x - px) * sc, dz = (e.position.z - pz) * sc;
        if (Math.abs(dx) < cx + 5 && Math.abs(dz) < cy + 5) { ctx.beginPath(); ctx.arc(dx, dz, 3, 0, Math.PI * 2); ctx.fill(); }
      }
      if (dragon) {
        const dx = (dragon.position.x - px) * sc, dz = (dragon.position.z - pz) * sc;
        if (Math.abs(dx) < cx + 10 && Math.abs(dz) < cy + 10) {
          ctx.fillStyle = '#ff0000';
          ctx.beginPath(); ctx.arc(dx, dz, 6, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = '#ffcc00'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(dx, dz, 9, 0, Math.PI * 2); ctx.stroke();
        }
      }
      if (titanColossus) {
        const dx = (titanColossus.position.x - px) * sc, dz = (titanColossus.position.z - pz) * sc;
        if (Math.abs(dx) < cx + 12 && Math.abs(dz) < cy + 12) {
          ctx.fillStyle = '#52e0a7';
          ctx.beginPath(); ctx.arc(dx, dz, 8, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = '#bafff2'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(dx, dz, 12, 0, Math.PI * 2); ctx.stroke();
        }
      }
      const towerLandmark = worldLandmarks.find(landmark => landmark.userData && landmark.userData.poiType === 'tower');
      if (towerLandmark) {
        const dx = (towerLandmark.position.x - px) * sc, dz = (towerLandmark.position.z - pz) * sc;
        if (Math.abs(dx) < cx + 12 && Math.abs(dz) < cy + 12) {
          ctx.fillStyle = '#77e4d0';
          ctx.fillRect(dx - 4, dz - 7, 8, 14);
          ctx.strokeStyle = '#fff0a6'; ctx.lineWidth = 2;
          ctx.strokeRect(dx - 7, dz - 10, 14, 20);
        }
      }
      ctx.fillStyle = '#7eff7e';
      ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.fill();
      const fx = Math.sin(player.yaw), fz = Math.cos(player.yaw);
      ctx.strokeStyle = '#7eff7e'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(fx * 12, fz * 12); ctx.stroke();
      ctx.restore();
      ctx.strokeStyle = '#4a4a6a'; ctx.lineWidth = 2;
      ctx.strokeRect(1, 1, MM_S - 2, MM_S - 2);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('N', MM_S / 2, 14);
    }

    // ============================================================
    //  DRAGON AI
    // ============================================================
    function updateDragon(dt, now) {
      if (!dragon || game.mode !== 'adventure') return;
      const ud = dragon.userData;
      if (ud.hitFlash > 0) {
        ud.hitFlash -= dt;
        if (ud.hitFlash <= 0) for (const m of ud.materials) { m.emissive.setHex(0); m.emissiveIntensity = 0; }
      }
      dragonState.wingPhase += dt * 6;
      const wa = Math.sin(dragonState.wingPhase) * 0.6;
      ud.leftWingPivot.rotation.z = -0.3 + wa;
      ud.rightWingPivot.rotation.z = 0.3 - wa;
      dragonState.tailWag += dt * 3;
      ud.tailSegments.forEach((s, i) => { s.rotation.y = Math.sin(dragonState.tailWag + i * 0.5) * 0.15; });
      const dx = player.position.x - dragon.position.x;
      const dz = player.position.z - dragon.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      const tYaw = Math.atan2(dx, dz);
      let yd = tYaw - dragon.rotation.y;
      while (yd > Math.PI) yd -= Math.PI * 2;
      while (yd < -Math.PI) yd += Math.PI * 2;
      dragon.rotation.y += yd * Math.min(dt * 3, 1);
      dragonState.modeTimer += dt;
      dragonState.fireCooldown -= dt;
      switch (dragonState.mode) {
        case 'patrol':
          dragonState.patrolAngle += dt * dragonState.patrolSpeed;
          const tx = Math.cos(dragonState.patrolAngle) * dragonState.patrolRadius;
          const tz = Math.sin(dragonState.patrolAngle) * dragonState.patrolRadius;
          dragon.position.x += (tx - dragon.position.x) * Math.min(dt * 1.5, 1);
          dragon.position.z += (tz - dragon.position.z) * Math.min(dt * 1.5, 1);
          dragon.position.y += ((28 + Math.sin(now * 0.8) * 3) - dragon.position.y) * Math.min(dt * 2, 1);
          if (dragonState.modeTimer > 8 && dist < 100) {
            dragonState.mode = 'dive'; dragonState.modeTimer = 0;
            SFX.dragonRoar();
          }
          break;
        case 'dive':
          dragon.position.x += (dx / dist) * 22 * dt;
          dragon.position.z += (dz / dist) * 22 * dt;
          dragon.position.y += (3 - dragon.position.y) * Math.min(dt * 2, 1);
          if (dist < 18 && dragonState.fireCooldown <= 0) {
            dragonState.fireCooldown = 1.5;
            if (dist < 20 && now - game.lastDamageTime > game.invincibleTime && !abilities.shield.active) {
              game.health -= 20;
              game.lastDamageTime = now;
              document.getElementById('health-fill').style.width = Math.max(0, (game.health / game.maxHealth) * 100) + '%';
              showDamageVignette();
              if (game.health <= 0) { game.health = 0; endGame(false); }
            }
          }
          if (dragon.position.y < 4 || dragonState.modeTimer > 4) {
            dragonState.mode = 'ground'; dragonState.modeTimer = 0;
            dragonState.groundTimer = 5 + Math.random() * 4;
          }
          break;
        case 'ground':
          if (dist > 3) {
            dragon.position.x += (dx / dist) * 4 * dt;
            dragon.position.z += (dz / dist) * 4 * dt;
          }
          dragon.position.y += (getHeight(dragon.position.x, dragon.position.z) + 0.8 - dragon.position.y) * Math.min(dt * 3, 1);
          dragonState.walkCycle += dt * 8;
          const s = Math.sin(dragonState.walkCycle) * 0.4, sa = Math.sin(dragonState.walkCycle + Math.PI) * 0.4;
          ud.dragonLegs[0].rotation.x = s; ud.dragonLegs[1].rotation.x = sa;
          ud.dragonLegs[2].rotation.x = sa; ud.dragonLegs[3].rotation.x = s;
          if (dist < 4.5 && now - game.lastDamageTime > game.invincibleTime && !abilities.shield.active) {
            game.health -= 12;
            game.lastDamageTime = now;
            document.getElementById('health-fill').style.width = Math.max(0, (game.health / game.maxHealth) * 100) + '%';
            showDamageVignette();
            if (game.health <= 0) { game.health = 0; endGame(false); }
          }
          dragonState.groundTimer -= dt;
          if (dragonState.groundTimer <= 0) { dragonState.mode = 'takeoff'; dragonState.modeTimer = 0; }
          break;
        case 'takeoff':
          dragon.position.y += (28 - dragon.position.y) * Math.min(dt * 1.2, 1);
          if (dist < 40) {
            dragon.position.x -= (dx / dist) * 8 * dt;
            dragon.position.z -= (dz / dist) * 8 * dt;
          }
          ud.dragonLegs.forEach(l => { l.rotation.x += (0 - l.rotation.x) * Math.min(dt * 4, 1); });
          if (dragon.position.y > 22 && dragonState.modeTimer > 2) {
            dragonState.mode = 'patrol'; dragonState.modeTimer = 0;
          }
          break;
      }
    }

    // ============================================================
    //  AMBIENT AUDIO + FOOTSTEPS
    // ============================================================
    let lastFootstep = 0;
    function updateFootsteps(dt, now) {
      if (!player.isMoving) return;
      const interval = player.isSprinting ? 0.25 : 0.4;
      if (now - lastFootstep < interval) return;
      lastFootstep = now;
      const px = player.position.x, pz = player.position.z;
      const overBridge = px > bridgeBounds.minX && px < bridgeBounds.maxX && pz > bridgeBounds.minZ && pz < bridgeBounds.maxZ;
      const overWater = riverDistance(px, pz) < MAP.riverWidth && player.position.y - player.height < 0;
      const overStone = getHeight(px, pz) > 12;
      if (overBridge) SFX.footstepWood();
      else if (overWater) SFX.footstepWater();
      else if (overStone) SFX.footstepStone();
      else SFX.footstepGrass();
    }
    function updateAmbient(dt) {
      const isDay = sky.timeOfDay > 0.25 && sky.timeOfDay < 0.75;
      if (isDay && sky.currentWeather === 'clear' && Math.random() < 0.008) SFX.ambientBird();
      if (!isDay && Math.random() < 0.005) SFX.ambientCricket();
      if (sky.currentWeather === 'storm' && Math.random() < 0.01) SFX.ambientWind();
    }

    const ambientLife = [];

    function createAmbientLife() {
      if (ambientLife.length) return;
      for (let i = 0; i < 40; i++) {
        const mesh = new THREE.Sprite(new THREE.SpriteMaterial({ color: i % 3 === 0 ? 0xfaf3a5 : i % 3 === 1 ? 0xff9ad6 : 0x9ae6ff, transparent: true, opacity: 0.8, depthWrite: false }));
        mesh.scale.setScalar(1.1 + Math.random() * 1.8);
        const x = (Math.random() - 0.5) * 560;
        const z = (Math.random() - 0.5) * 560;
        mesh.position.set(x, getHeight(x, z) + 2 + Math.random() * 8, z);
        scene.add(mesh);
        ambientLife.push({ mesh, baseX: x, baseZ: z, drift: Math.random() * Math.PI * 2, speed: 0.25 + Math.random() * 0.8, height: 1.2 + Math.random() * 4, kind: i % 4 });
      }
    }

    function updateAmbientLife(dt, now) {
      createAmbientLife();
      for (const life of ambientLife) {
        life.drift += dt * life.speed;
        const x = life.baseX + Math.sin(life.drift) * 8;
        const z = life.baseZ + Math.cos(life.drift * 1.3) * 8;
        life.mesh.position.set(x, getHeight(x, z) + 1.5 + Math.sin(now * 2 + life.drift) * life.height, z);
        life.mesh.material.opacity = 0.55 + Math.sin(now * 3 + life.drift) * 0.25;
      }
    }

    // ============================================================
    //  HP REGEN
    // ============================================================
    let regenTimer = 0;
    function updateRegen(dt) {
      if (!isSkillUnlocked('regen')) return;
      regenTimer += dt;
      if (regenTimer >= 2) {
        regenTimer = 0;
        if (game.health < game.maxHealth) {
          game.health = Math.min(game.maxHealth, game.health + 3);
          document.getElementById('health-fill').style.width = (game.health / game.maxHealth * 100) + '%';
        }
      }
    }

    // ============================================================
    //  MAIN LOOP
    // ============================================================
    let lastTime = performance.now() / 1000;
    let minimapTimer = 0;
    let chestPromptTimer = 0;
    let autoSaveTimer = 0;

    function animate() {
      requestAnimationFrame(animate);
      const now = performance.now() / 1000;
      const dt = Math.min(now - lastTime, 0.05);
      lastTime = now;
      const gameDt = dt * game.timeScale;

      updateDayNight(dt);
      updateWeather(dt);

      if (game.active) {
        updatePlayer(gameDt, now);
        if (game.mode === 'adventure') updateEnemies(gameDt, now);
        else updateBattleRoyale(gameDt, now);
        if (game.mode === 'adventure') {
          updateWorldEvents(gameDt);
          updateArena(gameDt);
        }
        updateCubes(gameDt, now);
        updateWeaponPickups(dt, now);
        updateDragon(gameDt, now);
        updateTitan(gameDt, now);
        updateTitanEffects(gameDt);
        updateAnchor(gameDt, now);
        updateSpellEffects(gameDt);
        updatePlayerAnimation(dt);
        updateWeaponAnimation(dt);
        updateAbilityCooldowns(dt);
        updateRegen(dt);
        updateCamera();
        applyShake(dt);
        updateDamageNumbers(dt);
        updateHitParticles(dt);
        updateCombo(dt);
        updateFootsteps(dt, now);
        updateAmbient(dt);
        updateAmbientLife(dt, now);
        updateCompanion(gameDt, now);
        updateMount();
        checkWinCondition();

        if (moveState.attack) performAttack();

        chestPromptTimer += dt;
        if (chestPromptTimer > 0.1) {
          chestPromptTimer = 0;
          let nearChest = false;
          let nearTower = false;
          let nearArena = false;
          for (const c of chests) {
            if (c.userData.opened) continue;
            const dx = player.position.x - c.position.x;
            const dz = player.position.z - c.position.z;
            if (dx * dx + dz * dz < 3 * 3) { nearChest = true; break; }
          }
          const tower = worldLandmarks.find(landmark => landmark.userData && landmark.userData.poiType === 'tower');
          if (tower) nearTower = Math.hypot(player.position.x - tower.position.x, player.position.z - tower.position.z) < 28;
          const arena = worldLandmarks.find(landmark => landmark.userData && landmark.userData.poiType === 'arena');
          if (arena) nearArena = Math.hypot(player.position.x - arena.position.x, player.position.z - arena.position.z) < 26;
          const prompt = document.getElementById('interact-prompt');
          prompt.innerHTML = nearArena
            ? 'Press <kbd style="background:#ffb347;color:#351900;padding:2px 8px;border-radius:4px;">E</kbd> to Enter Champion Arena'
            : nearTower
              ? 'Press <kbd style="background:#77e4d0;color:#06252a;padding:2px 8px;border-radius:4px;">E</kbd> to Enter Skyfall Tower'
              : 'Press <kbd style="background:#ffcc00;color:#000;padding:2px 8px;border-radius:4px;">E</kbd> to Open';
          prompt.style.display = nearChest || nearTower || nearArena ? 'block' : 'none';
        }

        document.getElementById('altitude-value').textContent = Math.round(player.position.y - player.height);
        minimapTimer += dt;
        if (minimapTimer > 0.066) { drawMinimap(); minimapTimer = 0; }

        // Auto-save every 30s
        autoSaveTimer += dt;
        if (autoSaveTimer > 30) { autoSaveTimer = 0; saveGame(); }
      }

      cubes.forEach((cube, i) => {
        if (cube.visible) {
          cube.rotation.y += dt * 1.5;
          cube.position.y = getHeight(cube.position.x, cube.position.z) + 0.8 + Math.sin(now * 2 + i) * 0.15;
        }
      });
      enemies.forEach((enemy, i) => {
        if (enemy.visible && enemy.userData.knockbackVel && enemy.userData.knockbackVel.lengthSq() < 0.01) {
          enemy.rotation.y += dt * 0.5;
          enemy.position.y = getHeight(enemy.position.x, enemy.position.z) + (enemy.userData.groundOffset || 0.6) + Math.sin(now * 4 + i) * 0.1;
        }
      });
      chests.forEach((c, i) => {
        if (!c.userData.opened) {
          const pulse = 0.5 + Math.sin(now * 2 + i) * 0.3;
          c.userData.glowSprite.material.opacity = pulse;
        }
      });

      renderer.render(scene, camera);
    }

    // ============================================================
    //  PLAYER UPDATE
    // ============================================================
    function updatePlayer(dt, now) {
      const cameraBasis = getCameraBasis();
      const cameraForward = new THREE.Vector3(cameraBasis.forward.x, 0, cameraBasis.forward.z).normalize();
      const cameraRight = new THREE.Vector3(cameraBasis.right.x, 0, cameraBasis.right.z).normalize();
      const moveDir = new THREE.Vector3(0, 0, 0);

      if (moveState.forward) moveDir.add(cameraForward);
      if (moveState.backward) moveDir.sub(cameraForward);
      if (moveState.right) moveDir.sub(cameraRight);
      if (moveState.left) moveDir.add(cameraRight);

      player.isMoving = moveDir.lengthSq() > MOVE_EPSILON;
      if (player.isMoving) moveDir.normalize();
      player.isSprinting = moveState.sprint && player.isMoving;
      let speed = (player.isSprinting ? player.sprintSpeed : player.walkSpeed) * getMoveSpeedMultiplier();
      if (mountState.active) speed *= 1.7;

      if (abilities.dash.active) speed *= 3;

      if (anchor.anchored) {
        player.position.x += player.velocity.x * dt;
        player.position.y += player.velocity.y * dt;
        player.position.z += player.velocity.z * dt;
        player.velocity.multiplyScalar(0.9);
        return;
      }

      const totalMove = moveDir.clone().multiplyScalar(speed * dt);
      const steps = Math.max(1, Math.ceil(totalMove.length() / 0.4));
      const stepMove = totalMove.divideScalar(steps);
      for (let i = 0; i < steps; i++) {
        const nx = player.position.x + stepMove.x, nz = player.position.z + stepMove.z;
        if (!checkWorldCollision(nx, player.position.z)) player.position.x = nx;
        if (!checkWorldCollision(player.position.x, nz)) player.position.z = nz;
      }

      const dc = Math.sqrt(player.position.x ** 2 + player.position.z ** 2);
      if (dc > MAP.worldBound) {
        const a = Math.atan2(player.position.z, player.position.x);
        player.position.x = Math.cos(a) * MAP.worldBound;
        player.position.z = Math.sin(a) * MAP.worldBound;
      }

      let groundY = getHeight(player.position.x, player.position.z);
      const towerGroundY = getTowerStairGround(player.position.x, player.position.z);
      if (towerGroundY !== null) groundY = Math.max(groundY, towerGroundY);
      if (player.position.x > bridgeBounds.minX && player.position.x < bridgeBounds.maxX &&
        player.position.z > bridgeBounds.minZ && player.position.z < bridgeBounds.maxZ) {
        groundY = Math.max(groundY, bridgeBounds.y);
      }
      player.groundY = groundY;

      if (isSkillUnlocked('fly') && moveState.jump && !player.onGround) {
        abilities.fly.active = true;
        player.velocity.y = Math.max(player.velocity.y, 4);
      }

      if (moveState.jump && player.onGround) {
        player.velocity.y = player.jumpSpeed;
        player.onGround = false;
        player.isJumping = true;
        player.jumpsUsed = 1;
      } else if (!moveState.jump && player.onGround) {
        player.jumpsUsed = 0;
      }

      if (player.isMoving && moveDir.lengthSq() > 0.0001) {
        const targetYaw = Math.atan2(moveDir.x, moveDir.z);
        player.yaw = THREE.MathUtils.lerp(player.yaw, targetYaw, 0.14);
      }

      player.velocity.y -= 25 * dt;
      player.position.y += player.velocity.y * dt;
      const gl = player.groundY + player.height;
      if (player.position.y <= gl) {
        player.position.y = gl;
        player.velocity.y = 0;
        player.onGround = true;
        player.isJumping = false;
        player.jumpsUsed = 0;
        if (abilities.fly.active) abilities.fly.active = false;
      }
    }

    // Handle double jump on keydown Space (second press)
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && game.active && isSkillUnlocked('doublejump')) {
        if (!player.onGround && player.jumpsUsed === 1 && !abilities.fly.active) {
          player.velocity.y = player.jumpSpeed * 0.9;
          player.jumpsUsed = 2;
          // Burst particles
          spawnHitParticles(player.position.clone(), 0x7eff7e, 12);
        }
      }
    });

    function updatePlayerAnimation(dt) {
      const t = player.isMoving ? 1 : 0;
      player.moveIntensity += (t - player.moveIntensity) * Math.min(dt * 10, 1);
      if (player.isMoving) player.walkCycle += dt * (player.isSprinting ? 16 : 9);
      const amp = player.isSprinting ? 1.1 : 0.9;
      const swing = Math.sin(player.walkCycle) * amp * player.moveIntensity;
      leftArmPivot.rotation.x = -swing;
      rightArmPivot.rotation.x = swing;
      leftLegPivot.rotation.x = swing;
      rightLegPivot.rotation.x = -swing;
      if (player.isJumping || !player.onGround) {
        const b = Math.min(dt * 12, 1);
        leftArmPivot.rotation.x += (-2.2 - leftArmPivot.rotation.x) * b;
        rightArmPivot.rotation.x += (-2.2 - rightArmPivot.rotation.x) * b;
        leftLegPivot.rotation.x += (0.5 - leftLegPivot.rotation.x) * b;
        rightLegPivot.rotation.x += (0.5 - rightLegPivot.rotation.x) * b;
      }
      const lean = player.isMoving ? (player.isSprinting ? 0.18 : 0.08) : 0;
      pBody.rotation.x += (lean - pBody.rotation.x) * Math.min(dt * 8, 1);
    }
    function updateWeaponAnimation(dt) {
      if (currentWeapon.swinging > 0) {
        currentWeapon.swinging -= dt * 3.2;
        if (currentWeapon.swinging < 0) currentWeapon.swinging = 0;
      }
      if (!currentWeapon.type) return;
      const def = WEAPON_TYPES[currentWeapon.type];
      const t = 1 - currentWeapon.swinging;
      if (fpWeapon.visible) {
        fpWeapon.position.copy(FP_BASE_POS);
        fpWeapon.rotation.copy(FP_BASE_ROT);
        if (def.swingStyle === 'slash') {
          const slash = Math.sin(t * Math.PI);
          const snap = slash * slash;
          fpWeapon.rotation.x += -snap * 1.8;
          fpWeapon.rotation.z += -snap * 0.9;
          fpWeapon.rotation.y += -snap * 0.5;
          fpWeapon.position.z += -snap * 0.2;
          fpWeapon.position.y += snap * 0.08;
          fpWeapon.position.x += snap * 0.1;
        } else if (def.swingStyle === 'draw') {
          if (t < 0.4) {
            const pull = t / 0.4;
            fpWeapon.position.z += pull * 0.15;
            fpWeapon.rotation.x += -pull * 0.25;
            fpWeapon.rotation.z += pull * 0.15;
          } else {
            const release = (t - 0.4) / 0.6;
            const kick = Math.sin(release * Math.PI);
            fpWeapon.position.z += 0.15 - kick * 0.25;
            fpWeapon.rotation.x += -0.25 + kick * 0.35;
          }
        } else if (def.swingStyle === 'cast') {
          if (t < 0.35) {
            const pull = t / 0.35;
            fpWeapon.position.z += pull * 0.12;
            fpWeapon.rotation.x += pull * 0.3;
          } else {
            const thrust = (t - 0.35) / 0.65;
            const snap = Math.sin(thrust * Math.PI);
            fpWeapon.position.z += 0.12 - snap * 0.3;
            fpWeapon.rotation.x += 0.3 - snap * 0.6;
            fpWeapon.rotation.y += snap * 0.8;
          }
        }
      }
      if (currentWeapon.swinging > 0 && tpWeapon.visible) {
        const s = Math.sin(t * Math.PI);
        const sn = s * s;
        if (def.swingStyle === 'slash') {
          rightArmPivot.rotation.x += -sn * 2.4;
          rightArmPivot.rotation.y = -sn * 0.6;
          pBody.rotation.y = sn * 0.4;
        } else if (def.swingStyle === 'draw') {
          if (t < 0.4) rightArmPivot.rotation.x += -t / 0.4 * 0.6;
          else rightArmPivot.rotation.x += -0.6 + ((t - 0.4) / 0.6) * 1.2;
        } else if (def.swingStyle === 'cast') {
          rightArmPivot.rotation.x += -sn * 1.5;
          rightArmPivot.rotation.z = -sn * 0.4;
        }
      } else {
        pBody.rotation.y *= 0.9;
        rightArmPivot.rotation.y *= 0.9;
        rightArmPivot.rotation.z *= 0.9;
      }
    }
    function updateEnemies(dt, now) {
      if (game.mode !== 'adventure') return;
      const speed = 2.5, range = 30;
      enemies.forEach(enemy => {
        const monsterType = enemy.userData.monsterType;
        enemy.userData.specialTimer -= dt;
        const kb = enemy.userData.knockbackVel;
        if (kb.lengthSq() > 0.01) {
          enemy.position.x += kb.x * dt;
          enemy.position.y += kb.y * dt;
          enemy.position.z += kb.z * dt;
          kb.multiplyScalar(0.85);
          kb.y -= 15 * dt;
          const groundOffset = enemy.userData.groundOffset || 0.6;
          if (enemy.position.y < getHeight(enemy.position.x, enemy.position.z) + groundOffset) {
            enemy.position.y = getHeight(enemy.position.x, enemy.position.z) + groundOffset;
            kb.y = 0;
          }
          return;
        }
        const dx = player.position.x - enemy.position.x;
        const dz = player.position.z - enemy.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (monsterType === 'voidDragon' && enemy.userData.specialTimer <= 0 && dist > 18 && dist < 90) {
          const angle = Math.atan2(-dx, -dz) + (Math.random() - 0.5) * 1.2;
          enemy.position.x = player.position.x + Math.sin(angle) * 14;
          enemy.position.z = player.position.z + Math.cos(angle) * 14;
          enemy.position.y = getHeight(enemy.position.x, enemy.position.z) + 2.5;
          enemy.userData.specialTimer = 9;
          showLootNotification('legendary', 'Void Dragon teleported');
        }
        if (monsterType === 'shadowWolf' && enemy.userData.specialTimer <= 0 && dist < 28) {
          const packSize = enemies.filter(e => e.userData.monsterType === 'shadowWolf').length;
          if (packSize < 5) {
            spawnEnemyAt(enemy.position.x + 3, enemy.position.z + 2, false, 'shadowWolf');
            spawnEnemyAt(enemy.position.x - 3, enemy.position.z - 2, false, 'shadowWolf');
            showLootNotification('rare', 'Shadow Wolf pack howl');
          }
          enemy.userData.specialTimer = 12;
        }
        if (enemy.userData.frozenTimer > 0) enemy.userData.frozenTimer -= dt;
        const frozenMultiplier = enemy.userData.frozenTimer > 0 ? 0.22 : 1;
        const behaviorSpeed = (monsterType === 'demonKnight' && dist < 12 ? 9 : monsterType ? enemy.userData.speed : speed) * frozenMultiplier;
        const across = (riverDistance(enemy.position.x, enemy.position.z) > MAP.riverWidth) !==
          (riverDistance(player.position.x, player.position.z) > MAP.riverWidth);
        if (dist < (monsterType ? 46 : range) && dist > 0.1 && !across) {
          const nx = enemy.position.x + (dx / dist) * behaviorSpeed * dt;
          const nz = enemy.position.z + (dz / dist) * behaviorSpeed * dt;
          if (riverDistance(nx, nz) > MAP.riverWidth) {
            let blocked = false;
            for (let t of trees) if (Math.sqrt((nx - t.x) ** 2 + (nz - t.z) ** 2) < t.radius + 0.6) { blocked = true; break; }
            if (!blocked && getHeight(nx, nz) - getHeight(enemy.position.x, enemy.position.z) < 0.5) {
              enemy.position.x = nx; enemy.position.z = nz;
            }
          }
        }
        if (dist < (monsterType === 'titan' ? 5.5 : monsterType === 'iceGiant' || monsterType === 'seaSerpent' || monsterType === 'voidDragon' ? 3.5 : 1.5) && now - game.lastDamageTime > game.invincibleTime && !abilities.shield.active) {
          game.health -= enemy.userData.attackDamage || 15;
          game.lastDamageTime = now;
          document.getElementById('health-fill').style.width = Math.max(0, (game.health / game.maxHealth) * 100) + '%';
          showDamageVignette();
          if (game.health <= 0) { game.health = 0; endGame(false); }
        }
      });
    }

    function spawnArenaRound() {
      arenaState.round++;
      if (arenaState.round > arenaState.maxRound) {
        arenaState.active = false;
        addXP(500);
        createWeaponPickup('thunderHammer', player.position.x + 2, player.position.z + 2, 'legendary');
        showLootNotification('legendary', 'Arena conquered · Thunder Hammer awarded');
        return;
      }
      const pool = arenaState.round < 4 ? ['shadowWolf', 'demonKnight'] : arenaState.round < 8 ? ['crystalBeast', 'iceGiant', 'fireDrake'] : ['ancientKnight', 'lavaTitan', 'voidDragon'];
      const count = 2 + Math.min(7, arenaState.round);
      arenaState.enemies = [];
      for (let i = 0; i < count; i++) {
        const angle = i / count * Math.PI * 2;
        const x = 220 + Math.cos(angle) * (8 + Math.random() * 7);
        const z = -80 + Math.sin(angle) * (8 + Math.random() * 7);
        const enemy = spawnEnemyAt(x, z, arenaState.round % 5 === 0, pool[Math.floor(Math.random() * pool.length)]);
        arenaState.enemies.push(enemy);
      }
      showLootNotification(arenaState.round % 5 === 0 ? 'legendary' : 'rare', `Arena Round ${arenaState.round} begins`);
    }
    function enterArena() {
      if (!game.active || game.mode !== 'adventure' || arenaState.active) return;
      arenaState.active = true;
      arenaState.round = 0;
      spawnArenaRound();
    }
    function updateArena(dt) {
      if (!arenaState.active || game.mode !== 'adventure') return;
      const alive = arenaState.enemies.some(enemy => enemies.includes(enemy));
      if (!alive) {
        arenaState.nextRoundTimer -= dt;
        if (arenaState.nextRoundTimer <= 0) { arenaState.nextRoundTimer = 2; spawnArenaRound(); }
      }
    }

    // ============================================================
    //  BATTLE ROYALE
    // ============================================================
    function createBRPlayer(index) {
      const group = new THREE.Group();
      const avatar = playerModel.clone(true);
      avatar.visible = true;
      const flashMaterials = [];
      avatar.traverse(part => {
        if (part.isMesh) {
          part.material = part.material.clone();
          part.castShadow = true;
          part.receiveShadow = true;
          flashMaterials.push(part.material);
        }
      });
      group.add(avatar);
      const marker = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.45, 4), new THREE.MeshBasicMaterial({ color: 0xffe36e }));
      marker.position.y = 2.9; group.add(marker);
      const angle = (index / 20) * Math.PI * 2 + Math.random() * 0.4;
      const radius = 45 + Math.random() * 100;
      group.position.set(Math.cos(angle) * radius, getHeight(Math.cos(angle) * radius, Math.sin(angle) * radius), Math.sin(angle) * radius);
      group.userData = {
        hp: 100, maxHp: 100, attackTimer: 1 + Math.random() * 2,
        speed: 3 + Math.random() * 1.6, name: `Rival ${String(index + 1).padStart(2, '0')}`,
        target: null, hitFlash: 0, flashMaterials, avatar,
        leftArm: avatar.children[2], rightArm: avatar.children[3],
        leftLeg: avatar.children[4], rightLeg: avatar.children[5],
        walkPhase: Math.random() * Math.PI * 2
      };
      scene.add(group);
      brPlayers.push(group);
    }
    function removeBRPlayer(rival, byPlayer) {
      const index = brPlayers.indexOf(rival);
      if (index < 0) return;
      scene.remove(rival);
      brPlayers.splice(index, 1);
      game.brAlive = brPlayers.length + 1;
      if (byPlayer) {
        game.brTotalKills++;
        document.getElementById('kill-count').textContent = game.brTotalKills;
        document.getElementById('br-kills-value').textContent = game.brTotalKills;
        addXP(30);
        showLootNotification('rare', `${rival.userData.name} eliminated`);
      }
    }
    function applyDamageToBRPlayer(rival, damage, byPlayer = false) {
      if (!rival || !rival.userData) return;
      rival.userData.hp -= damage;
      rival.userData.hitFlash = 0.12;
      spawnDamageNumber(rival.position.clone().add(new THREE.Vector3(0, 2.6, 0)), Math.floor(damage), false, '#ffdb72');
      if (rival.userData.hp <= 0) removeBRPlayer(rival, byPlayer);
    }
    function startBattleRoyale() {
      for (const rival of brPlayers) scene.remove(rival);
      brPlayers.length = 0;
      for (const enemy of enemies) scene.remove(enemy);
      enemies.length = 0;
      if (dragon) { scene.remove(dragon); dragon = null; }
      if (titanColossus) { scene.remove(titanColossus); titanColossus = null; }
      brState.zoneCenter.set(0, 0, 0);
      brState.zoneRadius = 280;
      brState.startRadius = 280;
      brState.targetRadius = 280;
      brState.shrinkTimer = 28;
      brState.matchTime = 0;
      brState.npcTimer = 2.5;
      if (brState.zoneMesh) scene.remove(brState.zoneMesh);
      brState.zoneMesh = new THREE.Mesh(new THREE.RingGeometry(0.98, 1, 64), new THREE.MeshBasicMaterial({ color: 0xff9a5b, transparent: true, opacity: 0.72, side: THREE.DoubleSide }));
      brState.zoneMesh.rotation.x = -Math.PI / 2;
      brState.zoneMesh.position.y = 0.35;
      brState.zoneMesh.scale.setScalar(brState.zoneRadius);
      scene.add(brState.zoneMesh);
      for (let i = 0; i < 20; i++) createBRPlayer(i);
      game.brAlive = 21;
      game.brTotalKills = 0;
      document.getElementById('br-alive-value').textContent = '21';
      document.getElementById('br-kills-value').textContent = '0';
      document.getElementById('br-zone-value').textContent = '100%';
      document.getElementById('br-zone-fill').style.width = '100%';
    }
    function updateBattleRoyale(dt, now) {
      if (game.mode !== 'battleroyale') return;
      brState.matchTime += dt;
      brState.shrinkTimer -= dt;
      if (brState.shrinkTimer <= 0 && brState.targetRadius > 36) {
        brState.targetRadius = Math.max(36, brState.targetRadius - 42);
        brState.shrinkTimer = 25;
        showLootNotification('legendary', 'The storm is closing');
      }
      brState.zoneRadius += (brState.targetRadius - brState.zoneRadius) * Math.min(dt * 0.35, 1);
      brState.zoneMesh.scale.setScalar(brState.zoneRadius);
      const zonePct = Math.round((brState.zoneRadius / brState.startRadius) * 100);
      document.getElementById('br-zone-value').textContent = `${zonePct}%`;
      document.getElementById('br-zone-fill').style.width = `${zonePct}%`;

      const playerDistance = Math.hypot(player.position.x - brState.zoneCenter.x, player.position.z - brState.zoneCenter.z);
      if (playerDistance > brState.zoneRadius && now - game.lastDamageTime > 0.35 && !abilities.shield.active) {
        game.health = Math.max(0, game.health - 7);
        game.lastDamageTime = now;
        document.getElementById('health-fill').style.width = `${game.health / game.maxHealth * 100}%`;
        showDamageVignette();
        if (game.health <= 0) { game.health = 0; endGame(false); return; }
      }

      for (let i = brPlayers.length - 1; i >= 0; i--) {
        const rival = brPlayers[i];
        if (!rival || !rival.parent) continue;
        const ud = rival.userData;
        if (ud.hitFlash > 0) {
          ud.hitFlash -= dt;
          ud.flashMaterials.forEach(material => material.emissive.setHex(ud.hitFlash > 0 ? 0xffffff : 0x000000));
        }
        const rivalDistance = Math.hypot(rival.position.x - brState.zoneCenter.x, rival.position.z - brState.zoneCenter.z);
        if (rivalDistance > brState.zoneRadius) {
          ud.hp -= 5 * dt;
          if (ud.hp <= 0) { removeBRPlayer(rival, false); continue; }
        }
        let target = player;
        let targetDistance = Math.hypot(player.position.x - rival.position.x, player.position.z - rival.position.z);
        for (const other of brPlayers) {
          if (other === rival) continue;
          const distance = rival.position.distanceTo(other.position);
          if (distance < targetDistance) { target = other; targetDistance = distance; }
        }
        const dx = target.position.x - rival.position.x;
        const dz = target.position.z - rival.position.z;
        const distance = Math.hypot(dx, dz);
        const running = distance > 18 || rivalDistance > brState.zoneRadius - 20;
        const moving = (distance < 42 && distance > 2) || rivalDistance > brState.zoneRadius - 12;
        const moveSpeed = running ? ud.speed * 1.65 : ud.speed;
        if (distance < 42 && distance > 2) {
          rival.position.x += dx / distance * moveSpeed * dt;
          rival.position.z += dz / distance * moveSpeed * dt;
          rival.rotation.y = Math.atan2(dx, dz);
        } else if (rivalDistance > brState.zoneRadius - 12) {
          const cx = brState.zoneCenter.x - rival.position.x, cz = brState.zoneCenter.z - rival.position.z;
          const cd = Math.hypot(cx, cz) || 1;
          rival.position.x += cx / cd * moveSpeed * dt;
          rival.position.z += cz / cd * moveSpeed * dt;
          rival.rotation.y = Math.atan2(cx, cz);
        }
        const animationRate = running ? 16 : 9;
        const animationAmount = moving ? (running ? 1.1 : 0.85) : 0;
        if (moving) ud.walkPhase += dt * animationRate;
        const swing = Math.sin(ud.walkPhase) * animationAmount;
        ud.leftArm.rotation.x = -swing;
        ud.rightArm.rotation.x = swing;
        ud.leftLeg.rotation.x = swing;
        ud.rightLeg.rotation.x = -swing;
        ud.avatar.position.y = moving ? Math.abs(Math.sin(ud.walkPhase * 2)) * (running ? 0.08 : 0.04) : 0;
        ud.avatar.children[1].rotation.x = moving ? (running ? 0.12 : 0.05) : 0;
        rival.position.y = getHeight(rival.position.x, rival.position.z);
        ud.attackTimer -= dt;
        if (targetDistance < 3.2 && ud.attackTimer <= 0) {
          ud.attackTimer = 1.2 + Math.random() * 1.5;
          if (target === player) {
            if (now - game.lastDamageTime > game.invincibleTime && !abilities.shield.active) {
              game.health = Math.max(0, game.health - 9);
              game.lastDamageTime = now;
              document.getElementById('health-fill').style.width = `${game.health / game.maxHealth * 100}%`;
              showDamageVignette();
              if (game.health <= 0) { game.health = 0; endGame(false); return; }
            }
          } else applyDamageToBRPlayer(target, 14, false);
        }
      }
      game.brAlive = brPlayers.length + 1;
      document.getElementById('br-alive-value').textContent = game.brAlive;
      if (brPlayers.length === 0 && game.active) endGame(true);
    }
    function updateCubes(dt, now) {
      if (game.mode !== 'adventure') return;
      cubes.forEach(c => {
        if (!c.visible) return;
        const dx = player.position.x - c.position.x;
        const dy = player.position.y - c.position.y;
        const dz = player.position.z - c.position.z;
        if (dx * dx + dy * dy + dz * dz < 1.5 * 1.5) {
          c.visible = false;
          game.score++;
          document.getElementById('cube-count').textContent = game.score;
          c.scale.set(0.01, 0.01, 0.01);
          SFX.pickup();
          addCombo();
          addXP(5);
        }
      });
    }
    function getCameraBasis() {
      const yaw = game.cameraMode === 'first' ? player.yaw : cameraController.yaw;
      const pitch = game.cameraMode === 'first' ? player.pitch : cameraController.pitch;

      const forward = new THREE.Vector3(
        Math.sin(yaw) * Math.cos(pitch),
        Math.sin(pitch),
        Math.cos(yaw) * Math.cos(pitch)
      ).normalize();

      const right = new THREE.Vector3(
        Math.cos(yaw),
        0,
        -Math.sin(yaw)
      ).normalize();

      return { forward, right };
    }

    function getAimDirection() {
      if (game.cameraMode === 'first') {
        const dir = new THREE.Vector3(Math.sin(player.yaw), 0, Math.cos(player.yaw));
        dir.y = Math.tan(player.pitch);
        return dir.normalize();
      }

      const { forward } = getCameraBasis();
      return forward.clone().normalize();
    }

    function resolveCameraCollision(desiredPos, lookTarget) {
      const dir = desiredPos.clone().sub(lookTarget).normalize();
      const maxDist = desiredPos.distanceTo(lookTarget);
      let safeDist = maxDist;

      for (let d = 0; d <= maxDist; d += 0.35) {
        const sample = lookTarget.clone().add(dir.clone().multiplyScalar(d));
        let blocked = false;

        for (const tree of trees) {
          const dx = sample.x - tree.x;
          const dz = sample.z - tree.z;
          const distSq = dx * dx + dz * dz;
          const yMatch = Math.abs(sample.y - (tree.y + 2.2)) < 3.0;
          if (distSq < (tree.radius + cameraController.collisionRadius) * (tree.radius + cameraController.collisionRadius) && yMatch) {
            blocked = true;
            safeDist = Math.max(1.2, d - 0.4);
            break;
          }
        }

        if (blocked) break;
      }

      return lookTarget.clone().add(dir.clone().multiplyScalar(safeDist));
    }

    function updatePlayerFacing() {
      playerModel.rotation.y = THREE.MathUtils.lerp(playerModel.rotation.y, player.yaw, 0.18);
      playerModel.rotation.x = 0;
      playerModel.rotation.z = 0;
    }

    function updateCamera() {
      if (game.cameraMode === 'first') {
        cameraController.yaw = player.yaw;
        cameraController.pitch = player.pitch;
        camera.position.copy(player.position);
        camera.rotation.order = 'YXZ';
        camera.rotation.y = player.yaw;
        camera.rotation.x = player.pitch;
        return;
      }

      playerModel.position.set(player.position.x, player.position.y - player.height, player.position.z);
      updatePlayerFacing();

      const lookTarget = player.position.clone().add(new THREE.Vector3(0, 1.2, 0));
      const { forward } = getCameraBasis();
      const desiredCameraPos = lookTarget.clone().add(forward.clone().multiplyScalar(-cameraController.distance));
      const adjustedCameraPos = resolveCameraCollision(desiredCameraPos, lookTarget);

      cameraController.currentPos.lerp(adjustedCameraPos, cameraController.smoothing);
      camera.position.copy(cameraController.currentPos);
      camera.lookAt(lookTarget);
    }
    function checkWinCondition() {
      if (game.mode === 'adventure' && game.score >= game.maxScore && !game.won && game.active) endGame(true);
      if (game.mode === 'battleroyale' && brPlayers.length === 0 && !game.won && game.active) endGame(true);
    }

    // ============================================================
    //  UI EVENTS
    // ============================================================
    document.querySelectorAll('.mode-card').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.mode-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        game.mode = card.dataset.mode;
      });
    });
    document.getElementById('start-btn').addEventListener('click', () => { startGame(false); });
    document.getElementById('continue-btn').addEventListener('click', () => { startGame(true); });
    document.getElementById('message-btn').addEventListener('click', () => {
      document.getElementById('message').style.display = 'none';
      startGame(false);
    });
    document.getElementById('levelup-continue').addEventListener('click', () => {
      document.getElementById('levelup-screen').style.display = 'none';
      game.active = true;
      canvas.requestPointerLock();
    });
    document.getElementById('skill-close').addEventListener('click', () => { toggleSkillTree(); });
    document.getElementById('camera-toggle-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      toggleCameraMode();
      setTimeout(() => { if (game.active && document.pointerLockElement !== canvas) canvas.requestPointerLock(); }, 100);
    });
    document.getElementById('camera-toggle-btn').addEventListener('mousedown', (e) => e.stopPropagation());
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Show continue button if a save exists
    if (hasSave()) {
      const btn = document.getElementById('continue-btn');
      btn.style.display = 'inline-block';
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        try {
          const data = JSON.parse(raw);
          btn.textContent = `▶ CONTINUE (Level ${data.level || 1})`;
        } catch (e) { }
      }
    }

    animate();
}

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resize();
window.addEventListener('resize', resize);

const audio = {
  level1: document.getElementById('musicLevel1'),
  level2: document.getElementById('musicLevel2'),
  jump: document.getElementById('sfxJump'),
  collect: document.getElementById('sfxCollect'),
  hit: document.getElementById('sfxHit'),
  portal: document.getElementById('sfxPortal'),
  bossDie: document.getElementById('sfxBossDie'),
  bossRoar: document.getElementById('sfxBossRoar'),
  bossStomp: document.getElementById('sfxBossStomp'),
  shockwave: document.getElementById('sfxShockwave'),
};

const bossSong = document.getElementById('bossSong');
let bossMusicPlaying = false;

Object.values(audio).forEach(a => {
  if (a) a.volume = 0.35;
});
if (audio.level1) audio.level1.volume = 0.25;
if (audio.level2) audio.level2.volume = 0.25;
if (audio.bossRoar) audio.bossRoar.volume = 0.45;
if (audio.bossStomp) audio.bossStomp.volume = 0.5;
if (audio.shockwave) audio.shockwave.volume = 0.4;
if (bossSong) bossSong.volume = 0.5;

const STYLE = {
  player: '#59f',
  playerAccent: '#cfe8ff',
  groundTop: '#8c6b3f',
  groundFill: '#5f4427',
  platform: '#7d5a36',
  boss1: '#ff5c6c',
  boss2: '#b86bff',
  enemy: '#ff9a45',
  weaponSword: '#f3f3f3',
  weaponBlaster: '#84ffdc',
  collectible1: '#ffd84d',
  collectible2: '#71ffae',
  portal: '#58e5ff',
  sky1Top: '#6dd0ff',
  sky1Bottom: '#c1f3ff',
  sky2Top: '#28195f',
  sky2Bottom: '#7a4bba',
  bulletFire: '#ff7b4d',
  bulletDark: '#bf7bff',
  bulletFast: '#f7f779',
  treeLeaf: '#4ca85d',
  treeTrunk: '#6e4b27',
  bush: '#4d9b52',
  crystal: '#84e7ff',
  mushroom: '#ff6aa2',
  shockwave1: '#ffd2a6',
  shockwave2: '#d8b7ff'
};

const keys = {};

addEventListener('keydown', e => {
  keys[e.key.toLowerCase()] = true;

  if (e.key.toLowerCase() === 'i') {
    toggleInventory();
  }

  if (!GAME.musicStarted) {
    tryStartMusic();
  }
});

addEventListener('keyup', e => {
  keys[e.key.toLowerCase()] = false;
});

addEventListener('pointerdown', () => {
  if (!GAME.musicStarted) {
    tryStartMusic();
  }
}, { once: true });

const inventoryBtn = document.getElementById('inventoryBtn');
const closeInventoryBtn = document.getElementById('closeInventoryBtn');
const inventoryMenu = document.getElementById('inventoryMenu');
const inventoryGrid = document.getElementById('inventoryGrid');
const restartBtn = document.getElementById('restartBtn');

inventoryBtn.onclick = toggleInventory;
closeInventoryBtn.onclick = toggleInventory;
restartBtn.onclick = () => initGame();

function toggleInventory() {
  inventoryMenu.classList.toggle('open');
  renderInventory();
}

const ALL_ITEMS = [
  { id: 'sunShard', name: 'Осколок Солнца', icon: '☀', level: 1, desc: 'Спрятан в светлом мире.' },
  { id: 'leafRelic', name: 'Лиственный Реликт', icon: '❀', level: 1, desc: 'Спрятан среди холмов.' },
  { id: 'moonGem', name: 'Лунный Камень', icon: '☾', level: 2, desc: 'Сияет в фиолетовом мире.' },
  { id: 'starCore', name: 'Ядро Звезды', icon: '✦', level: 2, desc: 'Редкий предмет после босса.' },
];

const WEAPON_TYPES = {
  sword: { name: 'Стальной меч', damage: 18, range: 38, cooldown: 20, type: 'melee' },
  axe: { name: 'Тяжёлый топор', damage: 28, range: 30, cooldown: 34, type: 'melee' },
  blaster: { name: 'Кристальный бластер', damage: 16, cooldown: 26, type: 'ranged', bulletSpeed: 10, bulletSize: 7 },
  bow: { name: 'Лук странника', damage: 12, cooldown: 16, type: 'ranged', bulletSpeed: 12, bulletSize: 5 },
};

const GAME = {
  gravity: 0.55,
  friction: 0.82,
  levelIndex: 0,
  levels: [],
  worldWidth: 4200,
  foundItems: new Set(),
  foundWeapons: new Set(),
  musicStarted: false,
  gameOver: false,
  victory: false,
};

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function generateTerrain(worldWidth, baseY, segmentW, minY, maxY) {
  const points = [];
  let x = 0;
  let y = baseY;
  points.push({ x, y });
  while (x < worldWidth) {
    x += segmentW;
    y += rand(-90, 90);
    y = Math.max(minY, Math.min(maxY, y));
    points.push({ x, y });
  }
  return points;
}

function terrainHeightAt(points, x) {
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    if (x >= a.x && x <= b.x) {
      const t = (x - a.x) / (b.x - a.x);
      return a.y + (b.y - a.y) * t;
    }
  }
  return points[points.length - 1].y;
}

function makeDecorLevel1(worldWidth) {
  const decor = [];
  for (let x = 180; x < worldWidth - 200; x += 220) {
    decor.push({ kind: 'tree', x, scale: 0.8 + (x % 3) * 0.15 });
  }
  for (let x = 90; x < worldWidth - 120; x += 140) {
    decor.push({ kind: 'bush', x, scale: 0.8 + ((x / 10) % 2) * 0.2 });
  }
  for (let x = 420; x < worldWidth - 120; x += 310) {
    decor.push({ kind: 'mushroom', x, scale: 0.9 + ((x / 5) % 2) * 0.15 });
  }
  for (let x = 760; x < worldWidth - 120; x += 520) {
    decor.push({ kind: 'rock', x, scale: 1 + ((x / 7) % 2) * 0.25 });
  }
  return decor;
}

function makeDecorLevel2(worldWidth) {
  const decor = [];
  for (let x = 260; x < worldWidth - 140; x += 280) {
    decor.push({ kind: 'crystal', x, scale: 0.9 + (x % 4) * 0.1 });
  }
  for (let x = 130; x < worldWidth - 140; x += 400) {
    decor.push({ kind: 'spikeStone', x, scale: 0.8 + (x % 2) * 0.3 });
  }
  return decor;
}

function makeLevel(index) {
  const isLevel2 = index === 1;
  const worldWidth = isLevel2 ? 5000 : 4200;

  const terrain = generateTerrain(
    worldWidth,
    isLevel2 ? canvas.height * 0.72 : canvas.height * 0.74,
    140,
    canvas.height * 0.50,
    canvas.height * 0.82
  );

  const platforms = isLevel2
    ? [
        { x: 900, y: canvas.height * 0.55, w: 160, h: 20 },
        { x: 1450, y: canvas.height * 0.48, w: 180, h: 20 },
        { x: 2000, y: canvas.height * 0.52, w: 160, h: 20 },
        { x: 2500, y: canvas.height * 0.44, w: 160, h: 20 },
        { x: 3050, y: canvas.height * 0.5, w: 200, h: 20 },
      ]
    : [
        { x: 700, y: canvas.height * 0.57, w: 170, h: 20 },
        { x: 1280, y: canvas.height * 0.5, w: 170, h: 20 },
        { x: 1900, y: canvas.height * 0.6, w: 160, h: 20 },
        { x: 2480, y: canvas.height * 0.46, w: 200, h: 20 },
      ];

  const boss = isLevel2
    ? {
        x: worldWidth - 520,
        y: 0,
        w: 120,
        h: 120,
        hp: 260,
        maxHp: 260,
        speed: 2.1,
        dir: -1,
        alive: true,
        type: 2,
        shootCooldown: 80,
        slashCooldown: 40,
        stompCooldown: 240,
        roarTimer: 0,
        isPreparingStomp: false,
        isJumpingForStomp: false,
        vy: 0,
        onGround: true,
        justLanded: false
      }
    : {
        x: worldWidth - 420,
        y: 0,
        w: 110,
        h: 110,
        hp: 170,
        maxHp: 170,
        speed: 1.7,
        dir: -1,
        alive: true,
        type: 1,
        shootCooldown: 90,
        slashCooldown: 46,
        stompCooldown: 280,
        roarTimer: 0,
        isPreparingStomp: false,
        isJumpingForStomp: false,
        vy: 0,
        onGround: true,
        justLanded: false
      };

  const collectibles = ALL_ITEMS
    .filter(item => item.level === index + 1)
    .map((item, i) => ({
      ...item,
      x: isLevel2 ? 1100 + i * 1200 : 600 + i * 1450,
      y: isLevel2 ? canvas.height * (0.36 + i * 0.1) : canvas.height * (0.42 + i * 0.08),
      found: false,
      r: 18,
    }));

  const weapons = isLevel2
    ? [
        { id: 'blaster', type: 'blaster', x: 1200, y: 0, picked: false },
        { id: 'axe', type: 'axe', x: 2860, y: 0, picked: false },
      ]
    : [
        { id: 'sword', type: 'sword', x: 560, y: 0, picked: false },
        { id: 'bow', type: 'bow', x: 2140, y: 0, picked: false },
      ];

  const miniEnemies = isLevel2
    ? [
        { x: 780, y: 0, w: 52, h: 58, hp: 35, maxHp: 35, dir: 1, speed: 1.2, alive: true, range: 120 },
        { x: 1860, y: 0, w: 52, h: 58, hp: 40, maxHp: 40, dir: -1, speed: 1.3, alive: true, range: 140 },
        { x: 3180, y: 0, w: 58, h: 62, hp: 45, maxHp: 45, dir: 1, speed: 1.35, alive: true, range: 150 },
      ]
    : [
        { x: 860, y: 0, w: 46, h: 52, hp: 28, maxHp: 28, dir: 1, speed: 1.05, alive: true, range: 110 },
        { x: 1540, y: 0, w: 48, h: 54, hp: 32, maxHp: 32, dir: -1, speed: 1.1, alive: true, range: 120 },
        { x: 2740, y: 0, w: 50, h: 56, hp: 34, maxHp: 34, dir: 1, speed: 1.15, alive: true, range: 130 },
      ];

  const portal = {
    x: worldWidth - 160,
    y: 0,
    w: 70,
    h: 110,
    active: false,
  };

  return {
    index,
    name: `Уровень ${index + 1}`,
    worldWidth,
    terrain,
    platforms,
    boss,
    portal,
    collectibles,
    weapons,
    miniEnemies,
    bullets: [],
    enemyBullets: [],
    shockwaves: [],
    background: isLevel2 ? 2 : 1,
    decor: isLevel2 ? makeDecorLevel2(worldWidth) : makeDecorLevel1(worldWidth),
    music: isLevel2 ? 'level2' : 'level1',
  };
}

let player;
let cameraX;

function initGame() {
  GAME.levels = [makeLevel(0), makeLevel(1)];
  GAME.levelIndex = 0;
  GAME.foundItems = new Set();
  GAME.foundWeapons = new Set();
  GAME.gameOver = false;
  GAME.victory = false;
  GAME.musicStarted = false;

  player = {
    x: 120,
    y: 100,
    w: 44,
    h: 64,
    vx: 0,
    vy: 0,
    speed: 0.95,
    jumpForce: -13.5,
    onGround: false,
    hp: 100,
    invuln: 0,
    attackCooldown: 0,
    facing: 1,
    currentWeapon: 'sword',
  };

  cameraX = 0;
  bossMusicPlaying = false;

  stopAllMusic();

  if (bossSong) {
    bossSong.pause();
    bossSong.currentTime = 0;
  }

  renderInventory();
  updateHUD();
}

function stopAllMusic() {
  if (audio.level1) {
    audio.level1.pause();
    audio.level1.currentTime = 0;
  }

  if (audio.level2) {
    audio.level2.pause();
    audio.level2.currentTime = 0;
  }
}

function tryStartMusic() {
  if (GAME.gameOver) return;
  if (GAME.musicStarted) return;
  if (bossMusicPlaying) return;

  const level = GAME.levels[GAME.levelIndex];
  if (!level) return;

  const track = audio[level.music];
  if (!track) return;

  track.currentTime = 0;
  track.play().catch(() => {});
  GAME.musicStarted = true;
}

function switchToLevel(nextIndex) {
  if (nextIndex >= GAME.levels.length) {
    GAME.victory = true;
    GAME.gameOver = true;
    stopAllMusic();

    if (bossSong) {
      bossSong.pause();
      bossSong.currentTime = 0;
    }

    bossMusicPlaying = false;
    updateHUD();
    return;
  }

  GAME.levelIndex = nextIndex;
  const level = GAME.levels[GAME.levelIndex];

  player.x = 120;
  player.y = 100;
  player.vx = 0;
  player.vy = 0;
  cameraX = 0;

  stopAllMusic();
  GAME.musicStarted = false;

  if (bossSong) {
    bossSong.pause();
    bossSong.currentTime = 0;
  }

  bossMusicPlaying = false;

  const track = audio[level.music];
  if (track) {
    track.currentTime = 0;
    track.play().catch(() => {});
    GAME.musicStarted = true;
  }

  updateHUD();
}

function currentLevel() {
  return GAME.levels[GAME.levelIndex];
}

function playSound(sound) {
  if (!sound) return;
  sound.currentTime = 0;
  sound.play().catch(() => {});
}

function rectsIntersect(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function damagePlayer(amount, knockX = 0, knockY = -5) {
  if (player.invuln > 0) return;
  player.hp -= amount;
  player.invuln = 45;
  player.vx += knockX;
  player.vy = knockY;
  playSound(audio.hit);
}

function getPlayerWeapon() {
  return WEAPON_TYPES[player.currentWeapon] || WEAPON_TYPES.sword;
}

function tryPlayerAttack(level) {
  if (player.attackCooldown > 0) return;
  const weapon = getPlayerWeapon();
  player.attackCooldown = weapon.cooldown;

  if (weapon.type === 'melee') {
    const attackBox = {
      x: player.facing > 0 ? player.x + player.w : player.x - weapon.range,
      y: player.y + 8,
      w: weapon.range,
      h: player.h - 16,
    };

    if (level.boss.alive && rectsIntersect(attackBox, level.boss)) {
      level.boss.hp -= weapon.damage;
      playSound(audio.hit);
      if (level.boss.hp <= 0) {
        level.boss.alive = false;
        level.portal.active = true;
        playSound(audio.bossDie);
      }
    }

    for (const enemy of level.miniEnemies) {
      if (!enemy.alive) continue;
      if (rectsIntersect(attackBox, enemy)) {
        enemy.hp -= weapon.damage;
        playSound(audio.hit);
        if (enemy.hp <= 0) enemy.alive = false;
      }
    }
  } else {
    level.bullets.push({
      x: player.facing > 0 ? player.x + player.w : player.x,
      y: player.y + player.h * 0.45,
      vx: player.facing * weapon.bulletSpeed,
      vy: 0,
      size: weapon.bulletSize,
      damage: weapon.damage,
      life: 80,
      color: player.currentWeapon === 'bow' ? STYLE.bulletFast : STYLE.weaponBlaster,
    });
  }
}

function updatePlayerCollision(level) {
  player.onGround = false;

  for (const p of level.platforms) {
    const prevBottom = player.y - player.vy + player.h;
    const nowBottom = player.y + player.h;
    const horizontal = player.x + player.w > p.x && player.x < p.x + p.w;

    if (horizontal && prevBottom <= p.y && nowBottom >= p.y && player.vy >= 0) {
      player.y = p.y - player.h;
      player.vy = 0;
      player.onGround = true;
    }
  }

  const footX1 = player.x + 8;
  const footX2 = player.x + player.w - 8;
  const groundY1 = terrainHeightAt(level.terrain, footX1);
  const groundY2 = terrainHeightAt(level.terrain, footX2);
  const groundY = Math.min(groundY1, groundY2);

  if (player.y + player.h >= groundY && player.vy >= 0) {
    player.y = groundY - player.h;
    player.vy = 0;
    player.onGround = true;
  }
}

function updateMiniEnemies(level) {
  for (const enemy of level.miniEnemies) {
    if (!enemy.alive) continue;

    const anchor = enemy.anchorX ?? enemy.x;
    enemy.anchorX = anchor;
    enemy.x += enemy.dir * enemy.speed;

    if (enemy.x > anchor + enemy.range || enemy.x < anchor - enemy.range) {
      enemy.dir *= -1;
    }

    const gy = terrainHeightAt(level.terrain, enemy.x + enemy.w * 0.5);
    enemy.y = gy - enemy.h;

    if (Math.abs(player.x - enemy.x) < 180) {
      enemy.dir = player.x < enemy.x ? -1 : 1;
      enemy.x += enemy.dir * enemy.speed * 0.5;
    }

    if (rectsIntersect(player, enemy)) {
      damagePlayer(8, player.x < enemy.x ? -5 : 5, -4);
    }
  }
}

function makeBossProjectile(level, boss, type, towardPlayer = true) {
  const dir = towardPlayer ? (player.x < boss.x ? -1 : 1) : boss.dir;

  if (type === 'spread') {
    [-0.45, 0, 0.45].forEach(angleVy => {
      level.enemyBullets.push({
        x: boss.x + boss.w / 2,
        y: boss.y + boss.h * 0.4,
        vx: dir * 6.5,
        vy: angleVy * 6,
        size: 8,
        damage: 11,
        life: 110,
        color: boss.type === 1 ? STYLE.bulletFire : STYLE.bulletDark,
      });
    });
  } else if (type === 'fast') {
    level.enemyBullets.push({
      x: boss.x + boss.w / 2,
      y: boss.y + boss.h * 0.35,
      vx: dir * 11,
      vy: 0,
      size: 6,
      damage: 14,
      life: 80,
      color: STYLE.bulletFast,
    });
  } else {
    level.enemyBullets.push({
      x: boss.x + boss.w / 2,
      y: boss.y + boss.h * 0.4,
      vx: dir * 7.5,
      vy: -1.5,
      size: 10,
      damage: 12,
      life: 100,
      color: boss.type === 1 ? STYLE.bulletFire : STYLE.bulletDark,
    });
  }
}

function spawnShockwave(level, boss) {
  const color = boss.type === 1 ? STYLE.shockwave1 : STYLE.shockwave2;
  const y = boss.y + boss.h - 14;

  level.shockwaves.push({
    x: boss.x + boss.w / 2,
    y,
    vx: -7.5,
    w: 48,
    h: 18,
    damage: boss.type === 1 ? 14 : 18,
    life: 90,
    color
  });

  level.shockwaves.push({
    x: boss.x + boss.w / 2,
    y,
    vx: 7.5,
    w: 48,
    h: 18,
    damage: boss.type === 1 ? 14 : 18,
    life: 90,
    color
  });

  playSound(audio.shockwave);
}

function updateBoss(level) {
  const boss = level.boss;
  if (!boss.alive) return;

  boss.justLanded = false;

  const groundY = terrainHeightAt(level.terrain, boss.x + boss.w * 0.5);
  const targetY = groundY - boss.h;

  if (boss.isJumpingForStomp) {
    boss.vy += GAME.gravity * 1.2;
    boss.y += boss.vy;

    if (boss.y >= targetY) {
      boss.y = targetY;
      boss.vy = 0;
      boss.isJumpingForStomp = false;
      boss.onGround = true;
      boss.justLanded = true;
      playSound(audio.bossStomp);
      spawnShockwave(level, boss);
      boss.stompCooldown = boss.type === 1 ? 260 : 210;
    }
  } else {
    boss.y = targetY;
    boss.onGround = true;
  }

  const dist = player.x - boss.x;

  if (!boss.isPreparingStomp && !boss.isJumpingForStomp) {
    if (Math.abs(dist) < 600) {
      boss.dir = dist < 0 ? -1 : 1;
      boss.x += boss.dir * boss.speed;
    }
  }

  boss.shootCooldown--;
  boss.slashCooldown--;
  boss.stompCooldown--;

  if (!boss.isJumpingForStomp && !boss.isPreparingStomp) {
    const shouldPrepareStomp =
      Math.abs(dist) < (boss.type === 1 ? 240 : 300) &&
      boss.stompCooldown <= 0;

    if (shouldPrepareStomp) {
      boss.isPreparingStomp = true;
      boss.roarTimer = boss.type === 1 ? 45 : 35;
      playSound(audio.bossRoar);
    }
  }

  if (boss.isPreparingStomp) {
    boss.roarTimer--;

    if (boss.roarTimer <= 0) {
      boss.isPreparingStomp = false;
      boss.isJumpingForStomp = true;
      boss.onGround = false;
      boss.vy = boss.type === 1 ? -10.5 : -12.5;

      if (Math.abs(dist) > 40) {
        boss.dir = dist < 0 ? -1 : 1;
        boss.x += boss.dir * (boss.type === 1 ? 30 : 42);
      }
    }
  }

  if (!boss.isPreparingStomp && !boss.isJumpingForStomp && Math.abs(dist) < 420 && boss.shootCooldown <= 0) {
    if (boss.type === 1) {
      makeBossProjectile(level, boss, Math.random() < 0.5 ? 'normal' : 'spread');
      boss.shootCooldown = 72;
    } else {
      makeBossProjectile(level, boss, Math.random() < 0.55 ? 'fast' : 'spread');
      boss.shootCooldown = 58;
    }
  }

  const slashRange = boss.type === 1 ? 70 : 92;
  const slashBox = {
    x: boss.dir > 0 ? boss.x + boss.w : boss.x - slashRange,
    y: boss.y + 18,
    w: slashRange,
    h: boss.h - 26,
  };

  if (!boss.isPreparingStomp && boss.slashCooldown <= 0 && rectsIntersect(player, slashBox)) {
    damagePlayer(boss.type === 1 ? 16 : 22, player.x < boss.x ? -8 : 8, -6);
    boss.slashCooldown = boss.type === 1 ? 44 : 34;
  }

  if (rectsIntersect(player, boss)) {
    damagePlayer(12, player.x < boss.x ? -7 : 7, -5);
  }

  if (boss.justLanded && Math.abs(player.x - boss.x) < (boss.type === 1 ? 140 : 180)) {
    damagePlayer(boss.type === 1 ? 12 : 18, player.x < boss.x ? -8 : 8, -7);
  }
}

function updateBossMusic(boss) {
  if (!bossSong || !boss) return;

  const dist = Math.abs(player.x - boss.x);

  if (boss.alive && dist < 500) {
    if (!bossMusicPlaying) {
      bossMusicPlaying = true;

      if (audio.level1) audio.level1.pause();
      if (audio.level2) audio.level2.pause();

      const p = bossSong.play();
      if (p && p.catch) p.catch(() => {});
    }
  } else {
    if (bossMusicPlaying) {
      bossMusicPlaying = false;
      bossSong.pause();
      bossSong.currentTime = 0;

      if (!GAME.gameOver) {
        const level = currentLevel();
        const track = audio[level.music];
        if (track) {
          track.play().catch(() => {});
        }
      }
    }
  }
}

function updatePlayerBullets(level) {
  for (let i = level.bullets.length - 1; i >= 0; i--) {
    const b = level.bullets[i];
    b.x += b.vx;
    b.y += b.vy;
    b.life--;

    if (b.life <= 0) {
      level.bullets.splice(i, 1);
      continue;
    }

    if (
      level.boss.alive &&
      b.x > level.boss.x && b.x < level.boss.x + level.boss.w &&
      b.y > level.boss.y && b.y < level.boss.y + level.boss.h
    ) {
      level.boss.hp -= b.damage;
      level.bullets.splice(i, 1);
      playSound(audio.hit);

      if (level.boss.hp <= 0) {
        level.boss.alive = false;
        level.portal.active = true;
        playSound(audio.bossDie);
      }
      continue;
    }

    let remove = false;
    for (const enemy of level.miniEnemies) {
      if (!enemy.alive) continue;
      if (b.x > enemy.x && b.x < enemy.x + enemy.w && b.y > enemy.y && b.y < enemy.y + enemy.h) {
        enemy.hp -= b.damage;
        remove = true;
        playSound(audio.hit);
        if (enemy.hp <= 0) enemy.alive = false;
        break;
      }
    }

    if (remove) level.bullets.splice(i, 1);
  }
}

function updateEnemyBullets(level) {
  for (let i = level.enemyBullets.length - 1; i >= 0; i--) {
    const b = level.enemyBullets[i];
    b.x += b.vx;
    b.y += b.vy;
    b.life--;

    if (b.life <= 0) {
      level.enemyBullets.splice(i, 1);
      continue;
    }

    if (b.x > player.x && b.x < player.x + player.w && b.y > player.y && b.y < player.y + player.h) {
      damagePlayer(b.damage, b.vx > 0 ? 5 : -5, -4);
      level.enemyBullets.splice(i, 1);
    }
  }
}

function updateShockwaves(level) {
  for (let i = level.shockwaves.length - 1; i >= 0; i--) {
    const s = level.shockwaves[i];
    s.x += s.vx;
    s.life--;

    if (s.life <= 0) {
      level.shockwaves.splice(i, 1);
      continue;
    }

    const hitbox = {
      x: s.x - s.w / 2,
      y: s.y - s.h / 2,
      w: s.w,
      h: s.h
    };

    if (rectsIntersect(player, hitbox)) {
      damagePlayer(s.damage, s.vx > 0 ? 8 : -8, -5);
      level.shockwaves.splice(i, 1);
    }
  }
}

function updateWeaponsPickup(level) {
  for (const weapon of level.weapons) {
    const gy = terrainHeightAt(level.terrain, weapon.x);
    weapon.y = gy - 30;

    if (weapon.picked) continue;

    const pickupRect = { x: weapon.x - 16, y: weapon.y - 8, w: 32, h: 32 };
    if (rectsIntersect(player, pickupRect)) {
      weapon.picked = true;
      player.currentWeapon = weapon.type;
      GAME.foundWeapons.add(weapon.type);
      playSound(audio.collect);
    }
  }
}

function updateCollectibles(level) {
  for (const item of level.collectibles) {
    if (item.found) continue;

    const dx = (player.x + player.w / 2) - item.x;
    const dy = (player.y + player.h / 2) - item.y;

    if (Math.hypot(dx, dy) < 36) {
      item.found = true;
      GAME.foundItems.add(item.id);
      playSound(audio.collect);
      renderInventory();
    }
  }
}

function update() {
  if (inventoryMenu.classList.contains('open')) return;
  if (GAME.gameOver) return;

  const level = currentLevel();

  player.attackCooldown = Math.max(0, player.attackCooldown - 1);
  player.invuln = Math.max(0, player.invuln - 1);

  if (keys['a']) {
    player.vx -= player.speed;
    player.facing = -1;
  }
  if (keys['d']) {
    player.vx += player.speed;
    player.facing = 1;
  }

  if ((keys['w'] || keys[' ']) && player.onGround) {
    player.vy = player.jumpForce;
    player.onGround = false;
    playSound(audio.jump);
  }

  if (keys['f']) tryPlayerAttack(level);
  if (keys['1']) player.currentWeapon = 'sword';
  if (keys['2'] && GAME.foundWeapons.has('bow')) player.currentWeapon = 'bow';
  if (keys['3'] && GAME.foundWeapons.has('blaster')) player.currentWeapon = 'blaster';
  if (keys['4'] && GAME.foundWeapons.has('axe')) player.currentWeapon = 'axe';

  player.vx *= GAME.friction;
  player.vy += GAME.gravity;
  player.x += player.vx;
  player.y += player.vy;

  updatePlayerCollision(level);

  player.x = Math.max(0, Math.min(level.worldWidth - player.w, player.x));
  if (player.y > canvas.height + 300) player.hp = 0;

  updateBoss(level);
  updateBossMusic(level.boss);
  updateMiniEnemies(level);
  updatePlayerBullets(level);
  updateEnemyBullets(level);
  updateShockwaves(level);
  updateWeaponsPickup(level);
  updateCollectibles(level);

  const portalGround = terrainHeightAt(level.terrain, level.portal.x + level.portal.w / 2);
  level.portal.y = portalGround - level.portal.h;

  if (level.portal.active && rectsIntersect(player, level.portal)) {
    playSound(audio.portal);
    switchToLevel(GAME.levelIndex + 1);
  }

  if (player.hp <= 0) {
    GAME.gameOver = true;
    GAME.victory = false;
    stopAllMusic();

    if (bossSong) {
      bossSong.pause();
      bossSong.currentTime = 0;
    }
  }

  cameraX = player.x - canvas.width * 0.35;
  cameraX = Math.max(0, Math.min(level.worldWidth - canvas.width, cameraX));
  updateHUD();
}

function updateHUD() {
  const level = currentLevel();
  const foundNow = GAME.levels.flatMap(l => l.collectibles).filter(i => i.found).length;
  const total = GAME.levels.flatMap(l => l.collectibles).length;

  document.getElementById('levelInfo').textContent =
    `Уровень: ${GAME.levelIndex + 1} | Оружие: ${getPlayerWeapon().name}`;
  document.getElementById('hpInfo').textContent =
    `HP: ${Math.max(0, player.hp)}`;
  document.getElementById('bossInfo').textContent = GAME.gameOver
    ? (GAME.victory ? 'Все боссы побеждены' : 'Игрок побеждён')
    : `Босс: ${level.boss.alive ? level.boss.hp + ' HP' : 'побеждён'} | Мини-враги: ${level.miniEnemies.filter(e => e.alive).length}`;
  document.getElementById('collectInfo').textContent =
    `Предметы: ${foundNow} / ${total}`;
}

function renderInventory() {
  inventoryGrid.innerHTML = '';

  for (const item of ALL_ITEMS) {
    const found = GAME.foundItems.has(item.id);
    const card = document.createElement('div');
    card.className = `itemCard ${found ? 'found' : 'missing'}`;
    card.innerHTML = `
      <div class="itemIcon" style="background:${found ? 'rgba(100,255,160,0.18)' : 'rgba(255,255,255,0.08)'}">${found ? item.icon : '?'}</div>
      <div style="font-weight:700;">${found ? item.name : 'Не найдено'}</div>
      <div style="font-size:13px; opacity:0.8;">${found ? item.desc : 'Этот предмет ещё не собран.'}</div>
      <div style="font-size:12px; opacity:0.65;">Уровень ${item.level}</div>
    `;
    inventoryGrid.appendChild(card);
  }

  for (const [key, weapon] of Object.entries(WEAPON_TYPES)) {
    const found = key === 'sword' || GAME.foundWeapons.has(key);
    const card = document.createElement('div');
    card.className = `itemCard ${found ? 'found' : 'missing'}`;
    card.innerHTML = `
      <div class="itemIcon" style="background:${found ? 'rgba(120,210,255,0.18)' : 'rgba(255,255,255,0.08)'}">⚔</div>
      <div style="font-weight:700;">${found ? weapon.name : 'Оружие не найдено'}</div>
      <div style="font-size:13px; opacity:0.8;">${weapon.type === 'melee' ? 'Ближний бой' : 'Дальний бой'}</div>
      <div style="font-size:12px; opacity:0.65;">Урон: ${weapon.damage}</div>
    `;
    inventoryGrid.appendChild(card);
  }
}

function drawBackground(level) {
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);

  if (level.background === 1) {
    grad.addColorStop(0, STYLE.sky1Top);
    grad.addColorStop(1, STYLE.sky1Bottom);
  } else {
    grad.addColorStop(0, STYLE.sky2Top);
    grad.addColorStop(1, STYLE.sky2Bottom);
  }

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < 6; i++) {
    const offset = (i * 280 - (cameraX * (level.background === 1 ? 0.15 : 0.08))) % (canvas.width + 300);
    ctx.beginPath();
    ctx.ellipse(offset, canvas.height * 0.78, 230, 90, 0, 0, Math.PI * 2);
    ctx.fillStyle = level.background === 1 ? 'rgba(80,140,110,0.25)' : 'rgba(30,10,60,0.35)';
    ctx.fill();
  }

  if (level.background === 2) {
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    for (let i = 0; i < 60; i++) {
      const x = ((i * 137) - cameraX * 0.06) % canvas.width;
      const y = (i * 53) % (canvas.height * 0.55);
      ctx.fillRect(x, y, 2, 2);
    }
  }
}

function drawDecor(level) {
  for (const d of level.decor) {
    const y = terrainHeightAt(level.terrain, d.x);
    const x = d.x - cameraX;
    ctx.save();

    if (d.kind === 'tree') {
      ctx.fillStyle = STYLE.treeTrunk;
      ctx.fillRect(x - 8 * d.scale, y - 55 * d.scale, 16 * d.scale, 55 * d.scale);
      ctx.fillStyle = STYLE.treeLeaf;
      ctx.beginPath();
      ctx.arc(x, y - 76 * d.scale, 26 * d.scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x - 18 * d.scale, y - 60 * d.scale, 19 * d.scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + 18 * d.scale, y - 60 * d.scale, 19 * d.scale, 0, Math.PI * 2);
      ctx.fill();
    } else if (d.kind === 'bush') {
      ctx.fillStyle = STYLE.bush;
      ctx.beginPath();
      ctx.arc(x - 12 * d.scale, y - 10 * d.scale, 14 * d.scale, 0, Math.PI * 2);
      ctx.arc(x + 3 * d.scale, y - 12 * d.scale, 16 * d.scale, 0, Math.PI * 2);
      ctx.arc(x + 18 * d.scale, y - 8 * d.scale, 12 * d.scale, 0, Math.PI * 2);
      ctx.fill();
    } else if (d.kind === 'mushroom') {
      ctx.fillStyle = '#f4d6c0';
      ctx.fillRect(x - 4 * d.scale, y - 18 * d.scale, 8 * d.scale, 18 * d.scale);
      ctx.fillStyle = STYLE.mushroom;
      ctx.beginPath();
      ctx.arc(x, y - 20 * d.scale, 14 * d.scale, Math.PI, 0);
      ctx.fill();
    } else if (d.kind === 'rock') {
      ctx.fillStyle = '#7a7a82';
      ctx.beginPath();
      ctx.moveTo(x - 18 * d.scale, y - 2);
      ctx.lineTo(x - 7 * d.scale, y - 22 * d.scale);
      ctx.lineTo(x + 16 * d.scale, y - 18 * d.scale);
      ctx.lineTo(x + 20 * d.scale, y - 2);
      ctx.closePath();
      ctx.fill();
    } else if (d.kind === 'crystal') {
      ctx.fillStyle = STYLE.crystal;
      ctx.beginPath();
      ctx.moveTo(x, y - 34 * d.scale);
      ctx.lineTo(x + 12 * d.scale, y - 8 * d.scale);
      ctx.lineTo(x + 6 * d.scale, y);
      ctx.lineTo(x - 7 * d.scale, y - 4 * d.scale);
      ctx.lineTo(x - 12 * d.scale, y - 16 * d.scale);
      ctx.closePath();
      ctx.fill();
    } else if (d.kind === 'spikeStone') {
      ctx.fillStyle = '#5a4e78';
      ctx.beginPath();
      ctx.moveTo(x - 18 * d.scale, y);
      ctx.lineTo(x - 8 * d.scale, y - 24 * d.scale);
      ctx.lineTo(x, y - 10 * d.scale);
      ctx.lineTo(x + 11 * d.scale, y - 34 * d.scale);
      ctx.lineTo(x + 22 * d.scale, y);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }
}

function drawTerrain(level) {
  ctx.beginPath();
  ctx.moveTo(level.terrain[0].x - cameraX, canvas.height);
  for (const p of level.terrain) ctx.lineTo(p.x - cameraX, p.y);
  ctx.lineTo(level.terrain[level.terrain.length - 1].x - cameraX, canvas.height);
  ctx.closePath();
  ctx.fillStyle = STYLE.groundFill;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(level.terrain[0].x - cameraX, level.terrain[0].y);
  for (const p of level.terrain) ctx.lineTo(p.x - cameraX, p.y);
  ctx.strokeStyle = STYLE.groundTop;
  ctx.lineWidth = 10;
  ctx.stroke();
}

function drawPlatforms(level) {
  ctx.fillStyle = STYLE.platform;
  for (const p of level.platforms) {
    ctx.fillRect(p.x - cameraX, p.y, p.w, p.h);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(p.x - cameraX, p.y, p.w, 4);
    ctx.fillStyle = STYLE.platform;
  }
}

function drawPlayer() {
  const blink = player.invuln > 0 && Math.floor(player.invuln / 4) % 2 === 0;
  if (blink) return;

  ctx.fillStyle = STYLE.player;
  ctx.fillRect(player.x - cameraX, player.y, player.w, player.h);

  ctx.fillStyle = STYLE.playerAccent;
  ctx.fillRect(player.x - cameraX + 8, player.y + 10, 10, 10);
  ctx.fillRect(player.x - cameraX + 26, player.y + 10, 10, 10);

  const wx = player.facing > 0 ? player.x - cameraX + player.w : player.x - cameraX - 10;
  ctx.fillStyle = getPlayerWeapon().type === 'melee' ? STYLE.weaponSword : STYLE.weaponBlaster;
  ctx.fillRect(wx, player.y + 24, 12, 5);
}

function drawBoss(level) {
  const b = level.boss;
  if (!b.alive) return;

  const bossColor = b.type === 1 ? STYLE.boss1 : STYLE.boss2;
  ctx.fillStyle = bossColor;
  ctx.fillRect(b.x - cameraX, b.y, b.w, b.h);

  if (b.isPreparingStomp) {
    ctx.strokeStyle = '#fff6a8';
    ctx.lineWidth = 4;
    ctx.strokeRect(b.x - cameraX - 4, b.y - 4, b.w + 8, b.h + 8);
  }

  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fillRect(b.x - cameraX + 16, b.y + 20, 14, 14);
  ctx.fillRect(b.x - cameraX + b.w - 30, b.y + 20, 14, 14);

  ctx.fillStyle = '#201820';
  ctx.fillRect(b.x - cameraX + (b.dir > 0 ? b.w : -14), b.y + 45, 14, 6);

  const barW = 140;
  const ratio = Math.max(0, b.hp / b.maxHp);

  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(b.x - cameraX + (b.w - barW) / 2, b.y - 18, barW, 10);

  ctx.fillStyle = '#ff5252';
  ctx.fillRect(b.x - cameraX + (b.w - barW) / 2, b.y - 18, barW * ratio, 10);
}

function drawMiniEnemies(level) {
  for (const e of level.miniEnemies) {
    if (!e.alive) continue;
    ctx.fillStyle = STYLE.enemy;
    ctx.fillRect(e.x - cameraX, e.y, e.w, e.h);
    ctx.fillStyle = '#fff';
    ctx.fillRect(e.x - cameraX + 8, e.y + 10, 8, 8);
    ctx.fillRect(e.x - cameraX + e.w - 16, e.y + 10, 8, 8);
  }
}

function drawWeapons(level) {
  for (const w of level.weapons) {
    if (w.picked) continue;
    const x = w.x - cameraX;
    const y = w.y + Math.sin(Date.now() / 220 + w.x) * 4;
    ctx.fillStyle = WEAPON_TYPES[w.type].type === 'melee' ? STYLE.weaponSword : STYLE.weaponBlaster;
    ctx.fillRect(x - 12, y - 8, 24, 6);
    ctx.fillStyle = '#111';
    ctx.fillRect(x - 2, y - 12, 4, 18);
  }
}

function drawCollectibles(level) {
  for (const item of level.collectibles) {
    if (item.found) continue;
    ctx.beginPath();
    ctx.arc(item.x - cameraX, item.y + Math.sin(Date.now() / 250 + item.x) * 5, item.r, 0, Math.PI * 2);
    ctx.fillStyle = level.index === 0 ? STYLE.collectible1 : STYLE.collectible2;
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(item.icon, item.x - cameraX, item.y + 6);
  }
}

function drawBullets(level) {
  for (const b of level.bullets) {
    ctx.fillStyle = b.color;
    ctx.beginPath();
    ctx.arc(b.x - cameraX, b.y, b.size, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const b of level.enemyBullets) {
    ctx.fillStyle = b.color;
    ctx.beginPath();
    ctx.arc(b.x - cameraX, b.y, b.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawShockwaves(level) {
  for (const s of level.shockwaves) {
    ctx.fillStyle = s.color;
    ctx.fillRect(s.x - cameraX - s.w / 2, s.y - s.h / 2, s.w, s.h);

    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(s.x - cameraX - s.w / 2, s.y - s.h / 2, s.w, s.h);
  }
}

function drawPortal(level) {
  if (!level.portal.active) return;

  const p = level.portal;
  const x = p.x - cameraX;
  const y = p.y;
  const pulse = 0.75 + Math.sin(Date.now() / 180) * 0.25;

  ctx.save();
  ctx.globalAlpha = pulse;
  ctx.fillStyle = STYLE.portal;
  ctx.beginPath();
  ctx.ellipse(x + p.w / 2, y + p.h / 2, p.w / 2, p.h / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = '#d7fbff';
  ctx.lineWidth = 4;
  ctx.strokeRect(x, y, p.w, p.h);
}

function drawOverlayText() {
  if (!GAME.gameOver) {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('F — атака, 1/2/3/4 — смена оружия, I — инвентарь', canvas.width / 2, 34);
    return;
  }

  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.font = 'bold 42px Arial';
  ctx.fillText(GAME.victory ? 'ПОБЕДА!' : 'ПОРАЖЕНИЕ', canvas.width / 2, canvas.height / 2 - 20);

  ctx.font = '20px Arial';
  ctx.fillText(
    GAME.victory
      ? 'Ты прошёл оба уровня и победил всех боссов.'
      : 'ты крутой ты прошел 2 уровня 67676767.',
    canvas.width / 2,
    canvas.height / 2 + 22
  );
}

function draw() {
  const level = currentLevel();
  drawBackground(level);
  drawDecor(level);
  drawTerrain(level);
  drawPlatforms(level);
  drawWeapons(level);
  drawCollectibles(level);
  drawBullets(level);
  drawShockwaves(level);
  drawPortal(level);
  drawMiniEnemies(level);
  drawBoss(level);
  drawPlayer();
  drawOverlayText();
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

initGame();
loop();

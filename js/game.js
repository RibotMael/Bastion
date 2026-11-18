// ---------- Constantes ----------
const TILE = 48, COLS = 16, ROWS = 10;

// Chemin des ennemis (coordonnées en cases). Il part hors écran et y ressort.
const MAPS = {
  vallee:    { name: 'La Vallée',     tag: 'Équilibrée',    desc: 'Le classique : un chemin en S, idéal pour apprendre.', waypoints: [[-1, 2], [3, 2], [3, 7], [8, 7], [8, 2], [12, 2], [12, 6], [16, 6]] },
  serpentin: { name: 'Le Serpentin',  tag: 'Longues lignes', desc: 'De longues lignes droites, idéales pour le canon.', waypoints: [[-1, 1], [13, 1], [13, 4], [2, 4], [2, 8], [16, 8]] },
  spirale:   { name: 'La Spirale',    tag: 'Sinueuse',      desc: 'Un chemin très sinueux : beaucoup de croisements de portée.', waypoints: [[-1, 8], [2, 8], [2, 1], [6, 1], [6, 6], [10, 6], [10, 1], [14, 1], [14, 8], [16, 8]] },
  noeud:     { name: 'Le Nœud',       tag: 'Croisement',    desc: 'Le chemin se croise lui-même : une tour au carrefour couvre deux passages.', waypoints: [[-1, 3], [11, 3], [11, 7], [4, 7], [4, -1]] },
  lac:       { name: 'Le Lac',        tag: 'Espace réduit', desc: 'Un lac occupe le centre : il faut bâtir autour, sur les berges.', waypoints: [[-1, 5], [3, 5], [3, 1], [12, 1], [12, 8], [16, 8]], obstacles: [[5, 3, 10, 6, 'water']] },
  defile:    { name: 'Le Défilé',     tag: 'Court et rapide', desc: 'Un couloir tout droit entre deux falaises : peu de place, peu de temps.', waypoints: [[-1, 5], [16, 5]], obstacles: [[0, 0, 15, 2, 'rock'], [0, 8, 15, 9, 'rock']] },
  labyrinthe:{ name: 'Le Labyrinthe', tag: 'Tours serrées', desc: 'Des couloirs en zigzag : chaque tour touche plusieurs passages.', waypoints: [[-1, 1], [2, 1], [2, 8], [5, 8], [5, 1], [8, 1], [8, 8], [11, 8], [11, 1], [14, 1], [14, 8], [16, 8]] }
};
let WAYPOINTS = MAPS.vallee.waypoints;

const TOWER_TYPES = {
  archer: { name: 'Archer', cost: 50, range: 2.8, damage: 12, rate: 0.6, projSpeed: 420, color: '#8fbf6a' },
  cannon: { name: 'Canon',  cost: 90, range: 2.4, damage: 45, rate: 2.0, projSpeed: 300, color: '#c9703a', splash: 0.9 },
  frost:  { name: 'Givre',  cost: 70, range: 2.5, damage: 5,  rate: 0.9, projSpeed: 380, color: '#6fb5d8', slow: 0.5, slowTime: 1.8 }
};

const BRANCHES = {
  archer: [
    { id: 'sniper', name: "Tireur d'élite", desc: "Portée +50 %, dégâts ×2,5, ignore l'armure, tir 1,6× plus lent.", apply: s => ({ ...s, range: s.range * 1.5, damage: s.damage * 2.5, rate: s.rate * 1.6, pierce: true }) },
    { id: 'volley', name: 'Volée', desc: 'Tire sur 3 cibles à la fois, dégâts −20 %.', apply: s => ({ ...s, multi: 3, damage: s.damage * 0.8 }) }
  ],
  cannon: [
    { id: 'mortar', name: 'Mortier', desc: 'Explosion ×1,7 plus large, portée +15 %, tir 1,4× plus lent.', apply: s => ({ ...s, splash: s.splash * 1.7, range: s.range * 1.15, rate: s.rate * 1.4 }) },
    { id: 'heavy', name: 'Canon lourd', desc: 'Cible unique, dégâts ×2,4 (×1,5 en plus contre les boss).', apply: s => ({ ...s, splash: undefined, damage: s.damage * 2.4, bossMult: 1.5 }) }
  ],
  frost: [
    { id: 'deep', name: 'Gel profond', desc: 'Ralentit de 80 % plus longtemps, dégâts ×2.', apply: s => ({ ...s, slow: 0.2, slowTime: s.slowTime * 1.6, damage: s.damage * 2 }) },
    { id: 'blizzard', name: 'Blizzard', desc: 'Pulse sur tous les ennemis à portée, sans projectile.', apply: s => ({ ...s, pulse: true, rate: s.rate * 1.3, damage: s.damage * 1.5 }) }
  ]
};
const BRANCH_LOOK = {
  sniper: { c: '#f2e6a0', l: 'S' }, volley: { c: '#6fd08c', l: 'V' },
  mortar: { c: '#e08a4a', l: 'M' }, heavy: { c: '#aab4bd', l: 'H' },
  deep: { c: '#3f8fd0', l: 'G' }, blizzard: { c: '#d6f1ff', l: 'B' }
};
const PRIOS = { first: 'Premier', last: 'Dernier', strong: 'Plus fort', fast: 'Plus rapide' };
const TOWER_INFO = {
  archer: "Tir rapide, faibles dégâts. Efficace contre les ennemis peu blindés, presque inutile contre l'armure.",
  cannon: 'Dégâts de zone élevés, tir lent. Idéal contre les groupes et les ennemis blindés.',
  frost: 'Ralentit les ennemis, dégâts faibles. Donne du temps aux autres tours.'
};
const ENEMY_INFO = {
  grunt: { name: 'Soldat', text: 'Unité de base, nombreuse.' },
  runner: { name: 'Coureur', text: 'Très rapide, peu de vie. Les tours de Givre le rattrapent.' },
  brute: { name: 'Brute', text: 'Lente, très résistante, armure 3 : les archers lui font peu de dégâts.' },
  saboteur: { name: 'Saboteur', text: 'Neutralise 2 s la tour la plus entourée à portée (2,6 cases), toutes les 4 s. À abattre en priorité.' },
  boss: { name: 'Boss', text: "Grosse réserve de vie, armure 2 (plus les bonus de l'IA). Coûte 3 vies s'il passe. Arrive aux vagues 5, 10, 15…" }
};
const ENEMY_TYPES = {
  grunt:  { hp: 40,  speed: 55,  reward: 8,  color: '#d9d2c0', r: 11 },
  runner: { hp: 25,  speed: 100, reward: 7,  color: '#e0a526', r: 9 },
  brute:  { hp: 140, speed: 38,  reward: 20, color: '#a8453b', r: 14, armor: 3 },
  saboteur: { hp: 90, speed: 48, reward: 14, color: '#9a7ad6', r: 11, range: 2.6, sabo: 4 },
  boss:   { hp: 700, speed: 30,  reward: 120, color: '#8a3fa8', r: 19, armor: 2, lives: 3 }
};

// Cases occupées par le chemin (on ne peut pas y construire).
function pathTilesOf(W) {
  const set = new Set();
  for (let i = 0; i < W.length - 1; i++) {
    let [x, y] = W[i];
    const [tx, ty] = W[i + 1];
    const dx = Math.sign(tx - x), dy = Math.sign(ty - y);
    while (x !== tx || y !== ty) { set.add(x + ',' + y); x += dx; y += dy; }
    set.add(tx + ',' + ty);
  }
  return set;
}
let PATH_TILES = pathTilesOf(WAYPOINTS);
let PATH_LEN = 1;
let OBST = new Map(); // obstacles (lac, falaises) : cases non constructibles
function setMap(id) {
  WAYPOINTS = MAPS[id].waypoints; PATH_TILES = pathTilesOf(WAYPOINTS);
  OBST = new Map();
  (MAPS[id].obstacles || []).forEach(([c1, r1, c2, r2, kind]) => { for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) OBST.set(c + ',' + r, kind); });
  PATH_LEN = WAYPOINTS.slice(1).reduce((s, [x, y], i) => s + Math.hypot(x - WAYPOINTS[i][0], y - WAYPOINTS[i][1]), 0) * TILE;
}
const MAX_LEVEL = 4;
const SPEEDS = [1, 2, 4, 8];
const RES = Math.min(3, Math.max(2, Math.ceil(window.devicePixelRatio || 1))); // netteté sur grand écran

// ---------- Jeu ----------
class Game {
  constructor(canvas, onEnd) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    canvas.width = COLS * TILE * RES; canvas.height = ROWS * TILE * RES;
    this.onEnd = onEnd;
    this.mouse = { col: -1, row: -1 };
    this.rafId = null;
    this.bindInput();
  }

  start(settings, mapId, opponent) {
    this.opponent = opponent || null; // IA d'un autre joueur : partie amicale
    this.mapId = mapId; setMap(mapId); this.picked = null; this.bg = this.makeBackground();
    this.trend = []; this.lastHeat = null; this.cover = null; this.showHeat = false; this.floaters = [];
    this.clock = 0; this.safeLives = 20; this.safeTime = 0; // départage du classement
    this.settings = settings;
    this.speed = SPEEDS.find(v => v >= settings.speed) || 1;
    this.updateSpeedBtn();
    this.lives = 20;
    this.gold = 100;
    this.wave = 1;
    this.waveActive = false;
    this.queue = [];
    this.spawnTimer = 0;
    this.towers = [];
    this.enemies = [];
    this.projectiles = [];
    this.selected = null;
    this.paused = false;
    this.over = false;
    this.stats = {
      placements: [], goldAtLaunch: [], branches: {},
      kills: { archer: 0, cannon: 0, frost: 0 },
      killZones: { left: 0, centre: 0, right: 0 },
      livesLost: { grunt: 0, runner: 0, brute: 0, boss: 0, saboteur: 0 }
    };
    this.waveStats = this.freshWaveStats();
    Adversary.reset(this.opponent ? this.opponent.w : Profile.data.aiWeights, this.opponent ? 1 : 0.5);
    // Mémoire entre les parties : l'IA anticipe votre ouverture habituelle.
    this.openingNote = null;
    const early = (Profile.data.placements || []).filter(p => p.wave <= 2);
    if (!this.opponent && early.length >= 6) {
      const top = (key) => { const c = {}; early.forEach(p => { const k = key(p); c[k] = (c[k] || 0) + 1; }); return Object.entries(c).sort((a, b) => b[1] - a[1])[0][0]; };
      const ty = top(p => p.type), zn = top(p => zoneOf(p.col));
      const m = { archer: 'brute', cannon: 'runner', frost: 'grunt' }[ty];
      Adversary.weights[m] = Math.min(3.5, Adversary.weights[m] + 0.4);
      this.openingNote = `L'IA se souvient : vous ouvrez avec des tours ${TYPE_LABELS[ty]} dans ${ZONE_LABELS[zn]}. Elle prépare ses premières vagues en conséquence.`;
    }
    this.nextQueue = Adversary.buildWave(this.wave); this.renderNext();
    this.intel = null;
    this.renderIntel();
    this.last = performance.now();
    this.updateHud();
    this.updateToolbar();
    cancelAnimationFrame(this.rafId);
    this.rafId = requestAnimationFrame(this.loop);
  }

  stop() { cancelAnimationFrame(this.rafId); }

  loop = (t) => {
    const dt = Math.min((t - this.last) / 1000, 0.05);
    this.last = t;
    if (!this.paused) for (let i = 0; i < this.speed && !this.over; i++) this.update(dt); // sous-étapes : la simulation reste précise à x8
    this.draw();
    this.rafId = requestAnimationFrame(this.loop);
  };

  // ----- Entrées -----
  bindInput() {
    const c = this.canvas;
    const toTile = (e) => {
      const r = c.getBoundingClientRect();
      const x = (e.clientX - r.left) * (COLS * TILE / r.width);
      const y = (e.clientY - r.top) * (ROWS * TILE / r.height);
      return { col: Math.floor(x / TILE), row: Math.floor(y / TILE) };
    };
    c.addEventListener('mousemove', (e) => { this.mouse = toTile(e); });
    c.addEventListener('mouseleave', () => { this.mouse = { col: -1, row: -1 }; });
    c.addEventListener('click', (e) => {
      if (this.paused || this.over) return;
      const { col, row } = toTile(e);
      if (this.towers.some(t => t.col === col && t.row === row)) this.pick(col, row);
      else if (this.selected) this.placeTower(col, row);
      else this.pick(-1, -1);
    });
    c.addEventListener('contextmenu', (e) => { e.preventDefault(); this.select(null); this.pick(-1, -1); });
  }

  select(type) {
    this.selected = type;
    if (type) this.picked = null;
    this.updateToolbar();
  }

  // ----- Actions -----
  canBuild(col, row) {
    return col >= 0 && col < COLS && row >= 0 && row < ROWS &&
      !PATH_TILES.has(col + ',' + row) && !OBST.has(col + ',' + row) &&
      !this.towers.some(t => t.col === col && t.row === row);
  }

  placeTower(col, row) {
    const type = this.selected;
    if (!type || !this.canBuild(col, row)) return;
    const def = TOWER_TYPES[type];
    if (this.gold < def.cost) return;
    this.gold -= def.cost;
    this.towers.push({ col, row, type, cooldown: 0, level: 1, spent: def.cost });

    // On mémorise le comportement du joueur pour l'IA adaptative.
    Profile.data.towersPlaced[type]++;
    Profile.data.placements.push({ type, col, row, wave: this.wave });
    this.stats.placements.push({ type, col, row, wave: this.wave });
    this.updateHud();
    this.updateToolbar();
  }

  // ----- Tours : sélection, amélioration, revente -----
  statsOf(t) {
    const d = TOWER_TYPES[t.type], k = t.level - 1;
    const s = { ...d, damage: d.damage * (1 + 0.5 * k), range: d.range + 0.15 * k, rate: d.rate * Math.pow(0.92, k),
      slow: d.slow ? Math.max(0.25, d.slow - 0.07 * k) : undefined, splash: d.splash ? d.splash + 0.1 * k : undefined };
    const b = (BRANCHES[t.type] || []).find(x => x.id === t.branch);
    return b ? { ...b.apply(s), bid: b.id } : s;
  }
  upgradeCost(t) { return Math.round(TOWER_TYPES[t.type].cost * [0.9, 1.4, 2.2][t.level - 1]); }
  canUpgrade(t) { return !!t && t.level < MAX_LEVEL && this.gold >= this.upgradeCost(t); }
  pick(col, row) {
    this.picked = this.towers.find(t => t.col === col && t.row === row) || null;
    this.updateToolbar();
  }
  upgrade(t, branch) {
    if (!this.canUpgrade(t) || this.over) return;
    if (t.level === 3 && !branch) return; // le niveau 4 impose de choisir une spécialisation
    const c = this.upgradeCost(t);
    this.gold -= c; t.spent += c; t.level++;
    if (branch) { t.branch = branch; this.stats.branches[branch] = (this.stats.branches[branch] || 0) + 1; }
    this.updateHud(); this.updateToolbar();
  }
  sell(t) {
    if (!t || this.over) return;
    this.gold += Math.floor(t.spent * 0.7);
    this.towers = this.towers.filter(x => x !== t);
    this.picked = null;
    this.updateHud(); this.updateToolbar();
  }

  renderNext() {
    const box = document.getElementById('next');
    if (!box) return;
    if (!this.nextQueue) { box.textContent = 'Vague en cours…'; return; }
    const c = {};
    this.nextQueue.forEach(k => { c[k] = (c[k] || 0) + 1; });
    box.innerHTML = '';
    const st = document.createElement('strong'); st.textContent = `Vague ${this.wave} : `;
    box.append(st, Object.entries(c).map(([k, n]) => `${ENEMY_INFO[k].name} ×${n}`).join(' · '));
    if (c.boss) { const b = document.createElement('span'); b.className = 'boss'; b.textContent = '  ⚠ Boss'; box.append(b); }
  }

  // Carte « tour sélectionnée » : taille fixe, donc aucun saut de mise en page.
  renderCard() {
    const box = document.getElementById('tcard');
    if (!box) return;
    box.innerHTML = '';
    const el = (tag, cls, txt) => { const n = document.createElement(tag); if (cls) n.className = cls; if (txt !== undefined) n.textContent = txt; return n; };
    const t = this.picked;
    if (!t) { box.append(el('h3', '', 'Tour sélectionnée'), el('p', 'muted', "Cliquez sur une tour pour l'améliorer, la vendre ou changer sa cible.")); return; }
    const d = TOWER_TYPES[t.type], s = this.statsOf(t);
    const br = BRANCHES[t.type].find(x => x.id === t.branch);
    box.append(el('h3', '', `${d.name} · niv. ${t.level}${br ? ' · ' + br.name : ''}`));
    let line = `Dégâts ${Math.round(s.damage)} · portée ${s.range.toFixed(1)} · ${(1 / s.rate).toFixed(1)} tir/s`;
    if (t.level < 3) { const n = this.statsOf({ ...t, level: t.level + 1 }); line += `  →  ${Math.round(n.damage)} · ${n.range.toFixed(1)} · ${(1 / n.rate).toFixed(1)}`; }
    box.append(el('p', 'stats', line));
    if (br) box.append(el('p', 'branch', br.desc));
    const btn = (txt, cost, fn, cls) => { const b = el('button', cls, txt); if (cost) { b.dataset.cost = cost; b.disabled = this.gold < cost; } b.onclick = fn; return b; };
    const row = el('div', 'actions');
    const cost = t.level < MAX_LEVEL ? this.upgradeCost(t) : 0;
    if (t.level < 3) row.append(btn(`Améliorer · ${cost} or`, cost, () => this.upgrade(t), 'primary'));
    else if (t.level === 3) BRANCHES[t.type].forEach(b => row.append(btn(`${BRANCH_LOOK[b.id].l} · ${b.name} · ${cost} or`, cost, () => this.upgrade(t, b.id), 'primary')));
    else row.append(el('span', 'muted', 'Niveau maximum'));
    box.append(row);
    if (t.level === 3) BRANCHES[t.type].forEach(b => box.append(el('p', 'branch', `${b.name} : ${b.desc}`)));
    const row2 = el('div', 'actions');
    row2.append(
      btn(`Cible : ${PRIOS[t.prio || 'first']}`, 0, () => { const k = Object.keys(PRIOS); t.prio = k[(k.indexOf(t.prio || 'first') + 1) % k.length]; this.renderCard(); }),
      btn(`Vendre +${Math.floor(t.spent * 0.7)}`, 0, () => this.sell(t)));
    box.append(row2);
  }

  // Cases du chemin couvertes (ou non) par la portée des tours.
  coverage() {
    const res = {}, z = { left: 0, centre: 0, right: 0 };
    let un = 0;
    PATH_TILES.forEach(k => {
      const [c, r] = k.split(',').map(Number);
      if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return;
      const x = (c + 0.5) * TILE, y = (r + 0.5) * TILE;
      const n = this.towers.filter(t => Math.hypot((t.col + 0.5) * TILE - x, (t.row + 0.5) * TILE - y) <= this.statsOf(t).range * TILE).length;
      res[k] = n;
      if (!n) { un++; z[zoneOf(c)]++; }
    });
    return { res, un, zone: Object.entries(z).sort((a, b) => b[1] - a[1])[0][0] };
  }

  launchWave() {
    if (this.waveActive || this.over) return;
    this.queue = this.nextQueue || Adversary.buildWave(this.wave);
    this.nextQueue = null; this.renderNext();
    this.towers.forEach(t => { t.wd = 0; });
    const fresh = [...new Set(this.queue)].filter(k => !Profile.data.seen[k]);
    if (fresh.length) { fresh.forEach(k => { Profile.data.seen[k] = true; }); Profile.save(); if (this.onNewEnemy) this.onNewEnemy(fresh); }
    this.waveStats = this.freshWaveStats();
    this.waveActive = true;
    this.spawnTimer = 0;
    this.stats.goldAtLaunch.push(this.gold);
    this.updateHud();
  }

  cycleSpeed() {
    this.speed = SPEEDS[(SPEEDS.indexOf(this.speed) + 1) % SPEEDS.length];
    Settings.values.speed = this.speed; Settings.save();
    this.updateSpeedBtn();
  }

  updateSpeedBtn() {
    const b = document.getElementById('btn-speed');
    if (b) { b.textContent = '×' + this.speed; b.classList.toggle('primary', this.speed > 1); }
  }

  togglePause() {
    if (this.over) return;
    this.paused = !this.paused;
  }

  // ----- Mise à jour -----
  update(dt) {
    this.clock += dt;
    // Apparition des ennemis
    if (this.waveActive && this.queue.length) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawnEnemy(this.queue.pop());
        this.spawnTimer = Adversary.spawnInterval(this.wave);
      }
    }

    // Déplacement des ennemis
    for (const e of this.enemies) {
      e.slowTimer = Math.max(0, e.slowTimer - dt);
      let move = e.speed * (e.slowTimer > 0 ? e.slowFactor : 1) * dt;
      while (move > 0 && e.seg < WAYPOINTS.length - 1) {
        const [wx, wy] = WAYPOINTS[e.seg + 1];
        const tx = (wx + 0.5) * TILE, ty = (wy + 0.5) * TILE;
        const dist = Math.hypot(tx - e.x, ty - e.y);
        if (dist <= move) { e.x = tx; e.y = ty; e.seg++; e.travelled += dist; move -= dist; }
        else { e.x += (tx - e.x) / dist * move; e.y += (ty - e.y) / dist * move; e.travelled += move; move = 0; }
      }
      if (e.seg >= WAYPOINTS.length - 1) { e.dead = true; const l = e.def.lives || 1; this.lives -= l; this.stats.livesLost[e.type] += l; this.waveStats.livesLost[e.type] += l; }
    }

    // Saboteurs : neutralisent temporairement la tour la plus proche
    for (const e of this.enemies) {
      if (!e.def.range || e.dead) continue;
      e.zap = Math.max(0, (e.zap || 0) - dt);
      e.sabo -= dt;
      if (e.sabo > 0) continue;
      let near = null, nd = -1; // cible : la tour la plus entourée
      for (const t of this.towers) {
        if (t.stun > 0) continue;
        const d = Math.hypot((t.col + 0.5) * TILE - e.x, (t.row + 0.5) * TILE - e.y);
        if (d <= e.def.range * TILE) { const dens = this.towers.filter(o => Math.abs(o.col - t.col) <= 1 && Math.abs(o.row - t.row) <= 1).length; if (dens > nd) { nd = dens; near = t; } }
      }
      if (near) { near.stun = 2; e.sabo = e.def.sabo; e.zap = 0.3; e.zapTo = { x: (near.col + 0.5) * TILE, y: (near.row + 0.5) * TILE }; }
    }

    // Tours : tir (priorité de ciblage, tirs multiples, pulsation)
    const PRIO = { first: (p, q) => q.travelled - p.travelled, last: (p, q) => p.travelled - q.travelled, strong: (p, q) => q.hp - p.hp, fast: (p, q) => q.speed - p.speed };
    for (const t of this.towers) {
      const def = this.statsOf(t);
      t.cooldown -= dt;
      t.stun = Math.max(0, (t.stun || 0) - dt);
      t.pulse = Math.max(0, (t.pulse || 0) - dt);
      t.flash = Math.max(0, (t.flash || 0) - dt);
      if (t.cooldown > 0 || t.stun > 0) continue;
      const cx = (t.col + 0.5) * TILE, cy = (t.row + 0.5) * TILE;
      const inRange = this.enemies.filter(e => !e.dead && Math.hypot(e.x - cx, e.y - cy) <= def.range * TILE);
      if (!inRange.length) continue;
      inRange.sort(PRIO[t.prio || 'first']);
      t.angle = Math.atan2(inRange[0].y - cy, inRange[0].x - cx);
      t.cooldown = def.rate; t.flash = 0.1;
      if (def.pulse) { t.pulse = 0.25; for (const e of inRange) this.hit({ def, target: e, towerType: t.type, tower: t }); }
      else for (const e of inRange.slice(0, def.multi || 1)) this.projectiles.push({ x: cx, y: cy, target: e, def, towerType: t.type, tower: t });
    }

    // Projectiles
    for (const p of this.projectiles) {
      if (p.target.dead) { p.done = true; continue; }
      const dist = Math.hypot(p.target.x - p.x, p.target.y - p.y);
      const step = p.def.projSpeed * dt;
      if (dist <= step) { this.hit(p); p.done = true; }
      else { p.x += (p.target.x - p.x) / dist * step; p.y += (p.target.y - p.y) / dist * step; }
    }

    this.floaters = this.floaters.filter(f => (f.t -= dt) > 0);
    this.enemies = this.enemies.filter(e => !e.dead);
    this.projectiles = this.projectiles.filter(p => !p.done);

    if (this.lives <= 0) return this.end();

    // Fin de vague : l'IA analyse ce qui s'est passé, puis s'adapte
    if (this.waveActive && !this.queue.length && !this.enemies.length) {
      this.waveActive = false;
      this.gold += 20 + this.wave * 4;
      this.safeLives = this.lives; this.safeTime = Math.floor(this.clock); // état à la fin de la dernière vague tenue
      this.analyzeWave();
      this.wave++;
      this.nextQueue = Adversary.buildWave(this.wave); this.renderNext();
    }
    this.updateHud();
  }

  spawnEnemy(type) {
    const def = ENEMY_TYPES[type];
    const hp = def.hp * Adversary.hpMult(this.wave, type);
    const [sx, sy] = WAYPOINTS[0];
    this.enemies.push({
      type, def, hp, maxHp: hp, speed: def.speed,
      x: (sx + 0.5) * TILE, y: (sy + 0.5) * TILE,
      armor: (def.armor || 0) + Adversary.armorBonus(this.wave),
      seg: 0, travelled: 0, slowTimer: 0, slowFactor: 1, dead: false, sabo: 1
    });
  }

  hit(p) {
    const def = p.def, target = p.target;
    const victims = def.splash
      ? this.enemies.filter(e => !e.dead && Math.hypot(e.x - target.x, e.y - target.y) <= def.splash * TILE)
      : [target];
    for (const e of victims) {
      const mult = e.type === 'boss' ? (def.bossMult || 1) : 1;
      const raw = def.damage * mult, dmg = def.pierce ? raw : Math.max(1, def.damage - e.armor) * mult;
      e.hp -= dmg;
      this.waveStats.raw[p.towerType] += raw; this.waveStats.lost[p.towerType] += raw - dmg;
      if (p.tower) p.tower.wd = (p.tower.wd || 0) + dmg;
      if (def.slow) { e.slowFactor = def.slow; e.slowTimer = def.slowTime; }
      if (e.hp <= 0 && !e.dead) {
        e.dead = true;
        const g = Math.max(1, Math.round(e.def.reward * Adversary.rewardScale(this.wave)));
        this.gold += g;
        if (this.floaters.length < 40) this.floaters.push({ x: e.x, y: e.y, t: 0.8, v: g });
        this.stats.kills[p.towerType]++;
        const zone = zoneOf(Math.floor(e.x / TILE));
        this.stats.killZones[zone]++;
        this.waveStats.kills[p.towerType]++;
        this.waveStats.deaths = (this.waveStats.deaths || 0) + 1;
        this.waveStats.progress = (this.waveStats.progress || 0) + Math.min(1, e.travelled / PATH_LEN);
        const hk = Math.floor(e.x / TILE) + ',' + Math.floor(e.y / TILE);
        this.waveStats.heat[hk] = (this.waveStats.heat[hk] || 0) + 1;
        this.waveStats.killZones[zone]++;
      }
    }
  }

  end() {
    this.over = true;
    const survived = this.wave - 1;
    const report = Analyst.analyze(this.stats, { mode: 'game', wave: this.wave, survived, lives: this.lives });
    if (this.opponent) { // partie amicale : ni record, ni classement, ni modification de votre IA
      this.updateHud();
      this.onEnd(report, { survived, friendly: true, opponent: this.opponent.name, map: MAPS[this.mapId].name });
      return;
    }

    Profile.data.games++;
    Profile.data.bestWave = Math.max(Profile.data.bestWave || 0, survived);
    const prevRec = Profile.data.records[this.mapId] || 0;
    Profile.data.records[this.mapId] = Math.max(prevRec, survived);
    Profile.data.aiWeights = { ...Adversary.weights };
    Profile.data.history.push({ date: Date.now(), survived, map: this.mapId, ...report });
    Profile.data.history = Profile.data.history.slice(-20);
    Profile.data.placements = Profile.data.placements.slice(-300);
    if (survived >= 1) { // meilleur résultat local par carte : vague, puis vies restantes, puis durée
      const lives = Math.max(0, Math.min(20, this.safeLives)), time = Math.min(9999, this.safeTime);
      const run = { wave: survived, lives, time, score: scoreOf(survived, lives, time) };
      Profile.data.best = Profile.data.best || {};
      if (!Profile.data.best[this.mapId] || run.score > Profile.data.best[this.mapId].score) Profile.data.best[this.mapId] = run;
    }
    Profile.save();
    if (typeof Online !== 'undefined' && Online.user) { Online.submit(this.mapId, (Profile.data.best || {})[this.mapId]); Online.pushProfile(); Online.pushAI(); }

    this.updateHud();
    this.onEnd(report, { survived, best: Profile.data.records[this.mapId], newRecord: survived > prevRec, map: MAPS[this.mapId].name });
  }

  freshWaveStats() {
    return {
      raw: { archer: 0, cannon: 0, frost: 0 }, lost: { archer: 0, cannon: 0, frost: 0 }, heat: {},
      kills: { archer: 0, cannon: 0, frost: 0 },
      killZones: { left: 0, centre: 0, right: 0 },
      livesLost: { grunt: 0, runner: 0, brute: 0, boss: 0, saboteur: 0 }
    };
  }

  // Analyse de la vague terminée : ce qui sera adapté pour la suivante.
  analyzeWave() {
    this.cover = this.coverage();
    this.lastHeat = this.waveStats.heat;
    this.trend.push(this.waveStats.deaths ? this.waveStats.progress / this.waveStats.deaths : 0.5);
    const view = {
      trend: this.trend, idle: this.towers.filter(t => !t.wd).length, uncovered: this.cover.un, uncoveredZone: this.cover.zone,
      placements: this.stats.placements,
      goldAtLaunch: this.stats.goldAtLaunch,
      branches: this.stats.branches,
      ...this.waveStats
    };
    const result = Analyst.analyze(view, { mode: 'wave', wave: this.wave, lives: this.lives });
    const prog = this.waveStats.deaths ? this.waveStats.progress / this.waveStats.deaths : 0.5;
    const adaptations = Adversary.adapt(result.tags, this.wave, prog);
    this.intel = { wave: this.wave, ...result, adaptations, weights: { ...Adversary.weights } };
    this.renderIntel();
  }

  renderIntel() {
    const box = document.getElementById('intel');
    box.innerHTML = '';
    box.scrollTop = 0;
    box.classList.remove('hidden');
    if (!this.intel) {
      const h = document.createElement('h2'); h.textContent = "Dossier de l'adversaire";
      const mu = document.createElement('p'); mu.className = 'muted'; mu.textContent = "L'IA observe votre première vague. Son analyse apparaîtra ici.";
      box.append(h, mu);
      if (this.openingNote) { const n = document.createElement('p'); n.textContent = this.openingNote; box.append(n); }
      if (this.opponent) { const n = document.createElement('p'); n.textContent = `Adversaire : l'IA de ${this.opponent.name} (${this.opponent.style}). Partie amicale, hors classement.`; box.append(n); }
      return;
    }
    const i = this.intel;
    const add = (heading, items) => {
      if (!items.length) return;
      const h = document.createElement('h3'); h.textContent = heading;
      const ul = document.createElement('ul');
      items.forEach(t => { const li = document.createElement('li'); li.textContent = t; ul.appendChild(li); });
      box.append(h, ul);
    };
    const title = document.createElement('h2');
    title.textContent = `Analyse de la vague ${i.wave}`;
    box.append(title);
    add("Ce que l'IA a observé", i.observations);
    add('Ce que l\'IA change', i.adaptations);
    if (Settings.values.advice !== false) add('Conseils', i.advice || []);
    const w = i.weights, f = (n) => '×' + n.toFixed(1);
    const p = document.createElement('p');
    p.className = 'muted';
    p.textContent = `Menace : soldats ${f(w.grunt)} · coureurs ${f(w.runner)} · brutes ${f(w.brute)} · saboteurs ${f(w.saboteur)} · ` +
      `ennemis +${Math.round((Adversary.hpMult(this.wave + 1) - 1) * 100)} % de points de vie à la vague ${this.wave + 1}, armure +${Adversary.armorBonus(this.wave + 1)}.`;
    box.append(p);
  }

  // ----- Interface (HUD / barre d'outils) -----
  updateHud() {
    document.getElementById('hud-lives').textContent = Math.max(0, this.lives);
    document.getElementById('hud-gold').textContent = this.gold;
    document.getElementById('hud-wave').textContent = this.wave;
    document.getElementById('hud-best').textContent = Math.max((Profile.data.records[this.mapId] || 0), this.wave - 1);
    document.querySelectorAll('#tcard button[data-cost]').forEach(b => { b.disabled = this.gold < Number(b.dataset.cost); });
    document.getElementById('btn-wave').disabled = this.waveActive || this.over;
  }

  updateToolbar() {
    const bar = document.getElementById('toolbar');
    bar.innerHTML = '';
    Object.entries(TOWER_TYPES).forEach(([key, def], i) => {
      const b = document.createElement('button');
      b.className = 'tower-btn' + (this.selected === key ? ' selected' : '');
      b.style.setProperty('--tower', def.color);
      const sw = document.createElement('span'); sw.className = 'swatch';
      const sm = document.createElement('small'); sm.textContent = `${def.cost} or · touche ${i + 1}`;
      b.append(sw, def.name + ' ', sm);
      b.onclick = () => this.select(this.selected === key ? null : key);
      bar.appendChild(b);
    });
    this.renderCard();
  }

  // ----- Rendu -----
  // Décor pré-rendu une fois par partie : herbe, rochers, arbres, route usée.
  makeBackground() {
    const cv = document.createElement('canvas');
    cv.width = COLS * TILE * RES; cv.height = ROWS * TILE * RES;
    const g = cv.getContext('2d');
    g.scale(RES, RES);
    const hash = (c, r, k) => { let h = Math.imul(c + 1, 374761393) ^ Math.imul(r + 1, 668265263) ^ Math.imul(k + 1, 1274126177); h = Math.imul(h ^ (h >>> 13), 1103515245); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const x = c * TILE, y = r * TILE;
      g.fillStyle = hash(c, r, 1) > 0.5 ? '#2f4a39' : '#2a4233'; g.fillRect(x, y, TILE, TILE);
      const ob = OBST.get(c + ',' + r);
      if (ob) { // lac ou falaise
        g.fillStyle = ob === 'water' ? '#264a63' : '#3a4144'; g.fillRect(x, y, TILE, TILE);
        g.strokeStyle = ob === 'water' ? 'rgba(160,210,235,0.28)' : 'rgba(255,255,255,0.09)'; g.lineWidth = 1.5; g.beginPath();
        if (ob === 'water') { g.moveTo(x + 8, y + 18); g.quadraticCurveTo(x + 16, y + 12, x + 24, y + 18); g.quadraticCurveTo(x + 32, y + 24, x + 40, y + 18); g.moveTo(x + 6, y + 34); g.quadraticCurveTo(x + 14, y + 28, x + 22, y + 34); }
        else { g.moveTo(x + 6, y + 36); g.lineTo(x + 20, y + 12); g.lineTo(x + 34, y + 30); g.lineTo(x + 44, y + 16); }
        g.stroke(); continue;
      }
      if (PATH_TILES.has(c + ',' + r)) continue;
      g.strokeStyle = 'rgba(160,200,130,0.25)'; g.lineWidth = 1.5;
      for (let i = 0; i < 3; i++) {
        const px = x + 6 + hash(c, r, i + 2) * (TILE - 12), py = y + 10 + hash(c, r, i + 5) * (TILE - 16);
        g.beginPath(); g.moveTo(px, py); g.lineTo(px - 2, py - 5); g.moveTo(px, py); g.lineTo(px + 2, py - 5); g.stroke();
      }
      const d = hash(c, r, 9);
      if (d > 0.93) { g.fillStyle = 'rgba(20,30,28,0.35)'; g.beginPath(); g.ellipse(x + 30, y + 32, 9, 6, 0, 0, 7); g.fill(); g.fillStyle = '#6d7a76'; g.beginPath(); g.ellipse(x + 29, y + 30, 8, 5.5, 0, 0, 7); g.fill(); }
      else if (d < 0.05) { g.fillStyle = 'rgba(20,30,28,0.35)'; g.beginPath(); g.arc(x + 26, y + 30, 10, 0, 7); g.fill(); g.fillStyle = '#1f3a2a'; g.beginPath(); g.arc(x + 24, y + 26, 10, 0, 7); g.fill(); g.fillStyle = '#2c5236'; g.beginPath(); g.arc(x + 21, y + 23, 5, 0, 7); g.fill(); }
    }
    const route = (w, col) => {
      g.beginPath();
      WAYPOINTS.forEach(([wx, wy], i) => { const px = (wx + 0.5) * TILE, py = (wy + 0.5) * TILE; i ? g.lineTo(px, py) : g.moveTo(px, py); });
      g.lineWidth = w; g.strokeStyle = col; g.lineJoin = 'miter'; g.lineCap = 'butt'; g.stroke();
    };
    route(52, '#17140d'); route(48, '#8a7547'); route(40, '#b9a068');
    g.setLineDash([7, 11]); route(2, 'rgba(70,52,24,0.45)'); g.setLineDash([]);
    PATH_TILES.forEach(k => {
      const [c, r] = k.split(',').map(Number);
      for (let i = 0; i < 3; i++) { g.fillStyle = 'rgba(80,62,32,0.35)'; g.beginPath(); g.arc(c * TILE + 6 + hash(c, r, i + 20) * 36, r * TILE + 6 + hash(c, r, i + 30) * 36, 1.6, 0, 7); g.fill(); }
    });
    return cv;
  }

  drawTower(t, cx, cy) {
    const ctx = this.ctx, def = TOWER_TYPES[t.type], look = BRANCH_LOOK[t.branch], b = t.branch, now = performance.now() / 1000;
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(cx, cy + 5, 19, 13, 0, 0, 7); ctx.fill();
    // Socle : sa bordure raconte le niveau (gris → argent → or) puis la spécialisation (couleur + halo)
    ctx.fillStyle = '#1a2326'; ctx.lineWidth = look ? 3 : 2;
    ctx.strokeStyle = look ? look.c : t.level >= 3 ? '#e2b04a' : t.level === 2 ? '#8fa0a0' : '#52666a';
    if (look) { ctx.shadowColor = look.c; ctx.shadowBlur = 8; }
    ctx.beginPath(); ctx.roundRect(cx - 19, cy - 19, 38, 38, 6); ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0;
    if (t === this.picked) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.roundRect(cx - 23, cy - 23, 46, 46, 8); ctx.stroke(); ctx.setLineDash([]); }
    ctx.save(); ctx.translate(cx, cy - 1);
    const col = look ? look.c : def.color, a = t.angle || 0;
    ctx.fillStyle = col; ctx.strokeStyle = '#0d1619'; ctx.lineWidth = 2; ctx.lineJoin = 'round';
    if (t.type === 'archer') {
      ctx.rotate(a);
      if (b === 'sniper') { // flèche longue et fine, point rouge de visée
        ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(-10, -5); ctx.lineTo(-6, 0); ctx.lineTo(-10, 5); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#e4572e'; ctx.beginPath(); ctx.arc(2, 0, 2.2, 0, 7); ctx.fill();
      } else if (b === 'volley') { // trois pointes en éventail
        for (const o of [-0.55, 0, 0.55]) { ctx.save(); ctx.rotate(o); ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(-6, -5); ctx.lineTo(-3, 0); ctx.lineTo(-6, 5); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); }
      } else { ctx.beginPath(); ctx.moveTo(13, 0); ctx.lineTo(-9, -10); ctx.lineTo(-4, 0); ctx.lineTo(-9, 10); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    } else if (t.type === 'cannon') {
      ctx.rotate(a);
      const bw = b === 'mortar' ? 13 : b === 'heavy' ? 7 : 9, bl = b === 'heavy' ? 21 : b === 'mortar' ? 10 : 16, r = b === 'mortar' ? 13 : 11;
      ctx.fillStyle = b === 'heavy' ? '#3a4046' : '#2b3033'; ctx.fillRect(2, -bw / 2, bl, bw); ctx.strokeRect(2, -bw / 2, bl, bw);
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill(); ctx.stroke();
      if (b === 'mortar') { ctx.beginPath(); ctx.arc(0, 0, 6, 0, 7); ctx.stroke(); }
    } else if (b === 'blizzard') { // flocon qui tourne en continu
      ctx.rotate(now * 1.2); ctx.lineWidth = 3; ctx.strokeStyle = col;
      for (let i = 0; i < 3; i++) { ctx.rotate(Math.PI / 3); ctx.beginPath(); ctx.moveTo(-13, 0); ctx.lineTo(13, 0); ctx.stroke(); }
    } else {
      const h = b === 'deep' ? 15 : 14, w = b === 'deep' ? 12 : 10;
      ctx.beginPath(); ctx.moveTo(0, -h); ctx.lineTo(w, 0); ctx.lineTo(0, h); ctx.lineTo(-w, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = b === 'deep' ? '#0d1619' : 'rgba(255,255,255,0.55)';
      ctx.beginPath(); if (b === 'deep') { ctx.moveTo(0, -6); ctx.lineTo(4, 0); ctx.lineTo(0, 6); ctx.lineTo(-4, 0); } else { ctx.moveTo(0, -14); ctx.lineTo(4, -2); ctx.lineTo(-4, -2); } ctx.closePath(); ctx.fill();
    }
    if (t.flash > 0 && t.type !== 'frost') { ctx.fillStyle = 'rgba(255,240,200,0.9)'; ctx.beginPath(); ctx.arc(b === 'heavy' ? 24 : 18, 0, 4, 0, 7); ctx.fill(); }
    ctx.restore();
    ctx.fillStyle = '#e2b04a';
    for (let i = 0; i < t.level; i++) ctx.fillRect(cx - 17 + i * 8, cy + 13, 6, 3);
    if (look) { // badge de spécialisation : lettre sur pastille de la couleur de la branche
      ctx.fillStyle = look.c; ctx.strokeStyle = '#0d1619'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx + 15, cy - 15, 7, 0, 7); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#0d1619'; ctx.font = 'bold 9px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(look.l, cx + 15, cy - 14.5); ctx.textAlign = 'start'; ctx.textBaseline = 'alphabetic';
    }
    if (t.pulse > 0) { ctx.strokeStyle = `rgba(143,211,234,${t.pulse * 3})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, this.statsOf(t).range * TILE * (1 - t.pulse * 2), 0, 7); ctx.stroke(); }
    if (t.stun > 0) {
      ctx.fillStyle = 'rgba(13,22,25,0.6)'; ctx.beginPath(); ctx.roundRect(cx - 19, cy - 19, 38, 38, 6); ctx.fill();
      ctx.strokeStyle = '#e4572e'; ctx.lineWidth = 3; ctx.beginPath();
      ctx.moveTo(cx - 8, cy - 8); ctx.lineTo(cx + 8, cy + 8); ctx.moveTo(cx + 8, cy - 8); ctx.lineTo(cx - 8, cy + 8); ctx.stroke();
    }
  }

  drawEnemy(e) {
    const ctx = this.ctx, d = e.def, r = d.r, slowed = e.slowTimer > 0;
    const n = WAYPOINTS[Math.min(e.seg + 1, WAYPOINTS.length - 1)];
    const a = Math.atan2((n[1] + 0.5) * TILE - e.y, (n[0] + 0.5) * TILE - e.x);
    if (e.zap > 0) { ctx.strokeStyle = '#e4572e'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(e.zapTo.x, e.zapTo.y); ctx.stroke(); }
    ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.beginPath(); ctx.ellipse(e.x, e.y + r * 0.6, r, r * 0.55, 0, 0, 7); ctx.fill();
    ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(a);
    ctx.fillStyle = slowed ? '#8fd3ea' : d.color; ctx.strokeStyle = '#0d1619'; ctx.lineWidth = 2; ctx.lineJoin = 'round';
    ctx.beginPath();
    if (e.type === 'runner') { ctx.moveTo(r + 4, 0); ctx.lineTo(-r, -r); ctx.lineTo(-r * 0.5, 0); ctx.lineTo(-r, r); ctx.closePath(); }
    else if (e.type === 'saboteur') { for (let i = 0; i < 6; i++) ctx.lineTo(Math.cos(i * Math.PI / 3) * r * 1.15, Math.sin(i * Math.PI / 3) * r * 1.15); ctx.closePath(); }
    else if (e.type === 'brute') ctx.roundRect(-r, -r, r * 2, r * 2, 4);
    else if (e.type === 'boss') { for (let i = 0; i < 16; i++) { const ang = i * Math.PI / 8, rad = i % 2 ? r * 0.66 : r * 1.12; ctx.lineTo(Math.cos(ang) * rad, Math.sin(ang) * rad); } ctx.closePath(); }
    else ctx.arc(0, 0, r, 0, 7);
    ctx.fill(); ctx.stroke();
    if (e.type === 'grunt') { ctx.fillStyle = '#6b7478'; ctx.beginPath(); ctx.arc(0, 0, r - 1, -Math.PI / 2, Math.PI / 2); ctx.fill(); }
    if (e.type === 'brute') { ctx.fillStyle = '#d9d2c0'; ctx.beginPath(); ctx.moveTo(r - 2, -r + 1); ctx.lineTo(r + 5, -r - 3); ctx.lineTo(r - 5, -r + 5); ctx.moveTo(r - 2, r - 1); ctx.lineTo(r + 5, r + 3); ctx.lineTo(r - 5, r - 5); ctx.fill(); }
    ctx.fillStyle = '#e4572e'; ctx.beginPath(); ctx.arc(r * 0.35, 0, e.type === 'boss' ? 4 : 2.4, 0, 7); ctx.fill();
    ctx.restore();
    if (e.hp < e.maxHp) {
      const w = Math.max(22, r * 2), y = e.y - r - 9;
      ctx.fillStyle = '#0d1619'; ctx.fillRect(e.x - w / 2 - 1, y - 1, w + 2, 5);
      ctx.fillStyle = e.hp / e.maxHp > 0.4 ? '#8fcf7a' : '#e4572e';
      ctx.fillRect(e.x - w / 2, y, w * Math.max(0, e.hp / e.maxHp), 3);
    }
  }

  draw() {
    const ctx = this.ctx, s = this.settings, W = COLS * TILE, H = ROWS * TILE;
    ctx.setTransform(RES, 0, 0, RES, 0, 0);
    ctx.drawImage(this.bg, 0, 0, W, H);
    if (s.grid) {
      ctx.strokeStyle = 'rgba(233,228,208,0.07)'; ctx.lineWidth = 1; ctx.beginPath();
      for (let c = 1; c < COLS; c++) { ctx.moveTo(c * TILE + 0.5, 0); ctx.lineTo(c * TILE + 0.5, H); }
      for (let r = 1; r < ROWS; r++) { ctx.moveTo(0, r * TILE + 0.5); ctx.lineTo(W, r * TILE + 0.5); }
      ctx.stroke();
    }

    const { col, row } = this.mouse;
    if (this.selected && this.canBuild(col, row)) {
      const def = TOWER_TYPES[this.selected];
      const cx = (col + 0.5) * TILE, cy = (row + 0.5) * TILE;
      ctx.globalAlpha = 0.5; ctx.fillStyle = def.color;
      ctx.beginPath(); ctx.roundRect(col * TILE + 6, row * TILE + 6, TILE - 12, TILE - 12, 6); ctx.fill();
      ctx.globalAlpha = 1;
      this.drawRange(cx, cy, def.range, this.gold >= def.cost ? '255,255,255' : '228,87,46');
    }

    for (const t of this.towers) {
      const cx = (t.col + 0.5) * TILE, cy = (t.row + 0.5) * TILE;
      if ((s.range && t.col === col && t.row === row) || t === this.picked) this.drawRange(cx, cy, this.statsOf(t).range, '255,255,255');
      this.drawTower(t, cx, cy);
    }
    for (const e of this.enemies) this.drawEnemy(e);

    for (const p of this.projectiles) {
      const ang = Math.atan2(p.target.y - p.y, p.target.x - p.x), bid = p.def.bid, c = BRANCH_LOOK[bid]?.c;
      if (p.towerType === 'archer') {
        const len = bid === 'sniper' ? 16 : bid === 'volley' ? 7 : 9;
        ctx.strokeStyle = c || '#e9e4d0'; ctx.lineWidth = bid === 'sniper' ? 3 : 2; ctx.beginPath();
        ctx.moveTo(p.x - Math.cos(ang) * len, p.y - Math.sin(ang) * len); ctx.lineTo(p.x, p.y); ctx.stroke();
      } else if (p.towerType === 'cannon') {
        ctx.fillStyle = bid === 'heavy' ? '#4a5159' : '#1b1f22'; ctx.strokeStyle = c || '#e4572e'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(p.x, p.y, bid === 'mortar' ? 7 : bid === 'heavy' ? 6 : 5, 0, 7); ctx.fill(); ctx.stroke();
      } else { ctx.fillStyle = bid === 'deep' ? '#4aa3e0' : '#c9efff'; ctx.beginPath(); ctx.arc(p.x, p.y, bid === 'deep' ? 4.5 : 3.5, 0, 7); ctx.fill(); }
    }
    ctx.textAlign = 'center'; ctx.font = 'bold 12px system-ui'; // gains d'or flottants
    for (const f of this.floaters) { ctx.fillStyle = `rgba(226,176,74,${Math.min(1, f.t / 0.5)})`; ctx.fillText('+' + f.v, f.x, f.y - 12 - (0.8 - f.t) * 28); }
    ctx.textAlign = 'start';

    if (this.showHeat && this.lastHeat) { // carte de chaleur de la dernière vague
      const max = Math.max(1, ...Object.values(this.lastHeat));
      for (const [k, n] of Object.entries(this.lastHeat)) { const [c, r] = k.split(',').map(Number); ctx.fillStyle = `rgba(228,87,46,${0.15 + 0.55 * n / max})`; ctx.fillRect(c * TILE, r * TILE, TILE, TILE); }
      if (this.cover) {
        ctx.strokeStyle = 'rgba(233,228,208,0.9)'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]);
        for (const [k, n] of Object.entries(this.cover.res)) if (!n) { const [c, r] = k.split(',').map(Number); ctx.strokeRect(c * TILE + 3, r * TILE + 3, TILE - 6, TILE - 6); }
        ctx.setLineDash([]);
      }
      ctx.fillStyle = '#e9e4d0'; ctx.font = '12px system-ui'; ctx.fillText('Rouge : éliminations · pointillés : chemin hors de portée', 10, H - 10);
    }
    const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.5, W / 2, H / 2, W * 0.62);
    v.addColorStop(0, 'rgba(5,10,12,0)'); v.addColorStop(1, 'rgba(5,10,12,0.5)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  }

  drawRange(cx, cy, range, rgb) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.arc(cx, cy, range * TILE, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${rgb},0.10)`; ctx.fill();
    ctx.strokeStyle = `rgba(${rgb},0.5)`; ctx.lineWidth = 1.5; ctx.stroke();
  }
}

// Aperçu d'une carte (écran de sélection) : même route que sur le plateau.
function drawMapPreview(canvas, id) {
  const ctx = canvas.getContext('2d'), k = canvas.width / (COLS * TILE), W = MAPS[id].waypoints;
  ctx.fillStyle = '#2d4636'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.scale(k, k);
  ctx.fillStyle = 'rgba(255,255,255,0.03)';
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if ((c + r) % 2) ctx.fillRect(c * TILE, r * TILE, TILE, TILE);
  (MAPS[id].obstacles || []).forEach(([c1, r1, c2, r2, kind]) => { ctx.fillStyle = kind === 'water' ? '#264a63' : '#3a4144'; ctx.fillRect(c1 * TILE, r1 * TILE, (c2 - c1 + 1) * TILE, (r2 - r1 + 1) * TILE); });
  const route = (w, col) => {
    ctx.beginPath();
    W.forEach(([x, y], i) => { const px = (x + 0.5) * TILE, py = (y + 0.5) * TILE; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); });
    ctx.lineWidth = w; ctx.strokeStyle = col; ctx.lineJoin = 'miter'; ctx.stroke();
  };
  route(52, '#17140d'); route(48, '#8a7547'); route(40, '#b9a068');
  ctx.setLineDash([7, 11]); route(2, 'rgba(70,52,24,0.45)');
}
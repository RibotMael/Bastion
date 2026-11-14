// Navigation entre les écrans + liaison des boutons.
const $ = (id) => document.getElementById(id);

Settings.load();
Profile.load();

function show(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === screenId));
}

// Le « dossier » du menu : ce que l'IA a retenu du joueur.
function refreshMenuStats() {
  const p = Profile.data, box = $('menu-dossier');
  const el = (tag, cls, txt) => { const n = document.createElement(tag); if (cls) n.className = cls; if (txt !== undefined) n.textContent = txt; return n; };
  box.innerHTML = '';
  box.append(el('h2', '', "Ce que l'IA sait de vous"));
  if (!p.games) { box.append(el('p', 'muted', "Rien pour l'instant. Jouez une première partie : l'ennemi prendra des notes.")); return; }
  const fav = Object.entries(p.towersPlaced).sort((a, b) => b[1] - a[1])[0];
  const dl = el('dl', 'facts');
  [['Parties jouées', p.games], ['Meilleure vague', p.bestWave], ['Tour favorite', fav[1] ? TYPE_LABELS[fav[0]] : '—']].forEach(([k, v]) => {
    const row = el('div'); row.append(el('dt', '', k), el('dd', '', v)); dl.append(row);
  });
  box.append(dl);
  const last = p.history[p.history.length - 1];
  if (last && last.weaknesses && last.weaknesses[0]) box.append(el('p', 'note', 'Dernière faiblesse repérée : ' + last.weaknesses[0]));
}

// ----- Overlay (pause / fin de partie) -----
function showOverlay(title, text, buttons, report) {
  $('overlay-title').textContent = title;
  $('overlay-text').textContent = text;
  const rep = $('overlay-report');
  rep.innerHTML = '';
  rep.classList.toggle('hidden', !report);
  if (report) {
    const addList = (heading, items) => {
      if (!items.length) return;
      const h = document.createElement('h3');
      h.textContent = heading;
      const ul = document.createElement('ul');
      items.forEach(t => { const li = document.createElement('li'); li.textContent = t; ul.appendChild(li); });
      rep.append(h, ul);
    };
    addList(report.title1 || "Ce que l'IA a observé", report.observations);
    addList(report.title2 || 'Faiblesses repérées', report.weaknesses);
  }
  const box = $('overlay-buttons');
  box.innerHTML = '';
  buttons.forEach(({ label, primary, action }) => {
    const b = document.createElement('button');
    b.textContent = label;
    if (primary) b.className = 'primary';
    b.onclick = action;
    box.appendChild(b);
  });
  $('overlay').classList.remove('hidden');
}
const hideOverlay = () => $('overlay').classList.add('hidden');

// ----- Partie -----
const game = new Game($('canvas'), (report, result) => {
  showOverlay(
    'Fin de partie',
    `${result.map} : vous avez tenu ${result.survived} vague(s). Record : ${result.best}.` + (result.newRecord ? ' Nouveau record !' : ''),
    [
      { label: 'Rejouer', primary: true, action: startGame },
      { label: 'Menu', action: leaveGame }
    ],
    report
  );
});

let currentMap = 'vallee';

function buildMapCards() {
  const list = $('map-list');
  list.innerHTML = '';
  for (const [id, m] of Object.entries(MAPS)) {
    const rec = Profile.data.records[id] || 0;
    const b = document.createElement('button');
    b.className = 'map-card' + (rec ? '' : ' new');
    const cv = document.createElement('canvas');
    cv.width = 384; cv.height = 240;
    drawMapPreview(cv, id);
    const h = document.createElement('h3'); h.textContent = m.name;
    const d = document.createElement('p'); d.textContent = m.desc;
    const f = document.createElement('div'); f.className = 'map-foot';
    const len = [...pathTilesOf(m.waypoints)].filter(k => { const c = Number(k.split(',')[0]); return c >= 0 && c < COLS; }).length;
    const chip = document.createElement('span'); chip.className = 'chip'; chip.textContent = `Chemin : ${len} cases`;
    const r = document.createElement('span'); r.className = 'record';
    r.innerHTML = rec ? `Record <b>${rec}</b>` : 'Jamais jouée';
    f.append(chip, r);
    b.append(cv, h, d, f);
    b.onclick = () => startGame(id);
    list.appendChild(b);
  }
}

function startGame(id) {
  if (typeof id === 'string') currentMap = id;
  hideOverlay();
  show('game');
  game.start(Settings.values, currentMap);
}

function leaveGame() {
  game.stop();
  hideOverlay();
  refreshMenuStats();
  show('menu');
}

function togglePause() {
  if (game.over) return;
  game.togglePause();
  if (game.paused) {
    showOverlay('Pause', '', [
      { label: 'Reprendre', primary: true, action: togglePause },
      { label: 'Quitter vers le menu', action: leaveGame }
    ]);
  } else {
    hideOverlay();
  }
}

$('btn-play').onclick = () => { buildMapCards(); show('maps'); };
$('btn-maps-back').onclick = () => show('menu');
$('btn-wave').onclick = () => game.launchWave();
$('btn-pause').onclick = togglePause;
$('btn-speed').onclick = () => game.cycleSpeed();
$('btn-heat').onclick = () => { game.showHeat = !game.showHeat; $('btn-heat').classList.toggle('primary', game.showHeat); };

// Bestiaire : les fiches se débloquent à la première rencontre.
$('btn-bestiary').onclick = () => {
  if (game.over || !$('overlay').classList.contains('hidden')) return;
  const was = game.paused, seen = Profile.data.seen || {};
  game.paused = true;
  showOverlay('Bestiaire', 'Les fiches ennemies se débloquent à la première rencontre.',
    [{ label: 'Fermer', primary: true, action: () => { hideOverlay(); game.paused = was; } }],
    {
      title1: 'Ennemis', title2: 'Tours',
      observations: Object.entries(ENEMY_INFO).map(([k, i]) => seen[k] ? `${i.name} : ${i.text}` : `??? : pas encore rencontré (à partir de la vague ${ENEMY_UNLOCK[k] || 5}).`),
      weaknesses: Object.entries(TOWER_INFO).map(([k, t]) => `${TOWER_TYPES[k].name} : ${t}`).concat(["Au niveau 4, chaque tour choisit une spécialisation, repérable à son badge : S Tireur d'élite · V Volée · M Mortier · H Canon lourd · G Gel profond · B Blizzard."])
    });
};

// Alerte à la première apparition d'un ennemi : la partie se met en pause.
game.onNewEnemy = (types) => {
  game.paused = true;
  showOverlay('Nouvel ennemi', '', [{ label: 'Compris', primary: true, action: () => { hideOverlay(); game.paused = false; } }],
    { title1: types.length > 1 ? 'Nouveaux ennemis' : 'Nouvel ennemi', observations: types.map(k => `${ENEMY_INFO[k].name} : ${ENEMY_INFO[k].text}`), weaknesses: [] });
};

document.addEventListener('keydown', (e) => {
  if (!$('game').classList.contains('active')) return;
  if (e.key === 'Escape') togglePause();
  if (e.key.toLowerCase() === 'f') game.cycleSpeed();
  if (e.key.toLowerCase() === 'h') $('btn-heat').click();
  if (e.key.toLowerCase() === 'u') game.upgrade(game.picked);
  if (e.key === ' ') { e.preventDefault(); game.launchWave(); }
  const types = Object.keys(TOWER_TYPES);
  const i = parseInt(e.key, 10) - 1;
  if (i >= 0 && i < types.length && !game.paused) game.select(types[i]);
});

// ----- Paramètres -----
function fillSettingsForm() {
  const v = Settings.values;
  $('set-speed').value = v.speed;
  $('set-volume').value = v.volume;
  $('vol-out').textContent = v.volume;
  $('set-grid').checked = v.grid;
  $('set-range').checked = v.range;
  $('set-advice').checked = v.advice !== false;
}

$('btn-settings').onclick = () => { fillSettingsForm(); show('settings'); };
$('btn-back').onclick = () => { refreshMenuStats(); show('menu'); };

$('set-speed').onchange = (e) => { Settings.values.speed = Number(e.target.value); Settings.save(); };
$('set-volume').oninput = (e) => { Settings.values.volume = Number(e.target.value); $('vol-out').textContent = e.target.value; Settings.save(); };
$('set-grid').onchange = (e) => { Settings.values.grid = e.target.checked; Settings.save(); };
$('set-range').onchange = (e) => { Settings.values.range = e.target.checked; Settings.save(); };
$('set-advice').onchange = (e) => { Settings.values.advice = e.target.checked; Settings.save(); };

$('btn-reset').onclick = () => {
  if (confirm("Effacer tout ce que l'IA a appris sur vous ?")) {
    Profile.reset();
    refreshMenuStats();
  }
};

refreshMenuStats();

// L'œil de l'adversaire suit le curseur sur le menu.
const pupil = $('eye-pupil');
if (pupil && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  document.addEventListener('mousemove', (e) => {
    const r = pupil.ownerSVGElement.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    const d = Math.hypot(dx, dy) || 1, m = Math.min(4, d / 60);
    pupil.style.transform = `translate(${dx / d * m}px, ${dy / d * m}px)`;
  });
}
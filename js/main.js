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
  const tiles = el('div', 'tiles');
  [[p.games, 'parties'], [p.bestWave, 'meilleure vague'], [fav[1] ? TYPE_LABELS[fav[0]] : '—', 'tour favorite']].forEach(([v, l]) => {
    const t = el('div', 'tile'); t.append(el('b', '', v), el('small', '', l)); tiles.append(t);
  });
  box.append(tiles);
  const rec = el('dl', 'facts');
  Object.entries(MAPS).forEach(([id, mp]) => { const row = el('div'); row.append(el('dt', '', mp.name), el('dd', '', p.records[id] ? 'vague ' + p.records[id] : '—')); rec.append(row); });
  box.append(rec);
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
    if (rec) { const bb = document.createElement('b'); bb.textContent = rec; r.append('Record ', bb); } else r.textContent = 'Jamais jouée';
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
  if (!Profile.data.tutorialSeen && !Profile.data.games) { // première partie : mini-guide
    Profile.data.tutorialSeen = true; Profile.save();
    game.paused = true;
    showOverlay('Bienvenue dans Bastion', '', [{ label: "C'est parti", primary: true, action: () => { hideOverlay(); game.paused = false; } }], {
      title1: 'Pour bien commencer', weaknesses: [],
      observations: [
        'Choisissez une tour sous le plateau (touches 1, 2, 3), puis cliquez sur une case verte pour la poser.',
        "Quand vous êtes prêt, cliquez sur « Lancer la vague » (ou appuyez sur la barre d'espace).",
        "Les ennemis suivent la route. S'ils arrivent au bout, vous perdez des vies : à zéro, c'est fini.",
        "Cliquez sur une tour pour l'améliorer. Après chaque vague, l'IA analyse votre façon de jouer : lisez son dossier à droite."
      ]
    });
  }
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

$('btn-board').onclick = () => openBoard();
$('btn-play').onclick = () => { buildMapCards(); show('maps'); };
$('btn-maps-back').onclick = () => show('menu');
$('btn-privacy').onclick = () => show('privacy');
$('privacy-back').onclick = () => show('menu');
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
  $('set-grid').checked = v.grid;
  $('set-range').checked = v.range;
  $('set-advice').checked = v.advice !== false;
}

$('btn-settings').onclick = () => { fillSettingsForm(); show('settings'); };
$('btn-back').onclick = () => { refreshMenuStats(); show('menu'); };

$('set-speed').onchange = (e) => { Settings.values.speed = Number(e.target.value); Settings.save(); };
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

// ----- En ligne : compte, classement -----
function openProfile(tab) { renderProfile(); setPane(tab || 'stats'); show('profile'); }
function renderAccount() {
  const box = $('account-line');
  box.innerHTML = '';
  const mk = (cls, txt, fn) => { const b = document.createElement('button'); b.className = cls; b.textContent = txt; b.onclick = fn; return b; };
  if (typeof Online !== 'undefined' && Online.user) {
    const name = Online.name || Online.user.email;
    const chip = mk('chip-btn', name, () => openProfile());
    const av = document.createElement('span'); av.className = 'avatar'; av.textContent = name[0].toUpperCase();
    chip.prepend(av);
    box.append(chip, mk('chip-link', 'Déconnexion', async () => { await Online.signOut(); }));
  } else {
    const t = document.createElement('span'); t.textContent = 'Mode invité';
    box.append(t, mk('chip-btn solo', 'Se connecter', () => { setAuthMode('login'); show('account'); }));
  }
}

let authMode = 'login';
function setAuthMode(mode) {
  authMode = mode;
  $('tab-login').classList.toggle('active', mode === 'login');
  $('tab-signup').classList.toggle('active', mode === 'signup');
  document.querySelectorAll('#account .signup-only').forEach(e => { e.hidden = mode !== 'signup'; });
  document.querySelectorAll('#account .login-only').forEach(e => { e.hidden = mode !== 'login'; });
  $('auth-submit').textContent = mode === 'login' ? 'Se connecter' : 'Créer mon compte';
  $('auth-pass').autocomplete = mode === 'login' ? 'current-password' : 'new-password';
  $('auth-error').textContent = '';
}
$('tab-login').onclick = () => setAuthMode('login');
$('tab-signup').onclick = () => setAuthMode('signup');
$('auth-back').onclick = () => show('menu');
$('auth-reset').onclick = async () => {
  const err = $('auth-error'), email = $('auth-email').value.trim();
  if (!email) { err.textContent = "Saisissez votre email d'abord."; return; }
  try { await Online.init(); await Online.resetPassword(email); err.textContent = 'Email de réinitialisation envoyé (pensez aux spams).'; }
  catch (ex) { err.textContent = Online.message(ex); }
};
$('auth-form').onsubmit = async (e) => {
  e.preventDefault();
  const err = $('auth-error'), btn = $('auth-submit');
  err.textContent = ''; btn.disabled = true;
  try {
    await Online.init();
    const email = $('auth-email').value.trim(), pass = $('auth-pass').value;
    if (authMode === 'signup') {
      if (!$('auth-consent').checked) throw new Error("Cochez l'acceptation pour créer un compte.");
      await Online.signUp($('auth-name').value.trim(), email, pass);
    } else await Online.signIn(email, pass);
    show('menu');
    try { refreshMenuStats(); renderAccount(); } catch (e2) { console.warn(e2); }
  } catch (ex) { console.error('Connexion :', ex); err.textContent = Online.message(ex); }
  finally { btn.disabled = false; }
};

const fmtTime = (t) => Math.floor(t / 60) + ' min ' + String(t % 60).padStart(2, '0');
let boardMap = 'vallee';
async function openBoard(id) {
  if (id) boardMap = id;
  show('board');
  const tabs = $('board-tabs'), body = $('board-body');
  tabs.innerHTML = '';
  for (const [k, mp] of Object.entries(MAPS)) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'tab' + (k === boardMap ? ' active' : ''); b.textContent = mp.name;
    b.onclick = () => openBoard(k);
    tabs.append(b);
  }
  body.textContent = 'Chargement…';
  try {
    await Online.init();
    const rows = await Online.leaderboard(boardMap);
    body.innerHTML = '';
    if (!rows.length) { body.textContent = 'Aucun score pour le moment. Soyez le premier !'; return; }
    rows.forEach((r, i) => {
      const row = document.createElement('div');
      row.className = 'rank-row' + (Online.user && r.uid === Online.user.uid ? ' me' : '');
      const pos = document.createElement('span'); pos.className = 'pos'; pos.textContent = i + 1;
      const who = document.createElement('span'); who.className = 'who'; who.textContent = r.name;
      const val = document.createElement('span'); val.className = 'val'; val.textContent = 'vague ' + r.wave;
      if (r.lives != null) { const d = document.createElement('small'); d.textContent = `${r.lives} vie${r.lives > 1 ? 's' : ''} · ${fmtTime(r.time)}`; val.append(d); }
      row.append(pos, who, val); body.append(row);
    });
  } catch (ex) { body.textContent = Online.message(ex); }
}
$('board-back').onclick = () => show('menu');

// ----- Profil : statistiques et gestion du compte -----
const fmtDate = (t) => new Date(t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
function setPane(name) {
  ['stats', 'account'].forEach(k => { $('pane-' + k).hidden = k !== name; $('ptab-' + k).classList.toggle('active', k === name); });
  $('pf-msg').textContent = '';
}
$('ptab-stats').onclick = () => setPane('stats');
$('ptab-account').onclick = () => setPane('account');

function renderProfile() {
  const p = Profile.data, on = typeof Online !== 'undefined' && Online.user;
  const name = on ? (Online.name || Online.user.email) : 'Invité';
  $('pf-avatar').textContent = name[0].toUpperCase();
  $('pf-title').textContent = name;
  $('profile-sub').textContent = on ? Online.user.email : 'Mode invité : vos statistiques restent sur cet appareil.';
  $('pf-guest').hidden = !!on;
  document.querySelectorAll('#profile .online-only').forEach(e => { e.hidden = !on; });
  if (on) { $('acv-name').textContent = Online.name || '—'; $('acv-email').textContent = Online.user.email; }
  const el = (tag, cls, txt) => { const n = document.createElement(tag); if (cls) n.className = cls; if (txt !== undefined) n.textContent = txt; return n; };
  const kv = (box, rows) => { box.innerHTML = ''; rows.forEach(([k, v]) => { const r = el('div', 'kv'); r.append(el('span', '', k), el('b', '', v)); box.append(r); }); };
  const hist = p.history || [], placed = p.towersPlaced, total = Object.values(placed).reduce((a, b) => a + b, 0);
  const avg = hist.length ? (hist.reduce((s, h) => s + h.survived, 0) / hist.length).toFixed(1) : '—';
  const tiles = $('pf-tiles'); tiles.innerHTML = '';
  [[p.games, 'parties jouées'], [p.bestWave, 'meilleure vague'], [avg, 'vague moyenne'], [total, 'tours posées']].forEach(([v, l]) => {
    const t = el('div', 'tile'); t.append(el('b', '', v), el('small', '', l)); tiles.append(t);
  });
  const bars = $('pf-bars'); bars.innerHTML = '';
  Object.entries(TOWER_TYPES).forEach(([k, d]) => {
    const n = placed[k] || 0, row = el('div', 'bar-row'), track = el('div', 'bar-track'), fill = el('div', 'bar-fill');
    fill.style.width = (total ? Math.round(n / total * 100) : 0) + '%'; fill.style.background = d.color;
    track.append(fill); row.append(el('span', '', d.name), track, el('span', 'num', n)); bars.append(row);
  });
  kv($('records-panel'), Object.entries(MAPS).map(([id, mp]) => [mp.name, p.records[id] ? 'vague ' + p.records[id] : '—']));
  kv($('history-panel'), hist.length ? hist.slice(-8).reverse().map(h => [`${fmtDate(h.date)} · ${MAPS[h.map] ? MAPS[h.map].name : 'carte inconnue'}`, 'vague ' + h.survived]) : [['Aucune partie enregistrée', '']]);
}

// Chaque information a sa ligne : « Modifier » ouvre un petit formulaire explicite, un seul à la fois.
document.querySelectorAll('.acct-row[data-edit]').forEach(row => {
  const form = row.querySelector('.editor'), btn = row.querySelector('.edit-btn'), msg = row.querySelector('.msg'), kind = row.dataset.edit;
  const label = btn.textContent;
  const close = () => { form.hidden = true; form.reset(); msg.textContent = ''; btn.textContent = label; };
  row._close = close;
  btn.onclick = () => {
    const wasOpen = !form.hidden;
    document.querySelectorAll('.acct-row[data-edit]').forEach(r => r._close());
    if (wasOpen) return;
    form.hidden = false; btn.textContent = 'Fermer';
    if (kind === 'name') form.elements.v.value = Online.name || '';
    const first = form.querySelector('input'); if (first) first.focus();
  };
  row.querySelector('.cancel').onclick = close;
  form.onsubmit = async (e) => {
    e.preventDefault(); msg.textContent = '';
    const f = form.elements;
    try {
      await Online.init();
      let ok;
      if (kind === 'name') { await Online.rename(f.v.value.trim()); ok = 'Pseudo mis à jour.'; }
      else if (kind === 'email') { await Online.changeEmail(f.current.value, f.v.value.trim()); ok = `Un lien de confirmation a été envoyé à ${f.v.value.trim()}. Cliquez dessus pour valider le changement.`; }
      else if (kind === 'password') {
        if (f.v.value !== f.confirm.value) throw new Error('Les deux mots de passe ne correspondent pas.');
        await Online.changePassword(f.current.value, f.v.value); ok = 'Mot de passe modifié.';
      } else {
        if (!confirm('Supprimer définitivement votre compte, vos scores et votre IA en ligne ?')) return;
        await Online.deleteAccount(f.current.value);
        renderAccount(); refreshMenuStats(); show('menu'); return;
      }
      close(); renderProfile(); renderAccount(); refreshMenuStats();
      const t = $('pf-msg'); t.textContent = ok; t.className = 'error ok';
    } catch (ex) { msg.textContent = Online.message(ex); }
  };
});

$('pf-export').onclick = () => {
  const on = typeof Online !== 'undefined' && Online.user;
  const data = { exporte_le: new Date().toISOString(), compte: on ? { pseudo: Online.name, email: Online.user.email } : null, profil: Profile.data };
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  a.download = 'bastion-mes-donnees.json'; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};
$('pf-back').onclick = () => show('menu');
$('pf-login').onclick = () => { setAuthMode('login'); show('account'); };
$('btn-profile').onclick = () => openProfile();

renderAccount();
if (typeof Online !== 'undefined') { Online.onChange(() => { renderAccount(); refreshMenuStats(); }); Online.init().catch(() => {}); }

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
// L'« analyste » : à la fin de chaque partie, il observe ce que le joueur a fait
// et produit un rapport. Les `tags` servent de base à l'adaptation des vagues suivantes.

const TYPE_LABELS = { archer: 'Archer', cannon: 'Canon', frost: 'Givre' };
const ENEMY_LABELS = { grunt: 'soldats', runner: 'coureurs', brute: 'brutes', boss: 'boss', saboteur: 'saboteurs' };
const ZONE_LABELS = { left: 'la zone gauche', centre: 'la zone centrale', right: 'la zone droite' };

// Découpe la carte en trois zones selon la colonne.
function zoneOf(col) {
  return col < 5 ? 'left' : col < 11 ? 'centre' : 'right';
}

const pct = (n, total) => Math.round((n / total) * 100);
const sum = (obj) => Object.values(obj).reduce((a, b) => a + b, 0);
const topKey = (obj) => Object.entries(obj).sort((a, b) => b[1] - a[1])[0];

const Analyst = {
  analyze(stats, outcome) {
    const observations = [];
    const weaknesses = [];
    const tags = {};
    const advice = [];
    const placed = stats.placements;

    // Résultat
    const waveMode = outcome.mode === 'wave';
    if (waveMode) {
      observations.push(`Vague ${outcome.wave} repoussée (${Math.max(0, outcome.lives)} vie(s) restante(s) sur 20).`);
    } else {
      observations.push(`Fin de partie : vous avez tenu ${outcome.survived} vague(s), la défense a cédé à la vague ${outcome.wave}.`);
    }

    if (!placed.length) {
      observations.push("Vous n'avez posé aucune tour. Rien à analyser pour l'instant.");
      return { observations, weaknesses, tags, advice: [...new Set(advice)].slice(0, 3) };
    }

    // 1. Composition des tours
    const counts = { archer: 0, cannon: 0, frost: 0 };
    placed.forEach(p => counts[p.type]++);
    const [domType, domCount] = topKey(counts);
    tags.favoriteTower = domType;
    if (pct(domCount, placed.length) >= 50 && placed.length >= 4) {
      observations.push(`Vous misez surtout sur les tours ${TYPE_LABELS[domType]} (${pct(domCount, placed.length)} % de vos ${placed.length} tours).`);
      tags.dominantTower = domType;
      weaknesses.push(`Stratégie prévisible : tout repose sur les tours ${TYPE_LABELS[domType]}.`);
    } else {
      observations.push(`Vos ${placed.length} tours sont plutôt variées : ` +
        Object.entries(counts).filter(([, n]) => n).map(([t, n]) => `${n} ${TYPE_LABELS[t]}`).join(', ') + '.');
    }
    if (counts.frost === 0 && placed.length >= 3) {
      weaknesses.push("Aucune tour de Givre : les ennemis rapides ne sont jamais ralentis.");
      tags.noSlow = true;
      advice.push('Ajoutez au moins une tour de Givre pour ralentir les ennemis rapides.');
    }

    // 2. Position des tours
    const zoneCounts = { left: 0, centre: 0, right: 0 };
    placed.forEach(p => zoneCounts[zoneOf(p.col)]++);
    const [domZone, domZoneCount] = topKey(zoneCounts);
    tags.favoriteZone = domZone;
    if (placed.length >= 4 && pct(domZoneCount, placed.length) >= 55) {
      observations.push(`Vos défenses sont concentrées dans ${ZONE_LABELS[domZone]} (${pct(domZoneCount, placed.length)} % des tours).`);
    } else {
      observations.push('Vos tours sont réparties sur toute la carte.');
    }
    const [weakZone, weakZoneCount] = Object.entries(zoneCounts).sort((a, b) => a[1] - b[1])[0];
    if (placed.length >= 4 && weakZoneCount === 0) {
      weaknesses.push(`${ZONE_LABELS[weakZone][0].toUpperCase() + ZONE_LABELS[weakZone].slice(1)} n'a aucune tour.`);
      tags.undefendedZone = weakZone;
    }

    // 3. Rythme de construction
    const early = placed.filter(p => p.wave <= 2).length;
    if (waveMode) {
      // rythme de construction : sans intérêt vague par vague
    } else if (pct(early, placed.length) >= 60) {
      observations.push('Vous construisez surtout au début de la partie (vagues 1 à 2).');
    } else if (early / placed.length <= 0.25) {
      observations.push('Vous construisez progressivement, en renforçant la défense au fil des vagues.');
    }
    const golds = waveMode ? stats.goldAtLaunch.slice(-1) : stats.goldAtLaunch;
    if (golds.length) {
      const avg = Math.round(sum(golds) / golds.length);
      if (avg >= 120) {
        observations.push(`Vous lancez les vagues avec beaucoup d'or en réserve (${avg}${waveMode ? '' : ' en moyenne'}).`);
        weaknesses.push("De l'or reste inutilisé : la défense pourrait être plus dense.");
        tags.hoardsGold = true;
        advice.push('Dépensez votre or : améliorez vos meilleures tours.');
      }
    }

    // 4. Efficacité des tours
    const totalKills = sum(stats.kills);
    if (totalKills > 0) {
      const [killer, k] = topKey(stats.kills);
      observations.push(`Les tours ${TYPE_LABELS[killer]} réalisent ${pct(k, totalKills)} % des éliminations.`);

      const [killZone, kz] = topKey(stats.killZones);
      if (pct(kz, totalKills) >= 50) {
        observations.push(`La plupart des ennemis tombent dans ${ZONE_LABELS[killZone]}.`);
        tags.killZone = killZone;
      }
    }

    // 4a. Mesures fines (analyse de vague uniquement)
    if (waveMode) {
      if (stats.idle >= 3) {
        observations.push(`${stats.idle} de vos tours n'ont infligé aucun dégât cette vague.`);
        tags.idle = stats.idle;
        advice.push('Revendez ou déplacez vos tours inutiles pour financer des améliorations.');
      }
      for (const t of ['archer', 'cannon', 'frost']) {
        const raw = stats.raw?.[t] || 0, lost = stats.lost?.[t] || 0;
        if (raw >= 300 && lost / raw >= 0.35) {
          observations.push(`L'armure absorbe ${pct(lost, raw)} % des dégâts de vos tours ${TYPE_LABELS[t]}.`);
          tags.armorHurts = t;
          advice.push("Contre l'armure, préférez le Canon, le Tireur d'élite (ignore l'armure) ou le Canon lourd.");
        }
      }
      if (stats.uncovered > 0) {
        observations.push(`${stats.uncovered} case(s) du chemin ne sont couvertes par aucune tour (surtout dans ${ZONE_LABELS[stats.uncoveredZone]}).`);
        tags.gap = stats.uncoveredZone;
        advice.push(`Posez une tour près de ${ZONE_LABELS[stats.uncoveredZone]} pour fermer la brèche.`);
      }
      const tr = stats.trend || [];
      if (tr.length >= 3) {
        const [a, b, c] = tr.slice(-3);
        if (a > b && b > c) observations.push("Vos tours tuent de plus en plus tôt depuis 3 vagues : vous creusez l'écart.");
        else if (a < b && b < c) { observations.push("Les ennemis avancent de plus en plus loin depuis 3 vagues : votre défense s'essouffle."); advice.push('Renforcez vos tours les plus efficaces avant que la pression ne monte encore.'); }
      }
    }

    // 4b. Spécialisations choisies
    const br = stats.branches || {};
    const brTotal = sum(br);
    if (brTotal >= 3) {
      const [bk, bn] = topKey(br);
      const bName = Object.values(BRANCHES).flat().find(b => b.id === bk).name;
      observations.push(`Spécialisation favorite : ${bName} (${bn} tour${bn > 1 ? 's' : ''} sur ${brTotal}).`);
      if (pct(bn, brTotal) >= 50) tags.dominantBranch = bk;
    }

    // 5. Fuites
    const lost = sum(stats.livesLost);
    if (lost === 0) {
      observations.push("Aucun ennemi n'est passé : votre défense a été hermétique.");
    } else {
      const [leaker, n] = topKey(stats.livesLost);
      observations.push(`Vous avez perdu ${lost} vie(s), dont ${n} à cause des ${ENEMY_LABELS[leaker]}.`);
      weaknesses.push(`Les ${ENEMY_LABELS[leaker]} passent votre défense.`);
      tags.leakingEnemy = leaker;
    }

    return { observations, weaknesses, tags, advice: [...new Set(advice)].slice(0, 3) };
  }
};


// ---------- L'adversaire : il compose les vagues et s'adapte après chacune ----------
const ENEMY_COST = { grunt: 10, runner: 12, brute: 35, saboteur: 30 };    // « points de menace » par ennemi
const ENEMY_BASE = { grunt: 1, runner: 0.45, brute: 0.12, saboteur: 0.25 }; // fréquence de base
const ENEMY_UNLOCK = { grunt: 1, runner: 2, brute: 4, saboteur: 10 };     // première vague où l'ennemi apparaît

const BUDGET_CAP = 1800;

const Adversary = {
  weights: { grunt: 1, runner: 1, brute: 1, saboteur: 1 },
  aggression: 1,
  pressure: 1, // difficulté dynamique : monte quand vos tours tuent trop tôt

  // Nouvelle partie. `prior` = poids appris lors de la partie précédente (repris à moitié).
  // `strength` : part des préférences apprises reprise au départ (0,5 pour sa propre IA, 1 pour l'IA d'un autre joueur).
  reset(prior, strength = 0.5) {
    this.weights = { grunt: 1, runner: 1, brute: 1, saboteur: 1 };
    if (prior) for (const t in this.weights) this.weights[t] = Math.max(0.6, 1 + ((prior[t] ?? 1) - 1) * strength);
    this.aggression = 1;
    this.armorExtra = 0;
    this.pressure = 1;
  },

  // Plus la vague avance, plus le budget de l'ennemi et sa résistance augmentent.
  budget(n)        { return Math.round(55 * Math.pow(1.25, n - 1) * this.aggression); },
  // La difficulté dynamique est plafonnée à ×1,5 pour les boss : ils restent battables même quand la défense est très forte.
  hpMult(n, type)  { const p = type === 'boss' ? Math.min(this.pressure, 1.5) : this.pressure; return (1 + 0.14 * (n - 1) + 0.02 * (n - 1) ** 2) * p * Math.pow(Math.max(1, this.budget(n) / BUDGET_CAP), 0.85); },
  // Le revenu par vague reste proche de (180 + 30 n) même quand les ennemis deviennent très nombreux.
  rewardScale(n)   { return Math.min(1, (180 + 30 * n) / (0.8 * this.budget(n))); },
  armorBonus(n)    { return Math.floor((n - 1) / 5) + this.armorExtra; }, // +1 d'armure pour tous les ennemis toutes les 5 vagues
  spawnInterval(n) { return Math.max(0.35, 0.9 * Math.pow(0.97, n - 1)); },

  buildWave(n) {
    const types = Object.keys(ENEMY_COST).filter(t => ENEMY_UNLOCK[t] <= n);
    const minCost = Math.min(...types.map(t => ENEMY_COST[t]));
    const list = [];
    let budget = Math.min(this.budget(n), BUDGET_CAP); // au-delà, la menace passe dans les points de vie, pas dans le nombre
    while (budget >= minCost) {
      const options = types.filter(t => ENEMY_COST[t] <= budget);
      const w = options.map(t => ENEMY_BASE[t] * this.weights[t]);
      let r = Math.random() * sum(w), i = 0;
      while (i < options.length - 1 && (r -= w[i]) > 0) i++;
      list.push(options[i]);
      budget -= ENEMY_COST[options[i]];
    }
    list.sort(() => Math.random() - 0.5);
    if (n % 5 === 0) for (let b = 0; b < 1 + Math.floor((n - 5) / 15); b++) list.unshift('boss'); // les boss arrivent en dernier
    return list;
  },

  // Lit l'analyse de la vague qui vient de se terminer et renvoie ce qu'elle change.
  adapt(tags, wave, progress = 0.5) {
    const msgs = [];
    for (const k in this.weights) this.weights[k] = 1 + (this.weights[k] - 1) * 0.92; // oubli lent
    const counter = (type, amount, text) => {
      // Pas d'accumulation en avance pour les saboteurs : ils arrivent à poids normal, puis montent progressivement.
      if (type !== 'saboteur' || ENEMY_UNLOCK[type] <= wave + 1) this.weights[type] = Math.min(type === 'saboteur' ? 2 : 3.5, this.weights[type] + amount);
      const next = wave + 1;
      msgs.push(ENEMY_UNLOCK[type] <= next ? text : `${text} (disponibles à partir de la vague ${ENEMY_UNLOCK[type]})`);
    };

    if (tags.dominantTower === 'archer') { this.armorExtra = Math.min(3, this.armorExtra + 1); msgs.push('Spam d\'archers détecté : tous les ennemis gagnent +1 d\'armure.'); }
    if (tags.dominantTower === 'archer') counter('brute', 0.4, 'Vos archers frappent faiblement : plus de brutes, blindées, dans les prochaines vagues.');
    if (tags.dominantTower === 'cannon') counter('runner', 0.4, 'Votre canon tire lentement : plus de coureurs, difficiles à toucher.');
    if (tags.dominantTower === 'frost')  counter('grunt', 0.4, 'Vos tours de Givre font peu de dégâts : l\'ennemi envoie la masse.');
    if (tags.noSlow && wave >= 2) counter('runner', 0.2, 'Rien ne ralentit vos adversaires : les coureurs en profitent.');
    if (tags.gap) counter('runner', 0.25, 'Un tronçon du chemin est mal couvert : les coureurs foncent par là.');
    if (tags.armorHurts) counter('brute', 0.2, "L'armure ronge vos dégâts : les brutes blindées en profitent.");
    const BC = {
      sniper: ['grunt', "Vos tireurs d'élite tirent lentement : l'IA envoie la masse."],
      volley: ['brute', "Vos volées éparpillent les dégâts : l'IA envoie des brutes résistantes."],
      mortar: ['runner', 'Vos mortiers sont lents : les coureurs filent entre les explosions.'],
      heavy: ['grunt', "Vos canons lourds visent une seule cible : l'IA mise sur le nombre."],
      deep: ['brute', 'Le gel profond blesse peu : des brutes blindées arrivent en renfort.'],
      blizzard: ['saboteur', 'Votre blizzard tient tout le monde à distance : les saboteurs viennent le faire taire.']
    };
    if (tags.dominantBranch) counter(BC[tags.dominantBranch][0], 0.3, BC[tags.dominantBranch][1]);
    if (tags.hoardsGold) { this.aggression = Math.min(1.6, this.aggression * 1.08); msgs.push('Votre or dort : l\'IA en profite pour gonfler ses effectifs.'); }
    if (tags.leakingEnemy === 'boss') { this.aggression = Math.min(1.6, this.aggression * 1.08); msgs.push('Un boss a percé votre défense : l\'IA va en envoyer de plus coriaces.'); }
    if (tags.leakingEnemy && tags.leakingEnemy !== 'boss') counter(tags.leakingEnemy, 0.5, `Les ${ENEMY_LABELS[tags.leakingEnemy]} ont percé votre défense : l'IA en envoie davantage.`);

    if (!tags.leakingEnemy && wave >= 3 && progress < 0.7) {
      const f = 1 + (0.7 - progress) * 0.9;
      this.pressure = Math.min(12, this.pressure * f);
      msgs.push(`Vos tours abattent tout après ${Math.round(progress * 100)} % du trajet : l'IA durcit ses ennemis (×${f.toFixed(2)} de vie).`);
    } else if (tags.leakingEnemy) this.pressure = Math.max(1, this.pressure * 0.92);
    if (tags.killZone) counter('saboteur', 0.3, 'Vos tours tuent presque tout au même endroit : les saboteurs viendront les neutraliser.');

    if (!tags.leakingEnemy) {
      this.aggression = Math.min(1.6, this.aggression * 1.05);
      msgs.push('Aucune fuite : l\'IA renforce encore la pression sur la prochaine vague.');
    }
    return msgs;
  }
};

// Résumé lisible des préférences d'une IA (affiché dans la liste des adversaires).
function aiStyle(w) {
  const [k, v] = Object.entries(w).sort((x, y) => y[1] - x[1])[0];
  return v >= 1.25 ? `aime les ${ENEMY_LABELS[k]} (×${v.toFixed(1)})` : 'équilibrée';
}
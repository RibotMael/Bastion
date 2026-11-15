// Paramètres du joueur, sauvegardés dans le navigateur (localStorage).
const Settings = {
  KEY: 'bastion.settings',
  defaults: { speed: 1, volume: 70, grid: true, range: true, advice: true },
  values: {},

  load() {
    try {
      const saved = JSON.parse(localStorage.getItem(this.KEY));
      this.values = { ...this.defaults, ...saved };
    } catch {
      this.values = { ...this.defaults };
    }
  },

  save() {
    try { localStorage.setItem(this.KEY, JSON.stringify(this.values)); } catch {}
  }
};

// Profil du joueur : c'est la base de l'IA adaptative (étape suivante).
const Profile = {
  KEY: 'bastion.profile',
  data: null,

  empty() {
    return { games: 0, bestWave: 0, aiWeights: null, records: {}, best: {}, seen: {}, towersPlaced: { archer: 0, cannon: 0, frost: 0 }, placements: [], history: [] };
  },

  load() {
    try {
      this.data = { ...this.empty(), ...JSON.parse(localStorage.getItem(this.KEY)) };
    } catch {
      this.data = this.empty();
    }
  },

  save() {
    try { localStorage.setItem(this.KEY, JSON.stringify(this.data)); } catch {}
  },

  reset() {
    this.data = this.empty();
    this.save();
  }
};

// Score de classement : la vague domine, puis les vies restantes, puis la rapidité (durée en secondes).
// 20 vies × 10 000 < 1 000 000 et la durée est plafonnée à 9 999 s : chaque critère ne déborde jamais sur le précédent.
function scoreOf(wave, lives, time) {
  return wave * 1000000 + Math.max(0, Math.min(20, lives)) * 10000 + (9999 - Math.max(0, Math.min(9999, time)));
}
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
    return { games: 0, bestWave: 0, aiWeights: null, records: {}, seen: {}, towersPlaced: { archer: 0, cannon: 0, frost: 0 }, placements: [], history: [] };
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
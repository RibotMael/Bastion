// Mode en ligne (facultatif) : comptes, classement et profil de l'IA via Firebase (offre gratuite Spark).
// Si le service est indisponible, le jeu reste entièrement jouable en local.
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDsLbBRqeLqZR3bLxxvqqERbcA2HQ9tako",
  authDomain: "bastion-a08cc.firebaseapp.com",
  projectId: "bastion-a08cc",
  storageBucket: "bastion-a08cc.firebasestorage.app",
  messagingSenderId: "292014785175",
  appId: "1:292014785175:web:6f11a869848c74aa681fd2"
};
const FB_URL = 'https://www.gstatic.com/firebasejs/10.12.2/';

const Online = {
  user: null, name: null, ready: null, listeners: [], cache: {},

  onChange(fn) { this.listeners.push(fn); },
  emit() { this.listeners.forEach(fn => fn()); },

  // Charge Firebase à la demande (import dynamique : fonctionne sans bundler).
  init() {
    if (this.ready) return this.ready;
    this.ready = (async () => {
      if (!/^https?:$/.test(location.protocol)) throw new Error("Le mode en ligne demande d'ouvrir le jeu via http (serveur local ou site déployé), pas en double-cliquant sur index.html.");
      const [app, auth, fs] = await Promise.all([import(FB_URL + 'firebase-app.js'), import(FB_URL + 'firebase-auth.js'), import(FB_URL + 'firebase-firestore.js')]);
      this.A = auth; this.F = fs;
      this.auth = auth.getAuth(app.initializeApp(FIREBASE_CONFIG));
      this.db = fs.getFirestore(this.auth.app);
      await new Promise(resolve => auth.onAuthStateChanged(this.auth, async (u) => {
        this.user = u;
        this.name = u ? await this.loadName(u.uid).catch(() => null) : null;
        this.emit(); resolve();
      }));
    })().catch(e => { this.ready = null; throw e; });
    return this.ready;
  },

  async loadName(uid) {
    const s = await this.F.getDoc(this.F.doc(this.db, 'users', uid));
    return s.exists() ? s.data().name : null;
  },

  async signUp(name, email, pass) {
    if (!/^[A-Za-z0-9_]{3,16}$/.test(name)) throw new Error('Pseudo : 3 à 16 caractères (lettres, chiffres, _).');
    const key = name.toLowerCase(), { doc, getDoc, writeBatch, serverTimestamp } = this.F;
    if ((await getDoc(doc(this.db, 'usernames', key))).exists()) throw new Error('Ce pseudo est déjà pris.');
    const cred = await this.A.createUserWithEmailAndPassword(this.auth, email, pass);
    try {
      const b = writeBatch(this.db);
      b.set(doc(this.db, 'users', cred.user.uid), { name, createdAt: serverTimestamp() });
      b.set(doc(this.db, 'usernames', key), { uid: cred.user.uid });
      await b.commit();
    } catch (e) { await this.A.deleteUser(cred.user).catch(() => {}); throw e; }
    this.name = name; this.emit();
    await this.afterLogin();
  },

  async signIn(email, pass) {
    await this.A.signInWithEmailAndPassword(this.auth, email, pass);
    await this.afterLogin();
  },
  resetPassword(email) { return this.A.sendPasswordResetEmail(this.auth, email); },
  async signOut() { await this.A.signOut(this.auth); },

  // Fusionne le profil local et le profil en ligne, puis envoie les records locaux au classement.
  async afterLogin() {
    const { doc, getDoc } = this.F;
    const snap = await getDoc(doc(this.db, 'profiles', this.user.uid));
    if (snap.exists()) {
      const remote = JSON.parse(snap.data().data);
      const records = { ...(remote.records || {}) };
      for (const [m, w] of Object.entries(Profile.data.records || {})) records[m] = Math.max(records[m] || 0, w);
      if ((remote.games || 0) > (Profile.data.games || 0)) Profile.data = { ...Profile.empty(), ...remote };
      Profile.data.records = records;
      Profile.save();
    }
    await this.pushProfile();
    for (const [m, w] of Object.entries(Profile.data.records || {})) await this.submit(m, w);
  },

  async pushProfile() {
    if (!this.user) return;
    const { doc, setDoc, serverTimestamp } = this.F;
    await setDoc(doc(this.db, 'profiles', this.user.uid), { data: JSON.stringify(Profile.data), updatedAt: serverTimestamp() }).catch(() => {});
  },

  // N'écrit que si le score améliore le précédent (les règles Firestore l'exigent aussi).
  async submit(map, wave) {
    if (!this.user || !this.name || wave < 1) return;
    const { doc, getDoc, setDoc, serverTimestamp } = this.F;
    const ref = doc(this.db, 'maps', map, 'scores', this.user.uid);
    try {
      const old = await getDoc(ref);
      if (old.exists() && old.data().wave >= wave) return;
      await setDoc(ref, { name: this.name, wave, updatedAt: serverTimestamp() });
      delete this.cache[map];
    } catch (e) { console.warn('Score non envoyé :', e.code || e.message); }
  },

  // Top 50 d'une carte, mis en cache 2 minutes pour économiser les lectures gratuites.
  async leaderboard(map) {
    const c = this.cache[map];
    if (c && Date.now() - c.t < 120000) return c.rows;
    const { collection, query, orderBy, limit, getDocs } = this.F;
    const snap = await getDocs(query(collection(this.db, 'maps', map, 'scores'), orderBy('wave', 'desc'), limit(50)));
    const rows = snap.docs.map(d => ({ uid: d.id, name: d.data().name, wave: d.data().wave }));
    this.cache[map] = { t: Date.now(), rows };
    return rows;
  },

  message(e) {
    const m = {
      'auth/email-already-in-use': 'Cet email est déjà utilisé.',
      'auth/invalid-email': 'Email invalide.',
      'auth/weak-password': 'Mot de passe trop court (6 caractères minimum).',
      'auth/invalid-credential': 'Email ou mot de passe incorrect.',
      'auth/too-many-requests': 'Trop de tentatives. Réessayez dans quelques minutes.',
      'auth/network-request-failed': 'Réseau indisponible.',
      'permission-denied': 'Action refusée par le serveur.'
    };
    return m[e.code] || e.message || 'Service en ligne indisponible. Vous pouvez jouer en invité.';
  }
};
// storage.js — Firebase Firestore data layer

const Storage = (() => {
  const firebaseConfig = {
    apiKey: "AIzaSyAI0W1j7GCMyPI_uaS3qdd9LHrVmAjdZfg",
    authDomain: "pvzkarta.firebaseapp.com",
    projectId: "pvzkarta",
    storageBucket: "pvzkarta.firebasestorage.app",
    messagingSenderId: "14189585783",
    appId: "1:14189585783:web:d2f2f82f8d030cd9412d72"
  };

  firebase.initializeApp(firebaseConfig);
  const db = firebase.firestore();
  const auth = firebase.auth();
  const col = db.collection('pvz');

  let _cache = [];
  let _listeners = [];

  function onUpdate(fn) { _listeners.push(fn); }
  function _notify() { _listeners.forEach(fn => fn()); }

  // Real-time listener
  function startSync() {
    col.orderBy('createdAt', 'asc').onSnapshot(snap => {
      _cache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      _notify();
    }, err => console.error('Firestore sync error:', err));
  }

  function getAll() { return _cache; }

  function getById(id) { return _cache.find(p => p.id === id) || null; }

  async function add(pvz) {
    pvz.createdAt = firebase.firestore.FieldValue.serverTimestamp();
    const ref = await col.add(pvz);
    return { id: ref.id, ...pvz };
  }

  async function update(id, changes) {
    await col.doc(id).update(changes);
  }

  async function remove(id) {
    await col.doc(id).delete();
  }

  return { onUpdate, startSync, getAll, getById, add, update, remove, auth };
})();

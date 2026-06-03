// app.js — map, auth, placemarks

const Auth = (() => {
  function init() {
    Storage.auth.onAuthStateChanged(user => {
      if (user) {
        document.getElementById('login-overlay').style.display = 'none';
        document.getElementById('auth-indicator').innerHTML = `<span class="auth-badge admin">👤 Админ</span>`;
        document.getElementById('auth-indicator').title = user.email;
        UI.setAdmin(true);
      } else {
        document.getElementById('auth-indicator').innerHTML = `<span class="auth-badge">👁 Просмотр</span>`;
        UI.setAdmin(false);
      }
    });
  }

  async function login() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const btn = document.getElementById('login-submit-btn');
    const errEl = document.getElementById('login-error');

    if (!email || !password) { errEl.textContent = 'Введите email и пароль'; return; }

    btn.disabled = true;
    btn.textContent = 'Входим...';
    errEl.textContent = '';

    try {
      await Storage.auth.signInWithEmailAndPassword(email, password);
      document.getElementById('login-overlay').style.display = 'none';
    } catch(e) {
      errEl.textContent = 'Неверный email или пароль';
      btn.disabled = false;
      btn.textContent = 'Войти';
    }
  }

  function skipLogin() {
    document.getElementById('login-overlay').style.display = 'none';
  }

  function logout() {
    Storage.auth.signOut();
    UI.showToast('Вы вышли из аккаунта');
  }

  return { init, login, skipLogin, logout };
})();

const App = (() => {
  const MARKER_COLORS = { ozon: '#4488ff', wb: '#bb44ff', ym: '#ffcc00', other: '#ff5500' };
  let myMap = null;
  let placemarks = {};
  let searchResults = null;

  function init() {
    ymaps.ready(() => {
      myMap = new ymaps.Map('map', {
        center: [55.751244, 37.618423],
        zoom: 10,
        controls: ['zoomControl', 'fullscreenControl']
      });
      myMap.behaviors.enable('scrollZoom');

      Auth.init();
      UI.init(focusPvz);
      Storage.startSync();
      Storage.onUpdate(renderPlacemarks);
    });
  }

  function renderPlacemarks() {
    const all = Storage.getAll();
    const ids = all.map(p => p.id);

    // Remove deleted
    Object.keys(placemarks).forEach(id => {
      if (!ids.includes(id)) {
        myMap.geoObjects.remove(placemarks[id]);
        delete placemarks[id];
      }
    });

    // Add/update
    all.forEach(pvz => {
      if (!pvz.lat || !pvz.lng) return;
      if (placemarks[pvz.id]) {
        placemarks[pvz.id].geometry.setCoordinates([pvz.lat, pvz.lng]);
        placemarks[pvz.id].options.set('iconColor', MARKER_COLORS[pvz.type] || MARKER_COLORS.other);
      } else {
        const pm = createPlacemark(pvz);
        myMap.geoObjects.add(pm);
        placemarks[pvz.id] = pm;
      }
    });
  }

  function createPlacemark(pvz) {
    const pm = new ymaps.Placemark(
      [pvz.lat, pvz.lng], {},
      {
        preset: 'islands#circleDotIcon',
        iconColor: MARKER_COLORS[pvz.type] || MARKER_COLORS.other
      }
    );
    pm.events.add('click', () => {
      const data = Storage.getById(pvz.id);
      if (data) UI.showPopup(data);
    });
    return pm;
  }

  function focusPvz(id) {
    const pvz = Storage.getById(id);
    if (!pvz || !myMap) return;
    if (pvz.lat && pvz.lng) myMap.setCenter([pvz.lat, pvz.lng], 16, { duration: 400 });
    UI.showPopup(pvz);
  }

  function removePlacemark(id) {
    if (placemarks[id]) { myMap.geoObjects.remove(placemarks[id]); delete placemarks[id]; }
  }

  function refreshPlacemark(id) {
    removePlacemark(id);
    const pvz = Storage.getById(id);
    if (pvz && pvz.lat && pvz.lng) {
      const pm = createPlacemark(pvz);
      myMap.geoObjects.add(pm);
      placemarks[id] = pm;
    }
  }

  function mapSearch() {
    const query = document.getElementById('map-search-input').value.trim();
    if (!query || !myMap) return;
    if (searchResults) { myMap.geoObjects.remove(searchResults); searchResults = null; }

    const countEl = document.getElementById('search-results-count');
    countEl.style.display = 'block';
    countEl.textContent = '🔍 Ищем...';

    ymaps.search(query, { boundedBy: myMap.getBounds(), strictBounds: false, results: 20 })
      .then(res => {
        searchResults = res.geoObjects;
        const count = res.geoObjects.getLength();
        if (!count) { countEl.textContent = 'Ничего не найдено'; document.getElementById('map-search-clear').style.display = 'block'; return; }
        res.geoObjects.each(obj => obj.options.set({ preset: 'islands#blueCircleDotIcon' }));
        myMap.geoObjects.add(searchResults);
        myMap.setBounds(searchResults.getBounds(), { checkZoomRange: true, zoomMargin: 40 });
        countEl.textContent = `Найдено: ${count} объектов`;
        document.getElementById('map-search-clear').style.display = 'block';
      })
      .catch(() => { countEl.textContent = 'Ошибка поиска'; });
  }

  function clearMapSearch() {
    if (searchResults) { myMap.geoObjects.remove(searchResults); searchResults = null; }
    document.getElementById('map-search-input').value = '';
    document.getElementById('search-results-count').style.display = 'none';
    document.getElementById('map-search-clear').style.display = 'none';
  }

  return { init, focusPvz, removePlacemark, refreshPlacemark, mapSearch, clearMapSearch };
})();

document.addEventListener('DOMContentLoaded', App.init);

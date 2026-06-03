// admin.js — add, edit, delete PVZ

const Admin = (() => {

  function parseCoords(raw) {
    const cleaned = raw.replace(/\s+/g, '').replace(/[;]/g, ',');
    const parts = cleaned.split(',').map(s => parseFloat(s)).filter(n => !isNaN(n));
    if (parts.length < 2) return null;
    const [a, b] = parts;
    if (Math.abs(a) > 90 && Math.abs(b) <= 90) return { lat: b, lng: a };
    return { lat: a, lng: b };
  }

  async function reverseGeocode(prefix) {
    const raw = document.getElementById(prefix + '-coords').value.trim();
    if (!raw) { UI.showToast('Введи координаты', 'error'); return; }
    const coords = parseCoords(raw);
    if (!coords) { UI.showToast('Неверный формат. Пример: 55.7558, 37.6173', 'error'); return; }

    UI.showToast('🔍 Определяем адрес...', '');
    try {
      const url = `https://geocode-maps.yandex.ru/1.x/?apikey=ff2a08b7-b9c6-4e84-abda-a25720b9b61d&geocode=${coords.lng},${coords.lat}&format=json&results=1&lang=ru_RU&kind=house`;
      const r = await fetch(url);
      const data = await r.json();
      const members = data?.response?.GeoObjectCollection?.featureMember;
      if (!members?.length) { UI.showToast('Адрес не найден по координатам', 'error'); return; }
      const found = members[0].GeoObject.metaDataProperty.GeocoderMetaData.text;
      document.getElementById(prefix + '-addr').value = found;
      UI.showToast('✓ Адрес определён', 'success');
    } catch(e) {
      UI.showToast('Ошибка: ' + e.message, 'error');
    }
  }

  async function addPvz() {
    const name = document.getElementById('new-name').value.trim();
    const addr = document.getElementById('new-addr').value.trim();
    const coordsRaw = document.getElementById('new-coords').value.trim();
    const type = document.getElementById('new-type').value;
    const comment = document.getElementById('new-comment').value.trim();
    const statusEl = document.getElementById('geocode-status');

    if (!addr && !coordsRaw) { UI.showToast('Укажите адрес или координаты', 'error'); return; }

    const btn = document.getElementById('add-btn');
    btn.disabled = true;
    btn.textContent = 'Добавляем...';

    let coords = null;

    // Coords field takes priority
    if (coordsRaw) {
      coords = parseCoords(coordsRaw);
      if (!coords) {
        setStatus(statusEl, 'error', '✗ Неверный формат координат. Пример: 55.7558, 37.6173');
        btn.disabled = false; btn.textContent = '+ Добавить точку'; return;
      }
      coords.found = addr || coordsRaw;
      setStatus(statusEl, 'success', '✓ Координаты приняты');
    } else {
      setStatus(statusEl, 'loading', '🔍 Определяем координаты...');
      try {
        coords = await Geocoder.geocode(addr);
      } catch(e) {
        setStatus(statusEl, 'error', '✗ Ошибка: ' + e.message);
        btn.disabled = false; btn.textContent = '+ Добавить точку'; return;
      }
      if (!coords) {
        setStatus(statusEl, 'error', '✗ Адрес не найден. Введи координаты вручную.');
        btn.disabled = false; btn.textContent = '+ Добавить точку'; return;
      }
    }

    btn.disabled = false;
    btn.textContent = '+ Добавить точку';

    try {
      const pvz = await Storage.add({
        name: name || addr || coordsRaw,
        address: addr || coordsRaw,
        type, comment,
        lat: coords.lat,
        lng: coords.lng
      });

      ['new-name', 'new-addr', 'new-comment', 'new-coords'].forEach(id => document.getElementById(id).value = '');
      document.getElementById('new-type').value = 'other';
      setTimeout(() => setStatus(statusEl, '', ''), 3000);

      UI.showToast('✓ Точка добавлена', 'success');
      App.focusPvz(pvz.id);
      toggleAddForm && toggleAddForm();
    } catch(e) {
      setStatus(statusEl, 'error', '✗ Ошибка сохранения: ' + e.message);
    }
  }

  async function deletePvz(id) {
    if (!confirm('Удалить эту точку?')) return;
    try {
      await Storage.remove(id);
      App.removePlacemark(id);
      UI.closePopup();
      UI.showToast('Точка удалена', 'error');
    } catch(e) {
      UI.showToast('Ошибка удаления', 'error');
    }
  }

  function openEdit(id) {
    const pvz = Storage.getById(id);
    if (!pvz) return;
    document.getElementById('edit-id').value = pvz.id;
    document.getElementById('edit-name').value = pvz.name || '';
    document.getElementById('edit-addr').value = pvz.address || '';
    document.getElementById('edit-type').value = pvz.type || 'other';
    document.getElementById('edit-comment').value = pvz.comment || '';
    document.getElementById('edit-coords').value = (pvz.lat && pvz.lng) ? `${pvz.lat}, ${pvz.lng}` : '';
    setStatus(document.getElementById('edit-geocode-status'), '', '');
    document.getElementById('modal-overlay').classList.add('open');
  }

  async function saveEdit() {
    const id = document.getElementById('edit-id').value;
    const pvz = Storage.getById(id);
    if (!pvz) return;

    const newAddr = document.getElementById('edit-addr').value.trim();
    const coordsRaw = document.getElementById('edit-coords').value.trim();
    const statusEl = document.getElementById('edit-geocode-status');

    const changes = {
      name: document.getElementById('edit-name').value.trim() || newAddr,
      address: newAddr,
      type: document.getElementById('edit-type').value,
      comment: document.getElementById('edit-comment').value.trim(),
      lat: pvz.lat,
      lng: pvz.lng
    };

    // If coords changed — use them
    if (coordsRaw) {
      const coords = parseCoords(coordsRaw);
      if (!coords) { setStatus(statusEl, 'error', '✗ Неверный формат координат'); return; }
      changes.lat = coords.lat;
      changes.lng = coords.lng;
    } else if (newAddr !== pvz.address) {
      setStatus(statusEl, 'loading', '🔍 Определяем координаты...');
      const coords = await Geocoder.geocode(newAddr);
      if (!coords) { setStatus(statusEl, 'error', '✗ Адрес не найден. Введи координаты.'); return; }
      changes.lat = coords.lat;
      changes.lng = coords.lng;
    }

    try {
      await Storage.update(id, changes);
      closeModal();
      UI.showToast('✓ Изменения сохранены', 'success');
      App.refreshPlacemark(id);
    } catch(e) {
      UI.showToast('Ошибка сохранения', 'error');
    }
  }

  function closeModal(e) {
    if (e && e.target !== document.getElementById('modal-overlay')) return;
    document.getElementById('modal-overlay').classList.remove('open');
  }

  function setStatus(el, type, text) {
    if (!el) return;
    el.className = 'geocode-status' + (type ? ' ' + type : '');
    el.textContent = text;
  }

  return { addPvz, deletePvz, openEdit, saveEdit, closeModal, reverseGeocode };
})();

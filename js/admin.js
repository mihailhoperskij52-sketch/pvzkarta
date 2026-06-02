// admin.js — add, edit, delete PVZ (admin only)

const Admin = (() => {
  async function addPvz() {
    const name = document.getElementById('new-name').value.trim();
    const addr = document.getElementById('new-addr').value.trim();
    const type = document.getElementById('new-type').value;
    const comment = document.getElementById('new-comment').value.trim();
    const coordsRaw = document.getElementById('new-coords').value.trim();

    if (!addr && !coordsRaw) { UI.showToast('Укажите адрес или координаты', 'error'); return; }

    const btn = document.getElementById('add-btn');
    const statusEl = document.getElementById('geocode-status');
    btn.disabled = true;
    btn.textContent = 'Ищем адрес...';

    let coords = null;

    // If manual coords provided — use them
    if (coordsRaw) {
      coords = parseCoords(coordsRaw);
      if (!coords) {
        setStatus(statusEl, 'error', '✗ Неверный формат координат. Пример: 55.7558, 37.6173');
        btn.disabled = false;
        btn.textContent = '+ Добавить точку';
        return;
      }
      coords.found = addr || coordsRaw;
      setStatus(statusEl, 'success', '✓ Координаты приняты');
    } else {
      setStatus(statusEl, 'loading', '🔍 Определяем координаты...');
      try {
        coords = await Geocoder.geocode(addr);
      } catch(e) {
        setStatus(statusEl, 'error', '✗ Ошибка: ' + e.message);
        btn.disabled = false;
        btn.textContent = '+ Добавить точку';
        return;
      }
      if (!coords) {
        setStatus(statusEl, 'error', '✗ Адрес не найден. Введи координаты вручную.');
        btn.disabled = false;
        btn.textContent = '+ Добавить точку';
        return;
      }
    }

    btn.disabled = false;
    btn.textContent = '+ Добавить точку';

    setStatus(statusEl, 'success', '✓ ' + coords.found);

    try {
      const pvz = await Storage.add({
        name: name || addr,
        address: addr,
        type,
        comment,
        lat: coords.lat,
        lng: coords.lng
      });

      ['new-name', 'new-addr', 'new-comment', 'new-coords'].forEach(id => document.getElementById(id).value = '');
      document.getElementById('new-type').value = 'other';
      setTimeout(() => setStatus(statusEl, '', ''), 3000);

      UI.showToast('✓ Точка добавлена', 'success');
      App.focusPvz(pvz.id);
      UI.switchTab('list');
    } catch(e) {
      setStatus(statusEl, 'error', '✗ Ошибка сохранения: ' + e.message);
    }
  }

  async function deletePvz(id) {
    if (!confirm('Удалить эту точку?')) return;
    try {
      await Storage.remove(id);
      App.removePlacemark(id);
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
    document.getElementById('edit-addr').value = pvz.address;
    document.getElementById('edit-type').value = pvz.type;
    document.getElementById('edit-comment').value = pvz.comment || '';
    setStatus(document.getElementById('edit-geocode-status'), '', '');
    document.getElementById('modal-overlay').classList.add('open');
  }

  async function saveEdit() {
    const id = document.getElementById('edit-id').value;
    const pvz = Storage.getById(id);
    if (!pvz) return;

    const newAddr = document.getElementById('edit-addr').value.trim();
    const changes = {
      name: document.getElementById('edit-name').value.trim() || newAddr,
      address: newAddr,
      type: document.getElementById('edit-type').value,
      comment: document.getElementById('edit-comment').value.trim(),
      lat: pvz.lat,
      lng: pvz.lng
    };

    if (newAddr !== pvz.address) {
      const statusEl = document.getElementById('edit-geocode-status');
      setStatus(statusEl, 'loading', '🔍 Определяем координаты...');
      const coords = await Geocoder.geocode(newAddr);
      if (!coords) {
        setStatus(statusEl, 'error', '✗ Адрес не найден');
        return;
      }
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

  function renderAdminList() {
    const all = Storage.getAll();
    const el = document.getElementById('admin-list');
    if (!el) return;
    if (!all.length) {
      el.innerHTML = '<p class="empty-text">Нет добавленных точек</p>';
      return;
    }
    el.innerHTML = all.map(pvz => `
      <div class="admin-pvz-item">
        <div class="admin-pvz-top">
          ${UI.badgeHtml(pvz.type)}
          <span class="admin-pvz-name">${pvz.name || pvz.address}</span>
        </div>
        <div class="admin-pvz-addr">${pvz.address}</div>
        <div class="admin-pvz-actions">
          <button class="btn btn-edit" onclick="Admin.openEdit('${pvz.id}')">✏️ Изменить</button>
          <button class="btn btn-danger" onclick="Admin.deletePvz('${pvz.id}')">🗑 Удалить</button>
        </div>
      </div>
    `).join('');
  }

  function parseCoords(raw) {
    const parts = raw.replace(/[;\s]+/g, ',').split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
    if (parts.length < 2) return null;
    const [a, b] = parts;
    // Auto-detect order: lat is ~55, lng is ~37 for Moscow
    if (a > 90 || b > 90) return null;
    return { lat: a, lng: b };
  }

  async function reverseGeocode(prefix) {
    const coordsRaw = document.getElementById(prefix + '-coords').value.trim();
    if (!coordsRaw) { UI.showToast('Введи координаты', 'error'); return; }
    const coords = parseCoords(coordsRaw);
    if (!coords) { UI.showToast('Неверный формат координат', 'error'); return; }

    UI.showToast('🔍 Определяем адрес...', '');
    try {
      const url = `https://geocode-maps.yandex.ru/1.x/?apikey=ff2a08b7-b9c6-4e84-abda-a25720b9b61d&geocode=${coords.lng},${coords.lat}&format=json&results=1&lang=ru_RU&kind=house`;
      const r = await fetch(url);
      const data = await r.json();
      const members = data?.response?.GeoObjectCollection?.featureMember;
      if (!members?.length) { UI.showToast('Адрес не найден', 'error'); return; }
      const found = members[0].GeoObject.metaDataProperty.GeocoderMetaData.text;
      document.getElementById(prefix + '-addr').value = found;
      UI.showToast('✓ Адрес определён', 'success');
    } catch(e) {
      UI.showToast('Ошибка: ' + e.message, 'error');
    }
  }

  function setStatus(el, type, text) {
    if (!el) return;
    el.className = 'geocode-status' + (type ? ' ' + type : '');
    el.textContent = text;
  }

  return { addPvz, deletePvz, openEdit, saveEdit, closeModal, renderAdminList, reverseGeocode };
})();

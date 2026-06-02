// admin.js — add, edit, delete PVZ (admin only)

const Admin = (() => {
  async function addPvz() {
    const name = document.getElementById('new-name').value.trim();
    const addr = document.getElementById('new-addr').value.trim();
    const type = document.getElementById('new-type').value;
    const comment = document.getElementById('new-comment').value.trim();

    if (!addr) { UI.showToast('Укажите адрес', 'error'); return; }

    const btn = document.getElementById('add-btn');
    const statusEl = document.getElementById('geocode-status');
    btn.disabled = true;
    btn.textContent = 'Ищем адрес...';
    setStatus(statusEl, 'loading', '🔍 Определяем координаты...');

    let coords = null;
    try {
      coords = await Geocoder.geocode(addr);
    } catch(e) {
      setStatus(statusEl, 'error', '✗ Ошибка: ' + e.message);
      btn.disabled = false;
      btn.textContent = '+ Добавить точку';
      return;
    }

    btn.disabled = false;
    btn.textContent = '+ Добавить точку';

    if (!coords) {
      setStatus(statusEl, 'error', '✗ Адрес не найден. Уточни написание.');
      return;
    }

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

      ['new-name', 'new-addr', 'new-comment'].forEach(id => document.getElementById(id).value = '');
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

  function setStatus(el, type, text) {
    if (!el) return;
    el.className = 'geocode-status' + (type ? ' ' + type : '');
    el.textContent = text;
  }

  return { addPvz, deletePvz, openEdit, saveEdit, closeModal, renderAdminList };
})();

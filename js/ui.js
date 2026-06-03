// ui.js — list, filters, sidebar, popup

const UI = (() => {
  const BADGE = { ozon: 'Ozon', wb: 'Wildberries', ym: 'Яндекс Маркет', other: 'ПВЗ' };
  const BADGE_CLS = { ozon: 'badge-ozon', wb: 'badge-wb', ym: 'badge-ym', other: 'badge-other' };

  let activeFilter = 'all';
  let searchQuery = '';
  let selectedId = null;
  let onFocus = null;
  let isAdmin = false;

  function init(focusCallback) {
    onFocus = focusCallback;

    document.getElementById('search-input').addEventListener('input', e => {
      searchQuery = e.target.value.toLowerCase();
      renderList();
    });

    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        activeFilter = btn.dataset.filter;
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderList();
      });
    });

    Storage.onUpdate(() => {
      renderList();
      updateStats();
    });
  }

  function setAdmin(val) {
    isAdmin = val;
    renderList();
    // Show/hide add form and logout
    const addSection = document.getElementById('add-form-section');
    const logoutSection = document.getElementById('logout-section');
    if (addSection) addSection.style.display = val ? 'block' : 'none';
    if (logoutSection) logoutSection.style.display = val ? 'block' : 'none';
    // Show login button if not admin
    const loginBtn = document.getElementById('login-btn-header');
    if (loginBtn) loginBtn.style.display = val ? 'none' : 'block';
  }

  function renderList() {
    const all = Storage.getAll();
    const list = document.getElementById('pvz-list');
    const empty = document.getElementById('list-empty');

    const filtered = all.filter(p => {
      const matchFilter = activeFilter === 'all' || p.type === activeFilter;
      const matchSearch = !searchQuery ||
        (p.name || '').toLowerCase().includes(searchQuery) ||
        (p.address || '').toLowerCase().includes(searchQuery) ||
        (p.comment || '').toLowerCase().includes(searchQuery);
      return matchFilter && matchSearch;
    });

    document.querySelectorAll('.filter-btn').forEach(btn => {
      const f = btn.dataset.filter;
      const count = f === 'all' ? all.length : all.filter(p => p.type === f).length;
      const countEl = btn.querySelector('.filter-count');
      if (countEl) countEl.textContent = count;
    });

    list.innerHTML = '';
    empty.style.display = filtered.length ? 'none' : 'block';

    filtered.forEach(pvz => {
      const div = document.createElement('div');
      div.className = 'pvz-item' + (selectedId === pvz.id ? ' selected' : '');
      div.dataset.id = pvz.id;
      div.innerHTML = `
        <span class="pvz-badge ${BADGE_CLS[pvz.type] || BADGE_CLS.other}">${BADGE[pvz.type] || BADGE.other}</span>
        <div class="pvz-item-name">${pvz.name || pvz.address}</div>
        <div class="pvz-item-addr">${pvz.address}</div>
        ${pvz.comment ? `<div class="pvz-item-comment">${pvz.comment}</div>` : ''}
        ${isAdmin ? `<div class="pvz-item-actions">
          <button class="btn btn-edit" onclick="event.stopPropagation();Admin.openEdit('${pvz.id}')">✏️ Изменить</button>
          <button class="btn btn-danger" onclick="event.stopPropagation();Admin.deletePvz('${pvz.id}')">🗑 Удалить</button>
        </div>` : ''}
      `;
      div.addEventListener('click', () => {
        selectedId = pvz.id;
        renderList();
        if (onFocus) onFocus(pvz.id);
        if (window.innerWidth < 768) closeMobileSidebar();
      });
      list.appendChild(div);
    });
  }

  function showPopup(pvz) {
    document.getElementById('popup-badge').innerHTML =
      `<span class="pvz-badge ${BADGE_CLS[pvz.type] || BADGE_CLS.other}">${BADGE[pvz.type] || BADGE.other}</span>`;
    document.getElementById('popup-name').textContent = pvz.name || pvz.address;
    document.getElementById('popup-addr').textContent = pvz.address;
    document.getElementById('popup-comment').textContent = pvz.comment || 'Комментарий не добавлен';

    // Admin actions in popup
    const actionsEl = document.getElementById('popup-admin-actions');
    if (isAdmin) {
      actionsEl.innerHTML = `
        <div class="popup-actions">
          <button class="btn btn-edit" onclick="Admin.openEdit('${pvz.id}')">✏️ Изменить</button>
          <button class="btn btn-danger" onclick="Admin.deletePvz('${pvz.id}')">🗑 Удалить</button>
        </div>`;
    } else {
      actionsEl.innerHTML = '';
    }

    document.getElementById('info-popup').classList.add('open');
    selectedId = pvz.id;
    renderList();
  }

  function closePopup() {
    document.getElementById('info-popup').classList.remove('open');
    selectedId = null;
    renderList();
  }

  function showToast(msg, type = '') {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className = 'toast show ' + type;
    setTimeout(() => t.className = 'toast', 2800);
  }

  function updateStats() {
    const all = Storage.getAll();
    document.getElementById('stat-total').textContent = all.length;
    document.getElementById('stat-ozon').textContent = all.filter(p => p.type === 'ozon').length;
    document.getElementById('stat-wb').textContent = all.filter(p => p.type === 'wb').length;
    document.getElementById('stat-ym').textContent = all.filter(p => p.type === 'ym').length;
    document.getElementById('header-count').textContent = `${all.length} точек`;
  }

  function openMobileSidebar() {
    document.getElementById('sidebar').classList.add('mobile-open');
    document.getElementById('mobile-overlay').classList.add('open');
  }

  function closeMobileSidebar() {
    document.getElementById('sidebar').classList.remove('mobile-open');
    document.getElementById('mobile-overlay').classList.remove('open');
  }

  function badgeHtml(type) {
    return `<span class="pvz-badge ${BADGE_CLS[type] || BADGE_CLS.other}">${BADGE[type] || BADGE.other}</span>`;
  }

  return { init, setAdmin, renderList, showPopup, closePopup, showToast, updateStats, openMobileSidebar, closeMobileSidebar, badgeHtml };
})();

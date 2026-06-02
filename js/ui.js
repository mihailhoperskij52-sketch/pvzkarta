// ui.js — list, filters, sidebar, popup

const UI = (() => {
  const BADGE = { ozon: 'Ozon', wb: 'Wildberries', ym: 'Яндекс Маркет', other: 'ПВЗ' };
  const BADGE_CLS = { ozon: 'badge-ozon', wb: 'badge-wb', ym: 'badge-ym', other: 'badge-other' };

  let activeFilter = 'all';
  let searchQuery = '';
  let selectedId = null;
  let onFocus = null;

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
      Admin.renderAdminList();
    });
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

    // Update filter counts
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

  function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach((b, i) => {
      b.classList.toggle('active', (i === 0 && tab === 'list') || (i === 1 && tab === 'admin'));
    });
    document.getElementById('panel-list').classList.toggle('active', tab === 'list');
    document.getElementById('panel-admin').classList.toggle('active', tab === 'admin');
  }

  function badgeHtml(type) {
    return `<span class="pvz-badge ${BADGE_CLS[type] || BADGE_CLS.other}">${BADGE[type] || BADGE.other}</span>`;
  }

  return { init, renderList, showPopup, closePopup, showToast, updateStats, openMobileSidebar, closeMobileSidebar, switchTab, badgeHtml };
})();

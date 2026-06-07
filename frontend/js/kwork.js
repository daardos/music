// ==================== БИРЖА KWORK ====================
App.kworkInitialized = false;

App.initKwork = function() {
  if (App.kworkInitialized) return;
  App.kworkInitialized = true;

  // ---------- Вспомогательные DOM-элементы ----------
  const ordersContainer = () => document.getElementById('kwork-orders');
  const credsMsg = () => document.getElementById('kwork-creds-message');
  const statusMsg = () => document.getElementById('kwork-status');
  const keywordsSelect = () => document.getElementById('keywords-select');
  const keywordInput = () => document.getElementById('keyword-input');

  // ---------- Обновление списка заказов ----------
  App.refreshKwork = async function() {
    const container = ordersContainer();
    if (!container) return;
    container.innerHTML = 'Загрузка...';
    try {
      const res = await fetch('/get_kwork');
      if (!res.ok) throw new Error('Ошибка сервера');
      const orders = await res.json();
      if (!orders.length) {
        container.innerHTML = '<p>Нет заказов по заданным ключевым словам.</p>';
        return;
      }
      container.innerHTML = orders.map(o => `
        <div class="kwork-card">
          <h4>${escapeHtml(o.title)}</h4>
          <div class="budget">${escapeHtml(o.budget || 'Бюджет не указан')}</div>
          <div class="desc">${escapeHtml(o.description)}</div>
          <div class="card-actions">
            <button class="open-link-btn" data-url="${escapeHtml(o.link)}">Откликнуться</button>
          </div>
        </div>
      `).join('');
      // Вешаем обработчики на кнопки "Откликнуться"
      container.querySelectorAll('.open-link-btn').forEach(btn => {
        btn.addEventListener('click', () => openKworkLink(btn.dataset.url));
      });
    } catch (e) {
      container.innerHTML = '<p>Не удалось обновить ленту заказов. Проверьте подключение.</p>';
    }
  };

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  async function openKworkLink(url) {
    try {
      await fetch('/open_link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
    } catch (e) {
      console.error('Не удалось открыть ссылку', e);
    }
  }

  // ---------- Загрузка сохранённого логина ----------
  App.loadKworkCreds = async function() {
    try {
      const res = await fetch('/get_kwork_creds');
      const data = await res.json();
      const usernameInput = document.getElementById('kwork-username');
      if (usernameInput) usernameInput.value = data.username || '';
    } catch (e) {}
  };

  // ---------- Управление ключевыми словами ----------
  async function loadKeywords() {
    try {
      const res = await fetch('/get_kwork_config');
      const config = await res.json();
      const keywords = config.keywords || [];
      const select = keywordsSelect();
      if (!select) return;
      select.innerHTML = '';
      keywords.forEach(kw => {
        const opt = document.createElement('option');
        opt.value = kw;
        opt.textContent = kw;
        select.appendChild(opt);
      });
    } catch (e) {
      console.error('Ошибка загрузки ключевых слов', e);
    }
  }

  async function saveKeywords(keywords) {
    try {
      const res = await fetch('/save_kwork_config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords })
      });
      const data = await res.json();
      statusMsg().textContent = data.message;
      setTimeout(() => statusMsg().textContent = '', 3000);
    } catch (e) {
      statusMsg().textContent = 'Ошибка сохранения';
    }
  }

  async function addKeyword() {
    const input = keywordInput();
    const kw = input.value.trim();
    if (!kw) return;
    const select = keywordsSelect();
    const current = Array.from(select.options).map(o => o.value);
    if (current.includes(kw)) {
      statusMsg().textContent = 'Такое слово уже есть';
      setTimeout(() => statusMsg().textContent = '', 3000);
      return;
    }
    current.push(kw);
    await saveKeywords(current);
    input.value = '';
    await loadKeywords();
    App.refreshKwork(); // обновить заказы с новым фильтром
  }

  async function removeSelectedKeywords() {
    const select = keywordsSelect();
    const selected = Array.from(select.selectedOptions).map(o => o.value);
    if (!selected.length) return;
    const current = Array.from(select.options).map(o => o.value).filter(kw => !selected.includes(kw));
    await saveKeywords(current);
    await loadKeywords();
    App.refreshKwork();
  }

  // ---------- Принудительное обновление ----------
  async function forceUpdate() {
    const btn = document.getElementById('force-update-btn');
    if (btn) btn.disabled = true;
    try {
      const res = await fetch('/force_update', { method: 'POST' });
      const data = await res.json();
      statusMsg().textContent = data.message;
      App.refreshKwork();
    } catch (e) {
      statusMsg().textContent = 'Ошибка обновления';
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  // ---------- Обработчики событий ----------
  document.addEventListener('click', async (e) => {
    if (e.target.id === 'kwork-save-creds') {
      const username = document.getElementById('kwork-username').value.trim();
      const password = document.getElementById('kwork-password').value.trim();
      const msg = credsMsg();

      if (!username || !password) {
        await fetch('/set_kwork_creds', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: '', password: '' })
        });
        if (msg) msg.textContent = 'Данные удалены';
        setTimeout(() => { if (msg) msg.textContent = ''; }, 3000);
        document.getElementById('kwork-username').value = '';
        document.getElementById('kwork-password').value = '';
        return;
      }

      const res = await fetch('/set_kwork_creds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (msg) {
        msg.textContent = data.message;
        setTimeout(() => { if (msg) msg.textContent = ''; }, 3000);
      }
      document.getElementById('kwork-password').value = '';
    }
    else if (e.target.id === 'add-keyword-btn') {
      await addKeyword();
    }
    else if (e.target.id === 'remove-keyword-btn') {
      await removeSelectedKeywords();
    }
    else if (e.target.id === 'force-update-btn') {
      await forceUpdate();
    }
  });

  // Автообновление каждую минуту
  setInterval(() => App.refreshKwork(), 60000);

  // Первоначальная загрузка
  App.refreshKwork();
  App.loadKworkCreds();
  loadKeywords();
};

App.tabInitializers.kwork = async function() {
  App.initKwork();
};
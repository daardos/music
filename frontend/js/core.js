// ==================== ЯДРО ПРИЛОЖЕНИЯ ====================
window.App = window.App || {};

// Утилиты
App.$ = (sel) => document.querySelector(sel);
App.$$ = (sel) => document.querySelectorAll(sel);

// Кэш загруженных HTML-фрагментов
App.tabCache = {};

// Функция загрузки содержимого вкладки
App.loadTabContent = async function(tabName) {
  if (App.tabCache[tabName]) return App.tabCache[tabName];
  const resp = await fetch(`${tabName}.html`);
  if (!resp.ok) throw new Error(`Не удалось загрузить ${tabName}.html`);
  const html = await resp.text();
  App.tabCache[tabName] = html;
  return html;
};

// Инициализаторы вкладок (заполняются другими модулями)
App.tabInitializers = {
  music: null,
  kwork: null,
  system: null,
  notes: null
};

// Переключение вкладок
App.$$('.tab-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    const tabId = btn.dataset.tab;
    App.$$('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    App.$$('.tab-content').forEach(c => c.classList.remove('active'));
    const container = App.$(`#tab-${tabId}`);
    container.classList.add('active');

    if (!container.innerHTML.trim()) {
      try {
        const html = await App.loadTabContent(tabId);
        container.innerHTML = html;
        if (App.tabInitializers[tabId]) {
          await App.tabInitializers[tabId]();
        }
      } catch (e) {
        container.innerHTML = `<p>Ошибка загрузки: ${e.message}</p>`;
      }
    }
  });
});
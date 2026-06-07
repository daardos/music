// ==================== УПРАВЛЕНИЕ СИСТЕМОЙ ====================
App.systemInitialized = false;

App.initSystem = function() {
  if (App.systemInitialized) return;
  App.systemInitialized = true;

  // Обработчик кнопок тем и сброса
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('.system-btn');
    if (!btn) return;
    const action = btn.dataset.action;

    if (action === 'set-theme') {
      const mode = btn.dataset.mode;
      const res = await fetch('/set_theme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode })
      });
      const data = await res.json();
      showMessage('theme-message', data.message, data.success ? 'success' : 'error');
    }
    else if (action === 'reset-theme') {
      const res = await fetch('/reset_theme', { method: 'POST' });
      const data = await res.json();
      showMessage('theme-message', data.message, data.success ? 'success' : 'error');
    }
    else if (action === 'launch') {
      // старые кнопки быстрого запуска, если остались
      const appId = btn.dataset.app;
      const res = await fetch('/launch_app', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ app_id: appId })
      });
      const data = await res.json();
      showMessage('preset-message', data.message, data.success ? 'success' : 'error');
    }
  });

  // Обработчик запуска пресета
  document.getElementById('run-preset-btn')?.addEventListener('click', async () => {
    const select = document.getElementById('preset-select');
    const presetName = select.value;
    if (!presetName) return;
    const res = await fetch('/run_preset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preset: presetName })
    });
    const data = await res.json();
    showMessage('preset-message', data.message, data.success ? 'success' : 'error');
  });

  // Загрузка списка пресетов
  async function loadPresets() {
    try {
      const res = await fetch('/get_presets');
      const data = await res.json();
      const select = document.getElementById('preset-select');
      if (!select) return;
      // Очищаем старые опции, кроме первой пустой
      select.innerHTML = '<option value="">-- Выберите пресет --</option>';
      for (const preset of data.presets) {
        const opt = document.createElement('option');
        opt.value = preset.name;
        opt.textContent = preset.name;
        select.appendChild(opt);
      }
    } catch (e) {
      console.error('Failed to load presets', e);
    }
  }

  function showMessage(elementId, text, type) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.textContent = text;
    el.style.color = type === 'error' ? '#e74c3c' : 'var(--text-secondary)';
    setTimeout(() => { el.textContent = ''; }, 4000);
  }

  loadPresets(); // загружаем сразу при инициализации
};

App.tabInitializers.system = App.initSystem;
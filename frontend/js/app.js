// ==================== ТОЧКА ВХОДА ====================
(async () => {
  try {
    const activeBtn = document.querySelector('.tab-btn.active');
    if (activeBtn) {
      const tabId = activeBtn.dataset.tab;
      const container = document.getElementById(`tab-${tabId}`);
      if (!container.innerHTML.trim()) {
        const html = await App.loadTabContent(tabId);
        container.innerHTML = html;
        if (App.tabInitializers[tabId]) {
          await App.tabInitializers[tabId]();
        }
      }
    }
  } catch (e) {
    alert('Ошибка при запуске: ' + e.message);
  }
})();
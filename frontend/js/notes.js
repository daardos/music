// ==================== ПРОДВИНУТЫЙ БЛОКНОТ (IndexedDB) ====================
App.notesInitialized = false;

App.initNotes = async function() {
  if (App.notesInitialized) return;
  App.notesInitialized = true;

  let db = null;
  let currentNoteId = null;
  let currentFolderId = null;
  let expandedFolders = new Set();

  // ---------- Инициализация IndexedDB ----------
  function openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('NotesDB', 1);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('folders')) {
          db.createObjectStore('folders', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('notes')) {
          const notesStore = db.createObjectStore('notes', { keyPath: 'id' });
          notesStore.createIndex('folder_id', 'folder_id', { unique: false });
        }
      };
      request.onsuccess = (e) => {
        db = e.target.result;
        resolve(db);
      };
      request.onerror = (e) => reject(e.target.error);
    });
  }

  function dbTransaction(storeName, mode) {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    return { tx, store };
  }

  function dbGet(storeName, id) {
    return new Promise((resolve, reject) => {
      const { store } = dbTransaction(storeName, 'readonly');
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  function dbGetAll(storeName) {
    return new Promise((resolve, reject) => {
      const { store } = dbTransaction(storeName, 'readonly');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  function dbPut(storeName, item) {
    return new Promise((resolve, reject) => {
      const { store } = dbTransaction(storeName, 'readwrite');
      const req = store.put(item);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  function dbDelete(storeName, id) {
    return new Promise((resolve, reject) => {
      const { store } = dbTransaction(storeName, 'readwrite');
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async function getNotesByFolder(folderId) {
    const { store } = dbTransaction('notes', 'readonly');
    const index = store.index('folder_id');
    const req = index.getAll(folderId);
    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // ---------- Экранирование HTML ----------
  function escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }

  // ---------- Рендер дерева папок ----------
  async function renderNotesTree() {
    const treeEl = document.getElementById('notes-tree');
    if (!treeEl) return;
    const folders = await dbGetAll('folders');
    const rootFolders = folders.filter(f => !f.parent_id);
    const getChildren = (parentId) => folders.filter(f => f.parent_id === parentId);

    function buildTree(parentId = null, level = 0) {
      const items = parentId === null ? rootFolders : getChildren(parentId);
      let html = '';
      for (const folder of items) {
        const hasChildren = getChildren(folder.id).length > 0;
        const isExpanded = expandedFolders.has(folder.id);
        const isActive = currentFolderId === folder.id;
        html += `<li class="tree-item ${isActive ? 'active' : ''}" data-folder-id="${folder.id}">`;
        html += `<div class="tree-row" style="padding-left: ${level * 20}px;">`;
        html += `<span class="tree-toggle ${hasChildren ? (isExpanded ? 'expanded' : 'collapsed') : 'leaf'}" data-toggle="${folder.id}">`;
        if (hasChildren) {
          html += `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5l8 7-8 7z"/></svg>`;
        }
        html += `</span>`;
        html += `<span class="tree-name">${escapeHtml(folder.name)}</span>`;
        html += `<span class="tree-actions">`;
        html += `<button class="tree-add-note" title="Добавить заметку" data-folder="${folder.id}">+</button>`;
        html += `<button class="tree-delete-folder" title="Удалить папку" data-folder="${folder.id}">×</button>`;
        html += `</span>`;
        html += `</div>`;
        if (hasChildren && isExpanded) {
          html += `<ul>${buildTree(folder.id, level + 1)}</ul>`;
        }
        html += `</li>`;
      }
      return html;
    }

    treeEl.innerHTML = buildTree();
    attachTreeEvents();
  }

  function attachTreeEvents() {
    const treeEl = document.getElementById('notes-tree');
    if (!treeEl) return;
    treeEl.addEventListener('click', async (e) => {
      const toggle = e.target.closest('.tree-toggle');
      if (toggle) {
        const folderId = toggle.dataset.toggle;
        if (expandedFolders.has(folderId)) expandedFolders.delete(folderId);
        else expandedFolders.add(folderId);
        renderNotesTree();
        return;
      }
      const addBtn = e.target.closest('.tree-add-note');
      if (addBtn) {
        const folderId = addBtn.dataset.folder;
        currentFolderId = folderId;
        await createNewNote(folderId);
        renderNotesTree();
        return;
      }
      const delBtn = e.target.closest('.tree-delete-folder');
      if (delBtn) {
        if (!confirm('Удалить папку и все вложенные заметки?')) return;
        const folderId = delBtn.dataset.folder;
        await deleteFolderRecursive(folderId);
        if (currentFolderId === folderId) currentFolderId = null;
        if (currentNoteId && (await dbGet('notes', currentNoteId))?.folder_id === folderId) {
          currentNoteId = null;
          document.getElementById('notes-editor').innerHTML = '';
        }
        renderNotesTree();
        return;
      }
      const row = e.target.closest('.tree-row');
      if (row) {
        const folderId = row.parentElement.dataset.folderId;
        currentFolderId = folderId;
        renderNotesTree();
        const notes = await getNotesByFolder(folderId);
        if (notes.length > 0) {
          await loadNote(notes[0].id);
        } else {
          currentNoteId = null;
          document.getElementById('notes-editor').innerHTML = '';
        }
      }
    });
  }

  async function deleteFolderRecursive(folderId) {
    const folders = await dbGetAll('folders');
    const getChildrenIds = (parentId) => folders.filter(f => f.parent_id === parentId).map(f => f.id);
    const queue = [folderId];
    const toDelete = new Set();
    while (queue.length) {
      const id = queue.pop();
      toDelete.add(id);
      const childIds = getChildrenIds(id);
      childIds.forEach(cid => queue.push(cid));
    }
    const allNotes = await dbGetAll('notes');
    for (const note of allNotes) {
      if (toDelete.has(note.folder_id)) await dbDelete('notes', note.id);
    }
    for (const id of toDelete) {
      await dbDelete('folders', id);
    }
  }

  async function createNewNote(folderId) {
    const noteId = generateId();
    await dbPut('notes', { id: noteId, folder_id: folderId, html_content: '', updated_at: Date.now() });
    await loadNote(noteId);
  }

  async function loadNote(noteId) {
    const note = await dbGet('notes', noteId);
    if (!note) return;
    currentNoteId = noteId;
    document.getElementById('notes-editor').innerHTML = note.html_content || '';
  }

  async function saveCurrentNote() {
    if (!currentNoteId) return;
    const editor = document.getElementById('notes-editor');
    if (!editor) return;
    const html = editor.innerHTML;
    await dbPut('notes', { id: currentNoteId, folder_id: currentFolderId, html_content: html, updated_at: Date.now() });
  }

  function setupAutoSave() {
    const editor = document.getElementById('notes-editor');
    if (!editor) return;
    editor.addEventListener('input', debounce(saveCurrentNote, 1000));
  }

  function debounce(fn, delay) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  // ---------- Экспорт бэкапа ----------
  async function exportBackup() {
    const data = {
      folders: await dbGetAll('folders'),
      notes: await dbGetAll('notes')
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'notes_backup.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  // ---------- Тулбар редактора ----------
  function setupToolbar() {
    document.getElementById('notes-editor')?.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'b') { e.preventDefault(); document.execCommand('bold'); }
      if (e.ctrlKey && e.key === 'i') { e.preventDefault(); document.execCommand('italic'); }
    });

    document.querySelector('.notes-editor-toolbar')?.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      const command = btn.dataset.command;
      if (command) {
        document.execCommand(command);
        document.getElementById('notes-editor').focus();
      }
      if (btn.id === 'insert-image-btn') {
        document.getElementById('image-file-input').click();
      }
      if (btn.id === 'export-backup-btn') {
        exportBackup();
      }
    });

    document.getElementById('image-file-input')?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = document.createElement('img');
        img.src = ev.target.result;
        img.style.maxWidth = '100%';
        document.getElementById('notes-editor').focus();
        const sel = window.getSelection();
        if (sel.rangeCount) {
          const range = sel.getRangeAt(0);
          range.deleteContents();
          range.insertNode(img);
          range.collapse(false);
        }
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    });

    // Вставка изображений из буфера обмена
    document.getElementById('notes-editor')?.addEventListener('paste', (e) => {
      const items = e.clipboardData?.items;
      if (items) {
        for (const item of items) {
          if (item.type.indexOf('image') !== -1) {
            e.preventDefault();
            const blob = item.getAsFile();
            const reader = new FileReader();
            reader.onload = (ev) => {
              const img = document.createElement('img');
              img.src = ev.target.result;
              img.style.maxWidth = '100%';
              const sel = window.getSelection();
              if (sel.rangeCount) {
                const range = sel.getRangeAt(0);
                range.deleteContents();
                range.insertNode(img);
                range.collapse(false);
              }
            };
            reader.readAsDataURL(blob);
            return;
          }
        }
      }
    });
  }

  // ---------- Добавление папки ----------
  async function addFolder(parentId = null) {
    const name = prompt('Название папки:');
    if (!name) return;
    const id = generateId();
    await dbPut('folders', { id, name, parent_id: parentId });
    if (parentId) expandedFolders.add(parentId);
    renderNotesTree();
  }

  // ---------- Старт ----------
  await openDB();
  renderNotesTree();
  setupToolbar();
  setupAutoSave();

  document.getElementById('add-folder-btn')?.addEventListener('click', () => addFolder(currentFolderId));
  document.getElementById('collapse-all-btn')?.addEventListener('click', () => {
    expandedFolders.clear();
    renderNotesTree();
  });
};

App.tabInitializers.notes = App.initNotes;
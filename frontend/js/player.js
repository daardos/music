// ==================== МУЗЫКАЛЬНЫЙ ПЛЕЕР ====================
// (глобальный App уже определён в core.js)

App.musicInitialized = false;

App.initMusic = function() {
  if (App.musicInitialized) return;
  App.musicInitialized = true;

  // DOM-элементы плеера
  const audio = new Audio();
  const playPauseBtn = document.getElementById('play-pause-btn');
  const iconPlay = document.getElementById('icon-play');
  const iconPause = document.getElementById('icon-pause');
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');
  const seekSlider = document.getElementById('seek-slider');
  const currentTimeSpan = document.getElementById('current-time');
  const durationTimeSpan = document.getElementById('duration-time');
  const trackTitle = document.getElementById('track-title');
  const playlistEl = document.getElementById('playlist');
  const fileInput = document.getElementById('file-input');
  const filePickerBtn = document.getElementById('file-picker-btn');
  const dropOverlay = document.getElementById('drop-overlay');
  const volumeSlider = document.getElementById('volume-slider');
  const muteBtn = document.getElementById('mute-btn');
  const iconVolumeHigh = document.getElementById('icon-volume-high');
  const iconVolumeMute = document.getElementById('icon-volume-mute');

  let playlistData = { tabs: [], active_tab_index: 0 };
  let currentIndex = -1;
  let isPlaying = false;
  let isMuted = false;
  let lastVolume = 0.8;
  let isSeeking = false;
  let dragSrcIndex = null;

  audio.volume = 0.8;
  volumeSlider.value = 80;

  const formatTime = (s) => {
    if (isNaN(s) || s < 0) return '00:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  async function loadMusicData() {
    const res = await fetch('/get_data');
    playlistData = await res.json();
  }
  async function saveMusicData() {
    await fetch('/save_data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(playlistData)
    });
  }

  function activeTab() {
    return playlistData.tabs[playlistData.active_tab_index];
  }

  function renderPlaylist() {
    playlistEl.innerHTML = '';
    const tracks = activeTab().tracks;
    tracks.forEach((name, idx) => {
      const li = document.createElement('li');
      li.draggable = true;
      li.dataset.index = idx;

      const handle = document.createElement('span');
      handle.className = 'drag-handle';
      handle.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="4" width="18" height="2" rx="1"/><rect x="3" y="11" width="18" height="2" rx="1"/><rect x="3" y="18" width="18" height="2" rx="1"/></svg>`;
      li.appendChild(handle);

      const text = document.createElement('span');
      text.textContent = name;
      li.appendChild(text);

      if (idx === currentIndex) li.classList.add('active');

      li.addEventListener('click', (e) => {
        if (e.target.closest('.drag-handle')) return;
        if (idx === currentIndex) {
          audio.paused ? audio.play() : audio.pause();
          setPlayingState(!audio.paused);
        } else {
          loadTrack(idx);
        }
      });

      li.addEventListener('dragstart', (e) => {
        dragSrcIndex = +e.currentTarget.dataset.index;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', '');
        e.currentTarget.style.opacity = '0.5';
      });
      li.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        e.currentTarget.classList.add('drag-over');
      });
      li.addEventListener('dragleave', (e) => {
        e.currentTarget.classList.remove('drag-over');
      });
      li.addEventListener('drop', async (e) => {
        e.preventDefault();
        e.currentTarget.classList.remove('drag-over');
        const targetIndex = +e.currentTarget.dataset.index;
        if (dragSrcIndex === null || dragSrcIndex === targetIndex) return;
        const tracks = activeTab().tracks;
        const moved = tracks.splice(dragSrcIndex, 1)[0];
        tracks.splice(targetIndex, 0, moved);
        if (currentIndex === dragSrcIndex) currentIndex = targetIndex;
        else if (dragSrcIndex < currentIndex && targetIndex >= currentIndex) currentIndex--;
        else if (dragSrcIndex > currentIndex && targetIndex <= currentIndex) currentIndex++;
        await saveMusicData();
        renderPlaylist();
        dragSrcIndex = null;
      });
      li.addEventListener('dragend', (e) => {
        e.currentTarget.style.opacity = '1';
        App.$$('.playlist li').forEach(li => li.classList.remove('drag-over'));
      });

      playlistEl.appendChild(li);
    });
  }

  function loadTrack(index) {
    const tracks = activeTab().tracks;
    if (index < 0 || index >= tracks.length) {
      audio.pause();
      audio.src = '';
      setPlayingState(false);
      currentIndex = -1;
      trackTitle.textContent = 'Нет трека';
      seekSlider.value = 0;
      currentTimeSpan.textContent = '00:00';
      durationTimeSpan.textContent = '00:00';
      renderPlaylist();
      return;
    }
    audio.src = `music/${encodeURIComponent(tracks[index])}`;
    audio.load();
    currentIndex = index;
    trackTitle.textContent = tracks[index];
    renderPlaylist();
    audio.play().then(() => setPlayingState(true)).catch(() => setPlayingState(false));
  }

  function setPlayingState(playing) {
    isPlaying = playing;
    iconPlay.style.display = playing ? 'none' : 'block';
    iconPause.style.display = playing ? 'block' : 'none';
  }

  function playPause() {
    if (currentIndex === -1 && activeTab().tracks.length > 0) {
      loadTrack(0);
      return;
    }
    if (audio.paused) {
      audio.play();
      setPlayingState(true);
    } else {
      audio.pause();
      setPlayingState(false);
    }
  }

  function nextTrack() {
    const tracks = activeTab().tracks;
    if (tracks.length) loadTrack((currentIndex + 1) % tracks.length);
  }

  function prevTrack() {
    const tracks = activeTab().tracks;
    if (tracks.length) loadTrack(currentIndex - 1 < 0 ? tracks.length - 1 : currentIndex - 1);
  }

  function updateVolumeUI() {
    const vol = audio.volume;
    volumeSlider.value = vol * 100;
    iconVolumeHigh.style.display = (vol === 0 || isMuted) ? 'none' : 'block';
    iconVolumeMute.style.display = (vol === 0 || isMuted) ? 'block' : 'none';
  }

  muteBtn.addEventListener('click', () => {
    if (isMuted) {
      audio.volume = lastVolume;
      isMuted = false;
    } else {
      lastVolume = audio.volume;
      audio.volume = 0;
      isMuted = true;
    }
    updateVolumeUI();
  });

  volumeSlider.addEventListener('input', () => {
    const vol = volumeSlider.value / 100;
    audio.volume = vol;
    if (vol > 0 && isMuted) isMuted = false;
    updateVolumeUI();
  });

  async function uploadFiles(fileList) {
    const mp3Files = Array.from(fileList).filter(f => f.name.toLowerCase().endsWith('.mp3'));
    if (!mp3Files.length) return alert('Только .mp3');
    const formData = new FormData();
    mp3Files.forEach(f => formData.append('files', f));
    const res = await fetch('/upload', { method: 'POST', body: formData });
    const data = await res.json();
    const tracks = activeTab().tracks;
    let added = false;
    data.files.forEach(filename => {
      if (!tracks.includes(filename)) {
        tracks.push(filename);
        added = true;
      }
    });
    if (added) {
      await saveMusicData();
      renderPlaylist();
    }
  }

  filePickerBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    uploadFiles(fileInput.files);
    fileInput.value = '';
  });

  document.body.addEventListener('dragover', e => {
    e.preventDefault();
    dropOverlay.classList.remove('hidden');
  });
  document.body.addEventListener('dragleave', e => {
    if (e.relatedTarget === null || e.relatedTarget === document.documentElement) {
      dropOverlay.classList.add('hidden');
    }
  });
  document.body.addEventListener('drop', e => {
    e.preventDefault();
    dropOverlay.classList.add('hidden');
    if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
  });

  seekSlider.addEventListener('mousedown', () => { isSeeking = true; });
  seekSlider.addEventListener('touchstart', e => { isSeeking = true; e.preventDefault(); });
  seekSlider.addEventListener('input', () => {
    if (audio.duration && !isNaN(audio.duration)) {
      const newTime = (Number(seekSlider.value) / 100) * audio.duration;
      audio.currentTime = newTime;
      currentTimeSpan.textContent = formatTime(newTime);
    }
  });
  seekSlider.addEventListener('change', () => {
    if (audio.duration && !isNaN(audio.duration)) {
      audio.currentTime = (Number(seekSlider.value) / 100) * audio.duration;
    }
    isSeeking = false;
  });
  document.addEventListener('mouseup', () => { isSeeking = false; });
  document.addEventListener('touchend', () => { isSeeking = false; });

  function updateProgress() {
    if (isSeeking) return;
    if (audio.duration && !isNaN(audio.duration)) {
      seekSlider.value = (audio.currentTime / audio.duration) * 100;
    }
    currentTimeSpan.textContent = formatTime(audio.currentTime);
    durationTimeSpan.textContent = formatTime(audio.duration || 0);
  }

  audio.addEventListener('timeupdate', updateProgress);
  audio.addEventListener('loadedmetadata', updateProgress);
  audio.addEventListener('ended', nextTrack);
  audio.addEventListener('pause', () => setPlayingState(false));
  audio.addEventListener('play', () => setPlayingState(true));

  (async () => {
    await loadMusicData();
    if (!playlistData.tabs.length) {
      playlistData.tabs = [{ id: 'tab1', name: 'Музыка', tracks: [] }];
      playlistData.active_tab_index = 0;
      await saveMusicData();
    }
    renderPlaylist();
    updateVolumeUI();
  })();
};

App.tabInitializers.music = App.initMusic;
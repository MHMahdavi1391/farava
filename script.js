/**
 * YELO Music - Premium Player
 * Theme, Full Player, Shuffle, Volume, Recent, Keyboard
 */
(function () {
    'use strict';

    let allSongs = [];
    let currentTab = 'home';
    let currentPlaylist = [];
    let currentIndex = 0;
    let audio = null;
    let isPlaying = false;
    let loopEnabled = false;
    let shuffleEnabled = false;
    let favorites = JSON.parse(localStorage.getItem('yelo_favorites') || '[]');
    let recent = JSON.parse(localStorage.getItem('yelo_recent') || '[]');
    let currentFilter = '';
    let artistFilter = '';
    let isDragging = false;
    let volume = parseFloat(localStorage.getItem('yelo_volume') || '1');

    function initTheme() {
        const saved = localStorage.getItem('yelo_theme') || 'light';
        document.body.classList.remove('theme-light', 'theme-dark');
        document.body.classList.add('theme-' + saved);
        updateThemeIcon(saved);
    }
    function updateThemeIcon(theme) {
        const btn = document.getElementById('themeToggle');
        if (!btn) return;
        btn.innerHTML = theme === 'dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    }
    function toggleTheme() {
        const isDark = document.body.classList.contains('theme-dark');
        const next = isDark ? 'light' : 'dark';
        document.body.classList.remove('theme-light', 'theme-dark');
        document.body.classList.add('theme-' + next);
        localStorage.setItem('yelo_theme', next);
        updateThemeIcon(next);
    }

    function escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str || '';
        return div.innerHTML;
    }
    function formatTime(seconds) {
        if (isNaN(seconds) || !isFinite(seconds) || seconds < 0) return '0:00';
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return m + ':' + (s < 10 ? '0' : '') + s;
    }
    function isFavorite(id) { return favorites.includes(id); }
    function toggleFavorite(id) {
        const idx = favorites.indexOf(id);
        if (idx > -1) favorites.splice(idx, 1);
        else favorites.push(id);
        localStorage.setItem('yelo_favorites', JSON.stringify(favorites));
        renderCurrentView();
        updateLikeButtons();
    }
    function addToRecent(song) {
        if (!song || !song.id) return;
        recent = recent.filter(id => id !== song.id);
        recent.unshift(song.id);
        if (recent.length > 30) recent = recent.slice(0, 30);
        localStorage.setItem('yelo_recent', JSON.stringify(recent));
    }
    function getArtists() {
        const map = {};
        allSongs.forEach(song => {
            const a = song.artist || 'Unknown';
            if (!map[a]) map[a] = [];
            map[a].push(song);
        });
        return map;
    }

    const songGrid = document.getElementById('songGrid');
    const noResults = document.getElementById('noResults');
    const searchInput = document.getElementById('searchInput');
    const clearBtn = document.getElementById('clearSearch');
    const tabs = document.querySelectorAll('.tab-btn');

    const miniPlayer = document.getElementById('miniPlayer');
    const miniCover = document.getElementById('miniCover');
    const miniTitle = document.getElementById('miniTitle');
    const miniArtist = document.getElementById('miniArtist');
    const miniPlay = document.getElementById('miniPlay');
    const miniPrev = document.getElementById('miniPrev');
    const miniNext = document.getElementById('miniNext');
    const miniLike = document.getElementById('miniLike');
    const miniLoop = document.getElementById('miniLoop');
    const miniShuffle = document.getElementById('miniShuffle');
    const miniDownload = document.getElementById('miniDownload');
    const miniExpand = document.getElementById('miniExpand');
    const miniProgressFill = document.getElementById('miniProgressFill');
    const miniProgressBar = document.getElementById('miniProgressBar');
    const miniCurrentTime = document.getElementById('miniCurrentTime');
    const miniTotalTime = document.getElementById('miniTotalTime');
    const volumeSlider = document.getElementById('volumeSlider');
    const volumeIcon = document.getElementById('volumeIcon');

    const fullPlayer = document.getElementById('fullPlayer');
    const fullCover = document.getElementById('fullCover');
    const fullTitle = document.getElementById('fullTitle');
    const fullArtist = document.getElementById('fullArtist');
    const fullPlay = document.getElementById('fullPlay');
    const fullPrev = document.getElementById('fullPrev');
    const fullNext = document.getElementById('fullNext');
    const fullLike = document.getElementById('fullLike');
    const fullLoop = document.getElementById('fullLoop');
    const fullShuffle = document.getElementById('fullShuffle');
    const fullDownload = document.getElementById('fullDownload');
    const fullProgressFill = document.getElementById('fullProgressFill');
    const fullProgressBar = document.getElementById('fullProgressBar');
    const fullCurrentTime = document.getElementById('fullCurrentTime');
    const fullTotalTime = document.getElementById('fullTotalTime');
    const fullVolumeSlider = document.getElementById('fullVolumeSlider');
    const fullClose = document.getElementById('fullClose');
    const fullBackdrop = document.getElementById('fullPlayerBackdrop');

    function renderSongs(songs) {
        if (!songs.length) {
            songGrid.innerHTML = '';
            noResults.style.display = 'block';
            return;
        }
        noResults.style.display = 'none';
        songGrid.className = 'song-grid';
        songGrid.innerHTML = songs.map(song => `
            <div class="song-card" data-id="${song.id}">
                <button class="favorite-btn ${isFavorite(song.id) ? 'active' : ''}" data-fav="${song.id}">
                    <i class="fas fa-heart"></i>
                </button>
                <img class="song-card-cover" src="${escapeHTML(song.cover)}" alt="" loading="lazy" onerror="this.src='logo.jpg'">
                <div class="song-card-info">
                    <div class="song-card-title">${escapeHTML(song.title)}</div>
                    <div class="song-card-artist">${escapeHTML(song.artist)}</div>
                    <span class="song-card-badge">MUSIC</span>
                </div>
            </div>
        `).join('');

        songGrid.querySelectorAll('.song-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.closest('.favorite-btn')) return;
                const id = parseInt(card.dataset.id, 10);
                playSongById(id, songs);
            });
        });
        songGrid.querySelectorAll('.favorite-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleFavorite(parseInt(btn.dataset.fav, 10));
            });
        });
    }

    function renderArtists() {
        const artists = getArtists();
        let keys = Object.keys(artists).sort();
        if (currentFilter) {
            const q = currentFilter.toLowerCase();
            keys = keys.filter(k => k.toLowerCase().includes(q));
        }
        if (!keys.length) {
            songGrid.innerHTML = '';
            noResults.style.display = 'block';
            return;
        }
        noResults.style.display = 'none';
        songGrid.className = 'artist-grid';
        songGrid.innerHTML = keys.map(name => {
            const list = artists[name];
            const cover = list[0] ? list[0].cover : 'logo.jpg';
            return `
                <div class="artist-card" data-artist="${escapeHTML(name)}">
                    <img class="artist-card-cover" src="${escapeHTML(cover)}" alt="" loading="lazy" onerror="this.src='logo.jpg'">
                    <div class="artist-card-name">
                        ${escapeHTML(name)}
                        <span class="artist-card-count">${list.length} song${list.length > 1 ? 's' : ''}</span>
                    </div>
                </div>
            `;
        }).join('');

        songGrid.querySelectorAll('.artist-card').forEach(card => {
            card.addEventListener('click', () => {
                artistFilter = card.dataset.artist;
                currentTab = 'home';
                updateTabs();
                renderCurrentView();
            });
        });
    }

    function getFilteredSongs() {
        let list = allSongs.slice();
        if (currentTab === 'favorites') list = list.filter(s => isFavorite(s.id));
        else if (currentTab === 'recent') list = recent.map(id => allSongs.find(s => s.id === id)).filter(Boolean);
        else if (artistFilter) list = list.filter(s => s.artist === artistFilter);
        if (currentFilter) {
            const q = currentFilter.toLowerCase();
            list = list.filter(s => (s.title || '').toLowerCase().includes(q) || (s.artist || '').toLowerCase().includes(q));
        }
        return list;
    }

    function renderCurrentView() {
        if (currentTab === 'artists' && !artistFilter) renderArtists();
        else renderSongs(getFilteredSongs());
    }

    function updateTabs() {
        tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === currentTab));
    }

    function ensureAudio() {
        if (!audio) {
            audio = new Audio();
            audio.volume = volume;
            audio.addEventListener('timeupdate', onTimeUpdate);
            audio.addEventListener('ended', onEnded);
            audio.addEventListener('loadedmetadata', onLoadedMeta);
            audio.addEventListener('play', () => { isPlaying = true; updatePlayButtons(); });
            audio.addEventListener('pause', () => { isPlaying = false; updatePlayButtons(); });
        }
        return audio;
    }

    function playSongById(id, playlist) {
        const list = playlist && playlist.length ? playlist : allSongs;
        const idx = list.findIndex(s => s.id === id);
        if (idx < 0) return;
        currentPlaylist = list;
        currentIndex = idx;
        playCurrent();
    }

    function playCurrent() {
        const song = currentPlaylist[currentIndex];
        if (!song) return;
        const a = ensureAudio();
        a.src = song.music;
        a.volume = volume;
        a.play().catch(() => {});
        isPlaying = true;
        addToRecent(song);
        showMiniPlayer(song);
        updateFullPlayer(song);
        updateMediaSession(song);
        updatePlayButtons();
        updateLikeButtons();
        updateLoopButtons();
        updateShuffleButtons();
    }

    function togglePlay() {
        if (!audio || !currentPlaylist.length) return;
        if (isPlaying) audio.pause();
        else audio.play().catch(() => {});
    }

    function playNext() {
        if (!currentPlaylist.length) return;
        if (shuffleEnabled) currentIndex = Math.floor(Math.random() * currentPlaylist.length);
        else currentIndex = (currentIndex + 1) % currentPlaylist.length;
        playCurrent();
    }

    function playPrev() {
        if (!currentPlaylist.length) return;
        if (audio && audio.currentTime > 3) { audio.currentTime = 0; return; }
        currentIndex = (currentIndex - 1 + currentPlaylist.length) % currentPlaylist.length;
        playCurrent();
    }

    function onTimeUpdate() {
        if (!audio || isDragging) return;
        const pct = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
        miniProgressFill.style.width = pct + '%';
        fullProgressFill.style.width = pct + '%';
        miniCurrentTime.textContent = formatTime(audio.currentTime);
        fullCurrentTime.textContent = formatTime(audio.currentTime);
    }

    function onLoadedMeta() {
        if (!audio) return;
        miniTotalTime.textContent = formatTime(audio.duration);
        fullTotalTime.textContent = formatTime(audio.duration);
    }

    function onEnded() {
        if (loopEnabled) { audio.currentTime = 0; audio.play().catch(() => {}); }
        else playNext();
    }

    function seekFromEvent(e, bar, fill) {
        if (!audio || !audio.duration) return;
        const rect = bar.getBoundingClientRect();
        const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
        const pct = Math.max(0, Math.min(1, x / rect.width));
        audio.currentTime = pct * audio.duration;
        fill.style.width = (pct * 100) + '%';
    }

    function setupSeek(bar, fill) {
        let dragging = false;
        const start = (e) => { dragging = true; isDragging = true; seekFromEvent(e, bar, fill); };
        const move = (e) => { if (dragging) seekFromEvent(e, bar, fill); };
        const end = () => { dragging = false; isDragging = false; };
        bar.addEventListener('mousedown', start);
        bar.addEventListener('touchstart', start, { passive: true });
        window.addEventListener('mousemove', move);
        window.addEventListener('touchmove', move, { passive: true });
        window.addEventListener('mouseup', end);
        window.addEventListener('touchend', end);
    }

    function showMiniPlayer(song) {
        miniPlayer.classList.add('active');
        miniCover.src = song.cover || 'logo.jpg';
        miniTitle.textContent = song.title || '-';
        miniArtist.textContent = song.artist || '-';
        miniDownload.href = song.music || '#';
        miniDownload.setAttribute('download', (song.title || 'track') + '.mp3');
    }

    function updateFullPlayer(song) {
        if (!song) return;
        fullCover.src = song.cover || 'logo.jpg';
        fullTitle.textContent = song.title || '-';
        fullArtist.textContent = song.artist || '-';
        fullDownload.href = song.music || '#';
        fullDownload.setAttribute('download', (song.title || 'track') + '.mp3');
    }

    function openFullPlayer() {
        const song = currentPlaylist[currentIndex];
        if (!song) return;
        updateFullPlayer(song);
        fullPlayer.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeFullPlayer() {
        fullPlayer.classList.remove('active');
        document.body.style.overflow = '';
    }

    function updatePlayButtons() {
        const icon = isPlaying ? 'fa-pause' : 'fa-play';
        miniPlay.innerHTML = `<i class="fas ${icon}"></i>`;
        fullPlay.innerHTML = `<i class="fas ${icon}"></i>`;
    }

    function updateLikeButtons() {
        const song = currentPlaylist[currentIndex];
        const active = song && isFavorite(song.id);
        miniLike.classList.toggle('active', !!active);
        fullLike.classList.toggle('active', !!active);
        fullLike.innerHTML = active ? '<i class="fas fa-heart"></i> Liked' : '<i class="fas fa-heart"></i> Like';
    }

    function updateLoopButtons() {
        miniLoop.classList.toggle('active', loopEnabled);
        fullLoop.classList.toggle('active', loopEnabled);
    }

    function updateShuffleButtons() {
        miniShuffle.classList.toggle('active', shuffleEnabled);
        fullShuffle.classList.toggle('active', shuffleEnabled);
    }

    function setVolume(v) {
        volume = Math.max(0, Math.min(1, v));
        if (audio) audio.volume = volume;
        volumeSlider.value = volume;
        fullVolumeSlider.value = volume;
        localStorage.setItem('yelo_volume', String(volume));
        if (volumeIcon) {
            volumeIcon.className = volume === 0 ? 'fas fa-volume-mute' : volume < 0.5 ? 'fas fa-volume-down' : 'fas fa-volume-up';
        }
    }

    function updateMediaSession(song) {
        if (!('mediaSession' in navigator) || !song) return;
        navigator.mediaSession.metadata = new MediaMetadata({
            title: song.title || 'Unknown',
            artist: song.artist || 'Unknown',
            artwork: [{ src: song.cover || '', sizes: '512x512', type: 'image/jpeg' }]
        });
        navigator.mediaSession.setActionHandler('play', () => { if (audio) audio.play().catch(() => {}); });
        navigator.mediaSession.setActionHandler('pause', () => { if (audio) audio.pause(); });
        navigator.mediaSession.setActionHandler('previoustrack', playPrev);
        navigator.mediaSession.setActionHandler('nexttrack', playNext);
    }

    function loadSongs() {
        fetch('art.json').then(r => r.json()).then(data => {
            allSongs = data.filter(s => s.hasMusic !== false);
            renderCurrentView();
        }).catch(err => {
            console.error(err);
            noResults.style.display = 'block';
        });
    }

    document.getElementById('themeToggle').addEventListener('click', toggleTheme);

    tabs.forEach(tab => {
        tab.addEventListener('click', function () {
            currentTab = this.dataset.tab;
            artistFilter = '';
            updateTabs();
            renderCurrentView();
            searchInput.value = '';
            currentFilter = '';
            clearBtn.style.display = 'none';
        });
    });

    searchInput.addEventListener('input', function () {
        currentFilter = this.value.trim();
        clearBtn.style.display = currentFilter ? 'block' : 'none';
        renderCurrentView();
    });
    clearBtn.addEventListener('click', function () {
        searchInput.value = '';
        currentFilter = '';
        clearBtn.style.display = 'none';
        renderCurrentView();
        searchInput.focus();
    });

    miniPlay.addEventListener('click', togglePlay);
    fullPlay.addEventListener('click', togglePlay);
    miniPrev.addEventListener('click', playPrev);
    fullPrev.addEventListener('click', playPrev);
    miniNext.addEventListener('click', playNext);
    fullNext.addEventListener('click', playNext);

    miniLoop.addEventListener('click', () => { loopEnabled = !loopEnabled; updateLoopButtons(); });
    fullLoop.addEventListener('click', () => { loopEnabled = !loopEnabled; updateLoopButtons(); });
    miniShuffle.addEventListener('click', () => { shuffleEnabled = !shuffleEnabled; updateShuffleButtons(); });
    fullShuffle.addEventListener('click', () => { shuffleEnabled = !shuffleEnabled; updateShuffleButtons(); });

    miniLike.addEventListener('click', () => { const s = currentPlaylist[currentIndex]; if (s) toggleFavorite(s.id); });
    fullLike.addEventListener('click', () => { const s = currentPlaylist[currentIndex]; if (s) toggleFavorite(s.id); });

    miniExpand.addEventListener('click', openFullPlayer);
    document.getElementById('miniInfoClick').addEventListener('click', openFullPlayer);
    fullClose.addEventListener('click', closeFullPlayer);
    fullBackdrop.addEventListener('click', closeFullPlayer);

    volumeSlider.addEventListener('input', e => setVolume(parseFloat(e.target.value)));
    fullVolumeSlider.addEventListener('input', e => setVolume(parseFloat(e.target.value)));

    setupSeek(miniProgressBar, miniProgressFill);
    setupSeek(fullProgressBar, fullProgressFill);

    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT') return;
        if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
        else if (e.code === 'ArrowRight') { e.preventDefault(); playNext(); }
        else if (e.code === 'ArrowLeft') { e.preventDefault(); playPrev(); }
        else if (e.code === 'KeyL') { loopEnabled = !loopEnabled; updateLoopButtons(); }
        else if (e.code === 'KeyS') { shuffleEnabled = !shuffleEnabled; updateShuffleButtons(); }
        else if (e.code === 'Escape') closeFullPlayer();
    });

    initTheme();
    setVolume(volume);
    loadSongs();

})();

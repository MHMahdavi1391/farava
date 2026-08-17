/**
 * YELO Music - Optimized Player
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
    let displayIdleTimer = null;
    let isDisplayMode = false;

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

    function extractColors(imgUrl, callback) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = function () {
            try {
                const canvas = document.createElement('canvas');
                const size = 24;
                canvas.width = size;
                canvas.height = size;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, size, size);
                const data = ctx.getImageData(0, 0, size, size).data;
                let r = 0, g = 0, b = 0, count = 0;
                for (let i = 0; i < data.length; i += 32) {
                    r += data[i]; g += data[i + 1]; b += data[i + 2]; count++;
                }
                r = Math.round(r / count); g = Math.round(g / count); b = Math.round(b / count);
                callback({
                    dark: 'rgb(' + Math.round(r * 0.25) + ',' + Math.round(g * 0.25) + ',' + Math.round(b * 0.25) + ')',
                    mid: 'rgb(' + Math.round(r * 0.45) + ',' + Math.round(g * 0.45) + ',' + Math.round(b * 0.45) + ')',
                    r: r, g: g, b: b
                });
            } catch (e) {
                callback({ dark: '#1a1510', mid: '#2a2018', r: 40, g: 30, b: 20 });
            }
        };
        img.onerror = function () {
            callback({ dark: '#1a1510', mid: '#2a2018', r: 40, g: 30, b: 20 });
        };
        img.src = imgUrl;
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
    const miniDisplay = document.getElementById('miniDisplay');
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
    const fullDisplay = document.getElementById('fullDisplay');
    const fullProgressFill = document.getElementById('fullProgressFill');
    const fullProgressBar = document.getElementById('fullProgressBar');
    const fullCurrentTime = document.getElementById('fullCurrentTime');
    const fullTotalTime = document.getElementById('fullTotalTime');
    const fullVolumeSlider = document.getElementById('fullVolumeSlider');
    const fullClose = document.getElementById('fullClose');
    const fullBackdrop = document.getElementById('fullPlayerBackdrop');

    const displayMode = document.getElementById('displayMode');
    const displayBg = document.getElementById('displayBg');
    const displayBlur = document.getElementById('displayBlur');
    const displayCover = document.getElementById('displayCover');
    const displayTitle = document.getElementById('displayTitle');
    const displayArtist = document.getElementById('displayArtist');
    const displayPlay = document.getElementById('displayPlay');
    const displayPrev = document.getElementById('displayPrev');
    const displayNext = document.getElementById('displayNext');
    const displayExit = document.getElementById('displayExit');

    function renderSongs(songs) {
        if (!songs.length) { songGrid.innerHTML = ''; noResults.style.display = 'block'; return; }
        noResults.style.display = 'none';
        songGrid.className = 'song-grid';
        songGrid.innerHTML = songs.map(function (song) {
            return '<div class="song-card" data-id="' + song.id + '">' +
                '<button class="favorite-btn ' + (isFavorite(song.id) ? 'active' : '') + '" data-fav="' + song.id + '" type="button"><i class="fas fa-heart"></i></button>' +
                '<img class="song-card-cover" src="' + escapeHTML(song.cover) + '" alt="" loading="lazy" onerror="this.src=\'logo.jpg\'">' +
                '<div class="song-card-info">' +
                '<div class="song-card-title">' + escapeHTML(song.title) + '</div>' +
                '<div class="song-card-artist">' + escapeHTML(song.artist) + '</div>' +
                '<span class="song-card-badge">MUSIC</span></div></div>';
        }).join('');
        songGrid.querySelectorAll('.song-card').forEach(function (card) {
            card.addEventListener('click', function (e) {
                if (e.target.closest('.favorite-btn')) return;
                playSongById(parseInt(card.dataset.id, 10), songs);
            });
        });
        songGrid.querySelectorAll('.favorite-btn').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                toggleFavorite(parseInt(btn.dataset.fav, 10));
            });
        });
    }

    function renderArtists() {
        var artists = getArtists();
        var keys = Object.keys(artists).sort();
        if (currentFilter) {
            var q = currentFilter.toLowerCase();
            keys = keys.filter(function (k) { return k.toLowerCase().indexOf(q) !== -1; });
        }
        if (!keys.length) { songGrid.innerHTML = ''; noResults.style.display = 'block'; return; }
        noResults.style.display = 'none';
        songGrid.className = 'artist-grid';
        songGrid.innerHTML = keys.map(function (name) {
            var list = artists[name];
            var cover = list[0] ? list[0].cover : 'logo.jpg';
            return '<div class="artist-card" data-artist="' + escapeHTML(name) + '">' +
                '<img class="artist-card-cover" src="' + escapeHTML(cover) + '" alt="" loading="lazy" onerror="this.src=\'logo.jpg\'">' +
                '<div class="artist-card-name">' + escapeHTML(name) +
                '<span class="artist-card-count">' + list.length + ' song' + (list.length > 1 ? 's' : '') + '</span></div></div>';
        }).join('');
        songGrid.querySelectorAll('.artist-card').forEach(function (card) {
            card.addEventListener('click', function () {
                artistFilter = card.dataset.artist;
                currentTab = 'home';
                updateTabs();
                renderCurrentView();
            });
        });
    }

    function getFilteredSongs() {
        var list = allSongs.slice();
        if (currentTab === 'favorites') list = list.filter(function (s) { return isFavorite(s.id); });
        else if (currentTab === 'recent') list = recent.map(function (id) { return allSongs.find(function (s) { return s.id === id; }); }).filter(Boolean);
        else if (artistFilter) list = list.filter(function (s) { return s.artist === artistFilter; });
        if (currentFilter) {
            var q = currentFilter.toLowerCase();
            list = list.filter(function (s) {
                return (s.title || '').toLowerCase().indexOf(q) !== -1 || (s.artist || '').toLowerCase().indexOf(q) !== -1;
            });
        }
        return list;
    }

    function renderCurrentView() {
        if (currentTab === 'artists' && !artistFilter) renderArtists();
        else renderSongs(getFilteredSongs());
    }

    function updateTabs() {
        tabs.forEach(function (t) { t.classList.toggle('active', t.dataset.tab === currentTab); });
    }

    function ensureAudio() {
        if (!audio) {
            audio = new Audio();
            audio.volume = volume;
            audio.addEventListener('timeupdate', onTimeUpdate);
            audio.addEventListener('ended', onEnded);
            audio.addEventListener('loadedmetadata', onLoadedMeta);
            audio.addEventListener('play', function () { isPlaying = true; updatePlayButtons(); });
            audio.addEventListener('pause', function () { isPlaying = false; updatePlayButtons(); });
        }
        return audio;
    }

    function playSongById(id, playlist) {
        var list = playlist && playlist.length ? playlist : allSongs;
        var idx = list.findIndex(function (s) { return s.id === id; });
        if (idx < 0) return;
        currentPlaylist = list;
        currentIndex = idx;
        playCurrent();
    }

    function playCurrent() {
        var song = currentPlaylist[currentIndex];
        if (!song) return;
        var a = ensureAudio();
        a.src = song.music;
        a.volume = volume;
        a.play().catch(function () {});
        isPlaying = true;
        addToRecent(song);
        showMiniPlayer(song);
        updateFullPlayer(song);
        updateDisplayPlayer(song);
        updateMediaSession(song);
        updatePlayButtons();
        updateLikeButtons();
        updateLoopButtons();
        updateShuffleButtons();
    }

    function togglePlay() {
        if (!audio || !currentPlaylist.length) return;
        if (isPlaying) audio.pause();
        else audio.play().catch(function () {});
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
        var pct = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
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
        if (loopEnabled) { audio.currentTime = 0; audio.play().catch(function () {}); }
        else playNext();
    }

    function seekFromEvent(e, bar, fill) {
        if (!audio || !audio.duration) return;
        var rect = bar.getBoundingClientRect();
        var x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
        var pct = Math.max(0, Math.min(1, x / rect.width));
        audio.currentTime = pct * audio.duration;
        fill.style.width = (pct * 100) + '%';
    }

    function setupSeek(bar, fill) {
        var dragging = false;
        var start = function (e) { dragging = true; isDragging = true; seekFromEvent(e, bar, fill); };
        var move = function (e) { if (dragging) seekFromEvent(e, bar, fill); };
        var end = function () { dragging = false; isDragging = false; };
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
        var song = currentPlaylist[currentIndex];
        if (!song) return;
        updateFullPlayer(song);
        fullPlayer.classList.add('active');
        document.body.classList.add('no-scroll');
    }

    function closeFullPlayer() {
        fullPlayer.classList.remove('active');
        if (!isDisplayMode) document.body.classList.remove('no-scroll');
    }

    function updateDisplayPlayer(song) {
        if (!song || !displayCover) return;
        displayCover.src = song.cover || 'logo.jpg';
        displayTitle.textContent = song.title || '-';
        displayArtist.textContent = song.artist || '-';
        if (!isDisplayMode) return;
        displayBlur.style.backgroundImage = 'url("' + (song.cover || 'logo.jpg') + '")';
        extractColors(song.cover || 'logo.jpg', function (c) {
            displayBg.style.background = c.dark;
            displayBg.style.setProperty('--dm-c1', 'rgb(' + Math.min(255, c.r + 40) + ',' + Math.min(255, Math.round(c.g * 0.7)) + ',' + Math.round(c.b * 0.5) + ')');
            displayBg.style.setProperty('--dm-c2', 'rgb(' + Math.round(c.r * 0.5) + ',' + Math.min(255, c.g + 20) + ',' + Math.min(255, c.b + 40) + ')');
            displayBg.style.setProperty('--dm-c3', c.mid);
        });
    }

    function enterDisplayMode() {
        var song = currentPlaylist[currentIndex];
        if (!song) return;
        isDisplayMode = true;
        updateDisplayPlayer(song);
        closeFullPlayer();
        displayMode.classList.add('active');
        displayMode.classList.remove('controls-visible');
        document.body.classList.add('no-scroll');
        var el = document.documentElement;
        if (el.requestFullscreen) el.requestFullscreen().catch(function () {});
        else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
        resetDisplayIdle();
    }

    function exitDisplayMode() {
        isDisplayMode = false;
        displayMode.classList.remove('active', 'controls-visible', 'show-cursor');
        document.body.classList.remove('no-scroll');
        if (document.fullscreenElement || document.webkitFullscreenElement) {
            if (document.exitFullscreen) document.exitFullscreen().catch(function () {});
            else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
        }
        clearTimeout(displayIdleTimer);
    }

    function showDisplayControls() {
        if (!isDisplayMode) return;
        displayMode.classList.add('controls-visible', 'show-cursor');
        resetDisplayIdle();
    }

    function hideDisplayControls() {
        if (!isDisplayMode) return;
        displayMode.classList.remove('controls-visible', 'show-cursor');
    }

    function resetDisplayIdle() {
        clearTimeout(displayIdleTimer);
        displayIdleTimer = setTimeout(hideDisplayControls, 3500);
    }

    function updatePlayButtons() {
        var icon = isPlaying ? 'fa-pause' : 'fa-play';
        miniPlay.innerHTML = '<i class="fas ' + icon + '"></i>';
        fullPlay.innerHTML = '<i class="fas ' + icon + '"></i>';
        displayPlay.innerHTML = '<i class="fas ' + icon + '"></i>';
    }

    function updateLikeButtons() {
        var song = currentPlaylist[currentIndex];
        var active = song && isFavorite(song.id);
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
        navigator.mediaSession.setActionHandler('play', function () { if (audio) audio.play().catch(function () {}); });
        navigator.mediaSession.setActionHandler('pause', function () { if (audio) audio.pause(); });
        navigator.mediaSession.setActionHandler('previoustrack', playPrev);
        navigator.mediaSession.setActionHandler('nexttrack', playNext);
    }

    function loadSongs() {
        fetch('art.json').then(function (r) { return r.json(); }).then(function (data) {
            allSongs = data.filter(function (s) { return s.hasMusic !== false; });
            renderCurrentView();
        }).catch(function (err) {
            console.error(err);
            noResults.style.display = 'block';
        });
    }

    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
    tabs.forEach(function (tab) {
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
    displayPlay.addEventListener('click', function (e) { e.stopPropagation(); togglePlay(); });
    miniPrev.addEventListener('click', playPrev);
    fullPrev.addEventListener('click', playPrev);
    displayPrev.addEventListener('click', function (e) { e.stopPropagation(); playPrev(); });
    miniNext.addEventListener('click', playNext);
    fullNext.addEventListener('click', playNext);
    displayNext.addEventListener('click', function (e) { e.stopPropagation(); playNext(); });

    miniLoop.addEventListener('click', function () { loopEnabled = !loopEnabled; updateLoopButtons(); });
    fullLoop.addEventListener('click', function () { loopEnabled = !loopEnabled; updateLoopButtons(); });
    miniShuffle.addEventListener('click', function () { shuffleEnabled = !shuffleEnabled; updateShuffleButtons(); });
    fullShuffle.addEventListener('click', function () { shuffleEnabled = !shuffleEnabled; updateShuffleButtons(); });

    miniLike.addEventListener('click', function () { var s = currentPlaylist[currentIndex]; if (s) toggleFavorite(s.id); });
    fullLike.addEventListener('click', function () { var s = currentPlaylist[currentIndex]; if (s) toggleFavorite(s.id); });

    miniExpand.addEventListener('click', openFullPlayer);
    document.getElementById('miniInfoClick').addEventListener('click', openFullPlayer);
    fullClose.addEventListener('click', closeFullPlayer);
    fullBackdrop.addEventListener('click', closeFullPlayer);

    miniDisplay.addEventListener('click', enterDisplayMode);
    fullDisplay.addEventListener('click', enterDisplayMode);
    displayExit.addEventListener('click', function (e) { e.stopPropagation(); exitDisplayMode(); });

    var lastDisplayTouch = 0;
    function toggleDisplayControls(e) {
        if (!isDisplayMode) return;
        if (e && (e.target.closest('.display-controls') || e.target.closest('.display-btn'))) return;
        if (displayMode.classList.contains('controls-visible')) hideDisplayControls();
        else showDisplayControls();
    }
    displayMode.addEventListener('touchend', function (e) {
        if (!isDisplayMode) return;
        if (e.target.closest('.display-controls') || e.target.closest('.display-btn')) return;
        e.preventDefault();
        lastDisplayTouch = Date.now();
        toggleDisplayControls(e);
    }, { passive: false });
    displayMode.addEventListener('click', function (e) {
        if (Date.now() - lastDisplayTouch < 600) return;
        toggleDisplayControls(e);
    });
    displayMode.addEventListener('mousemove', function () {
        if (isDisplayMode) showDisplayControls();
    });

    volumeSlider.addEventListener('input', function (e) { setVolume(parseFloat(e.target.value)); });
    fullVolumeSlider.addEventListener('input', function (e) { setVolume(parseFloat(e.target.value)); });

    setupSeek(miniProgressBar, miniProgressFill);
    setupSeek(fullProgressBar, fullProgressFill);

    document.addEventListener('keydown', function (e) {
        if (e.target.tagName === 'INPUT') return;
        if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
        else if (e.code === 'ArrowRight') { e.preventDefault(); playNext(); }
        else if (e.code === 'ArrowLeft') { e.preventDefault(); playPrev(); }
        else if (e.code === 'KeyL') { loopEnabled = !loopEnabled; updateLoopButtons(); }
        else if (e.code === 'KeyS') { shuffleEnabled = !shuffleEnabled; updateShuffleButtons(); }
        else if (e.code === 'Escape') {
            if (isDisplayMode) exitDisplayMode();
            else closeFullPlayer();
        }
        else if (e.code === 'KeyF' && currentPlaylist.length) {
            if (isDisplayMode) exitDisplayMode();
            else enterDisplayMode();
        }
    });

    initTheme();
    setVolume(volume);
    loadSongs();

})();

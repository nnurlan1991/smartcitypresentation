(() => {
  const { team, video: videoCfg } = window.SITE_CONFIG;
  const grid = document.getElementById('team-grid');
  grid.innerHTML = team.map(member => `<article class="team-card"><img src="${member.photo}" alt="${member.name}" loading="eager"><div><b>${member.name}</b><span>${member.role}</span></div></article>`).join('');

  const themeToggle = document.getElementById('theme-toggle');
  const themeStorageKey = 'smart-city-theme';
  const applyTheme = theme => {
    const isLight = theme === 'light';
    if (isLight) document.documentElement.dataset.theme = 'light';
    else delete document.documentElement.dataset.theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', isLight ? '#f6f7fb' : '#140018');
    themeToggle?.setAttribute('aria-pressed', String(isLight));
    themeToggle?.setAttribute('aria-label', isLight ? 'Включить тёмную тему' : 'Включить светлую тему');
  };
  try { applyTheme(localStorage.getItem(themeStorageKey) || 'dark'); } catch (_) { applyTheme('dark'); }
  themeToggle?.addEventListener('click', () => {
    const nextTheme = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    try { localStorage.setItem(themeStorageKey, nextTheme); } catch (_) { /* Current-session switch still works. */ }
    applyTheme(nextTheme);
  });

  const mapCanvas = document.querySelector('.map-canvas');
  if (mapCanvas) {
    const tooltip = mapCanvas.querySelector('.map-tooltip');
    const republicanCities = [{ id: 'astana', x: 1110, y: 350 }, { id: 'almaty', x: 1370, y: 775 }, { id: 'shymkent', x: 1025, y: 815 }];
    const rankTier = place => place <= 5 ? 'top' : place <= 17 ? 'middle' : 'bottom';
    Promise.all([fetch('assets/kazakhstan-map.svg').then(response => response.text()), fetch('assets/kazakhstan-region-map.json').then(response => response.json())]).then(([markup, entries]) => {
      mapCanvas.insertAdjacentHTML('afterbegin', markup);
      const svg = mapCanvas.querySelector('svg');
      svg.classList.add('kazakhstan-svg');
      const regions = [...svg.querySelectorAll('path')];
      const markers = [];
      const showInfo = (entry, target) => {
        regions.forEach(item => item.classList.remove('map-active'));
        markers.forEach(item => item.classList.remove('map-active'));
        const tier = rankTier(entry.place);
        target?.classList.add('map-active', `rank-${tier}`);
        tooltip.className = `map-tooltip is-visible rank-${tier}`;
        tooltip.innerHTML = `<small>SMART CITY · РЕЙТИНГ 2025</small><strong>${entry.region}</strong><div class="map-card-data"><span>${entry.city}</span><b>№ ${entry.place}</b><em>${entry.score}<i>балла</i></em></div><p>${tier === 'top' ? 'Лидирующая группа' : tier === 'middle' ? 'Устойчивая группа' : 'Зона особого внимания'}</p>`;
      };
      const clearInfo = () => {
        regions.forEach(path => path.classList.remove('map-active'));
        markers.forEach(marker => marker.classList.remove('map-active'));
        tooltip.classList.remove('is-visible');
      };
      regions.forEach(path => {
        const index = regions.indexOf(path);
        const entry = entries.find(item => Number(item.mapTarget) === index);
        if (!entry) return;
        path.setAttribute('tabindex', '0');
        path.setAttribute('role', 'button');
        path.setAttribute('aria-label', `${entry.region}: ${entry.city}, ${entry.place}-е место, ${entry.score} балла`);
        path.addEventListener('mouseenter', () => showInfo(entry, path));
        path.addEventListener('mouseleave', clearInfo);
        path.addEventListener('focus', () => showInfo(entry, path));
        path.addEventListener('blur', clearInfo);
      });
      const ns = 'http://www.w3.org/2000/svg';
      const cityGroup = document.createElementNS(ns, 'g');
      cityGroup.classList.add('republican-city-markers');
      republicanCities.forEach(city => {
        const entry = entries.find(item => item.mapTarget === `city:${city.id}`);
        const marker = document.createElementNS(ns, 'g');
        marker.classList.add('map-city-marker', `rank-${rankTier(entry.place)}`);
        marker.setAttribute('tabindex', '0'); marker.setAttribute('role', 'button'); marker.setAttribute('aria-label', `${entry.region}: ${entry.place}-е место`);
        marker.innerHTML = `<circle cx="${city.x}" cy="${city.y}" r="13"></circle><circle cx="${city.x}" cy="${city.y}" r="5"></circle>`;
        marker.addEventListener('mouseenter', () => showInfo(entry, marker)); marker.addEventListener('mouseleave', clearInfo);
        marker.addEventListener('focus', () => showInfo(entry, marker)); marker.addEventListener('blur', clearInfo);
        markers.push(marker); cityGroup.append(marker);
      });
      svg.append(cityGroup);
    }).catch(() => { mapCanvas.classList.add('map-fallback'); });
  }

  const dots = document.getElementById('rail-dots');
  const scenes = [...document.querySelectorAll('.scene')];
  scenes.forEach((scene, i) => {
    scene.setAttribute('tabindex', '-1');
    scene.setAttribute('aria-roledescription', 'слайд');
    scene.setAttribute('aria-label', `Слайд ${i + 1} из ${scenes.length}`);
    const dot = document.createElement('button');
    dot.setAttribute('aria-label', `Перейти к сцене ${i + 1}`);
    dot.onclick = () => scene.scrollIntoView({ behavior: 'smooth' });
    dots.append(dot);
  });

  // Mac: Option + ↑ / ↓. The same shortcut also works with Alt on Windows.
  addEventListener('keydown', event => {
    if (!event.altKey || (event.key !== 'ArrowDown' && event.key !== 'ArrowUp')) return;
    event.preventDefault();
    const current = scenes.reduce((best, scene, i) => Math.abs(scene.getBoundingClientRect().top) < Math.abs(scenes[best].getBoundingClientRect().top) ? i : best, 0);
    const next = Math.max(0, Math.min(scenes.length - 1, current + (event.key === 'ArrowDown' ? 1 : -1)));
    if (next !== current) {
      scenes[next].scrollIntoView({ behavior: 'smooth', block: 'start' });
      scenes[next].focus({ preventScroll: true });
    }
  });

  // Some browsers postpone muted autoplay until the video is ready or the tab becomes active.
  // Retrying in these safe states keeps the portal recording running without a user click.
  const portalVideo = document.querySelector('.portal-video');
  if (portalVideo) {
    const playPortal = () => {
      portalVideo.muted = true;
      portalVideo.defaultMuted = true;
      portalVideo.volume = 0;
      portalVideo.autoplay = true;
      portalVideo.loop = true;
      portalVideo.playsInline = true;
      const started = portalVideo.play();
      if (started) started.catch(() => {});
    };
    ['loadedmetadata', 'loadeddata', 'canplay', 'canplaythrough'].forEach(event => {
      portalVideo.addEventListener(event, playPortal);
    });
    addEventListener('pageshow', playPortal);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) playPortal(); });
    [120, 500, 1200].forEach(delay => setTimeout(playPortal, delay));
    playPortal();
  }

  const video = document.getElementById('scroll-video');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let targetTime = 0;
  let mediaReady = false;
  let rafPending = false;

  function setReady() {
    mediaReady = video.readyState >= HTMLMediaElement.HAVE_METADATA;
    video.pause();
    syncVideo();
  }

  function syncVideo() {
    rafPending = false;
    if (!mediaReady || reduce || video.seeking) return;
    const difference = targetTime - video.currentTime;
    if (Math.abs(difference) < 0.015) return;
    // A small interpolation removes visual jumps while preserving exact scroll control.
    video.currentTime = video.currentTime + difference * 0.28;
  }

  function scheduleVideoSync() {
    if (!rafPending) {
      rafPending = true;
      requestAnimationFrame(syncVideo);
    }
  }

  function update() {
    const maxScroll = document.documentElement.scrollHeight - innerHeight;
    const progress = Math.max(0, Math.min(1, scrollY / Math.max(maxScroll, 1)));
    targetTime = progress * Math.max(0, videoCfg.duration - 0.035);
    scheduleVideoSync();

    const index = scenes.reduce((best, scene, i) => Math.abs(scene.getBoundingClientRect().top) < Math.abs(scenes[best].getBoundingClientRect().top) ? i : best, 0);
    [...dots.children].forEach((dot, i) => dot.classList.toggle('active', i === index));
  }

  video.addEventListener('loadedmetadata', setReady, { once: true });
  video.addEventListener('canplay', setReady, { once: true });
  video.addEventListener('seeked', scheduleVideoSync);
  video.addEventListener('error', () => { document.documentElement.classList.add('video-unavailable'); });
  if (video.readyState >= HTMLMediaElement.HAVE_METADATA) setReady();
  video.load();
  addEventListener('scroll', update, { passive: true });
  addEventListener('resize', update);
  update();
})();

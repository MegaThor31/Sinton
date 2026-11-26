(() => {
  'use strict';
  if (window.__sintonMotion) return;
  window.__sintonMotion = true;

  const VERSION = 9;
  const CONFIG = { lenis: true, lerp: 0.2, debug: true, panelAnimation: true };
  const EASE = 'cubic-bezier(.2,.8,.2,1)';
  const SPRING = 'cubic-bezier(.34,1.56,.64,1)';
  const VIEWPORT = '#main-view [data-overlayscrollbars-viewport], #main-view .os-viewport';
  const OVERLAY = '[role="menu"], [role="dialog"], [role="listbox"], #context-menu, [data-testid="context-menu"]';
  // Panel derecho: no tiene id ni data-testid estable. Se localiza por su zona de la rejilla (grid-area
  // right-sidebar) y se marca con data-sn-right; el resto del código solo usa esa marca.
  const RIGHT = '[data-sn-right]';
  const PLAY_SELECTOR = '[data-testid="control-button-playpause"], [data-testid="play-button"]';
  const PLAY_LABEL = /(?:^|[\s,.:;-])(play|pause|resume|reproducir|reproduce|reanudar|pausar|pausa|continuar)(?=$|[\s,.:;-])/i;
  const PRESS = 'button, [role="button"]';
  const GRID_MIN_DELTA = 8;
  const PAGE_WAIT_MS = 140;
  const PAGE_ADDS_MIN = 6;
  const PANEL_MS = 280;
  // Zonas donde Lenis no toca la rueda. Sin [role="listbox"]: los carruseles de Spotify usan ese rol.
  const PREVENT = '[data-lenis-prevent], [role="menu"], [role="dialog"], input, textarea';
  const root = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const seen = new WeakSet();
  const lastPlayPause = new WeakMap();
  const panelRects = new WeakMap();
  const panelAnimations = new WeakMap();
  const stats = { overlaysOpened: 0, overlaysClosed: 0, pages: 0, presses: 0, playPause: 0, navigations: 0, sidebarOpened: 0, sidebarClosed: 0, gridAnimations: 0 };
  let lenis = null;
  let current = null;
  let currentContent = null;
  let wheelTimer = null;
  let lastRebuild = 0;
  let lastScroll = 0;
  let lastPage = 0;
  let lastClick = 0;
  let lastSidebarContent = 0;
  let lastSidebarScan = 0;
  let pending = false;
  let pendingTimer = null;
  let historySignal = false;
  let lastHref = window.location.href;
  let lastTarget = null;
  let sweep = null;
  let rightRect = null;
  let watchedRight = null;
  let grid = null;
  let panelsReady = false;
  let gridInner = window.innerWidth;
  let gridReason = 'sin cambios de paneles todavia';
  let watchedMain = null;
  let panel = null;
  let pressing = false;
  let pressStart = 0;
  let lastMove = 0;
  let pressMainWidth = 0;
  let pressGridCount = 0;
  let lastHint = 0;

  root.setAttribute('data-sinton-motion', String(VERSION));
  root.setAttribute('data-sinton-reduced-motion', String(reduce.matches));

  const resizeObserver = typeof ResizeObserver === 'function'
    ? new ResizeObserver((entries) => {
      for (const entry of entries) {
        const rect = entry.target.getBoundingClientRect();
        if (rect.width > 40 && rect.height > 40) rightRect = rect;
      }
    })
    : null;

  function isDragging() {
    const now = performance.now();
    return pressing && now - pressStart > 150 && now - lastMove < 120;
  }

  function mainWidth() {
    const main = document.querySelector('#main-view');
    return main ? main.getBoundingClientRect().width : 0;
  }

  function rectOf(element) {
    const rect = element.getBoundingClientRect();
    return { left: rect.left, right: rect.right, width: rect.width };
  }

  function clamp(value, max) {
    return Math.min(Math.max(value, 0), max);
  }

  // Paneles animables: la vista central y los dos laterales.
  function panelTargets() {
    const targets = [];
    const main = document.getElementById('main-view');
    const left = document.getElementById('Desktop_LeftSidebar_Id');
    const right = document.querySelector(RIGHT);
    if (left) targets.push({ name: 'left', element: left });
    if (main) targets.push({ name: 'main', element: main });
    if (right) targets.push({ name: 'right', element: right });
    return targets;
  }

  // Descubre con un recorte el panel que ha crecido, desde el borde que se ha movido. El recorte no
  // recalcula el diseño: Spotify recoloca la página una sola vez y lo que se anima es solo la máscara.
  function revealPanel(element, insetLeft, insetRight, fade) {
    const running = panelAnimations.get(element);
    if (running) {
      try { running.cancel(); } catch (error) { console.error('[Sinton Motion] panel', error); }
    }
    const from = { clipPath: `inset(0px ${Math.round(insetRight)}px 0px ${Math.round(insetLeft)}px)` };
    const to = { clipPath: 'inset(0px 0px 0px 0px)' };
    if (fade) { from.opacity = 0.35; to.opacity = 1; }
    const animation = play(element, [from, to], { duration: PANEL_MS });
    if (!animation) return false;
    panelAnimations.set(element, animation);
    const done = () => { if (panelAnimations.get(element) === animation) panelAnimations.delete(element); };
    animation.finished.then(done, done);
    return true;
  }

  // Se llama cuando cambia el ancho de la vista central, es decir, al abrir, cerrar o redimensionar un panel.
  function onGridResize() {
    const resized = window.innerWidth !== gridInner;
    gridInner = window.innerWidth;
    const changes = [];
    for (const target of panelTargets()) {
      const next = rectOf(target.element);
      let previous = panelRects.get(target.element);
      panelRects.set(target.element, next);
      if (!previous) {
        // Solo el panel derecho puede aparecer de la nada; el resto se registra sin animar.
        if (target.name !== 'right' || !panelsReady) continue;
        previous = { left: next.right, right: next.right, width: 0 };
      } else if (previous.width < 2) {
        previous = target.name === 'left'
          ? { left: next.left, right: next.left, width: 0 }
          : { left: next.right, right: next.right, width: 0 };
      }
      if (next.width - previous.width <= GRID_MIN_DELTA) continue;
      const insetLeft = clamp(previous.left - next.left, next.width);
      const insetRight = clamp(next.right - previous.right, next.width);
      if (insetLeft < 1 && insetRight < 1) continue;
      changes.push({ target, insetLeft, insetRight, grown: Math.round(next.width - previous.width) });
    }
    if (!panelsReady) { panelsReady = true; return; }
    if (!changes.length) return;
    if (!CONFIG.panelAnimation) { gridReason = 'desactivado en CONFIG'; return; }
    if (resized) { gridReason = 'omitido: la ventana cambio de tamano'; return; }
    if (reduce.matches) { gridReason = 'omitido: movimiento reducido'; return; }
    if (isDragging()) { gridReason = 'omitido: arrastre del borde'; return; }
    const animated = [];
    for (const change of changes) {
      if (revealPanel(change.target.element, change.insetLeft, change.insetRight, change.target.name !== 'main')) {
        animated.push(`${change.target.name} +${change.grown}px`);
      }
    }
    if (!animated.length) { gridReason = 'error: no se pudo crear la animacion'; return; }
    stats.gridAnimations += 1;
    gridReason = `animado: ${animated.join(', ')}`;
  }

  const gridObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(onGridResize) : null;

  function findGrid(main) {
    for (let element = main.parentElement; element; element = element.parentElement) {
      if (window.getComputedStyle(element).display === 'grid') return element;
    }
    return null;
  }

  function watchGrid() {
    const main = document.querySelector('#main-view');
    if (!main || !gridObserver) return;
    if (main !== watchedMain) {
      if (watchedMain) gridObserver.unobserve(watchedMain);
      watchedMain = main;
      gridObserver.observe(main);
    }
    if (grid && grid.isConnected && grid.contains(main)) return;
    const found = findGrid(main);
    if (found && found !== grid) grid = found;
  }

  function toast(text, duration) {
    const element = document.createElement('div');
    element.textContent = text;
    element.setAttribute('data-sinton-ghost', '1');
    element.style.cssText = 'position:fixed;left:50%;bottom:110px;transform:translateX(-50%);z-index:2147483647;max-width:70vw;padding:10px 16px;border-radius:14px;background:var(--sn-accent,#1ed760);color:var(--sn-on-accent,#171717);font:600 12px/1.4 sans-serif;pointer-events:none;word-break:break-word';
    document.body.appendChild(element);
    window.setTimeout(() => element.remove(), duration || 2200);
  }

  function checkSidebarAnimation() {
    if (!CONFIG.debug || reduce.matches) return;
    const delta = Math.abs(mainWidth() - pressMainWidth);
    if (delta < GRID_MIN_DELTA || stats.gridAnimations !== pressGridCount) return;
    const now = performance.now();
    if (now - lastHint < 4000) return;
    lastHint = now;
    toast(`Sinton laterales (${Math.round(delta)} px): ${gridReason}`, 7000);
  }

  function play(element, frames, options) {
    if (reduce.matches || !element || !element.isConnected || typeof element.animate !== 'function') return null;
    try {
      return element.animate(frames, { easing: EASE, ...options });
    } catch (error) {
      console.error('[Sinton Motion] animacion', error);
      return null;
    }
  }

  function isGhost(node) {
    if (node.nodeType !== 1) return false;
    if (node.getAttribute('data-sinton-ghost') === '1') return true;
    return Boolean(node.parentElement && node.parentElement.closest('[data-sinton-ghost="1"]'));
  }

  function playButtonOf(node) {
    const button = node.closest ? node.closest('button, [role="button"]') : null;
    if (!button) return null;
    if (button.matches(PLAY_SELECTOR)) return button;
    const label = button.getAttribute('aria-label');
    return label && PLAY_LABEL.test(label) ? button : null;
  }

  function findOverlay(node) {
    if (node.matches(OVERLAY)) return node;
    if (node.childElementCount <= 8) return node.querySelector(OVERLAY) ? node : null;
    return null;
  }

  function findRight(node) {
    if (node.matches(RIGHT)) return node;
    if (node.childElementCount <= 8) return node.querySelector(RIGHT);
    return null;
  }

  function makeGhost(node) {
    const ghost = node.cloneNode(true);
    ghost.setAttribute('data-sinton-ghost', '1');
    ghost.setAttribute('aria-hidden', 'true');
    ghost.style.pointerEvents = 'none';
    ghost.removeAttribute('id');
    for (const child of ghost.querySelectorAll('[id]')) child.removeAttribute('id');
    return ghost;
  }

  function animateOpen(node) {
    if (seen.has(node)) return;
    seen.add(node);
    stats.overlaysOpened += 1;
    play(node, [
      { opacity: 0, translate: '0 10px', scale: 0.97 },
      { opacity: 1, translate: '0 0', scale: 1 }
    ], { duration: 170 });
  }

  function animateClose(node, mutation) {
    if (reduce.matches || !mutation.target || !mutation.target.isConnected) return;
    let ghost;
    try {
      ghost = makeGhost(node);
      const next = mutation.nextSibling && mutation.nextSibling.parentNode === mutation.target ? mutation.nextSibling : null;
      mutation.target.insertBefore(ghost, next);
    } catch (error) {
      console.error('[Sinton Motion] cierre', error);
      if (ghost) ghost.remove();
      return;
    }
    stats.overlaysClosed += 1;
    const animation = ghost.animate([
      { opacity: 1, translate: '0 0', scale: 1 },
      { opacity: 0, translate: '0 6px', scale: 0.98 }
    ], { duration: 120, easing: EASE, fill: 'forwards' });
    const cleanup = () => ghost.remove();
    animation.finished.then(cleanup, cleanup);
  }

  function animateSidebarOpen(element) {
    if (seen.has(element)) return;
    seen.add(element);
    stats.sidebarOpened += 1;
    play(element, [
      { opacity: 0, translate: '32px 0' },
      { opacity: 1, translate: '0 0' }
    ], { duration: 240 });
  }

  function animateSidebarClose(node) {
    if (reduce.matches || !rightRect) return;
    if (node.getElementsByTagName('*').length > 600) return;
    let ghost;
    try {
      ghost = makeGhost(node);
      ghost.style.cssText += `;position:fixed;left:${rightRect.left}px;top:${rightRect.top}px;width:${rightRect.width}px;height:${rightRect.height}px;margin:0;z-index:2147482000;overflow:hidden`;
      document.body.appendChild(ghost);
    } catch (error) {
      console.error('[Sinton Motion] cierre lateral', error);
      if (ghost) ghost.remove();
      return;
    }
    stats.sidebarClosed += 1;
    const animation = ghost.animate([
      { opacity: 1, translate: '0 0' },
      { opacity: 0, translate: '36px 0' }
    ], { duration: 260, easing: EASE, fill: 'forwards' });
    const cleanup = () => ghost.remove();
    animation.finished.then(cleanup, cleanup);
  }

  function animatePlayPause(button) {
    const now = performance.now();
    if (now - (lastPlayPause.get(button) || 0) < 150) return;
    lastPlayPause.set(button, now);
    stats.playPause += 1;
    play(button.querySelector('svg'), [
      { opacity: 0, scale: 0.4, rotate: '-90deg' },
      { opacity: 1, scale: 1, rotate: '0deg' }
    ], { duration: 300, easing: SPRING });
    play(button, [{ scale: 1 }, { scale: 1.1 }, { scale: 1 }], { duration: 340 });
  }

  function playSweep() {
    const view = document.querySelector('#main-view');
    if (!view || reduce.matches) return;
    const rect = view.getBoundingClientRect();
    if (!sweep || !sweep.isConnected) {
      sweep = document.createElement('div');
      sweep.setAttribute('data-sinton-ghost', '1');
      sweep.style.cssText = 'position:fixed;height:2px;z-index:2147483000;pointer-events:none;opacity:0;transform-origin:left;border-radius:2px;background:linear-gradient(90deg,rgba(var(--sn-accent-rgb,30,215,96),0),var(--sn-accent,#1ed760) 40%,var(--sn-hover,#3be477));box-shadow:0 0 12px rgba(var(--sn-accent-rgb,30,215,96),.7)';
      document.body.appendChild(sweep);
    }
    sweep.style.left = `${rect.left}px`;
    sweep.style.top = `${rect.top}px`;
    sweep.style.width = `${rect.width}px`;
    try {
      sweep.animate([
        { opacity: 1, transform: 'scaleX(0)' },
        { opacity: 1, transform: 'scaleX(0.7)', offset: 0.55 },
        { opacity: 0, transform: 'scaleX(1)' }
      ], { duration: 420, easing: EASE });
    } catch (error) {
      console.error('[Sinton Motion] barra', error);
    }
  }

  function animatePage() {
    const now = performance.now();
    if (now - lastPage < 250) return;
    const viewport = document.querySelector(VIEWPORT);
    const target = viewport && viewport.firstElementChild;
    if (!target) return;
    lastPage = now;
    stats.pages += 1;
    playSweep();
    // Solo opacity y translate (se componen en la GPU); animar filter/blur obligaba a repintar la página entera.
    play(target, [
      { opacity: 0, translate: '0 14px' },
      { opacity: 1, translate: '0 0' }
    ], { duration: 280 });
  }

  function firePage() {
    if (!pending) return;
    pending = false;
    window.clearTimeout(pendingTimer);
    window.requestAnimationFrame(animatePage);
  }

  function armPage() {
    if (reduce.matches) return;
    pending = true;
    window.clearTimeout(pendingTimer);
    pendingTimer = window.setTimeout(firePage, PAGE_WAIT_MS);
  }

  function onNavigation() {
    if (window.location.href === lastHref) return;
    lastHref = window.location.href;
    historySignal = true;
    stats.navigations += 1;
    armPage();
  }

  for (const name of ['pushState', 'replaceState']) {
    const original = window.history[name];
    if (typeof original !== 'function') continue;
    window.history[name] = function patchedHistory(...args) {
      const result = original.apply(this, args);
      onNavigation();
      return result;
    };
  }
  window.addEventListener('popstate', onNavigation);
  document.addEventListener('scroll', () => { lastScroll = performance.now(); }, { capture: true, passive: true });
  document.addEventListener('pointermove', (event) => {
    lastTarget = event.target;
    lastMove = performance.now();
  }, { capture: true, passive: true });

  document.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) return;
    const link = event.target.closest('a[href]');
    if (!link) return;
    const href = link.getAttribute('href') || '';
    if (href.startsWith('/') && !href.startsWith('//')) {
      lastClick = performance.now();
      armPage();
    }
  }, { capture: true, passive: true });

  function releasePress() {
    if (!pressing) return;
    pressing = false;
    if (performance.now() - pressStart < 400) window.setTimeout(checkSidebarAnimation, 700);
  }
  document.addEventListener('pointerup', releasePress, { capture: true, passive: true });
  document.addEventListener('pointercancel', releasePress, { capture: true, passive: true });
  window.addEventListener('mouseup', releasePress, true);
  window.addEventListener('blur', releasePress);

  document.addEventListener('pointerdown', (event) => {
    pressing = true;
    pressStart = performance.now();
    pressMainWidth = mainWidth();
    pressGridCount = stats.gridAnimations;
    if (event.button !== 0 || !(event.target instanceof Element)) return;
    const button = event.target.closest(PRESS);
    if (!button || playButtonOf(button) || button.disabled || button.getAttribute('aria-disabled') === 'true') return;
    const rect = button.getBoundingClientRect();
    if (rect.width > 140 || rect.height > 80) return;
    stats.presses += 1;
    play(button, [{ scale: 1 }, { scale: 0.9, offset: 0.35 }, { scale: 1 }], { duration: 240 });
  }, { capture: true, passive: true });

  function markRight() {
    const main = document.getElementById('main-view');
    const grid = main && main.parentElement;
    if (!grid) return null;
    const current = grid.querySelector(':scope > [data-sn-right]');
    if (current) return current;
    for (const child of grid.children) {
      if (child === main || child.id === 'Desktop_LeftSidebar_Id') continue;
      const area = window.getComputedStyle(child).gridRowStart;
      if (area === 'right-sidebar') {
        child.setAttribute('data-sn-right', '');
        return child;
      }
    }
    return null;
  }

  function watchRight() {
    const element = markRight();
    if (!element || element === watchedRight || !resizeObserver) return;
    if (watchedRight) resizeObserver.unobserve(watchedRight);
    watchedRight = element;
    resizeObserver.observe(element);
    const rect = element.getBoundingClientRect();
    if (rect.width > 40 && rect.height > 40) rightRect = rect;
  }

  const observer = new MutationObserver((mutations) => {
    let pageAdds = 0;
    const now = performance.now();
    for (const mutation of mutations) {
      if (mutation.type === 'attributes') {
        const button = playButtonOf(mutation.target);
        if (button) animatePlayPause(button);
        continue;
      }
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== 1 || isGhost(node)) continue;
        const button = playButtonOf(node);
        if (button) animatePlayPause(button);
        const overlay = findOverlay(node);
        if (overlay) animateOpen(overlay);
        const right = findRight(node);
        if (right) {
          animateSidebarOpen(right);
        } else if (node.parentElement && node.parentElement.closest(RIGHT) && node.childElementCount >= 3 && now - lastSidebarContent > 300) {
          lastSidebarContent = now;
          play(node, [{ opacity: 0, translate: '16px 0' }, { opacity: 1, translate: '0 0' }], { duration: 260 });
        }
        if (node.parentElement && node.parentElement.closest('#main-view')) {
          pageAdds += 1 + node.childElementCount;
        }
      }
      for (const node of mutation.removedNodes) {
        if (node.nodeType !== 1 || isGhost(node)) continue;
        if (findRight(node)) {
          animateSidebarClose(node);
        } else if (findOverlay(node)) {
          animateClose(node, mutation);
        }
      }
    }
    if (pageAdds >= PAGE_ADDS_MIN) tickSoon();
    if (pending && pageAdds >= PAGE_ADDS_MIN) {
      firePage();
    } else if (!pending && !historySignal && pageAdds >= 25 && now - lastScroll > 300 && now - lastClick > 2000) {
      animatePage();
    }
    if (now - lastSidebarScan > 300) {
      lastSidebarScan = now;
      watchRight();
      watchGrid();
    }
  });
  observer.observe(document.body, {
    childList: true, subtree: true, attributes: true, attributeFilter: ['aria-label', 'aria-pressed', 'd']
  });

  function describe(element) {
    const chain = [];
    let node = element;
    for (let depth = 0; node && depth < 8; depth += 1, node = node.parentElement) {
      const role = node.getAttribute('role');
      const testId = node.getAttribute('data-testid');
      const classes = typeof node.className === 'string' ? node.className.trim().split(/\s+/).filter(Boolean).slice(0, 3) : [];
      chain.push(node.tagName.toLowerCase() + (node.id ? `#${node.id}` : '') + (role ? `[role=${role}]` : '') + (testId ? `[testid=${testId}]` : '') + (classes.length ? `.${classes.join('.')}` : ''));
    }
    return chain;
  }

  function brief(element) {
    const rect = element.getBoundingClientRect();
    const role = element.getAttribute('role');
    const testId = element.getAttribute('data-testid');
    const label = element.getAttribute('aria-label');
    const classes = typeof element.className === 'string' ? element.className.trim().split(/\s+/).filter(Boolean).slice(0, 2) : [];
    return element.tagName.toLowerCase()
      + (element.id ? `#${element.id}` : '')
      + (testId ? `[testid=${testId}]` : '')
      + (role ? `[role=${role}]` : '')
      + (label ? `[aria=${label.slice(0, 30)}]` : '')
      + (classes.length ? `.${classes.join('.')}` : '')
      + ` ${Math.round(rect.width)}x${Math.round(rect.height)}@${Math.round(rect.left)},${Math.round(rect.top)}`;
  }

  function tree(element, depth, lines, indent) {
    lines.push(indent + brief(element));
    if (depth <= 0) return;
    let shown = 0;
    for (const child of element.children) {
      const rect = child.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2 || isGhost(child)) continue;
      if (shown >= 10) { lines.push(`${indent}  ...`); break; }
      shown += 1;
      tree(child, depth - 1, lines, `${indent}  `);
    }
  }

  function landmarks() {
    const selectors = ['main', 'nav', 'aside', '[role="main"]', '[role="complementary"]', '[data-testid*="library"]', '[data-testid*="sidebar"]', '[data-testid*="now-playing"]', '[data-testid*="main"]'];
    const found = {};
    for (const selector of selectors) {
      const nodes = Array.from(document.querySelectorAll(selector)).slice(0, 3);
      if (nodes.length) found[selector] = nodes.map(brief);
    }
    return found;
  }

  function closePanel() {
    if (panel) panel.remove();
    panel = null;
  }

  function showPanel(text) {
    closePanel();
    panel = document.createElement('div');
    panel.setAttribute('data-sinton-ghost', '1');
    panel.style.cssText = 'position:fixed;right:16px;bottom:100px;width:min(560px,60vw);max-height:60vh;overflow:auto;z-index:2147483647;padding:12px 14px;border-radius:12px;background:var(--sn-bg3,#171717);color:var(--sn-text,#ffffff);border:1px solid var(--sn-accent,#1ed760);box-shadow:0 12px 40px rgba(0,0,0,.6);font:11px/1.45 Consolas,monospace;user-select:text';
    const close = document.createElement('button');
    close.type = 'button';
    close.textContent = 'X  (Esc)';
    close.style.cssText = 'position:sticky;top:0;float:right;background:var(--sn-accent,#1ed760);color:var(--sn-on-accent,#171717);border:0;border-radius:6px;padding:2px 8px;font:600 11px sans-serif;cursor:pointer';
    close.addEventListener('click', closePanel);
    const pre = document.createElement('pre');
    pre.textContent = text;
    pre.style.cssText = 'margin:0;white-space:pre-wrap;word-break:break-word';
    panel.append(close, pre);
    document.body.appendChild(panel);
  }

  function copyText(text) {
    const fallback = () => {
      const area = document.createElement('textarea');
      area.value = text;
      area.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      area.remove();
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).catch(fallback);
    }
    fallback();
    return Promise.resolve();
  }

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && panel) { closePanel(); return; }
    if (!(event.ctrlKey && event.altKey && event.code === 'KeyD')) return;
    event.preventDefault();
    const viewport = document.querySelector(VIEWPORT);
    const playButton = document.querySelector(PLAY_SELECTOR);
    const overlay = document.querySelector(OVERLAY);
    const layoutLines = [];
    const main = document.querySelector('#main');
    if (main) tree(main, 5, layoutLines, '');
    const report = {
      version: VERSION,
      reducedMotion: reduce.matches,
      lenisActive: Boolean(lenis),
      lenisLimit: lenis && typeof lenis.limit === 'number' ? lenis.limit : null,
      scrollablePx: viewport ? viewport.scrollHeight - viewport.clientHeight : null,
      lenisContentConnected: currentContent ? currentContent.isConnected : null,
      lenisLoaded: typeof ((window.Lenis && window.Lenis.default) || window.Lenis) === 'function',
      animateSupported: typeof Element.prototype.animate === 'function',
      href: window.location.href,
      historySignal,
      stats,
      gridFound: grid ? describe(grid) : null,
      gridColumns: grid ? window.getComputedStyle(grid).gridTemplateColumns : null,
      gridReason,
      rightSidebarFound: Boolean(document.querySelector(RIGHT)),
      rightButtons: watchedRight ? Array.from(watchedRight.querySelectorAll('button, [role="button"]')).slice(0, 8).map(brief) : null,
      playButtonsDetected: document.querySelectorAll(PLAY_SELECTOR).length,
      underCursor: lastTarget instanceof Element ? describe(lastTarget) : null,
      scrollViewport: viewport ? describe(viewport) : null,
      playPause: playButton ? describe(playButton.querySelector('svg') || playButton) : null,
      playPauseLabel: playButton ? playButton.getAttribute('aria-label') : null,
      firstOverlay: overlay ? describe(overlay) : null,
      landmarks: landmarks(),
      layout: layoutLines
    };
    const text = JSON.stringify(report, null, 2);
    showPanel(text);
    copyText(text).catch(() => {});
  }, true);

  function destroyLenis() {
    window.clearTimeout(wheelTimer);
    if (lenis) {
      try { lenis.destroy(); } catch (error) { console.error('[Sinton Motion] destroy', error); }
    }
    lenis = null;
    current = null;
    currentContent = null;
    root.removeAttribute('data-sinton-lenis');
  }

  // Lenis mide el contenido que recibió al crearse. Si Spotify lo sustituye, hay que volver a crearlo.
  function lenisHealthy(viewport, content) {
    if (!lenis || viewport !== current || content !== currentContent) return false;
    if (!viewport.isConnected || !content.isConnected) return false;
    if (lenis.isStopped) return false;
    const scrollable = viewport.scrollHeight - viewport.clientHeight;
    return !(scrollable > 1 && typeof lenis.limit === 'number' && lenis.limit < 1);
  }

  function attachLenis() {
    if (!CONFIG.lenis || document.hidden) return;
    if (reduce.matches) { destroyLenis(); return; }
    const Ctor = (window.Lenis && window.Lenis.default) || window.Lenis;
    if (typeof Ctor !== 'function') return;
    const viewport = document.querySelector(VIEWPORT);
    if (!viewport) { destroyLenis(); return; }
    const content = viewport.firstElementChild;
    if (!content) { destroyLenis(); return; }
    if (lenisHealthy(viewport, content)) return;
    destroyLenis();
    try {
      lenis = new Ctor({
        wrapper: viewport, content, eventsTarget: viewport,
        lerp: CONFIG.lerp, smoothWheel: true, syncTouch: false, autoRaf: true, respectReducedMotion: true,
        prevent: (node) => node instanceof Element && Boolean(node.closest(PREVENT))
      });
      current = viewport;
      currentContent = content;
      root.setAttribute('data-sinton-lenis', '1');
    } catch (error) {
      console.error('[Sinton Motion] Lenis desactivado por error', error);
      CONFIG.lenis = false;
      destroyLenis();
    }
  }

  function rebuildLenis(reason) {
    const now = performance.now();
    if (now - lastRebuild < 2000) return;
    lastRebuild = now;
    if (CONFIG.debug) console.warn('[Sinton Motion] Lenis reiniciado:', reason);
    destroyLenis();
    attachLenis();
  }

  // Si la rueda gira y la página no se mueve (sin estar en un borde), Lenis está atascado: se reinicia.
  function onWheelWatch(event) {
    if (!lenis || event.ctrlKey || Math.abs(event.deltaY) < 1) return;
    const viewport = current;
    if (!viewport || !(event.target instanceof Element) || !viewport.contains(event.target)) return;
    if (event.target.closest(PREVENT)) return;
    const before = viewport.scrollTop;
    const max = viewport.scrollHeight - viewport.clientHeight;
    const down = event.deltaY > 0;
    if (max <= 1 || (down && before >= max - 1) || (!down && before <= 1)) return;
    window.clearTimeout(wheelTimer);
    wheelTimer = window.setTimeout(() => {
      if (!lenis || viewport !== current) return;
      if (Math.abs(viewport.scrollTop - before) < 1) rebuildLenis('la rueda no desplaza');
    }, 350);
  }
  document.addEventListener('wheel', onWheelWatch, { capture: true, passive: true });

    // Novedades se abre en el panel derecho: si está plegado (columna < 100 px) se despliega para que se vea completo.
  const WHATS_NEW = '[data-testid="whats-new-feed-button"]';
  const EXPAND_LABEL = /(mostrar|abrir|expandir|desplegar|show|open|expand)/i;
  const COLLAPSED_MAX = 100;
  const EXPAND_DELAY_MS = 600;

  function rightColumnWidth() {
    if (!grid || !grid.isConnected) return null;
    const columns = window.getComputedStyle(grid).gridTemplateColumns.trim().split(/\s+/);
    const last = parseFloat(columns[columns.length - 1]);
    return Number.isFinite(last) ? last : null;
  }

  function findExpandButton() {
    if (!watchedRight || !watchedRight.isConnected) return null;
    const buttons = Array.from(watchedRight.querySelectorAll('button, [role="button"]'));
    return buttons.find((button) => EXPAND_LABEL.test(button.getAttribute('aria-label') || '')) || null;
  }

  document.addEventListener('click', (event) => {
    if (!(event.target instanceof Element) || !event.target.closest(WHATS_NEW)) return;
    window.setTimeout(() => {
      const width = rightColumnWidth();
      if (width === null || width > COLLAPSED_MAX) return;
      const button = findExpandButton();
      if (button) button.click();
      else if (CONFIG.debug) console.warn('[Sinton Motion] panel derecho plegado y sin botón de desplegar localizado');
    }, EXPAND_DELAY_MS);
  }, { capture: true, passive: true });

  function tick() {
    attachLenis();
    watchRight();
    watchGrid();
  }

  // Tras cambiar de página el contenedor de scroll es otro: se reengancha Lenis en el siguiente fotograma
  // en lugar de esperar al temporizador.
  let tickQueued = false;
  function tickSoon() {
    if (tickQueued) return;
    tickQueued = true;
    window.requestAnimationFrame(() => { tickQueued = false; tick(); });
  }

  reduce.addEventListener('change', () => {
    root.setAttribute('data-sinton-reduced-motion', String(reduce.matches));
    attachLenis();
  });
  document.addEventListener('visibilitychange', tick);
  window.setInterval(tick, 3000);
  tick();
  play(document.body, [{ opacity: 0.7 }, { opacity: 1 }], { duration: 260 });
})();

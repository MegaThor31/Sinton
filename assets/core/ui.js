// Sinton core · interfaz: avisos, diálogos, menú contextual, filas de canciones, botones y acciones.
(function (root) {
  "use strict";
  const core = (root.SintonCore = root.SintonCore || {});
  const STYLE_ID = "sn-core-style";
  const DOM_THROTTLE_MS = 70;
  const MAX_FIBERS = 4000;
  const ROW_PARENT_DEPTH = 14;
  const FLOATING_AFTER_MS = 8000;
  const PLAYBAR_GAP = 12;

  // Selectores de Spotify (si la interfaz cambia, se corrige solo aquí).
  const SEL = {
    contextMenu: '[data-testid="context-menu"]',
    menuList: '[role="menu"]',
    menuItem: '[role="menuitem"]',
    row: '[data-testid="tracklist-row"]',
    rowCell: '[role="gridcell"]',
    rowTitleCell: '[role="gridcell"][aria-colindex="2"]',
    rowTrackLink: 'a[href*="/track/"]',
    playbar: '[data-testid="now-playing-bar"]',
    playerControls: '[data-testid="player-controls"]',
    playbarBoxes: ['[data-testid="now-playing-bar"]', 'footer'],
    playbarAnchors: ['[data-testid="lyrics-button"]', '[data-testid="fullscreen-mode-button"]', '[data-testid="control-button-queue"]', '[data-testid="control-button-npv"]']
  };

  const CSS = [
    ":root{--sn-bg:#202020;--sn-bg2:#242424;--sn-bg3:#171717;--sn-border:#353535;--sn-accent:#1ed760;--sn-hover:#3be477;--sn-press:#1abc54;--sn-muted:#b4b4b4;--sn-text:#e6e6e6;--sn-accent-text:#1ed760;--sn-bg-hi:#2b2b2b}",
    ".sn-toasts{position:fixed;left:50%;bottom:110px;transform:translateX(-50%);z-index:2147483600;display:flex;flex-direction:column;gap:8px;align-items:center;pointer-events:none}",
    ".sn-toast{background:var(--sn-bg3);color:var(--sn-text);border:1px solid var(--sn-border);border-left:3px solid var(--sn-accent);border-radius:8px;padding:10px 16px;font-size:13px;max-width:70vw;box-shadow:0 8px 24px rgba(0,0,0,.5);animation:sn-rise 180ms ease-out}",
    ".sn-toast.sn-error{border-left-color:var(--sn-press)}",
    ".sn-overlay{position:fixed;inset:0;z-index:2147483200;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.6);-webkit-app-region:no-drag;animation:sn-fade 160ms ease-out}",
    ".sn-modal{width:min(560px,92vw);max-height:84vh;display:flex;flex-direction:column;background:var(--sn-bg);color:var(--sn-text);border:1px solid var(--sn-border);border-radius:12px;box-shadow:0 16px 48px rgba(0,0,0,.6);animation:sn-rise 200ms cubic-bezier(.2,.8,.2,1)}",
    ".sn-modal.sn-wide{width:min(820px,94vw)}",
    ".sn-modal-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 20px 12px;border-bottom:1px solid var(--sn-border)}",
    ".sn-modal-title{margin:0;font-size:18px;font-weight:700;color:var(--sn-accent);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
    ".sn-modal-body{padding:16px 20px 20px;overflow:auto;display:flex;flex-direction:column;gap:12px;font-size:14px}",
    ".sn-btn{font:inherit;font-size:13px;font-weight:600;background:var(--sn-bg2);color:var(--sn-text);border:1px solid var(--sn-border);border-radius:8px;padding:7px 14px;cursor:pointer;white-space:nowrap}",
    ".sn-btn:hover{background:var(--sn-border)}",
    ".sn-btn:disabled{opacity:.45;cursor:default}",
    ".sn-btn.sn-primary{background:var(--sn-accent);border-color:var(--sn-accent);color:var(--sn-on-accent,#171717)}",
    ".sn-btn.sn-primary:hover{background:var(--sn-hover);border-color:var(--sn-hover)}",
    ".sn-btn.sn-primary:active{background:var(--sn-press);border-color:var(--sn-press)}",
    ".sn-btn:focus-visible,.sn-input:focus-visible{outline:2px solid var(--sn-hover);outline-offset:2px}",
    ".sn-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}",
    ".sn-end{justify-content:flex-end}",
    ".sn-muted{color:var(--sn-muted);font-size:12px;margin:0}",
    ".sn-label{font-size:12px;font-weight:700;color:var(--sn-muted);text-transform:uppercase;letter-spacing:.04em;margin:4px 0 0}",
    ".sn-input{font:inherit;font-size:14px;background:var(--sn-bg3);color:var(--sn-text);border:1px solid var(--sn-border);border-radius:8px;padding:8px 10px;min-width:0;flex:1}",
    ".sn-check{display:flex;align-items:flex-start;gap:8px;cursor:pointer;line-height:1.35}",
    ".sn-check input{accent-color:var(--sn-accent);margin-top:3px;flex:0 0 auto}",
    ".sn-check small{display:block;color:var(--sn-muted);font-size:12px}",
    ".sn-progress{height:6px;border-radius:999px;background:var(--sn-bg3);overflow:hidden}",
    ".sn-progress>i{display:block;height:100%;width:0;background:var(--sn-accent);transition:width 160ms linear}",
    ".sn-menu-item{list-style:none;margin:0;padding:0}",
    ".sn-menu-item.sn-first{border-top:1px solid var(--sn-border);margin-top:4px;padding-top:4px}",
    ".sn-menu-item>button{display:flex;align-items:center;gap:10px;width:100%;min-height:40px;padding:8px 12px;border:0;border-radius:4px;background:none;color:inherit;font:inherit;font-size:14px;text-align:start;cursor:default}",
    ".sn-menu-item>button:hover,.sn-menu-item>button:focus-visible{background:rgba(255,255,255,.1);outline:0}",
    ".sn-menu-item>button::before{content:'';width:6px;height:6px;border-radius:50%;background:var(--sn-accent);flex:0 0 auto}",
    ".sn-slot-host{display:flex!important;align-items:center;min-width:0}",
    ".sn-slot-host>:not(.sn-slot){min-width:0}",
    ".sn-slot{display:inline-flex;align-items:center;gap:6px;margin-inline-start:auto;padding-inline:10px 4px;flex:0 0 auto}",
    ".sn-native-hidden{display:none!important}",
    ".sn-slot:empty{display:none}",
    ".sn-dec{display:inline-flex;align-items:center;gap:3px}",
    ".sn-pb{width:32px;height:32px;display:inline-flex;align-items:center;justify-content:center;border:0;border-radius:50%;background:none;color:var(--sn-muted);cursor:pointer;padding:0;flex:0 0 auto;position:relative}",
    ".sn-pb:hover{color:#fff}",
    ".sn-pb.sn-active{color:var(--sn-accent)}",
    ".sn-pb.sn-active::after{content:'';position:absolute;bottom:1px;left:50%;width:4px;height:4px;margin-left:-2px;border-radius:50%;background:var(--sn-accent)}",
    ".sn-pb-dock{position:fixed;right:16px;z-index:2147483000;display:flex;gap:4px;background:var(--sn-bg2);border:1px solid var(--sn-border);border-radius:999px;padding:2px 6px}",
    ".sn-ly{overflow-y:auto;overflow-x:hidden;scrollbar-width:none;height:100%;-webkit-mask-image:linear-gradient(transparent,#000 12%,#000 88%,transparent);mask-image:linear-gradient(transparent,#000 12%,#000 88%,transparent)}",
    ".sn-ly::-webkit-scrollbar{display:none}",
    ".sn-ly-pad{height:45%}",
    ".sn-ly-line{margin:0;padding:.38em 0;font-size:var(--sn-ly-size,28px);line-height:1.25;font-weight:700;color:rgba(255,255,255,.42);cursor:pointer;transform-origin:left center;transition:color 220ms ease,transform 260ms cubic-bezier(.2,.8,.2,1),opacity 220ms ease;overflow-wrap:anywhere}",
    ".sn-ly-line:hover{color:rgba(255,255,255,.8)}",
    ".sn-ly-past{color:rgba(255,255,255,.26)}",
    ".sn-ly-active{color:#fff;transform:scale(1.04);text-shadow:0 0 28px rgba(var(--sn-accent-rgb,30,215,96),.45)}",
    ".sn-ly-static .sn-ly-line{color:rgba(255,255,255,.86);cursor:default;font-weight:600}",
    ".sn-ly-static .sn-ly-pad{height:12%}",
    ".sn-ly-msg{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;text-align:center;color:rgba(255,255,255,.8)}",
    ".sn-ly-msg p{margin:0;font-size:24px;font-weight:700}",
    ".sn-ly-msg small{font-size:14px;color:rgba(255,255,255,.6)}",
    "@keyframes sn-fade{from{opacity:0}to{opacity:1}}",
    "@keyframes sn-rise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}",
    "@media (prefers-reduced-motion:reduce){.sn-overlay,.sn-modal,.sn-toast{animation:none}.sn-ly-line{transition:none}}"
  ].join("\n");

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function button(label, onClick, primary) {
    const node = el("button", "sn-btn" + (primary ? " sn-primary" : ""), label);
    node.type = "button";
    if (onClick) node.addEventListener("click", onClick);
    return node;
  }

  function icon(pathData, size) {
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 16 16");
    svg.setAttribute("width", String(size || 16));
    svg.setAttribute("height", String(size || 16));
    svg.setAttribute("fill", "currentColor");
    svg.setAttribute("aria-hidden", "true");
    const path = document.createElementNS(ns, "path");
    path.setAttribute("d", pathData);
    svg.appendChild(path);
    return svg;
  }

  // ----- Avisos -----
  let toastHost = null;

  function toast(message, options) {
    injectStyle();
    if (!toastHost || !toastHost.isConnected) {
      toastHost = el("div", "sn-toasts");
      document.body.appendChild(toastHost);
    }
    const node = el("div", "sn-toast" + (options && options.error ? " sn-error" : ""), message);
    toastHost.appendChild(node);
    root.setTimeout(function () { node.remove(); }, (options && options.ms) || 4000);
  }

  function fail(pluginId, action, err) {
    console.error("[Sinton:" + pluginId + "] " + action, err);
    toast(action + ": " + ((err && err.message) || "error desconocido"), { error: true, ms: 6000 });
  }

  // ----- Diálogos -----
  const openModals = [];

  function modal(options) {
    injectStyle();
    const overlay = el("div", "sn-overlay");
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", options.title);
    overlay.setAttribute("data-sinton-ghost", "1");
    const box = el("div", "sn-modal" + (options.wide ? " sn-wide" : ""));
    const head = el("div", "sn-modal-head");
    const title = el("h2", "sn-modal-title", options.title);
    const lastFocus = document.activeElement;
    let closed = false;

    function close() {
      if (closed) return;
      closed = true;
      overlay.remove();
      const index = openModals.indexOf(handle);
      if (index !== -1) openModals.splice(index, 1);
      if (options.onClose) {
        try { options.onClose(); } catch (err) { console.error("[Sinton] onClose", err); }
      }
      if (lastFocus && lastFocus.isConnected && typeof lastFocus.focus === "function") lastFocus.focus();
    }

    const closeBtn = button("Cerrar", close);
    head.append(title, closeBtn);
    const body = el("div", "sn-modal-body");
    box.append(head, body);
    overlay.append(box);
    overlay.addEventListener("mousedown", function (event) {
      if (event.target === overlay) close();
    });
    const handle = { body: body, close: close, setTitle: function (text) { title.textContent = text; } };
    openModals.push(handle);
    document.body.appendChild(overlay);
    closeBtn.focus();
    return handle;
  }

  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape" || openModals.length === 0) return;
    event.stopPropagation();
    event.preventDefault();
    openModals[openModals.length - 1].close();
  }, true);

  // ----- Observador único del DOM -----
  const domListeners = new Set();
  let observer = null;
  let domTimer = null;

  function flushDom() {
    domTimer = null;
    for (const listener of domListeners) {
      try {
        listener();
      } catch (err) {
        console.error("[Sinton] oyente del DOM", err);
      }
    }
  }

  function scheduleDom() {
    // Se agrupan los cambios y se ejecuta en el siguiente fotograma, para no bloquear el pintado.
    if (domTimer) return;
    domTimer = root.setTimeout(function () { root.requestAnimationFrame(flushDom); }, DOM_THROTTLE_MS);
  }

  function onDom(listener) {
    domListeners.add(listener);
    if (!observer) {
      observer = new MutationObserver(scheduleDom);
      observer.observe(document.body, { childList: true, subtree: true });
    }
    scheduleDom();
    return function () {
      domListeners.delete(listener);
      if (domListeners.size === 0 && observer) {
        observer.disconnect();
        observer = null;
      }
    };
  }

  // ----- Menú contextual -----
  const menuItems = new Map();
  let lastContextTarget = null;
  let menuWatcher = null;

  function urisFromProps(props) {
    if (!props || typeof props !== "object") return null;
    if (Array.isArray(props.uris) && props.uris.length > 0 && props.uris.every(function (u) { return typeof u === "string"; })) {
      return props.uris.slice();
    }
    if (typeof props.uri === "string" && props.uri.startsWith("spotify:")) return [props.uri];
    return null;
  }

  function menuUris(menu) {
    const start = core.platform.fiberOf(menu);
    if (start && start.child) {
      const queue = [start.child];
      let visited = 0;
      while (queue.length > 0 && visited < MAX_FIBERS) {
        const fiber = queue.shift();
        visited += 1;
        const found = urisFromProps(fiber.memoizedProps);
        if (found) return found;
        if (fiber.child) queue.push(fiber.child);
        if (fiber.sibling) queue.push(fiber.sibling);
      }
    }
    if (lastContextTarget && lastContextTarget.isConnected) {
      const row = lastContextTarget.closest(SEL.row);
      const uri = row ? rowUri(row) : null;
      if (uri) return [uri];
      const link = lastContextTarget.closest("a[href]");
      const fromLink = link ? core.uri.fromPath(link.getAttribute("href")) : null;
      if (fromLink) return [fromLink];
    }
    return [];
  }

  function closeMenu(menu) {
    const escape = { key: "Escape", code: "Escape", keyCode: 27, which: 27, bubbles: true, cancelable: true };
    (menu.querySelector(SEL.menuItem) || menu).dispatchEvent(new KeyboardEvent("keydown", escape));
    root.setTimeout(function () {
      if (!menu.isConnected) return;
      for (const type of ["pointerdown", "mousedown", "mouseup", "click"]) {
        document.body.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: root }));
      }
      root.setTimeout(function () {
        if (menu.isConnected) menu.style.display = "none";
      }, 120);
    }, 60);
  }

  function decorateMenu(menu) {
    const list = menu.querySelector(SEL.menuList);
    if (!list || list.children.length === 0 || list.dataset.snMenu === "1") return;
    list.dataset.snMenu = "1";
    const uris = menuUris(menu);
    if (uris.length === 0) return;
    let first = true;
    let added = false;
    for (const item of menuItems.values()) {
      let visible = false;
      try {
        visible = Boolean(item.when(uris));
      } catch (err) {
        console.error("[Sinton:" + item.plugin + "] condición de menú", err);
      }
      if (!visible) continue;
      const li = el("li", "sn-menu-item" + (first ? " sn-first" : ""));
      li.setAttribute("role", "presentation");
      const btn = el("button", "", item.label);
      btn.type = "button";
      btn.setAttribute("role", "menuitem");
      btn.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        closeMenu(menu);
        Promise.resolve().then(function () { return item.run(uris); }).catch(function (err) {
          fail(item.plugin, item.label, err);
        });
      });
      li.append(btn);
      list.append(li);
      first = false;
      added = true;
    }
    if (added) root.requestAnimationFrame(function () { root.dispatchEvent(new Event("resize")); });
  }

  // ----- Menús siempre dentro de la ventana -----
  // Spotify coloca el menú (popper) antes de que le añadamos opciones. Tras añadirlas se pide a popper que
  // recalcule (evento resize) y, además, se corrige aquí: se limita el alto, se hace desplazable por dentro
  // y se desplaza el contenedor con la propiedad "translate", que se suma al transform de popper sin pisarlo.
  const MENU_MARGIN = 8;
  const FIT_DELAYS_MS = [60, 180, 400];
  let menuFitter = null;

  function popupRoot(node) {
    return node.closest("[data-tippy-root]") || node.closest("#context-menu") || node.parentElement || node;
  }

  function fitMenu(list) {
    if (!list.isConnected || list.getClientRects().length === 0) return;
    const box = popupRoot(list);
    box.style.translate = "";
    list.style.maxHeight = "";
    let rect = box.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const barTop = playbarTop();
    // Un menú abierto desde arriba se queda por encima de la barra; uno que nace en la propia barra usa toda la ventana.
    const limit = barTop !== Infinity && rect.top < barTop ? barTop - MENU_MARGIN : root.innerHeight - MENU_MARGIN;
    const room = limit - MENU_MARGIN;
    if (rect.height > room) {
      const listRect = list.getBoundingClientRect();
      const chrome = Math.max(0, rect.height - listRect.height);
      list.style.maxHeight = Math.max(120, Math.floor(room - chrome)) + "px";
      list.style.overflowY = "auto";
      rect = box.getBoundingClientRect();
    }
    let dy = 0;
    if (rect.bottom > limit) dy = limit - rect.bottom;
    if (rect.top + dy < MENU_MARGIN) dy = MENU_MARGIN - rect.top;
    let dx = 0;
    if (rect.right > root.innerWidth - MENU_MARGIN) dx = (root.innerWidth - MENU_MARGIN) - rect.right;
    if (rect.left + dx < MENU_MARGIN) dx = MENU_MARGIN - rect.left;
    if (dx || dy) box.style.translate = Math.round(dx) + "px " + Math.round(dy) + "px";
  }

  function fitAll() {
    document.querySelectorAll(SEL.menuList).forEach(function (list) {
      try {
        fitMenu(list);
      } catch (err) {
        console.error("[Sinton] ajuste de menú", err);
      }
    });
  }

  function fitMenus() {
    root.requestAnimationFrame(function () {
      fitAll();
      document.querySelectorAll(SEL.menuList).forEach(function (list) {
        if (list.dataset.snFit === "1") return;
        list.dataset.snFit = "1";
        FIT_DELAYS_MS.forEach(function (delay) { root.setTimeout(fitAll, delay); });
      });
    });
  }

  function watchMenuFit() {
    if (menuFitter) return;
    menuFitter = onDom(fitMenus);
    root.addEventListener("resize", fitMenus);
  }

  function watchMenus() {
    if (menuWatcher) return;
    injectStyle();
    document.addEventListener("contextmenu", function (event) { lastContextTarget = event.target; }, true);
    document.addEventListener("click", function (event) { lastContextTarget = event.target; }, true);
    menuWatcher = onDom(function () {
      document.querySelectorAll(SEL.contextMenu).forEach(decorateMenu);
      fitMenus();
    });
  }

  // item: { id, plugin, label, when(uris) -> boolean, run(uris) }
  function registerMenuItem(item) {
    menuItems.set(item.id, item);
    watchMenus();
    return function () { menuItems.delete(item.id); };
  }

  // ----- Filas de canciones -----
  const decorators = new Map();
  let rowWatcher = null;

  function rowUri(row) {
    let fiber = core.platform.fiberOf(row);
    let depth = 0;
    while (fiber && depth < ROW_PARENT_DEPTH) {
      const props = fiber.memoizedProps;
      if (props && typeof props.uri === "string" && /^spotify:(track|local|episode):/.test(props.uri)) return props.uri;
      fiber = fiber.return;
      depth += 1;
    }
    const link = row.querySelector(SEL.rowTrackLink);
    return link ? core.uri.fromPath(link.getAttribute("href").replace(/^https?:\/\/[^/]+/, "")) : null;
  }

  // La ranura va al final de la celda del título: así no pisa el corazón, la duración ni el botón "...".
  function rowSlot(row) {
    let slot = row.querySelector(":scope .sn-slot");
    if (slot) return slot;
    const cells = row.querySelectorAll(SEL.rowCell);
    const cell = row.querySelector(SEL.rowTitleCell) || cells[1] || cells[0] || row.firstElementChild;
    if (!cell) return null;
    slot = el("span", "sn-slot");
    cell.classList.add("sn-slot-host");
    cell.append(slot);
    return slot;
  }

  function decorateRows() {
    if (decorators.size === 0) return;
    document.querySelectorAll(SEL.row).forEach(function (row) {
      const uri = rowUri(row);
      const slot = rowSlot(row);
      if (!slot) return;
      for (const decorator of decorators.values()) {
        const stamp = (uri || "") + "|" + decorator.version;
        let holder = slot.querySelector('[data-sn-dec="' + decorator.id + '"]');
        if (holder && holder.dataset.snStamp === stamp) continue;
        if (!holder) {
          holder = el("span", "sn-dec");
          holder.dataset.snDec = decorator.id;
          slot.append(holder);
        }
        holder.dataset.snStamp = stamp;
        holder.textContent = "";
        if (!uri) continue;
        try {
          const content = decorator.render(uri, row);
          if (content) holder.append(content);
        } catch (err) {
          console.error("[Sinton:" + decorator.id + "] fila", err);
        }
      }
    });
  }

  // decorator: { id, render(uri, row) -> Node|null }. Devuelve { refresh, remove }.
  function decorateTrackRows(decorator) {
    injectStyle();
    const entry = { id: decorator.id, render: decorator.render, version: 0 };
    decorators.set(entry.id, entry);
    if (!rowWatcher) rowWatcher = onDom(decorateRows);
    return {
      refresh: function () {
        entry.version += 1;
        decorateRows();
      },
      remove: function () {
        decorators.delete(entry.id);
        document.querySelectorAll('[data-sn-dec="' + entry.id + '"]').forEach(function (node) { node.remove(); });
      }
    };
  }

  // ----- Acciones (pestaña de la galería) -----
  const commands = new Map();

  // command: { id, plugin, label, hint, run() }
  function registerCommand(command) {
    commands.set(command.id, command);
    return function () { commands.delete(command.id); };
  }

  function runCommand(id) {
    const command = commands.get(id);
    if (!command) return;
    Promise.resolve().then(command.run).catch(function (err) { fail(command.plugin, command.label, err); });
  }

  // ----- Botones de la barra de reproducción -----
  const playbarButtons = new Map();
  const startedAt = Date.now();
  let playbarWatcher = null;
  let dock = null;

  // Las entradas con "replaces" ocupan el sitio del botón nativo equivalente y lo ocultan.
  function placeReplacements() {
    const pending = [];
    for (const entry of playbarButtons.values()) {
      const native = entry.replaces ? document.querySelector(entry.replaces) : null;
      if (!native || !native.parentElement) {
        pending.push(entry);
        continue;
      }
      native.classList.add("sn-native-hidden");
      if (entry.node.nextElementSibling !== native) native.parentElement.insertBefore(entry.node, native);
    }
    return pending;
  }

  function placeButtons() {
    const pending = placeReplacements();
    let anchor = null;
    for (const selector of SEL.playbarAnchors) {
      anchor = document.querySelector(selector);
      if (anchor) break;
    }
    if (anchor && anchor.parentElement) {
      if (dock) {
        dock.remove();
        dock = null;
      }
      const visible = anchor.classList.contains("sn-native-hidden") && anchor.previousElementSibling ? anchor.previousElementSibling : anchor;
      for (const entry of pending) {
        if (entry.node.parentElement !== anchor.parentElement) anchor.parentElement.insertBefore(entry.node, visible);
      }
      return;
    }
    if (Date.now() - startedAt < FLOATING_AFTER_MS) return;
    if (!dock || !dock.isConnected) {
      dock = el("div", "sn-pb-dock");
      document.body.appendChild(dock);
    }
    dock.style.bottom = (playbarInset() + 12) + "px";
    for (const entry of pending) {
      if (entry.node.parentElement !== dock) dock.append(entry.node);
    }
  }

  // Altura ocupada por la barra inferior medida desde el borde de la ventana (incluye márgenes y sombra del tema).
  // Se parte de los controles del reproductor y se sube por sus contenedores mientras sigan siendo "la barra".
  function playbarTop() {
    let top = Infinity;
    const controls = document.querySelector(SEL.playerControls);
    let node = controls;
    while (node && node !== document.body) {
      const rect = node.getBoundingClientRect();
      if (rect.height > 220 || rect.width < 200) break;
      if (rect.bottom > root.innerHeight - 60) top = Math.min(top, rect.top);
      node = node.parentElement;
    }
    for (const selector of SEL.playbarBoxes) {
      document.querySelectorAll(selector).forEach(function (box) {
        const rect = box.getBoundingClientRect();
        if (rect.height > 20 && rect.height <= 220 && rect.width > 200 && rect.bottom > root.innerHeight - 60) top = Math.min(top, rect.top);
      });
    }
    return top;
  }

  function playbarInset() {
    const top = playbarTop();
    return top === Infinity ? 96 : Math.max(0, Math.round(root.innerHeight - top)) + PLAYBAR_GAP;
  }

  // options: { id, label, iconPath, onClick, replaces? (selector del botón nativo a sustituir) }.
  // Devuelve { setActive, remove }.
  function playbarButton(options) {
    injectStyle();
    const node = el("button", "sn-pb");
    node.type = "button";
    node.title = options.label;
    node.setAttribute("aria-label", options.label);
    node.append(icon(options.iconPath));
    node.addEventListener("click", function () {
      try {
        options.onClick();
      } catch (err) {
        fail(options.id, options.label, err);
      }
    });
    playbarButtons.set(options.id, { node: node, replaces: options.replaces || "" });
    if (!playbarWatcher) {
      playbarWatcher = onDom(placeButtons);
      root.setTimeout(placeButtons, FLOATING_AFTER_MS + 500);
    }
    placeButtons();
    return {
      setActive: function (active) {
        node.classList.toggle("sn-active", Boolean(active));
        node.setAttribute("aria-pressed", String(Boolean(active)));
      },
      remove: function () {
        playbarButtons.delete(options.id);
        node.remove();
        if (options.replaces) {
          document.querySelectorAll(options.replaces).forEach(function (native) { native.classList.remove("sn-native-hidden"); });
        }
      }
    };
  }

  // ----- Preferencias por plugin -----
  function storage(namespace) {
    const prefix = "sinton:" + namespace + ":";
    return {
      get: function (key, fallback) {
        try {
          const raw = root.localStorage.getItem(prefix + key);
          return raw === null ? fallback : JSON.parse(raw);
        } catch (err) {
          return fallback;
        }
      },
      set: function (key, value) {
        try {
          root.localStorage.setItem(prefix + key, JSON.stringify(value));
          return true;
        } catch (err) {
          console.error("[Sinton:" + namespace + "] no se pudo guardar", err);
          return false;
        }
      }
    };
  }

  function isTyping(event) {
    const target = event.target;
    if (!target || !target.tagName) return false;
    return target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName);
  }

  if (typeof document !== "undefined" && document.body) watchMenuFit();
  else if (typeof document !== "undefined") document.addEventListener("DOMContentLoaded", watchMenuFit, { once: true });

  core.ui = {
    injectStyle: injectStyle,
    el: el,
    button: button,
    icon: icon,
    toast: toast,
    fail: fail,
    modal: modal,
    onDom: onDom,
    registerMenuItem: registerMenuItem,
    decorateTrackRows: decorateTrackRows,
    registerCommand: registerCommand,
    runCommand: runCommand,
    listCommands: function () { return Array.from(commands.values()); },
    playbarButton: playbarButton,
    playbarInset: playbarInset,
    isTyping: isTyping
  };
  core.storage = storage;
})(typeof window !== "undefined" ? window : globalThis);

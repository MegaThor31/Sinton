// letras · interfaz: panel de letras dentro de la vista principal (no tapa la barra, la cola ni los paneles laterales).
(function (root) {
  "use strict";
  const ID = "letras";
  const part = (root.SintonParts[ID] = root.SintonParts[ID] || {});
  const api = root.SintonAPI;
  const logic = part.logic;
  const el = api.ui.el;
  const PANEL_ID = "sn-lt-panel";

  // Selectores de Spotify (si la interfaz cambia, se corrige solo aquí).
  const SEL = {
    host: "#main-view",
    page: "#main-view main",
    topBar: '#global-nav-bar, [data-testid="global-nav-bar"]',
    home: '[data-testid="home-button"], [data-testid="top-bar-back-button"], [data-testid="top-bar-forward-button"], [data-testid="whats-new-feed-button"]',    widget: '[data-testid="now-playing-widget-v2"]',
    titleLink: '[data-testid="context-link"]',
    albumOrTrack: 'a[href*="/album/"], a[href*="/track/"]',
    artistLinks: 'a[href*="/artist/"]'
  };
  const HOME_LABEL = /^(inicio|home|atrás|atras|volver|adelante|avanzar|back|forward|go back|go forward|novedades|what.?s new)$/i;
  // Tras abrir, la página puede seguir cargando y cambiar de título: ese margen no cuenta como navegación.
  const GRACE_MS = 800;

  const store = api.storage(ID);
  let offsets = store.get("offsets", {});
  if (!offsets || typeof offsets !== "object") offsets = {};
  let size = Number(store.get("size", logic.DEFAULT_SIZE)) || logic.DEFAULT_SIZE;
  let panel = null;
  let session = null;
  let offDom = null;
  let host = null;
  let hostStyle = null;
  let pageKey = "";
  let openedAt = 0;
  let onToggle = function () {};

  function offsetOf(uri) {
    return offsets[uri] || 0;
  }

  function smallButton(label, title, onClick) {
    const node = el("button", "sn-lt-btn", label);
    node.type = "button";
    node.title = title;
    node.setAttribute("aria-label", title);
    node.addEventListener("click", onClick);
    return node;
  }

  // Enlace de la cabecera: se comporta como el de la barra inferior (se pulsa el enlace nativo de Spotify).
  function linkNode(text, title, onActivate) {
    const node = el("span", "sn-lt-link", text);
    node.setAttribute("role", "link");
    node.tabIndex = 0;
    node.title = title;
    node.addEventListener("click", function (event) {
      event.preventDefault();
      onActivate();
    });
    node.addEventListener("keydown", function (event) {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      onActivate();
    });
    return node;
  }

  function nativeLink(kind, name) {
    const widget = document.querySelector(SEL.widget);
    if (!widget) return null;
    if (kind === "title") return widget.querySelector(SEL.titleLink) || widget.querySelector(SEL.albumOrTrack);
    const links = Array.from(widget.querySelectorAll(SEL.artistLinks));
    return links.find(function (link) { return link.textContent.trim() === name; }) || links[0] || null;
  }

  function go(kind, name) {
    const link = nativeLink(kind, name);
    if (!link) {
      api.ui.toast("No encuentro ese enlace en la barra de reproducción.", { error: true });
      return;
    }
    close();
    link.click();
  }

  function currentPage() {
    const main = document.querySelector(SEL.page);
    return main ? (main.getAttribute("aria-label") || "") : "";
  }

  // Si el panel o su contenedor desaparecen, o la página de debajo cambia (navegación), se cierra la letra.
  function sync() {
    if (!panel) return;
    if (!host || !host.isConnected || !panel.isConnected) {
      close();
      return;
    }
    const key = currentPage();
    if (!key) return;
    if (!pageKey || Date.now() - openedAt < GRACE_MS) {
      pageKey = key;
      return;
    }
    if (key !== pageKey) close();
  }

  function open() {
    if (panel) return;
    host = document.querySelector(SEL.host);
    if (!host) {
      api.ui.fail(ID, "Abrir letras", new Error("no encuentro la vista principal"));
      return;
    }
    hostStyle = { position: host.style.position, isolation: host.style.isolation };
    if (root.getComputedStyle(host).position === "static") host.style.position = "relative";
    host.style.isolation = "isolate";

    panel = el("section", "sn-lt");
    panel.id = PANEL_ID;
    panel.setAttribute("aria-label", "Letra de la canción");
    panel.setAttribute("data-sinton-ghost", "1");
    panel.style.setProperty("--sn-ly-size", size + "px");

    const backdrop = el("div", "sn-lt-bg");
    const cover = document.createElement("img");
    cover.className = "sn-lt-cover";
    cover.alt = "";
    const title = el("h2", "sn-lt-title");
    const artist = el("p", "sn-lt-artist");
    const offsetLabel = el("span", "sn-lt-offset", "0 s");
    const view = api.lyrics.createView({
      onSeek: function (ms) {
        const track = session && session.track();
        const target = ms - (track ? offsetOf(track.uri) : 0);
        api.player.seek(target).catch(function (err) { api.ui.fail(ID, "Saltar a la línea", err); });
      }
    });

    function paintOffset() {
      const track = session && session.track();
      offsetLabel.textContent = logic.formatOffset(track ? offsetOf(track.uri) : 0);
    }

    function paintTexts(track) {
      title.textContent = "";
      artist.textContent = "";
      if (!track) return;
      title.append(linkNode(track.name, "Ir a la canción", function () { go("title"); }));
      track.artists.forEach(function (a, index) {
        if (index > 0) artist.append(document.createTextNode(", "));
        artist.append(linkNode(a.name, "Ir al artista", function () { go("artist", a.name); }));
      });
    }

    function nudge(direction) {
      const track = session && session.track();
      if (!track) return;
      offsets = logic.setOffset(offsets, track.uri, direction === 0 ? 0 : offsetOf(track.uri) + direction * logic.OFFSET_STEP);
      store.set("offsets", offsets);
      paintOffset();
    }

    function resize(direction) {
      size = logic.stepSize(size, direction);
      store.set("size", size);
      panel.style.setProperty("--sn-ly-size", size + "px");
    }

    const info = el("div", "sn-lt-info");
    const texts = el("div", "sn-lt-texts");
    texts.append(title, artist);
    info.append(cover, texts);
    const tools = el("div", "sn-lt-tools");
    tools.append(
      smallButton("−", "Letra antes (−0,25 s)", function () { nudge(-1); }),
      offsetLabel,
      smallButton("+", "Letra después (+0,25 s)", function () { nudge(1); }),
      smallButton("A−", "Letra más pequeña", function () { resize(-1); }),
      smallButton("A+", "Letra más grande", function () { resize(1); }),
      smallButton("Buscar de nuevo", "Volver a buscar la letra", function () { if (session) session.reload(); }),
      smallButton("Cerrar", "Cerrar letras (Esc)", close)
    );
    offsetLabel.title = "Desfase de la letra. Doble clic para ponerlo a cero.";
    offsetLabel.addEventListener("dblclick", function () { nudge(0); });
    const head = el("header", "sn-lt-head");
    head.append(info, tools);
    const body = el("div", "sn-lt-body");
    body.append(view.el);
    panel.append(backdrop, head, body);
    host.appendChild(panel);
    openedAt = Date.now();
    pageKey = currentPage();
    offDom = api.ui.onDom(sync);

    session = api.lyrics.follow({
      view: view,
      getOffset: offsetOf,
      onTrack: function (track, changed) {
        if (!changed) return;
        paintTexts(track);
        cover.hidden = !(track && track.image);
        if (track && track.image) cover.src = track.image;
        backdrop.style.backgroundImage = track && track.image ? 'url("' + track.image.replace(/"/g, "%22") + '")' : "";
        paintOffset();
      }
    });
    onToggle(true);
  }

  function close() {
    if (!panel) return;
    if (session) session.stop();
    session = null;
    if (offDom) offDom();
    offDom = null;
    panel.remove();
    panel = null;
    if (host && hostStyle) {
      host.style.position = hostStyle.position;
      host.style.isolation = hostStyle.isolation;
    }
    host = null;
    hostStyle = null;
    pageKey = "";
    onToggle(false);
  }

  function toggle() {
    if (panel) close();
    else open();
  }

  function isHomeButton(target) {
    if (!(target instanceof Element)) return false;
    if (target.closest(SEL.home)) return true;
    const control = target.closest("button, a, [role=\"button\"]");
    const label = control ? control.getAttribute("aria-label") : null;
    return Boolean(label && HOME_LABEL.test(label.trim()) && control.closest(SEL.topBar));
  }

  // Al pulsar Inicio se cierra la letra y se deja que Spotify navegue (no se cancela el clic).
  function onClick(event) {
    if (panel && isHomeButton(event.target)) close();
  }

  function onKey(event) {
    if (event.key === "Escape" && panel && !document.querySelector(".sn-overlay, .sn-fs")) {
      event.stopPropagation();
      close();
      return;
    }
    if (event.altKey && !event.ctrlKey && !event.metaKey && event.code === "KeyL" && !api.ui.isTyping(event)) {
      event.preventDefault();
      toggle();
    }
  }

  function start(toggleListener) {
    onToggle = toggleListener || function () {};
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("click", onClick, true);
  }

  function stop() {
    document.removeEventListener("keydown", onKey, true);
    document.removeEventListener("click", onClick, true);
    close();
  }

  part.ui = { start: start, stop: stop, toggle: toggle, isOpen: function () { return Boolean(panel); } };
})(window);

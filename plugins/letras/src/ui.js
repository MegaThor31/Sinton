// letras · interfaz: panel de letras sobre la vista principal.
(function (root) {
  "use strict";
  const ID = "letras";
  const part = (root.SintonParts[ID] = root.SintonParts[ID] || {});
  const api = root.SintonAPI;
  const logic = part.logic;
  const el = api.ui.el;
  const PANEL_ID = "sn-lt-panel";

  // Selectores de Spotify (si la interfaz cambia, se corrige solo aquí).
  const SEL = { topBar: '#global-nav-bar, [data-testid="global-nav-bar"]' };
  const MAX_TOP_BAR = 120;

  const store = api.storage(ID);
  let offsets = store.get("offsets", {});
  if (!offsets || typeof offsets !== "object") offsets = {};
  let size = Number(store.get("size", logic.DEFAULT_SIZE)) || logic.DEFAULT_SIZE;
  let panel = null;
  let session = null;
  let offDom = null;
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

  function fit() {
    if (!panel) return;
    // Se mide desde el borde superior de la barra inferior: con el tema la barra flota con márgenes,
    // así que su altura sola no basta y el panel la tapaba.
    panel.style.bottom = api.ui.playbarInset() + "px";
    // Si existe la barra superior, el panel empieza debajo para no tapar la navegación ni los botones de ventana.
    const top = document.querySelector(SEL.topBar);
    const bottom = top ? top.getBoundingClientRect().bottom : 0;
    const offset = bottom > 0 && bottom <= MAX_TOP_BAR ? Math.round(bottom) : 0;
    panel.style.top = offset + "px";
    panel.classList.toggle("sn-lt-full", offset === 0);
  }

  function open() {
    if (panel) return;
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
    document.body.appendChild(panel);
    fit();
    root.addEventListener("resize", fit);
    offDom = api.ui.onDom(fit);

    session = api.lyrics.follow({
      view: view,
      getOffset: offsetOf,
      onTrack: function (track, changed) {
        if (!changed) return;
        title.textContent = track ? track.name : "";
        artist.textContent = track ? track.artists.map(function (a) { return a.name; }).join(", ") : "";
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
    root.removeEventListener("resize", fit);
    if (offDom) offDom();
    offDom = null;
    panel.remove();
    panel = null;
    onToggle(false);
  }

  function toggle() {
    if (panel) close();
    else open();
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
  }

  function stop() {
    document.removeEventListener("keydown", onKey, true);
    close();
  }

  part.ui = { start: start, stop: stop, toggle: toggle, isOpen: function () { return Boolean(panel); } };
})(window);

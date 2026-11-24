// marcas · interfaz: puntos en las filas, selector de marcas, panel de filtrado y gestión.
(function (root) {
  "use strict";
  const ID = "marcas";
  const part = (root.SintonParts[ID] = root.SintonParts[ID] || {});
  const api = root.SintonAPI;
  const logic = part.logic;
  const el = api.ui.el;
  const MAX_ROWS = 400;
  const BUTTON_ID = "sn-mk-page-button";
  const TAG_PATH = "M1 2.75A1.75 1.75 0 0 1 2.75 1h4.6c.46 0 .9.18 1.24.51l5.9 5.9a1.75 1.75 0 0 1 0 2.48l-4.6 4.6a1.75 1.75 0 0 1-2.48 0l-5.9-5.9A1.75 1.75 0 0 1 1 7.35v-4.6zM4.5 5.75a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5z";

  // Selectores de Spotify (si la interfaz cambia, se corrige solo aquí).
  const SEL = {
    playlistPage: '[data-testid="playlist-page"]',
    moreButton: '[data-testid="more-button"]',
    row: '[data-testid="tracklist-row"]'
  };

  const store = api.storage(ID);
  let state = load();
  let rows = null;
  let offDom = null;

  function load() {
    try {
      const raw = store.get("data", null);
      return raw ? logic.normalize(raw) : logic.createState();
    } catch (err) {
      console.error("[Sinton:" + ID + "] datos guardados no válidos; se empieza de cero", err);
      return logic.createState();
    }
  }

  function save() {
    if (!store.set("data", state)) api.ui.toast("No se pudieron guardar las marcas.", { error: true });
    if (rows) rows.refresh();
  }

  function dot(mark) {
    const node = el("i", "sn-mk-dot");
    node.style.background = mark.color;
    node.title = mark.name;
    return node;
  }

  // ----- Filas -----
  function markButton(uri, onClose) {
    const marks = logic.marksOf(state, uri);
    const node = el("button", "sn-mk-row" + (marks.length === 0 ? " sn-mk-empty" : ""));
    node.type = "button";
    node.title = marks.length ? "Marcas: " + marks.map(function (m) { return m.name; }).join(", ") : "Marcar canción";
    node.setAttribute("aria-label", node.title);
    if (marks.length === 0) node.append(api.ui.icon(TAG_PATH, 14));
    else marks.forEach(function (mark) { node.append(dot(mark)); });
    ["mousedown", "dblclick", "contextmenu"].forEach(function (type) {
      node.addEventListener(type, function (event) { event.stopPropagation(); });
    });
    node.addEventListener("click", function (event) {
      event.stopPropagation();
      openPicker([uri], onClose);
    });
    return node;
  }

  function renderRow(uri) {
    return markButton(uri);
  }

  // ----- Selector de marcas -----
  function newMarkRow(onAdded) {
    const row = el("div", "sn-row");
    const name = el("input", "sn-input");
    name.type = "text";
    name.maxLength = 30;
    name.placeholder = "Nueva marca";
    const color = document.createElement("input");
    color.type = "color";
    color.className = "sn-mk-color";
    color.value = logic.PALETTE[state.marks.length % logic.PALETTE.length];
    function add() {
      try {
        const mark = logic.addMark(state, name.value, color.value);
        save();
        onAdded(mark);
      } catch (err) {
        api.ui.toast(err.message, { error: true });
      }
    }
    name.addEventListener("keydown", function (event) {
      if (event.key === "Enter") add();
    });
    row.append(name, color, api.ui.button("Añadir", add));
    return row;
  }

  function openPicker(uris, onClose) {
    const dialog = api.ui.modal({
      title: uris.length === 1 ? "Marcar canción" : "Marcar " + uris.length + " canciones",
      onClose: onClose
    });
    const list = el("div", "sn-mk-list");
    function paint() {
      list.textContent = "";
      state.marks.forEach(function (mark) {
        const wrap = el("label", "sn-check");
        const input = document.createElement("input");
        input.type = "checkbox";
        const cover = logic.coverage(state, uris, mark.id);
        input.checked = cover === "all";
        input.indeterminate = cover === "some";
        input.addEventListener("change", function () {
          logic.setMark(state, uris, mark.id, input.checked);
          save();
        });
        const text = el("span", "sn-mk-name");
        text.append(dot(mark), document.createTextNode(mark.name));
        wrap.append(input, text);
        list.append(wrap);
      });
      if (state.marks.length === 0) list.append(el("p", "sn-muted", "Aún no hay marcas. Crea la primera abajo."));
    }
    paint();
    const footer = el("div", "sn-row sn-end");
    footer.append(api.ui.button("Gestionar marcas", function () {
      dialog.close();
      openManager(onClose);
    }), api.ui.button("Hecho", dialog.close, true));
    dialog.body.append(list, newMarkRow(function (mark) {
      logic.setMark(state, uris, mark.id, true);
      save();
      paint();
    }), footer);
  }

  // ----- Gestión, exportar e importar -----
  function exportData() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "sinton-marcas.json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    root.setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }

  function importData(file, done) {
    const reader = new FileReader();
    reader.onerror = function () { api.ui.toast("No se pudo leer el archivo.", { error: true }); };
    reader.onload = function () {
      try {
        state = logic.normalize(JSON.parse(String(reader.result)));
        save();
        api.ui.toast("Marcas importadas: " + state.marks.length + " marcas, " + Object.keys(state.tracks).length + " canciones.");
        done();
      } catch (err) {
        api.ui.toast("Importación cancelada: " + err.message, { error: true });
      }
    };
    reader.readAsText(file);
  }

  function openManager(onClose) {
    const dialog = api.ui.modal({ title: "Gestionar marcas", onClose: typeof onClose === "function" ? onClose : undefined });
    const list = el("div", "sn-mk-list");
    function paint() {
      list.textContent = "";
      state.marks.forEach(function (mark) {
        const row = el("div", "sn-row");
        const name = el("input", "sn-input");
        name.type = "text";
        name.maxLength = 30;
        name.value = mark.name;
        name.addEventListener("change", function () {
          logic.updateMark(state, mark.id, { name: name.value });
          save();
          name.value = mark.name;
        });
        const color = document.createElement("input");
        color.type = "color";
        color.className = "sn-mk-color";
        color.value = mark.color;
        color.addEventListener("change", function () {
          logic.updateMark(state, mark.id, { color: color.value });
          save();
        });
        let armed = false;
        const remove = api.ui.button("Borrar", function () {
          if (!armed) {
            armed = true;
            remove.textContent = "¿Seguro?";
            return;
          }
          logic.removeMark(state, mark.id);
          save();
          paint();
        });
        row.append(color, name, remove);
        list.append(row);
      });
    }
    paint();
    const file = document.createElement("input");
    file.type = "file";
    file.accept = "application/json,.json";
    file.hidden = true;
    file.addEventListener("change", function () {
      if (file.files && file.files[0]) importData(file.files[0], paint);
      file.value = "";
    });
    const tools = el("div", "sn-row sn-end");
    tools.append(file, api.ui.button("Exportar", exportData), api.ui.button("Importar", function () { file.click(); }));
    dialog.body.append(
      list,
      newMarkRow(paint),
      el("p", "sn-muted", "Las marcas se guardan en este ordenador. Exporta una copia si vas a reinstalar Spotify. Importar sustituye las marcas actuales."),
      tools
    );
  }

  // ----- Panel de filtrado -----
  async function loadSource(sourceUri) {
    const type = api.uri.type(sourceUri);
    if (type === "playlist") {
      const info = await api.data.playlistInfo(sourceUri).catch(function () { return { name: "" }; });
      return { name: info.name || "Playlist", tracks: await api.data.playlistTracks(sourceUri) };
    }
    if (type === "liked") return { name: "Canciones que te gustan", tracks: await api.data.likedTracks() };
    if (type === "album") {
      const album = await api.data.albumTracks(sourceUri);
      return { name: album.name || "Álbum", tracks: album.tracks };
    }
    throw new Error("Abre una playlist, un álbum o tus canciones que te gustan.");
  }

  function openFilter(sourceUri) {
    const dialog = api.ui.modal({ title: "Filtrar por marcas", wide: true });
    const saved = store.get("filters", {});
    const filter = Object.assign({ ids: [], mode: "any" }, saved[sourceUri] || {});
    const status = el("p", "sn-muted", "Cargando canciones…");
    const chips = el("div", "sn-row");
    const modeRow = el("div", "sn-row");
    const actions = el("div", "sn-row");
    const list = el("div", "sn-mk-tracks");
    dialog.body.append(status);
    let source = null;

    function result() {
      return logic.filterTracks(source.tracks, state, filter.ids, filter.mode);
    }

    function persist() {
      const all = store.get("filters", {});
      all[sourceUri] = filter;
      store.set("filters", all);
    }

    function play(uris) {
      api.player.playTracks(uris, api.uri.type(sourceUri) === "liked" ? null : sourceUri).catch(function (err) {
        api.ui.fail(ID, "Reproducir filtro", err);
      });
    }

    function paint() {
      const tracks = result();
      const counts = logic.countByMark(source.tracks, state);
      chips.textContent = "";
      state.marks.forEach(function (mark) {
        const chip = el("button", "sn-mk-chip");
        chip.type = "button";
        chip.setAttribute("aria-pressed", String(filter.ids.includes(mark.id)));
        chip.append(dot(mark), document.createTextNode(mark.name + " · " + counts[mark.id]));
        chip.addEventListener("click", function () {
          filter.ids = filter.ids.includes(mark.id)
            ? filter.ids.filter(function (id) { return id !== mark.id; })
            : filter.ids.concat(mark.id);
          persist();
          paint();
        });
        chips.append(chip);
      });
      status.textContent = tracks.length + " de " + source.tracks.length + " canciones"
        + (filter.ids.length === 0 ? (filter.mode === "exclude" ? " (sin ninguna marca)" : " (con cualquier marca)") : "");
      actions.querySelectorAll("button[data-needs]").forEach(function (btn) { btn.disabled = tracks.length === 0; });
      list.textContent = "";
      tracks.slice(0, MAX_ROWS).forEach(function (track, index) {
        const row = el("div", "sn-mk-track");
        const main = el("button", "sn-mk-track-main");
        main.type = "button";
        main.title = "Reproducir desde aquí";
        const texts = el("span", "sn-mk-track-text");
        texts.append(el("b", "", track.name), el("small", "", track.artists.map(function (a) { return a.name; }).join(", ")));
        main.append(el("span", "sn-mk-track-n", String(index + 1)), texts);
        main.addEventListener("click", function () {
          play(tracks.slice(index).map(function (t) { return t.uri; }));
        });
        row.append(main, markButton(track.uri, paint));
        list.append(row);
      });
      if (tracks.length > MAX_ROWS) list.append(el("p", "sn-muted", "Se muestran las primeras " + MAX_ROWS + ". Reproducir y crear playlist usan todas."));
      if (tracks.length === 0) list.append(el("p", "sn-muted", "Ninguna canción cumple el filtro. Marca canciones desde el icono de etiqueta de cada fila o con clic derecho → Marcar."));
    }

    function build() {
      dialog.setTitle("Filtrar «" + source.name + "»");
      const mode = el("select", "sn-input");
      [["any", "Con alguna de las marcas"], ["all", "Con todas las marcas"], ["exclude", "Sin esas marcas"]].forEach(function (entry) {
        const option = el("option", "", entry[1]);
        option.value = entry[0];
        mode.append(option);
      });
      mode.value = filter.mode;
      mode.addEventListener("change", function () {
        filter.mode = mode.value;
        persist();
        paint();
      });
      modeRow.append(el("span", "sn-label", "Mostrar"), mode);

      function action(label, handler, primary) {
        const btn = api.ui.button(label, handler, primary);
        btn.dataset.needs = "1";
        return btn;
      }
      actions.append(
        action("Reproducir", function () { play(result().map(function (t) { return t.uri; })); }, true),
        action("Aleatorio", function () { play(logic.shuffle(result().map(function (t) { return t.uri; }))); }),
        action("Añadir a la cola", function () {
          api.player.addToQueue(result().map(function (t) { return t.uri; }))
            .then(function () { api.ui.toast("Añadidas a la cola."); })
            .catch(function (err) { api.ui.fail(ID, "Añadir a la cola", err); });
        }),
        action("Crear playlist", function () {
          const uris = result().map(function (t) { return t.uri; });
          api.data.createPlaylist(source.name + " · filtrada", uris)
            .then(function (created) { api.ui.toast("Playlist creada con " + created.added + " canciones."); })
            .catch(function (err) { api.ui.fail(ID, "Crear playlist", err); });
        }),
        api.ui.button("Gestionar marcas", function () { openManager(paint); })
      );
      dialog.body.textContent = "";
      dialog.body.append(chips, modeRow, actions, status, list);
      paint();
    }

    loadSource(sourceUri).then(function (loaded) {
      source = loaded;
      build();
    }).catch(function (err) {
      status.textContent = "Error: " + ((err && err.message) || "no se pudo cargar");
      console.error("[Sinton:" + ID + "] cargar origen", err);
    });
  }

  function currentSource() {
    const uri = api.uri.fromPath(api.platform.currentPath());
    const type = api.uri.type(uri);
    return type === "playlist" || type === "album" || type === "liked" ? uri : null;
  }

  // ----- Botón en la página de playlist -----
  function ensurePageButton() {
    const page = document.querySelector(SEL.playlistPage);
    const existing = document.getElementById(BUTTON_ID);
    if (!page) {
      if (existing) existing.remove();
      return;
    }
    if (existing && page.contains(existing)) return;
    if (existing) existing.remove();
    const anchor = Array.from(page.querySelectorAll(SEL.moreButton)).find(function (node) { return !node.closest(SEL.row); });
    if (!anchor || !anchor.parentElement) return;
    const node = el("button", "sn-mk-page");
    node.id = BUTTON_ID;
    node.type = "button";
    node.title = "Filtrar por marcas";
    node.setAttribute("aria-label", "Filtrar por marcas");
    node.append(api.ui.icon(TAG_PATH, 20));
    node.addEventListener("click", function () {
      const source = currentSource();
      if (source) openFilter(source);
    });
    anchor.insertAdjacentElement("afterend", node);
  }

  function start() {
    if (rows) return;
    rows = api.ui.decorateTrackRows({ id: ID, render: renderRow });
    offDom = api.ui.onDom(ensurePageButton);
  }

  function stop() {
    if (rows) rows.remove();
    rows = null;
    if (offDom) offDom();
    offDom = null;
    const node = document.getElementById(BUTTON_ID);
    if (node) node.remove();
  }

  part.ui = {
    start: start,
    stop: stop,
    openPicker: openPicker,
    openFilter: openFilter,
    openManager: openManager,
    currentSource: currentSource
  };
})(window);

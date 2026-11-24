// playlist-iconos · interfaz: construye el índice en segundo plano y pinta las portadas en las filas.
(function (root) {
  "use strict";
  const ID = "playlist-iconos";
  const part = (root.SintonParts[ID] = root.SintonParts[ID] || {});
  const api = root.SintonAPI;
  const logic = part.logic;
  const CONCURRENCY = 3;
  const STALE_MS = 3 * 60 * 1000;
  const REPAINT_MS = 1000;

  const store = api.storage(ID);
  let settings = Object.assign({}, logic.DEFAULTS, store.get("settings", {}));
  let index = new Map();
  let playlists = new Map();
  let builtAt = 0;
  let building = false;
  let rows = null;
  let repaintTimer = null;
  let offNavigate = null;

  function repaintSoon() {
    if (repaintTimer || !rows) return;
    repaintTimer = root.setTimeout(function () {
      repaintTimer = null;
      if (rows) rows.refresh();
    }, REPAINT_MS);
  }

  async function build() {
    if (building) return;
    building = true;
    try {
      const selected = logic.selectPlaylists(await api.data.userPlaylists(), settings);
      const nextIndex = new Map();
      const nextPlaylists = new Map(selected.map(function (playlist) { return [playlist.uri, playlist]; }));
      const firstBuild = index.size === 0;
      if (firstBuild) {
        index = nextIndex;
        playlists = nextPlaylists;
      }
      await api.data.pool(selected, CONCURRENCY, async function (playlist) {
        try {
          const tracks = await api.data.playlistTracks(playlist.uri);
          logic.addToIndex(nextIndex, playlist.uri, tracks.map(function (track) { return track.uri; }));
          if (firstBuild) repaintSoon();
        } catch (err) {
          console.warn("[Sinton:" + ID + "] playlist no leída", playlist.uri, err);
        }
      });
      index = nextIndex;
      playlists = nextPlaylists;
      builtAt = Date.now();
      if (rows) rows.refresh();
    } catch (err) {
      console.error("[Sinton:" + ID + "] no se pudo construir el índice", err);
    } finally {
      building = false;
    }
  }

  function openPlaylist(uri) {
    const path = api.uri.toPath(uri);
    if (path) api.platform.navigate(path);
  }

  function swallow(node) {
    ["mousedown", "dblclick", "contextmenu"].forEach(function (type) {
      node.addEventListener(type, function (event) { event.stopPropagation(); });
    });
  }

  function iconFor(uri) {
    const playlist = playlists.get(uri);
    if (!playlist) return null;
    const node = api.ui.el("button", "sn-pi-icon");
    node.type = "button";
    node.title = "En «" + playlist.name + "»";
    node.setAttribute("aria-label", "Abrir playlist " + playlist.name);
    if (playlist.image) {
      const img = document.createElement("img");
      img.src = playlist.image;
      img.alt = "";
      img.loading = "lazy";
      img.addEventListener("error", function () {
        img.remove();
        node.textContent = logic.initial(playlist.name);
      });
      node.append(img);
    } else {
      node.textContent = logic.initial(playlist.name);
    }
    swallow(node);
    node.addEventListener("click", function (event) {
      event.stopPropagation();
      openPlaylist(uri);
    });
    return node;
  }

  function showAll(uris) {
    const dialog = api.ui.modal({ title: "Playlists que la contienen" });
    uris.forEach(function (uri) {
      const playlist = playlists.get(uri);
      if (!playlist) return;
      const row = api.ui.el("div", "sn-row");
      const icon = iconFor(uri);
      const open = api.ui.button(playlist.name, function () {
        dialog.close();
        openPlaylist(uri);
      });
      if (icon) row.append(icon);
      row.append(open);
      dialog.body.append(row);
    });
  }

  function render(trackUri) {
    const current = api.uri.fromPath(api.platform.currentPath());
    const labels = logic.labelsFor(index, trackUri, current, settings);
    if (labels.shown.length === 0) return null;
    const wrap = api.ui.el("span", "sn-pi");
    labels.shown.forEach(function (uri) {
      const icon = iconFor(uri);
      if (icon) wrap.append(icon);
    });
    if (labels.hidden.length > 0) {
      const more = api.ui.el("button", "sn-pi-more", "+" + labels.hidden.length);
      more.type = "button";
      more.title = "Ver todas las playlists";
      swallow(more);
      more.addEventListener("click", function (event) {
        event.stopPropagation();
        showAll(labels.shown.concat(labels.hidden));
      });
      wrap.append(more);
    }
    return wrap;
  }

  function openSettings() {
    const dialog = api.ui.modal({ title: "Iconos de playlists" });
    function check(key, label, hint, rebuild) {
      const wrap = api.ui.el("label", "sn-check");
      const input = document.createElement("input");
      input.type = "checkbox";
      input.checked = Boolean(settings[key]);
      input.addEventListener("change", function () {
        settings[key] = input.checked;
        store.set("settings", settings);
        if (rebuild) build();
        else if (rows) rows.refresh();
      });
      const text = api.ui.el("span", "", label);
      text.append(api.ui.el("small", "", hint));
      wrap.append(input, text);
      return wrap;
    }
    const maxRow = api.ui.el("div", "sn-row");
    const max = api.ui.el("select", "sn-input");
    [2, 3, 4, 6, 8].forEach(function (value) {
      const option = api.ui.el("option", "", String(value));
      option.value = String(value);
      max.append(option);
    });
    max.value = String(settings.max);
    max.addEventListener("change", function () {
      settings.max = Number(max.value);
      store.set("settings", settings);
      if (rows) rows.refresh();
    });
    maxRow.append(api.ui.el("span", "sn-label", "Iconos por canción"), max);
    dialog.body.append(
      check("includeFollowed", "Incluir playlists que sigo", "Además de las tuyas y las colaborativas.", true),
      check("showCurrent", "Mostrar también la playlist abierta", "Por defecto se oculta la playlist que estás viendo.", false),
      maxRow,
      api.ui.el("p", "sn-muted", index.size + " canciones indexadas en " + playlists.size + " playlists."),
      api.ui.button("Actualizar ahora", function () {
        build().then(function () { api.ui.toast("Iconos de playlists actualizados."); });
      }, true)
    );
  }

  function start() {
    if (rows) return;
    rows = api.ui.decorateTrackRows({ id: ID, render: render });
    offNavigate = api.platform.onNavigate(function () {
      if (Date.now() - builtAt > STALE_MS) build();
    });
    build();
  }

  function stop() {
    if (rows) rows.remove();
    rows = null;
    if (offNavigate) offNavigate();
    offNavigate = null;
    if (repaintTimer) root.clearTimeout(repaintTimer);
    repaintTimer = null;
  }

  part.ui = { start: start, stop: stop, openSettings: openSettings };
})(window);

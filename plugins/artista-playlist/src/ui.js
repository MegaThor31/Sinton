// artista-playlist · interfaz: diálogo de opciones, carga de discografía y creación de la playlist.
(function (root) {
  "use strict";
  const ID = "artista-playlist";
  const part = (root.SintonParts[ID] = root.SintonParts[ID] || {});
  const api = root.SintonAPI;
  const logic = part.logic;
  const CONCURRENCY = 4;

  const INCLUDE = [
    ["albums", "Álbumes"],
    ["singles", "Sencillos y EP"],
    ["compilations", "Recopilatorios"],
    ["appears", "Apariciones en discos de otros", "Canciones suyas dentro de lanzamientos ajenos."]
  ];

  function check(label, hint, checked, onChange, type, name) {
    const wrap = api.ui.el("label", "sn-check");
    const input = document.createElement("input");
    input.type = type || "checkbox";
    if (name) input.name = name;
    input.checked = checked;
    input.addEventListener("change", function () { onChange(input.checked); });
    const text = api.ui.el("span", "", label);
    if (hint) text.append(api.ui.el("small", "", hint));
    wrap.append(input, text);
    return wrap;
  }

  async function loadTracks(releases, onProgress) {
    let done = 0;
    let failed = 0;
    const lists = await api.data.pool(releases, CONCURRENCY, async function (release) {
      try {
        return (await api.data.albumTracks(release.uri, release)).tracks;
      } catch (err) {
        failed += 1;
        console.warn("[Sinton:" + ID + "] lanzamiento no leído", release.uri, err);
        return [];
      } finally {
        done += 1;
        onProgress(done, releases.length);
      }
    });
    return { tracks: [].concat.apply([], lists), failed: failed };
  }

  async function artistName(artistUri, tracks) {
    try {
      const visuals = await api.data.artistVisuals(artistUri);
      if (visuals.name) return visuals.name;
    } catch (err) {
      console.warn("[Sinton:" + ID + "] nombre del artista", err);
    }
    for (const track of tracks) {
      const match = track.artists.find(function (artist) { return artist.uri === artistUri; });
      if (match && match.name) return match.name;
    }
    return "Artista";
  }

  function open(artistUri) {
    const store = api.storage(ID);
    const options = Object.assign({}, logic.DEFAULTS, store.get("options", {}));
    const state = { own: null, appears: null, failed: 0, busy: false, closed: false, nameEdited: false };
    const dialog = api.ui.modal({ title: "Playlist de artista", onClose: function () { state.closed = true; } });
    const el = api.ui.el;

    const nameInput = el("input", "sn-input");
    nameInput.type = "text";
    nameInput.maxLength = 100;
    nameInput.placeholder = "Nombre de la playlist";
    nameInput.addEventListener("input", function () { state.nameEdited = true; });

    const status = el("p", "sn-muted", "Leyendo discografía…");
    const bar = el("div", "sn-progress");
    const fill = el("i");
    bar.append(fill);
    const create = api.ui.button("Crear playlist", onCreate, true);
    create.disabled = true;

    function progress(done, total) {
      fill.style.width = (total ? Math.round((done / total) * 100) : 0) + "%";
    }

    function currentList() {
      const tracks = (state.own || []).concat(options.appears && state.appears ? state.appears : []);
      return logic.buildList(tracks, options, artistUri);
    }

    function refresh() {
      store.set("options", options);
      if (state.busy || !state.own) return;
      if (options.appears && !state.appears) return void loadAppears();
      const count = currentList().length;
      const over = count > api.data.PLAYLIST_LIMIT;
      status.textContent = count + (count === 1 ? " canción" : " canciones") + " con estas opciones"
        + (over ? " (Spotify admite " + api.data.PLAYLIST_LIMIT + "; se añadirán las primeras)" : "")
        + (state.failed ? " · " + state.failed + " lanzamientos no se pudieron leer" : "");
      create.disabled = count === 0;
    }

    function set(key) {
      return function (value) {
        options[key] = value;
        refresh();
      };
    }

    async function run(label, task) {
      state.busy = true;
      create.disabled = true;
      status.textContent = label;
      progress(0, 1);
      try {
        await task();
      } catch (err) {
        if (!state.closed) status.textContent = "Error: " + ((err && err.message) || "no se pudo completar");
        console.error("[Sinton:" + ID + "] " + label, err);
        state.busy = false;
        return false;
      }
      state.busy = false;
      if (!state.closed) refresh();
      return true;
    }

    function loadOwn() {
      return run("Leyendo discografía…", async function () {
        const releases = await api.data.artistReleases(artistUri);
        const result = await loadTracks(releases, function (done, total) {
          progress(done, total);
          status.textContent = "Leyendo discografía… " + done + "/" + total + " lanzamientos";
        });
        state.own = result.tracks;
        state.failed += result.failed;
        if (!state.nameEdited) nameInput.value = (await artistName(artistUri, result.tracks)) + " · Todas las canciones";
      });
    }

    function loadAppears() {
      return run("Leyendo apariciones…", async function () {
        const releases = await api.data.artistAppearsOn(artistUri);
        const result = await loadTracks(releases, function (done, total) {
          progress(done, total);
          status.textContent = "Leyendo apariciones… " + done + "/" + total + " lanzamientos";
        });
        state.appears = result.tracks;
        state.failed += result.failed;
      });
    }

    async function onCreate() {
      const uris = currentList().map(function (track) { return track.uri; });
      const name = nameInput.value.trim() || "Todas las canciones";
      let created = null;
      const ok = await run("Creando playlist…", async function () {
        created = await api.data.createPlaylist(name, uris, function (done, total) {
          progress(done, total);
          status.textContent = "Añadiendo canciones… " + done + "/" + total;
        });
      });
      if (!ok || !created) return;
      api.ui.toast("Playlist «" + name + "» creada con " + created.added + " canciones.");
      dialog.close();
      const path = api.uri.toPath(created.uri);
      if (path) api.platform.navigate(path);
    }

    const include = el("div");
    include.append(el("p", "sn-label", "Qué incluir"));
    INCLUDE.forEach(function (entry) {
      include.append(check(entry[1], entry[2], options[entry[0]], set(entry[0])));
    });

    const repeats = el("div");
    repeats.append(el("p", "sn-label", "Repeticiones"));
    repeats.append(
      check("Todas absolutas", "Cada pista de cada lanzamiento, aunque la misma canción salga en varios.", !options.unique, function (on) {
        if (on) set("unique")(false);
      }, "radio", "sn-ap-repeat"),
      check("Sin repetir", "Una sola versión por canción; se prefiere la del álbum.", options.unique, function (on) {
        if (on) set("unique")(true);
      }, "radio", "sn-ap-repeat")
    );

    const filters = el("div");
    filters.append(el("p", "sn-label", "Filtros"));
    filters.append(
      check("Sin colaboraciones", "Solo canciones en las que es el único artista.", options.noCollabs, set("noCollabs")),
      check("Sin versiones alternativas", "Quita remixes, directos, acústicos, instrumentales, demos y similares.", options.noAlternates, set("noAlternates"))
    );

    const orderRow = el("div", "sn-row");
    const order = el("select", "sn-input");
    [["newest", "Más recientes primero"], ["oldest", "Más antiguas primero"]].forEach(function (entry) {
      const option = el("option", "", entry[1]);
      option.value = entry[0];
      order.append(option);
    });
    order.value = options.order;
    order.addEventListener("change", function () { set("order")(order.value); });
    orderRow.append(el("span", "sn-label", "Orden"), order);

    const footer = el("div", "sn-row sn-end");
    footer.append(create);
    dialog.body.append(nameInput, include, repeats, filters, orderRow, bar, status, footer);
    loadOwn();
  }

  function contextArtist() {
    const fromPage = api.uri.fromPath(api.platform.currentPath());
    if (api.uri.type(fromPage) === "artist") return fromPage;
    const current = api.player.current();
    const first = current && current.artists[0];
    return first && api.uri.type(first.uri) === "artist" ? first.uri : null;
  }

  part.ui = { open: open, contextArtist: contextArtist };
})(window);

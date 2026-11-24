// pantalla-completa · interfaz: vista a pantalla completa con fondo, controles y letra.
(function (root) {
  "use strict";
  const ID = "pantalla-completa";
  const part = (root.SintonParts[ID] = root.SintonParts[ID] || {});
  const api = root.SintonAPI;
  const logic = part.logic;
  const el = api.ui.el;
  const IDLE_MS = 3000;
  const ICONS = {
    prev: "M3.3 1a.7.7 0 0 1 .7.7v5.15l9.95-5.744a.7.7 0 0 1 1.05.606v12.575a.7.7 0 0 1-1.05.607L4 9.149V14.3a.7.7 0 0 1-.7.7H1.7a.7.7 0 0 1-.7-.7V1.7a.7.7 0 0 1 .7-.7h1.6z",
    next: "M12.7 1a.7.7 0 0 0-.7.7v5.15L2.05 1.107A.7.7 0 0 0 1 1.712v12.575a.7.7 0 0 0 1.05.607L12 9.149V14.3a.7.7 0 0 0 .7.7h1.6a.7.7 0 0 0 .7-.7V1.7a.7.7 0 0 0-.7-.7h-1.6z",
    play: "M3 1.713a.7.7 0 0 1 1.05-.607l10.89 6.288a.7.7 0 0 1 0 1.212L4.05 14.894A.7.7 0 0 1 3 14.288V1.713z",
    pause: "M2.7 1a.7.7 0 0 0-.7.7v12.6a.7.7 0 0 0 .7.7h2.6a.7.7 0 0 0 .7-.7V1.7a.7.7 0 0 0-.7-.7H2.7zm8 0a.7.7 0 0 0-.7.7v12.6a.7.7 0 0 0 .7.7h2.6a.7.7 0 0 0 .7-.7V1.7a.7.7 0 0 0-.7-.7h-2.6z",
    shuffle: "M13.151.922a.75.75 0 1 0-1.06 1.06L13.109 3H11.16a3.75 3.75 0 0 0-2.873 1.34l-6.173 7.356A2.25 2.25 0 0 1 .39 12.5H0V14h.391a3.75 3.75 0 0 0 2.873-1.34l6.173-7.356a2.25 2.25 0 0 1 1.724-.804h1.947l-1.017 1.018a.75.75 0 0 0 1.06 1.06L15.98 3.75 13.15.922zM.391 3.5H0V2h.391c1.109 0 2.16.49 2.873 1.34L4.89 5.277l-.979 1.167-1.796-2.14A2.25 2.25 0 0 0 .39 3.5zM7.5 10.723l.98-1.167.957 1.14a2.25 2.25 0 0 0 1.724.804h1.947l-1.017-1.018a.75.75 0 1 1 1.06-1.06l2.829 2.828-2.829 2.828a.75.75 0 1 1-1.06-1.06L13.109 13H11.16a3.75 3.75 0 0 1-2.873-1.34l-.787-.938z",
    repeat: "M0 4.75A3.75 3.75 0 0 1 3.75 1h8.5A3.75 3.75 0 0 1 16 4.75v5a3.75 3.75 0 0 1-3.75 3.75H9.81l1.018 1.018a.75.75 0 1 1-1.06 1.06L6.939 12.75l2.829-2.828a.75.75 0 1 1 1.06 1.06L9.811 12h2.439a2.25 2.25 0 0 0 2.25-2.25v-5a2.25 2.25 0 0 0-2.25-2.25h-8.5A2.25 2.25 0 0 0 1.5 4.75v5A2.25 2.25 0 0 0 3.75 12H5v1.5H3.75A3.75 3.75 0 0 1 0 9.75v-5z",
    heart: "M1.69 2A4.582 4.582 0 0 1 8 2.023 4.583 4.583 0 0 1 11.88.817h.002a4.618 4.618 0 0 1 3.782 3.65v.003a4.543 4.543 0 0 1-1.011 3.84L9.35 14.629a1.765 1.765 0 0 1-2.093.464 1.762 1.762 0 0 1-.605-.463L1.348 8.309A4.582 4.582 0 0 1 1.689 2zm3.158.252A3.082 3.082 0 0 0 2.49 7.337l.005.005L7.8 13.664a.264.264 0 0 0 .311.069.262.262 0 0 0 .09-.069l5.312-6.33a3.043 3.043 0 0 0 .68-2.573 3.118 3.118 0 0 0-2.551-2.463 3.079 3.079 0 0 0-2.612.816l-.007.007a1.501 1.501 0 0 1-2.045 0l-.009-.008a3.082 3.082 0 0 0-2.121-.861z",
    heartOn: "M15.724 4.22A4.313 4.313 0 0 0 12.192.814a4.269 4.269 0 0 0-3.622 1.13.837.837 0 0 1-1.14 0 4.272 4.272 0 0 0-6.21 5.855l5.916 7.05a1.128 1.128 0 0 0 1.727 0l5.916-7.05a4.228 4.228 0 0 0 .945-3.577z",
    add: "M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm11.75 0a.75.75 0 0 1-.75.75H8.75V11a.75.75 0 0 1-1.5 0V8.75H5a.75.75 0 0 1 0-1.5h2.25V5a.75.75 0 0 1 1.5 0v2.25H11a.75.75 0 0 1 .75.75z",
    tag: "M8.6 1H14a1 1 0 0 1 1 1v5.4a1 1 0 0 1-.3.7l-6.6 6.6a1 1 0 0 1-1.4 0L1.3 9.3a1 1 0 0 1 0-1.4l6.6-6.6A1 1 0 0 1 8.6 1zm.3 1.5L2.9 8.6l4.5 4.5 6.1-6.1V2.5H8.9zM11 4a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"
  };
  const SHUFFLE_LABELS = {
    off: "Aleatorio: apagado (en orden)",
    on: "Aleatorio: activado",
    smart: "Aleatorio: inteligente de Spotify"
  };
  const SHUFFLE_BADGES = { smart: "+" };
  const REPEAT_LABELS = { off: "Repetir: no", context: "Repetir: todo", track: "Repetir: esta canción" };
  const COLOR_SAMPLE = 24;
  const QUEUE_ROWS = 40;
  const UP_ICON = "M2 1.75A.75.75 0 0 1 2.75 1h10.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 1.75zm6 2a.75.75 0 0 1 .53.22l4 4a.75.75 0 1 1-1.06 1.06L8.75 6.31v7.94a.75.75 0 0 1-1.5 0V6.31L4.53 9.03a.75.75 0 0 1-1.06-1.06l4-4A.75.75 0 0 1 8 3.75z";

  const store = api.storage(ID);
  const settings = Object.assign({}, logic.DEFAULTS, store.get("settings", {}));
  if (!logic.isBackground(settings.background)) settings.background = logic.DEFAULTS.background;
  if (!logic.isDisc(settings.disc)) settings.disc = logic.DEFAULTS.disc;
  let view = null;
  let onToggle = function () {};

  function saveSettings() {
    store.set("settings", settings);
  }

  // Reutiliza el desfase por canción que se ajusta en el plugin Letras+ (si está instalado).
  function lyricsOffset(uri) {
    const offsets = api.storage("letras").get("offsets", {});
    const value = offsets && typeof offsets === "object" ? Number(offsets[uri]) : 0;
    return Number.isFinite(value) ? value : 0;
  }

  function act(label, promise) {
    return Promise.resolve(promise).catch(function (err) { api.ui.fail(ID, label, err); });
  }

  function shuffleMode() {
    return api.player.shuffleMode();
  }

  // Pulsa el botón de aleatorio de la barra de Spotify, así el comportamiento es exactamente el suyo
  // (aleatorio, inteligente y apagado). Si la barra no está, usa el ciclo interno.
  function nativeShuffleButton() {
    const direct = document.querySelector('[data-testid="control-button-shuffle"]');
    if (direct) return direct;
    let node = document.querySelector('[data-testid="player-controls"] [data-testid="control-button-skip-back"]');
    while (node && node.parentElement && !node.previousElementSibling) node = node.parentElement;
    const prev = node && node.previousElementSibling;
    if (!prev) return null;
    return prev.matches("button") ? prev : prev.querySelector("button");
  }

  function cycleShuffle() {
    const button = nativeShuffleButton();
    if (button) {
      button.click();
      return Promise.resolve();
    }
    return api.player.cycleShuffle();
  }

  function tagPicker() {
    const plugin = root.SintonParts.marcas;
    return plugin && plugin.ui && typeof plugin.ui.openPicker === "function" ? plugin.ui.openPicker : null;
  }

  function fallbackColor() {
    return root.SintonColors ? root.SintonColors.rgb() : logic.FALLBACK_COLOR.slice();
  }

  // Color dominante de la portada; si la imagen no permite leer píxeles se usa el color principal.
  function sampleColor(url) {
    return new Promise(function (resolve) {
      if (!url) return resolve(fallbackColor());
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = function () {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = COLOR_SAMPLE;
          canvas.height = COLOR_SAMPLE;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, COLOR_SAMPLE, COLOR_SAMPLE);
          resolve(logic.dominantColor(ctx.getImageData(0, 0, COLOR_SAMPLE, COLOR_SAMPLE).data));
        } catch (err) {
          resolve(fallbackColor());
        }
      };
      img.onerror = function () { resolve(fallbackColor()); };
      img.src = url;
    });
  }

  function openPlaylistPicker(track) {
    const dialog = api.ui.modal({ title: "Añadir a playlist" });
    const search = document.createElement("input");
    search.className = "sn-input";
    search.type = "search";
    search.placeholder = "Buscar playlist";
    search.setAttribute("aria-label", "Buscar playlist");
    const list = el("div", "sn-fs-plist");
    const status = el("p", "sn-muted", "Cargando tus playlists…");
    dialog.body.append(el("p", "sn-muted", track.name + " · " + track.artists.map(function (a) { return a.name; }).join(", ")), search, status, list);
    let playlists = [];
    let busy = false;

    function paint() {
      const query = search.value.trim().toLowerCase();
      list.textContent = "";
      const shown = playlists.filter(function (pl) { return !query || pl.name.toLowerCase().includes(query); });
      status.textContent = shown.length === 0 ? (playlists.length === 0 ? "No tienes playlists propias o colaborativas." : "Ninguna coincide.") : "";
      shown.forEach(function (pl) {
        const row = el("button", "sn-fs-prow");
        row.type = "button";
        const img = document.createElement("img");
        img.alt = "";
        if (pl.image) img.src = pl.image;
        else img.hidden = true;
        row.append(img, el("span", "", pl.name), el("small", "", pl.total + " canciones"));
        row.addEventListener("click", function () {
          if (busy) return;
          busy = true;
          api.data.playlistTracks(pl.uri).then(function (tracks) {
            if (tracks.some(function (t) { return t.uri === track.uri; })) {
              api.ui.toast("Ya estaba en «" + pl.name + "».");
              return;
            }
            return api.data.addToPlaylist(pl.uri, [track.uri]).then(function () {
              api.ui.toast("Añadida a «" + pl.name + "».");
            });
          }).then(function () { dialog.close(); }).catch(function (err) {
            busy = false;
            api.ui.fail(ID, "Añadir a playlist", err);
          });
        });
        list.append(row);
      });
    }

    search.addEventListener("input", paint);
    api.data.userPlaylists().then(function (all) {
      playlists = all.filter(function (pl) { return pl.owned || pl.collaborative; });
      paint();
      search.focus();
    }).catch(function (err) {
      status.textContent = "No se pudieron leer tus playlists.";
      api.ui.fail(ID, "Leer playlists", err);
    });
  }

  function build() {
    const overlay = el("section", "sn-fs");
    overlay.setAttribute("aria-label", "Pantalla completa");
    overlay.setAttribute("data-sinton-ghost", "1");
    overlay.tabIndex = -1;

    const layers = [el("div", "sn-fs-bg"), el("div", "sn-fs-bg")];
    const shade = el("div", "sn-fs-shade");
    const cover = document.createElement("img");
    cover.className = "sn-fs-cover";
    cover.alt = "";
    cover.hidden = true;
    const title = el("h1", "sn-fs-title", "Nada sonando");
    const artist = el("p", "sn-fs-artist");
    const album = el("p", "sn-fs-album");
    const elapsed = el("span", "sn-fs-time", "0:00");
    const total = el("span", "sn-fs-time", "0:00");
    const bar = el("div", "sn-fs-bar");
    const fill = el("i");
    bar.append(fill);
    bar.setAttribute("role", "slider");
    bar.setAttribute("aria-label", "Progreso");

    const lyricsView = api.lyrics.createView({
      onSeek: function (ms) { act("Saltar a la línea", api.player.seek(ms)); }
    });

    let activeLayer = 0;
    let backgroundSeq = 0;
    let shownBackground = "";
    let lastSecond = -1;
    let idleTimer = null;
    let closed = false;
    let nativeActive = false;
    let lyricsMissing = false;
    let saved = false;
    let savedSeq = 0;
    let colorSeq = 0;

    function setIcon(node, pathData, size) {
      const svg = api.ui.icon(pathData, size);
      svg.querySelector("path").setAttribute("fill-rule", "evenodd");
      const old = node.querySelector("svg");
      if (old) old.replaceWith(svg);
      else node.prepend(svg);
    }

    function iconButton(pathData, label, onClick, big) {
      const node = el("button", "sn-fs-ctl" + (big ? " sn-fs-ctl-main" : ""));
      node.type = "button";
      node.title = label;
      node.setAttribute("aria-label", label);
      setIcon(node, pathData, big ? 24 : 20);
      node.addEventListener("click", onClick);
      return node;
    }

    function setLabel(node, label) {
      node.title = label;
      node.setAttribute("aria-label", label);
    }

    function textButton(label, titleText, onClick) {
      const node = el("button", "sn-fs-pill", label);
      node.type = "button";
      node.title = titleText;
      node.addEventListener("click", onClick);
      return node;
    }

    const playButton = iconButton(ICONS.pause, "Reproducir o pausar (Espacio)", function () {
      act("Reproducir o pausar", api.player.togglePlay());
    }, true);

    function paintPlay(paused) {
      setIcon(playButton, paused ? ICONS.play : ICONS.pause, 24);
      overlay.classList.toggle("sn-fs-playing", !paused);
    }

    const shuffleButton = iconButton(ICONS.shuffle, SHUFFLE_LABELS.off, function () {
      act("Aleatorio", cycleShuffle()).then(paintModes);
    });
    const shuffleBadge = el("span", "sn-fs-badge");
    shuffleButton.append(shuffleBadge);
    const repeatButton = iconButton(ICONS.repeat, REPEAT_LABELS.off, function () {
      act("Repetir", api.player.cycleRepeat());
    });
    const repeatBadge = el("span", "sn-fs-badge", "1");
    repeatButton.append(repeatBadge);

    function paintModes() {
      if (closed) return;
      const shuffle = shuffleMode();
      shuffleButton.classList.toggle("sn-on", shuffle !== "off");
      shuffleBadge.textContent = SHUFFLE_BADGES[shuffle] || "";
      setLabel(shuffleButton, SHUFFLE_LABELS[shuffle] || SHUFFLE_LABELS.on);
      const repeat = api.player.repeatMode();
      repeatButton.classList.toggle("sn-on", repeat !== "off");
      repeatBadge.hidden = repeat !== "track";
      setLabel(repeatButton, REPEAT_LABELS[repeat]);
    }

    const addButton = iconButton(ICONS.add, "Añadir a playlist", function () {
      const track = session.track();
      if (track) openPlaylistPicker(track);
    });
    const likeButton = iconButton(ICONS.heart, "Guardar en Canciones que te gustan", function () {
      const track = session.track();
      if (!track) return;
      const want = !saved;
      paintSaved(want);
      act("Canciones que te gustan", api.player.setSaved(track.uri, want).catch(function (err) {
        paintSaved(!want);
        throw err;
      }));
    });
    likeButton.classList.add("sn-fs-like");
    const tagButton = iconButton(ICONS.tag, "Marcar la canción", function () {
      const track = session.track();
      const picker = tagPicker();
      if (track && picker) picker([track.uri], function () { overlay.focus(); });
    });
    tagButton.hidden = !tagPicker();

    function paintSaved(value) {
      saved = Boolean(value);
      likeButton.classList.toggle("sn-on", saved);
      setIcon(likeButton, saved ? ICONS.heartOn : ICONS.heart, 20);
      setLabel(likeButton, saved ? "Quitar de Canciones que te gustan" : "Guardar en Canciones que te gustan");
    }

    function refreshSaved(track) {
      const mine = (savedSeq += 1);
      paintSaved(false);
      if (!track) return;
      api.player.isSaved(track.uri).then(function (value) {
        if (mine === savedSeq && !closed) paintSaved(value);
      }).catch(function (err) { console.warn("[Sinton:" + ID + "] estado de me gusta", err); });
    }

    function refreshColor(track) {
      const mine = (colorSeq += 1);
      sampleColor(track && track.image).then(function (rgb) {
        if (mine !== colorSeq || closed) return;
        const tint = logic.brighten(rgb);
        overlay.style.setProperty("--sn-fs-tint", "rgb(" + tint.join(",") + ")");
      });
    }

    function showBackground(url, blurred) {
      const key = url + "|" + blurred;
      if (key === shownBackground) return;
      shownBackground = key;
      const mine = (backgroundSeq += 1);
      function apply(finalUrl) {
        if (closed || mine !== backgroundSeq) return;
        const next = layers[1 - activeLayer];
        next.style.backgroundImage = finalUrl ? 'url("' + finalUrl.replace(/"/g, "%22") + '")' : "";
        next.classList.toggle("sn-fs-blur", blurred);
        next.classList.add("sn-fs-on");
        layers[activeLayer].classList.remove("sn-fs-on");
        activeLayer = 1 - activeLayer;
      }
      if (!url) return apply("");
      api.images.best(url).then(function (found) { apply(found ? found.url : url); }).catch(function () { apply(url); });
    }

    function refreshBackground(track) {
      if (!track) return showBackground("", true);
      const mode = settings.background;
      const artistUri = track.artists[0] && track.artists[0].uri;
      if (mode !== "artist" || api.uri.type(artistUri) !== "artist") {
        const picked = logic.pickBackground(mode === "artist" ? "blur" : mode, { cover: track.image });
        return showBackground(picked.url, picked.blurred);
      }
      const uri = track.uri;
      api.data.artistVisuals(artistUri).catch(function (err) {
        console.warn("[Sinton:" + ID + "] imágenes del artista", err);
        return {};
      }).then(function (visuals) {
        const now = session.track();
        if (closed || !now || now.uri !== uri || settings.background !== "artist") return;
        const picked = logic.pickBackground("artist", { header: visuals.header, avatar: visuals.avatar, cover: track.image });
        showBackground(picked.url, picked.blurred);
      });
    }

    const backgroundButton = textButton("", "Cambiar el fondo (B)", cycleBackground);
    const lyricsButton = textButton("", "Mostrar u ocultar la letra (L)", toggleLyrics);
    const discButton = textButton("", "Vinilo o portada (V)", cycleDisc);
    const queueButton = textButton("Cola", "Mostrar u ocultar la cola (Q)", toggleQueue);
    const qpanel = el("aside", "sn-fs-qpanel");
    qpanel.setAttribute("aria-label", "Cola de reproducción");
    const qlist = el("div", "sn-fs-qlist");
    qpanel.append(el("div", "sn-fs-qhead", "Cola"), qlist);
    let queueOpen = Boolean(settings.queue);

    function queueRow(item, now, hint) {
      const row = el("button", "sn-fs-qrow" + (now ? " sn-now" : ""));
      row.type = "button";
      row.title = now ? "Sonando ahora" : hint;
      const img = item.image ? document.createElement("img") : el("span", "sn-fs-qnoimg");
      if (item.image) {
        img.alt = "";
        img.loading = "lazy";
        img.src = item.image;
      }
      const text = el("span", "sn-fs-qtext");
      text.append(el("b", "", item.name || "Sin título"), el("small", "", item.artists));
      row.append(img, text);
      if (!now) {
        row.addEventListener("click", function () {
          act("Reproducir de la cola", api.player.moveToTop(item.uri, item.uid).then(function () { return api.player.next(); }));
        });
        const up = el("span", "sn-fs-qtop");
        up.title = "Subir al principio de la cola";
        up.setAttribute("role", "button");
        up.append(api.ui.icon(UP_ICON, 14));
        up.addEventListener("click", function (event) {
          event.stopPropagation();
          act("Subir en la cola", api.player.moveToTop(item.uri, item.uid).then(function () { setTimeout(paintQueue, 150); }));
        });
        row.append(up);
      } else {
        row.append(el("span"));
      }
      return row;
    }

    function paintQueue() {
      if (closed || !queueOpen) return;
      qlist.textContent = "";
      const now = session && session.track();
      if (now) qlist.append(el("p", "sn-fs-qlabel", "Sonando ahora"), queueRow({ name: now.name, artists: now.artists.map(function (a) { return a.name; }).join(", "), image: now.image }, true, ""));
      const items = api.player.queueView(QUEUE_ROWS);
      if (items.length === 0) {
        qlist.append(el("p", "sn-fs-qempty", "La cola está vacía."));
        return;
      }
      const queued = items.filter(function (item) { return item.queued; });
      const next = items.filter(function (item) { return !item.queued; });
      if (queued.length > 0) qlist.append(el("p", "sn-fs-qlabel", "En la cola"));
      queued.forEach(function (item) { qlist.append(queueRow(item, false, "Reproducir ahora")); });
      if (next.length > 0) qlist.append(el("p", "sn-fs-qlabel", "A continuación"));
      next.forEach(function (item) { qlist.append(queueRow(item, false, "Reproducir ahora")); });
    }

    function paintQueueState() {
      overlay.classList.toggle("sn-fs-queue-on", queueOpen);
      queueButton.textContent = queueOpen ? "Cola: sí" : "Cola";
      if (queueOpen) paintQueue();
    }

    function toggleQueue() {
      queueOpen = !queueOpen;
      settings.queue = queueOpen;
      saveSettings();
      paintQueueState();
    }

    // Sin letra (por ajuste o porque esta canción no tiene) se usa la vista centrada; lo segundo
    // solo afecta a la canción actual y se reinicia al cambiar de canción.
    function paintOptions() {
      backgroundButton.textContent = "Fondo: " + logic.backgroundLabel(settings.background);
      lyricsButton.textContent = !settings.lyrics ? "Letra: no" : lyricsMissing ? "Letra: no disponible" : "Letra: sí";
      discButton.textContent = settings.disc === "vinyl" ? "Disco: vinilo" : "Disco: portada";
      overlay.classList.toggle("sn-fs-nolyrics", !settings.lyrics || lyricsMissing);
      overlay.classList.toggle("sn-fs-vinyl", settings.disc === "vinyl");
    }

    function cycleDisc() {
      settings.disc = logic.nextDisc(settings.disc);
      saveSettings();
      paintOptions();
    }

    function cycleBackground() {
      settings.background = logic.nextBackground(settings.background);
      saveSettings();
      paintOptions();
      refreshBackground(session.track());
    }

    function toggleLyrics() {
      settings.lyrics = !settings.lyrics;
      saveSettings();
      paintOptions();
    }

    function seekBy(direction) {
      const track = session.track();
      if (!track) return;
      act("Avanzar", api.player.seek(logic.seekTarget(api.player.position(), track.duration, direction)));
    }

    bar.addEventListener("click", function (event) {
      const track = session.track();
      if (!track || !track.duration) return;
      const rect = bar.getBoundingClientRect();
      act("Avanzar", api.player.seek(logic.fraction(event.clientX, rect.left, rect.width) * track.duration));
    });

    function wake() {
      overlay.classList.remove("sn-fs-idle");
      if (idleTimer) root.clearTimeout(idleTimer);
      idleTimer = root.setTimeout(function () { overlay.classList.add("sn-fs-idle"); }, IDLE_MS);
    }

    function onKey(event) {
      if (document.querySelector(".sn-overlay") || event.ctrlKey || event.metaKey || event.altKey) return;
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      const actions = {
        Escape: close,
        " ": function () { act("Reproducir o pausar", api.player.togglePlay()); },
        ArrowLeft: function () { seekBy(-1); },
        ArrowRight: function () { seekBy(1); },
        n: function () { act("Siguiente", api.player.next()); },
        p: function () { act("Anterior", api.player.previous()); },
        l: toggleLyrics,
        b: cycleBackground,
        v: cycleDisc,
        q: toggleQueue
      };
      if (!Object.prototype.hasOwnProperty.call(actions, key)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      wake();
      actions[key]();
    }

    function onFullscreenChange() {
      if (!document.fullscreenElement && nativeActive) close();
    }

    const top = el("div", "sn-fs-top");
    top.append(backgroundButton, lyricsButton, discButton, queueButton, textButton("Salir", "Salir (Esc)", close));
    const disc = el("div", "sn-fs-disc");
    const record = el("div", "sn-fs-record");
    const label = document.createElement("img");
    label.className = "sn-fs-label";
    label.alt = "";
    record.append(label, el("i", "sn-fs-hole"));
    disc.append(record);
    const info = el("div", "sn-fs-info");
    info.append(cover, disc, title, artist, album);
    const lyricsBox = el("div", "sn-fs-lyrics");
    lyricsBox.append(lyricsView.el);
    const main = el("div", "sn-fs-main");
    main.append(info, lyricsBox);
    const progress = el("div", "sn-fs-progress");
    progress.append(elapsed, bar, total);
    const controls = el("div", "sn-fs-controls");
    const left = el("div", "sn-fs-side");
    left.append(addButton, likeButton, tagButton);
    const center = el("div", "sn-fs-center");
    center.append(
      shuffleButton,
      iconButton(ICONS.prev, "Anterior (P)", function () { act("Anterior", api.player.previous()); }),
      playButton,
      iconButton(ICONS.next, "Siguiente (N)", function () { act("Siguiente", api.player.next()); }),
      repeatButton
    );
    controls.append(left, center, el("div", "sn-fs-side"));
    const bottom = el("div", "sn-fs-bottom");
    bottom.append(progress, controls);
    overlay.append(layers[0], layers[1], shade, top, main, qpanel, bottom);
    document.body.appendChild(overlay);
    paintOptions();

    const session = api.lyrics.follow({
      view: lyricsView,
      getOffset: lyricsOffset,
      onTrack: function (track, changed) {
        paintPlay(!track || track.isPaused);
        paintModes();
        if (!changed) return;
        setTimeout(paintQueue, 400);
        lyricsMissing = false;
        paintOptions();
        refreshSaved(track);
        refreshColor(track);
        label.hidden = !(track && track.image);
        if (track && track.image) label.src = track.image;
        title.textContent = track ? track.name : "Nada sonando";
        artist.textContent = track ? track.artists.map(function (a) { return a.name; }).join(", ") : "";
        album.textContent = track ? track.album : "";
        total.textContent = logic.formatTime(track ? track.duration : 0);
        cover.hidden = !(track && track.image);
        if (track && track.image) {
          cover.src = track.image;
          api.images.best(track.image).then(function (found) {
            const now = session.track();
            if (found && now && now.uri === track.uri && !closed) cover.src = found.url;
          }).catch(function () {});
        }
        lastSecond = -1;
        refreshBackground(track);
      },
      onResult: function (result) {
        lyricsMissing = !logic.hasLyrics(result);
        paintOptions();
      },
      onTick: function (position, track) {
        const second = Math.floor(position / 1000);
        if (second === lastSecond) return;
        lastSecond = second;
        elapsed.textContent = logic.formatTime(position);
        const ratio = track.duration > 0 ? Math.min(1, position / track.duration) : 0;
        fill.style.width = (ratio * 100).toFixed(2) + "%";
        bar.setAttribute("aria-valuenow", String(Math.round(ratio * 100)));
      }
    });

    paintQueueState();
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    overlay.addEventListener("mousemove", wake);
    wake();
    overlay.focus();
    // Se pide sobre el documento entero (no sobre la vista) para que avisos y diálogos sigan viéndose.
    const page = document.documentElement;
    if (settings.nativeFullscreen && !document.fullscreenElement && typeof page.requestFullscreen === "function") {
      page.requestFullscreen().then(function () {
        nativeActive = true;
        if (closed) leaveNative();
      }).catch(function (err) {
        console.warn("[Sinton:" + ID + "] pantalla completa nativa no disponible; se usa la ventana", err);
      });
    }

    function leaveNative() {
      if (!nativeActive) return;
      nativeActive = false;
      if (document.fullscreenElement && typeof document.exitFullscreen === "function") {
        document.exitFullscreen().catch(function () {});
      }
    }

    function close() {
      if (closed) return;
      closed = true;
      session.stop();
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      if (idleTimer) root.clearTimeout(idleTimer);
      leaveNative();
      overlay.remove();
      view = null;
      onToggle(false);
    }

    return { close: close };
  }

  function open() {
    if (view) return;
    view = build();
    onToggle(true);
  }

  function toggle() {
    if (view) view.close();
    else open();
  }

  function onShortcut(event) {
    if (event.altKey && !event.ctrlKey && !event.metaKey && event.key === "Enter" && !api.ui.isTyping(event)) {
      event.preventDefault();
      event.stopPropagation();
      toggle();
    }
  }

  function start(toggleListener) {
    onToggle = toggleListener || function () {};
    document.addEventListener("keydown", onShortcut, true);
  }

  function stop() {
    document.removeEventListener("keydown", onShortcut, true);
    if (view) view.close();
  }

  part.ui = { start: start, stop: stop, toggle: toggle };
})(window);

// Sinton core · reproductor: estado, posición y reproducción de listas arbitrarias.
(function (root) {
  "use strict";
  const core = (root.SintonCore = root.SintonCore || {});
  const IMAGE_RANK = { small: 0, standard: 1, large: 2, xlarge: 3 };
  const ORIGIN = { featureIdentifier: "sinton", referrerIdentifier: "sinton" };
  const QUEUE_CHUNK = 100;

  const listeners = new Set();
  let attached = false;

  function playerApi() {
    return core.platform.api("PlayerAPI");
  }

  function state() {
    const api = playerApi();
    try {
      return api && typeof api.getState === "function" ? api.getState() : null;
    } catch (err) {
      return null;
    }
  }

  function bestImage(images) {
    if (!Array.isArray(images) || images.length === 0) return "";
    let best = images[0];
    let bestRank = -1;
    for (const image of images) {
      const rank = image && image.label in IMAGE_RANK ? IMAGE_RANK[image.label] : -1;
      if (rank > bestRank) {
        best = image;
        bestRank = rank;
      }
    }
    return core.images.toUrl((best && best.url) || "");
  }

  function current() {
    const s = state();
    const item = s && s.item;
    if (!item || !item.uri) return null;
    const album = item.album || {};
    return {
      uri: item.uri,
      name: item.name || "",
      artists: (item.artists || []).map(function (a) { return { uri: a.uri || "", name: a.name || "" }; }),
      album: album.name || "",
      albumUri: album.uri || "",
      duration: (item.duration && item.duration.milliseconds) || s.duration || 0,
      image: bestImage(item.images && item.images.length ? item.images : album.images),
      isPaused: Boolean(s.isPaused)
    };
  }

  function position() {
    const s = state();
    if (!s) return 0;
    const base = s.positionAsOfTimestamp || 0;
    if (s.isPaused || s.isBuffering || s.hasContext === false) return base;
    const speed = typeof s.speed === "number" ? s.speed : 1;
    const value = base + (Date.now() - (s.timestamp || Date.now())) * speed;
    const duration = (s.duration) || (s.item && s.item.duration && s.item.duration.milliseconds) || Infinity;
    return Math.max(0, Math.min(value, duration));
  }

  function emit() {
    for (const listener of listeners) {
      try {
        listener(current());
      } catch (err) {
        console.error("[Sinton] oyente del reproductor", err);
      }
    }
  }

  function attach() {
    if (attached) return;
    const api = playerApi();
    const events = api && typeof api.getEvents === "function" ? api.getEvents() : null;
    if (!events || typeof events.addListener !== "function") return;
    events.addListener("update", emit);
    attached = true;
  }

  function onChange(listener) {
    listeners.add(listener);
    core.platform.ready().then(attach).catch(function () {});
    return function () {
      listeners.delete(listener);
    };
  }

  async function call(method, args) {
    const api = core.platform.requireApi("PlayerAPI");
    if (typeof api[method] !== "function") throw new Error("PlayerAPI." + method + " no disponible.");
    return api[method].apply(api, args || []);
  }

  function togglePlay() {
    const s = state();
    return call(s && s.isPaused ? "resume" : "pause");
  }

  function seek(ms) {
    return call("seekTo", [Math.max(0, Math.round(ms))]);
  }

  async function playViaPages(uris) {
    const api = core.platform.requireApi("PlayerAPI");
    const items = uris.map(function (uri) { return { uri: uri, uid: "", metadata: {}, provider: "context" }; });
    await api.play({ uri: uris[0], pages: [{ items: items }] }, ORIGIN, {});
  }

  async function playViaAddToQueue(uris) {
    const api = core.platform.requireApi("PlayerAPI");
    await api.play({ uri: uris[0] }, ORIGIN, {});
    for (let i = 1; i < uris.length; i += QUEUE_CHUNK) {
      await api.addToQueue(uris.slice(i, i + QUEUE_CHUNK).map(function (uri) { return { uri: uri }; }));
    }
  }

  async function playTracks(uris, contextUri) {
    const list = (uris || []).filter(function (uri) { return typeof uri === "string" && uri; });
    if (list.length === 0) throw new Error("No hay canciones que reproducir.");
    const strategies = [playViaPages, playViaAddToQueue];
    let lastError = null;
    for (const strategy of strategies) {
      try {
        await strategy(list, contextUri);
        return;
      } catch (err) {
        lastError = err;
        console.warn("[Sinton] estrategia de reproducción fallida:", strategy.name, err);
      }
    }
    throw lastError || new Error("No se pudo iniciar la reproducción.");
  }

  async function addToQueue(uris) {
    const api = core.platform.requireApi("PlayerAPI");
    for (let i = 0; i < uris.length; i += QUEUE_CHUNK) {
      await api.addToQueue(uris.slice(i, i + QUEUE_CHUNK).map(function (uri) { return { uri: uri }; }));
    }
  }

  // ----- Aleatorio y repetición -----
  const SHUFFLE = { OFF: 0, ON: 1, SMART: 2 };
  const REPEAT = { OFF: 0, CONTEXT: 1, TRACK: 2 };

  function shuffleMode() {
    const s = state();
    if (!s) return "off";
    if (s.smartShuffle) return "smart";
    return s.shuffle ? "on" : "off";
  }

  // Usa ShuffleAPI (que también apaga el modo inteligente) y, si no existe, PlayerAPI.setShuffle.
  async function setShuffle(on) {
    const s = state();
    const contextUri = s && s.context && s.context.uri;
    const shuffleApi = core.platform.api("ShuffleAPI");
    if (contextUri && shuffleApi && typeof shuffleApi.setShuffle === "function") {
      try {
        await shuffleApi.setShuffle(contextUri, on ? SHUFFLE.ON : SHUFFLE.OFF);
        return;
      } catch (err) {
        console.warn("[Sinton] ShuffleAPI.setShuffle falló, uso PlayerAPI", err);
      }
    }
    await call("setShuffle", [Boolean(on)]);
  }

  // Pasa al siguiente modo del botón de Spotify: apagado → aleatorio → inteligente → apagado.
  async function cycleShuffle() {
    const s = state();
    const contextUri = s && s.context && s.context.uri;
    const shuffleApi = core.platform.api("ShuffleAPI");
    const mode = shuffleMode();
    if (contextUri && shuffleApi && typeof shuffleApi.setShuffle === "function") {
      const next = mode === "off" ? SHUFFLE.ON : mode === "on" ? SHUFFLE.SMART : SHUFFLE.OFF;
      await shuffleApi.setShuffle(contextUri, next);
      return;
    }
    await call("setShuffle", [mode === "off"]);
  }

  function repeatMode() {
    const s = state();
    const value = s && typeof s.repeat === "number" ? s.repeat : 0;
    return value === REPEAT.TRACK ? "track" : value === REPEAT.CONTEXT ? "context" : "off";
  }

  function cycleRepeat() {
    const next = { off: REPEAT.CONTEXT, context: REPEAT.TRACK, track: REPEAT.OFF }[repeatMode()];
    return call("setRepeat", [next]);
  }

  // ----- Cola -----
  function queueItems() {
    const api = playerApi();
    const queue = api && typeof api.getQueue === "function" ? api.getQueue() : null;
    if (!queue) return { queued: [], nextUp: [] };
    return { queued: (queue.queued || []).slice(), nextUp: (queue.nextUp || []).slice() };
  }

  // Elemento de la cola con nombre, artistas e imagen, sea cual sea la forma que devuelva Spotify.
  function describeItem(item) {
    const meta = (item && item.metadata) || (item && item.contextTrack && item.contextTrack.metadata) || {};
    const artists = Array.isArray(item.artists) && item.artists.length > 0
      ? item.artists.map(function (a) { return a.name || ""; }).filter(Boolean).join(", ")
      : meta.artist_name || "";
    const album = item.album || {};
    const image = bestImage(item.images && item.images.length ? item.images : album.images) || core.images.toUrl(meta.image_url || meta.image_small_url || "");
    return { uri: item.uri || "", uid: item.uid || "", name: item.name || meta.title || "", artists: artists, image: image, queued: item.provider === "queue" };
  }

  function queueView(limit) {
    const items = queueItems();
    const max = limit || 50;
    return items.queued.concat(items.nextUp).filter(function (item) { return item && item.uri; }).slice(0, max).map(describeItem);
  }

  function sameItem(a, b) {
    if (!a || !b) return false;
    if (a.uid && b.uid) return a.uid === b.uid;
    return a.uri === b.uri;
  }

  // Sube una canción al primer puesto de la cola. Si no está en la cola, la mete como siguiente.
  async function moveToTop(uri, uid) {
    const api = core.platform.requireApi("PlayerAPI");
    const items = queueItems();
    const list = items.queued.concat(items.nextUp);
    const first = list[0] || null;
    const wanted = { uri: uri, uid: uid || "" };
    const found = list.find(function (item) { return uid ? sameItem(item, wanted) : item.uri === uri; }) || null;
    if (found && first && sameItem(found, first)) return "first";
    if (found && first && typeof api.reorderQueue === "function") {
      await api.reorderQueue([{ uri: found.uri, uid: found.uid }], { before: { uri: first.uri, uid: first.uid } });
      return "moved";
    }
    if (typeof api.playAsNextInQueue === "function") {
      await api.playAsNextInQueue([{ uri: uri }]);
      return "added";
    }
    await api.addToQueue([{ uri: uri }]);
    const after = queueItems();
    const added = after.queued[after.queued.length - 1];
    const head = after.queued[0];
    if (added && head && !sameItem(added, head) && typeof api.reorderQueue === "function") {
      await api.reorderQueue([{ uri: added.uri, uid: added.uid }], { before: { uri: head.uri, uid: head.uid } });
    }
    return "added";
  }

  // Reproduce un contexto (playlist, álbum...) empezando por una canción; respeta el aleatorio que esté puesto.
  async function playContext(contextUri, trackUri) {
    const api = core.platform.requireApi("PlayerAPI");
    const context = { uri: contextUri };
    if (trackUri) {
      try {
        await api.play(context, ORIGIN, { skipTo: { trackUri: trackUri } });
        return;
      } catch (err) {
        console.warn("[Sinton] reproducir desde una canción falló, empiezo desde el principio", err);
      }
    }
    await api.play(context, ORIGIN, {});
  }

  async function isSaved(uri) {
    const library = core.platform.requireApi("LibraryAPI");
    const result = await library.contains(uri);
    return Array.isArray(result) ? Boolean(result[0]) : Boolean(result);
  }

  async function setSaved(uri, saved) {
    const library = core.platform.requireApi("LibraryAPI");
    if (saved) await library.add({ uris: [uri] });
    else await library.remove({ uris: [uri] });
  }

  core.player = {
    shuffleMode: shuffleMode,
    setShuffle: setShuffle,
    cycleShuffle: cycleShuffle,
    repeatMode: repeatMode,
    cycleRepeat: cycleRepeat,
    queue: queueItems,
    queueView: queueView,
    moveToTop: moveToTop,
    playContext: playContext,
    isSaved: isSaved,
    setSaved: setSaved,
    state: state,
    current: current,
    position: position,
    onChange: onChange,
    togglePlay: togglePlay,
    next: function () { return call("skipToNext"); },
    previous: function () { return call("skipToPrevious"); },
    seek: seek,
    playTracks: playTracks,
    addToQueue: addToQueue
  };
})(typeof window !== "undefined" ? window : globalThis);

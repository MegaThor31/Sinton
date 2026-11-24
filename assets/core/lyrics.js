// Sinton core · letras: Spotify + LRCLIB, caché y vista sincronizada reutilizable.
(function (root) {
  "use strict";
  const core = (root.SintonCore = root.SintonCore || {});
  const SPOTIFY_URL = "https://spclient.wg.spotify.com/color-lyrics/v2/track/";
  const LRCLIB_URL = "https://lrclib.net/api";
  const CACHE_KEY = "sinton:lyrics:v1";
  const CACHE_MAX = 120;
  const DURATION_TOLERANCE_S = 4;
  const REQUEST_TIMEOUT_MS = 12000;
  const TIME_TAG_RE = /\[(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g;
  const OFFSET_RE = /^\[offset:\s*([+-]?\d+)\s*\]$/i;

  // ----- Lógica pura -----
  function parseLrc(text) {
    const lines = [];
    let offset = 0;
    for (const raw of String(text || "").split(/\r?\n/)) {
      const line = raw.trim();
      if (!line) continue;
      const offsetMatch = OFFSET_RE.exec(line);
      if (offsetMatch) {
        offset = Number(offsetMatch[1]) || 0;
        continue;
      }
      const times = [];
      TIME_TAG_RE.lastIndex = 0;
      let match = TIME_TAG_RE.exec(line);
      let end = 0;
      while (match && match.index === end) {
        const fraction = match[3] ? Number(match[3].padEnd(3, "0").slice(0, 3)) : 0;
        times.push(Number(match[1]) * 60000 + Number(match[2]) * 1000 + fraction);
        end = TIME_TAG_RE.lastIndex;
        match = TIME_TAG_RE.exec(line);
      }
      if (times.length === 0) continue;
      const content = line.slice(end).replace(/<\d{1,3}:\d{1,2}(?:[.:]\d{1,3})?>/g, "").trim();
      for (const time of times) lines.push({ time: Math.max(0, time - offset), text: content });
    }
    lines.sort(function (a, b) { return a.time - b.time; });
    return lines;
  }

  function parsePlain(text) {
    return String(text || "").split(/\r?\n/).map(function (line) {
      return { time: null, text: line.trim() };
    });
  }

  // Índice de la línea activa para una posición (búsqueda binaria); -1 si aún no empieza.
  function activeIndex(lines, positionMs) {
    let low = 0;
    let high = lines.length - 1;
    let answer = -1;
    while (low <= high) {
      const mid = (low + high) >> 1;
      if (lines[mid].time <= positionMs) {
        answer = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    return answer;
  }

  function fromSpotify(body) {
    const lyrics = body && body.lyrics;
    if (!lyrics || !Array.isArray(lyrics.lines) || lyrics.lines.length === 0) return null;
    const synced = lyrics.syncType === "LINE_SYNCED" || lyrics.syncType === "SYLLABLE_SYNCED";
    const lines = lyrics.lines.map(function (line) {
      return { time: synced ? Number(line.startTimeMs) || 0 : null, text: String(line.words || "").trim() };
    });
    return { synced: synced, lines: lines, provider: "Spotify" + (lyrics.providerDisplayName ? " · " + lyrics.providerDisplayName : "") };
  }

  function fromLrclib(entry) {
    if (!entry) return null;
    if (entry.instrumental) return { synced: false, lines: [], instrumental: true, provider: "LRCLIB" };
    if (entry.syncedLyrics) {
      const lines = parseLrc(entry.syncedLyrics);
      if (lines.length > 0) return { synced: true, lines: lines, provider: "LRCLIB" };
    }
    if (entry.plainLyrics) return { synced: false, lines: parsePlain(entry.plainLyrics), provider: "LRCLIB" };
    return null;
  }

  // Elige el mejor resultado de una búsqueda: duración parecida y, si puede ser, sincronizado.
  function pickSearchResult(results, durationMs) {
    if (!Array.isArray(results)) return null;
    const seconds = durationMs / 1000;
    let bestEntry = null;
    let bestScore = Infinity;
    for (const entry of results) {
      if (!entry || (!entry.syncedLyrics && !entry.plainLyrics)) continue;
      const diff = seconds > 0 && entry.duration ? Math.abs(entry.duration - seconds) : 0;
      if (diff > DURATION_TOLERANCE_S) continue;
      const score = diff + (entry.syncedLyrics ? 0 : 100);
      if (score < bestScore) {
        bestScore = score;
        bestEntry = entry;
      }
    }
    return bestEntry;
  }

  // Sincronizada gana a no sincronizada; a igualdad, gana Spotify.
  function choose(spotify, lrclib) {
    if (spotify && spotify.synced) return spotify;
    if (lrclib && lrclib.synced) return lrclib;
    return spotify || lrclib || null;
  }

  // ----- Red -----
  async function fetchJson(url, headers) {
    const controller = new AbortController();
    const timer = root.setTimeout(function () { controller.abort(); }, REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(url, { headers: headers || {}, signal: controller.signal });
      if (response.status === 404) return null;
      if (!response.ok) throw new Error("HTTP " + response.status);
      return await response.json();
    } finally {
      root.clearTimeout(timer);
    }
  }

  async function spotifyLyrics(track) {
    if (!/^spotify:track:/.test(track.uri)) return null;
    const token = await core.platform.token();
    const url = SPOTIFY_URL + encodeURIComponent(core.uri.id(track.uri)) + "?format=json&vocalRemoval=false&market=from_token";
    return fromSpotify(await fetchJson(url, { Authorization: "Bearer " + token, "app-platform": "WebPlayer", Accept: "application/json" }));
  }

  function query(params) {
    return Object.keys(params).filter(function (key) { return params[key] !== "" && params[key] != null; })
      .map(function (key) { return key + "=" + encodeURIComponent(params[key]); }).join("&");
  }

  async function lrclibLyrics(track) {
    const artist = (track.artists[0] && track.artists[0].name) || "";
    if (!track.name || !artist) return null;
    const exact = await fetchJson(LRCLIB_URL + "/get?" + query({
      track_name: track.name,
      artist_name: artist,
      album_name: track.album,
      duration: track.duration ? Math.round(track.duration / 1000) : ""
    }));
    const direct = fromLrclib(exact);
    if (direct && (direct.synced || direct.instrumental)) return direct;
    const results = await fetchJson(LRCLIB_URL + "/search?" + query({ track_name: track.name, artist_name: artist }));
    return fromLrclib(pickSearchResult(results, track.duration)) || direct;
  }

  // ----- Caché -----
  const memory = new Map();

  function readCache() {
    try {
      const raw = JSON.parse(root.localStorage.getItem(CACHE_KEY) || "{}");
      return raw && typeof raw === "object" && Array.isArray(raw.order) && raw.items ? raw : { order: [], items: {} };
    } catch (err) {
      return { order: [], items: {} };
    }
  }

  function writeCache(uri, value) {
    try {
      const cache = readCache();
      cache.order = cache.order.filter(function (key) { return key !== uri; });
      cache.order.push(uri);
      cache.items[uri] = value;
      while (cache.order.length > CACHE_MAX) delete cache.items[cache.order.shift()];
      root.localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch (err) {
      console.warn("[Sinton] no se pudo guardar la letra en caché", err);
    }
  }

  async function load(track) {
    const settled = await Promise.allSettled([spotifyLyrics(track), lrclibLyrics(track)]);
    const spotify = settled[0].status === "fulfilled" ? settled[0].value : null;
    const lrclib = settled[1].status === "fulfilled" ? settled[1].value : null;
    const picked = choose(spotify, lrclib);
    if (picked) return Object.assign({ uri: track.uri, found: true }, picked);
    const failed = settled.every(function (item) { return item.status === "rejected"; });
    return { uri: track.uri, found: false, synced: false, lines: [], provider: "", error: failed };
  }

  // track: { uri, name, artists:[{name}], album, duration }
  function get(track, options) {
    const force = Boolean(options && options.force);
    if (!force && memory.has(track.uri)) return memory.get(track.uri);
    if (!force) {
      const cached = readCache().items[track.uri];
      if (cached && cached.found) {
        const hit = Promise.resolve(cached);
        memory.set(track.uri, hit);
        return hit;
      }
    }
    const pending = load(track).then(function (result) {
      if (result.found) writeCache(track.uri, result);
      else if (result.error) memory.delete(track.uri);
      return result;
    });
    memory.set(track.uri, pending);
    return pending;
  }

  // ----- Vista sincronizada -----
  const USER_SCROLL_PAUSE_MS = 3500;

  function createView(options) {
    const onSeek = options && options.onSeek;
    const el = document.createElement("div");
    el.className = "sn-ly";
    let lines = [];
    let nodes = [];
    let synced = false;
    let active = -2;
    let pausedUntil = 0;

    function pauseAutoScroll() {
      pausedUntil = Date.now() + USER_SCROLL_PAUSE_MS;
    }
    el.addEventListener("wheel", pauseAutoScroll, { passive: true });
    el.addEventListener("touchmove", pauseAutoScroll, { passive: true });

    function message(text, detail) {
      el.textContent = "";
      const box = document.createElement("div");
      box.className = "sn-ly-msg";
      const title = document.createElement("p");
      title.textContent = text;
      box.append(title);
      if (detail) {
        const sub = document.createElement("small");
        sub.textContent = detail;
        box.append(sub);
      }
      el.append(box);
      lines = [];
      nodes = [];
      active = -2;
    }

    function set(result) {
      el.scrollTop = 0;
      if (result === "loading") return message("Buscando letra…");
      if (!result || !result.found) {
        return message("No se ha encontrado letra", result && result.error ? "Fallo de red. Vuelve a intentarlo." : "Ni Spotify ni LRCLIB la tienen.");
      }
      if (result.instrumental) return message("♪ Instrumental ♪");
      el.textContent = "";
      lines = result.lines;
      synced = Boolean(result.synced);
      active = -2;
      el.classList.toggle("sn-ly-static", !synced);
      nodes = lines.map(function (line, index) {
        const node = document.createElement("p");
        node.className = "sn-ly-line";
        node.textContent = line.text || (synced ? "♪" : "\u00a0");
        if (synced && onSeek) {
          node.addEventListener("click", function () { onSeek(lines[index].time); });
        }
        return node;
      });
      const pad = function () {
        const spacer = document.createElement("div");
        spacer.className = "sn-ly-pad";
        return spacer;
      };
      el.append(pad());
      nodes.forEach(function (node) { el.append(node); });
      el.append(pad());
    }

    function tick(positionMs) {
      if (!synced || nodes.length === 0) return;
      const index = activeIndex(lines, positionMs);
      if (index === active) return;
      active = index;
      nodes.forEach(function (node, i) {
        node.classList.toggle("sn-ly-active", i === index);
        node.classList.toggle("sn-ly-past", i < index);
      });
      if (Date.now() < pausedUntil) return;
      const target = nodes[Math.max(index, 0)];
      const top = target.offsetTop - el.clientHeight / 2 + target.offsetHeight / 2;
      el.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    }

    return { el: el, set: set, tick: tick, message: message, isSynced: function () { return synced; } };
  }

  // Mantiene una vista al día con la canción que suena: carga su letra y la sincroniza.
  // options: { view, getOffset(uri) -> ms, onTrack(track|null, changed), onResult(result, track), onTick(positionMs, track) }
  function follow(options) {
    const view = options.view;
    let track = null;
    let sequence = 0;
    let frame = null;
    let stopped = false;

    function loadLyrics(force) {
      if (!track) return;
      const mine = (sequence += 1);
      const target = track;
      view.set("loading");
      get(target, { force: force }).then(function (result) {
        if (stopped || mine !== sequence) return;
        view.set(result);
        if (options.onResult) options.onResult(result, target);
      }).catch(function (err) {
        console.error("[Sinton] letra", err);
        if (stopped || mine !== sequence) return;
        const failed = { uri: target.uri, found: false, error: true, lines: [] };
        view.set(failed);
        if (options.onResult) options.onResult(failed, target);
      });
    }

    function sync(current) {
      if (stopped) return;
      const next = current || core.player.current();
      const changed = (next ? next.uri : null) !== (track ? track.uri : null);
      track = next;
      if (options.onTrack) options.onTrack(track, changed);
      if (!changed) return;
      if (!track) {
        sequence += 1;
        view.message("No hay nada sonando");
        return;
      }
      loadLyrics(false);
    }

    function loop() {
      if (stopped) return;
      if (track) {
        const position = core.player.position();
        view.tick(position + (options.getOffset ? options.getOffset(track.uri) : 0));
        if (options.onTick) options.onTick(position, track);
      }
      frame = root.requestAnimationFrame(loop);
    }

    const off = core.player.onChange(sync);
    view.message("No hay nada sonando");
    sync(core.player.current());
    frame = root.requestAnimationFrame(loop);

    return {
      reload: function () { loadLyrics(true); },
      track: function () { return track; },
      stop: function () {
        stopped = true;
        off();
        if (frame) root.cancelAnimationFrame(frame);
      }
    };
  }

  core.lyrics = {
    get: get,
    createView: createView,
    follow: follow,
    parseLrc: parseLrc,
    parsePlain: parsePlain,
    activeIndex: activeIndex,
    pickSearchResult: pickSearchResult,
    choose: choose,
    fromSpotify: fromSpotify,
    fromLrclib: fromLrclib
  };
})(typeof window !== "undefined" ? window : globalThis);

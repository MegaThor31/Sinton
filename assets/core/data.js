// Sinton core · datos: imágenes, GraphQL interno y acceso a discografías, playlists y biblioteca.
(function (root) {
  "use strict";
  const core = (root.SintonCore = root.SintonCore || {});

  // ----- Imágenes -----
  const IMAGE_RE = /^(?:https:\/\/(?:i\.scdn\.co|image-cdn-[^.]+\.spotifycdn\.com)\/image\/|spotify:image:)([0-9a-f]{8})([0-9a-f]{8})([0-9a-f]+)$/i;
  const IMAGE_HOST = "https://i.scdn.co/image/";
  // Códigos de tamaño por familia de imagen, de mayor a menor (extraídos del cliente de Spotify).
  const IMAGE_SIZES = {
    ab67616d: ["000082c1", "0000b273", "00001e02"],
    ab67706c: ["0000bebb", "0000da84"],
    ab676161: ["0000e5eb", "00005174"],
    ab676167: ["000082e8", "0000e911", "0000ecd4"],
    ab67706f: ["00000004", "00000003", "00000002"],
    ab677269: ["0000c46c", "0000dd22"],
    ab676563: ["0000ba8a", "00005f1f"],
    ab676663: ["000022a8", "0000db5b"]
  };

  function toUrl(value) {
    if (typeof value !== "string" || !value) return "";
    if (value.startsWith("spotify:image:")) return IMAGE_HOST + value.slice("spotify:image:".length);
    if (value.startsWith("spotify:mosaic:")) {
      return "https://mosaic.scdn.co/300/" + value.slice("spotify:mosaic:".length).split(":").join("");
    }
    return /^https?:\/\//.test(value) ? value : "";
  }

  // Devuelve las URL candidatas de la misma imagen, de mayor a menor resolución.
  function candidates(value) {
    const url = toUrl(value);
    if (!url) return [];
    const match = IMAGE_RE.exec(url);
    if (!match) return [url];
    const family = match[1].toLowerCase();
    const sizes = IMAGE_SIZES[family];
    if (!sizes) return [url];
    const list = sizes.map(function (size) { return IMAGE_HOST + family + size + match[3]; });
    const original = IMAGE_HOST + family + match[2] + match[3];
    if (!list.includes(original)) list.push(original);
    return list;
  }

  function probe(url, timeoutMs) {
    return new Promise(function (resolve) {
      const img = new Image();
      const timer = root.setTimeout(function () { finish(false); }, timeoutMs);
      function finish(ok) {
        root.clearTimeout(timer);
        img.onload = img.onerror = null;
        resolve(ok ? { url: url, width: img.naturalWidth, height: img.naturalHeight } : null);
      }
      img.onload = function () { finish(img.naturalWidth > 0); };
      img.onerror = function () { finish(false); };
      img.src = url;
    });
  }

  // Primera candidata que realmente carga (la mayor disponible).
  async function best(value) {
    for (const url of candidates(value)) {
      const result = await probe(url, 8000);
      if (result) return result;
    }
    return null;
  }

  function largestSource(sources) {
    if (!Array.isArray(sources) || sources.length === 0) return "";
    let pick = sources[0];
    for (const source of sources) {
      const size = (source && (source.width || source.maxWidth)) || 0;
      const pickSize = (pick && (pick.width || pick.maxWidth)) || 0;
      if (size > pickSize) pick = source;
    }
    return toUrl((pick && pick.url) || "");
  }

  core.images = { toUrl: toUrl, candidates: candidates, best: best, largestSource: largestSource };

  // ----- GraphQL interno (consultas persistidas) -----
  const HASHES = {
    queryArtistDiscographyAll: ["5e07d323febb57b4a56a42abbf781490e58764aa45feb6e3dc0591564fc56599"],
    queryArtistAppearsOn: ["9a4bb7a20d6720fe52d7b47bc001cfa91940ddf5e7113761460b4a288d18a4c1"],
    queryArtistOverview: [
      "1ac33ddab5d39a3a9c27802774e6d78b9405cc188c6f75aed007df2a32737c72",
      "9f8134ef565e78621f1e1793555bd6633c5ac144ae0f89604ed3ae3f80b3c8e6"
    ],
    getAlbum: ["0b6ce3511e1b02e4a40fa95440f992acbe85080eb308af9194322d708fc1914f"],
    getTrack: ["fe16b8083eec2305854db612ca75589bcb71e009dc7a4d014f29bd534a4c01f5"]
  };
  const CHUNK_GLOBALS = ["rspackChunk", "webpackChunkclient_web", "webpackChunkopen"];
  const DEFINITION_RE = /"([A-Za-z0-9_]+)","(?:query|mutation)","([0-9a-f]{64})"/g;
  let discovered = null;

  // Lee del propio cliente los hashes vigentes, por si los de arriba dejan de valer en otra versión.
  function discoverHashes() {
    if (discovered) return discovered;
    discovered = {};
    try {
      let requireFn = null;
      for (const name of CHUNK_GLOBALS) {
        const chunks = root[name];
        if (!chunks || typeof chunks.push !== "function") continue;
        chunks.push([[Symbol("sinton")], {}, function (req) { requireFn = req; }]);
        if (requireFn) break;
      }
      const modules = requireFn && requireFn.m;
      if (modules) {
        for (const key of Object.keys(modules)) {
          const source = Function.prototype.toString.call(modules[key]);
          if (source.indexOf('"query"') === -1) continue;
          DEFINITION_RE.lastIndex = 0;
          let match = DEFINITION_RE.exec(source);
          while (match) {
            (discovered[match[1]] = discovered[match[1]] || []).push(match[2]);
            match = DEFINITION_RE.exec(source);
          }
        }
      }
    } catch (err) {
      console.warn("[Sinton] no se pudieron leer los hashes de GraphQL", err);
    }
    return discovered;
  }

  async function runQuery(loader, name, hash, variables) {
    const response = await loader({ name: name, operation: "query", sha256Hash: hash, value: null }, variables);
    if (!response || !response.data) {
      const detail = response && response.errors && response.errors[0] && response.errors[0].message;
      throw new Error(detail || "Respuesta vacía de " + name);
    }
    return response.data;
  }

  async function gql(name, variables) {
    const platform = await core.platform.ready();
    const loader = typeof platform.getGraphQLLoader === "function" ? platform.getGraphQLLoader() : core.platform.api("GraphQLLoader");
    if (typeof loader !== "function") throw new Error("GraphQL de Spotify no disponible.");
    let lastError = null;
    const tried = new Set();
    for (const source of [function () { return HASHES[name] || []; }, function () { return discoverHashes()[name] || []; }]) {
      for (const hash of source()) {
        if (tried.has(hash)) continue;
        tried.add(hash);
        try {
          return await runQuery(loader, name, hash, variables);
        } catch (err) {
          lastError = err;
        }
      }
    }
    throw lastError || new Error("Consulta desconocida: " + name);
  }

  // ----- Utilidades -----
  async function pool(items, limit, worker) {
    const results = new Array(items.length);
    let next = 0;
    async function run() {
      while (next < items.length) {
        const index = next;
        next += 1;
        results[index] = await worker(items[index], index);
      }
    }
    const runners = [];
    for (let i = 0; i < Math.min(limit, items.length); i += 1) runners.push(run());
    await Promise.all(runners);
    return results;
  }

  function releaseFrom(node, group) {
    if (!node) return null;
    const uri = node.uri || (node.id ? "spotify:album:" + node.id : "");
    if (!uri) return null;
    const date = node.date || {};
    return {
      uri: uri,
      name: node.name || "",
      type: String(node.type || "ALBUM").toUpperCase(),
      group: group,
      year: date.year || (date.isoString ? Number(String(date.isoString).slice(0, 4)) : 0),
      date: date.isoString || (date.year ? String(date.year) : ""),
      image: largestSource(node.coverArt && node.coverArt.sources)
    };
  }

  // ----- Artistas -----
  const PAGE = 50;

  async function artistReleases(artistUri) {
    const out = [];
    let offset = 0;
    let total = Infinity;
    while (offset < total) {
      const data = await gql("queryArtistDiscographyAll", { uri: artistUri, offset: offset, limit: PAGE, order: "DATE_DESC" });
      const all = data.artistUnion && data.artistUnion.discography && data.artistUnion.discography.all;
      const items = (all && all.items) || [];
      total = (all && typeof all.totalCount === "number") ? all.totalCount : offset + items.length;
      for (const group of items) {
        const release = releaseFrom(group && group.releases && group.releases.items && group.releases.items[0], "own");
        if (release) out.push(release);
      }
      if (items.length === 0) break;
      offset += items.length;
    }
    return out;
  }

  async function artistAppearsOn(artistUri) {
    const data = await gql("queryArtistAppearsOn", { uri: artistUri });
    const items = (((data.artistUnion || {}).relatedContent || {}).appearsOn || {}).items || [];
    const out = [];
    for (const group of items) {
      const release = releaseFrom(group && group.releases && group.releases.items && group.releases.items[0], "appears");
      if (release) out.push(release);
    }
    return out;
  }

  const visualsCache = new Map();

  async function artistVisuals(artistUri) {
    if (visualsCache.has(artistUri)) return visualsCache.get(artistUri);
    const data = await gql("queryArtistOverview", { uri: artistUri, locale: "", preReleaseV2: false });
    const artist = data.artistUnion || {};
    const visuals = artist.visuals || {};
    const header = artist.headerImage || visuals.headerImage || {};
    const gallery = ((visuals.gallery && visuals.gallery.items) || []).map(function (item) {
      return largestSource(item && item.sources);
    }).filter(Boolean);
    const result = {
      uri: artistUri,
      name: (artist.profile && artist.profile.name) || "",
      avatar: largestSource(visuals.avatarImage && visuals.avatarImage.sources),
      header: largestSource((header.data && header.data.sources) || header.sources),
      gallery: gallery
    };
    visualsCache.set(artistUri, result);
    return result;
  }

  const overviewCache = new Map();

  // Artistas relacionados y canciones populares de un artista (misma consulta que su página).
  async function artistOverview(artistUri) {
    if (overviewCache.has(artistUri)) return overviewCache.get(artistUri);
    const data = await gql("queryArtistOverview", { uri: artistUri, locale: "", preReleaseV2: false });
    const artist = data.artistUnion || {};
    const related = ((((artist.relatedContent || {}).relatedArtists || {}).items) || []).map(function (item) {
      return item && item.uri ? { uri: item.uri, name: (item.profile && item.profile.name) || "" } : null;
    }).filter(Boolean);
    const topTracks = ((((artist.discography || {}).topTracks || {}).items) || []).map(function (item) {
      return trackFromGraph(item && item.track, null);
    }).filter(Boolean);
    const result = { uri: artistUri, name: (artist.profile && artist.profile.name) || "", related: related, topTracks: topTracks };
    overviewCache.set(artistUri, result);
    return result;
  }

  // ----- Álbumes y canciones -----
  function trackFromGraph(node, release) {
    if (!node || !node.uri) return null;
    return {
      uri: node.uri,
      name: node.name || "",
      artists: ((node.artists && node.artists.items) || []).map(function (a) {
        return { uri: a.uri || "", name: (a.profile && a.profile.name) || "" };
      }),
      duration: (node.duration && node.duration.totalMilliseconds) || 0,
      playable: !node.playability || node.playability.playable !== false,
      explicit: Boolean(node.contentRating && node.contentRating.label === "EXPLICIT"),
      release: release || null
    };
  }

  async function albumTracks(albumUri, release) {
    const out = [];
    let offset = 0;
    let total = Infinity;
    let cover = "";
    let name = "";
    while (offset < total) {
      const data = await gql("getAlbum", { uri: albumUri, locale: "", offset: offset, limit: PAGE });
      const album = data.albumUnion || {};
      const tracks = album.tracksV2 || album.tracks || {};
      const items = tracks.items || [];
      total = typeof tracks.totalCount === "number" ? tracks.totalCount : offset + items.length;
      cover = cover || largestSource(album.coverArt && album.coverArt.sources);
      name = name || album.name || "";
      for (const item of items) {
        const track = trackFromGraph(item && item.track, release);
        if (track) out.push(track);
      }
      if (items.length === 0) break;
      offset += items.length;
    }
    return { name: name, cover: cover, tracks: out };
  }

  async function trackCover(trackUri) {
    const data = await gql("getTrack", { uri: trackUri });
    const album = (data.trackUnion && data.trackUnion.albumOfTrack) || {};
    return largestSource(album.coverArt && album.coverArt.sources);
  }

  // ----- Playlists y biblioteca -----
  function trackFromPlaylist(item) {
    if (!item || !item.uri || !/^spotify:(track|local)/.test(item.uri)) return null;
    const album = item.album || {};
    return {
      uri: item.uri,
      uid: item.uid || "",
      name: item.name || "",
      artists: (item.artists || []).map(function (a) { return { uri: a.uri || "", name: a.name || "" }; }),
      album: album.name || "",
      duration: (item.duration && item.duration.milliseconds) || 0,
      playable: item.isPlayable !== false,
      explicit: Boolean(item.isExplicit),
      image: core.images.toUrl((((album.images || [])[0]) || {}).url || "")
    };
  }

  function flattenRootlist(node, out) {
    for (const item of (node && node.items) || []) {
      if (!item) continue;
      if (item.type === "folder") flattenRootlist(item, out);
      else if (item.type === "playlist" && item.uri) {
        out.push({
          uri: item.uri,
          name: item.name || "",
          image: core.images.toUrl((((item.images || [])[0]) || {}).url || ""),
          owned: Boolean(item.isOwnedBySelf),
          collaborative: Boolean(item.isCollaborative),
          total: item.totalLength || 0
        });
      }
    }
    return out;
  }

  async function userPlaylists() {
    await core.platform.ready();
    const rootlist = core.platform.requireApi("RootlistAPI");
    return flattenRootlist(await rootlist.getContents(), []);
  }

  async function playlistTracks(playlistUri) {
    await core.platform.ready();
    const api = core.platform.requireApi("PlaylistAPI");
    const contents = await api.getContents(playlistUri);
    return ((contents && contents.items) || []).map(trackFromPlaylist).filter(Boolean);
  }

  async function playlistInfo(playlistUri) {
    await core.platform.ready();
    const api = core.platform.requireApi("PlaylistAPI");
    const meta = (await api.getMetadata(playlistUri)) || {};
    return {
      uri: playlistUri,
      name: meta.name || "",
      image: core.images.toUrl((((meta.images || []).slice(-1)[0]) || {}).url || "")
    };
  }

  async function likedTracks() {
    await core.platform.ready();
    const library = core.platform.requireApi("LibraryAPI");
    let result = await library.getTracks({ offset: 0, limit: -1 });
    if (!result || !Array.isArray(result.items) || result.items.length === 0) {
      result = await library.getTracks({ offset: 0, limit: 50000 });
    }
    return ((result && result.items) || []).map(trackFromPlaylist).filter(Boolean);
  }

  const ADD_CHUNK = 100;
  const PLAYLIST_LIMIT = 10000;

  async function createPlaylist(name, uris, onProgress) {
    await core.platform.ready();
    const rootlist = core.platform.requireApi("RootlistAPI");
    const playlists = core.platform.requireApi("PlaylistAPI");
    const list = uris.slice(0, PLAYLIST_LIMIT);
    const playlistUri = await rootlist.createPlaylist(name, { before: "start" });
    if (!playlistUri) throw new Error("Spotify no devolvió la playlist creada.");
    for (let i = 0; i < list.length; i += ADD_CHUNK) {
      await playlists.add(playlistUri, list.slice(i, i + ADD_CHUNK), { after: "end" });
      if (onProgress) onProgress(Math.min(i + ADD_CHUNK, list.length), list.length);
    }
    return { uri: playlistUri, added: list.length, truncated: uris.length - list.length };
  }

  async function addToPlaylist(playlistUri, uris) {
    await core.platform.ready();
    const playlists = core.platform.requireApi("PlaylistAPI");
    for (let i = 0; i < uris.length; i += ADD_CHUNK) {
      await playlists.add(playlistUri, uris.slice(i, i + ADD_CHUNK), { after: "end" });
    }
  }

  core.data = {
    addToPlaylist: addToPlaylist,
    gql: gql,
    pool: pool,
    artistReleases: artistReleases,
    artistAppearsOn: artistAppearsOn,
    artistVisuals: artistVisuals,
    artistOverview: artistOverview,
    albumTracks: albumTracks,
    trackCover: trackCover,
    userPlaylists: userPlaylists,
    playlistTracks: playlistTracks,
    playlistInfo: playlistInfo,
    likedTracks: likedTracks,
    createPlaylist: createPlaylist,
    PLAYLIST_LIMIT: PLAYLIST_LIMIT
  };
})(typeof window !== "undefined" ? window : globalThis);

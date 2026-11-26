// artista-playlist · lógica pura (sin DOM): selección, filtrado y deduplicado de canciones.
(function (root) {
  "use strict";
  const parts = (root.SintonParts = root.SintonParts || {});
  const part = (parts["artista-playlist"] = parts["artista-playlist"] || {});

  const CATEGORY_ORDER = { albums: 0, singles: 1, compilations: 2, appears: 3 };
  // Sufijos que no cambian la canción: se ignoran al comparar títulos.
  const NOISE_RE = /\b(feat|ft|featuring|with|con|remaster(ed|izad[oa])?|\d{4} remaster|mono|stereo|explicit|clean|bonus( track)?|deluxe|album version|single version|original( version| mix)?|version original|from .+)\b/;
  // Sufijos que sí indican otra versión de la canción.
  const ALTERNATE_RE = /\b(remix|rmx|mix|live|en vivo|en directo|directo|acoustic|acustic[oa]|unplugged|instrumental|karaoke|demo|sped up|speed up|slowed|reverb|a cappella|acapella|edit|session|sesion|version|versao|rework|orchestral|piano|stripped|commentary|interlude)\b/;
  const DEFAULTS = {
    albums: true,
    singles: true,
    compilations: false,
    appears: false,
    unique: true,
    noCollabs: false,
    noAlternates: false,
    order: "newest"
  };

  function fold(text) {
    return String(text || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  }

  // Divide "Título (feat. X) - Live" en título base y sufijos.
  function splitTitle(name) {
    const folded = fold(name);
    const suffixes = [];
    let base = folded.replace(/[([]([^)\]]*)[)\]]/g, function (_, inner) {
      suffixes.push(inner.trim());
      return " ";
    });
    const dash = base.split(/\s+-\s+/);
    if (dash.length > 1) {
      base = dash[0];
      for (const piece of dash.slice(1)) suffixes.push(piece.trim());
    }
    base = base.replace(/[^\p{L}\p{N}]+/gu, " ").trim();
    return { base: base || folded.trim(), suffixes: suffixes.filter(Boolean) };
  }

  function isAlternateSuffix(suffix) {
    return ALTERNATE_RE.test(suffix) && !/\b(remaster|original)/.test(suffix);
  }

  function isAlternate(name) {
    return splitTitle(name).suffixes.some(isAlternateSuffix);
  }

  // Clave de comparación: mismo título base y mismas marcas de versión.
  function titleKey(name) {
    const split = splitTitle(name);
    const marks = split.suffixes
      .filter(function (suffix) { return isAlternateSuffix(suffix) || !NOISE_RE.test(suffix); })
      .map(function (suffix) { return suffix.replace(/[^\p{L}\p{N}]+/gu, " ").trim(); })
      .filter(Boolean)
      .sort();
    return split.base + (marks.length ? "|" + marks.join("|") : "");
  }

  function category(release) {
    if (!release) return "albums";
    if (release.group === "appears") return "appears";
    if (release.type === "COMPILATION") return "compilations";
    if (release.type === "SINGLE" || release.type === "EP") return "singles";
    return "albums";
  }

  function hasArtist(track, artistUri) {
    return track.artists.some(function (artist) { return artist.uri === artistUri; });
  }

  function isCollab(track, artistUri) {
    return track.artists.some(function (artist) { return artist.uri !== artistUri; });
  }

  function better(candidate, currentBest) {
    if (candidate.playable !== currentBest.playable) return candidate.playable;
    const a = CATEGORY_ORDER[category(candidate.release)];
    const b = CATEGORY_ORDER[category(currentBest.release)];
    if (a !== b) return a < b;
    if (candidate.explicit !== currentBest.explicit) return candidate.explicit;
    return false;
  }

  // Conserva una sola versión por clave de título, en la posición de la primera aparición.
  function dedupeByTitle(tracks) {
    const byKey = new Map();
    const order = [];
    for (const track of tracks) {
      const key = titleKey(track.name);
      if (!byKey.has(key)) {
        byKey.set(key, track);
        order.push(key);
      } else if (better(track, byKey.get(key))) {
        byKey.set(key, track);
      }
    }
    return order.map(function (key) { return byKey.get(key); });
  }

  // Fecha del lanzamiento como número AAAAMMDD; null si no hay fecha válida.
  function dateKey(track) {
    const raw = track && track.release && track.release.date;
    const match = /^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?/.exec(String(raw || ""));
    if (!match) return null;
    const year = Number(match[1]);
    if (!year) return null;
    const month = Number(match[2] || 1) || 1;
    const day = Number(match[3] || 1) || 1;
    return year * 10000 + month * 100 + day;
  }

  // direction: 1 = antiguo→reciente, -1 = reciente→antiguo. Sin fecha, siempre al final.
  function compareEntries(a, b, direction) {
    if (a.date !== b.date) {
      if (a.date === null) return 1;
      if (b.date === null) return -1;
      return (a.date - b.date) * direction;
    }
    if (a.rank !== b.rank) return a.rank - b.rank;
    return a.index - b.index;
  }

  // tracks: canciones de todos los lanzamientos cargados. Devuelve la lista final en orden.
  function buildList(tracks, options, artistUri) {
    const opts = Object.assign({}, DEFAULTS, options);
    const direction = opts.order === "oldest" ? 1 : -1;

    const entries = tracks
      .filter(function (track) {
        if (!track.playable || !hasArtist(track, artistUri)) return false;
        if (!opts[category(track.release)]) return false;
        if (opts.noCollabs && isCollab(track, artistUri)) return false;
        if (opts.noAlternates && isAlternate(track.name)) return false;
        return true;
      })
      .map(function (track, index) {
        return { track: track, index: index, date: dateKey(track), rank: CATEGORY_ORDER[category(track.release)] };
      });

    // Orden cronológico ascendente: el primero de cada canción es su lanzamiento original.
    const chronological = entries.slice().sort(function (a, b) { return compareEntries(a, b, 1); });

    const seenUris = new Set();
    const distinct = chronological.filter(function (entry) {
      if (seenUris.has(entry.track.uri)) return false;
      seenUris.add(entry.track.uri);
      return true;
    });

    let groups;
    if (opts.unique) {
      const byKey = new Map();
      groups = [];
      for (const entry of distinct) {
        const key = titleKey(entry.track.name);
        const group = byKey.get(key);
        if (!group) {
          const created = { origin: entry, track: entry.track };
          byKey.set(key, created);
          groups.push(created);
        } else if (better(entry.track, group.track)) {
          group.track = entry.track;
        }
      }
    } else {
      groups = distinct.map(function (entry) { return { origin: entry, track: entry.track }; });
    }

    groups.sort(function (a, b) { return compareEntries(a.origin, b.origin, direction); });
    return groups.map(function (group) { return group.track; });
  }

  part.logic = {
    DEFAULTS: DEFAULTS,
    splitTitle: splitTitle,
    titleKey: titleKey,
    isAlternate: isAlternate,
    isCollab: isCollab,
    category: category,
    dedupeByTitle: dedupeByTitle,
    buildList: buildList
  };
})(typeof window !== "undefined" ? window : globalThis);
// marcas · lógica pura (sin DOM): modelo de marcas, asignación y filtrado.
(function (root) {
  "use strict";
  const parts = (root.SintonParts = root.SintonParts || {});
  const part = (parts.marcas = parts.marcas || {});

  const VERSION = 1;
  const MAX_NAME = 30;
  const COLOR_RE = /^#[0-9a-f]{6}$/i;
  const PALETTE = ["#1ed760", "#4da3ff", "#ff4d6a", "#3ddc97", "#c77dff", "#ffd60a", "#b4b4b4"];
  const DEFAULT_MARKS = [
    { id: "m1", name: "Top", color: "#1ed760" },
    { id: "m2", name: "Para luego", color: "#4da3ff" },
    { id: "m3", name: "Descartar", color: "#ff4d6a" }
  ];

  function createState() {
    return { version: VERSION, marks: DEFAULT_MARKS.map(function (mark) { return Object.assign({}, mark); }), tracks: {} };
  }

  function cleanName(name) {
    return String(name == null ? "" : name).replace(/\s+/g, " ").trim().slice(0, MAX_NAME);
  }

  // Valida datos leídos del almacenamiento o de un archivo importado. Lanza si no son utilizables.
  function normalize(raw) {
    if (!raw || typeof raw !== "object" || !Array.isArray(raw.marks) || typeof raw.tracks !== "object" || raw.tracks === null) {
      throw new Error("El archivo no tiene el formato de marcas de Sinton.");
    }
    const marks = [];
    const ids = new Set();
    for (const mark of raw.marks) {
      if (!mark || typeof mark.id !== "string" || !mark.id || ids.has(mark.id)) continue;
      const name = cleanName(mark.name);
      if (!name) continue;
      ids.add(mark.id);
      marks.push({ id: mark.id, name: name, color: COLOR_RE.test(mark.color) ? mark.color.toLowerCase() : PALETTE[0] });
    }
    const tracks = {};
    for (const uri of Object.keys(raw.tracks)) {
      if (!/^spotify:(track|local):/.test(uri) || !Array.isArray(raw.tracks[uri])) continue;
      const list = Array.from(new Set(raw.tracks[uri].filter(function (id) { return ids.has(id); })));
      if (list.length > 0) tracks[uri] = list;
    }
    return { version: VERSION, marks: marks, tracks: tracks };
  }

  function nextId(state) {
    let n = state.marks.length + 1;
    const used = new Set(state.marks.map(function (mark) { return mark.id; }));
    while (used.has("m" + n)) n += 1;
    return "m" + n;
  }

  function addMark(state, name, color) {
    const clean = cleanName(name);
    if (!clean) throw new Error("Escribe un nombre para la marca.");
    if (state.marks.some(function (mark) { return mark.name.toLowerCase() === clean.toLowerCase(); })) {
      throw new Error("Ya existe una marca con ese nombre.");
    }
    const mark = { id: nextId(state), name: clean, color: COLOR_RE.test(color) ? color.toLowerCase() : PALETTE[state.marks.length % PALETTE.length] };
    state.marks.push(mark);
    return mark;
  }

  function updateMark(state, id, changes) {
    const mark = state.marks.find(function (item) { return item.id === id; });
    if (!mark) return null;
    if (changes.name !== undefined) {
      const clean = cleanName(changes.name);
      if (clean) mark.name = clean;
    }
    if (changes.color !== undefined && COLOR_RE.test(changes.color)) mark.color = changes.color.toLowerCase();
    return mark;
  }

  function removeMark(state, id) {
    state.marks = state.marks.filter(function (mark) { return mark.id !== id; });
    for (const uri of Object.keys(state.tracks)) {
      const list = state.tracks[uri].filter(function (markId) { return markId !== id; });
      if (list.length > 0) state.tracks[uri] = list;
      else delete state.tracks[uri];
    }
  }

  function marksOf(state, uri) {
    const ids = state.tracks[uri] || [];
    return state.marks.filter(function (mark) { return ids.includes(mark.id); });
  }

  // Pone (on=true) o quita la marca en todas las canciones indicadas.
  function setMark(state, uris, markId, on) {
    if (!state.marks.some(function (mark) { return mark.id === markId; })) return;
    for (const uri of uris) {
      const list = (state.tracks[uri] || []).filter(function (id) { return id !== markId; });
      if (on) list.push(markId);
      if (list.length > 0) state.tracks[uri] = list;
      else delete state.tracks[uri];
    }
  }

  // "all" si todas las canciones tienen la marca, "some" si solo algunas, "none" si ninguna.
  function coverage(state, uris, markId) {
    let count = 0;
    for (const uri of uris) {
      if ((state.tracks[uri] || []).includes(markId)) count += 1;
    }
    if (count === 0) return "none";
    return count === uris.length ? "all" : "some";
  }

  // mode: "any" (alguna de las marcas), "all" (todas), "exclude" (ninguna de ellas).
  // Sin marcas seleccionadas: "any"/"all" devuelven las canciones con cualquier marca; "exclude", las que no tienen ninguna.
  function filterTracks(tracks, state, selectedIds, mode) {
    const selected = selectedIds.filter(function (id) { return state.marks.some(function (mark) { return mark.id === id; }); });
    return tracks.filter(function (track) {
      const ids = state.tracks[track.uri] || [];
      if (selected.length === 0) return mode === "exclude" ? ids.length === 0 : ids.length > 0;
      if (mode === "all") return selected.every(function (id) { return ids.includes(id); });
      const any = selected.some(function (id) { return ids.includes(id); });
      return mode === "exclude" ? !any : any;
    });
  }

  function countByMark(tracks, state) {
    const counts = {};
    for (const mark of state.marks) counts[mark.id] = 0;
    for (const track of tracks) {
      for (const id of state.tracks[track.uri] || []) {
        if (id in counts) counts[id] += 1;
      }
    }
    return counts;
  }

  function shuffle(list, random) {
    const rand = random || Math.random;
    const out = list.slice();
    for (let i = out.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rand() * (i + 1));
      const tmp = out[i];
      out[i] = out[j];
      out[j] = tmp;
    }
    return out;
  }

  part.logic = {
    PALETTE: PALETTE,
    createState: createState,
    normalize: normalize,
    addMark: addMark,
    updateMark: updateMark,
    removeMark: removeMark,
    marksOf: marksOf,
    setMark: setMark,
    coverage: coverage,
    filterTracks: filterTracks,
    countByMark: countByMark,
    shuffle: shuffle
  };
})(typeof window !== "undefined" ? window : globalThis);

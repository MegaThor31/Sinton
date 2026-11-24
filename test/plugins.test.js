import test from "node:test";
import assert from "node:assert/strict";
import { pluginLogic, seeded, plain } from "./helpers.js";

const ARTIST = "spotify:artist:a";
const OTHER = "spotify:artist:b";

function song(id, name, extra) {
  return Object.assign({
    uri: "spotify:track:" + id,
    name: name,
    playable: true,
    explicit: false,
    artists: [{ uri: ARTIST, name: "A" }],
    release: { type: "ALBUM", group: "albums", date: "2020-01-01" }
  }, extra);
}

test("artista-playlist: claves de título y versiones alternativas", () => {
  const logic = pluginLogic("artista-playlist");
  assert.equal(logic.titleKey("Canción (feat. Otro)"), logic.titleKey("CANCION"));
  assert.equal(logic.titleKey("Song - Remastered 2011"), logic.titleKey("Song"));
  assert.notEqual(logic.titleKey("Song - Live"), logic.titleKey("Song"));
  assert.notEqual(logic.titleKey("Song (Part 2)"), logic.titleKey("Song"));
  assert.equal(logic.isAlternate("Song (Acoustic)"), true);
  assert.equal(logic.isAlternate("Song - Remix"), true);
  assert.equal(logic.isAlternate("Song (feat. X)"), false);
  assert.equal(logic.isAlternate("Song - 2011 Remaster"), false);
  assert.equal(logic.isAlternate("Live Forever"), false);
});

test("artista-playlist: todas absolutas frente a sin repetir", () => {
  const logic = pluginLogic("artista-playlist");
  const tracks = [
    song("1", "Hit", { release: { type: "SINGLE", group: "singles", date: "2019-05-01" } }),
    song("2", "Hit", { release: { type: "ALBUM", group: "albums", date: "2020-01-01" } }),
    song("3", "Hit - Live"),
    song("2", "Hit"),
    song("4", "No disponible", { playable: false }),
    song("5", "De otro", { artists: [{ uri: OTHER, name: "B" }] })
  ];
  const all = logic.buildList(tracks, { unique: false }, ARTIST).map((t) => t.uri);
  assert.deepEqual(plain(all).sort(), ["spotify:track:1", "spotify:track:2", "spotify:track:3"]);
  const unique = logic.buildList(tracks, { unique: true }, ARTIST);
  assert.deepEqual(plain(unique.map((t) => t.name)).sort(), ["Hit", "Hit - Live"]);
  // Entre duplicados se queda con la versión del álbum antes que la del sencillo.
  assert.equal(unique.find((t) => t.name === "Hit").uri, "spotify:track:2");
});

test("artista-playlist: sin colaboraciones, sin alternativas, tipos y orden", () => {
  const logic = pluginLogic("artista-playlist");
  const tracks = [
    song("1", "Sola", { release: { type: "ALBUM", group: "albums", date: "2018-01-01" } }),
    song("2", "Dúo", { artists: [{ uri: ARTIST, name: "A" }, { uri: OTHER, name: "B" }], release: { type: "ALBUM", group: "albums", date: "2021-01-01" } }),
    song("3", "Sola (Remix)", { release: { type: "SINGLE", group: "singles", date: "2022-01-01" } }),
    song("4", "Invitada", { artists: [{ uri: OTHER, name: "B" }, { uri: ARTIST, name: "A" }], release: { type: "ALBUM", group: "appears", date: "2023-01-01" } })
  ];
  const names = (options) => plain(logic.buildList(tracks, options, ARTIST).map((t) => t.name));
  assert.deepEqual(names({}), ["Sola (Remix)", "Dúo", "Sola"]);
  assert.deepEqual(names({ order: "oldest" }), ["Sola", "Dúo", "Sola (Remix)"]);
  assert.deepEqual(names({ noCollabs: true }), ["Sola (Remix)", "Sola"]);
  assert.deepEqual(names({ noAlternates: true }), ["Dúo", "Sola"]);
  assert.deepEqual(names({ appears: true, singles: false }), ["Invitada", "Dúo", "Sola"]);
  assert.deepEqual(names({ appears: true, noCollabs: true, noAlternates: true }), ["Sola"]);
});

function library(counts) {
  const tracks = [];
  Object.keys(counts).forEach((artist) => {
    for (let i = 0; i < counts[artist]; i += 1) {
      tracks.push({ uri: "spotify:track:" + artist + i, artists: [{ uri: "spotify:artist:" + artist }] });
    }
  });
  return tracks;
}

function adjacentRepeats(logicTracks) {
  let repeats = 0;
  for (let i = 1; i < logicTracks.length; i += 1) {
    if (logicTracks[i].artists[0].uri === logicTracks[i - 1].artists[0].uri) repeats += 1;
  }
  return repeats;
}

test("marcas: asignar, filtrar y borrar", () => {
  const logic = pluginLogic("marcas");
  const state = logic.createState();
  const [top, later] = state.marks.map((mark) => mark.id);
  const tracks = ["1", "2", "3", "4"].map((id) => ({ uri: "spotify:track:" + id }));
  logic.setMark(state, ["spotify:track:1", "spotify:track:2"], top, true);
  logic.setMark(state, ["spotify:track:2", "spotify:track:3"], later, true);
  logic.setMark(state, ["spotify:track:2"], top, true);
  logic.setMark(state, ["spotify:track:4"], "no-existe", true);
  assert.deepEqual(plain(state.tracks["spotify:track:2"]).sort(), [top, later].sort());
  const ids = (selected, mode) => plain(logic.filterTracks(tracks, state, selected, mode).map((t) => t.uri.slice(-1)));
  assert.deepEqual(ids([top], "any"), ["1", "2"]);
  assert.deepEqual(ids([top, later], "any"), ["1", "2", "3"]);
  assert.deepEqual(ids([top, later], "all"), ["2"]);
  assert.deepEqual(ids([top], "exclude"), ["3", "4"]);
  assert.deepEqual(ids([], "any"), ["1", "2", "3"]);
  assert.deepEqual(ids([], "exclude"), ["4"]);
  assert.equal(logic.coverage(state, ["spotify:track:1", "spotify:track:3"], top), "some");
  assert.equal(logic.coverage(state, ["spotify:track:1", "spotify:track:2"], top), "all");
  assert.equal(logic.coverage(state, ["spotify:track:4"], top), "none");
  logic.setMark(state, ["spotify:track:1"], top, false);
  assert.equal(state.tracks["spotify:track:1"], undefined);
  logic.removeMark(state, later);
  assert.deepEqual(plain(state.tracks), { "spotify:track:2": [top] });
});

test("marcas: validación de nombres y de datos importados", () => {
  const logic = pluginLogic("marcas");
  const state = logic.createState();
  assert.throws(() => logic.addMark(state, "   ", "#fff"));
  assert.throws(() => logic.addMark(state, "top", "#ffffff"));
  const added = logic.addMark(state, "  Gimnasio  ", "nada");
  assert.equal(added.name, "Gimnasio");
  assert.match(added.color, /^#[0-9a-f]{6}$/);
  assert.equal(new Set(state.marks.map((mark) => mark.id)).size, state.marks.length);

  assert.throws(() => logic.normalize(null));
  assert.throws(() => logic.normalize({ marks: "x", tracks: {} }));
  const clean = plain(logic.normalize({
    marks: [{ id: "m1", name: "Uno", color: "#ABCDEF" }, { id: "m1", name: "Repetida" }, { id: "m2", name: "" }, null],
    tracks: {
      "spotify:track:1": ["m1", "m1", "m9"],
      "spotify:track:2": ["m9"],
      "spotify:album:3": ["m1"],
      "spotify:track:4": "m1"
    }
  }));
  assert.deepEqual(clean, { version: 1, marks: [{ id: "m1", name: "Uno", color: "#abcdef" }], tracks: { "spotify:track:1": ["m1"] } });
});

test("playlist-iconos: índice y etiquetas visibles", () => {
  const logic = pluginLogic("playlist-iconos");
  const index = new Map();
  logic.addToIndex(index, "p1", ["t1", "t1", "t2"]);
  logic.addToIndex(index, "p2", ["t1"]);
  logic.addToIndex(index, "p3", ["t1"]);
  logic.addToIndex(index, "p1", ["t1"]);
  assert.deepEqual(plain(index.get("t1")), ["p1", "p2", "p3"]);
  assert.deepEqual(plain(logic.labelsFor(index, "t1", "p1", { showCurrent: false, max: 1 })), { shown: ["p2"], hidden: ["p3"] });
  assert.deepEqual(plain(logic.labelsFor(index, "t1", "p1", { showCurrent: true, max: 4 })), { shown: ["p1", "p2", "p3"], hidden: [] });
  assert.deepEqual(plain(logic.labelsFor(index, "nada", "p1", { max: 4 })), { shown: [], hidden: [] });
  const playlists = [{ uri: "a", owned: true }, { uri: "b", collaborative: true }, { uri: "c" }];
  assert.equal(logic.selectPlaylists(playlists, { includeFollowed: false }).length, 2);
  assert.equal(logic.selectPlaylists(playlists, { includeFollowed: true }).length, 3);
});

test("pantalla-completa: tiempos, fondos y saltos", () => {
  const logic = pluginLogic("pantalla-completa");
  assert.equal(logic.formatTime(0), "0:00");
  assert.equal(logic.formatTime(65999), "1:05");
  assert.equal(logic.formatTime(3723000), "1:02:03");
  assert.equal(logic.formatTime(-5), "0:00");
  assert.equal(logic.formatTime(undefined), "0:00");
  let mode = "artist";
  const seen = [];
  for (let i = 0; i < 3; i += 1) { seen.push(mode); mode = logic.nextBackground(mode); }
  assert.deepEqual(seen, ["artist", "cover", "blur"]);
  assert.equal(mode, "artist");
  assert.equal(logic.nextBackground("desconocido"), "artist");
  assert.deepEqual(plain(logic.pickBackground("artist", { header: "h", avatar: "a", cover: "c" })), { url: "h", blurred: false });
  assert.deepEqual(plain(logic.pickBackground("artist", { avatar: "a", cover: "c" })), { url: "a", blurred: false });
  assert.deepEqual(plain(logic.pickBackground("artist", { cover: "c" })), { url: "c", blurred: true });
  assert.deepEqual(plain(logic.pickBackground("cover", { cover: "c" })), { url: "c", blurred: false });
  assert.deepEqual(plain(logic.pickBackground("blur", {})), { url: "", blurred: true });
  assert.equal(logic.fraction(150, 100, 200), 0.25);
  assert.equal(logic.fraction(0, 100, 200), 0);
  assert.equal(logic.fraction(900, 100, 200), 1);
  assert.equal(logic.fraction(10, 0, 0), 0);
  assert.equal(logic.seekTarget(2000, 100000, -1), 0);
  assert.equal(logic.seekTarget(98000, 100000, 1), 99500);
  assert.equal(logic.seekTarget(10000, 100000, 1), 15000);
});

test("letras: desfase por canción", () => {
  const logic = pluginLogic("letras");
  let offsets = {};
  offsets = logic.setOffset(offsets, "spotify:track:1", 500);
  offsets = logic.setOffset(offsets, "spotify:track:2", -250);
  assert.equal(offsets["spotify:track:1"], 500);
  assert.equal(offsets["spotify:track:2"], -250);
  offsets = logic.setOffset(offsets, "spotify:track:1", 0);
  assert.equal(offsets["spotify:track:1"], undefined);
});

test("pantalla-completa: letra disponible, disco y color del vinilo", () => {
  const logic = pluginLogic("pantalla-completa");
  assert.equal(logic.hasLyrics({ found: true, lines: [{ text: "hola" }] }), true);
  assert.equal(logic.hasLyrics({ found: true, instrumental: true, lines: [] }), false);
  assert.equal(logic.hasLyrics({ found: false, lines: [] }), false);
  assert.equal(logic.hasLyrics({ found: true, lines: [{ text: "  " }] }), false);
  assert.equal(logic.hasLyrics({ found: false, error: true, lines: [] }), false);
  assert.equal(logic.hasLyrics(null), false);
  assert.equal(logic.nextDisc("vinyl"), "cover");
  assert.equal(logic.nextDisc("cover"), "vinyl");
  assert.equal(logic.isDisc("otro"), false);
  const red = [];
  for (let i = 0; i < 10; i += 1) red.push(220, 30, 30, 255);
  for (let i = 0; i < 30; i += 1) red.push(5, 5, 5, 255);
  assert.deepEqual(plain(logic.dominantColor(red)), [220, 30, 30]);
  assert.deepEqual(plain(logic.dominantColor([0, 0, 0, 255])), [30, 215, 96]);
  assert.deepEqual(plain(logic.dominantColor(null)), [30, 215, 96]);
  const dark = logic.brighten([60, 10, 10]);
  assert.ok(Math.max(...dark) > 60);
  assert.deepEqual(plain(logic.brighten([30, 215, 96])), [30, 215, 96]);
});

test("cola-arriba: reconoce filas de la cola y la fila actual", () => {
  const logic = pluginLogic("cola-arriba");
  const fn = () => {};
  assert.deepEqual(plain(logic.queueItem({ item: { uri: "spotify:track:1", uid: "u1" }, index: 2, section: 1, usePlayContextItem: fn })), { uri: "spotify:track:1", uid: "u1" });
  assert.equal(logic.queueItem({ item: { uri: "spotify:track:1" }, usePlayContextItem: fn }), null);
  assert.equal(logic.queueItem({ item: { uri: "spotify:album:1" }, section: 1, usePlayContextItem: fn }), null);
  assert.equal(logic.queueItem({ item: { uri: "spotify:track:1" }, section: 1 }), null);
  assert.equal(logic.queueItem(null), null);
  assert.equal(logic.isCurrent({ uri: "a", uid: "x" }, { uri: "a", uid: "x" }), true);
  assert.equal(logic.isCurrent({ uri: "a", uid: "y" }, { uri: "a", uid: "x" }), false);
  assert.equal(logic.isMovable("spotify:episode:1"), true);
  assert.equal(logic.message("first"), "Ya es la siguiente de la cola.");
});

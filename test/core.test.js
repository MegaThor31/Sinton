import test from "node:test";
import assert from "node:assert/strict";
import { loadScripts, plain } from "./helpers.js";

const core = loadScripts(["assets/core/data.js", "assets/core/lyrics.js"]).SintonCore;
const lyrics = core.lyrics;
const images = core.images;

test("parseLrc ordena, admite varias marcas por línea y aplica el offset", () => {
  const lines = plain(lyrics.parseLrc("[ar:Alguien]\n[offset:500]\n[00:12.50]dos\n[00:01.00][00:20.5]uno\n\ntexto suelto"));
  assert.deepEqual(lines, [
    { time: 500, text: "uno" },
    { time: 12000, text: "dos" },
    { time: 20000, text: "uno" }
  ]);
});

test("parseLrc quita las marcas por palabra y no da tiempos negativos", () => {
  const lines = plain(lyrics.parseLrc("[offset:5000]\n[00:01.00]<00:01.00>hola <00:01.50>mundo"));
  assert.deepEqual(lines, [{ time: 0, text: "hola mundo" }]);
});

test("activeIndex devuelve la línea vigente", () => {
  const lines = [{ time: 1000 }, { time: 2000 }, { time: 5000 }];
  assert.equal(lyrics.activeIndex(lines, 0), -1);
  assert.equal(lyrics.activeIndex(lines, 1000), 0);
  assert.equal(lyrics.activeIndex(lines, 4999), 1);
  assert.equal(lyrics.activeIndex(lines, 999999), 2);
  assert.equal(lyrics.activeIndex([], 10), -1);
});

test("pickSearchResult prefiere sincronizada y descarta duraciones lejanas", () => {
  const results = [
    { id: 1, duration: 200, plainLyrics: "a" },
    { id: 2, duration: 202, syncedLyrics: "[00:01.00]a" },
    { id: 3, duration: 260, syncedLyrics: "[00:01.00]a" },
    { id: 4, duration: 200 }
  ];
  assert.equal(lyrics.pickSearchResult(results, 200000).id, 2);
  assert.equal(lyrics.pickSearchResult([results[2]], 200000), null);
  assert.equal(lyrics.pickSearchResult(null, 200000), null);
});

test("choose: gana la sincronizada y, a igualdad, Spotify", () => {
  const spotifyStatic = { synced: false, provider: "Spotify" };
  const spotifySynced = { synced: true, provider: "Spotify" };
  const lrclibSynced = { synced: true, provider: "LRCLIB" };
  assert.equal(lyrics.choose(spotifyStatic, lrclibSynced), lrclibSynced);
  assert.equal(lyrics.choose(spotifySynced, lrclibSynced), spotifySynced);
  assert.equal(lyrics.choose(null, lrclibSynced), lrclibSynced);
  assert.equal(lyrics.choose(spotifyStatic, null), spotifyStatic);
  assert.equal(lyrics.choose(null, null), null);
});

test("fromSpotify y fromLrclib normalizan las respuestas", () => {
  const spotify = plain(lyrics.fromSpotify({ lyrics: { syncType: "LINE_SYNCED", lines: [{ startTimeMs: "1200", words: " hola " }] } }));
  assert.deepEqual(spotify, { synced: true, lines: [{ time: 1200, text: "hola" }], provider: "Spotify" });
  assert.equal(lyrics.fromSpotify({ lyrics: { lines: [] } }), null);
  assert.equal(lyrics.fromLrclib({ instrumental: true }).instrumental, true);
  assert.equal(lyrics.fromLrclib({ plainLyrics: "a\nb" }).synced, false);
  assert.equal(lyrics.fromLrclib({}), null);
});

test("images.candidates propone la portada de 2000 px primero y conserva la original", () => {
  const list = plain(images.candidates("https://i.scdn.co/image/ab67616d00001e02abcdef0123456789abcdef01"));
  assert.equal(list[0], "https://i.scdn.co/image/ab67616d000082c1abcdef0123456789abcdef01");
  assert.ok(list.includes("https://i.scdn.co/image/ab67616d00001e02abcdef0123456789abcdef01"));
  assert.equal(new Set(list).size, list.length);
});

test("images.candidates acepta uris de imagen y deja intactas las URL desconocidas", () => {
  assert.equal(plain(images.candidates("spotify:image:ab67616d0000b273abcdef0123456789abcdef01"))[0],
    "https://i.scdn.co/image/ab67616d000082c1abcdef0123456789abcdef01");
  assert.deepEqual(plain(images.candidates("https://example.com/a.jpg")), ["https://example.com/a.jpg"]);
  assert.deepEqual(plain(images.candidates("")), []);
  assert.deepEqual(plain(images.candidates(null)), []);
});

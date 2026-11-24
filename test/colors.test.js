import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { recolorGreen, recolorSurfaces } from "../src/recolor.js";

function load(stored) {
  const storage = new Map(stored ? [["sinton:colors", JSON.stringify(stored)]] : []);
  const attrs = {};
  const nodes = new Map();
  const doc = {
    head: { appendChild: (n) => nodes.set(n.id, n) },
    documentElement: { setAttribute: (k, v) => { attrs[k] = v; }, removeAttribute: (k) => { delete attrs[k]; } },
    getElementById: (id) => nodes.get(id) || null,
    createElement: () => ({ id: "", textContent: "" })
  };
  const win = {
    localStorage: { getItem: (k) => (storage.has(k) ? storage.get(k) : null), setItem: (k, v) => storage.set(k, v) },
    document: doc
  };
  vm.runInNewContext(fs.readFileSync(new URL("../assets/sinton-colors.js", import.meta.url), "utf8"), { window: win, console });
  const css = () => nodes.get("sinton-colors-style").textContent;
  const prop = (name) => (css().match(new RegExp(`${name}:([^;}]+)`)) || [])[1];
  return { api: win.SintonColors, css, prop, attrs, storage };
}

const lum = (hex) => { const n = parseInt(hex.slice(1), 16); return ((n >> 16) & 255) + ((n >> 8) & 255) + (n & 255); };

test("colores: por defecto es el verde de Spotify con fondo gris oscuro", () => {
  const { api, prop, attrs } = load();
  assert.deepEqual({ ...api.get() }, { accent: "#1ed760", hover: "#3be477", press: "#1abc54", auto: true, bgMode: "dark", bg: "#202020", tintText: false, flat: false, flatColor: "" });
  assert.equal(prop("--sn-accent-rgb"), "30,215,96");
  assert.equal(prop("--sn-on-accent"), "#171717");
  assert.equal(prop("--sn-bg"), "#202020");
  assert.equal(prop("color-scheme"), "dark");
  assert.equal(attrs["data-sinton-scheme"], "dark");
});

test("colores: el automático da un tono más claro y otro más oscuro", () => {
  const { api, prop, storage } = load();
  const c = api.set({ accent: "#3d9bff" });
  assert.ok(lum(c.hover) > lum(c.accent) && lum(c.press) < lum(c.accent));
  assert.equal(prop("--sn-accent"), "#3d9bff");
  assert.equal(JSON.parse(storage.get("sinton:colors")).accent, "#3d9bff");
});

test("colores: en manual se respetan los tres y se ignoran valores inválidos", () => {
  const { api } = load({ accent: "#112233", hover: "#445566", press: "#778899", auto: false });
  assert.deepEqual({ ...api.get() }, { accent: "#112233", hover: "#445566", press: "#778899", auto: false, bgMode: "dark", bg: "#202020", tintText: false, flat: false, flatColor: "" });
  const bad = load({ accent: "rojo", hover: "x", auto: false, bgMode: "neon", bg: "azul" });
  assert.equal(bad.api.get().accent, "#1ed760");
  assert.match(bad.api.get().hover, /^#[0-9a-f]{6}$/);
  assert.equal(bad.api.get().bgMode, "dark");
  assert.equal(bad.api.get().bg, "#202020");
  assert.equal(api.reset().accent, "#1ed760");
  assert.equal(api.reset().auto, true);
});

test("colores: el color del texto sobre un acento oscuro es blanco", () => {
  const { prop, api } = load();
  api.set({ accent: "#102040" });
  assert.equal(prop("--sn-on-accent"), "#ffffff");
});

test("fondo: el modo claro usa el blanco roto y cambia el esquema", () => {
  const { api, prop, attrs } = load();
  api.set({ bgMode: "light" });
  assert.equal(prop("--sn-bg"), "#f3f1ec");
  assert.equal(prop("color-scheme"), "light");
  assert.equal(attrs["data-sinton-scheme"], "light");
  assert.equal(api.resetBackground().bgMode, "dark");
  assert.equal(prop("--sn-bg"), "#202020");
});

test("fondo: un color personalizado se suaviza y reparte las capas con su tono", () => {
  const { api, prop } = load();
  api.set({ bgMode: "custom", bg: "#ff0000" });
  const s = api.surfaces();
  assert.equal(s.scheme, "dark");
  assert.ok(lum(s.bg2) > lum(s.bg) && lum(s.bg) > lum(s.bg3) && lum(s.border) > lum(s.bg2));
  // Nunca estridente: el rojo puro se queda en un fondo oscuro poco saturado.
  const n = parseInt(s.bg.slice(1), 16);
  assert.ok(Math.max((n >> 16) & 255, (n >> 8) & 255, n & 255) < 90);
  api.set({ bg: "#ffe0a0" });
  const light = api.surfaces();
  assert.equal(light.scheme, "light");
  assert.ok(lum(light.bg2) >= lum(light.bg) && lum(light.bg) > lum(light.bg3) && lum(light.border) < lum(light.bg3));
  assert.equal(prop("color-scheme"), "light");
});

test("colores: el acento usado como texto mantiene el contraste en fondos claros", () => {
  const { api, prop } = load();
  api.set({ bgMode: "light" });
  const lumOf = (hex) => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }).reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0); };
  const ratio = (a, b) => (Math.max(lumOf(a), lumOf(b)) + 0.05) / (Math.min(lumOf(a), lumOf(b)) + 0.05);
  assert.ok(ratio(prop("--sn-accent-text"), prop("--sn-bg")) >= 3.4);
  assert.equal(prop("--sn-accent"), "#1ed760");
});

test("recolor: en CSS usa variables, en JS color fijo y respeta url()", () => {
  const css = recolorGreen("a{color:#1ed760;b:rgb(30,215,96);c:#1ed76080;d:url(\"data:x,<svg fill='#1ed760'/>\")}", { css: true });
  assert.match(css.text, /color:var\(--sn-accent,#1ed760\)/);
  assert.match(css.text, /rgb\(var\(--sn-accent-rgb,30,215,96\)\)/);
  assert.match(css.text, /color-mix\(in srgb,var\(--sn-accent,#1ed760\) 50%,transparent\)/);
  assert.match(css.text, /fill='#1ed760'/);
  const js = recolorGreen("x=\"#1ed760\"", { css: false });
  assert.equal(js.text, "x=\"#1ed760\"");
});

test("recolor: las tablas de colores de Spotify en JS usan variables y el resto queda fijo", () => {
  const js = recolorGreen('{base:"#1ed760",press:"#1abc54",fill:"#1ED760","--blur-glow-color":"#1ed760",x:"#1ed760"}', { css: false });
  assert.equal(js.text, '{base:"var(--sn-accent,#1ed760)",press:"var(--sn-press,#1abc54)",fill:"var(--sn-accent,#1ed760)","--blur-glow-color":"var(--sn-accent,#1ed760)",x:"#1ed760"}');
});

test("recolor: los fondos fijos de Spotify pasan a variables del fondo elegido", () => {
  const input = ".a{background-color:#000}.b{background:#282828;color:#000}.c{--x-background:#000}.d{background-color:#ffffff1a}.e{background-color:#000000b3}";
  const out = recolorSurfaces(input);
  assert.equal(out.count, 3);
  assert.match(out.text, /\.a\{background-color:var\(--sn-bg3,#000\)\}/);
  assert.match(out.text, /\.b\{background:var\(--sn-bg-hi,#282828\);color:#000\}/);
  assert.match(out.text, /\.c\{--x-background:#000\}/);
  assert.match(out.text, /rgba\(var\(--sn-text-rgb,255,255,255\),\.1\)/);
  assert.match(out.text, /background-color:#000000b3/);
});

test("colores: la opción de quitar degradados activa y quita el atributo", () => {
  const { api, attrs } = load();
  api.set({ flat: true });
  assert.equal(attrs["data-sinton-flat"], "1");
  api.set({ flat: false });
  assert.equal(attrs["data-sinton-flat"], undefined);
});

test("selectores: no se usan nombres de clase que solo existen con Spicetify", () => {
  const files = ["assets/sinton.css", "assets/sinton-motion.css", "assets/sinton-motion.js", "assets/core/ui.js", "assets/sinton.js"];
  const banned = /\.(Root__[a-z-]+|main-[a-zA-Z]+-[a-zA-Z]+|x-progressBar-[a-zA-Z]+|x-searchInput-[a-zA-Z]+|view-homeShortcutsGrid-[a-zA-Z]+)/;
  for (const file of files) {
    const code = fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    assert.doesNotMatch(code, banned, file);
  }
});

test("selectores: el tema no pinta hermanos de #main-view a ciegas (tapaban la ventana)", () => {
  for (const file of ["assets/sinton.css", "assets/sinton-motion.css"]) {
    const code = fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    assert.doesNotMatch(code, /#main-view\s*[~+]/, file);
  }
});

test("colores: el color sin degradado se suaviza al esquema y por defecto es el fondo", () => {
  const { api, prop } = load();
  assert.equal(api.get().flatColor, "");
  assert.equal(api.flatColor(), api.surfaces().bg);
  assert.equal(prop("--sn-flat"), api.surfaces().bg);
  api.set({ flatColor: "#ff0000" });
  const dark = api.flatColor();
  assert.notEqual(dark, "#ff0000");
  api.set({ bgMode: "light" });
  assert.notEqual(api.flatColor(), dark);
  api.set({ flatColor: "nope" });
  assert.equal(api.get().flatColor, "");
  api.set({ flatColor: "#3a6ea5" });
  api.resetBackground();
  assert.equal(api.get().flatColor, "");
});

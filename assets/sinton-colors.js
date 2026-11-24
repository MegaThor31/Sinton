// Sinton Colors: color principal (con tonos de selección y pulsado) y fondo (oscuro, claro o personalizado).
// Se carga en <head> de forma síncrona para que la primera pintura ya lleve los colores del usuario.
// Guarda la configuración en localStorage y escribe las variables --sn-* en una hoja <style> propia.
(function (root) {
  "use strict";
  const KEY = "sinton:colors";
  const DEFAULT = { accent: "#1ed760", hover: "#3be477", press: "#1abc54", auto: true, bgMode: "dark", bg: "#202020", tintText: false, flat: false, flatColor: "" };
  const MODES = ["dark", "light", "custom"];
  const STYLE_ID = "sinton-colors-style";
  // Fondos predefinidos: gris oscuro (el de siempre) y blanco roto.
  const PRESET_SURFACES = {
    dark: { bg: "#202020", bg2: "#242424", bg3: "#171717", hi: "#2b2b2b", border: "#353535", text: "#f2f2f2", muted: "#b4b4b4", scheme: "dark" },
    light: { bg: "#f3f1ec", bg2: "#fbfaf7", bg3: "#e7e4dd", hi: "#ebe8e1", border: "#d6d2c9", text: "#1c1b19", muted: "#5d5a54", scheme: "light" }
  };
  const HEX = /^#[0-9a-f]{6}$/i;

  function clamp(n, min, max) { return Math.min(max, Math.max(min, n)); }

  function hexToRgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function rgbToHex(rgb) {
    return "#" + rgb.map(function (v) { return clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0"); }).join("");
  }

  function rgbToHsl(rgb) {
    const r = rgb[0] / 255, g = rgb[1] / 255, b = rgb[2] / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const l = (max + min) / 2;
    if (max === min) return [0, 0, l];
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let h;
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    return [h * 60, s, l];
  }

  function hslToRgb(hsl) {
    const h = ((hsl[0] % 360) + 360) % 360 / 360, s = hsl[1], l = hsl[2];
    if (s === 0) return [l * 255, l * 255, l * 255];
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    function channel(t) {
      let x = t;
      if (x < 0) x += 1;
      if (x > 1) x -= 1;
      if (x < 1 / 6) return p + (q - p) * 6 * x;
      if (x < 1 / 2) return q;
      if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
      return p;
    }
    return [channel(h + 1 / 3) * 255, channel(h) * 255, channel(h - 1 / 3) * 255];
  }

  // Un tono más claro (selección, hover) y otro más oscuro (pulsado) a partir del principal.
  function derive(accent) {
    if (accent.toLowerCase() === DEFAULT.accent) return { hover: DEFAULT.hover, press: DEFAULT.press };
    const hsl = rgbToHsl(hexToRgb(accent));
    const hover = [hsl[0], hsl[1], clamp(hsl[2] + 0.12, 0, 0.88)];
    const press = [hsl[0], hsl[1], clamp(hsl[2] - 0.14, 0.12, 1)];
    return { hover: rgbToHex(hslToRgb(hover)), press: rgbToHex(hslToRgb(press)) };
  }

  function luminance(rgb) {
    const lin = rgb.map(function (v) {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
  }

  function contrast(a, b) {
    const la = luminance(a), lb = luminance(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  }

  function hsl(h, s, l) {
    return rgbToHex(hslToRgb([h, clamp(s, 0, 1), clamp(l, 0, 1)]));
  }

  // Superficies a partir de un color base cualquiera: se limita la saturación para que nunca sea estridente
  // y se reparten las capas (fondo, tarjetas, hundido, hover, borde, texto) con el mismo tono.
  function customSurfaces(base) {
    const c = rgbToHsl(hexToRgb(base));
    const h = c[0], s = Math.min(c[1], 0.3);
    if (luminance(hexToRgb(base)) < 0.25) {
      const l = clamp(c[2], 0.07, 0.22);
      return {
        bg: hsl(h, s, l), bg2: hsl(h, s, l + 0.035), bg3: hsl(h, s, Math.max(l - 0.035, 0.03)),
        hi: hsl(h, s, l + 0.08), border: hsl(h, s, l + 0.13),
        text: hsl(h, Math.min(s, 0.15), 0.95), muted: hsl(h, Math.min(s, 0.12), 0.72), scheme: "dark"
      };
    }
    const l = clamp(c[2], 0.84, 0.95);
    return {
      bg: hsl(h, s, l), bg2: hsl(h, s, Math.min(l + 0.035, 0.985)), bg3: hsl(h, s, l - 0.05),
      hi: hsl(h, s, l - 0.025), border: hsl(h, s, l - 0.12),
      text: hsl(h, Math.min(s, 0.2), 0.1), muted: hsl(h, Math.min(s, 0.12), 0.38), scheme: "light"
    };
  }

  // Color liso que sustituye al degradado de las cabeceras. Se mantiene el tono elegido, pero se limita la
  // saturación y se lleva la luminosidad a la franja del esquema (oscuro o claro) para que el texto se lea.
  function flatTone(hex, scheme) {
    const c = rgbToHsl(hexToRgb(hex));
    const s = Math.min(c[1], 0.35);
    const l = scheme === "dark" ? clamp(c[2], 0.08, 0.26) : clamp(c[2], 0.8, 0.95);
    return hsl(c[0], s, l);
  }

  function flatColorOf(colors, surface) {
    return colors.flatColor ? flatTone(colors.flatColor, surface.scheme) : surface.bg;
  }

  function surfaces(colors) {
    if (colors.bgMode === "custom") return customSurfaces(colors.bg);
    return PRESET_SURFACES[colors.bgMode];
  }

  // Color principal usable como texto sobre el fondo: se acerca al blanco o al negro hasta tener contraste legible.
  function accentText(accent, surface) {
    const bg = hexToRgb(surface.bg);
    const c = rgbToHsl(hexToRgb(accent));
    let l = c[2];
    const step = surface.scheme === "dark" ? 0.03 : -0.03;
    let out = accent;
    for (let i = 0; i < 30 && contrast(hexToRgb(out), bg) < 3.5; i += 1) {
      l = clamp(l + step, 0.05, 0.95);
      out = rgbToHex(hslToRgb([c[0], c[1], l]));
    }
    return out;
  }

  function normalize(raw) {
    const src = raw && typeof raw === "object" ? raw : {};
    const accent = HEX.test(src.accent) ? src.accent.toLowerCase() : DEFAULT.accent;
    const base = {
      bgMode: MODES.indexOf(src.bgMode) !== -1 ? src.bgMode : DEFAULT.bgMode,
      bg: HEX.test(src.bg) ? src.bg.toLowerCase() : DEFAULT.bg,
      tintText: src.tintText === true,
      flat: src.flat === true,
      flatColor: HEX.test(src.flatColor) ? src.flatColor.toLowerCase() : ""
    };
    const tones = derive(accent);
    const auto = src.auto !== false;
    return Object.assign({
      accent: accent,
      hover: auto || !HEX.test(src.hover) ? tones.hover : src.hover.toLowerCase(),
      press: auto || !HEX.test(src.press) ? tones.press : src.press.toLowerCase(),
      auto: auto
    }, base);
  }

  function read() {
    try {
      return normalize(JSON.parse(root.localStorage.getItem(KEY) || "null"));
    } catch (err) {
      return normalize(null);
    }
  }

  function declarations(colors) {
    const accent = hexToRgb(colors.accent);
    const surface = surfaces(colors);
    const text = accentText(colors.accent, surface);
    const vars = {
      "--sn-accent": colors.accent,
      "--sn-hover": colors.hover,
      "--sn-press": colors.press,
      "--sn-accent-rgb": accent.join(","),
      "--sn-press-rgb": hexToRgb(colors.press).join(","),
      "--sn-on-accent": luminance(accent) > 0.35 ? "#171717" : "#ffffff",
      "--sn-accent-text": text,
      "--sn-bg": surface.bg,
      "--sn-flat": flatColorOf(colors, surface),
      "--sn-bg2": surface.bg2,
      "--sn-bg3": surface.bg3,
      "--sn-bg-hi": surface.hi,
      "--sn-border": surface.border,
      "--sn-text": surface.text,
      "--sn-muted": surface.muted,
      "--sn-text-rgb": hexToRgb(surface.text).join(","),
      "--sn-main-text": colors.tintText ? text : surface.text,
      "--sn-shadow": surface.scheme === "light" ? "rgba(60,50,30,.22)" : "rgba(0,0,0,.45)",
      "color-scheme": surface.scheme
    };
    return Object.keys(vars).map(function (k) { return k + ":" + vars[k]; }).join(";");
  }

  // Una hoja <style> propia (en vez de style en <html>) para que ningún código de Spotify pueda borrarla.
  function paint(colors) {
    const doc = root.document;
    let node = doc.getElementById(STYLE_ID);
    if (!node) {
      node = doc.createElement("style");
      node.id = STYLE_ID;
      (doc.head || doc.documentElement).appendChild(node);
    }
    node.textContent = ":root:root{" + declarations(colors) + "}";
    const scheme = surfaces(colors).scheme;
    doc.documentElement.setAttribute("data-sinton-scheme", scheme);
    if (colors.flat) doc.documentElement.setAttribute("data-sinton-flat", "1");
    else doc.documentElement.removeAttribute("data-sinton-flat");
  }

  let current = read();
  paint(current);

  function set(next) {
    current = normalize(Object.assign({}, current, next));
    try {
      root.localStorage.setItem(KEY, JSON.stringify(current));
    } catch (err) {
      console.error("[Sinton] no se pudieron guardar los colores", err);
    }
    paint(current);
    return current;
  }

  root.SintonColors = {
    DEFAULT: DEFAULT,
    get: function () { return Object.assign({}, current); },
    set: set,
    // Vuelve al verde de Spotify; el fondo no se toca.
    reset: function () { return set({ accent: DEFAULT.accent, auto: true }); },
    // Vuelve al fondo gris oscuro; el color principal no se toca.
    resetBackground: function () { return set({ bgMode: DEFAULT.bgMode, bg: DEFAULT.bg, flatColor: DEFAULT.flatColor }); },
    // Color liso real (ya suavizado) que se usará sin degradados.
    flatColor: function () { return flatColorOf(current, surfaces(current)); },
    flatTone: flatTone,
    derive: derive,
    surfaces: function () { return Object.assign({}, surfaces(current)); },
    rgb: function () { return hexToRgb(current.accent); },
    normalize: normalize
  };
})(window);

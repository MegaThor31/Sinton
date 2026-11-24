// pantalla-completa · lógica pura (sin DOM).
(function (root) {
  "use strict";
  const parts = (root.SintonParts = root.SintonParts || {});
  const part = (parts["pantalla-completa"] = parts["pantalla-completa"] || {});

  const BACKGROUNDS = [
    { id: "artist", label: "Foto del artista" },
    { id: "cover", label: "Portada" },
    { id: "blur", label: "Portada difuminada" }
  ];
  const DEFAULTS = { background: "artist", lyrics: true, nativeFullscreen: true, disc: "vinyl", queue: false };
  const DISCS = ["vinyl", "cover"];
  const FALLBACK_COLOR = [30, 215, 96];
  const SEEK_STEP_MS = 5000;

  function formatTime(ms) {
    const total = Math.max(0, Math.floor((Number(ms) || 0) / 1000));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = String(total % 60).padStart(2, "0");
    return hours > 0 ? hours + ":" + String(minutes).padStart(2, "0") + ":" + seconds : minutes + ":" + seconds;
  }

  function isBackground(id) {
    return BACKGROUNDS.some(function (item) { return item.id === id; });
  }

  function nextBackground(id) {
    const index = BACKGROUNDS.findIndex(function (item) { return item.id === id; });
    return BACKGROUNDS[(index + 1) % BACKGROUNDS.length].id;
  }

  function backgroundLabel(id) {
    const found = BACKGROUNDS.find(function (item) { return item.id === id; });
    return found ? found.label : BACKGROUNDS[0].label;
  }

  // images: { header, avatar, cover }. Devuelve { url, blurred }; si falta la del artista, cae a la portada difuminada.
  function pickBackground(mode, images) {
    const cover = images.cover || "";
    if (mode === "artist") {
      const artist = images.header || images.avatar || "";
      return artist ? { url: artist, blurred: false } : { url: cover, blurred: true };
    }
    return { url: cover, blurred: mode !== "cover" };
  }

  function fraction(clientX, left, width) {
    if (!(width > 0)) return 0;
    return Math.max(0, Math.min(1, (clientX - left) / width));
  }

  function seekTarget(position, duration, direction) {
    const target = position + direction * SEEK_STEP_MS;
    return Math.max(0, duration > 0 ? Math.min(target, duration - 500) : target);
  }

  // Hay letra que mostrar si se encontró, no es instrumental y tiene alguna línea con texto.
  function hasLyrics(result) {
    if (!result || !result.found || result.instrumental || result.error) return false;
    return Array.isArray(result.lines) && result.lines.some(function (line) { return line && String(line.text || "").trim(); });
  }

  function isDisc(id) {
    return DISCS.includes(id);
  }

  function nextDisc(id) {
    return DISCS[(DISCS.indexOf(id) + 1) % DISCS.length];
  }

  // Color dominante de una imagen (RGBA plano). Pesa más los píxeles saturados y descarta casi negros y
  // casi blancos para que el vinilo tome el color "vivo" de la portada.
  function dominantColor(pixels) {
    let r = 0;
    let g = 0;
    let b = 0;
    let weight = 0;
    for (let i = 0; i + 3 < (pixels ? pixels.length : 0); i += 4) {
      if (pixels[i + 3] < 128) continue;
      const pr = pixels[i];
      const pg = pixels[i + 1];
      const pb = pixels[i + 2];
      const max = Math.max(pr, pg, pb);
      const min = Math.min(pr, pg, pb);
      if (max < 40 || min > 225) continue;
      const w = 0.15 + (max - min) / 255;
      r += pr * w;
      g += pg * w;
      b += pb * w;
      weight += w;
    }
    if (weight === 0) return FALLBACK_COLOR.slice();
    return [Math.round(r / weight), Math.round(g / weight), Math.round(b / weight)];
  }

  // Asegura que el color se vea sobre fondo oscuro: sube la luminosidad si hace falta.
  function brighten(rgb, minLight) {
    const light = (Math.max.apply(null, rgb) + Math.min.apply(null, rgb)) / 510;
    const floor = typeof minLight === "number" ? minLight : 0.45;
    if (light >= floor) return rgb.slice();
    const factor = light > 0 ? floor / light : 1;
    return rgb.map(function (c) { return Math.min(255, Math.round(c * factor + (light > 0 ? 0 : floor * 255))); });
  }

  part.logic = {
    DISCS: DISCS,
    FALLBACK_COLOR: FALLBACK_COLOR,
    hasLyrics: hasLyrics,
    isDisc: isDisc,
    nextDisc: nextDisc,
    dominantColor: dominantColor,
    brighten: brighten,
    BACKGROUNDS: BACKGROUNDS,
    DEFAULTS: DEFAULTS,
    formatTime: formatTime,
    isBackground: isBackground,
    nextBackground: nextBackground,
    backgroundLabel: backgroundLabel,
    pickBackground: pickBackground,
    fraction: fraction,
    seekTarget: seekTarget
  };
})(typeof window !== "undefined" ? window : globalThis);

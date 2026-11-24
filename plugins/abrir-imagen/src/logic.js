// abrir-imagen · lógica pura (sin DOM).
(function (root) {
  "use strict";
  const parts = (root.SintonParts = root.SintonParts || {});
  const part = (parts["abrir-imagen"] = parts["abrir-imagen"] || {});

  const SPOTIFY_IMAGE_RE = /^https:\/\/(?:[a-z0-9-]+\.scdn\.co|[a-z0-9-]+\.spotifycdn\.com)\//i;

  // Extrae la URL de un valor CSS background-image: url("…").
  function backgroundUrl(cssValue) {
    const match = /url\((['"]?)(.*?)\1\)/.exec(String(cssValue || ""));
    return match ? match[2] : "";
  }

  function isSpotifyImage(url) {
    return SPOTIFY_IMAGE_RE.test(String(url || ""));
  }

  // Qué entradas de menú corresponden a cada tipo de elemento.
  function targetsFor(type) {
    if (type === "artist") return ["avatar", "header"];
    if (type === "track" || type === "album" || type === "playlist") return ["cover"];
    return [];
  }

  part.logic = { backgroundUrl: backgroundUrl, isSpotifyImage: isSpotifyImage, targetsFor: targetsFor };
})(typeof window !== "undefined" ? window : globalThis);

// letras · lógica pura (sin DOM): ajustes de desfase y tamaño.
(function (root) {
  "use strict";
  const parts = (root.SintonParts = root.SintonParts || {});
  const part = (parts.letras = parts.letras || {});

  const OFFSET_STEP = 250;
  const OFFSET_LIMIT = 15000;
  const OFFSETS_MAX = 200;
  const SIZES = [20, 24, 28, 34, 40, 48];
  const DEFAULT_SIZE = 28;

  function clampOffset(ms) {
    return Math.max(-OFFSET_LIMIT, Math.min(OFFSET_LIMIT, Math.round(ms / OFFSET_STEP) * OFFSET_STEP));
  }

  function formatOffset(ms) {
    if (!ms) return "0 s";
    return (ms > 0 ? "+" : "−") + (Math.abs(ms) / 1000).toLocaleString("es", { maximumFractionDigits: 2 }) + " s";
  }

  function stepSize(current, direction) {
    const index = SIZES.indexOf(current);
    const base = index === -1 ? SIZES.indexOf(DEFAULT_SIZE) : index;
    return SIZES[Math.max(0, Math.min(SIZES.length - 1, base + direction))];
  }

  // Guarda el desfase de una canción; 0 lo elimina. Conserva solo los más recientes.
  function setOffset(offsets, uri, ms) {
    const next = {};
    const keys = Object.keys(offsets).filter(function (key) { return key !== uri; });
    keys.slice(-(OFFSETS_MAX - 1)).forEach(function (key) { next[key] = offsets[key]; });
    const value = clampOffset(ms);
    if (value !== 0) next[uri] = value;
    return next;
  }

  function describe(result) {
    if (!result || !result.found) return "";
    if (result.instrumental) return "Instrumental · " + result.provider;
    return (result.synced ? "Sincronizada" : "Sin sincronizar") + " · " + result.provider;
  }

  part.logic = {
    OFFSET_STEP: OFFSET_STEP,
    DEFAULT_SIZE: DEFAULT_SIZE,
    clampOffset: clampOffset,
    formatOffset: formatOffset,
    stepSize: stepSize,
    setOffset: setOffset,
    describe: describe
  };
})(typeof window !== "undefined" ? window : globalThis);

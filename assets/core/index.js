// Sinton core · punto de entrada: publica window.SintonAPI para los plugins.
(function (root) {
  "use strict";
  const core = root.SintonCore;
  if (!core || !core.platform || !core.player || !core.data || !core.lyrics || !core.ui) {
    console.error("[Sinton] el núcleo no se cargó completo");
    return;
  }
  root.SintonPlugins = root.SintonPlugins || {};
  root.SintonParts = root.SintonParts || {};
  root.SintonAPI = Object.freeze({
    ready: core.platform.ready,
    platform: core.platform,
    uri: core.uri,
    player: core.player,
    data: core.data,
    images: core.images,
    lyrics: core.lyrics,
    ui: core.ui,
    storage: core.storage
  });
})(typeof window !== "undefined" ? window : globalThis);

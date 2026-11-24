// playlist-iconos · registro.
(function (root) {
  "use strict";
  const ID = "playlist-iconos";
  const api = root.SintonAPI;
  const part = root.SintonParts && root.SintonParts[ID];
  if (!api || !part || !part.logic || !part.ui) {
    console.error("[Sinton:" + ID + "] faltan piezas para iniciar");
    return;
  }
  let offCommand = null;

  function start() {
    if (offCommand) return;
    part.ui.start();
    offCommand = api.ui.registerCommand({
      id: ID + ":ajustes",
      plugin: ID,
      label: "Iconos de playlists: ajustes y actualizar",
      hint: "Qué playlists cuentan, cuántos iconos por canción y recarga del índice.",
      run: part.ui.openSettings
    });
  }

  function stop() {
    part.ui.stop();
    if (offCommand) offCommand();
    offCommand = null;
  }

  root.SintonPlugins[ID] = { start: start, stop: stop };
  api.ready().then(start).catch(function (err) {
    console.error("[Sinton:" + ID + "] no se pudo iniciar", err);
  });
})(window);

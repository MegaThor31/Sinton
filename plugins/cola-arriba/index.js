// cola-arriba · registro: menú contextual y botones del panel de la cola.
(function (root) {
  "use strict";
  const ID = "cola-arriba";
  const api = root.SintonAPI;
  const part = root.SintonParts && root.SintonParts[ID];
  if (!api || !part || !part.logic || !part.ui) {
    console.error("[Sinton:" + ID + "] faltan piezas para iniciar");
    return;
  }
  let disposers = [];

  function start() {
    if (disposers.length > 0) return;
    part.ui.start();
    disposers.push(api.ui.registerMenuItem({
      id: ID + ":subir",
      plugin: ID,
      label: "Subir al principio de la cola",
      when: function (uris) { return uris.length === 1 && part.logic.isMovable(uris[0]); },
      run: function (uris) { return part.ui.moveToTop(uris[0]); }
    }));
    disposers.push(part.ui.stop);
  }

  function stop() {
    disposers.forEach(function (dispose) { dispose(); });
    disposers = [];
  }

  root.SintonPlugins[ID] = { start: start, stop: stop };
  api.ready().then(start).catch(function (err) {
    console.error("[Sinton:" + ID + "] no se pudo iniciar", err);
  });
})(window);

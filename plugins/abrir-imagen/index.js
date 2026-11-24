// abrir-imagen · registro: menú contextual, Alt+clic y acción.
(function (root) {
  "use strict";
  const ID = "abrir-imagen";
  const api = root.SintonAPI;
  const part = root.SintonParts && root.SintonParts[ID];
  if (!api || !part || !part.logic || !part.ui) {
    console.error("[Sinton:" + ID + "] faltan piezas para iniciar");
    return;
  }
  const LABELS = {
    cover: "Abrir portada en el navegador",
    avatar: "Abrir foto del artista en el navegador",
    header: "Abrir cabecera del artista en el navegador"
  };
  let disposers = [];

  function start() {
    if (disposers.length > 0) return;
    part.ui.start();
    Object.keys(LABELS).forEach(function (target) {
      disposers.push(api.ui.registerMenuItem({
        id: ID + ":" + target,
        plugin: ID,
        label: LABELS[target],
        when: function (uris) {
          return uris.length === 1 && part.logic.targetsFor(api.uri.type(uris[0])).includes(target);
        },
        run: function (uris) { return part.ui.openFor(uris[0], target); }
      }));
    });
    disposers.push(api.ui.registerCommand({
      id: ID + ":actual",
      plugin: ID,
      label: "Abrir la portada de la canción que suena",
      hint: "También: Alt+clic sobre cualquier imagen de Spotify.",
      run: part.ui.openCurrent
    }));
  }

  function stop() {
    part.ui.stop();
    disposers.forEach(function (dispose) { dispose(); });
    disposers = [];
  }

  root.SintonPlugins[ID] = { start: start, stop: stop };
  api.ready().then(start).catch(function (err) {
    console.error("[Sinton:" + ID + "] no se pudo iniciar", err);
  });
})(window);

// marcas · registro: filas, menú contextual y acciones.
(function (root) {
  "use strict";
  const ID = "marcas";
  const api = root.SintonAPI;
  const part = root.SintonParts && root.SintonParts[ID];
  if (!api || !part || !part.logic || !part.ui) {
    console.error("[Sinton:" + ID + "] faltan piezas para iniciar");
    return;
  }
  const FILTERABLE = ["playlist", "album", "liked"];
  let disposers = [];

  function isTrack(uri) {
    const type = api.uri.type(uri);
    return type === "track" || type === "local";
  }

  function start() {
    if (disposers.length > 0) return;
    part.ui.start();
    disposers.push(api.ui.registerMenuItem({
      id: ID + ":marcar",
      plugin: ID,
      label: "Marcar…",
      when: function (uris) { return uris.length > 0 && uris.every(isTrack); },
      run: function (uris) { part.ui.openPicker(uris); }
    }));
    disposers.push(api.ui.registerMenuItem({
      id: ID + ":filtrar",
      plugin: ID,
      label: "Filtrar por marcas",
      when: function (uris) { return uris.length === 1 && FILTERABLE.includes(api.uri.type(uris[0])); },
      run: function (uris) { part.ui.openFilter(uris[0]); }
    }));
    disposers.push(api.ui.registerCommand({
      id: ID + ":filtrar",
      plugin: ID,
      label: "Filtrar por marcas la lista abierta",
      hint: "Funciona en playlists, álbumes y Canciones que te gustan.",
      run: function () {
        const source = part.ui.currentSource();
        if (!source) return api.ui.toast("Abre una playlist, un álbum o tus canciones que te gustan.", { error: true });
        part.ui.openFilter(source);
      }
    }));
    disposers.push(api.ui.registerCommand({
      id: ID + ":gestionar",
      plugin: ID,
      label: "Gestionar marcas",
      hint: "Crear, renombrar, cambiar color, borrar, exportar e importar.",
      run: function () { part.ui.openManager(); }
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

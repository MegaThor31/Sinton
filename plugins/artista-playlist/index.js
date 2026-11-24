// artista-playlist · registro: menú contextual de artistas y acción en la galería.
(function (root) {
  "use strict";
  const ID = "artista-playlist";
  const api = root.SintonAPI;
  const part = root.SintonParts && root.SintonParts[ID];
  if (!api || !part || !part.logic || !part.ui) {
    console.error("[Sinton:" + ID + "] faltan piezas para iniciar");
    return;
  }
  let disposers = [];

  function start() {
    if (disposers.length > 0) return;
    disposers.push(api.ui.registerMenuItem({
      id: ID + ":crear",
      plugin: ID,
      label: "Crear playlist con todas sus canciones",
      when: function (uris) { return uris.length === 1 && api.uri.type(uris[0]) === "artist"; },
      run: function (uris) { part.ui.open(uris[0]); }
    }));
    disposers.push(api.ui.registerCommand({
      id: ID + ":crear",
      plugin: ID,
      label: "Playlist con todas las canciones de un artista",
      hint: "Usa el artista de la página abierta o, si no, el de la canción que suena.",
      run: function () {
        const artist = part.ui.contextArtist();
        if (!artist) return api.ui.toast("Abre la página de un artista o reproduce una canción suya.", { error: true });
        part.ui.open(artist);
      }
    }));
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

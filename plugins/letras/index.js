// letras · registro: botón en la barra de reproducción, atajo Alt+L y acción.
(function (root) {
  "use strict";
  const ID = "letras";
  const api = root.SintonAPI;
  const part = root.SintonParts && root.SintonParts[ID];
  if (!api || !part || !part.logic || !part.ui) {
    console.error("[Sinton:" + ID + "] faltan piezas para iniciar");
    return;
  }
  // Icono de micrófono.
  const ICON = "M8 1a2.5 2.5 0 0 0-2.5 2.5v4a2.5 2.5 0 0 0 5 0v-4A2.5 2.5 0 0 0 8 1zM3.5 7a.75.75 0 0 1 .75.75 3.75 3.75 0 0 0 7.5 0 .75.75 0 0 1 1.5 0 5.25 5.25 0 0 1-4.5 5.2v1.55h1.5a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1 0-1.5h1.5v-1.55a5.25 5.25 0 0 1-4.5-5.2A.75.75 0 0 1 3.5 7z";
  // Botón de letra nativo: se sustituye por el nuestro para que solo haya un icono de letra.
  const NATIVE_LYRICS = '[data-testid="lyrics-button"]';
  let button = null;
  let offCommand = null;

  function start() {
    if (button) return;
    button = api.ui.playbarButton({ id: ID, label: "Letras+ (Alt+L)", iconPath: ICON, onClick: part.ui.toggle, replaces: NATIVE_LYRICS });
    part.ui.start(function (open) {
      if (button) button.setActive(open);
    });
    offCommand = api.ui.registerCommand({
      id: ID + ":abrir",
      plugin: ID,
      label: "Abrir o cerrar Letras+",
      hint: "Atajo: Alt+L. También con el botón del micrófono de la barra de reproducción.",
      run: part.ui.toggle
    });
  }

  function stop() {
    part.ui.stop();
    if (button) button.remove();
    button = null;
    if (offCommand) offCommand();
    offCommand = null;
  }

  root.SintonPlugins[ID] = { start: start, stop: stop };
  api.ready().then(start).catch(function (err) {
    console.error("[Sinton:" + ID + "] no se pudo iniciar", err);
  });
})(window);

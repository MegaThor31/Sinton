// pantalla-completa · registro: botón en la barra de reproducción, atajo Alt+Intro y acción.
(function (root) {
  "use strict";
  const ID = "pantalla-completa";
  const api = root.SintonAPI;
  const part = root.SintonParts && root.SintonParts[ID];
  if (!api || !part || !part.logic || !part.ui) {
    console.error("[Sinton:" + ID + "] faltan piezas para iniciar");
    return;
  }
  // Icono de expandir.
  const ICON = "M1 1h5.25v1.5H2.5v3.75H1V1zm8.75 0H15v5.25h-1.5V2.5H9.75V1zM1 9.75h1.5v3.75h3.75V15H1V9.75zm12.5 0H15V15H9.75v-1.5h3.75V9.75z";
  // Botón de pantalla completa nativo: se sustituye por el nuestro.
  const NATIVE_FULLSCREEN = '[data-testid="fullscreen-mode-button"]';
  let button = null;
  let offCommand = null;

  function start() {
    if (button) return;
    button = api.ui.playbarButton({ id: ID, label: "Pantalla completa de Sinton (Alt+Intro)", iconPath: ICON, onClick: part.ui.toggle, replaces: NATIVE_FULLSCREEN });
    part.ui.start(function (open) {
      if (button) button.setActive(open);
    });
    offCommand = api.ui.registerCommand({
      id: ID + ":abrir",
      plugin: ID,
      label: "Abrir la pantalla completa",
      hint: "Atajo: Alt+Intro. Dentro: Esc, Espacio, ← →, N, P, L (letra), B (fondo), V (vinilo) y Q (cola).",
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

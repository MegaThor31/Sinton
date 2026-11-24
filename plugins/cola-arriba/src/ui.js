// cola-arriba · interfaz: botón en las filas del panel de la cola.
(function (root) {
  "use strict";
  const ID = "cola-arriba";
  const part = (root.SintonParts[ID] = root.SintonParts[ID] || {});
  const api = root.SintonAPI;
  const logic = part.logic;
  const FIBER_DEPTH = 8;
  // Flecha hacia arriba con tope.
  const ICON = "M2 1.75A.75.75 0 0 1 2.75 1h10.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 1.75zm6 2a.75.75 0 0 1 .53.22l4 4a.75.75 0 1 1-1.06 1.06L8.75 6.31v7.94a.75.75 0 0 1-1.5 0V6.31L4.53 9.03a.75.75 0 0 1-1.06-1.06l4-4A.75.75 0 0 1 8 3.75z";

  // Selectores de Spotify (si la interfaz cambia, se corrige solo aquí).
  const SEL = {
    row: '[aria-posinset]',
    trackRow: '[data-testid="tracklist-row"]',
    more: 'button[aria-haspopup]'
  };

  let offDom = null;

  function rowItem(row) {
    let fiber = api.platform.fiberOf(row);
    for (let depth = 0; fiber && depth < FIBER_DEPTH; depth += 1) {
      const item = logic.queueItem(fiber.memoizedProps);
      if (item) return item;
      fiber = fiber.return;
    }
    return null;
  }

  async function moveToTop(uri, uid) {
    const result = await api.player.moveToTop(uri, uid);
    api.ui.toast(logic.message(result), { ms: 2500 });
  }

  function makeButton(item) {
    const node = api.ui.el("button", "sn-qt-btn");
    node.type = "button";
    node.title = "Subir al principio de la cola";
    node.setAttribute("aria-label", "Subir al principio de la cola");
    node.append(api.ui.icon(ICON, 16));
    node.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      moveToTop(item.uri, item.uid).catch(function (err) { api.ui.fail(ID, "Subir en la cola", err); });
    });
    // La fila usa mousedown/dblclick para seleccionar y reproducir: no se le deja llegar.
    ["mousedown", "dblclick", "pointerdown"].forEach(function (type) {
      node.addEventListener(type, function (event) { event.stopPropagation(); });
    });
    return node;
  }

  function decorate() {
    const state = api.player.state();
    const playing = state && state.item;
    document.querySelectorAll(SEL.row).forEach(function (row) {
      if (row.closest(SEL.trackRow)) return;
      const item = rowItem(row);
      const old = row.querySelector(":scope .sn-qt-btn");
      const stamp = item ? item.uri + "|" + item.uid : "";
      if (old && old.dataset.snStamp === stamp && !logic.isCurrent(item, playing)) return;
      if (old) old.remove();
      if (!item || logic.isCurrent(item, playing)) return;
      const node = makeButton(item);
      node.dataset.snStamp = stamp;
      const buttons = row.querySelectorAll(SEL.more);
      const more = buttons.length > 0 ? buttons[buttons.length - 1] : null;
      if (more && more.parentElement) more.parentElement.insertBefore(node, more);
      else row.append(node);
      row.classList.add("sn-qt-row");
    });
  }

  function start() {
    if (!offDom) offDom = api.ui.onDom(decorate);
  }

  function stop() {
    if (offDom) offDom();
    offDom = null;
    document.querySelectorAll(".sn-qt-btn").forEach(function (node) { node.remove(); });
    document.querySelectorAll(".sn-qt-row").forEach(function (node) { node.classList.remove("sn-qt-row"); });
  }

  part.ui = { start: start, stop: stop, moveToTop: moveToTop };
})(window);

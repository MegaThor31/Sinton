// abrir-imagen · interfaz: resuelve la imagen de cada elemento y la abre en el navegador.
(function (root) {
  "use strict";
  const ID = "abrir-imagen";
  const part = (root.SintonParts[ID] = root.SintonParts[ID] || {});
  const api = root.SintonAPI;
  const logic = part.logic;
  const ANCESTOR_DEPTH = 4;

  async function openUrl(value) {
    if (!value) throw new Error("Este elemento no tiene imagen.");
    const found = await api.images.best(value);
    if (!found) throw new Error("No se pudo cargar la imagen.");
    root.open(found.url);
    api.ui.toast("Imagen abierta en el navegador (" + found.width + "×" + found.height + ").");
  }

  async function coverOf(uri) {
    const type = api.uri.type(uri);
    if (type === "track") {
      const current = api.player.current();
      if (current && current.uri === uri && current.image) return current.image;
      return api.data.trackCover(uri);
    }
    if (type === "album") return (await api.data.albumTracks(uri)).cover;
    if (type === "playlist") return (await api.data.playlistInfo(uri)).image;
    return "";
  }

  async function openFor(uri, target) {
    if (target === "cover") return openUrl(await coverOf(uri));
    const visuals = await api.data.artistVisuals(uri);
    const value = target === "header" ? visuals.header : visuals.avatar;
    if (!value) throw new Error(target === "header" ? "Este artista no tiene imagen de cabecera." : "Este artista no tiene foto.");
    return openUrl(value);
  }

  function openCurrent() {
    const current = api.player.current();
    if (!current || !current.image) throw new Error("No hay ninguna canción sonando.");
    return openUrl(current.image);
  }

  // Imagen de Spotify bajo el cursor: <img> o fondo CSS del elemento o de sus contenedores cercanos.
  function imageAt(x, y) {
    for (const node of document.elementsFromPoint(x, y)) {
      if (node.tagName === "IMG" && logic.isSpotifyImage(node.currentSrc || node.src)) return node.currentSrc || node.src;
      let current = node;
      for (let depth = 0; current && depth < ANCESTOR_DEPTH; depth += 1) {
        const img = current.querySelector ? current.querySelector(":scope > img") : null;
        if (img && logic.isSpotifyImage(img.currentSrc || img.src)) return img.currentSrc || img.src;
        const background = logic.backgroundUrl(root.getComputedStyle(current).backgroundImage);
        if (logic.isSpotifyImage(background)) return background;
        current = current.parentElement;
      }
    }
    return "";
  }

  function onClick(event) {
    if (!event.altKey || event.button !== 0) return;
    const url = imageAt(event.clientX, event.clientY);
    if (!url) return;
    event.preventDefault();
    event.stopPropagation();
    openUrl(url).catch(function (err) { api.ui.fail(ID, "Abrir imagen", err); });
  }

  function start() {
    document.addEventListener("click", onClick, true);
  }

  function stop() {
    document.removeEventListener("click", onClick, true);
  }

  part.ui = { start: start, stop: stop, openFor: openFor, openCurrent: openCurrent };
})(window);

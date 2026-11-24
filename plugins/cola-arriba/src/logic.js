// cola-arriba · lógica pura (sin DOM).
(function (root) {
  "use strict";
  const parts = (root.SintonParts = root.SintonParts || {});
  const part = (parts["cola-arriba"] = parts["cola-arriba"] || {});

  const MOVABLE = /^spotify:(track|episode|local):/;
  const MESSAGES = {
    moved: "Subida al principio de la cola.",
    added: "Sonará a continuación.",
    first: "Ya es la siguiente de la cola."
  };

  function isMovable(uri) {
    return typeof uri === "string" && MOVABLE.test(uri);
  }

  // Props de una fila del panel de la cola: { item: { uri, uid }, index, section, usePlayContextItem }.
  function queueItem(props) {
    if (!props || typeof props !== "object" || !("section" in props)) return null;
    if (typeof props.usePlayContextItem !== "function") return null;
    const item = props.item;
    if (!item || !isMovable(item.uri)) return null;
    return { uri: item.uri, uid: item.uid || "" };
  }

  // La fila de "Sonando ahora" no se sube: es la canción actual.
  function isCurrent(item, playing) {
    if (!item || !playing) return false;
    if (item.uid && playing.uid) return item.uid === playing.uid;
    return false;
  }

  function message(result) {
    return MESSAGES[result] || MESSAGES.added;
  }

  part.logic = { isMovable: isMovable, queueItem: queueItem, isCurrent: isCurrent, message: message };
})(typeof window !== "undefined" ? window : globalThis);

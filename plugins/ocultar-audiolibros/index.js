(function () {
  "use strict";
  try {
    // ===== Configuración =====
    const ID = "ocultar-audiolibros";
    const ATTR = "data-sp-ocultar-audiolibros";
    const STYLE_ID = "sp-ocultar-audiolibros-style";
    const THROTTLE_MS = 200;
    const MAX_LABEL_LENGTH = 20;
    const MAX_HEADING_LENGTH = 80;

    // Selectores de Spotify (si la interfaz cambia, se corrige solo aquí).
    // Chips y botones cuyo texto es exactamente "Audiolibros".
    const LABEL_SELECTOR = '[data-encore-id="chip"], button, [role="button"], [role="tab"], a';
    // Encabezados de sección y contenedor que se oculta entero.
    const HEADING_SELECTOR = "h2, h3";
    const SHELF_SELECTOR = "section";

    // ===== Lógica (sin DOM) =====
    function normalize(text) {
      return (text || "").replace(/\s+/g, " ").trim().toLowerCase();
    }

    function isAudiobookLabel(text) {
      const value = normalize(text);
      return value === "audiolibros" || value === "audiobooks";
    }

    function isAudiobookHeading(text) {
      const value = normalize(text);
      return value.length > 0 && value.length <= MAX_HEADING_LENGTH && /audiolibro|audiobook/.test(value);
    }

    // ===== Interfaz =====
    let observer = null;
    let timer = null;

    function injectStyle() {
      if (document.getElementById(STYLE_ID)) return;
      const style = document.createElement("style");
      style.id = STYLE_ID;
      style.textContent = "[" + ATTR + "]{display:none !important}";
      document.head.appendChild(style);
    }

    function hide(node) {
      node.setAttribute(ATTR, "1");
    }

    function hideLabelIfMatch(node) {
      if (node.hasAttribute(ATTR)) return;
      const text = node.textContent || "";
      if (text.length > MAX_LABEL_LENGTH) return;
      if (isAudiobookLabel(text)) hide(node);
    }

    function hideShelfIfMatch(heading) {
      if (!isAudiobookHeading(heading.textContent)) return;
      const shelf = heading.closest(SHELF_SELECTOR);
      if (shelf && !shelf.hasAttribute(ATTR) && !shelf.matches("main, #main")) hide(shelf);
    }

    // Revisa un nodo, sus descendientes y los ancestros que pueden haber cambiado de texto.
    function inspect(node) {
      const element = node.nodeType === 1 ? node : node.parentElement;
      if (!element) return;
      const label = element.closest(LABEL_SELECTOR);
      if (label) hideLabelIfMatch(label);
      const heading = element.closest(HEADING_SELECTOR);
      if (heading) hideShelfIfMatch(heading);
      if (node.nodeType !== 1) return;
      node.querySelectorAll(LABEL_SELECTOR).forEach(hideLabelIfMatch);
      node.querySelectorAll(HEADING_SELECTOR).forEach(hideShelfIfMatch);
    }

    function scan() {
      document.querySelectorAll(LABEL_SELECTOR).forEach(hideLabelIfMatch);
      document.querySelectorAll(HEADING_SELECTOR).forEach(hideShelfIfMatch);
    }

    // El observador corre como microtarea, antes de que el navegador pinte: lo nuevo se oculta sin parpadeo.
    function onMutations(records) {
      try {
        for (const record of records) {
          if (record.type === "childList") {
            record.addedNodes.forEach(inspect);
            inspect(record.target);
          } else if (record.type === "characterData") {
            inspect(record.target);
          }
        }
      } catch (err) {
        console.error("[Sinton:" + ID + "] error al ocultar", err);
      }
      schedule();
    }

    // Revisión completa diferida por si algo cambió sin generar mutaciones útiles.
    function schedule() {
      if (timer) return;
      timer = window.setTimeout(function () {
        timer = null;
        try {
          scan();
        } catch (err) {
          console.error("[Sinton:" + ID + "] error al buscar", err);
        }
      }, THROTTLE_MS);
    }

    function start() {
      if (observer) return;
      injectStyle();
      scan();
      observer = new MutationObserver(onMutations);
      observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    }

    function stop() {
      if (observer) observer.disconnect();
      observer = null;
      if (timer) window.clearTimeout(timer);
      timer = null;
      document.querySelectorAll("[" + ATTR + "]").forEach(function (node) {
        node.removeAttribute(ATTR);
      });
      const style = document.getElementById(STYLE_ID);
      if (style) style.remove();
    }

    window.SintonPlugins = window.SintonPlugins || {};
    window.SintonPlugins[ID] = { start: start, stop: stop };
    start();
  } catch (err) {
    console.error("[Sinton:ocultar-audiolibros] error al iniciar", err);
  }
})();

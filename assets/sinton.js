(function () {
  "use strict";
  try {
    const VERSION = "0.1.0";
    const state = window.__SINTON_STATE__ || { themes: [], plugins: [] };
    const BTN_ID = "sinton-gallery-button";
    const PANEL_ID = "sinton-gallery";
    const STYLE_ID = "sinton-gallery-style";
    const STORAGE_KEY = "sinton:plugins:disabled";
    const FALLBACK_MS = 8000;
    const FWD_LABEL = /^(adelante|forward|go forward|avanzar)$/i;
    const ICON = '<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M1 1h6v6H1V1zm8 0h6v6H9V1zM1 9h6v6H1V9zm8 0h6v6H9V9z"/></svg>';
    const CSS = [
      ".sg-btn{width:32px;height:32px;border-radius:50%;border:0;margin-inline-start:8px;display:inline-flex;align-items:center;justify-content:center;align-self:center;background:var(--sn-bg2,#242424);color:var(--sn-accent-text,var(--sn-accent,#1ed760));cursor:pointer;flex:0 0 auto;padding:0;-webkit-app-region:no-drag;opacity:1;transition:opacity 220ms ease-out}",
      ".sg-btn.sg-hidden{opacity:0;pointer-events:none}",
      ".sg-btn:hover{background:var(--sn-border,#353535);color:var(--sn-accent-text,var(--sn-hover,#3be477))}",
      ".sg-btn:active{background:var(--sn-bg3,#171717)}",
      ".sg-btn:focus-visible{outline:2px solid var(--sn-hover,#3be477);outline-offset:2px}",
      ".sg-btn.sg-floating{position:fixed;left:12px;bottom:100px;z-index:2147483000;box-shadow:0 4px 14px rgba(0,0,0,.4)}",
      ".sg-overlay{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.6);-webkit-app-region:no-drag;animation:sg-fade 160ms ease-out}",
      ".sg-box{width:min(760px,92vw);max-height:82vh;display:flex;flex-direction:column;background:var(--sn-bg,#202020);color:var(--sn-text,#e6e6e6);border:1px solid var(--sn-border,#353535);border-radius:12px;box-shadow:0 16px 48px rgba(0,0,0,.6);font-family:inherit;animation:sg-rise 200ms cubic-bezier(.2,.8,.2,1)}",
      ".sg-head{display:flex;align-items:center;justify-content:space-between;padding:16px 20px 8px}",
      ".sg-title{margin:0;font-size:20px;font-weight:700;color:var(--sn-accent-text,var(--sn-accent,#1ed760))}",
      ".sg-sub{margin:2px 0 0;font-size:12px;color:var(--sn-muted,#b4b4b4)}",
      ".sg-close{background:var(--sn-bg2,#242424);color:var(--sn-text,#e6e6e6);border:0;border-radius:8px;padding:6px 12px;cursor:pointer;font:inherit}",
      ".sg-close:hover{background:var(--sn-border,#353535)}",
      ".sg-tabs{display:flex;gap:4px;padding:0 20px;border-bottom:1px solid var(--sn-border,#353535)}",
      ".sg-tab{background:none;border:0;border-bottom:2px solid transparent;color:var(--sn-muted,#b4b4b4);padding:10px 14px;cursor:pointer;font:inherit}",
      ".sg-tab:hover{color:var(--sn-text,#e6e6e6)}",
      ".sg-tab[aria-selected=true]{color:var(--sn-accent-text,var(--sn-accent,#1ed760));border-bottom-color:var(--sn-accent,#1ed760)}",
      ".sg-body{padding:16px 20px 20px;overflow:auto;display:grid;gap:12px}",
      ".sg-banner{display:flex;align-items:center;justify-content:space-between;gap:12px;background:rgba(var(--sn-accent-rgb,30,215,96),.12);border:1px solid var(--sn-accent,#1ed760);color:var(--sn-accent-text,var(--sn-hover,#3be477));border-radius:12px;padding:10px 14px;font-size:13px}",
      ".sg-reload{font:inherit;font-weight:600;background:var(--sn-accent,#1ed760);color:var(--sn-on-accent,#171717);border:0;border-radius:8px;padding:6px 12px;cursor:pointer;white-space:nowrap}",
      ".sg-reload:hover{background:var(--sn-hover,#3be477)}",
      ".sg-card{background:var(--sn-bg2,#242424);border:1px solid var(--sn-border,#353535);border-radius:12px;padding:14px 16px}",
      ".sg-card-head{display:flex;align-items:center;justify-content:space-between;gap:12px}",
      ".sg-card-title{margin:0;font-size:16px;font-weight:600;color:var(--sn-text,#fff)}",
      ".sg-card-text{margin:6px 0 0;color:var(--sn-muted,#b4b4b4);font-size:13px}",
      ".sg-badges{display:flex;align-items:center;gap:6px}",
      ".sg-badge{display:inline-flex;align-items:center;gap:6px;border-radius:999px;padding:3px 10px;font-size:12px;font-weight:600;white-space:nowrap}",
      ".sg-badge::before{content:'';width:8px;height:8px;border-radius:50%;background:currentColor}",
      ".sg-on{background:rgba(var(--sn-accent-rgb,30,215,96),.15);color:var(--sn-accent-text,var(--sn-accent,#1ed760))}",
      ".sg-off{background:var(--sn-border,#353535);color:var(--sn-muted,#b4b4b4)}",
      ".sg-bad{background:rgba(var(--sn-press-rgb,26,188,84),.2);color:var(--sn-press,#1abc54)}",
      ".sg-pending{background:var(--sn-bg3,#171717);color:var(--sn-accent-text,var(--sn-hover,#3be477))}",
      ".sg-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}",
      ".sg-chip{background:var(--sn-bg3,#171717);color:var(--sn-text,#e6e6e6);border-radius:999px;padding:3px 10px;font-size:12px}",
      ".sg-row{margin-top:12px}",
      ".sg-switch{display:inline-flex;align-items:center;gap:10px;background:none;border:0;color:var(--sn-text,#e6e6e6);cursor:pointer;font:inherit;padding:0}",
      ".sg-switch-track{width:36px;height:20px;border-radius:999px;background:var(--sn-border,#353535);position:relative;display:inline-block}",
      ".sg-switch-track::after{content:'';position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:#fff;transition:transform 160ms ease-out}",
      ".sg-switch[aria-checked=true] .sg-switch-track{background:var(--sn-accent,#1ed760)}",
      ".sg-switch[aria-checked=true] .sg-switch-track::after{transform:translateX(16px)}",
      ".sg-switch:focus-visible .sg-switch-track{outline:2px solid var(--sn-hover,#3be477);outline-offset:2px}",
      ".sg-hint{margin:12px 0 4px;font-size:12px;color:var(--sn-muted,#b4b4b4)}",
      ".sg-cmd{display:block;background:var(--sn-bg3,#171717);color:var(--sn-accent-text,var(--sn-hover,#3be477));border-radius:8px;padding:8px 10px;font-family:Consolas,monospace;font-size:12px;user-select:text;word-break:break-all}",
      ".sg-action{display:flex;align-items:center;justify-content:space-between;gap:12px;background:var(--sn-bg2,#242424);border:1px solid var(--sn-border,#353535);border-radius:12px;padding:10px 14px}",
      ".sg-action-title{margin:0;font-size:14px;font-weight:600;color:var(--sn-text,#fff)}",
      ".sg-action-hint{margin:2px 0 0;font-size:12px;color:var(--sn-muted,#b4b4b4)}",
      ".sg-colors{display:flex;flex-direction:column;gap:16px}",
      ".sg-section{margin:8px 0 0;font-size:14px;font-weight:700;color:var(--sn-text,#fff)}",
      ".sg-seg{display:flex;gap:8px;flex-wrap:wrap}",
      ".sg-segbtn{font:inherit;font-size:13px;font-weight:600;background:var(--sn-bg2,#242424);color:var(--sn-text,#e6e6e6);border:1px solid var(--sn-border,#353535);border-radius:8px;padding:6px 14px;cursor:pointer}",
      ".sg-segbtn[aria-pressed=true]{border-color:var(--sn-accent,#1ed760);color:var(--sn-accent-text,var(--sn-accent,#1ed760))}",
      ".sg-bgprev{display:flex;gap:8px;flex-wrap:wrap}",
      ".sg-bgchip{border:1px solid;border-radius:8px;padding:8px 14px;font-size:12px}",
      ".sg-swatches{display:flex;gap:10px;flex-wrap:wrap}",
      ".sg-flatgroup{display:flex;flex-direction:column;gap:10px;padding-left:24px}.sg-flatgroup[hidden]{display:none}",
      ".sg-swatch{width:28px;height:28px;border-radius:50%;border:2px solid transparent;cursor:pointer;padding:0}",
      ".sg-swatch:hover{transform:scale(1.12)}",
      ".sg-swatch[aria-pressed=true]{border-color:var(--sn-text,#fff)}",
      ".sg-swatch:focus-visible{outline:2px solid var(--sn-hover,#3be477);outline-offset:2px}",
      ".sg-pickers{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}",
      ".sg-picker{display:flex;flex-direction:column;gap:6px;font-size:12px;color:var(--sn-muted,#b4b4b4)}",
      ".sg-picker input[type=color]{width:100%;height:40px;padding:0;border:1px solid var(--sn-border,#353535);border-radius:8px;background:var(--sn-bg3,#171717);cursor:pointer}",
      ".sg-picker input[type=color]:disabled{opacity:.45;cursor:not-allowed}",
      ".sg-preview{display:flex;gap:10px;align-items:center;flex-wrap:wrap}",
      ".sg-prev{border:0;border-radius:8px;padding:7px 14px;font:inherit;font-weight:600;color:var(--sn-on-accent,#171717);cursor:default}",
      ".sg-run{font:inherit;font-size:13px;font-weight:600;background:var(--sn-accent,#1ed760);color:var(--sn-on-accent,#171717);border:0;border-radius:8px;padding:6px 14px;cursor:pointer;white-space:nowrap}",
      ".sg-run:hover{background:var(--sn-hover,#3be477)}",
      ".sg-run:active{background:var(--sn-press,#1abc54)}",
      ".sg-empty{color:var(--sn-muted,#b4b4b4);font-size:14px;padding:24px 8px;text-align:center;line-height:1.5}",
      "@keyframes sg-fade{from{opacity:0}to{opacity:1}}",
      "@keyframes sg-rise{from{opacity:0;transform:translateY(12px) scale(.98)}to{opacity:1;transform:none}}",
      "@media (prefers-reduced-motion:reduce){.sg-overlay,.sg-box{animation:none}.sg-btn{transition:none}.sg-switch-track::after{transition:none}}"
    ].join(" ");

    const startedAt = Date.now();
    let tab = "themes";
    let panel = null;
    let bodyEl = null;
    let tabEls = {};
    let button = null;
    let lastFocus = null;
    let timer = null;
    let revealQueued = false;

    function el(tag, className, text) {
      const node = document.createElement(tag);
      if (className) node.className = className;
      if (text !== undefined) node.textContent = text;
      return node;
    }

    function getDisabled() {
      try {
        const raw = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
        return new Set(Array.isArray(raw) ? raw.filter(function (id) { return typeof id === "string"; }) : []);
      } catch (err) {
        return new Set();
      }
    }

    function saveDisabled(set) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(set)));
      } catch (err) {
        console.error("[Sinton] no se pudo guardar la preferencia", err);
      }
    }

    function isOn(item, kind) {
      if (kind === "plugin") return Boolean(item.enabled) && !getDisabled().has(item.id);
      return Boolean(item.enabled);
    }

    function isPending(plugin) {
      return Boolean(plugin.enabled) && isOn(plugin, "plugin") !== Boolean(plugin.loaded);
    }

    function togglePlugin(plugin) {
      const disabled = getDisabled();
      if (disabled.has(plugin.id)) disabled.delete(plugin.id);
      else disabled.add(plugin.id);
      saveDisabled(disabled);
      render();
    }

    function injectStyle() {
      if (document.getElementById(STYLE_ID)) return;
      const style = document.createElement("style");
      style.id = STYLE_ID;
      style.textContent = CSS;
      document.head.appendChild(style);
    }

    function badge(item, kind) {
      const on = isOn(item, kind);
      const text = item.failed ? "Error al cargar" : on ? "Activo" : "Inactivo";
      const css = item.failed ? " sg-bad" : on ? " sg-on" : " sg-off";
      return el("span", "sg-badge" + css, text);
    }

    function switchRow(plugin) {
      const row = el("div", "sg-row");
      const on = isOn(plugin, "plugin");
      const toggle = el("button", "sg-switch");
      toggle.type = "button";
      toggle.setAttribute("role", "switch");
      toggle.setAttribute("aria-checked", String(on));
      toggle.append(el("span", "sg-switch-track"), el("span", "", on ? "Activado" : "Desactivado"));
      toggle.addEventListener("click", function () {
        togglePlugin(plugin);
      });
      row.append(toggle);
      return row;
    }

    function commandRow(item, kind, text) {
      const row = el("div", "sg-row");
      row.append(
        el("p", "sg-hint", text),
        el("code", "sg-cmd", "node bin/sinton.js " + kind + " " + item.id + " " + (item.enabled ? "off" : "on"))
      );
      return row;
    }

    function card(item, kind) {
      const node = el("article", "sg-card");
      const head = el("div", "sg-card-head");
      const badges = el("div", "sg-badges");
      badges.append(badge(item, kind));
      if (kind === "plugin" && isPending(item)) badges.append(el("span", "sg-badge sg-pending", "Pendiente de recargar"));
      head.append(el("h3", "sg-card-title", item.name), badges);
      node.append(head);
      if (item.description) node.append(el("p", "sg-card-text", item.description));
      const chips = el("div", "sg-chips");
      if (kind === "plugin") {
        chips.append(el("span", "sg-chip", item.type === "app" ? "Custom app" : "Extensión"));
      } else {
        (item.parts || []).forEach(function (part) {
          chips.append(el("span", "sg-chip", part));
        });
      }
      node.append(chips);
      if (kind === "plugin" && item.enabled) {
        node.append(switchRow(item));
      } else if (kind === "plugin") {
        node.append(commandRow(item, kind, "Desactivado en la configuración. Para activarlo (después ejecuta apply con Spotify cerrado):"));
      } else {
        node.append(commandRow(item, kind, "Para " + (item.enabled ? "desactivar" : "activar") + " (después ejecuta apply con Spotify cerrado):"));
      }
      return node;
    }

    function banner() {
      const box = el("div", "sg-banner");
      const reload = el("button", "sg-reload", "Recargar ahora");
      reload.type = "button";
      reload.addEventListener("click", function () {
        window.location.reload();
      });
      box.append(el("span", "", "Hay cambios en plugins. Recarga Spotify (Ctrl+R) para aplicarlos."), reload);
      return box;
    }

    function actionRow(command) {
      const row = el("div", "sg-action");
      const texts = el("div");
      texts.append(el("p", "sg-action-title", command.label));
      if (command.hint) texts.append(el("p", "sg-action-hint", command.hint));
      const run = el("button", "sg-run", "Abrir");
      run.type = "button";
      run.addEventListener("click", function () {
        closePanel();
        window.SintonAPI.ui.runCommand(command.id);
      });
      row.append(texts, run);
      return row;
    }


    const PRESETS = [
      ["Verde Spotify", "#1ed760"], ["Naranja", "#ff9100"], ["Rojo", "#ff4d4d"], ["Rosa", "#ff5fa2"], ["Violeta", "#a66bff"],
      ["Azul", "#3d9bff"], ["Turquesa", "#19d3c5"], ["Amarillo", "#ffd000"]
    ];

    const BG_PRESETS = [["dark", "Gris oscuro"], ["light", "Blanco roto"]];
    const BG_SWATCHES = [["Pizarra", "#1c2128"], ["Vino", "#2a1a20"], ["Bosque", "#17241d"], ["Arena", "#efe6d6"], ["Menta", "#e3efe8"], ["Cielo", "#e4ecf5"]];

    // Tonos para la zona sin degradado; se muestran ya suavizados al esquema actual (oscuro o claro).
    const FLAT_SWATCHES = [["Azul", "#3a6ea5"], ["Violeta", "#7656b0"], ["Verde", "#3f8a5e"], ["Rojo", "#a8474a"], ["Ámbar", "#b8863a"], ["Gris", "#7a7a7a"]];

    function renderColors() {
      const api = window.SintonColors;
      if (!api) {
        bodyEl.append(el("div", "sg-empty", "Los colores solo están disponibles con el tema activo."));
        return;
      }
      const wrap = el("div", "sg-colors");
      const inputs = {};
      const prev = {
        accent: el("span", "sg-prev", "Principal"),
        hover: el("span", "sg-prev", "Selección"),
        press: el("span", "sg-prev", "Pulsado")
      };
      const preview = el("div", "sg-preview");
      Object.keys(prev).forEach(function (key) { preview.append(prev[key]); });

      function button(label, onClick) {
        const node = el("button", "sg-segbtn", label);
        node.type = "button";
        node.addEventListener("click", onClick);
        return node;
      }

      function swatch(name, color, onClick) {
        const node = el("button", "sg-swatch");
        node.type = "button";
        node.title = name;
        node.setAttribute("aria-label", name);
        node.dataset.color = color;
        node.style.background = color;
        node.addEventListener("click", onClick);
        return node;
      }

      // ----- Color principal -----
      const accentSwatches = el("div", "sg-swatches");
      const accentEls = PRESETS.map(function (pair) {
        const node = swatch("Color " + pair[0], pair[1], function () { api.set({ accent: pair[1] }); sync(); });
        accentSwatches.append(node);
        return node;
      });

      const pickers = el("div", "sg-pickers");
      [["accent", "Color principal"], ["hover", "Selección y hover (más claro)"], ["press", "Pulsado (más oscuro)"]].forEach(function (pair) {
        const label = el("label", "sg-picker", pair[1]);
        const input = document.createElement("input");
        input.type = "color";
        input.addEventListener("input", function () {
          const change = {};
          change[pair[0]] = input.value;
          if (pair[0] !== "accent") change.auto = false;
          api.set(change);
          sync();
        });
        inputs[pair[0]] = input;
        label.append(input);
        pickers.append(label);
      });

      const autoBox = document.createElement("input");
      autoBox.type = "checkbox";
      autoBox.addEventListener("change", function () { api.set({ auto: autoBox.checked }); sync(); });
      const autoRow = el("label", "sg-chip");
      autoRow.append(autoBox, el("span", "", " Calcular el tono claro y el oscuro a partir del principal"));

      const tintBox = document.createElement("input");
      tintBox.type = "checkbox";
      tintBox.addEventListener("change", function () { api.set({ tintText: tintBox.checked }); sync(); });
      const tintRow = el("label", "sg-chip");
      tintRow.append(tintBox, el("span", "", " Texto principal con el color principal"));

      const resetAccent = el("button", "sg-run", "Restablecer verde de Spotify");
      resetAccent.type = "button";
      resetAccent.addEventListener("click", function () { api.reset(); sync(); });

      // ----- Fondo -----
      const modeRow = el("div", "sg-seg");
      const modeEls = {};
      BG_PRESETS.forEach(function (pair) {
        modeEls[pair[0]] = button(pair[1], function () { api.set({ bgMode: pair[0] }); sync(); });
        modeRow.append(modeEls[pair[0]]);
      });
      modeEls.custom = button("Personalizado", function () { api.set({ bgMode: "custom" }); sync(); });
      modeRow.append(modeEls.custom);

      const bgSwatches = el("div", "sg-swatches");
      const bgEls = BG_SWATCHES.map(function (pair) {
        const node = swatch("Fondo " + pair[0], pair[1], function () { api.set({ bgMode: "custom", bg: pair[1] }); sync(); });
        bgSwatches.append(node);
        return node;
      });

      const bgInput = document.createElement("input");
      bgInput.type = "color";
      bgInput.addEventListener("input", function () { api.set({ bgMode: "custom", bg: bgInput.value }); sync(); });
      const bgPicker = el("label", "sg-picker", "Color de fondo (se suaviza para que no sea estridente)");
      bgPicker.append(bgInput);

      const bgPreview = el("div", "sg-bgprev");
      const bgParts = [["bg", "Fondo"], ["bg2", "Tarjetas"], ["bg3", "Hundido"], ["border", "Borde"]].map(function (pair) {
        const node = el("span", "sg-bgchip", pair[1]);
        node.dataset.key = pair[0];
        bgPreview.append(node);
        return node;
      });

      const flatBox = document.createElement("input");
      flatBox.type = "checkbox";
      flatBox.addEventListener("change", function () { api.set({ flat: flatBox.checked }); sync(); });
      const flatRow = el("label", "sg-chip");
      flatRow.append(flatBox, el("span", "", " Quitar degradados de color (inicio, playlists y artistas)"));

      const flatSame = button("Igual que el fondo", function () { api.set({ flatColor: "" }); sync(); });
      const flatSwatches = el("div", "sg-swatches");
      flatSwatches.append(flatSame);
      const flatEls = FLAT_SWATCHES.map(function (pair) {
        const node = swatch("Sin degradado: " + pair[0], pair[1], function () { api.set({ flatColor: pair[1] }); sync(); });
        flatSwatches.append(node);
        return node;
      });
      const flatInput = document.createElement("input");
      flatInput.type = "color";
      flatInput.addEventListener("input", function () { api.set({ flatColor: flatInput.value }); sync(); });
      const flatPicker = el("label", "sg-picker", "Color de las cabeceras sin degradado (se suaviza para que el texto se lea)");
      flatPicker.append(flatInput);
      const flatGroup = el("div", "sg-flatgroup");
      flatGroup.append(flatSwatches, flatPicker);

      const resetBg = el("button", "sg-run", "Restablecer gris oscuro");
      resetBg.type = "button";
      resetBg.addEventListener("click", function () { api.resetBackground(); sync(); });

      function sync() {
        const c = api.get();
        Object.keys(inputs).forEach(function (key) {
          if (inputs[key].value !== c[key]) inputs[key].value = c[key];
          inputs[key].disabled = key !== "accent" && c.auto;
        });
        prev.accent.style.background = c.accent;
        prev.hover.style.background = c.hover;
        prev.press.style.background = c.press;
        autoBox.checked = c.auto;
        tintBox.checked = c.tintText;
        flatBox.checked = c.flat;
        flatGroup.hidden = !c.flat;
        flatSame.setAttribute("aria-pressed", String(c.flatColor === ""));
        flatEls.forEach(function (node) {
          node.style.background = api.flatTone(node.dataset.color, api.surfaces().scheme);
          node.setAttribute("aria-pressed", String(node.dataset.color === c.flatColor));
        });
        const flatValue = c.flatColor || api.flatColor();
        if (flatInput.value !== flatValue) flatInput.value = flatValue;
        accentEls.forEach(function (node) { node.setAttribute("aria-pressed", String(node.dataset.color === c.accent)); });
        Object.keys(modeEls).forEach(function (key) { modeEls[key].setAttribute("aria-pressed", String(c.bgMode === key)); });
        bgEls.forEach(function (node) { node.setAttribute("aria-pressed", String(c.bgMode === "custom" && node.dataset.color === c.bg)); });
        if (bgInput.value !== c.bg) bgInput.value = c.bg;
        const surface = api.surfaces();
        bgParts.forEach(function (node) {
          node.style.background = surface[node.dataset.key];
          node.style.color = surface.text;
          node.style.borderColor = surface.border;
        });
      }

      wrap.append(
        el("h3", "sg-section", "Color principal"),
        el("p", "sg-hint", "Se usa en botones, barra de progreso, enlaces y acentos. Elige uno y Sinton calcula el claro y el oscuro, o desmarca la casilla y ajusta los tres. Se aplica al instante y se guarda."),
        accentSwatches, pickers, autoRow, tintRow, preview, resetAccent,
        el("h3", "sg-section", "Fondo"),
        el("p", "sg-hint", "Gris oscuro o blanco roto, o cualquier color: Sinton lo suaviza y ajusta tarjetas, bordes y texto a su tonalidad."),
        modeRow, bgSwatches, bgPicker, bgPreview, flatRow, flatGroup, resetBg
      );
      bodyEl.append(wrap);
      sync();
    }

    function renderActions() {
      const commands = window.SintonAPI ? window.SintonAPI.ui.listCommands() : [];
      if (commands.length === 0) {
        bodyEl.append(el("div", "sg-empty", "Ningún plugin activo ofrece acciones."));
        return;
      }
      commands.forEach(function (command) {
        bodyEl.append(actionRow(command));
      });
    }

    function render() {
      if (!panel || !bodyEl) return;
      Object.keys(tabEls).forEach(function (key) {
        tabEls[key].setAttribute("aria-selected", String(key === tab));
      });
      bodyEl.textContent = "";
      if ((state.plugins || []).some(isPending)) bodyEl.append(banner());
      if (tab === "actions") {
        renderActions();
        return;
      }
      if (tab === "colors") {
        renderColors();
        return;
      }
      const kind = tab === "themes" ? "theme" : "plugin";
      const list = (tab === "themes" ? state.themes : state.plugins) || [];
      if (list.length === 0) {
        bodyEl.append(el("div", "sg-empty", "Aún no hay plugins. Coloca cada plugin en la carpeta plugins/ del proyecto (manifest.json e index.js) y ejecuta apply."));
        return;
      }
      list.forEach(function (item) {
        bodyEl.append(card(item, kind));
      });
    }

    function buildPanel() {
      const overlay = el("div", "sg-overlay");
      overlay.id = PANEL_ID;
      overlay.setAttribute("role", "dialog");
      overlay.setAttribute("aria-modal", "true");
      overlay.setAttribute("aria-label", "Galería de Sinton");
      overlay.setAttribute("data-sinton-ghost", "1");
      overlay.addEventListener("mousedown", function (event) {
        if (event.target === overlay) closePanel();
      });

      const box = el("div", "sg-box");
      const head = el("div", "sg-head");
      const titles = el("div");
      titles.append(
        el("h2", "sg-title", "Sinton"),
        el("p", "sg-sub", "Temas y plugins" + (state.spotifyVersion ? " · Spotify " + state.spotifyVersion : ""))
      );
      const close = el("button", "sg-close", "Cerrar");
      close.type = "button";
      close.addEventListener("click", closePanel);
      head.append(titles, close);

      const tabs = el("div", "sg-tabs");
      tabs.setAttribute("role", "tablist");
      tabEls = {};
      [["themes", "Temas"], ["colors", "Colores"], ["plugins", "Plugins"], ["actions", "Acciones"]].forEach(function (pair) {
        const t = el("button", "sg-tab", pair[1]);
        t.type = "button";
        t.setAttribute("role", "tab");
        t.addEventListener("click", function () {
          tab = pair[0];
          render();
        });
        tabEls[pair[0]] = t;
        tabs.append(t);
      });

      bodyEl = el("div", "sg-body");
      box.append(head, tabs, bodyEl);
      overlay.append(box);
      return overlay;
    }

    function openPanel() {
      if (panel) return;
      lastFocus = document.activeElement;
      panel = buildPanel();
      document.body.appendChild(panel);
      render();
      const close = panel.querySelector(".sg-close");
      if (close) close.focus();
    }

    function closePanel() {
      if (!panel) return;
      panel.remove();
      panel = null;
      bodyEl = null;
      if (lastFocus && lastFocus.isConnected && typeof lastFocus.focus === "function") lastFocus.focus();
      lastFocus = null;
    }

    // F5 y Ctrl/Cmd+R recargan la app como una web; Ctrl/Cmd+Mayús+R ignora la caché.
    document.addEventListener("keydown", function (event) {
      const isF5 = event.key === "F5";
      const isCtrlR = (event.ctrlKey || event.metaKey) && !event.altKey && (event.key === "r" || event.key === "R");
      if (!isF5 && !isCtrlR) return;
      event.preventDefault();
      window.location.reload();
    }, true);

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && panel) {
        event.stopPropagation();
        closePanel();
      }
    }, true);

    function makeButton() {
      const node = document.createElement("button");
      node.id = BTN_ID;
      node.type = "button";
      node.className = "sg-btn sg-hidden";
      node.title = "Sinton: temas y plugins";
      node.setAttribute("aria-label", "Sinton: temas y plugins");
      node.innerHTML = ICON;
      node.addEventListener("click", function () {
        if (panel) closePanel();
        else openPanel();
      });
      return node;
    }

    function findForward() {
      const byId = document.querySelector('[data-testid="top-bar-forward-button"]');
      if (byId) return byId;
      const labeled = document.querySelectorAll("button[aria-label]");
      for (let i = 0; i < labeled.length; i += 1) {
        if (FWD_LABEL.test(labeled[i].getAttribute("aria-label").trim())) return labeled[i];
      }
      return null;
    }

    function align(forward) {
      button.style.translate = "";
      const f = forward.getBoundingClientRect();
      const b = button.getBoundingClientRect();
      if (!f.height || !b.height) return false;
      const dy = f.top + f.height / 2 - (b.top + b.height / 2);
      if (Math.abs(dy) > 0.5) button.style.translate = "0 " + dy.toFixed(1) + "px";
      return true;
    }

    function reveal() {
      if (revealQueued) return;
      revealQueued = true;
      window.requestAnimationFrame(function () {
        window.requestAnimationFrame(function () {
          revealQueued = false;
          if (button) button.classList.remove("sg-hidden");
        });
      });
    }

    function ensureButton() {
      if (!button) button = makeButton();
      const forward = findForward();
      const rect = forward ? forward.getBoundingClientRect() : null;
      if (forward && rect.width > 0 && rect.height > 0) {
        if (button.previousElementSibling !== forward) forward.insertAdjacentElement("afterend", button);
        button.classList.remove("sg-floating");
        button.dataset.placement = "nav";
        if (align(forward)) reveal();
      } else if (!button.isConnected && Date.now() - startedAt > FALLBACK_MS) {
        button.style.translate = "";
        button.classList.add("sg-floating");
        button.dataset.placement = "floating";
        document.body.appendChild(button);
        reveal();
      }
    }

    function schedule() {
      if (timer) return;
      timer = window.setTimeout(function () {
        timer = null;
        try {
          ensureButton();
        } catch (err) {
          console.error("[Sinton] botón", err);
        }
      }, 250);
    }

    function pluginUrl(plugin, file) {
      return "/sinton/plugins/" + encodeURIComponent(plugin.id) + "/" + file.split("/").map(encodeURIComponent).join("/");
    }

    // Carga los estilos y, en orden, los scripts de cada plugin activo.
    function loadPlugins() {
      (state.plugins || []).forEach(function (plugin) {
        plugin.loaded = false;
        const scripts = Array.isArray(plugin.scripts) ? plugin.scripts : [];
        if (!isOn(plugin, "plugin") || scripts.length === 0) return;
        plugin.loaded = true;
        (plugin.styles || []).forEach(function (file) {
          const link = document.createElement("link");
          link.rel = "stylesheet";
          link.href = pluginUrl(plugin, file);
          document.head.appendChild(link);
        });
        scripts.forEach(function (file) {
          const script = document.createElement("script");
          script.src = pluginUrl(plugin, file);
          script.async = false;
          script.onerror = function () {
            plugin.failed = true;
            console.error("[Sinton] no se pudo cargar", plugin.id, file);
            render();
          };
          document.body.appendChild(script);
        });
      });
    }

    document.documentElement.setAttribute("data-sinton", VERSION);
    injectStyle();
    ensureButton();
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", schedule);
    window.setInterval(schedule, 2000);
    loadPlugins();
    window.Sinton = Object.freeze({
      version: VERSION,
      state: state,
      openGallery: openPanel,
      openActions: function () {
        tab = "actions";
        if (panel) render();
        else openPanel();
      },
      closeGallery: closePanel
    });
    console.log("[Sinton] cargado");
  } catch (err) {
    console.error("[Sinton] error al iniciar", err);
  }
})();

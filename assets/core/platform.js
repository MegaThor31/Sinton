// Sinton core · plataforma: localiza las APIs internas de Spotify en tiempo de ejecución.
(function (root) {
  "use strict";
  const core = (root.SintonCore = root.SintonCore || {});
  const READY_TIMEOUT_MS = 60000;
  const POLL_MS = 250;
  const MAX_FIBERS = 6000;
  // Elementos de Spotify desde los que se busca el árbol de React.
  const ROOT_SELECTORS = ["#main", ".Root", "[data-testid='now-playing-bar']", "body > div"];

  let platform = null;
  let readyPromise = null;

  function fiberOf(node) {
    if (!node) return null;
    for (const key of Object.keys(node)) {
      if (key.startsWith("__reactFiber$") || key.startsWith("__reactContainer$")) return node[key];
    }
    return null;
  }

  function isPlatform(value) {
    return Boolean(value) && typeof value === "object" && typeof value.getRegistry === "function";
  }

  function platformIn(fiber) {
    const props = fiber && fiber.memoizedProps;
    if (props && typeof props === "object" && isPlatform(props.platform)) return props.platform;
    return null;
  }

  function searchUp(fiber) {
    let current = fiber;
    let steps = 0;
    while (current && steps < MAX_FIBERS) {
      const found = platformIn(current);
      if (found) return found;
      current = current.return;
      steps += 1;
    }
    return null;
  }

  function searchDown(fiber) {
    const queue = [fiber];
    let visited = 0;
    while (queue.length > 0 && visited < MAX_FIBERS) {
      const current = queue.shift();
      visited += 1;
      const found = platformIn(current);
      if (found) return found;
      if (current.child) queue.push(current.child);
      if (current.sibling) queue.push(current.sibling);
    }
    return null;
  }

  function findPlatform() {
    for (const selector of ROOT_SELECTORS) {
      for (const node of document.querySelectorAll(selector)) {
        const fiber = fiberOf(node);
        if (!fiber) continue;
        const found = searchUp(fiber) || searchDown(fiber);
        if (found) return found;
      }
    }
    return null;
  }

  function ready() {
    if (readyPromise) return readyPromise;
    readyPromise = new Promise(function (resolve, reject) {
      const startedAt = Date.now();
      (function attempt() {
        try {
          platform = platform || findPlatform();
        } catch (err) {
          console.error("[Sinton] búsqueda de plataforma", err);
        }
        if (platform) return resolve(platform);
        if (Date.now() - startedAt > READY_TIMEOUT_MS) {
          readyPromise = null;
          return reject(new Error("No se encontraron las APIs internas de Spotify."));
        }
        root.setTimeout(attempt, POLL_MS);
      })();
    });
    return readyPromise;
  }

  function api(name) {
    if (!platform) return null;
    try {
      return platform.getRegistry().resolve(Symbol.for(name)) || null;
    } catch (err) {
      return null;
    }
  }

  function requireApi(name) {
    const found = api(name);
    if (!found) throw new Error("Spotify no expone " + name + " en esta versión.");
    return found;
  }

  async function token() {
    const provider = api("TokenProviderDesktop") || api("TokenProvider");
    if (provider && typeof provider.getToken === "function") {
      const result = await provider.getToken({ preferCached: true });
      const value = result && (result.accessToken || result.token);
      if (value) return value;
    }
    const session = platform && typeof platform.getSession === "function" ? platform.getSession() : null;
    if (session && session.accessToken) return session.accessToken;
    throw new Error("No se pudo obtener el token de sesión.");
  }

  function history() {
    if (platform && typeof platform.getHistory === "function") return platform.getHistory();
    return api("History");
  }

  function currentPath() {
    const h = history();
    return (h && h.location && h.location.pathname) || root.location.pathname || "";
  }

  function navigate(path) {
    const h = history();
    if (!h || typeof h.push !== "function") throw new Error("Navegación no disponible.");
    h.push(path);
  }

  function onNavigate(listener) {
    const h = history();
    if (!h || typeof h.listen !== "function") return function () {};
    const off = h.listen(function () {
      try {
        listener(currentPath());
      } catch (err) {
        console.error("[Sinton] navegación", err);
      }
    });
    return typeof off === "function" ? off : function () {};
  }

  // ----- URIs -----
  const URI_RE = /^spotify:(track|album|artist|playlist|episode|show|local)(?::|$)/;

  function uriType(uri) {
    if (typeof uri !== "string") return null;
    if (/^spotify:user:[^:]+:collection$/.test(uri) || uri === "spotify:collection:tracks") return "liked";
    const match = URI_RE.exec(uri);
    return match ? match[1] : null;
  }

  function uriId(uri) {
    return typeof uri === "string" ? uri.split(":").pop() : "";
  }

  function uriToPath(uri) {
    const type = uriType(uri);
    if (type === "liked") return "/collection/tracks";
    if (!type || type === "local") return null;
    return "/" + type + "/" + uriId(uri);
  }

  function pathToUri(path) {
    const match = /^\/(?:intl-[a-z-]+\/)?(track|album|artist|playlist)\/([A-Za-z0-9]+)/.exec(path || "");
    if (match) return "spotify:" + match[1] + ":" + match[2];
    if (/^\/collection\/tracks/.test(path || "")) return "spotify:collection:tracks";
    return null;
  }

  core.platform = {
    ready: ready,
    get: function () { return platform; },
    api: api,
    requireApi: requireApi,
    token: token,
    fiberOf: fiberOf,
    currentPath: currentPath,
    navigate: navigate,
    onNavigate: onNavigate
  };
  core.uri = { type: uriType, id: uriId, toPath: uriToPath, fromPath: pathToUri };
})(typeof window !== "undefined" ? window : globalThis);

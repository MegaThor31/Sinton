// playlist-iconos · lógica pura (sin DOM): índice canción → playlists.
(function (root) {
  "use strict";
  const parts = (root.SintonParts = root.SintonParts || {});
  const part = (parts["playlist-iconos"] = parts["playlist-iconos"] || {});

  const DEFAULTS = { includeFollowed: false, showCurrent: false, max: 4 };

  function selectPlaylists(playlists, settings) {
    return playlists.filter(function (playlist) {
      return playlist.owned || playlist.collaborative || settings.includeFollowed;
    });
  }

  // Añade al índice (Map uri de canción → lista de uris de playlist) el contenido de una playlist.
  function addToIndex(index, playlistUri, trackUris) {
    for (const uri of new Set(trackUris)) {
      const list = index.get(uri);
      if (!list) index.set(uri, [playlistUri]);
      else if (!list.includes(playlistUri)) list.push(playlistUri);
    }
    return index;
  }

  function labelsFor(index, trackUri, currentPlaylistUri, settings) {
    const all = (index.get(trackUri) || []).filter(function (uri) {
      return settings.showCurrent || uri !== currentPlaylistUri;
    });
    const max = Math.max(1, Number(settings.max) || DEFAULTS.max);
    return { shown: all.slice(0, max), hidden: all.slice(max) };
  }

  function initial(name) {
    const match = /[\p{L}\p{N}]/u.exec(String(name || ""));
    return match ? match[0].toUpperCase() : "♪";
  }

  part.logic = {
    DEFAULTS: DEFAULTS,
    selectPlaylists: selectPlaylists,
    addToIndex: addToIndex,
    labelsFor: labelsFor,
    initial: initial
  };
})(typeof window !== "undefined" ? window : globalThis);

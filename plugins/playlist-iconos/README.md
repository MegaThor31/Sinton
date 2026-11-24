# Iconos de playlists

En cada fila de canción aparecen las portadas de tus playlists que la contienen.

- Pasa el ratón por una portada para ver el nombre; clic para abrir esa playlist. Si hay más de las que caben, `+N` abre la lista completa.
- Por defecto cuentan tus playlists y las colaborativas, y se oculta la playlist que estás viendo.
- Ajustes y recarga manual: galería de Sinton → *Acciones* → *Iconos de playlists*.
- El índice se construye al arrancar (puede tardar unos segundos con muchas playlists) y se renueva al navegar si tiene más de 3 minutos.

Inspirado en [spicetify-playlist-labels](https://github.com/duffey/spicetify-playlist-labels).

Archivos: `src/logic.js` (índice, sin DOM), `src/ui.js` (carga y pintado), `index.js` (registro).

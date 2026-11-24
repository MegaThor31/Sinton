# Letras+

Panel de letras a pantalla (encima de la vista principal, dejando libre la barra de reproducción aunque el tema la haga flotar con márgenes).

- **Abrir/cerrar**: botón del micrófono en la barra de reproducción (ocupa el sitio del botón de letra de Spotify, que se oculta para no tener dos), `Alt+L` o galería de Sinton → *Acciones*. `Esc` cierra.
- **Fuentes**: letras de Spotify y [LRCLIB](https://lrclib.net). Se piden a la vez y se usa la sincronizada si existe en cualquiera de las dos; así canciones sin letra (o solo con letra estática) en Spotify pasan a tenerla sincronizada.
- **Sincronizada**: la línea activa se resalta y se centra; clic en una línea para saltar a ese momento. Si haces scroll, el seguimiento se pausa unos segundos.
- **Ajustes**: desfase por canción (`−` / `+`, doble clic en el valor para ponerlo a cero), tamaño de letra y *Buscar de nuevo*.
- Las letras encontradas se guardan en caché local (últimas 120).

Inspirado en [lyrics-plus](https://github.com/spicetify/cli/tree/main/CustomApps/lyrics-plus) y [beautiful-lyrics](https://github.com/yeahnangua/beautiful-lyrics-reborn).

Archivos: `src/logic.js` (desfase y tamaño, sin DOM), `src/ui.js` (panel), `index.js` (registro). La búsqueda de letras está en el núcleo (`assets/core/lyrics.js`) porque también la usa la pantalla completa.

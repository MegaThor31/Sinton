# Pantalla completa

Vista a pantalla completa de lo que suena: portada grande, título, artistas, progreso, controles y letra sincronizada.

- **Abrir/cerrar**: botón de expandir en la barra de reproducción (sustituye al de pantalla completa de Spotify, así solo hay uno), `Alt+Intro` o galería de Sinton → *Acciones*. `Esc` sale.
- **Controles**: a la izquierda *Añadir a playlist* (tus playlists propias o colaborativas, con buscador; avisa si ya estaba), *Me gusta* y *Marcar* (si el plugin Marcas está activo). En el centro aleatorio, anterior, reproducir, siguiente y repetir (todo → esta canción → no). El aleatorio sigue el ciclo de Spotify: apagado, aleatorio e inteligente.
- **Vinilo**: la portada siempre se muestra como un **vinilo** que gira mientras suena (con la portada como etiqueta y brillo del color dominante), haya letra o no. Botón *Disco* o tecla `V` para volver a la portada; se recuerda. Si no hay letra, la vista pasa sola a la composición centrada. No se muestra de dónde sale la letra.
- **Cola integrada**: botón *Cola* o tecla `Q` despliega a la derecha la cola dentro de la pantalla completa. Clic en una canción la reproduce y la sube al principio; la flecha al pasar el ratón solo la sube.
- **Fondo a elegir** (botón *Fondo* o tecla `B`; se recuerda):
  - *Foto del artista*: la cabecera del perfil del artista; si no tiene, su foto de perfil; si tampoco, la portada difuminada.
  - *Portada*: la portada nítida a la máxima resolución disponible.
  - *Portada difuminada*.
  - Spotify no guarda una imagen distinta para la canción y para el álbum: la portada de una canción es la de su álbum, así que ambas opciones son la misma imagen.
- **Letra** (botón *Letra* o tecla `L`): la misma búsqueda del núcleo (Spotify + [LRCLIB](https://lrclib.net)); clic en una línea para saltar. Respeta el desfase por canción ajustado en Letras+.
- **Teclas**: `Espacio` reproducir/pausar, `←` `→` ±5 s, `N` siguiente, `P` anterior.
- Tras 3 s sin mover el ratón se ocultan los controles y el cursor.
- Intenta usar la pantalla completa real de la ventana; si Spotify no lo permite, ocupa toda la ventana.

El vinilo está inspirado en [Vinyl Rewind](https://www.reddit.com/r/spicetify/comments/1wsvm1r/i_made_vinyl_rewind_a_fullscreen_spinning_record/) y en [Spicy Lyrics Vinyl-Player](https://github.com/BatDanLY/Spicetify_Spicy_Lyrics_Vinyl-Player).

Inspirado en [Full Screen de daksh2k](https://github.com/daksh2k/Spicetify-stuff/blob/master/Extensions/full-screen/README.md) y en Full App Display de Spicetify.

Archivos: `src/logic.js` (tiempos, fondos, saltos, letra disponible y color del vinilo, sin DOM), `src/ui.js` (vista), `index.js` (registro).

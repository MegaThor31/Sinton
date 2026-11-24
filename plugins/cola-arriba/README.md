# Subir en la cola

Sube una canción al primer puesto de la cola para que suene justo después de la actual.

- **Panel de la cola**: al pasar el ratón por una fila aparece una flecha hacia arriba junto al botón "...".
- **Clic derecho** sobre cualquier canción → *Subir al principio de la cola*. Si ya estaba en la cola se mueve; si no, se añade como siguiente.

Usa las funciones de cola de Spotify (`reorderQueue` y `playAsNextInQueue`), así que la cola nativa se actualiza sola.

Inspirado en [Play Next](https://github.com/daksh2k/Spicetify-stuff/blob/master/EXTENSIONS.md) de daksh2k y en el botón por fila de [quickQueue](https://github.com/ohitstom/spicetify-extensions/blob/main/quickQueue/README.md) de ohitstom.

Archivos: `src/logic.js` (reconocer filas y mensajes, sin DOM), `src/ui.js` (botones del panel), `index.js` (registro), `styles.css`.

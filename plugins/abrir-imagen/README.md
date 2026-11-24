# Abrir imagen

Abre imágenes de Spotify en el navegador a la mayor resolución que sirve su CDN (las portadas de álbum llegan a 2000×2000).

- **Clic derecho** sobre una canción, álbum o playlist → *Abrir portada en el navegador*.
- **Clic derecho** sobre un artista → *Abrir foto del artista* / *Abrir cabecera del artista*.
- **Alt+clic** sobre cualquier imagen visible en Spotify.
- Galería de Sinton → *Acciones* → portada de la canción que suena.

Se prueban los tamaños de mayor a menor y se abre el primero que carga.

Inspirado en [image-opener](https://github.com/Resxt/Spicetify-Extensions) de Resxt.

Archivos: `src/logic.js` (utilidades, sin DOM), `src/ui.js` (resolución y apertura), `index.js` (registro).

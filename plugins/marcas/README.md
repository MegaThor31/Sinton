# Marcas

Etiquetas de color para canciones, al estilo de las colecciones de guardados de Instagram o TikTok. Sirven para filtrar una playlist sin mover ni borrar canciones.

- **Marcar**: pasa el ratón por una fila y pulsa el icono de etiqueta, o clic derecho sobre una o varias canciones → *Marcar…*. Las canciones marcadas muestran un punto por marca.
- **Filtrar**: botón de etiqueta junto al `…` de la playlist, clic derecho sobre una playlist o álbum → *Filtrar por marcas*, o galería de Sinton → *Acciones*. Se eligen marcas y el modo (*alguna*, *todas*, *sin esas*) y se puede reproducir, mezclar, añadir a la cola o crear una playlist con el resultado.
- **Gestionar**: crear, renombrar, cambiar color, borrar, exportar e importar (JSON).
- Las marcas son globales por canción y se guardan en este ordenador (`localStorage`); la playlist original no se modifica.

Inspirado en [Tagify](https://github.com/alexk218/tagify) y en la extensión *Bookmark* de Spicetify.

Archivos: `src/logic.js` (modelo y filtrado, sin DOM), `src/ui.js` (filas, diálogos y panel), `index.js` (registro).

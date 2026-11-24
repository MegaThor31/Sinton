# Playlist de artista

Crea una playlist con las canciones de un artista.

- **Dónde**: clic derecho sobre un artista (o el botón `…` de su página) → *Crear playlist con todas sus canciones*. También en la galería de Sinton → *Acciones*.
- **Opciones**: álbumes, sencillos/EP, recopilatorios, apariciones en discos de otros; *Todas absolutas* o *Sin repetir*; *Sin colaboraciones*; *Sin versiones alternativas*; orden por fecha.
- **Sin repetir** compara el título sin acentos ni añadidos como `(feat. …)` o `Remastered`, pero mantiene como canciones distintas los remixes o directos.
- Spotify admite 10.000 canciones por playlist; si hay más, se añaden las primeras.

Inspirado en [allOfArtist](https://github.com/pl4neta/allOfArtist) y en *Create Discography* de [sort-play](https://github.com/hoeci/sort-play).

Archivos: `src/logic.js` (filtrado y deduplicado, sin DOM), `src/ui.js` (diálogo), `index.js` (registro).

# Ocultar audiolibros

Oculta el filtro **Audiolibros** y las secciones cuyo título menciona audiolibros.

- No toca los podcasts: hay canciones ocultas en formato podcast.
- No elimina nada del DOM: solo marca los elementos con `data-sp-ocultar-audiolibros` y los oculta con CSS.
- `window.SintonPlugins["ocultar-audiolibros"].stop()` lo desactiva y deja la interfaz como estaba.

## Selectores de Spotify

Están al inicio de `index.js` (`LABEL_SELECTOR`, `HEADING_SELECTOR`, `SHELF_SELECTOR`). Si Spotify cambia su interfaz, se corrigen solo ahí.

## Qué puede fallar

- El chip se detecta por su texto exacto (`Audiolibros` o `Audiobooks`).
- Las secciones se ocultan si su encabezado contiene "audiolibro" o "audiobook" y están dentro de un `<section>`. Esto no está comprobado contra el HTML real.

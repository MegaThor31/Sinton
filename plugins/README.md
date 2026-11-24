# Plugins de Sinton

Los plugins engloban lo que en Spicetify serían extensiones y custom apps. Se activan o desactivan desde la galería de Sinton (hay que recargar para aplicar) o con `node bin/sinton.js plugin <id> on|off` seguido de `node bin/sinton.js apply` con Spotify cerrado.

| Plugin | Qué hace |
| --- | --- |
| `artista-playlist` | Playlist con todas las canciones de un artista: todas absolutas, sin repetir, sin colaboraciones, sin versiones alternativas. |
| `playlist-iconos` | En cada canción, las portadas de tus playlists que la contienen. |
| `marcas` | Marcas de color en canciones para filtrar cualquier playlist sin moverlas ni borrarlas. |
| `abrir-imagen` | Abre portadas y fotos de artista en el navegador a la máxima resolución. |
| `letras` | Panel de letras sincronizadas (Spotify + LRCLIB). |
| `pantalla-completa` | Vista a pantalla completa con fondo a elegir, letra, controles completos y cola integrada y vinilo. |
| `cola-arriba` | Sube cualquier canción al principio de la cola (panel de la cola y clic derecho). |
| `ocultar-audiolibros` | Oculta los audiolibros. |

Todas las acciones están también en la galería de Sinton → pestaña *Acciones*.

## Estructura de un plugin

```
plugins/
  mi-plugin/
    manifest.json
    index.js        solo registra e inicia: SintonPlugins[id] = { start, stop }
    src/logic.js    lógica pura, sin DOM (se prueba con node --test)
    src/ui.js       interfaz
    styles.css      opcional
    README.md
```

`manifest.json`:

```json
{
  "name": "Mi plugin",
  "type": "extension",
  "description": "Qué hace",
  "scripts": ["src/logic.js", "src/ui.js", "index.js"],
  "styles": ["styles.css"]
}
```

- El nombre de la carpeta es el id: solo minúsculas, números y guiones.
- `scripts` se cargan en ese orden; si falta, se usa `main` o `index.js`.
- `type` puede ser `extension` o `app`.

## Convenciones

- Cada archivo es una IIFE. `logic.js` publica en `SintonParts[id].logic`, `ui.js` en `SintonParts[id].ui`, e `index.js` registra `SintonPlugins[id] = { start, stop }` y arranca con `SintonAPI.ready().then(start)`.
- Todo acceso a Spotify pasa por `window.SintonAPI` (`assets/core/`): `platform`, `uri`, `player`, `data`, `images`, `lyrics`, `ui`, `storage`.
- Clases CSS con prefijo propio (`sn-<abreviatura>-`), selectores de Spotify declarados en una lista `SEL` al principio del archivo y errores contenidos con `api.ui.fail(id, acción, error)`.
- `stop()` debe deshacer todo lo que hizo `start()`.

## Pruebas

`npm test` ejecuta las pruebas de la lógica pura (`test/`). No necesita dependencias.

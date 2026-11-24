# Sinton

Personalización local de Spotify de escritorio para Windows: tema Bloom con acento naranja, animaciones, galería de temas y plugins (por ejemplo, ocultar audiolibros).

> Proyecto no oficial y sin relación con Spotify. Modifica archivos locales de la aplicación; úsalo bajo tu propia responsabilidad.

## Requisitos

- Windows con Spotify de escritorio instalado desde spotify.com (no la versión de Microsoft Store).
- Node.js 20 o superior.
- Git.
- Spotify cerrado del todo (también en la bandeja del sistema) al ejecutar los comandos.

## Instalación

```powershell
git clone https://github.com/MegaThor31/Sinton.git
cd Sinton
node bin/sinton.js doctor
node bin/sinton.js backup
node bin/sinton.js apply
```

`doctor` comprueba la instalación, `backup` guarda una copia limpia de Spotify y `apply` aplica Sinton. Abre Spotify después.

## Actualizar

```powershell
cd Sinton
git pull
node bin/sinton.js apply
```

Cierra Spotify antes de `apply`.

## Quitar Sinton

```powershell
node bin/sinton.js restore
```

Restaura la copia limpia de la carpeta `Apps` de Spotify. No toca tu cuenta, playlists ni historial. Para quitar solo el tema: `node bin/sinton.js theme bloom off` y luego `apply`.

## Si Spotify se actualiza

Las actualizaciones de Spotify sobrescriben los cambios. Ejecuta de nuevo `apply`; si indica que la versión no coincide con la copia, vuelve a hacer `backup` con Spotify limpio. Probado con Spotify 1.3.10.2586; en otras versiones algunos elementos pueden no verse bien.

## Plugins

Se activan y desactivan desde la galería de Sinton en Spotify. Los cambios surten efecto al recargar la página.

## Créditos

Basado en el tema Bloom (licencia MIT).

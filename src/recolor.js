const HEX_MAP = new Map([
  ['1ed760', ['accent', '#1ed760']],
  ['1db954', ['accent', '#1ed760']],
  ['1fdf64', ['hover', '#3be477']],
  ['3be477', ['hover', '#3be477']],
  ['169c46', ['press', '#1abc54']],
  ['1abc54', ['press', '#1abc54']]
]);

const HEX_RE = /#(1ed760|1db954|1fdf64|3be477|169c46|1abc54)([0-9a-fA-F]{2})?(?![0-9a-fA-F])/gi;
const RGB_RE = /rgb(a?)\(\s*(\d{2,3})\s*,\s*(\d{2,3})\s*,\s*(\d{2,3})\s*(?:,\s*([\d.]+)\s*)?\)/gi;
const GREENS = new Set(['30,215,96', '29,185,84']);

// Dentro de url(...) (SVG incrustados) una variable CSS no se evalúa, así que se deja el color fijo.
function insideUrl(text, offset) {
  const before = text.slice(Math.max(0, offset - 400), offset);
  const open = before.lastIndexOf('url(');
  return open !== -1 && before.indexOf(')', open) === -1;
}

// En archivos CSS el verde pasa a variables (--sn-accent, --sn-hover, --sn-press) para que el usuario
// pueda cambiar los colores sin volver a aplicar. En JS solo se usan variables en las tablas de colores
// (ver JS_TOKEN_RE); el resto queda con el verde original porque ahí el valor puede leerse o calcularse.
// En JS solo se usan variables en las tablas de colores de Spotify (clave: "#verde"), que acaban como
// valores CSS o atributos SVG. Cualquier otro uso queda con el verde original.
const JS_TOKEN_RE = /((?:base|highlight|press|subdued|brightAccent|positive|announcement|fill|\"--[a-z-]+-color\")\"?\s*:\s*\")#(1ed760|1db954|1fdf64|3be477|169c46|1abc54)\"/gi;

export function recolorGreen(text, { css = false } = {}) {
  let count = 0;
  if (!css) {
    text = text.replace(JS_TOKEN_RE, (match, prefix, hex) => {
      count += 1;
      const [token, fallback] = HEX_MAP.get(hex.toLowerCase());
      return `${prefix}var(--sn-${token},${fallback})\"`;
    });
  }
  let result = text.replace(HEX_RE, (match, hex, alpha, offset) => {
    count += 1;
    const [token, fallback] = HEX_MAP.get(hex.toLowerCase());
    if (!css || insideUrl(text, offset)) return fallback + (alpha || '');
    const base = `var(--sn-${token},${fallback})`;
    if (!alpha) return base;
    const percent = Math.round((parseInt(alpha, 16) / 255) * 100);
    return `color-mix(in srgb,${base} ${percent}%,transparent)`;
  });
  result = result.replace(RGB_RE, (match, a, r, g, b, alpha) => {
    if (!GREENS.has(`${r},${g},${b}`)) return match;
    count += 1;
    if (!css) return alpha !== undefined ? `rgba(30,215,96,${alpha})` : 'rgb(30,215,96)';
    return alpha !== undefined ? `rgba(var(--sn-accent-rgb,30,215,96),${alpha})` : 'rgb(var(--sn-accent-rgb,30,215,96))';
  });
  return { text: result, count };
}

// Fondos fijos de Spotify (negro de la barra superior, grises de tarjetas, huecos de carpetas, velos blancos)
// que no encajan con un fondo personalizado. Solo se tocan declaraciones background / background-color de CSS.
const SURFACE_RE = /(?<![-\w])(background(?:-color)?:)(#121212|#181818|#1f1f1f|#282828|#2a2a2a|#333333|#333|#000000|#000|#ffffff1a|#ffffff4d|#fff3)(?=[;}!\s])/gi;
const SURFACE_MAP = new Map([
  ['#121212', 'var(--sn-bg,#121212)'],
  ['#181818', 'var(--sn-bg2,#181818)'],
  ['#1f1f1f', 'var(--sn-bg2,#1f1f1f)'],
  ['#282828', 'var(--sn-bg-hi,#282828)'],
  ['#2a2a2a', 'var(--sn-bg-hi,#2a2a2a)'],
  ['#333', 'var(--sn-bg-hi,#333)'],
  ['#333333', 'var(--sn-bg-hi,#333333)'],
  ['#000', 'var(--sn-bg3,#000)'],
  ['#000000', 'var(--sn-bg3,#000000)'],
  ['#ffffff1a', 'rgba(var(--sn-text-rgb,255,255,255),.1)'],
  ['#ffffff4d', 'rgba(var(--sn-text-rgb,255,255,255),.3)'],
  ['#fff3', 'rgba(var(--sn-text-rgb,255,255,255),.2)']
]);

export function recolorSurfaces(text) {
  let count = 0;
  const result = text.replace(SURFACE_RE, (match, prop, hex) => {
    count += 1;
    return prop + SURFACE_MAP.get(hex.toLowerCase());
  });
  return { text: result, count };
}

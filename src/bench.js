import { detectSpotify } from "./spotify.js";
import { isSpotifyRunning } from "./process.js";
import { runPowerShell, psQuote } from "./winutil.js";

export async function runBench(seconds) {
  if (!Number.isInteger(seconds) || seconds < 10 || seconds > 300) {
    throw new Error("--seconds debe ser un entero entre 10 y 300.");
  }
  const sp = await detectSpotify();
  if (!sp.installed) throw new Error("No se encontró Spotify de escritorio.");
  if (await isSpotifyRunning()) {
    throw new Error("Spotify está abierto. Ciérralo del todo (también en la bandeja) y repite.");
  }

  const script = `
$exe = '${psQuote(sp.paths.spotifyExe)}'
$dur = ${seconds}
$sw = [Diagnostics.Stopwatch]::StartNew()
Start-Process -FilePath $exe
$win = $null
while ($sw.Elapsed.TotalSeconds -lt 90) {
  $w = Get-Process -Name Spotify -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 }
  if ($w) { $win = [math]::Round($sw.Elapsed.TotalSeconds, 2); break }
  Start-Sleep -Milliseconds 100
}
function Snap {
  $p = @(Get-Process -Name Spotify -ErrorAction SilentlyContinue)
  $ws = ($p | Measure-Object WorkingSet64 -Sum).Sum
  $cpu = ($p | Measure-Object CPU -Sum).Sum
  [pscustomobject]@{ ws = [double]$ws; cpu = [double]$cpu; n = $p.Count }
}
$first = Snap
$peak = $first.ws
$end = $sw.Elapsed.TotalSeconds + $dur
while ($sw.Elapsed.TotalSeconds -lt $end) {
  Start-Sleep -Seconds 2
  $s = Snap
  if ($s.ws -gt $peak) { $peak = $s.ws }
}
$last = Snap
[pscustomobject]@{
  timeToWindowSec = $win
  ramPeakMB = [math]::Round($peak / 1MB)
  ramEndMB = [math]::Round($last.ws / 1MB)
  cpuSeconds = [math]::Round(($last.cpu - $first.cpu), 1)
  processes = $last.n
} | ConvertTo-Json -Compress
`;

  const out = await runPowerShell(script, { timeoutMs: (seconds + 120) * 1000 });
  try {
    return JSON.parse(out.trim());
  } catch {
    throw new Error(`Salida inesperada de la medición: ${out.trim().slice(0, 200)}`);
  }
}

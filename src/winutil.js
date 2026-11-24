import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export function psQuote(value) {
  return String(value).replace(/'/g, "''");
}

function cleanOutput(text) {
  return String(text || "")
    .replace(/#< CLIXML[\s\S]*$/m, "")
    .trim();
}

export async function runPowerShell(script, { timeoutMs = 30000 } = {}) {
  const full = `$ProgressPreference = 'SilentlyContinue'\n$ErrorActionPreference = 'Stop'\n${script}\nexit 0\n`;
  const encoded = Buffer.from(full, "utf16le").toString("base64");
  try {
    const { stdout } = await execFileAsync(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-OutputFormat", "Text", "-EncodedCommand", encoded],
      { timeout: timeoutMs, windowsHide: true, maxBuffer: 10 * 1024 * 1024, encoding: "utf8" }
    );
    return stdout;
  } catch (err) {
    const stderr = cleanOutput(err.stderr);
    const stdout = cleanOutput(err.stdout);
    const detail = stderr || stdout || `código de salida ${err.code ?? "desconocido"}`;
    throw new Error(`PowerShell falló: ${detail}`);
  }
}

import fs from "node:fs";
import path from "node:path";
import { getPaths } from "./paths.js";

export function log(level, message) {
  const line = `${new Date().toISOString()} [${level}] ${message}\n`;
  try {
    const { logFile } = getPaths();
    fs.mkdirSync(path.dirname(logFile), { recursive: true });
    fs.appendFileSync(logFile, line);
  } catch {
    // El registro nunca debe romper el comando principal.
  }
}

export const info = (msg) => {
  console.log(msg);
  log("INFO", msg);
};

export const warn = (msg) => {
  console.warn(`Aviso: ${msg}`);
  log("WARN", msg);
};

export const error = (msg) => {
  console.error(`Error: ${msg}`);
  log("ERROR", msg);
};

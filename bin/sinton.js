#!/usr/bin/env node
import { run } from "../src/cli.js";

run(process.argv.slice(2)).then(
  (code) => {
    process.exitCode = code;
  },
  (err) => {
    console.error(`Error inesperado: ${err instanceof Error ? err.message : err}`);
    process.exitCode = 1;
  }
);

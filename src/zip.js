import fs from "node:fs";
import zlib from "node:zlib";

const EOCD_SIG = 0x06054b50;
const CEN_SIG = 0x02014b50;
const LOC_SIG = 0x04034b50;

export function readZip(filePath) {
  const buf = fs.readFileSync(filePath);
  const minEocd = 22;
  const limit = Math.max(0, buf.length - minEocd - 65535);
  let eocd = -1;
  for (let i = buf.length - minEocd; i >= limit; i--) {
    if (buf.readUInt32LE(i) === EOCD_SIG) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("No es un zip válido: falta el directorio final.");

  const total = buf.readUInt16LE(eocd + 10);
  let offset = buf.readUInt32LE(eocd + 16);
  if (total === 0xffff || offset === 0xffffffff) {
    throw new Error("Zip64 no está soportado.");
  }

  const entries = [];
  for (let n = 0; n < total; n++) {
    if (buf.readUInt32LE(offset) !== CEN_SIG) throw new Error("Directorio central dañado.");
    const method = buf.readUInt16LE(offset + 10);
    const compressedSize = buf.readUInt32LE(offset + 20);
    const size = buf.readUInt32LE(offset + 24);
    const nameLen = buf.readUInt16LE(offset + 28);
    const extraLen = buf.readUInt16LE(offset + 30);
    const commentLen = buf.readUInt16LE(offset + 32);
    const localOffset = buf.readUInt32LE(offset + 42);
    const name = buf.toString("utf8", offset + 46, offset + 46 + nameLen);
    entries.push({ name, method, compressedSize, size, localOffset });
    offset += 46 + nameLen + extraLen + commentLen;
  }

  function read(name) {
    const entry = entries.find((e) => e.name === name);
    if (!entry) throw new Error(`No existe en el zip: ${name}`);
    if (buf.readUInt32LE(entry.localOffset) !== LOC_SIG) throw new Error(`Cabecera local dañada: ${name}`);
    const nameLen = buf.readUInt16LE(entry.localOffset + 26);
    const extraLen = buf.readUInt16LE(entry.localOffset + 28);
    const start = entry.localOffset + 30 + nameLen + extraLen;
    const data = buf.subarray(start, start + entry.compressedSize);
    if (entry.method === 0) return Buffer.from(data);
    if (entry.method === 8) return zlib.inflateRawSync(data);
    throw new Error(`Método de compresión no soportado (${entry.method}): ${name}`);
  }

  return { entries, read };
}

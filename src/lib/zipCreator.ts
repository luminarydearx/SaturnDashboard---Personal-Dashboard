/**
 * zipCreator.ts
 * ─────────────────────────────────────────────────────────────
 * Pure Node.js ZIP file creator — zero external dependencies.
 * Uses only built-in `node:zlib` for DEFLATE compression.
 * Implements the PKZIP 2.0 file format spec.
 * ─────────────────────────────────────────────────────────────
 */

import { deflateRawSync } from 'node:zlib';

// ── CRC-32 ──────────────────────────────────────────────────
const CRC_TABLE = ((): number[] => {
  const t: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// ── Little-endian write helpers ──────────────────────────────
function u16(n: number): Buffer { const b = Buffer.allocUnsafe(2); b.writeUInt16LE(n >>> 0, 0); return b; }
function u32(n: number): Buffer { const b = Buffer.allocUnsafe(4); b.writeUInt32LE(n >>> 0, 0); return b; }

function dosTime(d: Date) {
  return {
    t: ((d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)) & 0xffff,
    d: (((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) & 0xffff,
  };
}

export interface ZipEntry {
  name: string;           // path inside zip  e.g. "data/users.json"
  content: Buffer | string;
}

/**
 * createZipBuffer(entries) → Buffer
 * Creates a valid .zip in memory from an array of file entries.
 */
export function createZipBuffer(entries: ZipEntry[]): Buffer {
  const now = new Date();
  const { t: dt, d: dd } = dosTime(now);

  const localParts:   Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const raw  = Buffer.isBuffer(entry.content) ? entry.content : Buffer.from(entry.content, 'utf-8');
    const name = Buffer.from(entry.name, 'utf-8');
    const cmp  = deflateRawSync(raw, { level: 6 });
    const useDeflate = cmp.length < raw.length;
    const method = useDeflate ? 8 : 0;
    const data   = useDeflate ? cmp : raw;
    const crc    = crc32(raw);

    // Local file header (signature 0x04034b50)
    const lh = Buffer.concat([
      Buffer.from([0x50, 0x4b, 0x03, 0x04]),
      u16(20), u16(0x0800), u16(method),
      u16(dt), u16(dd),
      u32(crc), u32(data.length), u32(raw.length),
      u16(name.length), u16(0),
      name,
    ]);

    localParts.push(lh, data);

    // Central directory entry (signature 0x02014b50)
    centralParts.push(Buffer.concat([
      Buffer.from([0x50, 0x4b, 0x01, 0x02]),
      u16(0x0314), u16(20), u16(0x0800), u16(method),
      u16(dt), u16(dd),
      u32(crc), u32(data.length), u32(raw.length),
      u16(name.length), u16(0), u16(0), u16(0), u16(0),
      u32(0o100644 << 16), u32(offset),
      name,
    ]));

    offset += lh.length + data.length;
  }

  const cd   = Buffer.concat(centralParts);
  const eocd = Buffer.concat([
    Buffer.from([0x50, 0x4b, 0x05, 0x06]),
    u16(0), u16(0),
    u16(entries.length), u16(entries.length),
    u32(cd.length), u32(offset),
    u16(0),
  ]);

  return Buffer.concat([...localParts, cd, eocd]);
}

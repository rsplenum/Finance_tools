/**
 * A zip of files stored as they are (method 0), the container of the Excel copy (.xlsx) and the Word copy (.docx), with
 * its CRC-32. Written here, no library. Pure: bytes in memory, no DOM.
 */

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
export function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (const b of data) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** A zip of the files as they are (method 0), dated `when`. */
export function zip(files: { name: string; data: Uint8Array }[], when: Date): Uint8Array<ArrayBuffer> {
  const time = (when.getHours() << 11) | (when.getMinutes() << 5) | (when.getSeconds() >> 1);
  const date = ((when.getFullYear() - 1980) << 9) | ((when.getMonth() + 1) << 5) | when.getDate();
  const parts: Uint8Array[] = [], central: Uint8Array[] = [];
  let offset = 0;
  for (const f of files) {
    const name = new TextEncoder().encode(f.name), crc = crc32(f.data), size = f.data.length;
    const local = new Uint8Array(30 + name.length), l = new DataView(local.buffer);
    [[0, 0x04034b50, 4], [4, 20, 2], [10, time, 2], [12, date, 2], [14, crc, 4], [18, size, 4], [22, size, 4], [26, name.length, 2]]
      .forEach(([pos, v, n]) => (n === 4 ? l.setUint32(pos, v, true) : l.setUint16(pos, v, true)));
    local.set(name, 30);
    const entry = new Uint8Array(46 + name.length), c = new DataView(entry.buffer);
    [[0, 0x02014b50, 4], [4, 20, 2], [6, 20, 2], [12, time, 2], [14, date, 2], [16, crc, 4], [20, size, 4], [24, size, 4], [28, name.length, 2], [42, offset, 4]]
      .forEach(([pos, v, n]) => (n === 4 ? c.setUint32(pos, v, true) : c.setUint16(pos, v, true)));
    entry.set(name, 46);
    parts.push(local, f.data);
    central.push(entry);
    offset += local.length + size;
  }
  const dirSize = central.reduce((a, x) => a + x.length, 0), end = new Uint8Array(22), e = new DataView(end.buffer);
  e.setUint32(0, 0x06054b50, true);
  e.setUint16(8, files.length, true);
  e.setUint16(10, files.length, true);
  e.setUint32(12, dirSize, true);
  e.setUint32(16, offset, true);
  const out = new Uint8Array(offset + dirSize + 22);
  let pos = 0;
  for (const p of [...parts, ...central, end]) { out.set(p, pos); pos += p.length; }
  return out;
}

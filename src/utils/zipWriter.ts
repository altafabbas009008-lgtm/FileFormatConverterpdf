/**
 * Zero-dependency / pako-backed offline ZIP archive generator.
 * Standard PKZip 2.0 format compatible with all operating systems (Windows, macOS Finder, Linux, mobile)
 * and OpenXML (.docx) specifications.
 */

import pako from 'pako';

function createCrc32Table(): Uint32Array {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
}

const CRC_TABLE = createCrc32Table();

export function calculateCrc32(data: Uint8Array): number {
  let crc = 0 ^ -1;
  for (let i = 0; i < data.length; i++) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ data[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

export interface ZipEntry {
  name: string;
  data: Uint8Array;
}

export class ZipWriter {
  private files: ZipEntry[] = [];

  addFile(name: string, data: Uint8Array | string): void {
    const bytes =
      typeof data === 'string' ? new TextEncoder().encode(data) : data;
    this.files.push({ name, data: bytes });
  }

  generateZip(compress = true): Uint8Array {
    const textEncoder = new TextEncoder();
    const localHeaders: Uint8Array[] = [];
    const centralHeaders: Uint8Array[] = [];
    let offset = 0;

    for (const f of this.files) {
      const nameBytes = textEncoder.encode(f.name);
      const crc = calculateCrc32(f.data);
      const uncompressedLen = f.data.length;

      let fileBytes = f.data;
      let method = 0; // 0 = stored, 8 = deflated

      if (compress && typeof pako !== 'undefined' && pako.deflateRaw) {
        try {
          const deflated = pako.deflateRaw(f.data);
          if (deflated.length <= uncompressedLen) {
            fileBytes = deflated;
            method = 8;
          }
        } catch {
          method = 0;
          fileBytes = f.data;
        }
      }

      const compressedLen = fileBytes.length;

      // Local File Header (30 bytes + name + data)
      const localBuf = new Uint8Array(30 + nameBytes.length + compressedLen);
      const localView = new DataView(localBuf.buffer, localBuf.byteOffset, localBuf.byteLength);

      localView.setUint32(0, 0x04034b50, true); // Local file header signature
      localView.setUint16(4, 20, true); // Version needed to extract (2.0)
      localView.setUint16(6, 0, true); // General purpose bit flag
      localView.setUint16(8, method, true); // Compression method (0 = stored, 8 = deflated)
      localView.setUint16(10, 0, true); // File last modification time
      localView.setUint16(12, 0, true); // File last modification date
      localView.setUint32(14, crc, true); // CRC-32
      localView.setUint32(18, compressedLen, true); // Compressed size
      localView.setUint32(22, uncompressedLen, true); // Uncompressed size
      localView.setUint16(26, nameBytes.length, true); // File name length
      localView.setUint16(28, 0, true); // Extra field length

      localBuf.set(nameBytes, 30);
      localBuf.set(fileBytes, 30 + nameBytes.length);

      // Central Directory Header (46 bytes + name)
      const centralBuf = new Uint8Array(46 + nameBytes.length);
      const centralView = new DataView(centralBuf.buffer, centralBuf.byteOffset, centralBuf.byteLength);

      centralView.setUint32(0, 0x02014b50, true); // Central directory signature
      centralView.setUint16(4, 20, true); // Version made by
      centralView.setUint16(6, 20, true); // Version needed to extract
      centralView.setUint16(8, 0, true); // Bit flag
      centralView.setUint16(10, method, true); // Compression method
      centralView.setUint16(12, 0, true); // Mod time
      centralView.setUint16(14, 0, true); // Mod date
      centralView.setUint32(16, crc, true); // CRC-32
      centralView.setUint32(20, compressedLen, true); // Compressed size
      centralView.setUint32(24, uncompressedLen, true); // Uncompressed size
      centralView.setUint16(28, nameBytes.length, true); // File name length
      centralView.setUint16(30, 0, true); // Extra field length
      centralView.setUint16(32, 0, true); // File comment length
      centralView.setUint16(34, 0, true); // Disk number start
      centralView.setUint16(36, 0, true); // Internal file attributes
      centralView.setUint32(38, 0, true); // External file attributes
      centralView.setUint32(42, offset, true); // Relative offset of local header

      centralBuf.set(nameBytes, 46);

      offset += localBuf.length;
      localHeaders.push(localBuf);
      centralHeaders.push(centralBuf);
    }

    // End of Central Directory Record (22 bytes)
    const centralSize = centralHeaders.reduce((acc, h) => acc + h.length, 0);
    const eocdBuf = new Uint8Array(22);
    const eocdView = new DataView(eocdBuf.buffer, eocdBuf.byteOffset, eocdBuf.byteLength);

    eocdView.setUint32(0, 0x06054b50, true); // End of central dir signature
    eocdView.setUint16(4, 0, true); // Number of this disk
    eocdView.setUint16(6, 0, true); // Number of the disk with start of central directory
    eocdView.setUint16(8, this.files.length, true); // Total entries on this disk
    eocdView.setUint16(10, this.files.length, true); // Total entries
    eocdView.setUint32(12, centralSize, true); // Size of central directory
    eocdView.setUint32(16, offset, true); // Offset of start of central directory
    eocdView.setUint16(20, 0, true); // Comment length

    // Assemble the complete archive
    const totalBytes = offset + centralSize + 22;
    const finalArchive = new Uint8Array(totalBytes);
    let curPos = 0;

    for (const h of localHeaders) {
      finalArchive.set(h, curPos);
      curPos += h.length;
    }
    for (const c of centralHeaders) {
      finalArchive.set(c, curPos);
      curPos += c.length;
    }
    finalArchive.set(eocdBuf, curPos);

    return finalArchive;
  }
}

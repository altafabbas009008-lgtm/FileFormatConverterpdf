import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, '..');
const WASM_DIR = path.join(ROOT_DIR, 'public', 'wasm');
const TARGET_FILES = ['soffice.wasm', 'soffice.data'];
const CHUNK_SIZE = 45 * 1024 * 1024; // 45 MB chunks (well below GitHub's 50MB warning threshold)

const mode = process.argv[2];

if (!mode || (mode !== 'split' && mode !== 'join')) {
  console.log('Usage: node scripts/wasm-chunks.js [split|join]');
  process.exit(1);
}

if (!fs.existsSync(WASM_DIR)) {
  console.error(`WASM directory not found: ${WASM_DIR}`);
  process.exit(1);
}

if (mode === 'split') {
  console.log('--- Splitting large WASM files for GitHub compatibility ---');

  for (const filename of TARGET_FILES) {
    const fullPath = path.join(WASM_DIR, filename);

    if (!fs.existsSync(fullPath)) {
      console.warn(`[WARN] File not found to split: ${filename}`);
      continue;
    }

    const stat = fs.statSync(fullPath);
    console.log(`\nProcessing ${filename} (${(stat.size / (1024 * 1024)).toFixed(2)} MB)...`);

    // Remove existing parts for this file
    const existingParts = fs
      .readdirSync(WASM_DIR)
      .filter((f) => f.startsWith(`${filename}.part_`));
    for (const part of existingParts) {
      fs.unlinkSync(path.join(WASM_DIR, part));
    }

    const fd = fs.openSync(fullPath, 'r');
    const buffer = Buffer.alloc(CHUNK_SIZE);
    let bytesRead = 0;
    let partIndex = 0;

    while ((bytesRead = fs.readSync(fd, buffer, 0, CHUNK_SIZE, null)) > 0) {
      const partName = `${filename}.part_${String(partIndex).padStart(2, '0')}`;
      const partPath = path.join(WASM_DIR, partName);
      const outFd = fs.openSync(partPath, 'w');
      fs.writeSync(outFd, buffer, 0, bytesRead);
      fs.closeSync(outFd);

      console.log(`  ✓ Created ${partName} (${(bytesRead / (1024 * 1024)).toFixed(2)} MB)`);
      partIndex++;
    }

    fs.closeSync(fd);
    console.log(`Done splitting ${filename} into ${partIndex} parts.`);
  }

  console.log('\nAll files split successfully! You can now commit the .part_* files.');
} else if (mode === 'join') {
  console.log('--- Checking & Reassembling WASM files ---');

  if (process.env.VERCEL) {
    console.log('[INFO] Vercel environment detected.');
    console.log('[INFO] Skipping local WASM reassembly because production loads WASM directly from AWS CloudFront CDN.');
    process.exit(0);
  }

  for (const filename of TARGET_FILES) {
    const targetPath = path.join(WASM_DIR, filename);

    if (fs.existsSync(targetPath) && fs.statSync(targetPath).size > 0) {
      console.log(`[OK] ${filename} already exists (${(fs.statSync(targetPath).size / (1024 * 1024)).toFixed(2)} MB). Skipping.`);
      continue;
    }

    const parts = fs
      .readdirSync(WASM_DIR)
      .filter((f) => f.startsWith(`${filename}.part_`))
      .sort();

    if (parts.length === 0) {
      console.warn(`[WARN] No parts found to reassemble ${filename}`);
      continue;
    }

    console.log(`Reassembling ${filename} from ${parts.length} parts...`);
    const writeFd = fs.openSync(targetPath, 'w');
    const readBuffer = Buffer.alloc(64 * 1024); // 64 KB stream buffer

    for (const part of parts) {
      const partPath = path.join(WASM_DIR, part);
      const readFd = fs.openSync(partPath, 'r');
      let bytesRead = 0;
      while ((bytesRead = fs.readSync(readFd, readBuffer, 0, readBuffer.length, null)) > 0) {
        fs.writeSync(writeFd, readBuffer, 0, bytesRead);
      }
      fs.closeSync(readFd);
      console.log(`  + Merged ${part}`);
    }

    fs.closeSync(writeFd);
    const finalStat = fs.statSync(targetPath);
    console.log(`  ✓ Reassembled ${filename} (${(finalStat.size / (1024 * 1024)).toFixed(2)} MB) successfully.`);
  }

  console.log('\nReassembly complete.');
}

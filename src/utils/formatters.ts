/**
 * Formats a byte count into human-readable units (B, KB, MB, GB).
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Parses user input page ranges like "1-3, 5, 8-10" into a sorted list of 0-based page indices.
 */
export function parsePageRanges(rangeStr: string, maxPages: number): number[] {
  const indices = new Set<number>();
  const parts = rangeStr.split(',').map((p) => p.trim()).filter(Boolean);

  for (const part of parts) {
    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-').map((s) => s.trim());
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);

      if (!isNaN(start) && !isNaN(end)) {
        const from = Math.max(1, Math.min(start, end));
        const to = Math.min(maxPages, Math.max(start, end));
        for (let i = from; i <= to; i++) {
          indices.add(i - 1); // convert to 0-based index
        }
      }
    } else {
      const pageNum = parseInt(part, 10);
      if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= maxPages) {
        indices.add(pageNum - 1);
      }
    }
  }

  return Array.from(indices).sort((a, b) => a - b);
}

/**
 * Converts a list of 0-based page indices back into a clean range string.
 * e.g. [0, 1, 2, 4, 6, 7] -> "1-3, 5, 7-8"
 */
export function formatPageIndicesToRanges(indices: number[]): string {
  if (!indices || indices.length === 0) return '';
  const sorted = Array.from(new Set(indices)).sort((a, b) => a - b);
  const ranges: string[] = [];
  let start = sorted[0];
  let prev = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    const curr = sorted[i];
    if (curr === prev + 1) {
      prev = curr;
    } else {
      ranges.push(start === prev ? `${start + 1}` : `${start + 1}-${prev + 1}`);
      start = curr;
      prev = curr;
    }
  }
  ranges.push(start === prev ? `${start + 1}` : `${start + 1}-${prev + 1}`);
  return ranges.join(', ');
}

/**
 * Generates safe output filenames ensuring non-destructive behavior.
 * e.g. "annual_report.pdf" -> "annual_report_merged_2026-10-20.pdf"
 * or ("annual_report.pdf", "converted", "docx") -> "annual_report_converted_2026-10-20.docx"
 */
export function generateSafeOutputFilename(
  originalName: string,
  suffix: string,
  extension?: string
): string {
  // Strip only the final file extension (e.g. .pdf, .docx, .jpeg, etc.)
  let baseName = originalName;
  const lastDot = originalName.lastIndexOf('.');
  if (lastDot > 0 && originalName.length - lastDot <= 6) {
    baseName = originalName.slice(0, lastDot);
  }

  // Handle cases where suffix might already have an extension like "converted.docx" or "images.zip"
  let cleanSuffix = suffix;
  let targetExt = extension;

  const suffixDot = cleanSuffix.lastIndexOf('.');
  if (suffixDot !== -1 && cleanSuffix.length - suffixDot <= 6) {
    if (!targetExt) {
      targetExt = cleanSuffix.slice(suffixDot + 1);
    }
    cleanSuffix = cleanSuffix.slice(0, suffixDot);
  }

  if (!targetExt) {
    targetExt = 'pdf';
  }

  const cleanExtension = targetExt.replace(/^\./, '').toLowerCase();
  const timestamp = new Date().toISOString().slice(0, 10);
  return `${baseName}_${cleanSuffix}_${timestamp}.${cleanExtension}`;
}

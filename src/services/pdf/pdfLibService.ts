import { PDFDocument, degrees } from 'pdf-lib';

/**
 * Strips any leading bytes (BOM or whitespace) before the '%PDF-' header
 * to ensure pdf-lib parses documents smoothly without failing on offset 0.
 */
function cleanPdfBytes(bytes: Uint8Array): Uint8Array {
  if (!bytes || bytes.length === 0) {
    throw new Error('PDF buffer is empty (0 bytes).');
  }
  if (
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  ) {
    return bytes;
  }
  for (let i = 0; i < Math.min(bytes.length - 5, 2048); i++) {
    if (
      bytes[i] === 0x25 &&
      bytes[i + 1] === 0x50 &&
      bytes[i + 2] === 0x44 &&
      bytes[i + 3] === 0x46 &&
      bytes[i + 4] === 0x2d
    ) {
      return bytes.slice(i);
    }
  }
  return bytes;
}

export class PdfLibService {
  /**
   * FR-1: Merge multiple PDFs into a single document maintaining the given order.
   */
  static async mergePdfs(
    pdfBuffers: Uint8Array[],
    onProgress?: (progress: number) => void
  ): Promise<Uint8Array> {
    if (pdfBuffers.length === 0) {
      throw new Error('At least one PDF file is required to merge.');
    }

    const mergedPdf = await PDFDocument.create();
    const totalFiles = pdfBuffers.length;

    for (let i = 0; i < totalFiles; i++) {
      const cleaned = cleanPdfBytes(pdfBuffers[i]);
      const srcDoc = await PDFDocument.load(cleaned, { ignoreEncryption: false });
      const copiedPages = await mergedPdf.copyPages(srcDoc, srcDoc.getPageIndices());
      copiedPages.forEach((page) => mergedPdf.addPage(page));

      if (onProgress) {
        onProgress(Math.round(((i + 1) / totalFiles) * 100));
      }
    }

    return await mergedPdf.save({ useObjectStreams: true });
  }

  /**
   * FR-2 & FR-6: Extract specific pages into a brand new PDF document.
   * @param pageIndices 0-based indices of pages to extract.
   */
  static async extractPages(
    sourceBuffer: Uint8Array,
    pageIndices: number[]
  ): Promise<Uint8Array> {
    const cleaned = cleanPdfBytes(sourceBuffer);
    const srcDoc = await PDFDocument.load(cleaned);
    const newDoc = await PDFDocument.create();

    const validIndices = pageIndices.filter(
      (idx) => idx >= 0 && idx < srcDoc.getPageCount()
    );

    if (validIndices.length === 0) {
      throw new Error('No valid pages selected for extraction.');
    }

    const copiedPages = await newDoc.copyPages(srcDoc, validIndices);
    copiedPages.forEach((page) => newDoc.addPage(page));

    return await newDoc.save({ useObjectStreams: true });
  }
  /**
 * Split a PDF into separate single-page PDF documents.
 * Returns one PDF byte array per source page.
 */
static async splitIntoSinglePages(
  sourceBuffer: Uint8Array
): Promise<Uint8Array[]> {
  const cleaned = cleanPdfBytes(sourceBuffer);
  const sourceDoc = await PDFDocument.load(cleaned);
  const totalPages = sourceDoc.getPageCount();

  if (totalPages === 0) {
    throw new Error('The PDF contains no pages.');
  }

  const results: Uint8Array[] = [];

  for (let i = 0; i < totalPages; i++) {
    const outputDoc = await PDFDocument.create();
    const [page] = await outputDoc.copyPages(sourceDoc, [i]);

    outputDoc.addPage(page);
    results.push(
      await outputDoc.save({ useObjectStreams: true })
    );
  }

  return results;
}

  /**
   * Attempts to recover a PDF that pdf-lib can still parse.
   * This is a best-effort rewrite, not a guaranteed repair for every corrupt PDF.
   */
  static async repairPdf(sourceBuffer: Uint8Array): Promise<Uint8Array> {
    const cleaned = cleanPdfBytes(sourceBuffer);

    const doc = await PDFDocument.load(cleaned, {
      ignoreEncryption: false,
      updateMetadata: false,
    });

    const repairedBytes = await doc.save({
      useObjectStreams: true,
      addDefaultPage: false,
    });

    // Verify that the output can be reopened.
    const verification = await PDFDocument.load(repairedBytes);
    if (verification.getPageCount() !== doc.getPageCount()) {
      throw new Error('The repaired PDF failed verification.');
    }

    return repairedBytes;
  }


  /**
   * FR-4: Rotate specific pages by clockwise degrees (90, 180, 270).
   * @param rotationMap Map of 0-based page index to added rotation angle.
   */
  static async rotatePages(
    sourceBuffer: Uint8Array,
    rotationMap: Record<number, number>
  ): Promise<Uint8Array> {
    const cleaned = cleanPdfBytes(sourceBuffer);
    const doc = await PDFDocument.load(cleaned);
    const pages = doc.getPages();

    for (const [idxStr, angle] of Object.entries(rotationMap)) {
      const idx = parseInt(idxStr, 10);
      if (idx >= 0 && idx < pages.length) {
        const page = pages[idx];
        const currentRotation = page.getRotation().angle;
        page.setRotation(degrees((currentRotation + angle) % 360));
      }
    }

    return await doc.save({ useObjectStreams: true });
  }

  /**
   * FR-5: Delete unwanted pages from a PDF.
   * @param indicesToDelete 0-based indices of pages to remove.
   */
  static async deletePages(
    sourceBuffer: Uint8Array,
    indicesToDelete: number[]
  ): Promise<Uint8Array> {
    const cleaned = cleanPdfBytes(sourceBuffer);
    const doc = await PDFDocument.load(cleaned);
    const totalPages = doc.getPageCount();

    if (indicesToDelete.length >= totalPages) {
      throw new Error('Cannot delete all pages. The resulting PDF would be empty.');
    }

    // Sort descending so removing an index doesn't shift earlier indices
    const sortedDesc = [...indicesToDelete].sort((a, b) => b - a);
    for (const idx of sortedDesc) {
      if (idx >= 0 && idx < doc.getPageCount()) {
        doc.removePage(idx);
      }
    }

    return await doc.save({ useObjectStreams: true });
  }

  /**
   * FR-7: Reorder pages visually.
   * @param newOrder Array of original 0-based indices in their new desired order.
   */
  static async reorderPages(
    sourceBuffer: Uint8Array,
    newOrder: number[]
  ): Promise<Uint8Array> {
    const cleaned = cleanPdfBytes(sourceBuffer);
    const srcDoc = await PDFDocument.load(cleaned);
    const newDoc = await PDFDocument.create();

    const copiedPages = await newDoc.copyPages(srcDoc, newOrder);
    copiedPages.forEach((page) => newDoc.addPage(page));

    return await newDoc.save({ useObjectStreams: true });
  }

  /**
   * FR-9: Convert multiple images (JPG / PNG) into a single PDF document with custom page layout.
   */
  static async imagesToPdf(
    images: { data: Uint8Array; type: 'image/jpeg' | 'image/png' }[],
    options: {
      pageSize?: 'fit' | 'a4' | 'letter';
      orientation?: 'auto' | 'portrait' | 'landscape';
      margin?: number;
    } = {}
  ): Promise<Uint8Array> {
    if (images.length === 0) {
      throw new Error('No images provided for conversion.');
    }

    const { pageSize = 'fit', orientation = 'auto', margin = 0 } = options;
    const doc = await PDFDocument.create();

    // Standard page dimensions in points (72 points = 1 inch)
    const PAGE_DIMENSIONS = {
      a4: { width: 595.28, height: 841.89 },
      letter: { width: 612.0, height: 792.0 },
    };

    for (const imgItem of images) {
      const embeddedImage =
        imgItem.type === 'image/jpeg'
          ? await doc.embedJpg(imgItem.data)
          : await doc.embedPng(imgItem.data);

      const imgWidth = embeddedImage.width;
      const imgHeight = embeddedImage.height;

      if (pageSize === 'fit') {
        const page = doc.addPage([imgWidth + margin * 2, imgHeight + margin * 2]);
        page.drawImage(embeddedImage, {
          x: margin,
          y: margin,
          width: imgWidth,
          height: imgHeight,
        });
      } else {
        const standard = PAGE_DIMENSIONS[pageSize];
        let pWidth = standard.width;
        let pHeight = standard.height;

        const isImgLandscape = imgWidth > imgHeight;
        if (
          orientation === 'landscape' ||
          (orientation === 'auto' && isImgLandscape)
        ) {
          pWidth = standard.height;
          pHeight = standard.width;
        }

        const usableWidth = Math.max(10, pWidth - margin * 2);
        const usableHeight = Math.max(10, pHeight - margin * 2);

        // Aspect fit image into usable bounding box
        const scaleFactor = Math.min(
          usableWidth / imgWidth,
          usableHeight / imgHeight
        );
        const drawWidth = imgWidth * scaleFactor;
        const drawHeight = imgHeight * scaleFactor;

        // Center on page
        const drawX = margin + (usableWidth - drawWidth) / 2;
        const drawY = margin + (usableHeight - drawHeight) / 2;

        const page = doc.addPage([pWidth, pHeight]);
        page.drawImage(embeddedImage, {
          x: drawX,
          y: drawY,
          width: drawWidth,
          height: drawHeight,
        });
      }
    }

    return await doc.save({ useObjectStreams: true });
  }
}

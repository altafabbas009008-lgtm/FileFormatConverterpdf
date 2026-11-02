
import * as XLSX from 'xlsx';
import { PdfRenderService } from '@/services/pdf/pdfRenderService';

export class PdfToExcelService {
  static async convert(
    pdfBytes: Uint8Array,
    onProgress?: (percent: number, status: string) => void
  ): Promise<Uint8Array> {
    onProgress?.(10, 'Opening PDF...');

    const pdf = await PdfRenderService.loadDocument(pdfBytes.slice());
    const workbook = XLSX.utils.book_new();

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      onProgress?.(
        Math.round(10 + (pageNumber / pdf.numPages) * 80),
        `Extracting page ${pageNumber} of ${pdf.numPages}...`
      );

      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();

      const items = content.items
        .filter((item: any) => typeof item.str === 'string' && item.str.trim())
        .map((item: any) => ({
          text: item.str.trim(),
          x: item.transform?.[4] ?? 0,
          y: item.transform?.[5] ?? 0,
        }))
        .sort((a, b) => b.y - a.y || a.x - b.x);

      const rows: string[][] = [];
      let currentY: number | null = null;
      let currentRow: typeof items = [];

      const saveRow = () => {
        if (currentRow.length === 0) return;

        currentRow.sort((a, b) => a.x - b.x);

        const cells: string[] = [];
        let lastX: number | null = null;

        for (const item of currentRow) {
          if (lastX !== null && item.x - lastX > 45) {
            cells.push(item.text);
          } else if (cells.length === 0) {
            cells.push(item.text);
          } else {
            cells[cells.length - 1] += ` ${item.text}`;
          }

          lastX = item.x;
        }

        rows.push(cells);
        currentRow = [];
      };

      for (const item of items) {
        if (currentY !== null && Math.abs(item.y - currentY) > 4) {
          saveRow();
        }

        if (currentY === null || Math.abs(item.y - currentY) > 4) {
          currentY = item.y;
        }

        currentRow.push(item);
      }

      saveRow();

      const sheetRows = rows.length
        ? rows
        : [['No selectable text found on this page. Scanned PDFs may require OCR.']];

      const worksheet = XLSX.utils.aoa_to_sheet(sheetRows);
      const sheetName = `Page ${pageNumber}`;
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    }

    onProgress?.(95, 'Creating Excel workbook...');

    const output = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array',
    });

    onProgress?.(100, 'Excel file ready!');

    return new Uint8Array(output);
  }
}

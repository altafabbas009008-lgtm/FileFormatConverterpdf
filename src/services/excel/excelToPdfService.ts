import * as XLSX from 'xlsx';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export interface ParsedSheetData {
  name: string;
  rows: string[][];
  headers: string[];
  rowCount: number;
  colCount: number;
}

export interface ParsedWorkbook {
  fileName: string;
  sheetNames: string[];
  sheets: Record<string, ParsedSheetData>;
  totalRows: number;
}

export type ExcelPdfTheme = 'excel' | 'navy' | 'slate' | 'clean';
export type ExcelPageSize = 'a4' | 'letter' | 'legal';
export type ExcelOrientation = 'landscape' | 'portrait';
export type ExcelFitMode = 'fit-columns' | 'fit-sheet' | 'auto';
export type ExcelMarginSize = 'normal' | 'narrow' | 'wide';

export interface ExcelToPdfOptions {
  orientation?: ExcelOrientation;
  pageSize?: ExcelPageSize;
  selectedSheets?: string[];
  fitMode?: ExcelFitMode;
  theme?: ExcelPdfTheme;
  marginSize?: ExcelMarginSize;
  showGridlines?: boolean;
  zebraStriping?: boolean;
  repeatHeaderOnEveryPage?: boolean;
  includeSheetTitle?: boolean;
  includePageNumbers?: boolean;
}

interface ColorRGB {
  r: number;
  g: number;
  b: number;
}

interface ThemePalette {
  headerBg: ColorRGB;
  headerText: ColorRGB;
  zebraBg: ColorRGB;
  borderColor: ColorRGB;
  titleBg: ColorRGB;
  titleText: ColorRGB;
}

const THEMES: Record<ExcelPdfTheme, ThemePalette> = {
  excel: {
    headerBg: { r: 0.063, g: 0.486, b: 0.255 }, // #107c41 (Excel Green)
    headerText: { r: 1, g: 1, b: 1 },
    zebraBg: { r: 0.965, g: 0.988, b: 0.973 }, // Light tint
    borderColor: { r: 0.85, g: 0.90, b: 0.87 },
    titleBg: { r: 0.93, g: 0.97, b: 0.94 },
    titleText: { r: 0.063, g: 0.486, b: 0.255 },
  },
  navy: {
    headerBg: { r: 0.118, g: 0.227, b: 0.541 }, // #1e3a8a
    headerText: { r: 1, g: 1, b: 1 },
    zebraBg: { r: 0.965, g: 0.976, b: 0.992 },
    borderColor: { r: 0.85, g: 0.88, b: 0.94 },
    titleBg: { r: 0.93, g: 0.95, b: 0.99 },
    titleText: { r: 0.118, g: 0.227, b: 0.541 },
  },
  slate: {
    headerBg: { r: 0.2, g: 0.255, b: 0.333 }, // #334155
    headerText: { r: 1, g: 1, b: 1 },
    zebraBg: { r: 0.973, g: 0.98, b: 0.988 },
    borderColor: { r: 0.88, g: 0.90, b: 0.92 },
    titleBg: { r: 0.94, g: 0.95, b: 0.97 },
    titleText: { r: 0.2, g: 0.255, b: 0.333 },
  },
  clean: {
    headerBg: { r: 0.94, g: 0.96, b: 0.98 }, // Minimalist
    headerText: { r: 0.06, g: 0.09, b: 0.16 },
    zebraBg: { r: 1, g: 1, b: 1 },
    borderColor: { r: 0.8, g: 0.83, b: 0.86 },
    titleBg: { r: 0.97, g: 0.98, b: 0.99 },
    titleText: { r: 0.06, g: 0.09, b: 0.16 },
  },
};

const PAGE_DIMENSIONS: Record<ExcelPageSize, { width: number; height: number }> = {
  a4: { width: 595.28, height: 841.89 },
  letter: { width: 612.0, height: 792.0 },
  legal: { width: 612.0, height: 1008.0 },
};

const MARGIN_SIZES: Record<ExcelMarginSize, number> = {
  narrow: 20,
  normal: 36, // 0.5 in
  wide: 54, // 0.75 in
};

export class ExcelToPdfService {
  /**
   * Parses an Excel spreadsheet (XLSX, XLS, CSV) into structured workbook data.
   */
  static parseWorkbook(bytes: Uint8Array, fileName: string): ParsedWorkbook {
    const workbook = XLSX.read(bytes, { type: 'array', cellDates: true });
    const sheetNames = workbook.SheetNames;
    const sheets: Record<string, ParsedSheetData> = {};
    let totalRows = 0;

    for (const name of sheetNames) {
      const sheet = workbook.Sheets[name];
      if (!sheet) continue;

      const rawGrid = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        defval: '',
        raw: false,
      }) as string[][];

      // Trim empty trailing rows
      while (rawGrid.length > 0 && rawGrid[rawGrid.length - 1].every((cell) => !String(cell).trim())) {
        rawGrid.pop();
      }

      // Find max columns
      let maxCols = 0;
      for (const row of rawGrid) {
        if (row.length > maxCols) maxCols = row.length;
      }

      // Normalize row lengths
      const normalizedRows: string[][] = [];
      for (const row of rawGrid) {
        const norm: string[] = [];
        for (let c = 0; c < maxCols; c++) {
          norm.push(row[c] !== undefined && row[c] !== null ? String(row[c]) : '');
        }
        normalizedRows.push(norm);
      }

      let headers: string[] = [];
      let dataRows: string[][] = [];

      if (normalizedRows.length > 0) {
        headers = normalizedRows[0];
        dataRows = normalizedRows.slice(1);
      }

      totalRows += dataRows.length;

      sheets[name] = {
        name,
        headers,
        rows: dataRows,
        rowCount: dataRows.length,
        colCount: maxCols,
      };
    }

    return {
      fileName,
      sheetNames,
      sheets,
      totalRows,
    };
  }

  /**
   * Converts parsed spreadsheet workbook data into a professional, vector PDF document.
   */
  static async convertWorkbookToPdf(
    workbook: ParsedWorkbook,
    options: ExcelToPdfOptions = {},
    onProgress?: (percent: number, status: string) => void
  ): Promise<Uint8Array> {
    onProgress?.(10, 'Initializing vector PDF engine...');

    const {
      orientation = 'landscape',
      pageSize = 'a4',
      selectedSheets = workbook.sheetNames,
      fitMode = 'fit-columns',
      theme = 'excel',
      marginSize = 'normal',
      showGridlines = true,
      zebraStriping = true,
      repeatHeaderOnEveryPage = true,
      includeSheetTitle = true,
      includePageNumbers = true,
    } = options;

    const palette = THEMES[theme] || THEMES.excel;
    const baseDim = PAGE_DIMENSIONS[pageSize] || PAGE_DIMENSIONS.a4;
    const margin = MARGIN_SIZES[marginSize] || MARGIN_SIZES.normal;

    // Determine page width and height based on orientation
    const pWidth = orientation === 'landscape' ? baseDim.height : baseDim.width;
    const pHeight = orientation === 'landscape' ? baseDim.width : baseDim.height;
    const usableWidth = pWidth - margin * 2;

    const pdfDoc = await PDFDocument.create();
    const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Filter sheets to convert
    const sheetsToProcess = selectedSheets
      .map((s) => workbook.sheets[s])
      .filter((s): s is ParsedSheetData => Boolean(s));

    if (sheetsToProcess.length === 0) {
      throw new Error('No sheets selected for PDF conversion.');
    }

    interface PagePlan {
      sheetName: string;
      headers: string[];
      colWidths: number[];
      rows: string[][];
      isNumericCol: boolean[];
      pageNumberInSheet: number;
      totalPagesInSheet: number;
    }

    const pagePlans: PagePlan[] = [];

    // Pre-calculate pagination for all sheets
    for (let sIdx = 0; sIdx < sheetsToProcess.length; sIdx++) {
      const sheet = sheetsToProcess[sIdx];
      const headers = sheet.headers.length > 0 ? sheet.headers : ['(Empty Sheet)'];
      const rows = sheet.rows;
      const numCols = headers.length;

      // Identify numeric columns for right-alignment
      const isNumericCol: boolean[] = [];
      for (let c = 0; c < numCols; c++) {
        let numCount = 0;
        let testCount = 0;
        for (let r = 0; r < Math.min(rows.length, 30); r++) {
          const val = rows[r][c]?.trim();
          if (val) {
            testCount++;
            if (/^[$€£¥]?\s*-?\d+([.,]\d+)?\s*%?$/.test(val)) {
              numCount++;
            }
          }
        }
        isNumericCol.push(testCount > 0 && numCount / testCount >= 0.7);
      }

      // Calculate column widths proportional to content
      const colWeights: number[] = [];
      for (let c = 0; c < numCols; c++) {
        let maxLen = (headers[c] || '').length;
        for (let r = 0; r < Math.min(rows.length, 100); r++) {
          const cellLen = (rows[r][c] || '').length;
          if (cellLen > maxLen) maxLen = cellLen;
        }
        // Clamped column weight between 8 and 45 characters
        colWeights.push(Math.max(8, Math.min(45, maxLen)));
      }

      const sumWeights = colWeights.reduce((a, b) => a + b, 0) || 1;
      const colWidths = colWeights.map((w) => (w / sumWeights) * usableWidth);

      // Adjust for minimum column width if necessary
      const minColWidth = 28;
      for (let c = 0; c < colWidths.length; c++) {
        if (colWidths[c] < minColWidth) colWidths[c] = minColWidth;
      }
      const sumAdjusted = colWidths.reduce((a, b) => a + b, 0);
      const scaleFactor = usableWidth / sumAdjusted;
      for (let c = 0; c < colWidths.length; c++) {
        colWidths[c] *= scaleFactor;
      }

      // Calculate rows per page
      const titleBannerHeight = includeSheetTitle ? 32 : 0;
      const headerRowHeight = 22;
      const dataRowHeight = 18;
      const footerHeight = 25;

      const availableTableHeight = pHeight - margin * 2 - titleBannerHeight - footerHeight;

      let rowsPerPage = Math.max(1, Math.floor((availableTableHeight - headerRowHeight) / dataRowHeight));

      if (fitMode === 'fit-sheet' && rows.length > 0) {
        rowsPerPage = Math.max(1, rows.length);
      }

      const totalSheetPages = Math.max(1, Math.ceil(rows.length / rowsPerPage));

      for (let p = 0; p < totalSheetPages; p++) {
        const start = p * rowsPerPage;
        const end = Math.min(start + rowsPerPage, rows.length);
        pagePlans.push({
          sheetName: sheet.name,
          headers,
          colWidths,
          rows: rows.slice(start, end),
          isNumericCol,
          pageNumberInSheet: p + 1,
          totalPagesInSheet: totalSheetPages,
        });
      }
    }

    const totalPagesAcrossDoc = pagePlans.length;

    // Render pages
    for (let i = 0; i < totalPagesAcrossDoc; i++) {
      const plan = pagePlans[i];
      const pct = Math.round(20 + ((i + 1) / totalPagesAcrossDoc) * 75);
      onProgress?.(pct, `Rendering PDF page ${i + 1} of ${totalPagesAcrossDoc}...`);

      const page = pdfDoc.addPage([pWidth, pHeight]);
      let currentY = pHeight - margin;

      // 1. Sheet Title Banner (Top)
      if (includeSheetTitle && plan.pageNumberInSheet === 1) {
        page.drawRectangle({
          x: margin,
          y: currentY - 24,
          width: usableWidth,
          height: 24,
          color: rgb(palette.titleBg.r, palette.titleBg.g, palette.titleBg.b),
        });

        page.drawText(`${workbook.fileName} • ${plan.sheetName}`, {
          x: margin + 8,
          y: currentY - 17,
          size: 11,
          font: boldFont,
          color: rgb(palette.titleText.r, palette.titleText.g, palette.titleText.b),
        });

        const sheetInfo = `${plan.rows.length > 0 ? `${plan.rows.length} rows` : 'Empty sheet'}`;
        const infoWidth = regularFont.widthOfTextAtSize(sheetInfo, 9);
        page.drawText(sheetInfo, {
          x: margin + usableWidth - infoWidth - 8,
          y: currentY - 17,
          size: 9,
          font: regularFont,
          color: rgb(0.4, 0.45, 0.5),
        });

        currentY -= 32;
      } else if (includeSheetTitle) {
        // Minor spacing on subsequent pages
        currentY -= 8;
      }

      // 2. Table Header Row (on first page, or every page if repeatHeaderOnEveryPage is true)
      const shouldDrawHeader = plan.pageNumberInSheet === 1 || repeatHeaderOnEveryPage;
      const headerRowHeight = shouldDrawHeader ? 22 : 0;

      if (shouldDrawHeader) {
        page.drawRectangle({
          x: margin,
          y: currentY - headerRowHeight,
          width: usableWidth,
          height: headerRowHeight,
          color: rgb(palette.headerBg.r, palette.headerBg.g, palette.headerBg.b),
        });

        let colX = margin;
        for (let c = 0; c < plan.headers.length; c++) {
          const text = plan.headers[c] || `Col ${c + 1}`;
          const colW = plan.colWidths[c];
          const isNumeric = plan.isNumericCol[c];

          // Truncate header text if wider than column
          const maxTextW = colW - 10;
          let displayHeader = text;
          if (boldFont.widthOfTextAtSize(displayHeader, 9) > maxTextW) {
            while (displayHeader.length > 1 && boldFont.widthOfTextAtSize(displayHeader + '...', 9) > maxTextW) {
              displayHeader = displayHeader.slice(0, -1);
            }
            displayHeader += '...';
          }

          const headerW = boldFont.widthOfTextAtSize(displayHeader, 9);
          const textX = isNumeric ? colX + colW - headerW - 6 : colX + 6;

          page.drawText(displayHeader, {
            x: textX,
            y: currentY - headerRowHeight + 7,
            size: 9,
            font: boldFont,
            color: rgb(palette.headerText.r, palette.headerText.g, palette.headerText.b),
          });

          if (showGridlines && c > 0) {
            page.drawLine({
              start: { x: colX, y: currentY },
              end: { x: colX, y: currentY - headerRowHeight },
              thickness: 0.5,
              color: rgb(1, 1, 1),
              opacity: 0.35,
            });
          }

          colX += colW;
        }

        currentY -= headerRowHeight;
      }
      const tableStartY = currentY;

      // 3. Data Rows
      const rowHeight = 18;
      for (let r = 0; r < plan.rows.length; r++) {
        const rowData = plan.rows[r];
        const isZebra = zebraStriping && r % 2 === 1;

        if (isZebra) {
          page.drawRectangle({
            x: margin,
            y: currentY - rowHeight,
            width: usableWidth,
            height: rowHeight,
            color: rgb(palette.zebraBg.r, palette.zebraBg.g, palette.zebraBg.b),
          });
        }

        let cellX = margin;
        for (let c = 0; c < plan.headers.length; c++) {
          const rawVal = rowData[c] || '';
          const colW = plan.colWidths[c];
          const isNumeric = plan.isNumericCol[c];

          // Truncate cell text with ellipsis if too long for column
          const maxTextW = colW - 10;
          let displayVal = rawVal;
          if (regularFont.widthOfTextAtSize(displayVal, 8.5) > maxTextW) {
            while (displayVal.length > 1 && regularFont.widthOfTextAtSize(displayVal + '...', 8.5) > maxTextW) {
              displayVal = displayVal.slice(0, -1);
            }
            displayVal += '...';
          }

          const valW = regularFont.widthOfTextAtSize(displayVal, 8.5);
          const cellTextX = isNumeric ? cellX + colW - valW - 6 : cellX + 6;

          page.drawText(displayVal, {
            x: cellTextX,
            y: currentY - rowHeight + 5,
            size: 8.5,
            font: regularFont,
            color: rgb(0.12, 0.16, 0.22),
          });

          // Vertical column line
          if (showGridlines && c > 0) {
            page.drawLine({
              start: { x: cellX, y: currentY },
              end: { x: cellX, y: currentY - rowHeight },
              thickness: 0.5,
              color: rgb(palette.borderColor.r, palette.borderColor.g, palette.borderColor.b),
            });
          }

          cellX += colW;
        }

        // Horizontal bottom row line
        if (showGridlines) {
          page.drawLine({
            start: { x: margin, y: currentY - rowHeight },
            end: { x: margin + usableWidth, y: currentY - rowHeight },
            thickness: 0.5,
            color: rgb(palette.borderColor.r, palette.borderColor.g, palette.borderColor.b),
          });
        }

        currentY -= rowHeight;
      }

      // Outer table border box
      if (showGridlines) {
        page.drawRectangle({
          x: margin,
          y: currentY,
          width: usableWidth,
          height: tableStartY - currentY,
          borderWidth: 0.8,
          borderColor: rgb(palette.borderColor.r, palette.borderColor.g, palette.borderColor.b),
        });
      }

      // 4. Footer (Bottom)
      const footerY = margin / 2 + 5;
      page.drawText(`${workbook.fileName} • Sheet: ${plan.sheetName}`, {
        x: margin,
        y: footerY,
        size: 8,
        font: regularFont,
        color: rgb(0.5, 0.55, 0.6),
      });

      if (includePageNumbers) {
        const pageText = `Page ${i + 1} of ${totalPagesAcrossDoc}`;
        const pTxtW = regularFont.widthOfTextAtSize(pageText, 8);
        page.drawText(pageText, {
          x: margin + usableWidth - pTxtW,
          y: footerY,
          size: 8,
          font: regularFont,
          color: rgb(0.5, 0.55, 0.6),
        });
      }
    }

    onProgress?.(98, 'Finalizing PDF output...');
    const pdfBytes = await pdfDoc.save({ useObjectStreams: true });
    onProgress?.(100, 'Excel to PDF conversion complete!');

    return pdfBytes;
  }
}

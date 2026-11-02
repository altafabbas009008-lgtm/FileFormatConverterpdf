import '@/utils/polyfills';
import * as pdfjsLib from 'pdfjs-dist';
import { PdfRenderService } from '@/services/pdf/pdfRenderService';
import { ZipWriter } from '@/utils/zipWriter';

export interface FormattedSpan {
  text: string;
  fontSize: number; // in pt (e.g. 10, 11, 14, 18, 24)
  isBold: boolean;
  isItalic: boolean;
  fontFamily: string;
}

export interface FormattedParagraph {
  spans: FormattedSpan[];
  text: string;
  isHeading: boolean;
  headingLevel?: 1 | 2 | 3;
  alignment: 'left' | 'center' | 'right';
  indentation: number; // in twips (1 pt = 20 twips)
  isListItem: boolean;
}

export interface ExtractedPageText {
  pageNumber: number;
  text: string;
  lines: string[];
  paragraphs: FormattedParagraph[];
  hasImages?: boolean;
  isScanned?: boolean;
  imageBytes?: Uint8Array;
  pageWidth?: number;
  pageHeight?: number;
}

export interface ExtractedPdfDocument {
  fullText: string;
  pages: ExtractedPageText[];
  wordCount: number;
  charCount: number;
  hasAnyImages: boolean;
}

export interface DocxExportOptions {
  includeImages?: boolean;
  title?: string;
}

interface InternalRawItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontName: string;
  fontFamily: string;
  isBold: boolean;
  isItalic: boolean;
  hasEOL?: boolean;
}

export class PdfTextExtractService {
  /**
   * Extracts richly formatted text, headings, styles, and embedded visual layout
   * from all pages of a PDF offline.
   */
  static async extractDocumentText(
    pdfBytes: Uint8Array,
    onProgress?: (percent: number, status: string) => void
  ): Promise<ExtractedPdfDocument> {
    onProgress?.(10, 'Loading document structure...');
    const pdfDoc = await PdfRenderService.loadDocument(pdfBytes.slice());
    const totalPages = pdfDoc.numPages;

    const pages: ExtractedPageText[] = [];
    const allTextBlocks: string[] = [];
    let hasAnyImages = false;

    for (let i = 1; i <= totalPages; i++) {
      const pct = Math.round(15 + ((i - 1) / totalPages) * 75);
      onProgress?.(pct, `Extracting layout & styling from page ${i} of ${totalPages}...`);

      const page = await pdfDoc.getPage(i);
      const viewport = page.getViewport({ scale: 1.0 });

      // 1. Detect if the page contains images or graphics
      let hasPageImages = false;
      try {
        const ops = await page.getOperatorList();
        const paintImageOp = (pdfjsLib as any).OPS?.paintImageXObject ?? 85;
        const paintInlineImageOp = (pdfjsLib as any).OPS?.paintInlineImageXObject ?? 86;
        hasPageImages = ops.fnArray.some(
          (op: number) => op === paintImageOp || op === paintInlineImageOp
        );
      } catch {
        hasPageImages = false;
      }
      if (hasPageImages) hasAnyImages = true;

      // 2. Extract text items with fonts, sizes, weights, and geometry
      const textContent = await page.getTextContent();
      const rawItems: InternalRawItem[] = [];

      for (const raw of textContent.items) {
        if (!raw || typeof (raw as any).str !== 'string') continue;
        const item = raw as any;
        if (!item.str && !item.hasEOL) continue;

        const transform = item.transform || [1, 0, 0, 1, 0, 0];
        const x = transform[4];
        const y = transform[5];

        // Determine font size from transform scale or height
        const height = item.height || Math.hypot(transform[2], transform[3]) || 12;
        const fontSize = Math.max(7, Math.min(60, Math.round(height)));

        const fontName = (item.fontName || '').toLowerCase();
        const styleObj = (textContent.styles as any)?.[item.fontName];
        const styleFontFamily = (styleObj?.fontFamily || '').toLowerCase();

        const isBold =
          /bold|black|heavy|medium|semibold|b\d+/i.test(fontName) ||
          /bold|black|heavy/i.test(styleFontFamily);

        const isItalic =
          /italic|oblique|slant|i\d+/i.test(fontName) ||
          /italic|oblique/i.test(styleFontFamily);

        let fontFamily = 'Calibri';
        if (/times|serif|roman|georgia/i.test(fontName) || /serif/i.test(styleFontFamily)) {
          fontFamily = 'Times New Roman';
        } else if (/courier|mono|consolas/i.test(fontName) || /monospace/i.test(styleFontFamily)) {
          fontFamily = 'Courier New';
        } else if (/arial|helvetica/i.test(fontName)) {
          fontFamily = 'Arial';
        }

        rawItems.push({
          str: item.str,
          x,
          y,
          width: item.width || 0,
          height,
          fontSize,
          fontName,
          fontFamily,
          isBold,
          isItalic,
          hasEOL: item.hasEOL,
        });
      }

      // 3. Cluster items into baseline lines
      // In PDF coordinate space, Y=0 is bottom, Y=pageHeight is top.
      // Top-to-bottom reading order requires descending Y.
      rawItems.sort((a, b) => b.y - a.y || a.x - b.x);

      const lineGroups: InternalRawItem[][] = [];
      for (const item of rawItems) {
        let placed = false;
        for (const group of lineGroups) {
          const avgY = group.reduce((sum, it) => sum + it.y, 0) / group.length;
          const avgH = group.reduce((sum, it) => sum + it.height, 0) / group.length;
          const tolerance = Math.max(3, Math.min(8, avgH * 0.45));
          if (Math.abs(item.y - avgY) <= tolerance) {
            group.push(item);
            placed = true;
            break;
          }
        }
        if (!placed) {
          lineGroups.push([item]);
        }
      }

      // 4. Sort lines top-to-bottom (descending Y)
      lineGroups.sort((a, b) => {
        const avgYA = a.reduce((sum, it) => sum + it.y, 0) / a.length;
        const avgYB = b.reduce((sum, it) => sum + it.y, 0) / b.length;
        return avgYB - avgYA;
      });

      // 5. Build formatted spans for each line
      interface AnalyzedLine {
        spans: FormattedSpan[];
        text: string;
        avgY: number;
        minX: number;
        maxX: number;
        fontSize: number;
        isBold: boolean;
        isItalic: boolean;
        isHeading: boolean;
        headingLevel?: 1 | 2 | 3;
        alignment: 'left' | 'center' | 'right';
        indentation: number;
        isListItem: boolean;
      }

      const analyzedLines: AnalyzedLine[] = [];
      const pageWidth = viewport.width || 612;

      for (const group of lineGroups) {
        group.sort((a, b) => a.x - b.x);

        const spans: FormattedSpan[] = [];
        let minX = Infinity;
        let maxX = -Infinity;

        for (let j = 0; j < group.length; j++) {
          const cur = group[j];
          if (!cur.str) continue;

          minX = Math.min(minX, cur.x);
          maxX = Math.max(maxX, cur.x + cur.width);

          let curText = cur.str;
          if (j > 0) {
            const prev = group[j - 1];
            const gap = cur.x - (prev.x + prev.width);
            if (gap > 1.5 && !curText.startsWith(' ')) {
              curText = ' ' + curText;
            }
          }

          const lastSpan = spans[spans.length - 1];
          if (
            lastSpan &&
            lastSpan.fontSize === cur.fontSize &&
            lastSpan.isBold === cur.isBold &&
            lastSpan.isItalic === cur.isItalic &&
            lastSpan.fontFamily === cur.fontFamily
          ) {
            lastSpan.text += curText;
          } else {
            spans.push({
              text: curText,
              fontSize: cur.fontSize,
              isBold: cur.isBold,
              isItalic: cur.isItalic,
              fontFamily: cur.fontFamily,
            });
          }
        }

        const fullLineText = spans.map((s) => s.text).join('').trim();
        if (!fullLineText) continue;

        const dominantFontSize = spans.reduce(
          (max, s) => Math.max(max, s.fontSize),
          11
        );
        const isLineBold = spans.every((s) => s.isBold || !s.text.trim());
        const isLineItalic = spans.every((s) => s.isItalic || !s.text.trim());
        const avgY = group.reduce((sum, it) => sum + it.y, 0) / group.length;

        // Alignment detection
        let alignment: 'left' | 'center' | 'right' = 'left';
        const lineCenter = minX + (maxX - minX) / 2;
        const centerOffset = Math.abs(lineCenter - pageWidth / 2);
        if (centerOffset < 28 && (maxX - minX) < pageWidth * 0.75) {
          alignment = 'center';
        } else if (minX > 140 && maxX > pageWidth - 70) {
          alignment = 'right';
        }

        // List item detection (bullets, numbered lists e.g. "1.", "7. ")
        const isListItem = /^([•\-\*\u2022\u25E6\u25AA]|\d+[\.\)])\s+/i.test(fullLineText);

        // Indentation calculation
        let indentation = 0;
        if (isListItem) {
          indentation = 720; // 0.5 in
        } else if (alignment === 'left' && minX > 90) {
          indentation = Math.min(2880, Math.round((minX - 72) * 20));
        }

        analyzedLines.push({
          spans,
          text: fullLineText,
          avgY,
          minX: minX === Infinity ? 72 : minX,
          maxX: maxX === -Infinity ? 540 : maxX,
          fontSize: dominantFontSize,
          isBold: isLineBold,
          isItalic: isLineItalic,
          isHeading: false,
          alignment,
          indentation,
          isListItem,
        });
      }

      // 6. Calculate dominant body font size & Heading Levels
      const fontCounts: Record<number, number> = {};
      for (const line of analyzedLines) {
        fontCounts[line.fontSize] = (fontCounts[line.fontSize] || 0) + line.text.length;
      }
      let dominantBodySize = 11;
      let maxWeight = 0;
      for (const [sz, wt] of Object.entries(fontCounts)) {
        if (wt > maxWeight) {
          maxWeight = wt;
          dominantBodySize = Number(sz);
        }
      }

      for (const line of analyzedLines) {
        if (line.fontSize >= 18 || line.fontSize >= dominantBodySize * 1.5) {
          line.isHeading = true;
          line.headingLevel = 1;
        } else if (line.fontSize >= 14 || line.fontSize >= dominantBodySize * 1.25) {
          line.isHeading = true;
          line.headingLevel = 2;
        } else if (
          line.isBold &&
          (line.fontSize >= dominantBodySize * 1.1 || line.text.length < 50) &&
          !line.isListItem
        ) {
          line.isHeading = true;
          line.headingLevel = 3;
        }
      }

      // 7. Group lines into natural flowing paragraphs
      const paragraphs: FormattedParagraph[] = [];
      let currentPara: FormattedParagraph | null = null;
      let lastLine: AnalyzedLine | null = null;

      for (const line of analyzedLines) {
        const verticalGap = lastLine ? lastLine.avgY - line.avgY : 0;
        const normalLineSpacing = (lastLine?.fontSize || 12) * 1.6;

        const shouldStartNew =
          !currentPara ||
          line.isHeading ||
          lastLine?.isHeading ||
          line.isListItem ||
          lastLine?.isListItem ||
          line.alignment !== currentPara.alignment ||
          Math.abs(line.indentation - currentPara.indentation) > 100 ||
          verticalGap > normalLineSpacing;

        if (shouldStartNew || !currentPara) {
          currentPara = {
            spans: [...line.spans],
            text: line.text,
            isHeading: line.isHeading,
            headingLevel: line.headingLevel,
            alignment: line.alignment,
            indentation: line.indentation,
            isListItem: line.isListItem,
          };
          paragraphs.push(currentPara);
        } else {
          // Flow into current paragraph
          const lastSpan = currentPara.spans[currentPara.spans.length - 1];
          if (lastSpan && lastSpan.text.endsWith('-')) {
            // Remove hyphen on word wrap
            lastSpan.text = lastSpan.text.slice(0, -1);
          } else if (lastSpan && !lastSpan.text.endsWith(' ')) {
            lastSpan.text += ' ';
          }
          currentPara.spans.push(...line.spans);
          currentPara.text += ' ' + line.text;
        }

        lastLine = line;
      }

      // 8. Capture high-resolution visual layout for pages with images or scanned content
      let imageBytes: Uint8Array | undefined;
      const isScanned = analyzedLines.length === 0;

      if (hasPageImages || isScanned) {
        try {
          const blob = await PdfRenderService.exportPageToImage(pdfDoc, i, 'image/png', 2.0);
          const buffer = await blob.arrayBuffer();
          imageBytes = new Uint8Array(buffer);
        } catch (imgErr) {
          console.warn(`Could not render visual layout for page ${i}:`, imgErr);
        }
      }

      const rawLines = analyzedLines.map((l) => l.text);
      const pageText = rawLines.join('\n');

      pages.push({
        pageNumber: i,
        text: pageText,
        lines: rawLines,
        paragraphs,
        hasImages: hasPageImages,
        isScanned,
        imageBytes,
        pageWidth: viewport.width,
        pageHeight: viewport.height,
      });

      if (pageText) {
        allTextBlocks.push(pageText);
      }
    }

    onProgress?.(95, 'Finalizing document structure...');
    const fullText = allTextBlocks.join('\n\n');
    const wordCount = fullText.trim() ? fullText.trim().split(/\s+/).length : 0;
    const charCount = fullText.length;

    onProgress?.(100, 'Conversion ready!');

    return {
      fullText,
      pages,
      wordCount,
      charCount,
      hasAnyImages,
    };
  }

  /**
   * Generates a fully styled Microsoft Word (.docx) file preserving font sizes,
   * bold/italic weights, headings, alignments, bullet lists, and visual page graphics.
   */
  static generateDocx(
    doc: ExtractedPdfDocument,
    optionsOrTitle?: DocxExportOptions | string
  ): Uint8Array {
    const options: DocxExportOptions =
      typeof optionsOrTitle === 'string'
        ? { title: optionsOrTitle, includeImages: true }
        : { includeImages: true, ...optionsOrTitle };

    const zip = new ZipWriter();

    // Sanitize string according to XML 1.0 specifications
    const escapeXml = (str: string) =>
      str
        .replace(/[^\u0009\u000A\u000D\u0020-\uD7FF\uE000-\uFFFD]/g, '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');

    let bodyXml = '';
    const imageRelationships: Array<{ rId: string; fileName: string; bytes: Uint8Array }> = [];
    let imageCounter = 1;

    for (let pIdx = 0; pIdx < doc.pages.length; pIdx++) {
      const page = doc.pages[pIdx];

      // 1. Embed visual page graphics / illustrations when available
      if (options.includeImages && page.imageBytes && page.imageBytes.length > 0) {
        const rId = `rIdImg${imageCounter}`;
        const imgFileName = `image${imageCounter}.png`;
        imageRelationships.push({
          rId,
          fileName: imgFileName,
          bytes: page.imageBytes,
        });
        imageCounter++;

        // Calculate responsive DrawingML EMUs matching page aspect ratio
        const pWidth = page.pageWidth || 595.3;
        const pHeight = page.pageHeight || 841.9;
        const aspect = pWidth / pHeight;

        let widthEMU = 5029200; // ~5.5 inches
        let heightEMU = Math.round(widthEMU / aspect);
        if (heightEMU > 6858000) {
          heightEMU = 6858000; // ~7.5 inches
          widthEMU = Math.round(heightEMU * aspect);
        }

        bodyXml += `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="200"/></w:pPr><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${widthEMU}" cy="${heightEMU}"/><wp:docPr id="${page.pageNumber}" name="Page ${page.pageNumber} Layout"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${page.pageNumber}" name="Page ${page.pageNumber} Layout"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${rId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${widthEMU}" cy="${heightEMU}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`;
      }

      // 2. Render formatted paragraphs with font styling, sizes, weights, and alignments
      if (page.paragraphs && page.paragraphs.length > 0) {
        for (const para of page.paragraphs) {
          let pPr = '<w:pPr>';

          if (para.isHeading && para.headingLevel === 1) {
            pPr += '<w:pStyle w:val="Heading1"/>';
          } else if (para.isHeading && para.headingLevel === 2) {
            pPr += '<w:pStyle w:val="Heading2"/>';
          } else if (para.isHeading && para.headingLevel === 3) {
            pPr += '<w:pStyle w:val="Heading3"/>';
          }

          if (para.alignment && para.alignment !== 'left') {
            pPr += `<w:jc w:val="${para.alignment}"/>`;
          }

          if (para.indentation > 0) {
            if (para.isListItem) {
              pPr += '<w:ind w:left="720" w:hanging="360"/>';
            } else {
              pPr += `<w:ind w:left="${para.indentation}"/>`;
            }
          }

          const spaceBefore = para.isHeading ? (para.headingLevel === 1 ? 240 : 160) : 0;
          const spaceAfter = para.isHeading ? 100 : (para.isListItem ? 80 : 120);
          pPr += `<w:spacing w:before="${spaceBefore}" w:after="${spaceAfter}" w:line="260" w:lineRule="auto"/>`;
          pPr += '</w:pPr>';

          let runsXml = '';
          for (const span of para.spans) {
            if (!span.text) continue;

            let rPr = '<w:rPr>';
            rPr += `<w:rFonts w:ascii="${span.fontFamily}" w:hAnsi="${span.fontFamily}" w:cs="${span.fontFamily}"/>`;

            if (span.isBold) {
              rPr += '<w:b/><w:bCs/>';
            }
            if (span.isItalic) {
              rPr += '<w:i/><w:iCs/>';
            }

            const szHalfPts = Math.round(span.fontSize * 2);
            rPr += `<w:sz w:val="${szHalfPts}"/><w:szCs w:val="${szHalfPts}"/>`;

            if (para.isHeading && para.headingLevel === 1) {
              rPr += '<w:color w:val="1F4D78"/>';
            } else if (para.isHeading && para.headingLevel === 2) {
              rPr += '<w:color w:val="2E74B5"/>';
            } else if (para.isHeading && para.headingLevel === 3) {
              rPr += '<w:color w:val="1F3864"/>';
            }

            rPr += '</w:rPr>';
            runsXml += `<w:r>${rPr}<w:t xml:space="preserve">${escapeXml(span.text)}</w:t></w:r>`;
          }

          if (runsXml) {
            bodyXml += `<w:p>${pPr}${runsXml}</w:p>`;
          }
        }
      } else if (!page.imageBytes) {
        bodyXml += `<w:p><w:r><w:rPr><w:i/><w:color w:val="888888"/></w:rPr><w:t xml:space="preserve">[No text content found on page ${page.pageNumber}]</w:t></w:r></w:p>`;
      }

      // Page break between pages (except last)
      if (pIdx < doc.pages.length - 1) {
        bodyXml += `<w:p><w:r><w:br w:type="page"/></w:r></w:p>`;
      }
    }

    // Page layout setup matching original PDF dimensions
    const firstPage = doc.pages[0];
    const pgW = Math.round((firstPage?.pageWidth || 595.3) * 20);
    const pgH = Math.round((firstPage?.pageHeight || 841.9) * 20);
    bodyXml += `<w:sectPr><w:pgSz w:w="${pgW}" w:h="${pgH}"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr>`;

    const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
  <w:body>${bodyXml}</w:body>
</w:document>`;

    const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="png" ContentType="image/png"/>
  <Default Extension="jpeg" ContentType="image/jpeg"/>
  <Default Extension="jpg" ContentType="image/jpeg"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`;

    const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

    let docRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>`;

    for (const imgRel of imageRelationships) {
      docRelsXml += `\n  <Relationship Id="${imgRel.rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${imgRel.fileName}"/>`;
    }
    docRelsXml += `\n</Relationships>`;

    const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>
        <w:sz w:val="22"/>
        <w:szCs w:val="22"/>
        <w:lang w:val="en-US"/>
      </w:rPr>
    </w:rPrDefault>
    <w:pPrDefault>
      <w:pPr>
        <w:spacing w:after="140" w:line="240" w:lineRule="auto"/>
      </w:pPr>
    </w:pPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:qFormat/>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="Heading 1"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:qFormat/>
    <w:pPr>
      <w:keepNext/>
      <w:spacing w:before="240" w:after="120"/>
    </w:pPr>
    <w:rPr>
      <w:b/><w:bCs/>
      <w:sz w:val="36"/>
      <w:szCs w:val="36"/>
      <w:color w:val="1F4D78"/>
    </w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="Heading 2"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:qFormat/>
    <w:pPr>
      <w:keepNext/>
      <w:spacing w:before="180" w:after="80"/>
    </w:pPr>
    <w:rPr>
      <w:b/><w:bCs/>
      <w:sz w:val="28"/>
      <w:szCs w:val="28"/>
      <w:color w:val="2E74B5"/>
    </w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading3">
    <w:name w:val="Heading 3"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:qFormat/>
    <w:pPr>
      <w:keepNext/>
      <w:spacing w:before="120" w:after="60"/>
    </w:pPr>
    <w:rPr>
      <w:b/><w:bCs/>
      <w:sz w:val="24"/>
      <w:szCs w:val="24"/>
      <w:color w:val="1F3864"/>
    </w:rPr>
  </w:style>
</w:styles>`;

    zip.addFile('[Content_Types].xml', contentTypesXml);
    zip.addFile('_rels/.rels', rootRelsXml);
    zip.addFile('word/_rels/document.xml.rels', docRelsXml);
    zip.addFile('word/styles.xml', stylesXml);
    zip.addFile('word/document.xml', documentXml);

    for (const img of imageRelationships) {
      zip.addFile(`word/media/${img.fileName}`, img.bytes);
    }

    return zip.generateZip(true);
  }

  /**
   * Generates a clean Markdown document from extracted text with headings and bullet lists.
   */
  static generateMarkdown(doc: ExtractedPdfDocument, title: string = 'Document'): Uint8Array {
    let md = `# ${title}\n\n`;
    for (let pIdx = 0; pIdx < doc.pages.length; pIdx++) {
      const page = doc.pages[pIdx];
      if (page.paragraphs && page.paragraphs.length > 0) {
        for (const p of page.paragraphs) {
          if (p.isHeading && p.headingLevel === 1) {
            md += `# ${p.text}\n\n`;
          } else if (p.isHeading && p.headingLevel === 2) {
            md += `## ${p.text}\n\n`;
          } else if (p.isHeading && p.headingLevel === 3) {
            md += `### ${p.text}\n\n`;
          } else if (p.isListItem) {
            md += `${p.text}\n`;
          } else {
            md += `${p.text}\n\n`;
          }
        }
      } else if (page.lines.length === 0) {
        md += `*Page ${page.pageNumber}: [Scanned page / No selectable text]*\n\n`;
      } else {
        md += page.lines.join('\n\n') + '\n\n';
      }
      if (pIdx < doc.pages.length - 1) {
        md += `---\n\n`;
      }
    }
    return new TextEncoder().encode(md);
  }

  /**
   * Generates a clean Plain Text (.txt) file from extracted text.
   */
  static generatePlainText(doc: ExtractedPdfDocument): Uint8Array {
    const text = doc.pages
      .map((p) => p.lines.join('\n'))
      .filter(Boolean)
      .join('\n\n');
    return new TextEncoder().encode(text || doc.fullText);
  }
}

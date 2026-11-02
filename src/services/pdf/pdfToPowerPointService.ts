
import pptxgen from 'pptxgenjs';
import { PdfRenderService } from '@/services/pdf/pdfRenderService';

export class PdfToPowerPointService {
  static async convert(
    pdfBytes: Uint8Array,
    onProgress?: (percent: number, status: string) => void
  ): Promise<Uint8Array> {
    onProgress?.(5, 'Opening PDF...');

   console.log('PDF byte length:', pdfBytes.length);

console.log(
  'PDF header:',
  new TextDecoder().decode(pdfBytes.slice(0, 8))
);

if (
  pdfBytes.length < 5 ||
  new TextDecoder().decode(pdfBytes.slice(0, 5)) !== '%PDF-'
) {
  throw new Error(
    'Selected file does not appear to contain a valid PDF. Please select the original PDF file.'
  );
}

const pdf = await PdfRenderService.loadDocument(pdfBytes.slice());

    const pptx = new pptxgen();

    pptx.layout = 'LAYOUT_WIDE';
    pptx.author = 'PDFLite';
    pptx.subject = 'Converted from PDF';
    pptx.title = 'PDF to PowerPoint';

    const slideWidth = 13.333333;
    const slideHeight = 7.5;

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      onProgress?.(
        Math.round(5 + ((pageNumber - 1) / pdf.numPages) * 85),
        `Converting page ${pageNumber} of ${pdf.numPages}...`
      );

      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1 });
      const ratio = viewport.width / viewport.height;

      const imageBlob = await PdfRenderService.exportPageToImage(
        pdf,
        pageNumber,
        'image/png',
        2
      );

      const imageData = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
          if (typeof reader.result === 'string') {
            resolve(reader.result);
          } else {
            reject(new Error('Could not read converted page image.'));
          }
        };

        reader.onerror = () => reject(new Error('Failed to read page image.'));
        reader.readAsDataURL(imageBlob);
      });

      const slide = pptx.addSlide();
      slide.background = { color: 'FFFFFF' };

      let width = slideWidth;
      let height = slideHeight;

      if (ratio > slideWidth / slideHeight) {
        height = slideWidth / ratio;
      } else {
        width = slideHeight * ratio;
      }

      slide.addImage({
        data: imageData,
        x: (slideWidth - width) / 2,
        y: (slideHeight - height) / 2,
        w: width,
        h: height,
      });

      onProgress?.(
        Math.round(5 + (pageNumber / pdf.numPages) * 85),
        `Converted ${pageNumber} of ${pdf.numPages} pages`
      );
    }

    onProgress?.(95, 'Creating PowerPoint file...');

    const output = await pptx.write({ outputType: 'arraybuffer' });
    console.log('PPTX output type:', typeof output);
console.log(
  'PPTX output constructor:',
  output?.constructor?.name
);
console.log(
  'PPTX output size:',
  output instanceof ArrayBuffer
    ? output.byteLength
    : output instanceof Uint8Array
      ? output.byteLength
      : 'Unknown'
);

    let result: Uint8Array;

    if (output instanceof ArrayBuffer) {
      result = new Uint8Array(output);
    } else if (output instanceof Uint8Array) {
      result = output;
    } else {
      throw new Error('PowerPoint generation returned an unexpected format.');
    }

    if (
      result.length < 4 ||
      result[0] !== 0x50 ||
      result[1] !== 0x4b
    ) {
      throw new Error('Generated file is not a valid PPTX ZIP file.');
    }

    onProgress?.(100, 'PowerPoint file ready!');

    return result;
  }
}

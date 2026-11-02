
import { useEffect, useRef, useState } from 'react';
import {
  PDFDocument,
  StandardFonts,
  rgb,
} from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import DuckLoader from '@/components/common/DuckLoader';

type EditMode = 'text' | 'image' | 'signature';

export function EditPdfTool() {
  const [file, setFile] = useState<File | null>(null);
  const [assetFile, setAssetFile] = useState<File | null>(null);
  const [mode, setMode] = useState<EditMode>('text');

  const [text, setText] = useState('My Edited PDF');
  const [fontSize, setFontSize] = useState('18');
  const [xPosition, setXPosition] = useState('50');
  const [yPosition, setYPosition] = useState('50');
  const [pageNumber, setPageNumber] = useState('1');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
const previewCanvasRef = useRef<HTMLCanvasElement>(null);

useEffect(() => {
  if (!file || !previewCanvasRef.current) return;

  let cancelled = false;
  let renderTask: { cancel: () => void } | null = null;

  const renderPdfPreview = async () => {
    try {
      const data = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data }).promise;

      if (cancelled) {
        
        return;
      }
const requestedPage = Number(pageNumber);

if (!Number.isInteger(requestedPage) || requestedPage < 1) {
  setMessage('Please enter a valid page number.');
  return;
}

const pageIndex = requestedPage - 1;

      if (pageIndex >= pdf.numPages) {
        setMessage(`This PDF has ${pdf.numPages} pages.`);
        
        return;
      }

      const page = await pdf.getPage(pageIndex + 1);
      const viewport = page.getViewport({ scale: 1.2 });
      const canvas = previewCanvasRef.current;

      if (!canvas || cancelled) {
        
        return;
      }

      const context = canvas.getContext('2d');

      if (!context) {
       
        return;
      }

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      renderTask = page.render({
        canvas,
        canvasContext: context,
        viewport,
      });

      await (renderTask as any).promise;

     
    } catch (error) {
      if (!cancelled) {
        console.error('PDF preview error:', error);
        setMessage('Unable to display this PDF preview.');
      }
    }
  };

  void renderPdfPreview();

  return () => {
    cancelled = true;
    renderTask?.cancel();
  };
}, [file, pageNumber]);
  const handleEdit = async () => {
    if (!file) {
      setMessage('Please select a PDF file first.');
      return;
    }

    if (mode === 'text' && !text.trim()) {
      setMessage('Please enter the text.');
      return;
    }

    if (
      (mode === 'image' || mode === 'signature') &&
      !assetFile
    ) {
      setMessage('Please select an image or signature file.');
      return;
    }

    const size = Number(fontSize);
    const x = Number(xPosition);
    const y = Number(yPosition);
    const pageIndex = Number(pageNumber) - 1;
    

    if (
      !Number.isFinite(size) || size <= 0 ||
      !Number.isFinite(x) || x < 0 ||
      !Number.isFinite(y) || y < 0 ||
      !Number.isInteger(pageIndex) || pageIndex < 0
    ) {
      setMessage('Enter valid font size, position and page number.');
      return;
    }

    

    setLoading(true);
    setMessage('');

    let url: string | null = null;

    try {
      const pdfBytes = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const pages = pdfDoc.getPages();

      if (pageIndex >= pages.length) {
        throw new Error(
          `Choose a page between 1 and ${pages.length}.`
        );
      }

      const page = pages[pageIndex];
      const { width, height } = page.getSize();

      if (x >= width || y >= height) {
        throw new Error(
          `Position is outside the page (${Math.round(width)} × ${Math.round(height)} points).`
        );
      }

      if (mode === 'text') {
        const font = await pdfDoc.embedFont(
          StandardFonts.Helvetica
        );

        

        page.drawText(text, {
          x,
          y,
          size,
          font,
          color: rgb(0, 0, 0),
          maxWidth: width - x,
        });
      } else if (assetFile) {
        const imageBytes = await assetFile.arrayBuffer();
        const lowerName = assetFile.name.toLowerCase();
        const isPng =
          assetFile.type === 'image/png' ||
          lowerName.endsWith('.png');
        const isJpg =
          assetFile.type === 'image/jpeg' ||
          lowerName.endsWith('.jpg') ||
          lowerName.endsWith('.jpeg');

        if (!isPng && !isJpg) {
          throw new Error(
            'Please select a PNG or JPG image.'
          );
        }

        const image = isPng
          ? await pdfDoc.embedPng(imageBytes)
          : await pdfDoc.embedJpg(imageBytes);

        const maxWidth = Math.min(200, width - x);
        const maxHeight = Math.min(100, height - y);

        if (maxWidth <= 0 || maxHeight <= 0) {
          throw new Error('There is no space for the image here.');
        }

        const scale = Math.min(
          maxWidth / image.width,
          maxHeight / image.height
        );

        page.drawImage(image, {
          x,
          y,
          width: image.width * scale,
          height: image.height * scale,
        });
      }

      const editedBytes = await pdfDoc.save();
      const safeBytes = new Uint8Array(editedBytes).buffer;
      const blob = new Blob([safeBytes], {
        type: 'application/pdf',
      });

      url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download =
        `${file.name.replace(/\.pdf$/i, '')}_edited.pdf`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      setMessage('Edited PDF downloaded successfully!');
    } catch (error) {
      console.error('Edit PDF error:', error);
      setMessage(
        error instanceof Error
          ? error.message
          : 'Unable to edit this PDF.'
      );
    } finally {
      if (url) {
        URL.revokeObjectURL(url);
      }
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-bold">Edit PDF</h1>
      <p className="mt-2 text-gray-600">
        Add text, insert an image, or add a signature to your PDF.
      </p>

      <div className="mt-6 rounded-xl border-2 border-dashed border-gray-300 p-6">
        <label className="block font-medium">
          Select PDF
          <input
            type="file"
            accept=".pdf,application/pdf"
            className="mt-3 block w-full"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setMessage('');
            }}
          />
        </label>

        {file && (
          <p className="mt-3 break-all text-sm text-gray-600">
            Selected: {file.name}
          </p>
        )}
      </div>
      
      {file && (
        <div className="mt-6 rounded-xl border border-gray-300 p-4">
          <h2 className="mb-3 font-semibold">PDF Preview</h2>
          <div className="overflow-auto bg-gray-100 p-3">
            <canvas
              ref={previewCanvasRef}
              className="mx-auto max-w-full bg-white shadow"
            />
          </div>
        </div>
      )}


      <div className="mt-6">
        <label className="mb-2 block font-medium">
          Editing option
        </label>
        <select
          value={mode}
          onChange={(e) => {
            setMode(e.target.value as EditMode);
            setAssetFile(null);
            setMessage('');
          }}
          className="w-full rounded-lg border border-gray-300 p-3"
        >
          <option value="text">Add Text</option>
         
          <option value="image">Add Image</option>
          <option value="signature">Add Signature Image</option>
        </select>
      </div>

     {mode === 'text' && (
        <div className="mt-5 space-y-4">
          <label className="block">
            <span className="mb-2 block font-medium">
              Text to add
            </span>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-gray-300 p-3"
              placeholder="Enter text"
            />
          </label>

          <label className="block">
            <span className="mb-2 block font-medium">
              Font size
            </span>
            <input
              type="number"
              min="1"
              value={fontSize}
              onChange={(e) => setFontSize(e.target.value)}
              className="w-full rounded-lg border border-gray-300 p-3"
            />
          </label>

        
                
        </div>
      )}

      {(mode === 'image' || mode === 'signature') && (
        <div className="mt-5">
          <label className="block font-medium">
            {mode === 'signature'
              ? 'Upload signature image (PNG/JPG)'
              : 'Upload image (PNG/JPG)'}
            <input
              type="file"
              accept="image/png,image/jpeg,.png,.jpg,.jpeg"
              className="mt-3 block w-full"
              onChange={(e) => {
                setAssetFile(e.target.files?.[0] ?? null);
                setMessage('');
              }}
            />
          </label>

          {assetFile && (
            <p className="mt-2 break-all text-sm text-gray-600">
              Selected: {assetFile.name}
            </p>
          )}

          <p className="mt-2 text-sm text-gray-500">
            Image size is automatically fitted within a maximum
            area of 200 × 100 points.
          </p>
        </div>
      )}

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-2 block font-medium">
            Page number
          </span>
          <input
            type="number"
            min="1"
            value={pageNumber}
            onChange={(e) => setPageNumber(e.target.value)}
            className="w-full rounded-lg border border-gray-300 p-3"
          />
        </label>

        <div className="hidden sm:block" />

        <label className="block">
          <span className="mb-2 block font-medium">
            X position (points)
          </span>
          <input
            type="number"
            min="0"
            value={xPosition}
            onChange={(e) => setXPosition(e.target.value)}
            className="w-full rounded-lg border border-gray-300 p-3"
          />
        </label>

        <label className="block">
          <span className="mb-2 block font-medium">
            Y position (points)
          </span>
          <input
            type="number"
            min="0"
            value={yPosition}
            onChange={(e) => setYPosition(e.target.value)}
            className="w-full rounded-lg border border-gray-300 p-3"
          />
        </label>
      </div>

      <p className="mt-3 text-sm text-gray-500">
        X and Y are measured from the bottom-left corner.
        72 points = 1 inch.
      </p>

      

      {loading && (
        <div className="mt-6">
          <DuckLoader />
        </div>
      )}

      <button
        type="button"
        onClick={handleEdit}
        disabled={
          !file ||
          loading ||
          ((mode === 'image' || mode === 'signature') && !assetFile)
        }
        className="mt-6 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white disabled:opacity-50"
      >
        {loading ? 'Editing PDF...' : 'Apply Changes & Download'}
      </button>

      {message && !loading && (
        <p role="status" className="mt-4 break-words text-sm">
          {message}
        </p>
      )}
    </div>
  );
}

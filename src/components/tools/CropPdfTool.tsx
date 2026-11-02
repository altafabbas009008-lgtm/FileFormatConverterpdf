
import { useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import DuckLoader from '@/components/common/DuckLoader';

export function CropPdfTool() {
  const [file, setFile] = useState<File | null>(null);
  const [top, setTop] = useState('20');
  const [bottom, setBottom] = useState('20');
  const [left, setLeft] = useState('20');
  const [right, setRight] = useState('20');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleCrop = async () => {
    if (!file) {
      setMessage('Please select a PDF file first.');
      return;
    }

    const margins = {
      top: Number(top),
      bottom: Number(bottom),
      left: Number(left),
      right: Number(right),
    };

    if (
      Object.values(margins).some(
        (value) => !Number.isFinite(value) || value < 0
      )
    ) {
      setMessage('Please enter valid, non-negative margins.');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const bytes = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(bytes);
      const pages = pdfDoc.getPages();

      for (const page of pages) {
        const { width, height } = page.getSize();

        const cropWidth = width - margins.left - margins.right;
        const cropHeight = height - margins.top - margins.bottom;

        if (cropWidth <= 0 || cropHeight <= 0) {
          throw new Error(
            'Margins are too large for one or more pages.'
          );
        }

        page.setCropBox(
          margins.left,
          margins.bottom,
          cropWidth,
          cropHeight
        );
      }

      const croppedBytes = await pdfDoc.save();
     const safeBytes = new Uint8Array(croppedBytes).buffer;

const blob = new Blob([safeBytes], {
  type: 'application/pdf',
});

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${file.name.replace(/\.pdf$/i, '')}_cropped.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      setMessage('Cropped PDF downloaded successfully!');
    } catch (error) {
      console.error('Crop PDF error:', error);
      setMessage(
        error instanceof Error
          ? error.message
          : 'Unable to crop this PDF.'
      );
    } finally {
      setLoading(false);
    }
  };

  const marginInput = (
    label: string,
    value: string,
    setValue: (value: string) => void
  ) => (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-medium">{label} margin (PDF points)</span>
      <input
        type="number"
        min="0"
        step="1"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-full rounded-lg border border-gray-300 p-3"
      />
    </label>
  );

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-bold">Crop PDF</h1>
      <p className="mt-2 text-gray-600">
        Remove unwanted visible areas from every page of your PDF.
      </p>

      <div className="mt-6 rounded-xl border-2 border-dashed border-gray-300 p-6">
        <label className="block font-medium">
          Select PDF file
          <input
            type="file"
            accept=".pdf,application/pdf"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setMessage('');
            }}
            className="mt-3 block w-full"
          />
        </label>

        {file && (
          <p className="mt-3 break-all text-sm text-gray-600">
            Selected: {file.name}
          </p>
        )}
      </div>

      <h2 className="mt-6 text-lg font-semibold">Crop margins</h2>
      <p className="mt-1 text-sm text-gray-500">
        Values are in PDF points. 72 points = 1 inch.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {marginInput('Top', top, setTop)}
        {marginInput('Bottom', bottom, setBottom)}
        {marginInput('Left', left, setLeft)}
        {marginInput('Right', right, setRight)}
      </div>

      {loading && (
        <div className="mt-6">
          <DuckLoader />
        </div>
      )}

      <button
        type="button"
        onClick={handleCrop}
        disabled={!file || loading}
        className="mt-6 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? 'Cropping PDF...' : 'Crop & Download PDF'}
      </button>

      {message && !loading && (
        <p role="status" className="mt-4 break-words text-sm">
          {message}
        </p>
      )}
    </div>
  );
}

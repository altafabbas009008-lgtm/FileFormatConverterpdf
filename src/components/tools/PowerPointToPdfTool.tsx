
import { useState } from 'react';
import { PowerPointToPdfService } from '@/services/pdf/powerPointToPdfService';
import { DialogService } from '@/services/tauri/dialogService';
import { FsService } from '@/services/tauri/fsService';
import DuckLoader from '@/components/common/DuckLoader';

interface PowerPointToPdfToolProps {
  onBack: () => void;
}

export function PowerPointToPdfTool({
  onBack,
}: PowerPointToPdfToolProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function handleConvert() {
    if (!file) {
      setError('Please select a PowerPoint file first.');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const pdfBytes = await PowerPointToPdfService.convertToPdf(file);

      const suggestedName = file.name.replace(/\.pptx$/i, '.pdf');
      const targetPath = await DialogService.selectSaveLocation(
        suggestedName,
        'pdf',
      );

      if (!targetPath) {
        setMessage('Save cancelled. Your original file is unchanged.');
        return;
      }

      const savedPath = await FsService.saveFileSafe(
        targetPath,
        pdfBytes,
      );

      setMessage(`PDF saved successfully: ${savedPath}`);
    

} catch (err) {
  const errorMessage =
    err instanceof Error
      ? err.message
      : 'Conversion failed. Please try again.';

  setError(errorMessage);
} finally {


      setLoading(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl p-6">
      <button
        type="button"
        onClick={onBack}
        className="mb-6 rounded border px-4 py-2"
      >
        ← Back
      </button>

      <h1 className="mb-2 text-2xl font-bold">
        PowerPoint to PDF
      </h1>

      <p className="mb-6 text-gray-600">
        Convert your PowerPoint presentation into a PDF document.
      </p>

      <section className="rounded-xl border p-6">
        <label
          htmlFor="powerpoint-file"
          className="mb-3 block font-medium"
        >
          Select PowerPoint file (.pptx)
        </label>

        <input
          id="powerpoint-file"
          type="file"
          accept=".pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation"
          onChange={(event) => {
            setFile(event.target.files?.[0] ?? null);
            setMessage('');
            setError('');
          }}
          className="block w-full rounded border p-3"
        />

        {file && (
          <p className="mt-3 break-all text-sm">
            Selected: {file.name}
          </p>
        )}

        {loading && (
          <div className="mt-5">
            <DuckLoader />
          </div>
        )}

        <button
          type="button"
          onClick={handleConvert}
          disabled={!file || loading}
          className="mt-5 rounded-lg bg-blue-600 px-5 py-3 text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Converting...' : 'Convert to PDF'}
        </button>

        {message && !loading && (
          <p className="mt-4 break-all text-green-700" role="status">
            {message}
          </p>
        )}

        {error && (
          <p className="mt-4 break-words text-red-600" role="alert">
            {error}
          </p>
        )}
      </section>
    </main>
  );
}

import { useState } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  FileText,
  Presentation,
} from 'lucide-react';

import { DropZone } from '@/components/common/DropZone';
import DuckLoader from '@/components/common/DuckLoader';
import { PdfToPowerPointService } from '@/services/pdf/pdfToPowerPointService';
import { FsService } from '@/services/tauri/fsService';
import { DialogService } from '@/services/tauri/dialogService';
import { validatePdfBytes } from '@/utils/fileValidation';
import {
  formatBytes,
  generateSafeOutputFilename,
} from '@/utils/formatters';

interface PdfToPowerPointToolProps {
  onBack: () => void;
}

export function PdfToPowerPointTool({
  onBack,
}: PdfToPowerPointToolProps) {
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [outputBytes, setOutputBytes] = useState<Uint8Array | null>(null);


const handleFilesAdded = async (files: File[]) => {
  const selected = files[0];
  if (!selected) {
    setError('Please select a PDF file.');
    return;
  }

  setError('');
  setSuccess('');
  setOutputBytes(null);

  try {
    if (!selected.name.toLowerCase().endsWith('.pdf')) {
      throw new Error('Please select a file with .pdf extension.');
    }

    const bytes = new Uint8Array(await selected.arrayBuffer());
    await validatePdfBytes(bytes);

    setFile(selected);
    setStatus('PDF selected successfully.');
  } catch (err) {
    setFile(null);
    setError(
      err instanceof Error
        ? err.message
        : 'Could not read the selected PDF file.'
    );
  }
};


  const handleConvert = async () => {
    if (!file || busy) return;

    setBusy(true);
    setError('');
    setSuccess('');
    setProgress(0);

    try {
      const bytes = new Uint8Array(await file.arrayBuffer());

      const converted = await PdfToPowerPointService.convert(
        bytes,
        (percent, message) => {
          setProgress(percent);
          setStatus(message);
        }
      );

      setOutputBytes(converted);
      setSuccess('PDF converted successfully. Your PowerPoint is ready.');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Conversion failed. Please try another PDF.'
      );
    } finally {
      setBusy(false);
    }
  };

  const handleSave = async () => {
    if (!file || !outputBytes) return;

    try {
      const filename = generateSafeOutputFilename(
  file.name.replace(/\.pdf$/i, ''),
  'converted',
  'pptx'
);

      const targetPath = await DialogService.selectSaveLocation(
        filename,
        'pptx'
      );

      if (!targetPath) return;

      await FsService.saveFileSafe(targetPath, outputBytes);
      setSuccess('PowerPoint file saved successfully.');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not save PowerPoint file.'
      );
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl p-6">
      <button
        onClick={onBack}
        className="mb-6 text-sm text-gray-600 hover:text-gray-900"
      >
        ← Back
      </button>

      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-xl bg-orange-100 p-3 text-orange-700">
          <Presentation size={28} />
        </div>
        <div>
          <h1 className="text-2xl font-bold">PDF to PowerPoint</h1>
          <p className="text-sm text-gray-500">
            Convert each PDF page into a PowerPoint slide.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <DropZone
  accept=".pdf,application/pdf"
  multiple={false}
  onFilesDropped={handleFilesAdded}
/>

        {file && (
          <div className="mt-5 flex items-center gap-3 rounded-lg bg-gray-50 p-4">
            <FileText size={26} className="text-red-600" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{file.name}</p>
              <p className="text-sm text-gray-500">
                {formatBytes(file.size)}
              </p>
            </div>
            <button
              onClick={() => {
                setFile(null);
                setOutputBytes(null);
                setSuccess('');
                setError('');
              }}
              disabled={busy}
              className="text-sm text-gray-500 hover:text-red-600"
            >
              Remove
            </button>
          </div>
        )}

        {busy && (
          <div className="mt-5">
            <DuckLoader progress={progress} label={status || 'Converting PDF to PowerPoint...'} />
          </div>
        )}

        {error && (
          <div className="mt-5 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle size={18} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mt-5 flex items-start gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-700">
            <CheckCircle2 size={18} className="shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={handleConvert}
            disabled={!file || busy}
            className="rounded-lg bg-orange-600 px-5 py-3 font-medium text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? 'Converting...' : 'Convert to PowerPoint'}
          </button>

          <button
            onClick={handleSave}
            disabled={!outputBytes || busy}
            className="rounded-lg border border-gray-300 px-5 py-3 font-medium disabled:cursor-not-allowed disabled:opacity-50"
          >
            Save PPTX
          </button>
        </div>

        <p className="mt-4 text-xs text-gray-500">
          Note: Each PDF page becomes an image on a separate slide. Text and
          objects will not be individually editable.
        </p>
      </div>
    </div>
  );
}

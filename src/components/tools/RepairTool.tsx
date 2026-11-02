
import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, FileText, Wrench } from 'lucide-react';
import { DropZone } from '@/components/common/DropZone';
import DuckLoader from '@/components/common/DuckLoader';
import { PdfLibService } from '@/services/pdf/pdfLibService';
import { FsService } from '@/services/tauri/fsService';
import { DialogService } from '@/services/tauri/dialogService';
import { validatePdfBytes } from '@/utils/fileValidation';
import { generateSafeOutputFilename } from '@/utils/formatters';
import { PDFDocument } from 'pdf-lib';

interface RepairToolProps {
  onBack?: () => void;
}

export const RepairTool: React.FC<RepairToolProps> = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [savedPath, setSavedPath] = useState('');

  const handleFilesAdded = async (files: File[]) => {
    const selected = files[0];
    if (!selected) return;

    setError('');
    setStatus('');
    setSavedPath('');

    try {
      const bytes = new Uint8Array(await selected.arrayBuffer());
      const validation = validatePdfBytes(bytes);

      if (!validation.isValid) {
        setError(validation.error || 'Please select a valid PDF.');
        return;
      }

      setFile(selected);
    } catch {
      setError('Could not read the selected file.');
    }
  };

  const handleRepair = async () => {
    if (!file) return;

    setIsProcessing(true);
    setProgress(10);
    setError('');
    setStatus('Reading PDF...');

    try {
      const bytes = new Uint8Array(await file.arrayBuffer());

      setProgress(35);
      setStatus('Attempting to rewrite and repair PDF structure...');

      const repaired = await PdfLibService.repairPdf(bytes);

      setProgress(75);
      setStatus('Verifying repaired PDF...');

      const check = await PDFDocument.load(repaired);
      if (check.getPageCount() < 1) {
        throw new Error('The output PDF has no pages.');
      }

      const defaultName = generateSafeOutputFilename(file.name, 'repaired');
      const targetPath = await DialogService.selectSaveLocation(defaultName);

      if (!targetPath) {
        setStatus('Repair completed, but saving was cancelled.');
        return;
      }

      const path = await FsService.saveFileSafe(targetPath, repaired);
      setProgress(100);
      setSavedPath(path);
      setStatus('Repair attempt completed successfully.');
    } catch (err) {
      setError(
        `Repair failed: ${err instanceof Error ? err.message : String(err)}. ` +
        'This PDF may be too damaged or encrypted to recover with the current repair engine.'
      );
      setStatus('');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-extrabold text-slate-900">
          Repair PDF
        </h1>
        <p className="text-sm text-slate-500">
          Attempt to rebuild and save a readable copy of a damaged PDF.
          Recovery is not guaranteed for severely corrupted files.
        </p>
      </div>

      {!file ? (
        <DropZone
          multiple={false}
          onFilesDropped={handleFilesAdded}
          buttonLabel="Select PDF to repair"
          description="or drop PDF here"
        />
      ) : (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 md:p-8 space-y-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-amber-100 p-4 text-amber-700">
              <FileText className="h-7 w-7" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-slate-900 break-all">{file.name}</h3>
              <p className="text-sm text-slate-500">
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <button
              className="text-sm font-semibold text-primary"
              onClick={() => {
                setFile(null);
                setError('');
                setStatus('');
                setSavedPath('');
              }}
              disabled={isProcessing}
            >
              Change file
            </button>
          </div>

          {isProcessing && (
            <DuckLoader progress={progress} label={status} />
          )}

          {error && (
            <div className="flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {savedPath && (
            <div className="flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              <div className="min-w-0">
                <p className="font-bold">Repaired copy saved</p>
                <p className="break-all">{savedPath}</p>
              </div>
            </div>
          )}

          {status && !isProcessing && (
            <p className="text-sm text-slate-600">{status}</p>
          )}

          <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
            <Wrench className="inline h-4 w-4 mr-2" />
            The original file will not be overwritten. A separate output copy
            will be saved.
          </div>

          <button
            onClick={handleRepair}
            disabled={isProcessing}
            className="w-full rounded-2xl bg-emerald-600 px-6 py-4 font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {isProcessing ? 'Repairing...' : 'Repair and Save PDF'}
          </button>
        </div>
      )}
    </div>
  );
};

export default RepairTool;

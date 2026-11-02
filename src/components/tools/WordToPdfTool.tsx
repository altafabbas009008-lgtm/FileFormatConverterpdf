
import React, { useState } from 'react';
import {
  FileText,
  FileUp,
  Download,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

import { WordToPdfService } from '@/services/pdf/wordToPdfService';
import { DialogService } from '@/services/tauri/dialogService';
import { FsService } from '@/services/tauri/fsService';
import DuckLoader from '@/components/common/DuckLoader';

interface WordToPdfToolProps {
  onBack?: () => void;
}

export const WordToPdfTool: React.FC<WordToPdfToolProps> = () => {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);

  const handleSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    if (!selected) return;

    setError('');
    setStatus('');
    setPdfBlob(null);

    if (!selected.name.toLowerCase().endsWith('.docx')) {
      setFile(null);
      setError('Please choose a Word document (.docx).');
      return;
    }

    setFile(selected);
  };

  const handleConvert = async () => {
    if (!file || busy) return;

    setBusy(true);
    setError('');
    setStatus('Converting Word document...');

    try {
      const blob = await WordToPdfService.convertToPdf(file);
      setPdfBlob(blob);
      setStatus('Conversion completed successfully.');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not convert this document.'
      );
      setStatus('');
    } finally {
      setBusy(false);
    }
  };

  const handleSave = async () => {
    if (!file || !pdfBlob) return;

    setError('');

    try {
      const filename = file.name.replace(/\.docx$/i, '.pdf');
      const targetPath = await DialogService.selectSaveLocation(
        filename,
        'pdf'
      );

      if (!targetPath) {
        setStatus('Save cancelled.');
        return;
      }

      const bytes = new Uint8Array(await pdfBlob.arrayBuffer());
      const savedPath = await FsService.saveFileSafe(targetPath, bytes);
      setStatus(`PDF saved successfully: ${savedPath}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not save the PDF.'
      );
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-16">
      <div className="space-y-2 text-center">
        <FileText className="mx-auto h-10 w-10 text-[#2b579a]" />
        <h1 className="text-3xl font-extrabold text-slate-900">
          Word to PDF
        </h1>
        <p className="text-sm text-slate-500">
          Convert a Word document into a PDF file.
        </p>
      </div>

      <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <label className="flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-slate-300 p-8 hover:border-blue-500">
          <FileUp className="h-9 w-9 text-[#2b579a]" />
          <span className="font-bold text-slate-800">
            Choose Word document
          </span>
          <span className="text-sm text-slate-500">
            Supported format: .docx
          </span>
          <input
            type="file"
            accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={handleSelect}
            className="max-w-full text-sm"
          />
        </label>

        {file && (
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-4">
            <FileText className="h-6 w-6 shrink-0 text-[#2b579a]" />
            <div className="min-w-0">
              <p className="break-all font-bold text-slate-800">
                {file.name}
              </p>
              <p className="text-xs text-slate-500">
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>
        )}

        {busy && (
          <DuckLoader />
        )}

        <button
          onClick={handleConvert}
          disabled={!file || busy}
          className="w-full rounded-xl bg-[#2b579a] px-5 py-3 font-bold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? 'Converting...' : 'Convert to PDF'}
        </button>

        {status && !busy && (
          <div className="flex items-start gap-2 text-sm text-emerald-700">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <p className="break-all">{status}</p>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {pdfBlob && (
          <button
            onClick={handleSave}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 px-5 py-3 font-bold text-slate-700 hover:bg-slate-50"
          >
            <Download className="h-5 w-5" />
            Save PDF
          </button>
        )}
      </div>
    </div>
  );
};

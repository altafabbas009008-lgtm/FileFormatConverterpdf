import React, { useState } from 'react';
import {
  FileSpreadsheet,
  FileUp,
  Download,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

import { PdfToExcelService } from '@/services/pdf/pdfToExcelService';
import { DialogService } from '@/services/tauri/dialogService';
import { FsService } from '@/services/tauri/fsService';
import DuckLoader from '@/components/common/DuckLoader';

interface PdfToExcelToolProps {
  onBack?: () => void;
}

export const PdfToExcelTool: React.FC<PdfToExcelToolProps> = () => {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [excelBlob, setExcelBlob] = useState<Blob | null>(null);

  const handleSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    if (!selected) return;

    setError('');
    setStatus('');
    setExcelBlob(null);

    if (!selected.name.toLowerCase().endsWith('.pdf')) {
      setFile(null);
      setError('Please choose a PDF document (.pdf).');
      return;
    }

    setFile(selected);
  };

  const handleConvert = async () => {
    if (!file || busy) return;

    setBusy(true);
    setError('');
    setStatus('Reading PDF document...');

    try {
      const pdfBytes = new Uint8Array(await file.arrayBuffer());

      const excelBytes = await PdfToExcelService.convert(
        pdfBytes,
        (percent, message) => {
          setStatus(`${message} (${percent}%)`);
        }
      );

      const blob = new Blob(
  [new Uint8Array(excelBytes).buffer as ArrayBuffer],
  {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      setExcelBlob(blob);
      setStatus('Conversion completed successfully.');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not convert this PDF document.'
      );
      setStatus('');
    } finally {
      setBusy(false);
    }
  };

  const handleSave = async () => {
    if (!file || !excelBlob) return;

    setError('');

    try {
      const filename = file.name.replace(/\.pdf$/i, '.xlsx');

      const targetPath = await DialogService.selectSaveLocation(
        filename,
        'xlsx'
      );

      if (!targetPath) {
        setStatus('Save cancelled.');
        return;
      }

      const bytes = new Uint8Array(await excelBlob.arrayBuffer());
      const savedPath = await FsService.saveFileSafe(targetPath, bytes);

      setStatus(`Excel file saved successfully: ${savedPath}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not save the Excel file.'
      );
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-16">
      <div className="space-y-2 text-center">
        <FileSpreadsheet className="mx-auto h-10 w-10 text-[#217346]" />
        <h1 className="text-3xl font-extrabold text-slate-900">
          PDF to Excel
        </h1>
        <p className="text-sm text-slate-500">
          Extract text from a PDF and export it to an Excel spreadsheet.
        </p>
      </div>

      <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <label className="flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-slate-300 p-8 hover:border-emerald-600">
          <FileUp className="h-9 w-9 text-[#217346]" />

          <span className="font-bold text-slate-800">
            Choose PDF document
          </span>

          <span className="text-sm text-slate-500">
            Supported format: .pdf
          </span>

          <input
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleSelect}
            className="max-w-full text-sm"
          />
        </label>

        {file && (
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-4">
            <FileSpreadsheet className="h-6 w-6 shrink-0 text-[#217346]" />

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
          className="w-full rounded-xl bg-[#217346] px-5 py-3 font-bold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? 'Converting...' : 'Convert to Excel'}
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
            <p className="break-words">{error}</p>
          </div>
        )}

        {excelBlob && (
          <button
            onClick={handleSave}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 px-5 py-3 font-bold text-slate-700 hover:bg-slate-50"
          >
            <Download className="h-5 w-5" />
            Save Excel File (.xlsx)
          </button>
        )}

        <p className="text-xs leading-5 text-slate-500">
          Note: This tool extracts selectable text from PDFs. Scanned PDFs
          may need OCR, and complex tables may not retain their original
          layout perfectly.
        </p>
      </div>
    </div>
  );
};

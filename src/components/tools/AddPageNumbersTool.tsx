
import React, { useState } from 'react';
import { FileText, Hash, AlertCircle, CheckCircle2 } from 'lucide-react';
import { DropZone } from '@/components/common/DropZone';
import DuckLoader from '@/components/common/DuckLoader';

import { FsService } from '@/services/tauri/fsService';
import { DialogService } from '@/services/tauri/dialogService';
import { validatePdfBytes } from '@/utils/fileValidation';
import { generateSafeOutputFilename } from '@/utils/formatters';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export const AddPageNumbersTool: React.FC = () => {
  const [file, setFile] = useState<{ name: string; data: Uint8Array } | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [position, setPosition] = useState('bottom');
  const [alignment, setAlignment] = useState('center');
  const [startNumber, setStartNumber] = useState(1);
  const [prefix, setPrefix] = useState('');
  const [suffix, setSuffix] = useState('');
  const [fontSize, setFontSize] = useState(12);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleFilesAdded = async (files: File[]) => {
    if (!files.length) return;

    setError('');
    setSuccess('');

    try {
      const bytes = new Uint8Array(await files[0].arrayBuffer());
      const validation = validatePdfBytes(bytes);

      if (!validation.isValid) {
        setError(validation.error || 'Invalid PDF file.');
        return;
      }

      if (validation.isEncrypted) {
        setError('Password-protected PDFs are not supported.');
        return;
      }

      const pdf = await PDFDocument.load(bytes.slice());
      setPageCount(pdf.getPageCount());
      setFile({ name: files[0].name, data: bytes });
    } catch (e) {
      setError(`Could not open PDF: ${String(e)}`);
    }
  };

  const handleSave = async () => {
    if (!file) return;

    if (!Number.isInteger(startNumber) || startNumber < 1) {
      setError('Starting number must be a positive whole number.');
      return;
    }

    setIsProcessing(true);
    setError('');
    setSuccess('');

    try {
      const pdf = await PDFDocument.load(file.data.slice());
      const font = await pdf.embedFont(StandardFonts.Helvetica);

      pdf.getPages().forEach((page, index) => {
        const { width, height } = page.getSize();
        const label = `${prefix}${startNumber + index}${suffix}`;
        const textWidth = font.widthOfTextAtSize(label, fontSize);
        const margin = 24;

        let x = margin;
        if (alignment === 'center') x = (width - textWidth) / 2;
        if (alignment === 'right') x = width - textWidth - margin;

        const y = position === 'bottom'
          ? margin
          : height - fontSize - margin;

        page.drawText(label, {
          x: Math.max(0, x),
          y: Math.max(0, y),
          size: fontSize,
          font,
          color: rgb(0.15, 0.15, 0.15),
        });
      });

      const output = await pdf.save();
      const filename = generateSafeOutputFilename(file.name, 'numbered');
      const target = await DialogService.selectSaveLocation(filename);

      if (!target) {
        setSuccess('Save cancelled.');
        return;
      }

      const savedPath = await FsService.saveFileSafe(target, output);
      setSuccess(`PDF saved successfully: ${savedPath}`);
    } catch (e) {
      setError(`Failed to add page numbers: ${String(e)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-extrabold text-slate-900">
          Add Page Numbers
        </h1>
        <p className="text-sm text-slate-500">
          Add page numbers to your PDF and save a new copy.
        </p>
      </div>

      {!file ? (
        <DropZone
          multiple={false}
          onFilesDropped={handleFilesAdded}
          buttonLabel="Select PDF file"
          description="or drop PDF here"
        />
      ) : (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-5">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-emerald-600" />
              <div>
                <h3 className="font-bold text-slate-900">{file.name}</h3>
                <p className="text-xs text-slate-500">{pageCount} pages</p>
              </div>
            </div>
            <button
              className="text-sm font-semibold text-primary hover:underline"
              onClick={() => {
                setFile(null);
                setPageCount(0);
                setError('');
                setSuccess('');
              }}
            >
              Change PDF
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <label className="text-sm font-semibold text-slate-700">
              Position
              <select
                className="mt-2 w-full rounded-xl border border-slate-300 p-3"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
              >
                <option value="bottom">Bottom</option>
                <option value="top">Top</option>
              </select>
            </label>

            <label className="text-sm font-semibold text-slate-700">
              Alignment
              <select
                className="mt-2 w-full rounded-xl border border-slate-300 p-3"
                value={alignment}
                onChange={(e) => setAlignment(e.target.value)}
              >
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
            </label>

            <label className="text-sm font-semibold text-slate-700">
              Starting number
              <input
                type="number"
                min="1"
                step="1"
                className="mt-2 w-full rounded-xl border border-slate-300 p-3"
                value={startNumber}
                onChange={(e) => setStartNumber(Number(e.target.value))}
              />
            </label>

            <label className="text-sm font-semibold text-slate-700">
              Font size
              <select
                className="mt-2 w-full rounded-xl border border-slate-300 p-3"
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
              >
                <option value={8}>8</option>
                <option value={10}>10</option>
                <option value={12}>12</option>
                <option value={14}>14</option>
                <option value={16}>16</option>
                <option value={18}>18</option>
              </select>
            </label>

            <label className="text-sm font-semibold text-slate-700">
              Prefix (optional)
              <input
                className="mt-2 w-full rounded-xl border border-slate-300 p-3"
                placeholder="e.g. Page "
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
              />
            </label>

            <label className="text-sm font-semibold text-slate-700">
              Suffix (optional)
              <input
                className="mt-2 w-full rounded-xl border border-slate-300 p-3"
                placeholder="e.g. / 10"
                value={suffix}
                onChange={(e) => setSuffix(e.target.value)}
              />
            </label>
          </div>

          <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
            <div className="flex items-center gap-2 font-semibold">
              <Hash className="h-4 w-4" />
              Numbering preview
            </div>
            <p className="mt-2">
              {prefix}{startNumber}{suffix} → {prefix}{startNumber + pageCount - 1}{suffix}
            </p>
            <p className="mt-1 text-xs">
              Numbers will be applied to all {pageCount} pages.
            </p>
          </div>

          {error && (
            <p className="flex items-center gap-2 text-sm text-red-600">
              <AlertCircle className="h-4 w-4" />
              {error}
            </p>
          )}

          {success && (
            <p className="flex items-center gap-2 text-sm text-emerald-700 break-all">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {success}
            </p>
          )}

          {isProcessing && (
            <DuckLoader />
          )}

          <button
            onClick={handleSave}
            disabled={isProcessing || pageCount === 0}
            className="w-full rounded-2xl bg-primary px-6 py-4 font-bold text-white hover:bg-primary-hover disabled:opacity-50"
          >
            {isProcessing ? 'Adding page numbers...' : 'Add Numbers & Save PDF'}
          </button>
        </div>
      )}
    </div>
  );
};

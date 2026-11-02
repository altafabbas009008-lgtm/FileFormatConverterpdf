
import React, { useState } from 'react';
import {
  FileText,
  ScanText,
  Copy,
  Check,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';

import { DropZone } from '@/components/common/DropZone';
import DuckLoader from '@/components/common/DuckLoader';
import { OcrService } from '@/services/pdf/ocrService';
import { FsService } from '@/services/tauri/fsService';
import { DialogService } from '@/services/tauri/dialogService';
import { validatePdfBytes } from '@/utils/fileValidation';
import { formatBytes, generateSafeOutputFilename } from '@/utils/formatters';

interface OcrToolProps {
  onBack?: () => void;
}

export const OcrTool: React.FC<OcrToolProps> = () => {
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState('');
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [savedPath, setSavedPath] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleFilesAdded = async (files: File[]) => {
    if (!files.length) return;

    const selectedFile = files[0];
    setError('');
    setStatus('');
    setSavedPath('');
    setText('');
    setProgress(0);

    try {
      const bytes = new Uint8Array(await selectedFile.arrayBuffer());
      const validation = validatePdfBytes(bytes);

      if (!validation.isValid) {
        setError(validation.error || 'Please select a valid PDF.');
        return;
      }

      if (validation.isEncrypted) {
        setError('Password-protected PDFs are not supported.');
        return;
      }

      setFile(selectedFile);
    } catch (err) {
      setError(`Could not read PDF: ${String(err)}`);
    }
  };

  const handleExtractText = async () => {
    if (!file || isProcessing) return;

    setIsProcessing(true);
    setError('');
    setStatus('Starting OCR...');
    setProgress(0);
    setText('');
    setSavedPath('');

    try {
      const bytes = new Uint8Array(await file.arrayBuffer());

      const result = await OcrService.extractTextFromPdf(
        bytes,
        (fraction) => {
          setProgress(Math.round(fraction * 100));
          setStatus(`Recognizing text: ${Math.round(fraction * 100)}%`);
        }
      );

      setText(result);

      if (!result.trim()) {
        setStatus('OCR finished, but no text was recognized.');
      } else {
        setStatus('Text extraction completed.');
      }
    } catch (err) {
      setError(
        `OCR failed: ${err instanceof Error ? err.message : String(err)}`
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setError('Could not copy text. Please select and copy it manually.');
    }
  };

  const handleSave = async () => {
    if (!file || !text.trim()) return;

    setError('');

    try {
      const filename = generateSafeOutputFilename(file.name, 'ocr', 'txt');
      const targetPath = await DialogService.selectSaveLocation(filename, 'txt');

      if (!targetPath) {
        setStatus('Save cancelled.');
        return;
      }

      const bytes = new TextEncoder().encode(text);
      const path = await FsService.saveFileSafe(targetPath, bytes);

      setSavedPath(path);
      setStatus('OCR text saved successfully.');
    } catch (err) {
      setError(`Could not save text: ${String(err)}`);
    }
  };

  const handleReset = () => {
    setFile(null);
    setText('');
    setProgress(0);
    setStatus('');
    setError('');
    setSavedPath('');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      <div className="text-center space-y-2">
        <div className="flex justify-center">
          <ScanText className="h-10 w-10 text-[#2b579a]" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
          OCR PDF — Extract Scanned Text
        </h1>
        <p className="text-sm text-slate-500 max-w-xl mx-auto">
          Recognize text in scanned PDF pages and save the result as a TXT file.
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-5">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-[#2b579a]">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">{file.name}</h3>
                <p className="text-xs text-slate-400">{formatBytes(file.size)}</p>
              </div>
            </div>
            <button
              onClick={handleReset}
              disabled={isProcessing}
              className="text-xs font-bold text-[#2b579a] hover:underline disabled:opacity-50"
            >
              Choose another file
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleExtractText}
              disabled={isProcessing}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#2b579a] px-5 py-3 font-bold text-white hover:bg-blue-800 disabled:opacity-50"
            >
              <ScanText className="h-5 w-5" />
              {isProcessing ? 'Recognizing text...' : 'Extract Text with OCR'}
            </button>

            <button
              onClick={handleSave}
              disabled={!text.trim() || isProcessing}
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-5 py-3 font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Save as TXT <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          {isProcessing && (
            <DuckLoader
              progress={progress}
              label={status || 'Processing PDF pages...'}
            />
          )}

          {status && !isProcessing && (
            <p className="text-sm text-slate-600">{status}</p>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {savedPath && (
            <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              <div>
                <p className="font-bold">Text file saved!</p>
                <p className="break-all">{savedPath}</p>
              </div>
            </div>
          )}

          {text && (
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <div className="flex items-center justify-between gap-3 border-b bg-slate-50 p-3">
                <div>
                  <h3 className="font-bold text-slate-800">Extracted Text</h3>
                  <p className="text-xs text-slate-500">
                    {text.trim().split(/\s+/).length.toLocaleString()} words
                  </p>
                </div>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-xs font-bold"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? 'Copied' : 'Copy Text'}
                </button>
              </div>
              <textarea
                readOnly
                value={text}
                aria-label="OCR extracted text"
                className="min-h-72 w-full resize-y p-4 text-sm leading-relaxed text-slate-800 outline-none"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

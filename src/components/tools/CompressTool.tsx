
import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  FileText,
  Zap,
  ShieldCheck,
  Sparkles,
  Info
} from 'lucide-react';

import { DropZone } from '@/components/common/DropZone';
import DuckLoader from '@/components/common/DuckLoader';
import { PdfCompressService } from '@/services/pdf/pdfCompressService';
import { PdfRenderService } from '@/services/pdf/pdfRenderService';
import { FsService } from '@/services/tauri/fsService';
import { DialogService } from '@/services/tauri/dialogService';
import { validatePdfBytes } from '@/utils/fileValidation';
import {
  formatBytes,
  generateSafeOutputFilename
} from '@/utils/formatters';

import {
  CompressionLevel,
  CompressionMode,
  CompressionReport,
  PDFFileInfo
} from '@/types/pdf';

import { PDFDocument } from 'pdf-lib';

interface CompressToolProps {
  onBack?: () => void;
}

export const CompressTool: React.FC<CompressToolProps> = () => {
  const [file, setFile] = useState<PDFFileInfo | null>(null);
  const [coverThumbnail, setCoverThumbnail] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [level, setLevel] = useState<CompressionLevel>('recommended');
  const [mode, setMode] = useState<CompressionMode>('smart');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [report, setReport] = useState<CompressionReport | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savedFilePath, setSavedFilePath] = useState<string | null>(null);

  const handleFilesAdded = async (fileList: File[]) => {
    if (fileList.length === 0) return;

    setErrorMessage(null);
    setReport(null);
    setStatusMessage(null);
    setSavedFilePath(null);
    setCoverThumbnail(null);

    const f = fileList[0];

    try {
      const buffer = await f.arrayBuffer();
      const uint8 = new Uint8Array(buffer);

      const validation = validatePdfBytes(uint8);

      if (!validation.isValid) {
        setErrorMessage(validation.error || 'Invalid PDF file');
        return;
      }

      if (validation.isEncrypted) {
        setErrorMessage('Cannot compress password-protected PDF.');
        return;
      }

      const doc = await PDFDocument.load(uint8.slice());
      const count = doc.getPageCount();

      setPageCount(count);

      setFile({
        id: f.name,
        name: f.name,
        size: f.size,
        data: uint8.slice(),
        pageCount: count,
        status: 'ready',
      });

      try {
        const pdfDoc = await PdfRenderService.loadDocument(uint8.slice());
        const thumb = await PdfRenderService.renderThumbnail(pdfDoc, 1, 160);
        setCoverThumbnail(thumb);
      } catch (thumbErr) {
        console.warn('Cover preview thumbnail notice:', thumbErr);
      }

    } catch (err) {
      setErrorMessage(`Failed to read file: ${String(err)}`);
    }
  };

  
const handleCompress = async () => {
  if (!file || isProcessing) return;

  setIsProcessing(true);
  setProgress(5);
  setErrorMessage(null);
  setReport(null);
  setSavedFilePath(null);
  setStatusMessage('Starting offline compression engine...');

  try {
    const { compressedData, report: compReport } =
      await PdfCompressService.compressPdf(
        file.data,
        level,
        mode,
        (pct, msg) => {
          setProgress(pct);
          setStatusMessage(msg);
        }
      );

    setReport(compReport);

    const defaultFilename = generateSafeOutputFilename(
      file.name,
      `compressed_${level}`
    );

    const targetPath =
      await DialogService.selectSaveLocation(defaultFilename);

    if (targetPath) {
      const savedPath = await FsService.saveFileSafe(
        targetPath,
        compressedData
      );

      setStatusMessage('Compression complete!');
      setSavedFilePath(savedPath);
    } else {
      setStatusMessage('Compression finished. Save cancelled by user.');
    }

    setProgress(100);

  } catch (err) {
    setErrorMessage(`Compression failed: ${String(err)}`);
  } finally {
    setIsProcessing(false);
  }
};


  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">

      {/* Tool Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
          Compress PDF file
        </h1>

        <p className="text-sm text-slate-500 max-w-xl mx-auto">
          Reduce file size with real offline compression while optimizing quality.
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
        <div className="rounded-3xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm space-y-8">

          {/* File Header Card */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-100 pb-5 gap-4">

            <div className="flex items-center space-x-4">
              {coverThumbnail ? (
                <div className="h-16 w-12 flex-shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-xs">
                  <img
                    src={coverThumbnail}
                    alt="Cover preview"
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 flex-shrink-0">
                  <FileText className="h-7 w-7" />
                </div>
              )}

              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {file.name}
                </h3>

                <p className="text-xs text-slate-400">
                  {pageCount} Page{pageCount > 1 ? 's' : ''} • Original Size:{' '}
                  <strong className="text-slate-700">
                    {formatBytes(file.size)}
                  </strong>
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setFile(null);
                setReport(null);
                setCoverThumbnail(null);
                setProgress(0);
              }}
              disabled={isProcessing}
              className="text-xs font-bold text-primary hover:underline"
            >
              Choose another file
            </button>
          </div>

          {/* Compression Mode Selector */}
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-amber-500" />
              Compression Strategy:
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

              <div
                onClick={() => !isProcessing && setMode('smart')}
                className={`cursor-pointer rounded-2xl border p-4 transition-all text-left ${
                  mode === 'smart'
                    ? 'border-emerald-600 bg-emerald-50/40 ring-2 ring-emerald-600/20 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                    Smart Image & Page Downsampling
                  </span>

                  <span className="rounded-md bg-emerald-100 text-emerald-800 px-1.5 py-0.5 text-[10px] font-bold">
                    Recommended
                  </span>
                </div>

                <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                  Recompresses embedded images and scans into high-efficiency streams.
                  Provides real <strong>40%–85% size savings</strong> on scans, photos, slides, and heavy documents.
                </p>
              </div>

              <div
                onClick={() => !isProcessing && setMode('structural')}
                className={`cursor-pointer rounded-2xl border p-4 transition-all text-left ${
                  mode === 'structural'
                    ? 'border-emerald-600 bg-emerald-50/40 ring-2 ring-emerald-600/20 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-indigo-600" />
                    Lossless Vector & Structure Only
                  </span>

                  <span className="rounded-md bg-slate-200 text-slate-700 px-1.5 py-0.5 text-[10px] font-semibold">
                    Text-Safe
                  </span>
                </div>

                <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                  Packs object streams with Flate and strips metadata while retaining 100% selectable vector text and fonts.
                </p>
              </div>

            </div>
          </div>

          {/* Duck Loader: same processing card */}
          {isProcessing && (
            <DuckLoader
              progress={progress}
              label={statusMessage || 'Compressing document offline...'}
            />
          )}

          {/* Compression Level Options */}
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Compression strength:
            </label>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  id: 'extreme',
                  title: 'Extreme Compression',
                  sub: 'Smallest file size',
                  badge: '~60% to 85% reduction',
                  desc: 'High compression (~85 DPI, 55% quality). Perfect for strict email or government portal upload limits.',
                },
                {
                  id: 'recommended',
                  title: 'Recommended Compression',
                  sub: 'Balanced quality & size',
                  badge: '~40% to 70% reduction',
                  desc: 'Optimal resolution (~110 DPI, 72% quality). Crisp readable text and graphics with significant size savings.',
                },
                {
                  id: 'lossless',
                  title: 'Less Compression',
                  sub: 'High visual detail',
                  badge: '~20% to 45% reduction',
                  desc: 'High definition (~140 DPI, 85% quality). Preserves fine graphics while removing unnecessary stream bloat.',
                },
              ].map((opt) => (
                <div
                  key={opt.id}
                  onClick={() => !isProcessing && setLevel(opt.id as CompressionLevel)}
                  className={`cursor-pointer rounded-2xl border p-5 transition-all text-left relative ${
                    level === opt.id
                      ? 'border-emerald-600 bg-emerald-50/30 ring-2 ring-emerald-600/20 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                  }`}
                >
                  <p className="text-sm font-extrabold text-slate-900">
                    {opt.title}
                  </p>

                  <p className="text-xs font-bold text-emerald-700 mt-1">
                    {opt.sub}
                  </p>

                  <span className="inline-block mt-2 rounded-md bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-bold">
                    {opt.badge}
                  </span>

                  <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                    {opt.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Audit Report */}
          {report && (
            <div className="rounded-2xl bg-emerald-50/90 p-5 border border-emerald-200 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Compression Audit Report
              </h4>

              <div className="flex items-center justify-between text-sm flex-wrap gap-3">
                <div>
                  <span className="text-xs text-slate-500 block">Original Size</span>
                  <span className="font-bold text-slate-800 text-base">
                    {formatBytes(report.originalBytes)}
                  </span>
                </div>

                <ArrowRight className="h-5 w-5 text-emerald-600 hidden sm:block" />

                <div>
                  <span className="text-xs text-slate-500 block">Compressed Size</span>
                  <span className="font-bold text-emerald-700 text-base">
                    {formatBytes(report.compressedBytes)}
                  </span>
                </div>

                {report.percentageSaved > 0 ? (
                  <div className="rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-extrabold text-white shadow-xs">
                    {report.percentageSaved}% Saved ({formatBytes(report.savedBytes)} reduced)
                  </div>
                ) : (
                  <div className="rounded-xl bg-amber-100 text-amber-800 px-3 py-1.5 text-xs font-bold flex items-center gap-1.5">
                    <Info className="h-3.5 w-3.5" />
                    <span>Already optimally compressed</span>
                  </div>
                )}
              </div>

              {report.percentageSaved === 0 && (
                <p className="text-[11px] text-slate-600 bg-white/70 p-2.5 rounded-xl border border-emerald-200/60 leading-relaxed">
                  <strong>Notice:</strong> This PDF is already at optimal compression or is a lightweight vector document. To compress further, select <strong>Extreme Compression</strong> under Smart Downsampling.
                </p>
              )}
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="flex items-center space-x-2 text-xs font-medium text-red-600 bg-red-50 p-3 rounded-xl border border-red-200">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Success Message */}
          {savedFilePath && (
            <div className="flex items-center space-x-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-medium text-emerald-800">
              <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-600" />
              <div>
                <p className="font-bold">Compressed PDF saved successfully!</p>
                <p className="text-slate-600 truncate">{savedFilePath}</p>
              </div>
            </div>
          )}

          {/* Bottom Action Button */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <span className="text-xs text-slate-400">
              {mode === 'smart'
                ? 'Smart Image Downsampling'
                : 'Structural Vector Optimization'} •{' '}
              {level.charAt(0).toUpperCase() + level.slice(1)} Strength
            </span>

            <button
              onClick={handleCompress}
              disabled={isProcessing}
              className="flex items-center space-x-3 rounded-2xl bg-emerald-600 px-8 py-4 text-base font-bold text-white shadow-xl shadow-emerald-600/25 hover:bg-emerald-700 active:scale-95 disabled:opacity-40 transition-all duration-150"
            >
              <span>Compress PDF</span>
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>

        </div>
      )}
    </div>
  );
};

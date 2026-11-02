import React, { useState } from 'react';
import { 
  Trash2, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  FileText
} from 'lucide-react';
import { DropZone } from '@/components/common/DropZone';
import DuckLoader from '@/components/common/DuckLoader';
import { PdfLibService } from '@/services/pdf/pdfLibService';
import { PdfRenderService } from '@/services/pdf/pdfRenderService';
import { FsService } from '@/services/tauri/fsService';
import { DialogService } from '@/services/tauri/dialogService';
import { validatePdfBytes } from '@/utils/fileValidation';
import { formatBytes, generateSafeOutputFilename } from '@/utils/formatters';
import { PDFFileInfo, PDFPagePreview } from '@/types/pdf';
import { PDFDocument } from 'pdf-lib';

interface RemovePagesToolProps {
  onBack?: () => void;
}

export const RemovePagesTool: React.FC<RemovePagesToolProps> = () => {
  const [file, setFile] = useState<PDFFileInfo | null>(null);
  const [pages, setPages] = useState<PDFPagePreview[]>([]);
  const [removedIndices, setRemovedIndices] = useState<Set<number>>(new Set());
  const [pageCount, setPageCount] = useState(0);
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savedFilePath, setSavedFilePath] = useState<string | null>(null);

  const handleFilesAdded = async (fileList: File[]) => {
    if (fileList.length === 0) return;
    setErrorMessage(null);
    setStatusMessage(null);
    setSavedFilePath(null);
    setRemovedIndices(new Set());

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
        setErrorMessage('Cannot remove pages from password-protected PDF.');
        return;
      }

      const doc = await PDFDocument.load(uint8.slice());
      const count = doc.getPageCount();
      setPageCount(count);

      // Create initial page placeholders immediately
      const initialPages: PDFPagePreview[] = [];
      for (let i = 1; i <= count; i++) {
        initialPages.push({
          id: `remove-page-${i}`,
          pageIndex: i - 1,
          pageNumber: i,
          rotation: 0,
          isDeleted: false,
        });
      }
      setPages(initialPages);

      setFile({
        id: f.name,
        name: f.name,
        size: f.size,
        data: uint8.slice(),
        pageCount: count,
        status: 'ready',
      });

      // Render thumbnails in background
      setIsRendering(true);
      try {
        const pdfDoc = await PdfRenderService.loadDocument(uint8.slice());
        for (let i = 1; i <= count; i++) {
          const thumbUrl = await PdfRenderService.renderThumbnail(pdfDoc, i, 180);
          setPages((prev) =>
            prev.map((p) => (p.pageNumber === i ? { ...p, thumbnailUrl: thumbUrl } : p))
          );
          setRenderProgress(Math.round((i / count) * 100));
        }
      } catch (renderErr) {
        console.warn('Thumbnail preview rendering notice:', renderErr);
      } finally {
        setIsRendering(false);
      }
    } catch (err) {
      setErrorMessage(`Failed to read file: ${String(err)}`);
    }
  };

  // Toggle page removal
  const handleToggleRemove = (pageIndex: number) => {
    const next = new Set(removedIndices);
    if (next.has(pageIndex)) {
      next.delete(pageIndex);
    } else {
      next.add(pageIndex);
    }
    setRemovedIndices(next);
  };

  // Quick preset selections
  const handleRemoveOdds = () => {
    const odds = new Set(removedIndices);
    for (let i = 0; i < pageCount; i += 2) odds.add(i);
    setRemovedIndices(odds);
  };

  const handleRemoveEvens = () => {
    const evens = new Set(removedIndices);
    for (let i = 1; i < pageCount; i += 2) evens.add(i);
    setRemovedIndices(evens);
  };

  const handleResetAll = () => {
    setRemovedIndices(new Set());
  };

  const handleApplyRemoval = async () => {
    if (!file) return;

    if (removedIndices.size === 0) {
      setErrorMessage('Please select at least one page to remove.');
      return;
    }

    if (removedIndices.size >= pageCount) {
      setErrorMessage('Cannot remove all pages. At least 1 page must remain in the document.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setStatusMessage(`Removing ${removedIndices.size} pages from document...`);

    try {
      const indicesToRemove = Array.from(removedIndices);
      const remainingBytes = await PdfLibService.deletePages(file.data, indicesToRemove);
      const defaultFilename = generateSafeOutputFilename(
        file.name,
        `pages_removed_${removedIndices.size}`
      );

      const targetPath = await DialogService.selectSaveLocation(defaultFilename);
      if (targetPath) {
        const savedPath = await FsService.saveFileSafe(targetPath, remainingBytes);
        setStatusMessage('Pages removed successfully!');
        setSavedFilePath(savedPath);
      } else {
        setStatusMessage('Save cancelled by user.');
      }
    } catch (err) {
      setErrorMessage(`Failed to remove pages: ${String(err)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const removeCount = removedIndices.size;
  const keepCount = Math.max(0, pageCount - removeCount);

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      {/* Tool Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
          Remove PDF pages
        </h1>
        <p className="text-sm text-slate-500 max-w-xl mx-auto">
          Visually inspect your PDF pages and click on any page you want to permanently delete.
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
          {/* File Header Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-100 pb-5 gap-3">
            <div className="flex items-center space-x-3.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-600 flex-shrink-0">
                <Trash2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">{file.name}</h3>
                <p className="text-xs text-slate-400">
                  {pageCount} Total Pages • {formatBytes(file.size)}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setFile(null);
                setPages([]);
              }}
              className="text-xs font-bold text-primary hover:underline"
            >
              Choose another file
            </button>
          </div>

          {/* Counter Badges & Toolbar */}
          <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            {/* Live Status Badges */}
            <div className="flex items-center space-x-3">
              <span className="inline-flex items-center space-x-1.5 rounded-full bg-emerald-100 px-3.5 py-1 text-xs font-bold text-emerald-800">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>Keeping: {keepCount} pages</span>
              </span>

              <span className={`inline-flex items-center space-x-1.5 rounded-full px-3.5 py-1 text-xs font-bold transition-all ${
                removeCount > 0
                  ? 'bg-red-100 text-red-800 animate-pulse'
                  : 'bg-slate-200 text-slate-600'
              }`}>
                <Trash2 className="h-3.5 w-3.5 text-red-600" />
                <span>Removing: {removeCount} pages</span>
              </span>
            </div>

            {/* Quick Action Presets */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleRemoveOdds}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Remove Odd Pages
              </button>
              <button
                type="button"
                onClick={handleRemoveEvens}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Remove Even Pages
              </button>
              {removeCount > 0 && (
                <button
                  type="button"
                  onClick={handleResetAll}
                  className="inline-flex items-center space-x-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-50 transition-colors"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Restore All</span>
                </button>
              )}
            </div>
          </div>

          {/* Progress Indicator */}
          {isRendering && (
            <DuckLoader
              progress={renderProgress}
              label="Rendering visual page previews..."
            />
          )}

          {/* Visual Thumbnail Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 max-h-[520px] overflow-y-auto p-1">
            {pages.map((p) => {
              const isMarkedForRemoval = removedIndices.has(p.pageIndex);
              return (
                <div
                  key={p.id}
                  onClick={() => handleToggleRemove(p.pageIndex)}
                  className={`group relative flex flex-col rounded-2xl border p-2.5 transition-all duration-150 cursor-pointer select-none ${
                    isMarkedForRemoval
                      ? 'border-red-400 bg-red-50/50 ring-2 ring-red-400/40 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md'
                  }`}
                >
                  {/* Top action indicator */}
                  <div className="absolute top-3 right-3 z-10">
                    {isMarkedForRemoval ? (
                      <div className="rounded-full bg-red-600 text-white p-1 shadow-sm">
                        <Trash2 className="h-4 w-4" />
                      </div>
                    ) : (
                      <div className="rounded-full bg-white/90 text-slate-400 p-1 shadow-xs border border-slate-200 group-hover:text-red-500 group-hover:border-red-300 transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </div>
                    )}
                  </div>

                  {/* Thumbnail Image Box */}
                  <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-white shadow-xs flex items-center justify-center border border-slate-200/60">
                    {p.thumbnailUrl ? (
                      <img
                        src={p.thumbnailUrl}
                        alt={`Page ${p.pageNumber}`}
                        className={`max-h-full max-w-full object-contain pointer-events-none transition-all duration-150 ${
                          isMarkedForRemoval ? 'opacity-25 grayscale scale-95' : 'opacity-100'
                        }`}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center space-y-1 text-slate-300">
                        <FileText className="h-8 w-8" />
                        <span className="text-[10px] text-slate-400 font-semibold">Page {p.pageNumber}</span>
                      </div>
                    )}

                    {/* Removal Overlay */}
                    {isMarkedForRemoval && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-900/20 backdrop-blur-[0.5px]">
                        <span className="rounded-md bg-red-600 px-2 py-0.5 text-[11px] font-black uppercase tracking-wider text-white shadow-md">
                          Removed
                        </span>
                      </div>
                    )}

                    {/* Page Number Badge */}
                    <span className="absolute bottom-1.5 left-1.5 rounded-md bg-black/75 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-xs">
                      Page {p.pageNumber}
                    </span>
                  </div>

                  {/* Status label under card */}
                  <div className="mt-2 text-center">
                    {isMarkedForRemoval ? (
                      <span className="text-[11px] font-extrabold text-red-600">
                        ✕ Marked for Deletion
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold text-slate-500 group-hover:text-red-600 transition-colors">
                        Click to remove
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Processing Indicator */}
          {isProcessing && (
            <DuckLoader progress={50} label="Removing selected pages..." />
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="flex items-center space-x-2 text-xs font-medium text-red-600">
              <AlertCircle className="h-4 w-4" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Success Banner */}
          {savedFilePath && (
            <div className="flex items-center space-x-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-medium text-emerald-800">
              <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-600" />
              <div>
                <p className="font-bold">Pages removed successfully!</p>
                <p className="text-slate-600 truncate">{savedFilePath}</p>
              </div>
            </div>
          )}

          {/* Status Message */}
          {statusMessage && !savedFilePath && (
            <p className="text-xs text-slate-500 font-medium">{statusMessage}</p>
          )}

          {/* Bottom Action Button */}
          <div className="flex flex-col sm:flex-row items-center justify-between pt-4 border-t border-slate-100 gap-4">
            <p className="text-xs font-semibold text-slate-500">
              Remaining Document: <span className="text-emerald-700 font-bold">{keepCount}</span> pages.
            </p>

            <button
              onClick={handleApplyRemoval}
              disabled={isProcessing || removeCount === 0 || removeCount >= pageCount}
              className="flex items-center space-x-3 rounded-2xl bg-primary px-8 py-4 text-base font-bold text-white shadow-xl shadow-primary/25 hover:bg-primary-hover active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150"
            >
              <span>
                {removeCount === 0
                  ? 'Select pages to remove'
                  : `Remove ${removeCount} ${removeCount === 1 ? 'Page' : 'Pages'} & Save`}
              </span>
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

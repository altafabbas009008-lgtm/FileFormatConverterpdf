import React, { useState } from 'react';
import { 
  RotateCw, 
  RotateCcw, 
  Check, 
  AlertCircle, 
  ArrowRight, 
  FileText, 
  Undo2,
  CheckCircle2,
  Layers
} from 'lucide-react';
import { DropZone } from '@/components/common/DropZone';
import DuckLoader from '@/components/common/DuckLoader';
import { PdfLibService } from '@/services/pdf/pdfLibService';
import { PdfRenderService } from '@/services/pdf/pdfRenderService';
import { FsService } from '@/services/tauri/fsService';
import { DialogService } from '@/services/tauri/dialogService';
import { validatePdfBytes } from '@/utils/fileValidation';
import { generateSafeOutputFilename, formatBytes } from '@/utils/formatters';
import { PDFFileInfo, PDFPagePreview } from '@/types/pdf';
import { PDFDocument } from 'pdf-lib';

interface RotateToolProps {
  onBack?: () => void;
}

export const RotateTool: React.FC<RotateToolProps> = () => {
  const [file, setFile] = useState<PDFFileInfo | null>(null);
  const [pages, setPages] = useState<PDFPagePreview[]>([]);
  const [pageCount, setPageCount] = useState<number>(0);
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
        setErrorMessage('Cannot rotate password-protected PDF.');
        return;
      }

      // Read total pages immediately using pdf-lib
      const doc = await PDFDocument.load(uint8.slice());
      const count = doc.getPageCount();
      setPageCount(count);

      // Create instant placeholders so UI renders immediately
      const initialPages: PDFPagePreview[] = [];
      for (let i = 1; i <= count; i++) {
        initialPages.push({
          id: `rotate-page-${i}`,
          pageIndex: i - 1,
          pageNumber: i,
          rotation: 0,
          isSelected: false,
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

      // Progressively render high-fidelity thumbnails in background
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

  // Toggle selection of a single page
  const handleToggleSelect = (pageIndex: number) => {
    setPages((prev) =>
      prev.map((p) =>
        p.pageIndex === pageIndex ? { ...p, isSelected: !p.isSelected } : p
      )
    );
  };

  // Rotate a single page by delta (-90 or +90)
  const handleRotatePage = (pageIndex: number, delta: number) => {
    setPages((prev) =>
      prev.map((p) => {
        if (p.pageIndex === pageIndex) {
          const nextRotation = (p.rotation + delta + 360) % 360;
          return { ...p, rotation: nextRotation };
        }
        return p;
      })
    );
  };

  // Rotate selected pages (or all pages if none selected)
  const handleBatchRotate = (delta: number) => {
    const hasSelection = pages.some((p) => p.isSelected);
    setPages((prev) =>
      prev.map((p) => {
        if (hasSelection) {
          if (p.isSelected) {
            return { ...p, rotation: (p.rotation + delta + 360) % 360 };
          }
          return p;
        } else {
          // If no specific selection, rotate all pages
          return { ...p, rotation: (p.rotation + delta + 360) % 360 };
        }
      })
    );
  };

  // Reset rotation for selected (or all) pages back to 0°
  const handleResetRotation = () => {
    const hasSelection = pages.some((p) => p.isSelected);
    setPages((prev) =>
      prev.map((p) => {
        if (hasSelection) {
          return p.isSelected ? { ...p, rotation: 0 } : p;
        }
        return { ...p, rotation: 0 };
      })
    );
  };

  // Selection presets
  const handleSelectAll = () => {
    setPages((prev) => prev.map((p) => ({ ...p, isSelected: true })));
  };

  const handleClearSelection = () => {
    setPages((prev) => prev.map((p) => ({ ...p, isSelected: false })));
  };

  const handleInvertSelection = () => {
    setPages((prev) => prev.map((p) => ({ ...p, isSelected: !p.isSelected })));
  };

  const handleSelectOdds = () => {
    setPages((prev) =>
      prev.map((p) => ({ ...p, isSelected: p.pageIndex % 2 === 0 }))
    );
  };

  const handleSelectEvens = () => {
    setPages((prev) =>
      prev.map((p) => ({ ...p, isSelected: p.pageIndex % 2 === 1 }))
    );
  };

  const handleApplyRotation = async () => {
    if (!file) return;

    // Build map of relative rotation angles
    const rotationMap: Record<number, number> = {};
    pages.forEach((p) => {
      if (p.rotation !== 0) {
        rotationMap[p.pageIndex] = p.rotation;
      }
    });

    const rotatedCount = Object.keys(rotationMap).length;
    if (rotatedCount === 0) {
      setErrorMessage(
        'No pages have been rotated. Please rotate individual pages or use the rotation buttons before saving.'
      );
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setStatusMessage(`Applying rotation to ${rotatedCount} pages...`);

    try {
      const rotatedBytes = await PdfLibService.rotatePages(file.data, rotationMap);
      const defaultFilename = generateSafeOutputFilename(
        file.name,
        `rotated_${rotatedCount}_pages`
      );

      const targetPath = await DialogService.selectSaveLocation(defaultFilename);
      if (targetPath) {
        const savedPath = await FsService.saveFileSafe(targetPath, rotatedBytes);
        setStatusMessage('Rotated PDF saved successfully!');
        setSavedFilePath(savedPath);
      } else {
        setStatusMessage('Rotation cancelled by user.');
      }
    } catch (err) {
      setErrorMessage(`Rotation failed: ${String(err)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const selectedCount = pages.filter((p) => p.isSelected).length;
  const rotatedCount = pages.filter((p) => p.rotation !== 0).length;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      {/* Tool Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
          Rotate PDF files
        </h1>
        <p className="text-sm text-slate-500 max-w-xl mx-auto">
          Visually preview and rotate individual pages or the entire document in 90-degree steps.
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
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-100 text-purple-700 flex-shrink-0">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">{file.name}</h3>
                <p className="text-xs text-slate-400">
                  {pageCount} Pages • {formatBytes(file.size)} •{' '}
                  <span className="font-semibold text-purple-700">
                    {rotatedCount} rotated
                  </span>
                  {selectedCount > 0 && (
                    <span className="text-slate-500"> • {selectedCount} selected</span>
                  )}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setFile(null);
                setPages([]);
              }}
              className="text-xs font-bold text-purple-700 hover:underline"
            >
              Choose another file
            </button>
          </div>

          {/* Interactive Toolbar: Selection & Rotation Controls */}
          <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200/80 space-y-3">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
              {/* Left: Quick Selection Presets */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600 mr-1 flex items-center gap-1">
                  <Layers className="h-3.5 w-3.5 text-purple-600" />
                  Select:
                </span>
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={handleClearSelection}
                  disabled={selectedCount === 0}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40 transition-colors"
                >
                  None
                </button>
                <button
                  type="button"
                  onClick={handleInvertSelection}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  Invert
                </button>
                <button
                  type="button"
                  onClick={handleSelectOdds}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  Odd Pages
                </button>
                <button
                  type="button"
                  onClick={handleSelectEvens}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  Even Pages
                </button>
              </div>

              {/* Right: Rotation Batch Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleBatchRotate(-90)}
                  className="flex items-center space-x-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:border-purple-300 hover:text-purple-700 hover:bg-purple-50/50 shadow-2xs transition-all"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>
                    {selectedCount > 0 ? 'Rotate Selected Left 90°' : 'Rotate All Left 90°'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleBatchRotate(90)}
                  className="flex items-center space-x-1.5 rounded-xl border border-purple-200 bg-purple-50/60 px-3 py-1.5 text-xs font-bold text-purple-700 hover:bg-purple-100 shadow-2xs transition-all"
                >
                  <RotateCw className="h-3.5 w-3.5" />
                  <span>
                    {selectedCount > 0 ? 'Rotate Selected Right 90°' : 'Rotate All Right 90°'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleBatchRotate(180)}
                  className="flex items-center space-x-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:border-purple-300 hover:text-purple-700 hover:bg-purple-50/50 shadow-2xs transition-all"
                >
                  <RotateCw className="h-3.5 w-3.5" />
                  <span>180° Flip</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetRotation}
                  disabled={rotatedCount === 0}
                  className="flex items-center space-x-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50/50 disabled:opacity-40 transition-all"
                  title="Reset rotation to 0°"
                >
                  <Undo2 className="h-3.5 w-3.5" />
                  <span>Reset</span>
                </button>
              </div>
            </div>

            {/* Helper status text */}
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
              <span>
                {selectedCount > 0
                  ? `Targeting ${selectedCount} selected page${selectedCount > 1 ? 's' : ''}`
                  : 'Click thumbnails or checkboxes to target specific pages, or rotate directly on each card.'}
              </span>
              <span className="font-semibold text-purple-700">
                {rotatedCount} of {pageCount} pages modified
              </span>
            </div>
          </div>

          {/* Progressive Rendering Progress */}
          {isRendering && (
            <DuckLoader
              progress={renderProgress}
              label={`Generating high-fidelity page previews (${renderProgress}%)...`}
            />
          )}

          {/* Interactive Visual Thumbnail Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {pages.map((p) => {
              const hasRotation = p.rotation !== 0;
              return (
                <div
                  key={p.id}
                  onClick={() => handleToggleSelect(p.pageIndex)}
                  className={`group relative flex flex-col rounded-2xl border p-2.5 transition-all duration-150 cursor-pointer select-none ${
                    p.isSelected
                      ? 'border-purple-600 bg-purple-50/30 ring-2 ring-purple-600/30 shadow-sm'
                      : hasRotation
                      ? 'border-purple-300 bg-purple-50/15 hover:border-purple-400 hover:shadow-md'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md'
                  }`}
                >
                  {/* Top Bar on Card: Checkbox & Rotation Badge */}
                  <div className="flex items-center justify-between mb-1.5 px-0.5">
                    {/* Selection Checkbox */}
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleSelect(p.pageIndex);
                      }}
                      className={`flex h-5 w-5 items-center justify-center rounded-md border transition-colors ${
                        p.isSelected
                          ? 'border-purple-600 bg-purple-600 text-white'
                          : 'border-slate-300 bg-white text-transparent group-hover:border-purple-400'
                      }`}
                      title={p.isSelected ? 'Deselect page' : 'Select page'}
                    >
                      <Check className="h-3 w-3 stroke-[3]" />
                    </div>

                    {/* Rotation Badge */}
                    {hasRotation ? (
                      <span className="flex items-center space-x-0.5 rounded-md bg-purple-600 px-1.5 py-0.5 text-[10px] font-black text-white shadow-2xs">
                        <RotateCw className="h-2.5 w-2.5" />
                        <span>+{p.rotation}°</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium text-slate-400">
                        0°
                      </span>
                    )}
                  </div>

                  {/* Thumbnail Image Box with Visual CSS Rotation */}
                  <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-slate-50 flex items-center justify-center border border-slate-200/60">
                    {p.thumbnailUrl ? (
                      <img
                        src={p.thumbnailUrl}
                        alt={`Page ${p.pageNumber}`}
                        style={{
                          transform: `rotate(${p.rotation}deg) ${
                            p.rotation % 180 !== 0 ? 'scale(0.72)' : 'scale(1)'
                          }`,
                        }}
                        className="max-h-full max-w-full object-contain pointer-events-none transition-transform duration-200 ease-out origin-center"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center space-y-1 text-slate-300">
                        <FileText className="h-8 w-8" />
                        <span className="text-[10px] text-slate-400 font-semibold">
                          Page {p.pageNumber}
                        </span>
                      </div>
                    )}

                    {/* Page Number Badge */}
                    <span className="absolute bottom-1.5 left-1.5 rounded-md bg-black/75 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-xs">
                      Page {p.pageNumber}
                    </span>
                  </div>

                  {/* Card Bottom: Individual Page Direct Rotate Buttons */}
                  <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRotatePage(p.pageIndex, -90);
                      }}
                      title="Rotate this page left 90°"
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-purple-100 hover:text-purple-700 transition-colors"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>

                    <span className="text-[10px] font-semibold text-slate-500">
                      {hasRotation ? `${p.rotation}°` : 'Original'}
                    </span>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRotatePage(p.pageIndex, 90);
                      }}
                      title="Rotate this page right 90°"
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-purple-100 hover:text-purple-700 transition-colors"
                    >
                      <RotateCw className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Processing Indicator */}
          {isProcessing && (
            <DuckLoader progress={50} label="Applying page rotations and saving..." />
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="flex items-center space-x-2 text-xs font-medium text-red-600 bg-red-50 p-3 rounded-xl border border-red-200">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Status Message */}
          {statusMessage && !savedFilePath && (
            <p className="text-xs text-slate-500 font-medium">{statusMessage}</p>
          )}

          {/* Success Box */}
          {savedFilePath && (
            <div className="flex items-center space-x-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-medium text-emerald-800">
              <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-600" />
              <div>
                <p className="font-bold">Rotated PDF saved successfully!</p>
                <p className="text-slate-600 truncate">{savedFilePath}</p>
              </div>
            </div>
          )}

          {/* Footer Action Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between pt-4 border-t border-slate-100 gap-4">
            <div className="text-xs text-slate-500">
              {rotatedCount > 0 ? (
                <span>
                  Ready to apply rotation to{' '}
                  <strong className="text-slate-900">{rotatedCount} page{rotatedCount > 1 ? 's' : ''}</strong>.
                </span>
              ) : (
                <span>No rotations applied yet.</span>
              )}
            </div>

            <button
              onClick={handleApplyRotation}
              disabled={isProcessing || rotatedCount === 0}
              className="w-full sm:w-auto flex items-center justify-center space-x-3 rounded-2xl bg-purple-700 px-8 py-4 text-base font-bold text-white shadow-xl shadow-purple-700/25 hover:bg-purple-800 active:scale-95 disabled:opacity-40 transition-all duration-150"
            >
              <span>Rotate PDF</span>
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

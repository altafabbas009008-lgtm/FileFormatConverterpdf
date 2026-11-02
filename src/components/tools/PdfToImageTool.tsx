import React, { useState } from 'react';
import { 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  FileText, 
  ImageIcon, 
  Check, 
  Archive
} from 'lucide-react';
import { DropZone } from '@/components/common/DropZone';
import DuckLoader from '@/components/common/DuckLoader';
import { PdfRenderService } from '@/services/pdf/pdfRenderService';
import { FsService } from '@/services/tauri/fsService';
import { DialogService } from '@/services/tauri/dialogService';
import { validatePdfBytes } from '@/utils/fileValidation';
import { formatBytes, generateSafeOutputFilename } from '@/utils/formatters';
import { ZipWriter } from '@/utils/zipWriter';
import { PDFFileInfo, PDFPagePreview } from '@/types/pdf';

interface PdfToImageToolProps {
  onBack?: () => void;
}

export const PdfToImageTool: React.FC<PdfToImageToolProps> = () => {
  const [file, setFile] = useState<PDFFileInfo | null>(null);
  const [pages, setPages] = useState<PDFPagePreview[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [format, setFormat] = useState<'image/jpeg' | 'image/png'>('image/jpeg');
  const [dpiScale, setDpiScale] = useState<number>(2.0); // 2.0 = ~150 DPI
  const [packageAsZip, setPackageAsZip] = useState<boolean>(true);
  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [renderProgress, setRenderProgress] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
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
        setErrorMessage('Cannot extract images from password-protected PDF.');
        return;
      }

      const pdfDoc = await PdfRenderService.loadDocument(uint8.slice());
      const totalPages = pdfDoc.numPages;

      // Select all pages by default
      const allIndices = Array.from({ length: totalPages }, (_, i) => i);
      setSelectedIndices(new Set(allIndices));

      const initialPages: PDFPagePreview[] = [];
      for (let i = 1; i <= totalPages; i++) {
        initialPages.push({
          id: `page-${i}`,
          pageIndex: i - 1,
          pageNumber: i,
          rotation: 0,
          isSelected: true,
        });
      }
      setPages(initialPages);

      setFile({
        id: f.name,
        name: f.name,
        size: f.size,
        data: uint8.slice(),
        pageCount: totalPages,
        status: 'ready',
      });

      // Render thumbnail previews progressively
      setIsRendering(true);
      try {
        for (let i = 1; i <= totalPages; i++) {
          const thumbUrl = await PdfRenderService.renderThumbnail(pdfDoc, i, 160);
          setPages((prev) =>
            prev.map((p) => (p.pageNumber === i ? { ...p, thumbnailUrl: thumbUrl } : p))
          );
          setRenderProgress(Math.round((i / totalPages) * 100));
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

  const handleTogglePage = (pageIndex: number) => {
    const next = new Set(selectedIndices);
    if (next.has(pageIndex)) {
      next.delete(pageIndex);
    } else {
      next.add(pageIndex);
    }
    setSelectedIndices(next);
  };

  const handleSelectAll = () => {
    if (!file) return;
    const all = Array.from({ length: file.pageCount }, (_, i) => i);
    setSelectedIndices(new Set(all));
  };

  const handleClearSelection = () => {
    setSelectedIndices(new Set());
  };

  const handleExportImages = async () => {
    if (!file) return;

    const indices = Array.from(selectedIndices).sort((a, b) => a - b);
    if (indices.length === 0) {
      setErrorMessage('Please select at least one page to convert.');
      return;
    }

    setIsProcessing(true);
    setProgress(5);
    setErrorMessage(null);
    setStatusMessage(`Converting ${indices.length} pages to ${format === 'image/png' ? 'PNG' : 'JPG'}...`);

    try {
      const pdfDoc = await PdfRenderService.loadDocument(file.data);
      const ext = format === 'image/png' ? 'png' : 'jpg';
      const baseName = file.name.replace(/\.[^/.]+$/, '');

      if (packageAsZip) {
        // --- ZIP ARCHIVE EXPORT ---
        const zipWriter = new ZipWriter();

        for (let idx = 0; idx < indices.length; idx++) {
          const pageNum = indices[idx] + 1;
          const imageBlob = await PdfRenderService.exportPageToImage(
            pdfDoc,
            pageNum,
            format,
            dpiScale
          );
          const imageBytes = new Uint8Array(await imageBlob.arrayBuffer());
          const imageName = `${baseName}_page_${pageNum}.${ext}`;
          zipWriter.addFile(imageName, imageBytes);

          const currentPct = Math.round(((idx + 1) / indices.length) * 85);
          setProgress(currentPct);
          setStatusMessage(`Converted page ${pageNum} (${idx + 1} of ${indices.length})...`);
        }

        setStatusMessage('Packaging into ZIP archive...');
        setProgress(95);
        const zipData = zipWriter.generateZip();

        const defaultZipName = generateSafeOutputFilename(file.name, `${ext}_images`, 'zip');
        const targetPath = await DialogService.selectSaveLocation(defaultZipName, 'zip');

        if (targetPath) {
          const savedPath = await FsService.saveFileSafe(targetPath, zipData);
          setProgress(100);
          setStatusMessage(`Successfully converted and archived ${indices.length} pages!`);
          setSavedFilePath(savedPath);
        } else {
          setStatusMessage('Export cancelled by user.');
        }
      } else {
        // --- INDIVIDUAL FILE EXPORTS ---
        for (let idx = 0; idx < indices.length; idx++) {
          const pageNum = indices[idx] + 1;
          const imageBlob = await PdfRenderService.exportPageToImage(
            pdfDoc,
            pageNum,
            format,
            dpiScale
          );
          const imageBytes = new Uint8Array(await imageBlob.arrayBuffer());
          const imageName = `${baseName}_page_${pageNum}.${ext}`;

          const targetPath = await DialogService.selectSaveLocation(imageName, ext);
          if (targetPath) {
            await FsService.saveFileSafe(targetPath, imageBytes);
          }
          setProgress(Math.round(((idx + 1) / indices.length) * 100));
        }

        setStatusMessage(`Successfully exported ${indices.length} images.`);
        setSavedFilePath('Saved to specified destinations');
      }
    } catch (err) {
      setErrorMessage(`Export failed: ${String(err)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const selectedCount = selectedIndices.size;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      {/* Tool Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
          PDF to JPG / PNG
        </h1>
        <p className="text-sm text-slate-500 max-w-xl mx-auto">
          Convert all or selected pages into crisp, high-resolution image files completely offline.
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
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 flex-shrink-0">
                <ImageIcon className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">{file.name}</h3>
                <p className="text-xs text-slate-400">
                  {file.pageCount} Pages • {formatBytes(file.size)} •{' '}
                  <span className="font-semibold text-amber-600">
                    {selectedCount} of {file.pageCount} pages selected
                  </span>
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setFile(null);
                setPages([]);
              }}
              className="text-xs font-bold text-amber-600 hover:underline"
            >
              Choose another file
            </button>
          </div>

          {/* Conversion Options Toolbar */}
          <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Format Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Image Format
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormat('image/jpeg')}
                    className={`rounded-xl border py-2 text-xs font-bold transition-all ${
                      format === 'image/jpeg'
                        ? 'border-amber-500 bg-amber-500 text-white shadow-xs'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    JPG (Smaller)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormat('image/png')}
                    className={`rounded-xl border py-2 text-xs font-bold transition-all ${
                      format === 'image/png'
                        ? 'border-amber-500 bg-amber-500 text-white shadow-xs'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    PNG (Lossless)
                  </button>
                </div>
              </div>

              {/* Resolution / DPI */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Resolution / DPI
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { label: 'Normal (72 DPI)', scale: 1.0 },
                    { label: 'High (150 DPI)', scale: 2.0 },
                    { label: 'Print (300 DPI)', scale: 4.0 },
                  ].map((item) => (
                    <button
                      key={item.scale}
                      type="button"
                      onClick={() => setDpiScale(item.scale)}
                      className={`rounded-xl border py-2 text-[11px] font-bold transition-all ${
                        dpiScale === item.scale
                          ? 'border-amber-500 bg-amber-50 text-amber-700 ring-1 ring-amber-500'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Packaging Option */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Export Packaging
                </label>
                <button
                  type="button"
                  onClick={() => setPackageAsZip(!packageAsZip)}
                  className={`w-full flex items-center justify-between rounded-xl border p-2 text-xs font-bold transition-all ${
                    packageAsZip
                      ? 'border-amber-500 bg-amber-50/50 text-amber-900 ring-1 ring-amber-500/50'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Archive className="h-4 w-4 text-amber-600" />
                    Package in Single .ZIP Archive
                  </span>
                  <div
                    className={`h-4 w-4 rounded-md border flex items-center justify-center ${
                      packageAsZip ? 'bg-amber-500 border-amber-500 text-white' : 'border-slate-300'
                    }`}
                  >
                    {packageAsZip && <Check className="h-3 w-3 stroke-[3]" />}
                  </div>
                </button>
              </div>
            </div>

            {/* Quick Selection Bar */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-600">Select:</span>
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="rounded-md bg-white border border-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
                >
                  All Pages
                </button>
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="rounded-md bg-white border border-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
                >
                  Clear Selection
                </button>
              </div>
              <span className="font-medium text-slate-500">
                Click any thumbnail to include or exclude it from the export.
              </span>
            </div>
          </div>

          {/* Rendering Progress */}
          {isRendering && (
            <DuckLoader
              progress={renderProgress}
              label={`Generating page previews (${renderProgress}%)...`}
            />
          )}

          {/* Visual Page Thumbnail Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5">
            {pages.map((p) => {
              const isSelected = selectedIndices.has(p.pageIndex);
              return (
                <div
                  key={p.id}
                  onClick={() => handleTogglePage(p.pageIndex)}
                  className={`group relative flex flex-col rounded-2xl border p-2.5 transition-all duration-150 cursor-pointer select-none ${
                    isSelected
                      ? 'border-amber-500 bg-amber-50/20 ring-2 ring-amber-500/30 shadow-xs'
                      : 'border-slate-200 bg-white opacity-50 hover:opacity-80 hover:border-slate-300'
                  }`}
                >
                  {/* Selection Indicator Badge */}
                  <div className="absolute top-3 right-3 z-10">
                    <div
                      className={`flex h-5 w-5 items-center justify-center rounded-md border transition-colors ${
                        isSelected
                          ? 'border-amber-500 bg-amber-500 text-white'
                          : 'border-slate-300 bg-white/90 text-transparent'
                      }`}
                    >
                      <Check className="h-3 w-3 stroke-[3]" />
                    </div>
                  </div>

                  {/* Thumbnail Image Box */}
                  <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-slate-50 flex items-center justify-center border border-slate-200/60">
                    {p.thumbnailUrl ? (
                      <img
                        src={p.thumbnailUrl}
                        alt={`Page ${p.pageNumber}`}
                        className="max-h-full max-w-full object-contain pointer-events-none"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center space-y-1 text-slate-300">
                        <FileText className="h-8 w-8" />
                        <span className="text-[10px] text-slate-400 font-semibold">
                          Page {p.pageNumber}
                        </span>
                      </div>
                    )}

                    <span className="absolute bottom-1.5 left-1.5 rounded-md bg-black/75 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-xs">
                      Page {p.pageNumber}
                    </span>
                  </div>

                  <div className="mt-2 text-center text-[11px] font-semibold">
                    {isSelected ? (
                      <span className="text-amber-600">Export Page</span>
                    ) : (
                      <span className="text-slate-400">Skip</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Processing Progress */}
          {isProcessing && (
            <DuckLoader
              progress={progress}
              label={statusMessage || 'Converting pages to images...'}
            />
          )}

          {/* Error Alert */}
          {errorMessage && (
            <div className="flex items-center space-x-2 text-xs font-medium text-red-600 bg-red-50 p-3 rounded-xl border border-red-200">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Success Alert */}
          {savedFilePath && (
            <div className="flex items-center space-x-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-medium text-emerald-800">
              <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-600" />
              <div>
                <p className="font-bold">Images exported successfully!</p>
                <p className="text-slate-600 truncate">{savedFilePath}</p>
              </div>
            </div>
          )}

          {/* Bottom Action Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between pt-4 border-t border-slate-100 gap-4">
            <div className="text-xs text-slate-500">
              {selectedCount > 0 ? (
                <span>
                  Converting <strong className="text-slate-900">{selectedCount}</strong> page
                  {selectedCount > 1 ? 's' : ''} to{' '}
                  <strong className="text-slate-900">{format === 'image/png' ? 'PNG' : 'JPG'}</strong>{' '}
                  {packageAsZip && '(packaged in .ZIP)'}.
                </span>
              ) : (
                <span>No pages selected.</span>
              )}
            </div>

            <button
              onClick={handleExportImages}
              disabled={isProcessing || selectedCount === 0}
              className="w-full sm:w-auto flex items-center justify-center space-x-3 rounded-2xl bg-amber-500 px-8 py-4 text-base font-bold text-white shadow-xl shadow-amber-500/25 hover:bg-amber-600 active:scale-95 disabled:opacity-40 transition-all duration-150"
            >
              <span>Convert to {format === 'image/png' ? 'PNG' : 'JPG'}</span>
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

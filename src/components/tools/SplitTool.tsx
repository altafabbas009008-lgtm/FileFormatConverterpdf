import React, { useState } from 'react';
import {
  CheckCircle2,
  Circle,
  AlertCircle,
  ArrowRight,
  FileText,
  Layers,
} from 'lucide-react';

import { DropZone } from '@/components/common/DropZone';
import DuckLoader from '@/components/common/DuckLoader';
import { PdfLibService } from '@/services/pdf/pdfLibService';
import { PdfRenderService } from '@/services/pdf/pdfRenderService';
import { FsService } from '@/services/tauri/fsService';
import { DialogService } from '@/services/tauri/dialogService';
import { validatePdfBytes } from '@/utils/fileValidation';

import {
  formatBytes,
  parsePageRanges,
  formatPageIndicesToRanges,
  generateSafeOutputFilename,
} from '@/utils/formatters';

import { PDFFileInfo, PDFPagePreview } from '@/types/pdf';
import { PDFDocument } from 'pdf-lib';

interface SplitToolProps {
  onBack?: () => void;
}

export const SplitTool: React.FC<SplitToolProps> = ({ onBack }) => {
  const [file, setFile] = useState<PDFFileInfo | null>(null);
  const [pageRange, setPageRange] = useState('1');
  const [pageCount, setPageCount] = useState(1);
  const [pages, setPages] = useState<PDFPagePreview[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(
    new Set([0])
  );
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

    const selectedFile = fileList[0];

    try {
      const buffer = await selectedFile.arrayBuffer();
      const uint8 = new Uint8Array(buffer);

      const validation = validatePdfBytes(uint8);

      if (!validation.isValid) {
        setErrorMessage(validation.error || 'Invalid PDF file.');
        return;
      }

      if (validation.isEncrypted) {
        setErrorMessage(
          'Cannot split a password-protected PDF.'
        );
        return;
      }

      const doc = await PDFDocument.load(uint8.slice());
      const count = doc.getPageCount();

      if (count === 0) {
        setErrorMessage('The PDF contains no pages.');
        return;
      }

      setPageCount(count);

      const defaultSelected = Array.from(
        { length: Math.min(count, 3) },
        (_, index) => index
      );

      setSelectedIndices(new Set(defaultSelected));
      setPageRange(formatPageIndicesToRanges(defaultSelected));

      const initialPages: PDFPagePreview[] = [];

      for (let i = 1; i <= count; i++) {
        initialPages.push({
          id: `page-${i}`,
          pageIndex: i - 1,
          pageNumber: i,
          rotation: 0,
          isSelected: defaultSelected.includes(i - 1),
        });
      }

      setPages(initialPages);

      setFile({
        id: selectedFile.name,
        name: selectedFile.name,
        size: selectedFile.size,
        data: uint8.slice(),
        pageCount: count,
        status: 'ready',
      });

      setIsRendering(true);
      setRenderProgress(0);

      try {
        const pdfDoc = await PdfRenderService.loadDocument(uint8.slice());

        for (let i = 1; i <= count; i++) {
          const thumbnailUrl = await PdfRenderService.renderThumbnail(
            pdfDoc,
            i,
            180
          );

          setPages((previousPages) =>
            previousPages.map((page) =>
              page.pageNumber === i
                ? { ...page, thumbnailUrl }
                : page
            )
          );

          setRenderProgress(Math.round((i / count) * 100));
        }
      } catch (renderError) {
        console.warn('Thumbnail rendering notice:', renderError);
      } finally {
        setIsRendering(false);
      }
    } catch (error) {
      setErrorMessage(`Failed to read PDF: ${String(error)}`);
    }
  };

  const handleTogglePage = (pageIndex: number) => {
    const next = new Set(selectedIndices);

    if (next.has(pageIndex)) {
      next.delete(pageIndex);
    } else {
      next.add(pageIndex);
    }

    const sorted = Array.from(next).sort((a, b) => a - b);

    setSelectedIndices(next);
    setPageRange(formatPageIndicesToRanges(sorted));
    setErrorMessage(null);
  };

  const handleRangeInputChange = (value: string) => {
    setPageRange(value);

    const parsed = parsePageRanges(value, pageCount);

    setSelectedIndices(new Set(parsed));
    setErrorMessage(null);
  };

  const handleSelectAll = () => {
    const allPages = Array.from(
      { length: pageCount },
      (_, index) => index
    );

    setSelectedIndices(new Set(allPages));
    setPageRange(formatPageIndicesToRanges(allPages));
    setErrorMessage(null);
  };

  const handleDeselectAll = () => {
    setSelectedIndices(new Set());
    setPageRange('');
    setErrorMessage(null);
  };

  const handleInvertSelection = () => {
    const inverted: number[] = [];

    for (let i = 0; i < pageCount; i++) {
      if (!selectedIndices.has(i)) {
        inverted.push(i);
      }
    }

    setSelectedIndices(new Set(inverted));
    setPageRange(formatPageIndicesToRanges(inverted));
    setErrorMessage(null);
  };

  const handleSelectOdds = () => {
    const oddPages = Array.from(
      { length: pageCount },
      (_, index) => index
    ).filter((index) => index % 2 === 0);

    setSelectedIndices(new Set(oddPages));
    setPageRange(formatPageIndicesToRanges(oddPages));
    setErrorMessage(null);
  };

  const handleSelectEvens = () => {
    const evenPages = Array.from(
      { length: pageCount },
      (_, index) => index
    ).filter((index) => index % 2 === 1);

    setSelectedIndices(new Set(evenPages));
    setPageRange(formatPageIndicesToRanges(evenPages));
    setErrorMessage(null);
  };

  // Split selected pages into separate one-page PDF files.
  const handleExtract = async () => {
    if (!file) return;

    const indices = Array.from(selectedIndices).sort(
      (a, b) => a - b
    );

    if (indices.length === 0) {
      setErrorMessage('Please select at least one page.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setStatusMessage('Preparing separate PDF files...');
    setSavedFilePath(null);

    let savedCount = 0;

    try {
      const splitFiles = await PdfLibService.splitIntoSinglePages(
        file.data
      );

      for (const pageIndex of indices) {
        const pageBytes = splitFiles[pageIndex];

        if (!pageBytes) {
          throw new Error(
            `Could not create PDF for page ${pageIndex + 1}.`
          );
        }

        const defaultFilename = generateSafeOutputFilename(
          file.name,
          `page_${pageIndex + 1}`
        );

        const targetPath =
          await DialogService.selectSaveLocation(defaultFilename);

        if (!targetPath) {
          setStatusMessage(
            `Saving cancelled. ${savedCount} PDF file(s) saved.`
          );
          return;
        }

        const savedPath = await FsService.saveFileSafe(
          targetPath,
          pageBytes
        );

        savedCount++;
        setSavedFilePath(savedPath);
        setStatusMessage(
          `${savedCount} of ${indices.length} PDF file(s) saved.`
        );
      }

      setStatusMessage(
        `Split complete! ${savedCount} separate PDF file(s) saved.`
      );
    } catch (error) {
      setErrorMessage(`Split failed: ${String(error)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const selectedCount = selectedIndices.size;

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-16">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
          Split PDF File
        </h1>
        <p className="mx-auto max-w-xl text-sm text-slate-500">
          Select the pages you want to save as separate PDF files.
        </p>

        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="text-sm font-semibold text-primary hover:underline"
          >
            Back to tools
          </button>
        )}
      </div>

      {!file ? (
        <DropZone
          multiple={false}
          onFilesDropped={handleFilesAdded}
          buttonLabel="Select PDF file"
          description="or drop PDF here"
        />
      ) : (
        <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-col items-start justify-between gap-3 border-b border-slate-100 pb-5 sm:flex-row sm:items-center">
            <div className="flex items-center space-x-3.5">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-coral/10 text-coral">
                <FileText className="h-6 w-6" />
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {file.name}
                </h3>
                <p className="text-xs text-slate-400">
                  {pageCount} Pages • {formatBytes(file.size)} •{' '}
                  <span className="font-semibold text-primary">
                    {selectedCount} of {pageCount} selected
                  </span>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setFile(null);
                setPages([]);
                setPageCount(1);
                setPageRange('1');
                setSelectedIndices(new Set([0]));
                setStatusMessage(null);
                setErrorMessage(null);
                setSavedFilePath(null);
                setRenderProgress(0);
              }}
              className="text-xs font-bold text-primary hover:underline"
            >
              Choose another file
            </button>
          </div>

          <div className="space-y-3 rounded-2xl border border-slate-200/80 bg-slate-50 p-4">
            <div className="flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
              <div className="flex items-center space-x-2">
                <Layers className="h-4 w-4 text-primary" />
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Select pages
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { label: 'Select All', action: handleSelectAll },
                  { label: 'Clear All', action: handleDeselectAll },
                  { label: 'Invert', action: handleInvertSelection },
                  { label: 'Odd Pages', action: handleSelectOdds },
                  { label: 'Even Pages', action: handleSelectEvens },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={item.action}
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <input
              type="text"
              value={pageRange}
              onChange={(event) =>
                handleRangeInputChange(event.target.value)
              }
              placeholder="e.g. 1-3, 5, 8-10"
              aria-label="Page numbers to split"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />

            <p className="text-[11px] text-slate-400">
              Tip: Click thumbnails to select pages, or enter page ranges above.
            </p>
          </div>

          {isRendering && (
  <DuckLoader
    progress={renderProgress}
    label="Generating page thumbnails..."
  />
)}

          <div className="grid max-h-[520px] grid-cols-2 gap-4 overflow-y-auto p-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {pages.map((page) => {
              const isSelected = selectedIndices.has(page.pageIndex);

              return (
                <button
                  key={page.id}
                  type="button"
                  onClick={() => handleTogglePage(page.pageIndex)}
                  aria-pressed={isSelected}
                  className={`group relative flex cursor-pointer flex-col rounded-2xl border p-2.5 text-left transition-all duration-150 ${
                    isSelected
                      ? 'border-primary bg-red-50/30 shadow-md ring-2 ring-primary/30'
                      : 'border-slate-200 bg-slate-50/60 opacity-70 hover:border-slate-300 hover:opacity-100'
                  }`}
                >
                  <div className="absolute right-3 top-3 z-10">
                    {isSelected ? (
                      <div className="rounded-full bg-primary p-0.5 text-white shadow-sm">
                        <CheckCircle2 className="h-5 w-5" />
                      </div>
                    ) : (
                      <div className="rounded-full border border-slate-300 bg-white/90 p-0.5 text-slate-400">
                        <Circle className="h-5 w-5" />
                      </div>
                    )}
                  </div>

                  <div className="relative flex aspect-[3/4] w-full items-center justify-center overflow-hidden rounded-xl border border-slate-200/60 bg-white shadow-xs">
                    {page.thumbnailUrl ? (
                      <img
                        src={page.thumbnailUrl}
                        alt={`Page ${page.pageNumber}`}
                        className="pointer-events-none max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center space-y-1 text-slate-300">
                        <FileText className="h-8 w-8" />
                        <span className="text-[10px] font-semibold text-slate-400">
                          Page {page.pageNumber}
                        </span>
                      </div>
                    )}

                    <span
                      className={`absolute bottom-1.5 left-1.5 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                        isSelected
                          ? 'bg-primary text-white'
                          : 'bg-black/70 text-white'
                      }`}
                    >
                      Page {page.pageNumber}
                    </span>
                  </div>

                  <div className="mt-2 text-center">
                    <span
                      className={`text-[11px] font-bold ${
                        isSelected ? 'text-primary' : 'text-slate-400'
                      }`}
                    >
                      {isSelected ? '✓ Selected' : 'Not selected'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {isProcessing && (
            <DuckLoader
  label="Splitting selected pages..."
/>
          )}

          {errorMessage && (
            <div className="flex items-center space-x-2 text-xs font-medium text-red-600">
              <AlertCircle className="h-4 w-4" />
              <span>{errorMessage}</span>
            </div>
          )}

          {savedFilePath && (
            <div className="flex items-center space-x-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-medium text-emerald-800">
              <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-600" />
              <div className="min-w-0">
                <p className="font-bold">PDF saved successfully</p>
                <p className="truncate text-slate-600">
                  Latest file: {savedFilePath}
                </p>
              </div>
            </div>
          )}

          {statusMessage && (
            <p className="text-xs font-medium text-slate-500">
              {statusMessage}
            </p>
          )}

          <div className="flex flex-col items-center justify-between gap-4 border-t border-slate-100 pt-4 sm:flex-row">
            <p className="text-xs font-semibold text-slate-500">
              Result: {selectedCount} separate PDF file(s).
            </p>

            <button
              type="button"
              onClick={handleExtract}
              disabled={isProcessing || selectedCount === 0}
              className="flex items-center space-x-3 rounded-2xl bg-primary px-8 py-4 text-base font-bold text-white shadow-xl shadow-primary/25 transition-all duration-150 hover:bg-primary-hover active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span>
                {isProcessing
                  ? 'Splitting...'
                  : `Split into ${selectedCount} ${
                      selectedCount === 1 ? 'PDF' : 'PDFs'
                    }`}
              </span>
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
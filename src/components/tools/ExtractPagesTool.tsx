
import React, { useState } from 'react';
import {
  FileText,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';

import { DropZone } from '@/components/common/DropZone';
import DuckLoader from '@/components/common/DuckLoader';
import { PdfRenderService } from '@/services/pdf/pdfRenderService';
import { PdfLibService } from '@/services/pdf/pdfLibService';
import { FsService } from '@/services/tauri/fsService';
import { DialogService } from '@/services/tauri/dialogService';
import { validatePdfBytes } from '@/utils/fileValidation';
import { generateSafeOutputFilename } from '@/utils/formatters';
import { PDFFileInfo } from '@/types/pdf';

interface ExtractPagesToolProps {
  onBack?: () => void;
}

export const ExtractPagesTool: React.FC<ExtractPagesToolProps> = () => {
  const [file, setFile] = useState<PDFFileInfo | null>(null);
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savedFilePath, setSavedFilePath] = useState<string | null>(null);

  const handleFilesAdded = async (fileList: File[]) => {
    const selectedFile = fileList[0];
    if (!selectedFile) return;

    setErrorMessage(null);
    setStatusMessage(null);
    setSavedFilePath(null);
    setSelectedPages([]);

    try {
      const bytes = new Uint8Array(await selectedFile.arrayBuffer());
      const validation = validatePdfBytes(bytes);

      if (!validation.isValid) {
        setErrorMessage(validation.error || 'Invalid PDF file.');
        return;
      }

      if (validation.isEncrypted) {
        setErrorMessage('This PDF is password protected. Please unlock it first.');
        return;
      }

      const pdf = await PdfRenderService.loadDocument(bytes);
      const pageCount = pdf.numPages;

      const pdfFile: PDFFileInfo = {
        id: `${selectedFile.name}-${Date.now()}`,
        name: selectedFile.name,
        size: selectedFile.size,
        data: bytes,
        pageCount,
        thumbnailUrl: await PdfRenderService.renderThumbnail(pdf, 1, 140),
        status: 'ready',
      };

      setFile(pdfFile);
      setSelectedPages(
        Array.from({ length: pageCount }, (_, index) => index + 1)
      );
    } catch (error) {
      setErrorMessage(`Could not load PDF: ${String(error)}`);
    }
  };

  const togglePage = (page: number) => {
    setSelectedPages((previous) =>
      previous.includes(page)
        ? previous.filter((item) => item !== page)
        : [...previous, page].sort((a, b) => a - b)
    );
    setSavedFilePath(null);
    setStatusMessage(null);
  };

  const handleExtract = async () => {
    if (!file) {
      setErrorMessage('Please select a PDF file first.');
      return;
    }

    if (selectedPages.length === 0) {
      setErrorMessage('Please select at least one page.');
      return;
    }

    setIsProcessing(true);
    setProgress(15);
    setErrorMessage(null);
    setStatusMessage('Extracting selected pages...');

    try {
      const extractedBytes = await PdfLibService.extractPages(
        file.data,
        selectedPages.map((page) => page - 1)
      );

      setProgress(75);

      const defaultFilename = generateSafeOutputFilename(
        file.name,
        'extracted'
      );

      const targetPath =
        await DialogService.selectSaveLocation(defaultFilename);

      if (targetPath) {
        const savedPath = await FsService.saveFileSafe(
          targetPath,
          extractedBytes
        );

        setProgress(100);
        setStatusMessage('Selected pages extracted successfully!');
        setSavedFilePath(savedPath);
      } else {
        setStatusMessage('Extraction cancelled by user.');
      }
    } catch (error) {
      setErrorMessage(`Extraction failed: ${String(error)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
          Extract PDF Pages
        </h1>
        <p className="text-sm text-slate-500 max-w-xl mx-auto">
          Select the pages you need and save them as a new PDF file.
        </p>
      </div>

      {!file ? (
        <DropZone
          onFilesDropped={handleFilesAdded}
          buttonLabel="Select PDF file"
          description="Choose a PDF to extract pages from"
        />
      ) : (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                {file.name}
              </h3>
              <p className="text-xs text-slate-500">
                {file.pageCount} pages · Select the pages to extract
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() =>
                  setSelectedPages(
                    Array.from(
                      { length: file.pageCount },
                      (_, index) => index + 1
                    )
                  )
                }
                disabled={isProcessing}
                className="rounded-xl border px-3 py-2 text-xs font-semibold hover:bg-slate-50 disabled:opacity-50"
              >
                Select all
              </button>

              <button
                onClick={() => setSelectedPages([])}
                disabled={isProcessing}
                className="rounded-xl border px-3 py-2 text-xs font-semibold hover:bg-slate-50 disabled:opacity-50"
              >
                Clear selection
              </button>

              <button
                onClick={() => {
                  setFile(null);
                  setSelectedPages([]);
                  setErrorMessage(null);
                  setStatusMessage(null);
                  setSavedFilePath(null);
                }}
                disabled={isProcessing}
                className="rounded-xl border px-3 py-2 text-xs font-semibold hover:bg-slate-50 disabled:opacity-50"
              >
                Change PDF
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: file.pageCount }, (_, index) => {
              const pageNumber = index + 1;
              const isSelected = selectedPages.includes(pageNumber);

              return (
                <button
                  key={pageNumber}
                  type="button"
                  onClick={() => togglePage(pageNumber)}
                  disabled={isProcessing}
                  aria-pressed={isSelected}
                  className={`relative rounded-2xl border p-3 text-left transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                      : 'border-slate-200 bg-slate-50 hover:bg-white'
                  }`}
                >
                  <div className="aspect-[3/4] rounded-xl bg-white border border-slate-200 flex flex-col items-center justify-center gap-2">
                    <FileText className="h-10 w-10 text-slate-400" />
                    <span className="text-xs font-semibold text-slate-500">
                      Page {pageNumber}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs font-bold text-slate-700">
                      Page {pageNumber}
                    </span>
                    <span
                      className={`h-5 w-5 rounded-full border flex items-center justify-center text-xs ${
                        isSelected
                          ? 'border-primary bg-primary text-white'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isSelected ? '✓' : ''}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <p className="text-xs font-semibold text-slate-500">
            {selectedPages.length} of {file.pageCount} pages selected.
          </p>

          {isProcessing && (
            <DuckLoader
              progress={progress}
              label="Extracting pages..."
            />
          )}

          {errorMessage && (
            <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-700">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {statusMessage && !savedFilePath && !isProcessing && (
            <p className="text-xs text-slate-500 font-medium">
              {statusMessage}
            </p>
          )}

          {savedFilePath && (
            <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-medium text-emerald-800">
              <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
              <div>
                <p className="font-bold">PDF saved successfully!</p>
                <p className="text-slate-600 break-all">{savedFilePath}</p>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-100 pt-6 gap-4">
            <button
              onClick={() => {
                setFile(null);
                setSelectedPages([]);
                setErrorMessage(null);
                setStatusMessage(null);
                setSavedFilePath(null);
              }}
              disabled={isProcessing}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              Remove PDF
            </button>

            <button
              onClick={handleExtract}
              disabled={selectedPages.length === 0 || isProcessing}
              className="flex items-center gap-3 rounded-2xl bg-primary px-8 py-4 text-base font-bold text-white shadow-xl shadow-primary/25 hover:bg-primary-hover active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <span>Extract selected pages</span>
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

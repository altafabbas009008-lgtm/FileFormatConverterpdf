import React, { useState } from 'react';
import { 
  FileText, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  CheckCircle2, 
  AlertCircle, 
  Plus,
  ArrowRight
} from 'lucide-react';
import { DropZone } from '@/components/common/DropZone';
import DuckLoader from '@/components/common/DuckLoader';
import { PdfRenderService } from '@/services/pdf/pdfRenderService';
import { PdfLibService } from '@/services/pdf/pdfLibService';
import { FsService } from '@/services/tauri/fsService';
import { DialogService } from '@/services/tauri/dialogService';
import { validatePdfBytes } from '@/utils/fileValidation';
import { formatBytes, generateSafeOutputFilename } from '@/utils/formatters';
import { PDFFileInfo } from '@/types/pdf';

interface MergeToolProps {
  onBack?: () => void;
}

export const MergeTool: React.FC<MergeToolProps> = () => {
  const [files, setFiles] = useState<PDFFileInfo[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savedFilePath, setSavedFilePath] = useState<string | null>(null);

  const handleFilesAdded = async (fileList: File[]) => {
    setErrorMessage(null);
    setStatusMessage(null);
    setSavedFilePath(null);

    const newFiles: PDFFileInfo[] = [];

    for (const file of fileList) {
      try {
        const buffer = await file.arrayBuffer();
        const uint8 = new Uint8Array(buffer);

        const validation = validatePdfBytes(uint8);
        if (!validation.isValid) {
          setErrorMessage(`"${file.name}": ${validation.error}`);
          continue;
        }

        if (validation.isEncrypted) {
          setErrorMessage(
            `"${file.name}" appears password protected. Please unlock it before merging.`
          );
          continue;
        }

        let thumbUrl: string | undefined;
        let count = 0;
        try {
          const pdfDoc = await PdfRenderService.loadDocument(uint8);
          count = pdfDoc.numPages;
          thumbUrl = await PdfRenderService.renderThumbnail(pdfDoc, 1, 140);
        } catch {
          // Fallback if rendering preview encounters any font issue
        }

        newFiles.push({
          id: `${file.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: file.name,
          size: file.size,
          data: uint8.slice(),
          pageCount: count,
          thumbnailUrl: thumbUrl,
          status: 'ready',
        });
      } catch (err) {
        setErrorMessage(`Could not read file ${file.name}: ${String(err)}`);
      }
    }

    setFiles((prev) => [...prev, ...newFiles]);
  };

  const handleMoveFile = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === files.length - 1)
    ) {
      return;
    }

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const reordered = [...files];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);
    setFiles(reordered);
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMerge = async () => {
    if (files.length < 2) {
      setErrorMessage('Please add at least two PDF files to merge.');
      return;
    }

    setIsProcessing(true);
    setProgress(15);
    setErrorMessage(null);
    setStatusMessage('Combining pages locally...');

    try {
      const buffers = files.map((f) => f.data);
      const mergedBytes = await PdfLibService.mergePdfs(buffers, (p) => {
        setProgress(Math.max(15, Math.min(90, p)));
      });

      setStatusMessage('Saving merged document safely...');
      const defaultFilename = generateSafeOutputFilename(files[0].name, 'merged');

      const targetPath = await DialogService.selectSaveLocation(defaultFilename);
      if (targetPath) {
        const savedPath = await FsService.saveFileSafe(targetPath, mergedBytes);
        setProgress(100);
        setStatusMessage('PDFs successfully merged!');
        setSavedFilePath(savedPath);
      } else {
        setStatusMessage('Merge cancelled by user.');
      }
    } catch (err) {
      setErrorMessage(`Merge failed: ${String(err)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      {/* Tool Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
          Merge PDF files
        </h1>
        <p className="text-sm text-slate-500 max-w-xl mx-auto">
          Combine PDFs in the order you want with the easiest offline PDF merger available.
        </p>
      </div>

      {/* Main Upload DropZone if empty */}
      {files.length === 0 ? (
        <DropZone
          onFilesDropped={handleFilesAdded}
          buttonLabel="Select PDF files"
          description="or drop PDFs here"
        />
      ) : (
        <div className="space-y-6">
          {/* File Card Grid (iLovePDF visual file ordering) */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {files.length} {files.length === 1 ? 'file' : 'files'} selected
                </h3>
                <p className="text-xs text-slate-400">
                  Total Size: {formatBytes(files.reduce((acc, f) => acc + f.size, 0))} • Drag or click arrows to reorder
                </p>
              </div>

              {/* Add more files button */}
              <label className="flex items-center space-x-1.5 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors">
                <Plus className="h-4 w-4 text-primary" />
                <span>Add more files</span>
                <input
                  type="file"
                  accept=".pdf"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) handleFilesAdded(Array.from(e.target.files));
                    e.target.value = '';
                  }}
                />
              </label>
            </div>

            {/* List of File Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {files.map((file, idx) => (
                <div
                  key={file.id}
                  className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-slate-50/70 p-3 hover:border-slate-300 hover:bg-white hover:shadow-md transition-all duration-150"
                >
                  {/* Thumbnail Preview Box */}
                  <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-white shadow-xs flex items-center justify-center border border-slate-200/60 mb-2">
                    {file.thumbnailUrl ? (
                      <img
                        src={file.thumbnailUrl}
                        alt={file.name}
                        className="max-h-full max-w-full object-contain pointer-events-none"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center space-y-1 text-slate-300">
                        <FileText className="h-8 w-8" />
                        <span className="text-[10px] text-slate-400 font-semibold">PDF</span>
                      </div>
                    )}

                    {/* Page position badge */}
                    <span className="absolute top-1.5 left-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900/80 text-[11px] font-bold text-white shadow-xs">
                      {idx + 1}
                    </span>

                    {/* Page count pill */}
                    {file.pageCount > 0 && (
                      <span className="absolute bottom-1.5 right-1.5 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white">
                        {file.pageCount} {file.pageCount === 1 ? 'page' : 'pages'}
                      </span>
                    )}
                  </div>

                  <div className="truncate px-1">
                    <p className="truncate text-xs font-bold text-slate-800" title={file.name}>
                      {file.name}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {formatBytes(file.size)}
                    </p>
                  </div>

                  {/* Reorder and Delete Controls */}
                  <div className="mt-4 flex items-center justify-between border-t border-slate-200/60 pt-2">
                    <div className="flex space-x-1">
                      <button
                        onClick={() => handleMoveFile(idx, 'up')}
                        disabled={idx === 0 || isProcessing}
                        title="Move left"
                        className="rounded-md p-1 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 disabled:opacity-20"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleMoveFile(idx, 'down')}
                        disabled={idx === files.length - 1 || isProcessing}
                        title="Move right"
                        className="rounded-md p-1 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 disabled:opacity-20"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <button
                      onClick={() => handleRemoveFile(idx)}
                      disabled={isProcessing}
                      title="Remove file"
                      className="rounded-md p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Processing Indicator */}
            {isProcessing && (
              <div className="pt-2">
                <DuckLoader progress={progress} label="Merging PDF documents..." />
              </div>
            )}

            {/* Error Banner */}
            {errorMessage && (
              <div className="flex items-center space-x-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-700">
                <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-500" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Status Message */}
            {statusMessage && !savedFilePath && !isProcessing && (
              <p className="text-xs text-slate-500 font-medium">{statusMessage}</p>
            )}

            {/* Success Banner */}
            {savedFilePath && (
              <div className="flex items-center space-x-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-medium text-emerald-800">
                <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-600" />
                <div>
                  <p className="font-bold">Merged successfully!</p>
                  <p className="text-slate-600 truncate">{savedFilePath}</p>
                </div>
              </div>
            )}

            {/* Bottom Action Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-100 pt-6 gap-4">
              <button
                onClick={() => setFiles([])}
                disabled={isProcessing}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800"
              >
                Clear all files
              </button>

              <button
                onClick={handleMerge}
                disabled={files.length < 2 || isProcessing}
                className="flex items-center space-x-3 rounded-2xl bg-primary px-8 py-4 text-base font-bold text-white shadow-xl shadow-primary/25 hover:bg-primary-hover active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150"
              >
                <span>Merge PDF</span>
                <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

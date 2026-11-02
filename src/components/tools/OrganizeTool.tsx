import React, { useState } from 'react';
import { 
  ArrowLeft, 
  ArrowRight, 
  RotateCw, 
  Trash2, 
  CheckCircle2, 
  AlertCircle,
  Undo2
} from 'lucide-react';
import { DropZone } from '@/components/common/DropZone';
import DuckLoader from '@/components/common/DuckLoader';
import { PdfRenderService } from '@/services/pdf/pdfRenderService';
import { PdfLibService } from '@/services/pdf/pdfLibService';
import { FsService } from '@/services/tauri/fsService';
import { DialogService } from '@/services/tauri/dialogService';
import { validatePdfBytes } from '@/utils/fileValidation';
import { generateSafeOutputFilename } from '@/utils/formatters';
import { PDFFileInfo, PDFPagePreview } from '@/types/pdf';

interface OrganizeToolProps {
  onBack?: () => void;
}

export const OrganizeTool: React.FC<OrganizeToolProps> = () => {
  const [file, setFile] = useState<PDFFileInfo | null>(null);
  const [pages, setPages] = useState<PDFPagePreview[]>([]);
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
        setErrorMessage('Cannot organize password-protected PDF.');
        return;
      }

      setFile({
        id: f.name,
        name: f.name,
        size: f.size,
        data: uint8.slice(),
        pageCount: 0,
        status: 'loading',
      });

      setIsRendering(true);
      const pdfDoc = await PdfRenderService.loadDocument(uint8);
      const totalPages = pdfDoc.numPages;
      const initialPages: PDFPagePreview[] = [];

      for (let i = 1; i <= totalPages; i++) {
        const thumbUrl = await PdfRenderService.renderThumbnail(pdfDoc, i, 180);
        initialPages.push({
          id: `page-${i}-${Date.now()}`,
          pageIndex: i - 1,
          pageNumber: i,
          rotation: 0,
          thumbnailUrl: thumbUrl,
          isDeleted: false,
        });
        setRenderProgress(Math.round((i / totalPages) * 100));
      }

      setPages(initialPages);
      setIsRendering(false);
    } catch (err) {
      setErrorMessage(`Failed to load PDF pages: ${String(err)}`);
      setIsRendering(false);
    }
  };

  const handleMovePage = (index: number, direction: 'prev' | 'next') => {
    const targetIndex = direction === 'prev' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= pages.length) return;

    const newPages = [...pages];
    const [moved] = newPages.splice(index, 1);
    newPages.splice(targetIndex, 0, moved);
    setPages(newPages);
  };

  const handleToggleDelete = (index: number) => {
    const newPages = [...pages];
    newPages[index] = {
      ...newPages[index],
      isDeleted: !newPages[index].isDeleted,
    };
    setPages(newPages);
  };

  const handleRotatePage = (index: number) => {
    const newPages = [...pages];
    newPages[index] = {
      ...newPages[index],
      rotation: (newPages[index].rotation + 90) % 360,
    };
    setPages(newPages);
  };

  const handleSaveOrganized = async () => {
    if (!file) return;

    const activePages = pages.filter((p) => !p.isDeleted);
    if (activePages.length === 0) {
      setErrorMessage('Cannot save an empty document. At least one page must remain.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setStatusMessage('Applying page reordering and rotations...');

    try {
      const newOrder = activePages.map((p) => p.pageIndex);
      let processedBytes = await PdfLibService.reorderPages(file.data, newOrder);

      const rotationMap: Record<number, number> = {};
      activePages.forEach((p, newIdx) => {
        if (p.rotation !== 0) {
          rotationMap[newIdx] = p.rotation;
        }
      });

      if (Object.keys(rotationMap).length > 0) {
        processedBytes = await PdfLibService.rotatePages(processedBytes, rotationMap);
      }

      const defaultFilename = generateSafeOutputFilename(file.name, 'organized');
      const targetPath = await DialogService.selectSaveLocation(defaultFilename);

      if (targetPath) {
        const savedPath = await FsService.saveFileSafe(targetPath, processedBytes);
        setStatusMessage('Organized PDF saved successfully!');
        setSavedFilePath(savedPath);
      } else {
        setStatusMessage('Save cancelled by user.');
      }
    } catch (err) {
      setErrorMessage(`Failed to save: ${String(err)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
          Organize PDF
        </h1>
        <p className="text-sm text-slate-500 max-w-xl mx-auto">
          Sort, rotate, and delete pages from your PDF file visually using high-speed local thumbnails.
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
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">{file.name}</h3>
              <p className="text-xs text-slate-400">
                {pages.length} Pages • {pages.filter((p) => !p.isDeleted).length} remaining active
              </p>
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

          {isRendering && (
            <DuckLoader
              progress={renderProgress}
              label="Rendering page thumbnails..."
            />
          )}

          {/* Thumbnail Grid */}
          {!isRendering && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
              {pages.map((p, idx) => (
                <div
                  key={p.id}
                  className={`group relative flex flex-col rounded-2xl border p-3 transition-all duration-150 ${
                    p.isDeleted
                      ? 'opacity-30 border-dashed border-red-300 bg-red-50/20'
                      : 'border-slate-200 bg-slate-50/70 hover:border-slate-300 hover:bg-white hover:shadow-md'
                  }`}
                >
                  <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-white shadow-xs flex items-center justify-center border border-slate-100">
                    {p.thumbnailUrl ? (
                      <img
                        src={p.thumbnailUrl}
                        alt={`Page ${p.pageNumber}`}
                        style={{
                          transform: `rotate(${p.rotation}deg)`,
                          transition: 'transform 0.2s ease',
                        }}
                        className="max-h-full max-w-full object-contain pointer-events-none"
                      />
                    ) : (
                      <span className="text-xs text-slate-400">Loading...</span>
                    )}

                    <span className="absolute bottom-1.5 right-1.5 rounded-md bg-black/75 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-xs">
                      {p.pageNumber}
                    </span>
                  </div>

                  {/* Actions under each thumbnail */}
                  <div className="mt-2.5 flex items-center justify-between pt-1 border-t border-slate-200/50">
                    <button
                      onClick={() => handleMovePage(idx, 'prev')}
                      disabled={idx === 0}
                      title="Move left"
                      className="rounded-md p-1 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 disabled:opacity-20"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleRotatePage(idx)}
                      title="Rotate 90°"
                      className="rounded-md p-1 text-slate-400 hover:bg-slate-200/60 hover:text-primary"
                    >
                      <RotateCw className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleToggleDelete(idx)}
                      title={p.isDeleted ? 'Restore page' : 'Delete page'}
                      className={`rounded-md p-1 ${
                        p.isDeleted ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-red-50 hover:text-red-600'
                      }`}
                    >
                      {p.isDeleted ? <Undo2 className="h-3.5 w-3.5" /> : <Trash2 className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      onClick={() => handleMovePage(idx, 'next')}
                      disabled={idx === pages.length - 1}
                      title="Move right"
                      className="rounded-md p-1 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 disabled:opacity-20"
                    >
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {errorMessage && (
            <div className="flex items-center space-x-2 text-xs font-medium text-red-600">
              <AlertCircle className="h-4 w-4" />
              <span>{errorMessage}</span>
            </div>
          )}

          {statusMessage && !savedFilePath && (
            <p className="text-xs text-slate-500 font-medium">{statusMessage}</p>
          )}

          {savedFilePath && (
            <div className="flex items-center space-x-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-medium text-emerald-800">
              <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-600" />
              <div>
                <p className="font-bold">Organized successfully!</p>
                <p className="text-slate-600 truncate">{savedFilePath}</p>
              </div>
            </div>
          )}

          {isProcessing && (
            <DuckLoader progress={50} />
          )}

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              onClick={handleSaveOrganized}
              disabled={isProcessing || isRendering}
              className="flex items-center space-x-3 rounded-2xl bg-primary px-8 py-4 text-base font-bold text-white shadow-xl shadow-primary/25 hover:bg-primary-hover active:scale-95 disabled:opacity-40 transition-all duration-150"
            >
              <span>Organize PDF</span>
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

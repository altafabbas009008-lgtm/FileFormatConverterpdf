import React, { useState } from 'react';
import { ArrowUp, ArrowDown, Trash2, CheckCircle2, AlertCircle, ArrowRight, Plus } from 'lucide-react';
import { DropZone } from '@/components/common/DropZone';
import DuckLoader from '@/components/common/DuckLoader';
import { PdfLibService } from '@/services/pdf/pdfLibService';
import { FsService } from '@/services/tauri/fsService';
import { DialogService } from '@/services/tauri/dialogService';
import { formatBytes, generateSafeOutputFilename } from '@/utils/formatters';

interface ImageItem {
  id: string;
  name: string;
  size: number;
  data: Uint8Array;
  type: 'image/jpeg' | 'image/png';
  previewUrl: string;
}

interface ImageToPdfToolProps {
  onBack?: () => void;
}

async function processImageFile(
  file: File
): Promise<{ data: Uint8Array; type: 'image/jpeg' | 'image/png'; previewUrl: string }> {
  const previewUrl = URL.createObjectURL(file);

  if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
    const buf = await file.arrayBuffer();
    return { data: new Uint8Array(buf), type: 'image/jpeg', previewUrl };
  }

  if (file.type === 'image/png') {
    const buf = await file.arrayBuffer();
    return { data: new Uint8Array(buf), type: 'image/png', previewUrl };
  }

  // Convert WebP, BMP, GIF to standard PNG
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context unavailable'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(async (blob) => {
        canvas.width = 0;
        canvas.height = 0;
        if (!blob) {
          reject(new Error('Failed to convert image format'));
          return;
        }
        const buf = await blob.arrayBuffer();
        resolve({ data: new Uint8Array(buf), type: 'image/png', previewUrl });
      }, 'image/png');
    };
    img.onerror = () => reject(new Error(`Failed to decode image ${file.name}`));
    img.src = previewUrl;
  });
}

export const ImageToPdfTool: React.FC<ImageToPdfToolProps> = () => {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [pageSize, setPageSize] = useState<'fit' | 'a4' | 'letter'>('fit');
  const [orientation, setOrientation] = useState<'auto' | 'portrait' | 'landscape'>('auto');
  const [margin, setMargin] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savedFilePath, setSavedFilePath] = useState<string | null>(null);

  const handleFilesAdded = async (fileList: File[]) => {
    setErrorMessage(null);
    setStatusMessage(null);
    setSavedFilePath(null);

    const newItems: ImageItem[] = [];

    for (const f of fileList) {
      try {
        const processed = await processImageFile(f);
        newItems.push({
          id: `${f.name}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          name: f.name,
          size: f.size,
          data: processed.data,
          type: processed.type,
          previewUrl: processed.previewUrl,
        });
      } catch (err) {
        console.warn('Image processing warning:', err);
      }
    }

    setImages((prev) => [...prev, ...newItems]);
  };

  const handleMoveImage = (index: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= images.length) return;

    const list = [...images];
    const [moved] = list.splice(index, 1);
    list.splice(target, 0, moved);
    setImages(list);
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleConvertToPdf = async () => {
    if (images.length === 0) return;

    setIsProcessing(true);
    setErrorMessage(null);
    setStatusMessage('Generating PDF from images...');

    try {
      const pdfBytes = await PdfLibService.imagesToPdf(
        images.map((img) => ({ data: img.data, type: img.type })),
        { pageSize, orientation, margin }
      );

      const defaultFilename = generateSafeOutputFilename(
        images[0].name.replace(/\.[^/.]+$/, ''),
        'converted'
      );

      const targetPath = await DialogService.selectSaveLocation(defaultFilename);
      if (targetPath) {
        const savedPath = await FsService.saveFileSafe(targetPath, pdfBytes);
        setStatusMessage('PDF successfully created!');
        setSavedFilePath(savedPath);
      } else {
        setStatusMessage('Conversion cancelled by user.');
      }
    } catch (err) {
      setErrorMessage(`Failed to create PDF: ${String(err)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
          Images to PDF
        </h1>
        <p className="text-sm text-slate-500 max-w-xl mx-auto">
          Convert JPG, PNG, WebP, and BMP images into clean PDF documents in seconds offline with custom page layout and ordering.
        </p>
      </div>

      {images.length === 0 ? (
        <DropZone
          accept="image/jpeg,image/png,image/jpg,image/webp,image/bmp,image/gif"
          multiple={true}
          onFilesDropped={handleFilesAdded}
          buttonLabel="Select image files"
          description="or drop JPG, PNG, WebP, BMP images here"
        />
      ) : (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                {images.length} {images.length === 1 ? 'image' : 'images'} selected
              </h3>
              <p className="text-xs text-slate-400">
                Total: {formatBytes(images.reduce((acc, img) => acc + img.size, 0))}
              </p>
            </div>

            <label className="flex items-center space-x-1.5 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors">
              <Plus className="h-4 w-4 text-primary" />
              <span>Add more images</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/jpg,image/webp,image/bmp,image/gif"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) handleFilesAdded(Array.from(e.target.files));
                  e.target.value = '';
                }}
              />
            </label>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {images.map((img, idx) => (
              <div
                key={img.id}
                className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-slate-50/70 p-3 hover:border-slate-300 hover:bg-white hover:shadow-md transition-all duration-150"
              >
                <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-slate-100 border border-slate-200/60 flex items-center justify-center">
                  <img
                    src={img.previewUrl}
                    alt={img.name}
                    className="max-h-full max-w-full object-cover"
                  />
                  <span className="absolute bottom-1.5 right-1.5 rounded-md bg-black/75 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-xs">
                    {idx + 1}
                  </span>
                </div>

                <div className="mt-2 truncate">
                  <p className="truncate text-xs font-bold text-slate-800" title={img.name}>
                    {img.name}
                  </p>
                  <p className="text-[10px] text-slate-400">{formatBytes(img.size)}</p>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-slate-200/50 pt-2">
                  <div className="flex space-x-1">
                    <button
                      onClick={() => handleMoveImage(idx, 'up')}
                      disabled={idx === 0}
                      className="rounded-md p-1 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 disabled:opacity-20"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleMoveImage(idx, 'down')}
                      disabled={idx === images.length - 1}
                      className="rounded-md p-1 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 disabled:opacity-20"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <button
                    onClick={() => handleRemoveImage(idx)}
                    className="rounded-md p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Conversion Options */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-100">
            {/* Page Size */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Page size:
              </label>
              <div className="flex space-x-2">
                {[
                  { id: 'fit', label: 'Fit to Image' },
                  { id: 'a4', label: 'A4' },
                  { id: 'letter', label: 'US Letter' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setPageSize(opt.id as any)}
                    className={`flex-1 rounded-xl border py-2 text-xs font-bold transition-all ${
                      pageSize === opt.id
                        ? 'border-primary bg-red-50/40 text-primary ring-2 ring-primary/20'
                        : 'border-slate-200 text-slate-600 bg-slate-50/50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Orientation */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Orientation:
              </label>
              <div className="flex space-x-2">
                {[
                  { id: 'auto', label: 'Auto' },
                  { id: 'portrait', label: 'Portrait' },
                  { id: 'landscape', label: 'Landscape' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setOrientation(opt.id as any)}
                    className={`flex-1 rounded-xl border py-2 text-xs font-bold transition-all ${
                      orientation === opt.id
                        ? 'border-primary bg-red-50/40 text-primary ring-2 ring-primary/20'
                        : 'border-slate-200 text-slate-600 bg-slate-50/50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Margin */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Margin:
              </label>
              <div className="flex space-x-2">
                {[
                  { val: 0, label: 'No margin' },
                  { val: 20, label: 'Small' },
                  { val: 40, label: 'Big' },
                ].map((opt) => (
                  <button
                    key={opt.val}
                    onClick={() => setMargin(opt.val)}
                    className={`flex-1 rounded-xl border py-2 text-xs font-bold transition-all ${
                      margin === opt.val
                        ? 'border-primary bg-red-50/40 text-primary ring-2 ring-primary/20'
                        : 'border-slate-200 text-slate-600 bg-slate-50/50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {isProcessing && (
            <DuckLoader />
          )}

          {errorMessage && (
            <div className="flex items-center space-x-2 text-xs font-medium text-red-600">
              <AlertCircle className="h-4 w-4" />
              <span>{errorMessage}</span>
            </div>
          )}

          {statusMessage && !savedFilePath && !isProcessing && (
            <p className="text-xs text-slate-500">{statusMessage}</p>
          )}

          {savedFilePath && (
            <div className="flex items-center space-x-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-medium text-emerald-800">
              <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-600" />
              <div>
                <p className="font-bold">PDF Created successfully!</p>
                <p className="text-slate-600 truncate">{savedFilePath}</p>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              onClick={handleConvertToPdf}
              disabled={isProcessing}
              className="flex items-center space-x-3 rounded-2xl bg-primary px-8 py-4 text-base font-bold text-white shadow-xl shadow-primary/25 hover:bg-primary-hover active:scale-95 disabled:opacity-40 transition-all duration-150"
            >
              <span>Convert to PDF</span>
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

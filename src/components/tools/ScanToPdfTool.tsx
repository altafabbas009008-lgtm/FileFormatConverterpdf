
import React, { useEffect, useRef, useState } from 'react';
import { PdfLibService } from '@/services/pdf/pdfLibService';
import { FsService } from '@/services/tauri/fsService';
import { DialogService } from '@/services/tauri/dialogService';
import { formatBytes, generateSafeOutputFilename } from '@/utils/formatters';
import DuckLoader from '@/components/common/DuckLoader';

interface ScanToPdfToolProps {
  onBack?: () => void;
}

interface ScanPage {
  id: string;
  file: File;
  previewUrl: string;
}

async function prepareImage(file: File): Promise<{
  data: Uint8Array;
  type: 'image/jpeg' | 'image/png';
}> {
  if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
    return {
      data: new Uint8Array(await file.arrayBuffer()),
      type: 'image/jpeg',
    };
  }

  if (file.type === 'image/png') {
    return {
      data: new Uint8Array(await file.arrayBuffer()),
      type: 'image/png',
    };
  }

  const url = URL.createObjectURL(file);

  try {
    return await new Promise((resolve, reject) => {
      const image = new Image();

      image.onload = async () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = image.naturalWidth || image.width;
          canvas.height = image.naturalHeight || image.height;

          const context = canvas.getContext('2d');

          if (!context) {
            reject(new Error('Could not prepare image.'));
            return;
          }

          context.drawImage(image, 0, 0);

          canvas.toBlob(async (blob) => {
            canvas.width = 0;
            canvas.height = 0;

            if (!blob) {
              reject(new Error('Could not convert image.'));
              return;
            }

            resolve({
              data: new Uint8Array(await blob.arrayBuffer()),
              type: 'image/png',
            });
          }, 'image/png');
        } catch (error) {
          reject(error);
        }
      };

      image.onerror = () => reject(new Error(`Cannot read ${file.name}`));
      image.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export const ScanToPdfTool: React.FC<ScanToPdfToolProps> = () => {
  const [pages, setPages] = useState<ScanPage[]>([]);
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [savedPath, setSavedPath] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
const streamRef = useRef<MediaStream | null>(null);

const [cameraOpen, setCameraOpen] = useState(false);
const [cameraError, setCameraError] = useState('');
  const cameraInput = useRef<HTMLInputElement>(null);
  const photoInput = useRef<HTMLInputElement>(null);

  const addFiles = (fileList: FileList | File[] | null) => {
    if (!fileList) return;

    const files = Array.from(fileList).filter((file) =>
      file.type.startsWith('image/')
    );

    const newPages = files.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    setPages((previous) => [...previous, ...newPages]);
    setError('');
    setStatus('');
    setSavedPath('');
  };

  const removePage = (id: string) => {
    setPages((previous) => {
      const page = previous.find((item) => item.id === id);
      if (page) URL.revokeObjectURL(page.previewUrl);
      return previous.filter((item) => item.id !== id);
    });

    setSavedPath('');
    setStatus('');
  };

  const movePage = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= pages.length) return;

    setPages((previous) => {
      const next = [...previous];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

    setSavedPath('');
  };

  const createPdf = async () => {
    if (pages.length === 0 || processing) return;

    setProcessing(true);
    setError('');
    setStatus('Preparing scanned pages...');
    setSavedPath('');

    try {
      const prepared = [];

      for (const page of pages) {
        prepared.push(await prepareImage(page.file));
      }

      setStatus('Creating PDF...');

      const pdfBytes = await PdfLibService.imagesToPdf(prepared, {
        pageSize: 'a4',
        orientation: 'auto',
        margin: 20,
      });

      const filename = generateSafeOutputFilename(
        pages[0].file.name.replace(/\.[^/.]+$/, '') || 'scanned-document',
        'scan'
      );

      const targetPath = await DialogService.selectSaveLocation(filename);

      if (!targetPath) {
        setStatus('Save cancelled.');
        return;
      }

      const result = await FsService.saveFileSafe(targetPath, pdfBytes);
      setSavedPath(result);
      setStatus('PDF created successfully!');
    } catch (err) {
      setError(
        `Could not create PDF: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
      setStatus('');
    } finally {
      setProcessing(false);
    }
  };
  const startCamera = async () => {
  setCameraError('');

  if (!navigator.mediaDevices?.getUserMedia) {
    setCameraError(
      'Camera access is unavailable. Please use an updated Chrome browser.'
    );
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' } },
      audio: false,
    });

    streamRef.current = stream;
    setCameraOpen(true);
  } catch (error) {
    const cameraError = error as DOMException;

    if (cameraError.name === 'NotAllowedError') {
      setCameraError(
        'Camera permission denied. Allow camera access in Chrome site settings.'
      );
    } else if (cameraError.name === 'NotFoundError') {
      setCameraError('No camera was found on this device.');
    } else {
      setCameraError(
        cameraError.message || 'Could not open the camera.'
      );
    }
  }
};

useEffect(() => {
  if (cameraOpen && videoRef.current && streamRef.current) {
    videoRef.current.srcObject = streamRef.current;
    videoRef.current.play().catch(() => {
      setCameraError('Could not start the camera preview.');
    });
  }
}, [cameraOpen]);

const stopCamera = () => {
  streamRef.current?.getTracks().forEach((track) => track.stop());
  streamRef.current = null;
  setCameraOpen(false);
};

useEffect(() => {
  return () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
  };
}, []);

const capturePhoto = () => {
  const video = videoRef.current;

  if (!video || !video.videoWidth || !video.videoHeight) {
    setCameraError('Camera is not ready yet. Please wait a moment.');
    return;
  }

  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const context = canvas.getContext('2d');

  if (!context) {
    setCameraError('Could not capture the photo.');
    return;
  }

  context.drawImage(video, 0, 0);

  canvas.toBlob((blob) => {
    if (!blob) {
      setCameraError('Could not create the image.');
      return;
    }

    const file = new File(
      [blob],
      `scan-page-${Date.now()}.jpg`,
      { type: 'image/jpeg' }
    );

    addFiles([file]);
    setCameraError('');
  }, 'image/jpeg', 0.92);
};

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-16">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
          Scan to PDF
        </h1>
        <p className="mx-auto max-w-xl text-sm text-slate-500">
          Capture document pages or choose photos, arrange them, and save
          them together as a PDF.
        </p>
      </div>

      <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <input
          ref={cameraInput}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(event) => {
            addFiles(event.target.files);
            event.target.value = '';
          }}
        />

        <input
          ref={photoInput}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(event) => {
            addFiles(event.target.files);
            event.target.value = '';
          }}
        />

        <div className="flex flex-wrap justify-center gap-3">
         <button
  onClick={startCamera}
  className="rounded-xl bg-primary px-6 py-3 font-bold text-white"
>
  Open Camera
</button>

          <button
            onClick={() => photoInput.current?.click()}
            className="rounded-xl border border-slate-300 px-6 py-3 font-bold text-slate-700 hover:bg-slate-50"
          >
            Choose Existing Photos
          </button>
          {cameraOpen && (
  <div className="space-y-4 rounded-2xl border border-slate-200 p-4">
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      className="mx-auto max-h-[500px] w-full rounded-xl bg-black object-contain"
    />

    {cameraError && (
      <p className="text-sm text-red-600">{cameraError}</p>
    )}

    <div className="flex flex-wrap justify-center gap-3">
      <button
        onClick={capturePhoto}
        className="rounded-xl bg-primary px-6 py-3 font-bold text-white"
      >
        Capture Photo
      </button>

      <button
        onClick={stopCamera}
        className="rounded-xl border border-slate-300 px-6 py-3 font-bold"
      >
        Close Camera
      </button>
    </div>
  </div>
)}

{cameraError && !cameraOpen && (
  <p className="text-center text-sm text-red-600">{cameraError}</p>
)}
        </div>

        {pages.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 p-10 text-center text-sm text-slate-500">
            No pages added yet. Capture a document or select images to begin.
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
              <div>
                <h2 className="font-bold text-slate-900">
                  {pages.length} {pages.length === 1 ? 'page' : 'pages'} selected
                </h2>
                <p className="text-xs text-slate-500">
                  Total: {formatBytes(
                    pages.reduce((total, page) => total + page.file.size, 0)
                  )}
                </p>
              </div>

              <button
                onClick={() => {
                  pages.forEach((page) => URL.revokeObjectURL(page.previewUrl));
                  setPages([]);
                  setSavedPath('');
                  setStatus('');
                  setError('');
                }}
                className="text-sm font-semibold text-red-600"
              >
                Clear all
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {pages.map((page, index) => (
                <div
                  key={page.id}
                  className="overflow-hidden rounded-xl border border-slate-200 p-3"
                >
                  <div className="flex aspect-[3/4] items-center justify-center overflow-hidden rounded-lg bg-slate-50">
                    <img
                      src={page.previewUrl}
                      alt={`Scan page ${index + 1}`}
                      className="h-full w-full object-contain"
                    />
                  </div>

                  <p className="mt-2 truncate text-xs font-semibold">
                    Page {index + 1}: {page.file.name}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={() => movePage(index, -1)}
                      disabled={index === 0}
                      className="rounded border px-2 py-1 text-xs disabled:opacity-30"
                    >
                      ←
                    </button>
                    <button
                      onClick={() => movePage(index, 1)}
                      disabled={index === pages.length - 1}
                      className="rounded border px-2 py-1 text-xs disabled:opacity-30"
                    >
                      →
                    </button>
                    <button
                      onClick={() => removePage(page.id)}
                      className="rounded border border-red-200 px-2 py-1 text-xs text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {processing && (
              <div className="mb-4">
                <DuckLoader />
              </div>
            )}

            <button
              onClick={createPdf}
              disabled={processing || pages.length === 0}
              className="w-full rounded-2xl bg-primary px-6 py-4 font-bold text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
            >
              {processing ? 'Creating PDF...' : 'Create and Save PDF'}
            </button>
          </>
        )}

        {status && !processing && (
          <p className="text-sm text-emerald-700">{status}</p>
        )}

        {savedPath && (
          <div className="break-all rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            <p className="font-bold">PDF saved successfully!</p>
            <p>{savedPath}</p>
          </div>
        )}

        {error && (
          <p className="break-words text-sm text-red-600">{error}</p>
        )}
      </div>

      <p className="text-center text-xs text-slate-500">
        Camera availability depends on your device. On desktop, the camera
        button may open a file picker instead.
      </p>
    </div>
  );
};

export default ScanToPdfTool;

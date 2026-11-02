
import React, { useState } from 'react';
import {
  FileText,
  Droplets,
  AlertCircle,
  CheckCircle2,
  RotateCcw,
} from 'lucide-react';
import { DropZone } from '@/components/common/DropZone';
import DuckLoader from '@/components/common/DuckLoader';
import { FsService } from '@/services/tauri/fsService';
import { DialogService } from '@/services/tauri/dialogService';
import { validatePdfBytes } from '@/utils/fileValidation';
import { generateSafeOutputFilename } from '@/utils/formatters';
import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';

export const AddWatermarkTool: React.FC = () => {
  const [file, setFile] = useState<{
    name: string;
    data: Uint8Array;
  } | null>(null);

  const [pageCount, setPageCount] = useState(0);
  const [watermarkText, setWatermarkText] = useState('CONFIDENTIAL');
  const [fontSize, setFontSize] = useState(40);
  const [opacity, setOpacity] = useState(0.2);
  const [color, setColor] = useState('#808080');
  const [position, setPosition] = useState('center');
  const [rotation, setRotation] = useState('diagonal');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const resetMessages = () => {
    setError('');
    setSuccess('');
  };

  const handleFilesAdded = async (files: File[]) => {
    if (!files.length) return;

    resetMessages();

    try {
      const selectedFile = files[0];
      const bytes = new Uint8Array(await selectedFile.arrayBuffer());

      const validation = validatePdfBytes(bytes);

      if (!validation.isValid) {
        setError(validation.error || 'Please select a valid PDF file.');
        return;
      }

      if (validation.isEncrypted) {
        setError('Password-protected PDFs are not supported.');
        return;
      }

      const pdf = await PDFDocument.load(bytes.slice());

      setPageCount(pdf.getPageCount());
      setFile({
        name: selectedFile.name,
        data: bytes,
      });
    } catch (e) {
      setError(`Could not open PDF: ${String(e)}`);
    }
  };

  const handleApplyWatermark = async () => {
    if (!file) return;

    if (!watermarkText.trim()) {
      setError('Please enter watermark text.');
      return;
    }

    if (!Number.isInteger(fontSize) || fontSize < 8 || fontSize > 120) {
      setError('Font size must be between 8 and 120.');
      return;
    }

    setIsProcessing(true);
    resetMessages();

    try {
      const pdf = await PDFDocument.load(file.data.slice());
      const font = await pdf.embedFont(StandardFonts.Helvetica);

      const cleanColor = color.replace('#', '');

      const red = parseInt(cleanColor.slice(0, 2), 16) / 255;
      const green = parseInt(cleanColor.slice(2, 4), 16) / 255;
      const blue = parseInt(cleanColor.slice(4, 6), 16) / 255;

      const watermarkColor = rgb(red, green, blue);

      for (const page of pdf.getPages()) {
        const { width, height } = page.getSize();
        const text = watermarkText.trim();

        const textWidth = font.widthOfTextAtSize(text, fontSize);
        const textHeight = fontSize;

        let x = (width - textWidth) / 2;
        let y = (height - textHeight) / 2;
        let angle = 0;

        if (position === 'top') {
          y = height - fontSize - 30;
        } else if (position === 'bottom') {
          y = 30;
        } else if (position === 'top-left') {
          x = 30;
          y = height - fontSize - 30;
        } else if (position === 'top-right') {
          x = width - textWidth - 30;
          y = height - fontSize - 30;
        } else if (position === 'bottom-left') {
          x = 30;
          y = 30;
        } else if (position === 'bottom-right') {
          x = width - textWidth - 30;
          y = 30;
        }

        if (rotation === 'diagonal') {
          angle = -45;
        }

        page.drawText(text, {
          x: Math.max(0, x),
          y: Math.max(0, y),
          size: fontSize,
          font,
          color: watermarkColor,
          opacity,
          rotate: degrees(angle),
        });
      }

      const outputBytes = await pdf.save();

      const defaultFilename = generateSafeOutputFilename(
        file.name,
        'watermarked'
      );

      const targetPath =
        await DialogService.selectSaveLocation(defaultFilename);

      if (!targetPath) {
        setSuccess('Save cancelled. Your original PDF is unchanged.');
        return;
      }

      const savedPath = await FsService.saveFileSafe(
        targetPath,
        outputBytes
      );

      setSuccess(`Watermark added successfully! Saved to: ${savedPath}`);
    } catch (e) {
      setError(`Failed to add watermark: ${String(e)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setWatermarkText('CONFIDENTIAL');
    setFontSize(40);
    setOpacity(0.2);
    setColor('#808080');
    setPosition('center');
    setRotation('diagonal');
    resetMessages();
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      <div className="text-center space-y-2">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
          <Droplets className="h-7 w-7" />
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
          Add Watermark
        </h1>

        <p className="mx-auto max-w-xl text-sm text-slate-500">
          Protect your PDF by adding a custom text watermark to every page.
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
        <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-col items-start justify-between gap-3 border-b border-slate-100 pb-5 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                <FileText className="h-6 w-6" />
              </div>

              <div>
                <h3 className="font-bold text-slate-900">{file.name}</h3>
                <p className="text-xs text-slate-500">
                  {pageCount} pages
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setFile(null);
                setPageCount(0);
                resetMessages();
              }}
              className="text-sm font-semibold text-primary hover:underline"
            >
              Choose another PDF
            </button>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700">
              Watermark text
            </label>

            <input
              type="text"
              value={watermarkText}
              maxLength={100}
              onChange={(e) => setWatermarkText(e.target.value)}
              placeholder="Enter watermark text"
              className="w-full rounded-xl border border-slate-300 p-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />

            <div className="flex flex-wrap gap-2">
              {['CONFIDENTIAL', 'DRAFT', 'SAMPLE', 'COPY'].map((text) => (
                <button
                  type="button"
                  key={text}
                  onClick={() => setWatermarkText(text)}
                  className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  {text}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-slate-700">
              Position
              <select
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3"
              >
                <option value="center">Center</option>
                <option value="top">Top center</option>
                <option value="bottom">Bottom center</option>
                <option value="top-left">Top left</option>
                <option value="top-right">Top right</option>
                <option value="bottom-left">Bottom left</option>
                <option value="bottom-right">Bottom right</option>
              </select>
            </label>

            <label className="block text-sm font-semibold text-slate-700">
              Rotation
              <select
                value={rotation}
                onChange={(e) => setRotation(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3"
              >
                <option value="diagonal">Diagonal</option>
                <option value="horizontal">Horizontal</option>
              </select>
            </label>

            <label className="block text-sm font-semibold text-slate-700">
              Font size: {fontSize}
              <input
                type="range"
                min="8"
                max="120"
                step="1"
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="mt-3 w-full accent-emerald-600"
              />
            </label>

            <label className="block text-sm font-semibold text-slate-700">
              Opacity: {Math.round(opacity * 100)}%
              <input
                type="range"
                min="0.05"
                max="1"
                step="0.05"
                value={opacity}
                onChange={(e) => setOpacity(Number(e.target.value))}
                className="mt-3 w-full accent-emerald-600"
              />
            </label>

            <label className="block text-sm font-semibold text-slate-700 sm:col-span-2">
              Watermark color
              <div className="mt-2 flex items-center gap-3">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-11 w-16 cursor-pointer rounded-lg border border-slate-200 p-1"
                />
                <span className="text-xs text-slate-500">{color}</span>
              </div>
            </label>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Watermark preview
            </p>

            <div className="mt-3 flex min-h-44 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white">
              <span
                className="max-w-full break-words px-4 text-center font-bold"
                style={{
                  color,
                  opacity,
                  fontSize: `${Math.min(fontSize, 48)}px`,
                  transform: rotation === 'diagonal'
                    ? 'rotate(-35deg)'
                    : 'none',
                  overflowWrap: 'anywhere',
                }}
              >
                {watermarkText || 'YOUR WATERMARK'}
              </span>
            </div>

            <p className="mt-2 text-xs text-slate-500">
              Preview is illustrative. The saved PDF uses your selected settings.
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2 text-sm text-red-600">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-start gap-2 break-all rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {isProcessing && (
            <DuckLoader />
          )}

          <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row">
            <button
              type="button"
              onClick={handleReset}
              disabled={isProcessing}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <RotateCcw className="h-4 w-4" />
              Reset settings
            </button>

            <button
              type="button"
              onClick={handleApplyWatermark}
              disabled={isProcessing || !watermarkText.trim()}
              className="flex-1 rounded-xl bg-primary px-6 py-3 font-bold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isProcessing ? 'Applying watermark...' : 'Apply Watermark & Save PDF'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

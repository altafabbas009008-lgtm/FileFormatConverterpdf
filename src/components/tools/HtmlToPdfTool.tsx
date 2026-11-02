import React, { useState, useRef } from 'react';
import { 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Upload, 
  Eye, 
  Code2
} from 'lucide-react';
import DuckLoader from '@/components/common/DuckLoader';
import { FsService } from '@/services/tauri/fsService';
import { DialogService } from '@/services/tauri/dialogService';
import { generateSafeOutputFilename } from '@/utils/formatters';
import { PDFDocument } from 'pdf-lib';

interface HtmlToPdfToolProps {
  onBack?: () => void;
}

const DEFAULT_HTML_SAMPLE = `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: system-ui, sans-serif; padding: 40px; color: #1e293b; line-height: 1.6; }
    h1 { color: #e0a800; border-bottom: 2px solid #fde047; padding-bottom: 8px; }
    h2 { color: #334155; margin-top: 24px; }
    p { margin: 12px 0; }
    .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin: 16px 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; }
    th { background: #f1f5f9; }
  </style>
</head>
<body>
  <h1>Invoice & Summary Report</h1>
  <p>Generated completely offline using PDFLite Desktop Engine.</p>
  
  <div class="card">
    <strong>Document Information</strong>
    <p>Status: Completed • Privacy: 100% Offline (Zero Cloud Uploads)</p>
  </div>

  <h2>Itemized Overview</h2>
  <table>
    <thead>
      <tr><th>Description</th><th>Qty</th><th>Price</th></tr>
    </thead>
    <tbody>
      <tr><td>Local PDF Conversion Service</td><td>1</td><td>$0.00</td></tr>
      <tr><td>Zero Network Latency</td><td>1</td><td>$0.00</td></tr>
    </tbody>
  </table>
</body>
</html>`;

export const HtmlToPdfTool: React.FC<HtmlToPdfToolProps> = () => {
  const [htmlContent, setHtmlContent] = useState<string>(DEFAULT_HTML_SAMPLE);
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('preview');
  const [pageSize, setPageSize] = useState<'a4' | 'letter'>('a4');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savedFilePath, setSavedFilePath] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setHtmlContent(text);
        setActiveTab('preview');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleConvertToPdf = async () => {
    if (!htmlContent.trim()) {
      setErrorMessage('Please provide HTML markup to convert.');
      return;
    }

    setIsProcessing(true);
    setProgress(20);
    setErrorMessage(null);
    setStatusMessage('Rendering HTML layout into vector canvas...');

    try {
      // Dimensions in points (72 DPI)
      const isPortrait = orientation === 'portrait';
      const pageDim =
        pageSize === 'a4'
          ? isPortrait
            ? { width: 595.28, height: 841.89 }
            : { width: 841.89, height: 595.28 }
          : isPortrait
          ? { width: 612.0, height: 792.0 }
          : { width: 792.0, height: 612.0 };

      // Render HTML into offscreen iframe / canvas
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.top = '-9999px';
      iframe.style.left = '-9999px';
      // Match target render width at 2x scale (~150 DPI)
      const renderScale = 2.0;
      const renderWidth = Math.round(pageDim.width * renderScale);
      const renderHeight = Math.round(pageDim.height * renderScale);

      iframe.style.width = `${renderWidth}px`;
      iframe.style.height = `${renderHeight}px`;
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) {
        document.body.removeChild(iframe);
        throw new Error('Unable to access rendering iframe document');
      }

      iframeDoc.open();
      iframeDoc.write(htmlContent);
      iframeDoc.close();

      setProgress(40);
      setStatusMessage('Capturing high-resolution visual layout...');

      // Allow fonts / styles to calculate
      await new Promise((res) => setTimeout(res, 400));

      // Draw onto canvas using SVG foreignObject
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${renderWidth}" height="${renderHeight}">
          <foreignObject width="100%" height="100%">
            <div xmlns="http://www.w3.org/1999/xhtml" style="width:${renderWidth}px;height:${renderHeight}px;background:#ffffff;">
              ${iframeDoc.body.innerHTML}
            </div>
          </foreignObject>
        </svg>
      `;

      document.body.removeChild(iframe);

      const canvas = document.createElement('canvas');
      canvas.width = renderWidth;
      canvas.height = renderHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Failed to create canvas context');

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, renderWidth, renderHeight);

      const img = new Image();
      const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);

      await new Promise<void>((resolve) => {
        img.onload = () => {
          ctx.drawImage(img, 0, 0);
          URL.revokeObjectURL(svgUrl);
          resolve();
        };
        img.onerror = () => {
          URL.revokeObjectURL(svgUrl);
          resolve();
        };
        img.src = svgUrl;
      });

      setProgress(70);
      setStatusMessage('Embedding into PDF document...');

      // Convert canvas to JPEG
      const jpegBlob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Canvas export failed'))), 'image/jpeg', 0.92);
      });
      const jpegBytes = new Uint8Array(await jpegBlob.arrayBuffer());

      // Free canvas
      canvas.width = 0;
      canvas.height = 0;

      // Create PDF
      const pdfDoc = await PDFDocument.create();
      const embeddedJpg = await pdfDoc.embedJpg(jpegBytes);
      const page = pdfDoc.addPage([pageDim.width, pageDim.height]);
      page.drawImage(embeddedJpg, {
        x: 0,
        y: 0,
        width: pageDim.width,
        height: pageDim.height,
      });

      setProgress(90);
      setStatusMessage('Finalizing PDF...');
      const pdfBytes = await pdfDoc.save({ useObjectStreams: true });

      const defaultFilename = generateSafeOutputFilename('html_document', 'pdf');
      const targetPath = await DialogService.selectSaveLocation(defaultFilename);

      if (targetPath) {
        const savedPath = await FsService.saveFileSafe(targetPath, pdfBytes);
        setProgress(100);
        setStatusMessage('HTML converted to PDF successfully!');
        setSavedFilePath(savedPath);
      } else {
        setStatusMessage('Conversion finished. Save cancelled by user.');
      }
    } catch (err) {
      setErrorMessage(`Conversion failed: ${String(err)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      {/* Tool Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
          HTML to PDF
        </h1>
        <p className="text-sm text-slate-500 max-w-xl mx-auto">
          Convert HTML documents, webpages, or raw markup into high-resolution PDF files completely offline.
        </p>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm space-y-6">
        {/* Top Action Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-100 pb-4 gap-3">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`flex items-center space-x-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                activeTab === 'preview'
                  ? 'bg-amber-100 text-amber-800'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Eye className="h-4 w-4" />
              <span>Live Preview</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('editor')}
              className={`flex items-center space-x-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                activeTab === 'editor'
                  ? 'bg-amber-100 text-amber-800'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Code2 className="h-4 w-4" />
              <span>HTML Source Code</span>
            </button>
          </div>

          <div>
            <input
              type="file"
              ref={fileInputRef}
              accept=".html,.htm,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center space-x-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 shadow-2xs transition-colors"
            >
              <Upload className="h-4 w-4 text-amber-600" />
              <span>Import HTML / TXT File</span>
            </button>
          </div>
        </div>

        {/* Content Pane: Editor vs Preview */}
        {activeTab === 'editor' ? (
          <div className="space-y-2">
            <textarea
              value={htmlContent}
              onChange={(e) => setHtmlContent(e.target.value)}
              placeholder="Paste HTML markup here..."
              rows={16}
              className="w-full font-mono text-xs rounded-2xl border border-slate-200 bg-slate-900 text-emerald-400 p-4 focus:outline-hidden focus:ring-2 focus:ring-amber-500 selection:bg-amber-500/30"
            />
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-inner">
            <iframe
              srcDoc={htmlContent}
              title="HTML Preview"
              className="w-full h-96 border-0 bg-white"
            />
          </div>
        )}

        {/* Conversion Layout Settings */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Page Size
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPageSize('a4')}
                className={`rounded-xl border py-2 text-xs font-bold transition-all ${
                  pageSize === 'a4'
                    ? 'border-amber-500 bg-amber-50 text-amber-800 ring-1 ring-amber-500'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                A4 (Standard)
              </button>
              <button
                type="button"
                onClick={() => setPageSize('letter')}
                className={`rounded-xl border py-2 text-xs font-bold transition-all ${
                  pageSize === 'letter'
                    ? 'border-amber-500 bg-amber-50 text-amber-800 ring-1 ring-amber-500'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                US Letter
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Orientation
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setOrientation('portrait')}
                className={`rounded-xl border py-2 text-xs font-bold transition-all ${
                  orientation === 'portrait'
                    ? 'border-amber-500 bg-amber-50 text-amber-800 ring-1 ring-amber-500'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                Portrait
              </button>
              <button
                type="button"
                onClick={() => setOrientation('landscape')}
                className={`rounded-xl border py-2 text-xs font-bold transition-all ${
                  orientation === 'landscape'
                    ? 'border-amber-500 bg-amber-50 text-amber-800 ring-1 ring-amber-500'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                Landscape
              </button>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        {isProcessing && (
          <DuckLoader
            progress={progress}
            label={statusMessage || 'Converting HTML to PDF...'}
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
              <p className="font-bold">PDF saved successfully!</p>
              <p className="text-slate-600 truncate">{savedFilePath}</p>
            </div>
          </div>
        )}

        {/* Bottom Action Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <span className="text-xs text-slate-400">
            {pageSize.toUpperCase()} • {orientation.charAt(0).toUpperCase() + orientation.slice(1)} • 100% Offline
          </span>

          <button
            onClick={handleConvertToPdf}
            disabled={isProcessing}
            className="flex items-center space-x-3 rounded-2xl bg-amber-500 px-8 py-4 text-base font-bold text-white shadow-xl shadow-amber-500/25 hover:bg-amber-600 active:scale-95 disabled:opacity-40 transition-all duration-150"
          >
            <span>Convert to PDF</span>
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

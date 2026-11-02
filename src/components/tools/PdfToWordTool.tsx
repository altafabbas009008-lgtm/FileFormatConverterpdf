import React, { useState } from 'react';
import { 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Copy, 
  Check, 
  Search, 
  FileCode, 
  File, 
  Sparkles
} from 'lucide-react';
import { DropZone } from '@/components/common/DropZone';
import DuckLoader from '@/components/common/DuckLoader';
import { PdfTextExtractService, ExtractedPdfDocument } from '@/services/pdf/pdfTextExtractService';
import { FsService } from '@/services/tauri/fsService';
import { DialogService } from '@/services/tauri/dialogService';
import { validatePdfBytes } from '@/utils/fileValidation';
import { formatBytes, generateSafeOutputFilename } from '@/utils/formatters';
import { PDFFileInfo } from '@/types/pdf';

interface PdfToWordToolProps {
  onBack?: () => void;
}

export type ExportDocumentFormat = 'docx' | 'txt' | 'md';

export const PdfToWordTool: React.FC<PdfToWordToolProps> = () => {
  const [file, setFile] = useState<PDFFileInfo | null>(null);
  const [extractedDoc, setExtractedDoc] = useState<ExtractedPdfDocument | null>(null);
  const [exportFormat, setExportFormat] = useState<ExportDocumentFormat>('docx');
  const [preserveImages, setPreserveImages] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractProgress, setExtractProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savedFilePath, setSavedFilePath] = useState<string | null>(null);

  const handleFilesAdded = async (fileList: File[]) => {
    if (fileList.length === 0) return;
    setErrorMessage(null);
    setStatusMessage(null);
    setSavedFilePath(null);
    setExtractedDoc(null);

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
        setErrorMessage('Cannot extract text from password-protected PDF.');
        return;
      }

      setFile({
        id: f.name,
        name: f.name,
        size: f.size,
        data: uint8.slice(),
        pageCount: 0,
        status: 'ready',
      });

      // Extract text in background
      setIsExtracting(true);
      try {
        const result = await PdfTextExtractService.extractDocumentText(
          uint8.slice(),
          (pct, msg) => {
            setExtractProgress(pct);
            setStatusMessage(msg);
          }
        );
        setExtractedDoc(result);
        if (result.wordCount === 0) {
          setStatusMessage('Notice: No selectable text found. Scanned page image(s) will be embedded in Word (.docx) export.');
        } else {
          setStatusMessage(null);
        }
      } catch (extractErr) {
        setErrorMessage(`Text extraction error: ${String(extractErr)}`);
      } finally {
        setIsExtracting(false);
      }
    } catch (err) {
      setErrorMessage(`Failed to read file: ${String(err)}`);
    }
  };

  const handleCopyToClipboard = async () => {
    if (!extractedDoc) return;
    try {
      await navigator.clipboard.writeText(extractedDoc.fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn('Clipboard write error:', err);
    }
  };

  const handleConvertAndSave = async () => {
    if (!file || !extractedDoc) return;

    setIsProcessing(true);
    setErrorMessage(null);
    setStatusMessage(`Generating .${exportFormat.toUpperCase()} document...`);

    try {
      let exportData: Uint8Array;
      const baseName = file.name.replace(/\.[^/.]+$/, '');

      if (exportFormat === 'docx') {
        exportData = PdfTextExtractService.generateDocx(extractedDoc, {
          includeImages: preserveImages,
          title: baseName,
        });
      } else if (exportFormat === 'md') {
        exportData = PdfTextExtractService.generateMarkdown(extractedDoc, baseName);
      } else {
        exportData = PdfTextExtractService.generatePlainText(extractedDoc);
      }

      const defaultFilename = generateSafeOutputFilename(file.name, 'converted', exportFormat);
      const targetPath = await DialogService.selectSaveLocation(defaultFilename, exportFormat);

      if (targetPath) {
        const savedPath = await FsService.saveFileSafe(targetPath, exportData);
        setStatusMessage(`Document successfully converted to .${exportFormat.toUpperCase()}!`);
        setSavedFilePath(savedPath);
      } else {
        setStatusMessage('Save cancelled by user.');
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
          PDF to Word & Text
        </h1>
        <p className="text-sm text-slate-500 max-w-xl mx-auto">
          Convert PDF documents into editable Word (.docx), Plain Text, or Markdown offline.
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
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-[#2b579a] flex-shrink-0">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">{file.name}</h3>
                <p className="text-xs text-slate-400">
                  {formatBytes(file.size)}
                  {extractedDoc && (
                    <span>
                      {' '}• {extractedDoc.pages.length} Pages • {extractedDoc.wordCount.toLocaleString()} Words •{' '}
                      {extractedDoc.charCount.toLocaleString()} Characters
                    </span>
                  )}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setFile(null);
                setExtractedDoc(null);
              }}
              className="text-xs font-bold text-[#2b579a] hover:underline"
            >
              Choose another file
            </button>
          </div>

          {/* Extraction Progress */}
          {isExtracting && (
            <DuckLoader
              progress={extractProgress}
              label={statusMessage || 'Extracting document text...'}
            />
          )}

          {/* Target Format Selector */}
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Select Output Format:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  id: 'docx' as ExportDocumentFormat,
                  title: 'Word Document (.docx)',
                  sub: 'Microsoft Word & LibreOffice',
                  icon: FileText,
                  badge: 'Editable',
                  activeClass: 'border-[#2b579a] bg-blue-50/50 ring-2 ring-[#2b579a]/20 text-[#2b579a]',
                },
                {
                  id: 'txt' as ExportDocumentFormat,
                  title: 'Plain Text (.txt)',
                  sub: 'Universal clean text',
                  icon: File,
                  badge: 'Lightweight',
                  activeClass: 'border-slate-800 bg-slate-100 ring-2 ring-slate-800/20 text-slate-900',
                },
                {
                  id: 'md' as ExportDocumentFormat,
                  title: 'Markdown (.md)',
                  sub: 'Notion, Obsidian, GitHub',
                  icon: FileCode,
                  badge: 'Formatted',
                  activeClass: 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-600/20 text-emerald-800',
                },
              ].map((fmt) => (
                <div
                  key={fmt.id}
                  onClick={() => setExportFormat(fmt.id)}
                  className={`cursor-pointer rounded-2xl border p-4 transition-all text-left relative ${
                    exportFormat === fmt.id
                      ? fmt.activeClass
                      : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <fmt.icon className="h-5 w-5" />
                    <span className="rounded-md bg-white/80 border border-slate-200 px-1.5 py-0.5 text-[10px] font-bold">
                      {fmt.badge}
                    </span>
                  </div>
                  <p className="text-sm font-extrabold text-slate-900 mt-2">{fmt.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{fmt.sub}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Word Formatting & Layout Preservation Panel */}
          {exportFormat === 'docx' && (
            <div className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50/70 to-indigo-50/50 p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#2b579a] text-white shadow-xs">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Advanced Word Formatting Engine</h4>
                    <p className="text-[11px] text-slate-500">
                      Preserves typography, font sizes, bold/italics, alignments, bullet lists & visual layouts.
                    </p>
                  </div>
                </div>

                <label className="flex items-center space-x-2.5 cursor-pointer select-none bg-white px-3 py-1.5 rounded-xl border border-blue-200/80 shadow-2xs">
                  <input
                    type="checkbox"
                    checked={preserveImages}
                    onChange={(e) => setPreserveImages(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-[#2b579a] focus:ring-[#2b579a]"
                  />
                  <span className="text-xs font-semibold text-slate-700">Preserve Page Visuals & Photos</span>
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px]">
                <span className="inline-flex items-center rounded-md bg-white border border-blue-100 px-2 py-0.5 font-medium text-[#2b579a]">
                  ✓ Headings (H1/H2/H3)
                </span>
                <span className="inline-flex items-center rounded-md bg-white border border-blue-100 px-2 py-0.5 font-medium text-[#2b579a]">
                  ✓ Exact Font Sizes (pt)
                </span>
                <span className="inline-flex items-center rounded-md bg-white border border-blue-100 px-2 py-0.5 font-medium text-[#2b579a]">
                  ✓ Bold & Italic Weights
                </span>
                <span className="inline-flex items-center rounded-md bg-white border border-blue-100 px-2 py-0.5 font-medium text-[#2b579a]">
                  ✓ Bullet & Numbered Lists
                </span>
                <span className="inline-flex items-center rounded-md bg-white border border-blue-100 px-2 py-0.5 font-medium text-[#2b579a]">
                  ✓ Centered & Right Alignment
                </span>
                <span className="inline-flex items-center rounded-md bg-white border border-blue-100 px-2 py-0.5 font-medium text-[#2b579a]">
                  ✓ Clean Sentence Flow
                </span>
              </div>
            </div>
          )}

          {/* Live Extracted Text Preview Box */}
          {extractedDoc && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden">
              <div className="flex items-center justify-between bg-slate-100/80 px-4 py-2.5 border-b border-slate-200 text-xs">
                <div className="flex items-center space-x-2">
                  <Sparkles className="h-4 w-4 text-[#2b579a]" />
                  <span className="font-bold text-slate-700">Document Text Preview</span>
                </div>

                <div className="flex items-center space-x-2">
                  <div className="relative hidden sm:block">
                    <Search className="h-3.5 w-3.5 absolute left-2 top-2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search in text..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="rounded-lg border border-slate-200 bg-white pl-7 pr-2 py-1 text-xs text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-[#2b579a]"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyToClipboard}
                    className="flex items-center space-x-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        <span className="text-emerald-700">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 text-slate-500" />
                        <span>Copy Text</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Scrollable Text Content */}
              <div className="max-h-80 overflow-y-auto p-4 text-xs text-slate-800 leading-relaxed select-text bg-white">
                {extractedDoc.pages.map((p) => {
                  const filteredParagraphs = p.paragraphs?.filter((para) =>
                    searchQuery ? para.text.toLowerCase().includes(searchQuery.toLowerCase()) : true
                  );

                  return (
                    <div key={p.pageNumber} className="mb-5 pb-4 border-b border-slate-100 last:border-b-0 space-y-2">
                      <div className="flex items-center justify-between text-[10px] font-bold text-[#2b579a] uppercase tracking-wider mb-2 select-none border-b border-blue-50 pb-1">
                        <span>--- Page {p.pageNumber} ---</span>
                        {p.hasImages && (
                          <span className="text-[9px] bg-blue-100 text-[#2b579a] px-2 py-0.5 rounded-full lowercase font-medium">
                            visual layout & images preserved
                          </span>
                        )}
                      </div>

                      {p.lines.length === 0 ? (
                        <p className="italic text-slate-400">
                          [No selectable text found on this page. High-resolution page snapshot will be embedded in Word (.docx) export.]
                        </p>
                      ) : exportFormat === 'docx' && filteredParagraphs && filteredParagraphs.length > 0 ? (
                        <div className="space-y-2 font-sans">
                          {filteredParagraphs.map((para, paraIdx) => {
                            const headingClass =
                              para.isHeading && para.headingLevel === 1
                                ? 'text-base font-extrabold text-[#1F4D78] pt-1'
                                : para.isHeading && para.headingLevel === 2
                                ? 'text-sm font-bold text-[#2E74B5]'
                                : para.isHeading && para.headingLevel === 3
                                ? 'text-xs font-bold text-[#1F3864]'
                                : 'text-xs text-slate-800';

                            const alignClass =
                              para.alignment === 'center'
                                ? 'text-center'
                                : para.alignment === 'right'
                                ? 'text-right'
                                : 'text-left';

                            const indentClass = para.indentation > 0 ? 'pl-4' : '';

                            return (
                              <div
                                key={paraIdx}
                                className={`${headingClass} ${alignClass} ${indentClass} leading-normal`}
                              >
                                {para.spans.map((span, sIdx) => (
                                  <span
                                    key={sIdx}
                                    className={`
                                      ${span.isBold ? 'font-bold' : ''}
                                      ${span.isItalic ? 'italic' : ''}
                                    `}
                                  >
                                    {span.text}
                                  </span>
                                ))}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <pre className="font-mono text-xs whitespace-pre-wrap">
                          {p.text || <span className="italic text-slate-400">No matching search results</span>}
                        </pre>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
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
                <p className="font-bold">Converted document saved successfully!</p>
                <p className="text-slate-600 truncate">{savedFilePath}</p>
              </div>
            </div>
          )}

          {isProcessing && (
            <DuckLoader progress={50} />
          )}

          {/* Action Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between pt-4 border-t border-slate-100 gap-4">
            <div className="text-xs text-slate-500">
              {extractedDoc && !isProcessing && (
                <span>
                  Ready to export as{' '}
                  <strong className="text-slate-900">.{exportFormat.toUpperCase()}</strong> format.
                </span>
              )}
            </div>

            <button
              onClick={handleConvertAndSave}
              disabled={isProcessing || isExtracting || !extractedDoc}
              className="w-full sm:w-auto flex items-center justify-center space-x-3 rounded-2xl bg-[#2b579a] px-8 py-4 text-base font-bold text-white shadow-xl shadow-blue-900/25 hover:bg-blue-800 active:scale-95 disabled:opacity-40 transition-all duration-150"
            >
              <span>Convert to {exportFormat.toUpperCase()}</span>
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import {
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Table,
  Check,
  RotateCw,
  Layers,
  Palette
} from 'lucide-react';
import { DropZone } from '@/components/common/DropZone';
import DuckLoader from '@/components/common/DuckLoader';
import {
  ExcelToPdfService,
  ParsedWorkbook,
  ExcelPdfTheme,
  ExcelPageSize,
  ExcelOrientation,
  ExcelFitMode,
} from '@/services/excel/excelToPdfService';
import { FsService } from '@/services/tauri/fsService';
import { DialogService } from '@/services/tauri/dialogService';
import { formatBytes, generateSafeOutputFilename } from '@/utils/formatters';

interface ExcelToPdfToolProps {
  onBack?: () => void;
}

export const ExcelToPdfTool: React.FC<ExcelToPdfToolProps> = () => {
  const [file, setFile] = useState<File | null>(null);
  const [workbook, setWorkbook] = useState<ParsedWorkbook | null>(null);
  const [activeSheetName, setActiveSheetName] = useState<string>('');
  const [selectedSheetNames, setSelectedSheetNames] = useState<string[]>([]);

  // Conversion Options
  const [orientation, setOrientation] = useState<ExcelOrientation>('landscape');
  const [pageSize, setPageSize] = useState<ExcelPageSize>('a4');
  const [fitMode, setFitMode] = useState<ExcelFitMode>('fit-columns');
  const [theme, setTheme] = useState<ExcelPdfTheme>('excel');
  const [showGridlines, setShowGridlines] = useState(true);
  const [zebraStriping, setZebraStriping] = useState(true);
  const [repeatHeader, setRepeatHeader] = useState(true);
  const [includeTitle, setIncludeTitle] = useState(true);
  const [includePageNumbers, setIncludePageNumbers] = useState(true);

  // Status & Progress
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savedFilePath, setSavedFilePath] = useState<string | null>(null);

  const handleFilesAdded = async (fileList: File[]) => {
    if (fileList.length === 0) return;
    setErrorMessage(null);
    setStatusMessage(null);
    setSavedFilePath(null);
    setWorkbook(null);

    const f = fileList[0];
    const validExtensions = ['.xlsx', '.xls', '.csv', '.ods', '.tsv'];
    const isExcel = validExtensions.some((ext) => f.name.toLowerCase().endsWith(ext));

    if (!isExcel) {
      setErrorMessage('Please select a valid Excel or CSV file (.xlsx, .xls, .csv).');
      return;
    }

    try {
      const buffer = await f.arrayBuffer();
      const uint8 = new Uint8Array(buffer);
      const parsed = ExcelToPdfService.parseWorkbook(uint8, f.name);

      if (parsed.sheetNames.length === 0) {
        setErrorMessage('The spreadsheet does not contain any readable sheets.');
        return;
      }

      setFile(f);
      setWorkbook(parsed);
      setActiveSheetName(parsed.sheetNames[0]);
      setSelectedSheetNames([...parsed.sheetNames]);
    } catch (err) {
      setErrorMessage(`Failed to read spreadsheet: ${String(err)}`);
    }
  };

  const handleToggleSheetSelection = (name: string) => {
    setSelectedSheetNames((prev) =>
      prev.includes(name)
        ? prev.length > 1
          ? prev.filter((s) => s !== name)
          : prev
        : [...prev, name]
    );
  };

  const handleConvertToPdf = async () => {
    if (!workbook || !file) return;

    if (selectedSheetNames.length === 0) {
      setErrorMessage('Please select at least one sheet to convert.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setProgress(15);
    setStatusMessage('Generating professional vector PDF from spreadsheet...');

    try {
      const pdfBytes = await ExcelToPdfService.convertWorkbookToPdf(
        workbook,
        {
          orientation,
          pageSize,
          selectedSheets: selectedSheetNames,
          fitMode,
          theme,
          showGridlines,
          zebraStriping,
          repeatHeaderOnEveryPage: repeatHeader,
          includeSheetTitle: includeTitle,
          includePageNumbers,
        },
        (pct, msg) => {
          setProgress(pct);
          setStatusMessage(msg);
        }
      );

      const defaultFilename = generateSafeOutputFilename(file.name, 'converted', 'pdf');
      const targetPath = await DialogService.selectSaveLocation(defaultFilename, 'pdf');

      if (targetPath) {
        const savedPath = await FsService.saveFileSafe(targetPath, pdfBytes);
        setStatusMessage('Spreadsheet successfully converted to vector PDF!');
        setSavedFilePath(savedPath);
      } else {
        setStatusMessage('Save cancelled by user.');
      }
    } catch (err) {
      setErrorMessage(`PDF conversion failed: ${String(err)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const currentSheet = workbook && activeSheetName ? workbook.sheets[activeSheetName] : null;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      {/* Tool Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
          Excel to PDF
        </h1>
        <p className="text-sm text-slate-500 max-w-xl mx-auto">
          Convert Excel spreadsheets (.xlsx, .xls, .csv) into clean, vector PDF documents completely offline.
        </p>
      </div>

      {!file || !workbook ? (
        <DropZone
          multiple={false}
          onFilesDropped={handleFilesAdded}
          buttonLabel="Select Excel or CSV file"
          description="or drop .xlsx, .xls, .csv file here"
        />
      ) : (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm space-y-6">
          {/* File Header Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-100 pb-5 gap-3">
            <div className="flex items-center space-x-3.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-[#107c41] flex-shrink-0">
                <FileSpreadsheet className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">{file.name}</h3>
                <p className="text-xs text-slate-400">
                  {formatBytes(file.size)} • {workbook.sheetNames.length} Sheet(s) •{' '}
                  {workbook.totalRows.toLocaleString()} Total Data Rows
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setFile(null);
                setWorkbook(null);
                setSavedFilePath(null);
              }}
              className="text-xs font-bold text-[#107c41] hover:underline"
            >
              Choose another file
            </button>
          </div>

          {/* Sheet Selector Tabs */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-2">
                <Layers className="h-4 w-4 text-[#107c41]" />
                <span>Workbook Sheets:</span>
              </label>
              <span className="text-[11px] text-slate-500">
                {selectedSheetNames.length} of {workbook.sheetNames.length} selected for export
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {workbook.sheetNames.map((name) => {
                const isSelected = selectedSheetNames.includes(name);
                const isActive = activeSheetName === name;
                const sheetInfo = workbook.sheets[name];

                return (
                  <div
                    key={name}
                    className={`inline-flex items-center rounded-xl border text-xs transition-all overflow-hidden ${
                      isActive
                        ? 'border-[#107c41] bg-emerald-50 text-[#107c41] ring-2 ring-[#107c41]/20'
                        : 'border-slate-200 bg-slate-50/70 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleToggleSheetSelection(name)}
                      className={`px-2.5 py-1.5 flex items-center justify-center border-r transition-colors ${
                        isSelected
                          ? 'bg-[#107c41] text-white border-[#107c41]'
                          : 'bg-white text-slate-400 border-slate-200 hover:text-slate-600'
                      }`}
                      title={isSelected ? 'Included in PDF' : 'Excluded from PDF'}
                    >
                      <Check className={`h-3.5 w-3.5 ${isSelected ? 'opacity-100' : 'opacity-20'}`} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveSheetName(name)}
                      className="px-3 py-1.5 font-semibold text-left"
                    >
                      <span>{name}</span>
                      <span className="ml-1.5 text-[10px] opacity-60">
                        ({sheetInfo?.rowCount || 0} rows)
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Interactive Spreadsheet Data Table Preview */}
          {currentSheet && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden">
              <div className="flex items-center justify-between bg-slate-100/90 px-4 py-2.5 border-b border-slate-200 text-xs">
                <div className="flex items-center space-x-2">
                  <Table className="h-4 w-4 text-[#107c41]" />
                  <span className="font-bold text-slate-700">Preview: {activeSheetName}</span>
                </div>
                <div className="text-[11px] text-slate-500">
                  {currentSheet.colCount} Columns • {currentSheet.rowCount} Rows (Previewing first 50 rows)
                </div>
              </div>

              <div className="max-h-64 overflow-x-auto overflow-y-auto bg-white select-text">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 sticky top-0 border-b border-slate-200">
                      <th className="py-2 px-3 font-bold border-r border-slate-200 text-slate-400 w-10 text-center">
                        #
                      </th>
                      {currentSheet.headers.map((h, i) => (
                        <th key={i} className="py-2 px-3 font-bold border-r border-slate-200 last:border-r-0 truncate max-w-xs">
                          {h || `Column ${i + 1}`}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {currentSheet.rows.slice(0, 50).map((row, rIdx) => (
                      <tr
                        key={rIdx}
                        className={`border-b border-slate-100 transition-colors ${
                          rIdx % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'
                        }`}
                      >
                        <td className="py-1.5 px-3 font-mono text-[10px] text-slate-400 border-r border-slate-200 text-center">
                          {rIdx + 1}
                        </td>
                        {currentSheet.headers.map((_, cIdx) => (
                          <td
                            key={cIdx}
                            className="py-1.5 px-3 text-slate-700 border-r border-slate-100 last:border-r-0 truncate max-w-xs font-mono text-[11px]"
                          >
                            {row[cIdx] || ''}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Conversion Settings Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {/* Left Card: Page Layout & Orientation */}
            <div className="rounded-2xl border border-slate-200 p-4 space-y-4 bg-slate-50/40">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-2">
                <RotateCw className="h-4 w-4 text-[#107c41]" />
                <span>Page Layout & Sizing</span>
              </h4>

              {/* Orientation Buttons */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Orientation:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setOrientation('landscape')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center space-x-2 ${
                      orientation === 'landscape'
                        ? 'border-[#107c41] bg-emerald-50 text-[#107c41] ring-1 ring-[#107c41]'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>Landscape (Recommended)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrientation('portrait')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center space-x-2 ${
                      orientation === 'portrait'
                        ? 'border-[#107c41] bg-emerald-50 text-[#107c41] ring-1 ring-[#107c41]'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>Portrait</span>
                  </button>
                </div>
              </div>

              {/* Page Size & Scaling Mode */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600">Page Size:</label>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(e.target.value as ExcelPageSize)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 font-medium focus:outline-hidden focus:ring-1 focus:ring-[#107c41]"
                  >
                    <option value="a4">A4 (Standard)</option>
                    <option value="letter">Letter (US)</option>
                    <option value="legal">Legal</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600">Scaling / Fit:</label>
                  <select
                    value={fitMode}
                    onChange={(e) => setFitMode(e.target.value as ExcelFitMode)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 font-medium focus:outline-hidden focus:ring-1 focus:ring-[#107c41]"
                  >
                    <option value="fit-columns">Fit Columns to Page (Default)</option>
                    <option value="fit-sheet">Fit Entire Sheet to 1 Page</option>
                    <option value="auto">Natural Scale</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Right Card: Styling Theme & Table Features */}
            <div className="rounded-2xl border border-slate-200 p-4 space-y-4 bg-slate-50/40">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-2">
                <Palette className="h-4 w-4 text-[#107c41]" />
                <span>Color Theme & Styling</span>
              </h4>

              {/* Theme Palette Buttons */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'excel' as ExcelPdfTheme, name: 'Excel Green', color: '#107c41' },
                  { id: 'navy' as ExcelPdfTheme, name: 'Corporate Navy', color: '#1e3a8a' },
                  { id: 'slate' as ExcelPdfTheme, name: 'Modern Slate', color: '#334155' },
                  { id: 'clean' as ExcelPdfTheme, name: 'Minimalist Clean', color: '#64748b' },
                ].map((th) => (
                  <button
                    key={th.id}
                    type="button"
                    onClick={() => setTheme(th.id)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center space-x-2 ${
                      theme === th.id
                        ? 'border-slate-800 bg-white text-slate-900 ring-2 ring-slate-800/20'
                        : 'border-slate-200 bg-white/70 text-slate-600 hover:bg-white'
                    }`}
                  >
                    <span
                      className="h-3.5 w-3.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: th.color }}
                    />
                    <span className="truncate">{th.name}</span>
                  </button>
                ))}
              </div>

              {/* Options Checkboxes */}
              <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                <label className="flex items-center space-x-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showGridlines}
                    onChange={(e) => setShowGridlines(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-[#107c41] focus:ring-[#107c41]"
                  />
                  <span className="font-medium text-slate-700">Gridlines</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={zebraStriping}
                    onChange={(e) => setZebraStriping(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-[#107c41] focus:ring-[#107c41]"
                  />
                  <span className="font-medium text-slate-700">Zebra Rows</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={repeatHeader}
                    onChange={(e) => setRepeatHeader(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-[#107c41] focus:ring-[#107c41]"
                  />
                  <span className="font-medium text-slate-700">Repeat Header</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={includeTitle}
                    onChange={(e) => setIncludeTitle(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-[#107c41] focus:ring-[#107c41]"
                  />
                  <span className="font-medium text-slate-700">Sheet Banner</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={includePageNumbers}
                    onChange={(e) => setIncludePageNumbers(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-[#107c41] focus:ring-[#107c41]"
                  />
                  <span className="font-medium text-slate-700">Page Numbers</span>
                </label>
              </div>
            </div>
          </div>

          {/* Processing Progress */}
          {isProcessing && (
            <DuckLoader progress={progress} label={statusMessage || 'Converting spreadsheet to PDF...'} />
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
                <p className="font-bold">Excel spreadsheet converted to PDF successfully!</p>
                <p className="text-slate-600 truncate">{savedFilePath}</p>
              </div>
            </div>
          )}

          {/* Action Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between pt-4 border-t border-slate-100 gap-4">
            <div className="text-xs text-slate-500">
              Ready to export{' '}
              <strong className="text-slate-900">{selectedSheetNames.length} sheet(s)</strong> as a vector PDF document ({orientation.toUpperCase()}, {pageSize.toUpperCase()}).
            </div>

            <button
              onClick={handleConvertToPdf}
              disabled={isProcessing || selectedSheetNames.length === 0}
              className="w-full sm:w-auto flex items-center justify-center space-x-3 rounded-2xl bg-[#107c41] px-8 py-4 text-base font-bold text-white shadow-xl shadow-emerald-900/20 hover:bg-emerald-800 active:scale-95 disabled:opacity-40 transition-all duration-150"
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

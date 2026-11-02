
import React, { useRef, useState } from 'react';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import DuckLoader from '@/components/common/DuckLoader';

const SignPdfTool: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [signature, setSignature] = useState('');
  const [pageMode, setPageMode] = useState<'current' | 'all'>('current');
  const [pageNumber, setPageNumber] = useState('1');
  const [status, setStatus] = useState('');
  const [isSigning, setIsSigning] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  const signPdf = async () => {
    if (!file) {
      setStatus('Please upload a PDF first.');
      return;
    }

    if (!signature.trim()) {
      setStatus('Please enter your signature.');
      return;
    }

    try {
      setIsSigning(true);
      setStatus('');

      const bytes = await file.arrayBuffer();
      const pdf = await PDFDocument.load(bytes);
      const pages = pdf.getPages();
      const font = await pdf.embedFont(StandardFonts.TimesRomanItalic);
      const regularFont = await pdf.embedFont(StandardFonts.Helvetica);

      const selectedPage = Number(pageNumber);

      if (
        pageMode === 'current' &&
        (!Number.isInteger(selectedPage) ||
          selectedPage < 1 ||
          selectedPage > pages.length)
      ) {
        setStatus(`Enter a page number from 1 to ${pages.length}.`);
        return;
      }

      const targetPages =
        pageMode === 'all'
          ? pages
          : [pages[selectedPage - 1]];

      for (const page of targetPages) {
        page.drawText(signature.trim(), {
          x: 60,
          y: 60,
          size: 24,
          font,
          color: rgb(0.05, 0.15, 0.55),
        });

        if (name.trim()) {
          page.drawText(`Signed by: ${name.trim()}`, {
            x: 60,
            y: 40,
            size: 10,
            font: regularFont,
            color: rgb(0, 0, 0),
          });
        }
      }

      const output = await pdf.save();
      const safeBytes = new Uint8Array(output).buffer;
const blob = new Blob([safeBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.href = url;
      link.download = `signed-${file.name}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      setStatus(
        pageMode === 'all'
          ? `Signature added to all ${pages.length} pages.`
          : `Signature added to page ${selectedPage}.`
      );
    } catch (error) {
      console.error(error);
      setStatus(
        'Could not sign this PDF. It may be password-protected or unsupported.'
      );
    } finally {
      setIsSigning(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5 rounded-xl bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">Sign PDF</h2>
        <p className="mt-1 text-sm text-slate-500">
          Add an electronic text signature to your PDF.
        </p>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium">Upload PDF</label>
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf,.pdf"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            setStatus('');
            setPageNumber('1');
          }}
          className="block w-full rounded-lg border p-3 text-sm"
        />
        {file && (
          <p className="text-sm text-green-700">
            Selected: {file.name}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium">
          Your name (optional)
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your full name"
          className="w-full rounded-lg border p-3 text-sm"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium">
          Electronic signature
        </label>
        <input
          value={signature}
          onChange={(e) => setSignature(e.target.value)}
          placeholder="Type your signature here"
          className="w-full rounded-lg border p-3 text-lg italic"
        />
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium">Where should the signature appear?</p>

        <label className="flex cursor-pointer items-center gap-2 rounded-lg border p-3">
          <input
            type="radio"
            name="pageMode"
            value="current"
            checked={pageMode === 'current'}
            onChange={() => setPageMode('current')}
          />
          <span className="text-sm">Current page only</span>
        </label>

        <label className="flex cursor-pointer items-center gap-2 rounded-lg border p-3">
          <input
            type="radio"
            name="pageMode"
            value="all"
            checked={pageMode === 'all'}
            onChange={() => setPageMode('all')}
          />
          <span className="text-sm">All pages</span>
        </label>

        {pageMode === 'current' && (
          <div className="space-y-1">
            <label className="block text-sm font-medium">
              Page number
            </label>
            <input
              type="number"
              min="1"
              max={file ? undefined : 1}
              value={pageNumber}
              onChange={(e) => setPageNumber(e.target.value)}
              className="w-full rounded-lg border p-3 text-sm"
            />
            <p className="text-xs text-slate-500">
              Enter the page number where you want the signature.
            </p>
          </div>
        )}
      </div>

      {isSigning && (
        <DuckLoader />
      )}

      <button
        type="button"
        onClick={signPdf}
        disabled={isSigning}
        className="w-full rounded-lg bg-slate-900 px-5 py-3 font-medium text-white hover:bg-slate-700 disabled:opacity-50"
      >
        Sign & Download PDF
      </button>

      {status && !isSigning && (
        <p role="status" className="text-sm text-slate-700">
          {status}
        </p>
      )}
    </div>
  );
};

export default SignPdfTool;

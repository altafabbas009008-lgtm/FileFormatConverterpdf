
import React, { useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import DuckLoader from '@/components/common/DuckLoader';

const ComparePdfTool: React.FC = () => {
  const [file1, setFile1] = useState<File | null>(null);
  const [file2, setFile2] = useState<File | null>(null);
  const [result, setResult] = useState('');
  const [isComparing, setIsComparing] = useState(false);

  const comparePdfs = async () => {
    if (!file1 || !file2) {
      setResult('Please upload both PDF files.');
      return;
    }

    try {
      setIsComparing(true);
      setResult('');

      const [bytes1, bytes2] = await Promise.all([
        file1.arrayBuffer(),
        file2.arrayBuffer(),
      ]);

      const [pdf1, pdf2] = await Promise.all([
        PDFDocument.load(bytes1),
        PDFDocument.load(bytes2),
      ]);

      const pages1 = pdf1.getPages();
      const pages2 = pdf2.getPages();

      const differences: string[] = [];

      if (pages1.length !== pages2.length) {
        differences.push(
          `Page count differs: PDF 1 has ${pages1.length} pages; PDF 2 has ${pages2.length} pages.`
        );
      }

      const commonPages = Math.min(pages1.length, pages2.length);

      for (let i = 0; i < commonPages; i++) {
        const size1 = pages1[i].getSize();
        const size2 = pages2[i].getSize();

        if (
          Math.abs(size1.width - size2.width) > 1 ||
          Math.abs(size1.height - size2.height) > 1
        ) {
          differences.push(`Page ${i + 1}: page dimensions differ.`);
        }
      }

      if (differences.length === 0) {
        setResult(
          'The PDFs have the same page count and page dimensions. Text and visual content have not been compared by this basic version.'
        );
      } else {
        setResult(differences.join('\n'));
      }
    } catch (error) {
      console.error(error);
      setResult(
        'Could not read one of the PDFs. Check that both files are valid and not password-protected.'
      );
    } finally {
      setIsComparing(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 rounded-xl bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">
          Compare PDF
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Upload two PDFs to check their page counts and dimensions.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 rounded-lg border p-4">
          <label className="block text-sm font-medium">Original PDF</label>
          <input
            type="file"
            accept="application/pdf,.pdf"
            onChange={(e) => {
              setFile1(e.target.files?.[0] ?? null);
              setResult('');
            }}
            className="block w-full text-sm"
          />
          {file1 && (
            <p className="break-all text-xs text-slate-500">{file1.name}</p>
          )}
        </div>

        <div className="space-y-2 rounded-lg border p-4">
          <label className="block text-sm font-medium">Updated PDF</label>
          <input
            type="file"
            accept="application/pdf,.pdf"
            onChange={(e) => {
              setFile2(e.target.files?.[0] ?? null);
              setResult('');
            }}
            className="block w-full text-sm"
          />
          {file2 && (
            <p className="break-all text-xs text-slate-500">{file2.name}</p>
          )}
        </div>
      </div>

      {isComparing && (
        <DuckLoader />
      )}

      <button
        type="button"
        onClick={comparePdfs}
        disabled={isComparing || !file1 || !file2}
        className="w-full rounded-lg bg-slate-900 px-5 py-3 font-medium text-white hover:bg-slate-700 disabled:opacity-50"
      >
        {isComparing ? 'Comparing...' : 'Compare PDFs'}
      </button>

      {result && !isComparing && (
        <div
          role="status"
          className="whitespace-pre-line rounded-lg border bg-slate-50 p-4 text-sm text-slate-700"
        >
          {result}
        </div>
      )}
    </div>
  );
};

export default ComparePdfTool;

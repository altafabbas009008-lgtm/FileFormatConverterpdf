
import { useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import DuckLoader from '@/components/common/DuckLoader';

export function UnlockPdfTool() {
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleUnlock = async () => {
    if (!file) {
      setMessage('Please select a PDF file.');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const bytes = await file.arrayBuffer();

      // pdf-lib does not support decrypting encrypted PDFs.
      // This tool currently supports PDFs that pdf-lib can load.
      const pdfDoc = await PDFDocument.load(bytes, {
        ignoreEncryption: false,
      });

      const unlockedBytes = await pdfDoc.save();
      const safeBytes = new Uint8Array(unlockedBytes).buffer;

const blob = new Blob([safeBytes], {
  type: 'application/pdf',
});

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${file.name.replace(/\.pdf$/i, '')}_unlocked.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      setMessage('PDF saved successfully.');
    } catch (error) {
      console.error('Unlock PDF error:', error);
      setMessage(
        'This PDF could not be unlocked with this method. It may be encrypted or password-protected.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-bold">Unlock PDF</h1>
      <p className="mt-2 text-gray-600">
        Select a PDF to check whether it can be opened and saved without encryption.
      </p>

      <div className="mt-6 rounded-xl border-2 border-dashed border-gray-300 p-6">
        <label className="block font-medium">
          Choose PDF
          <input
            type="file"
            accept=".pdf,application/pdf"
            className="mt-3 block w-full"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setMessage('');
            }}
          />
        </label>
        {file && (
          <p className="mt-3 break-all text-sm text-gray-600">
            Selected: {file.name}
          </p>
        )}
      </div>

      <label className="mt-5 block">
        <span className="mb-2 block font-medium">
          PDF password (if required)
        </span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter password if you have one"
          autoComplete="off"
          className="w-full rounded-lg border border-gray-300 p-3"
        />
      </label>

      <p className="mt-2 text-sm text-gray-500">
        Note: password entry alone cannot decrypt an encrypted PDF in this version.
      </p>

      {loading && (
        <div className="mt-6">
          <DuckLoader />
        </div>
      )}

      <button
        type="button"
        onClick={handleUnlock}
        disabled={!file || loading}
        className="mt-6 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white disabled:opacity-50"
      >
        {loading ? 'Processing...' : 'Unlock & Download'}
      </button>

      {message && !loading && (
        <p role="status" className="mt-4 break-words text-sm">
          {message}
        </p>
      )}
    </div>
  );
}

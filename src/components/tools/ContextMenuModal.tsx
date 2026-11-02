import React, { useState } from 'react';
import { Settings, X, CheckCircle, AlertCircle } from 'lucide-react';
import { OsIntegrationService } from '@/services/tauri/osIntegration';

interface ContextMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ContextMenuModal: React.FC<ContextMenuModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleRegister = async () => {
    setLoading(true);
    setStatus(null);
    setError(null);
    const result = await OsIntegrationService.registerWindowsContextMenu();
    if (result.success) {
      setStatus(result.message);
    } else {
      setError(result.message);
    }
    setLoading(false);
  };

  const handleUnregister = async () => {
    setLoading(true);
    setStatus(null);
    setError(null);
    const result = await OsIntegrationService.unregisterWindowsContextMenu();
    if (result.success) {
      setStatus(result.message);
    } else {
      setError(result.message);
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <Settings className="h-5 w-5 text-primary" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              Windows Context Menu (FR-13)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          Enable instant right-click actions on any PDF in Windows File Explorer:
          <br />
          <code className="text-[11px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-primary mt-1 inline-block">
            Right Click &gt; Open with PDFLite (Merge / Compress)
          </code>
        </p>

        {status && (
          <div className="flex items-center space-x-2 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-900">
            <CheckCircle className="h-4 w-4 flex-shrink-0" />
            <span>{status}</span>
          </div>
        )}

        {error && (
          <div className="flex items-center space-x-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 p-2.5 rounded-lg border border-red-200 dark:border-red-900">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex space-x-3 pt-2">
          <button
            onClick={handleRegister}
            disabled={loading}
            className="flex-1 rounded-xl bg-primary py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-primary-hover disabled:opacity-50"
          >
            {loading ? 'Applying...' : 'Add to Windows Menu'}
          </button>
          <button
            onClick={handleUnregister}
            disabled={loading}
            className="flex-1 rounded-xl border border-slate-300 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 disabled:opacity-50"
          >
            Remove from Menu
          </button>
        </div>
      </div>
    </div>
  );
};

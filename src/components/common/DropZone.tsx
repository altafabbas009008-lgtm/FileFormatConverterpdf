
import React, { useState, useRef } from 'react';
import { FileUp } from 'lucide-react';

interface DropZoneProps {
  onFilesDropped: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  buttonLabel?: string;
  description?: string;
}

export const DropZone: React.FC<DropZoneProps> = ({
  onFilesDropped,
  accept = '.pdf',
  multiple = true,
  buttonLabel = 'Select PDF files',
  description = 'or drop PDFs here',
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (e.dataTransfer.files.length > 0) {
      onFilesDropped(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;

    if (selectedFiles && selectedFiles.length > 0) {
      onFilesDropped(Array.from(selectedFiles));
    }

    e.target.value = '';
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative flex min-h-[360px] w-full flex-col items-center justify-center rounded-3xl border-2 border-dashed p-10 text-center transition-all duration-200 ${
        isDragOver
          ? 'border-primary bg-red-50/40 scale-[1.01] shadow-xl'
          : 'border-slate-300/80 bg-white hover:border-slate-400 shadow-sm'
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={handleFileInput}
      />

      <div className="flex max-w-md flex-col items-center justify-center space-y-5">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="group flex items-center space-x-3 rounded-2xl bg-primary px-8 py-5 text-xl font-bold text-white shadow-xl shadow-primary/25 transition-all duration-150 hover:bg-primary-hover active:scale-95"
        >
          <FileUp className="h-7 w-7 transition-transform group-hover:-translate-y-0.5" />
          <span>{buttonLabel}</span>
        </button>

        <p className="text-sm font-medium text-slate-500">
          {description}
        </p>
      </div>
    </div>
  );
};

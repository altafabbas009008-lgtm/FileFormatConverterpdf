export interface PDFFileInfo {
  id: string;
  name: string;
  path?: string; // Optional if loaded via drag-and-drop file API or Tauri fs
  size: number;
  data: Uint8Array;
  pageCount: number;
  thumbnailUrl?: string;
  status: 'idle' | 'loading' | 'ready' | 'encrypted' | 'error';
  errorMessage?: string;
  pages?: PDFPagePreview[];
}

export interface PDFPagePreview {
  id: string;
  pageIndex: number; // 0-based
  pageNumber: number; // 1-based
  rotation: number; // 0, 90, 180, 270
  thumbnailUrl?: string;
  isSelected?: boolean;
  isDeleted?: boolean;
}

export type CompressionLevel = 'recommended' | 'extreme' | 'lossless';
export type CompressionMode = 'smart' | 'structural';

export interface CompressionSettings {
  level: CompressionLevel;
  imageQuality: number; // 0.1 to 1.0 (for JPEG re-encoding in image-heavy PDFs)
  downsampleDpi?: number; // e.g. 150 for screen, 72 for extreme
  removeMetadata: boolean;
}

export interface CompressionReport {
  originalBytes: number;
  compressedBytes: number;
  savedBytes: number;
  percentageSaved: number;
}

export interface ImageExportOptions {
  format: 'image/jpeg' | 'image/png';
  quality: number; // 0.1 to 1.0
  scale: number; // 1.0 = 72 DPI, 2.0 = 144 DPI, 4.0 = ~300 DPI
}

export interface ImageToPdfOptions {
  pageSize: 'A4' | 'Letter' | 'FitToImage';
  orientation: 'portrait' | 'landscape' | 'auto';
  margin: number; // in points (e.g. 20)
}

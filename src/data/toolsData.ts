
export type ToolCategory =
  | 'All'
  | 'Organize PDF'
  | 'Optimize PDF'
  | 'Convert PDF'
  | 'Edit PDF'
  | 'PDF Security';

export interface ToolItem {
  id: string;
  title: string;
  description: string;
  category: ToolCategory;
  badgeColor: string;
  iconType: string;
  isAvailableOffline: boolean;
  isNew?: boolean;
  p0FeatureRef?: string;
  routeId?: string;
}

export const TOOLS_DATA: ToolItem[] = [
  // Organize PDF
  { id: 'merge-pdf', title: 'Merge PDF', description: 'Combine PDFs in the order you want.', category: 'Organize PDF', badgeColor: '#3454D1', iconType: 'merge', isAvailableOffline: true, routeId: 'merge' },
  { id: 'split-pdf', title: 'Split PDF', description: 'Separate pages into independent PDF files.', category: 'Organize PDF', badgeColor: '#8B5CF6', iconType: 'split', isAvailableOffline: true, routeId: 'split' },
  { id: 'remove-pages', title: 'Remove pages', description: 'Delete unwanted pages from a PDF.', category: 'Organize PDF', badgeColor: '#EF4444', iconType: 'remove-pages', isAvailableOffline: true, routeId: 'remove-pages' },
  { id: 'extract-pages', title: 'Extract pages', description: 'Extract selected pages into a new PDF.', category: 'Organize PDF', badgeColor: '#0D9488', iconType: 'extract-pages', isAvailableOffline: true, routeId: 'extract-pages' },
  { id: 'organize-pdf', title: 'Organize PDF', description: 'Sort, delete or reorder PDF pages.', category: 'Organize PDF', badgeColor: '#6366F1', iconType: 'organize', isAvailableOffline: true, routeId: 'organize' },
 { id: 'scan-to-pdf', title: 'Scan to PDF', description: 'Import document scans from a camera or scanner.', category: 'Organize PDF', badgeColor: '#0891B2', iconType: 'scan', isAvailableOffline: true, routeId: 'scan-to-pdf' },
  // Optimize PDF
  { id: 'compress-pdf', title: 'Compress PDF', description: 'Reduce PDF file size.', category: 'Optimize PDF', badgeColor: '#16A34A', iconType: 'compress', isAvailableOffline: true, routeId: 'compress' },
  { id: 'repair-pdf', title: 'Repair PDF', description: 'Attempt to recover pages from damaged PDFs.', category: 'Optimize PDF', badgeColor: '#EA580C', iconType: 'repair', isAvailableOffline: true, routeId: 'repair-pdf' },
  { id: 'ocr-pdf', title: 'OCR PDF', description: 'Make scanned PDF text searchable.', category: 'Optimize PDF', badgeColor: '#7C3AED', iconType: 'ocr', isAvailableOffline: true, routeId: 'ocr-pdf' },

  // Convert PDF
  { id: 'jpg-to-pdf', title: 'JPG to PDF', description: 'Convert image files into PDF documents.', category: 'Convert PDF', badgeColor: '#DB2777', iconType: 'img-to-pdf', isAvailableOffline: true, routeId: 'img-to-pdf' },
  { id: 'pdf-to-jpg', title: 'PDF to JPG', description: 'Convert PDF pages into images.', category: 'Convert PDF', badgeColor: '#D97706', iconType: 'pdf-to-img', isAvailableOffline: true, routeId: 'pdf-to-img' },
  { id: 'pdf-to-word', title: 'PDF to Word', description: 'Convert PDF files into editable Word documents.', category: 'Convert PDF', badgeColor: '#2563EB', iconType: 'word', isAvailableOffline: true, routeId: 'pdf-to-word' },
  { id: 'pdf-to-powerpoint', title: 'PDF to PowerPoint', description: 'Convert PDF files into PowerPoint slides.', category: 'Convert PDF', badgeColor: '#EA580C', iconType: 'ppt', isAvailableOffline: false, routeId: 'pdf-to-powerpoint' },
  { id: 'pdf-to-excel', title: 'PDF to Excel', description: 'Extract data from PDFs into spreadsheets.', category: 'Convert PDF', badgeColor: '#15803D', iconType: 'excel', isAvailableOffline: false, routeId: 'pdf-to-excel' },
  { id: 'word-to-pdf', title: 'Word to PDF', description: 'Convert Word documents into PDF files.', category: 'Convert PDF', badgeColor: '#3B82F6', iconType: 'word', isAvailableOffline: true, routeId: 'word-to-pdf' },
  { id: 'powerpoint-to-pdf', title: 'PowerPoint to PDF', description: 'Convert PowerPoint slides into PDF files.', category: 'Convert PDF', badgeColor: '#F97316', iconType: 'ppt', isAvailableOffline: true, routeId: 'powerpoint-to-pdf' },
  { id: 'excel-to-pdf', title: 'Excel to PDF', description: 'Convert spreadsheets into PDF files.', category: 'Convert PDF', badgeColor: '#22A06B', iconType: 'excel', isAvailableOffline: true, routeId: 'excel-to-pdf' },
  { id: 'html-to-pdf', title: 'HTML to PDF', description: 'Convert local HTML pages into PDF files.', category: 'Convert PDF', badgeColor: '#C026D3', iconType: 'html', isAvailableOffline: true, routeId: 'html-to-pdf' },

  // Edit PDF
  { id: 'rotate-pdf', title: 'Rotate PDF', description: 'Rotate PDF pages to the correct orientation.', category: 'Edit PDF', badgeColor: '#0284C7', iconType: 'rotate', isAvailableOffline: true, routeId: 'rotate' },
  { id: 'add-page-numbers', title: 'Add Page Numbers', description: 'Add page numbers to PDF documents.', category: 'Edit PDF', badgeColor: '#9333EA', iconType: 'numbers', isAvailableOffline: true, routeId: 'add-page-numbers' },
  { id: 'add-watermark', title: 'Add watermark', description: 'Add a text or image watermark to a PDF.', category: 'Edit PDF', badgeColor: '#CA8A04', iconType: 'watermark', isAvailableOffline: true, routeId: 'add-watermark' },
  { id: 'crop-pdf', title: 'Crop PDF', description: 'Crop margins or selected areas of PDF pages.', category: 'Edit PDF', badgeColor: '#0F766E', iconType: 'crop', isAvailableOffline: false, routeId: 'crop-pdf' },
  { id: 'edit-pdf', title: 'Edit PDF', description: 'Add text to PDF documents.', category: 'Edit PDF', badgeColor: '#7C3AED', iconType: 'edit', isAvailableOffline: true, routeId: 'edit-pdf' },

  // PDF Security
  { id: 'unlock-pdf', title: 'Unlock PDF', description: 'Remove PDF password protection.', category: 'PDF Security', badgeColor: '#DC2626', iconType: 'unlock', isAvailableOffline: true, routeId: 'unlock-pdf' },
  { id: 'sign-pdf', title: 'Sign PDF', description: 'Add an electronic signature to a PDF.', category: 'PDF Security', badgeColor: '#4F46E5', iconType: 'sign', isAvailableOffline: true, routeId: 'sign-pdf' },
  { id: 'compare-pdf', title: 'Compare PDF', description: 'Compare two PDF versions and spot differences.', category: 'PDF Security', badgeColor: '#64748B', iconType: 'compare', isAvailableOffline: true, routeId: 'compare-pdf' },
];

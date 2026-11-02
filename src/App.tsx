import { useState } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Hero } from '@/components/home/Hero';
import { CategoryTabs } from '@/components/home/CategoryTabs';
import { ToolGrid } from '@/components/home/ToolGrid';
import { MergeTool } from '@/components/tools/MergeTool';
import { RepairTool } from '@/components/tools/RepairTool';
import { OcrTool } from '@/components/tools/OcrTool';
import { WordToPdfTool } from '@/components/tools/WordToPdfTool';
import { PowerPointToPdfTool } from '@/components/tools/PowerPointToPdfTool';
import { PdfToPowerPointTool } from '@/components/tools/PdfToPowerPointTool';
import { PdfToExcelTool } from '@/components/tools/PdfToExcelTool';
import { SplitTool } from '@/components/tools/SplitTool';
import { ExtractPagesTool } from '@/components/tools/ExtractPagesTool';
import { RemovePagesTool } from '@/components/tools/RemovePagesTool';
import { AddWatermarkTool } from '@/components/tools/AddWatermarkTool';
import { AddPageNumbersTool } from '@/components/tools/AddPageNumbersTool';
import { CropPdfTool } from '@/components/tools/CropPdfTool';
import { EditPdfTool } from '@/components/tools/EditPdfTool';
import { UnlockPdfTool } from '@/components/tools/UnlockPdfTool';
import SignPdfTool from '@/components/tools/SignPdfTool';
import ComparePdfTool from '@/components/tools/ComparePdfTool';
import { CompressTool } from '@/components/tools/CompressTool';
import { OrganizeTool } from '@/components/tools/OrganizeTool';
import { RotateTool } from '@/components/tools/RotateTool';
import { PdfToImageTool } from '@/components/tools/PdfToImageTool';
import { ImageToPdfTool } from '@/components/tools/ImageToPdfTool';
import { ScanToPdfTool } from '@/components/tools/ScanToPdfTool';
import { PdfToWordTool } from '@/components/tools/PdfToWordTool';
import { HtmlToPdfTool } from '@/components/tools/HtmlToPdfTool';
import { ExcelToPdfTool } from '@/components/tools/ExcelToPdfTool';
import { ContextMenuModal } from '@/components/tools/ContextMenuModal';
import { ToolCategory, ToolItem } from '@/data/toolsData';
import { ArrowLeft } from 'lucide-react';

export function App() {
  const [activeCategory, setActiveCategory] = useState<ToolCategory>('All');
  const [activeToolId, setActiveToolId] = useState<string | null>(null);
  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);

  
const handleSelectToolItem = (tool: ToolItem) => {
  setActiveToolId(tool.routeId || tool.id);
  window.scrollTo({ top: 0, behavior: 'smooth' });
};


  const handleSelectNavTool = (routeId: string) => {
    setActiveToolId(routeId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleGoHome = () => {
    setActiveToolId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderToolWorkspace = () => {
    switch (activeToolId) {
      case 'merge':
        return <MergeTool onBack={handleGoHome} />;
      case 'split':
        return <SplitTool onBack={handleGoHome} />;
        case 'extract-pages':
  return <ExtractPagesTool onBack={handleGoHome} />;
      case 'remove-pages':
        return <RemovePagesTool onBack={handleGoHome} />;
        case 'add-watermark':
  return <AddWatermarkTool />;
        case 'add-page-numbers':
  return <AddPageNumbersTool />;
  case 'crop-pdf':
  return <CropPdfTool />;
  case 'edit-pdf':
  return <EditPdfTool />;
  case 'unlock-pdf':
  return <UnlockPdfTool />;
  case 'sign-pdf':
  return <SignPdfTool />;
  case 'compare-pdf':
  return <ComparePdfTool />;
      case 'compress':
        return <CompressTool onBack={handleGoHome} />;
        case 'repair-pdf':
case 'repair':
  return <RepairTool onBack={handleGoHome} />;
      case 'organize':
        return <OrganizeTool onBack={handleGoHome} />;
      case 'rotate':
        return <RotateTool onBack={handleGoHome} />;
      case 'pdf-to-img':
        return <PdfToImageTool onBack={handleGoHome} />;
      case 'img-to-pdf':
        return <ImageToPdfTool onBack={handleGoHome} />;
        case 'scan-to-pdf':
  return <ScanToPdfTool onBack={handleGoHome} />;
      case 'pdf-to-word':
      case 'pdf-to-text':
        return <PdfToWordTool onBack={handleGoHome} />;
        case 'ocr-pdf':
  return <OcrTool onBack={handleGoHome} />;
  case 'word-to-pdf':
  return <WordToPdfTool onBack={handleGoHome} />;
  case 'powerpoint-to-pdf':
  return <PowerPointToPdfTool onBack={handleGoHome} />;
  case 'pdf-to-powerpoint':
  return <PdfToPowerPointTool onBack={handleGoHome} />;
      case 'html-to-pdf':
        return <HtmlToPdfTool onBack={handleGoHome} />;
        case 'pdf-to-excel':
  return <PdfToExcelTool onBack={handleGoHome} />;
      case 'excel-to-pdf':
        return <ExcelToPdfTool onBack={handleGoHome} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f7f9] text-slate-800 font-sans selection:bg-primary/20 selection:text-primary relative overflow-x-hidden">
      {/* Soft decorative background shapes matching iLovePDF */}
      <div className="pointer-events-none absolute -left-40 top-0 h-[600px] w-[600px] rounded-full bg-gradient-to-br from-rose-100/40 to-transparent blur-3xl opacity-70" />
      <div className="pointer-events-none absolute -right-40 top-20 h-[600px] w-[600px] rounded-full bg-gradient-to-bl from-amber-100/30 to-transparent blur-3xl opacity-60" />

      {/* Top Navbar with Logo & Mega Menus */}
      <Navbar
        onSelectTool={handleSelectNavTool}
        onGoHome={handleGoHome}
        onOpenContextMenuSettings={() => setIsContextMenuOpen(true)}
      />

      {/* Main Content Area */}
      <main className="relative z-10 pt-20">
        {activeToolId === null ? (
          /* Home Screen: Hero + Category Pills + Tool Cards Grid */
          <div className="space-y-6">
            <Hero />
            <CategoryTabs
              activeCategory={activeCategory}
              onSelectCategory={setActiveCategory}
            />
            <ToolGrid
              activeCategory={activeCategory}
              onSelectTool={handleSelectToolItem}
            />
          </div>
        ) : (
          /* Dedicated Tool Workspace */
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">

  {/* Fixed Back Button */}
  <div className="h-16 mb-4">
    <button
      onClick={handleGoHome}
      className="fixed top-20 left-4 sm:left-6 lg:left-8 z-[90] inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-700 shadow-lg transition-all hover:bg-slate-50 hover:text-primary"
    >
      <ArrowLeft className="h-5 w-5" />
      <span>Back</span>
    </button>
  </div>

  {renderToolWorkspace()}
</div>
        )}
      </main>

      {/* Global Footer on every page */}
      <Footer onSelectTool={handleSelectNavTool} onGoHome={handleGoHome} />

      {/* Windows Context Menu Settings Modal (FR-13) */}
      <ContextMenuModal
        isOpen={isContextMenuOpen}
        onClose={() => setIsContextMenuOpen(false)}
      />
    </div>
  );
}

export default App;

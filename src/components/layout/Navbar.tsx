
import React, { useState, useRef, useEffect } from 'react';
import duckIcon from '@/assets/duck-icon.png';
import {
  ChevronDown,
  ShieldCheck,
  UserRoundCheck,
  BadgeCheck,
} from 'lucide-react';
import { ToolBadgeIcon } from '@/components/home/ToolBadgeIcon';
import { TOOLS_DATA, type ToolItem } from '@/data/toolsData';

interface NavbarProps {
  onSelectTool: (routeId: string) => void;
  onGoHome: () => void;
  onOpenContextMenuSettings: () => void;
}

type ToolGroup = {
  title: string;
  tools: ToolItem[];
};

const ORGANIZE_TOOLS = TOOLS_DATA.filter(
  (tool) => tool.category === 'Organize PDF'
);

const OPTIMIZE_TOOLS = TOOLS_DATA.filter(
  (tool) => tool.category === 'Optimize PDF'
);

const CONVERT_TO_PDF_TOOLS = TOOLS_DATA.filter(
  (tool) =>
    tool.category === 'Convert PDF' &&
    tool.title.toLowerCase().endsWith('to pdf')
);

const CONVERT_FROM_PDF_TOOLS = TOOLS_DATA.filter(
  (tool) =>
    tool.category === 'Convert PDF' &&
    tool.title.toLowerCase().startsWith('pdf to')
);

const EDIT_TOOLS = TOOLS_DATA.filter(
  (tool) => tool.category === 'Edit PDF'
);

const SECURITY_TOOLS = TOOLS_DATA.filter(
  (tool) => tool.category === 'PDF Security'
);

const TOOL_GROUPS: ToolGroup[] = [
  { title: 'Organize PDF', tools: ORGANIZE_TOOLS },
  { title: 'Optimize PDF', tools: OPTIMIZE_TOOLS },
  { title: 'Convert to PDF', tools: CONVERT_TO_PDF_TOOLS },
  { title: 'Convert from PDF', tools: CONVERT_FROM_PDF_TOOLS },
  { title: 'Edit PDF', tools: EDIT_TOOLS },
  { title: 'PDF Security', tools: SECURITY_TOOLS },
];

export const Navbar: React.FC<NavbarProps> = ({
  onSelectTool,
  onGoHome,
}) => {
  const [isConvertOpen, setIsConvertOpen] = useState(false);
  const [isAllToolsOpen, setIsAllToolsOpen] = useState(false);

  const convertRef = useRef<HTMLDivElement>(null);
  const allToolsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (convertRef.current && !convertRef.current.contains(target)) {
        setIsConvertOpen(false);
      }

      if (allToolsRef.current && !allToolsRef.current.contains(target)) {
        setIsAllToolsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleToolClick = (tool: ToolItem) => {
    if (!tool.routeId) return;

    setIsConvertOpen(false);
    setIsAllToolsOpen(false);
    onSelectTool(tool.routeId);
  };

  const renderToolList = (tools: ToolItem[]) => (
    <div className="space-y-2">
      {tools.map((tool) => {
        const hasRoute = Boolean(tool.routeId);

        return (
          <button
            key={tool.id}
            type="button"
            onClick={() => handleToolClick(tool)}
            disabled={!hasRoute}
            title={!hasRoute ? 'This tool is not connected yet' : tool.description}
            className={`group flex w-full items-center gap-2.5 rounded-md p-1.5 text-left transition-colors ${
              hasRoute
                ? 'hover:bg-slate-50'
                : 'cursor-not-allowed opacity-60'
            }`}
          >
            <ToolBadgeIcon
              iconType={tool.iconType}
              badgeColor={tool.badgeColor}
              size="sm"
            />

            <span className="text-xs font-bold text-slate-700 group-hover:text-primary">
              {tool.title}
            </span>
          </button>
        );
      })}
    </div>
  );

  const renderColumn = (group: ToolGroup) => (
    <div key={group.title} className="min-w-0">
      <h4 className="mb-3.5 text-xs font-bold uppercase tracking-wider text-slate-400">
        {group.title}
      </h4>
      {renderToolList(group.tools)}
    </div>
  );

  return (
  <header className="fixed top-0 left-0 right-0 z-[100] w-full border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur-md">
      <div className="mx-auto flex min-h-16 max-w-[1600px] flex-wrap items-center justify-between gap-x-5 gap-y-3 px-4 py-2 lg:flex-nowrap lg:px-6">

        {/* Logo and navigation */}
        <div className="flex min-w-0 items-center gap-5 xl:gap-7">
          

<button
  type="button"
  onClick={onGoHome}
  className="flex shrink-0 items-center gap-2 text-xl font-black uppercase tracking-wide text-black transition-opacity hover:opacity-80"
  aria-label="DONALD DOC Home"
>
  <span>DONALD</span>
  <img
    src={duckIcon}
    alt="Duck"
    width={36}
    height={36}
    className="h-9 w-9 shrink-0 object-contain"
  />
  <span>DOC</span>
</button>



          <nav className="hidden items-center gap-1 text-[13px] font-bold uppercase tracking-wide text-slate-800 lg:flex">
            {[
              { label: 'Merge PDF', id: 'merge-pdf' },
              { label: 'Split PDF', id: 'split-pdf' },
              { label: 'Compress PDF', id: 'compress-pdf' },
            ].map((item) => {
              const tool = TOOLS_DATA.find((t) => t.id === item.id);

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => tool && handleToolClick(tool)}
                  className="rounded-lg px-2.5 py-2 hover:text-primary"
                >
                  {item.label}
                </button>
              );
            })}

            {/* Convert PDF dropdown */}
            <div className="relative" ref={convertRef}>
              <button
                type="button"
                aria-expanded={isConvertOpen}
                onClick={() => {
                  setIsConvertOpen(!isConvertOpen);
                  setIsAllToolsOpen(false);
                }}
                className="flex items-center gap-1 rounded-lg px-2.5 py-2 hover:text-primary"
              >
                Convert PDF
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${
                    isConvertOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {isConvertOpen && (
                <div className="absolute left-0 top-full z-[60] mt-2 grid w-[480px] grid-cols-2 gap-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
                  {renderColumn({
                    title: 'Convert to PDF',
                    tools: CONVERT_TO_PDF_TOOLS,
                  })}
                  {renderColumn({
                    title: 'Convert from PDF',
                    tools: CONVERT_FROM_PDF_TOOLS,
                  })}
                </div>
              )}
            </div>

            {/* All PDF Tools dropdown */}
            <div className="relative" ref={allToolsRef}>
              <button
                type="button"
                aria-expanded={isAllToolsOpen}
                onClick={() => {
                  setIsAllToolsOpen(!isAllToolsOpen);
                  setIsConvertOpen(false);
                }}
                className={`flex items-center gap-1 rounded-lg border px-3 py-2 transition-colors ${
                  isAllToolsOpen
                    ? 'border-slate-400 text-primary'
                    : 'border-transparent hover:text-primary'
                }`}
              >
                All PDF Tools
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${
                    isAllToolsOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {isAllToolsOpen && (
                <div className="fixed left-3 right-3 top-[72px] z-[60] max-h-[calc(100vh-100px)] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:left-6 sm:right-6 sm:p-7">
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
                    {TOOL_GROUPS.map(renderColumn)}
                  </div>
                </div>
              )}
            </div>
          </nav>
        </div>

       {/* Trust badges */}
<div className="flex flex-1 items-center justify-center gap-2 overflow-x-auto whitespace-nowrap py-1 lg:justify-end">
  <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-[#C7D8FF] bg-[#E8F0FF] px-3 py-2 text-xs font-semibold text-[#273469] shadow-sm">
    <UserRoundCheck className="h-4 w-4 shrink-0" />
    <span>No Signup</span>
  </div>

  <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-[#B8E5DC] bg-[#E5F5F2] px-3 py-2 text-xs font-semibold text-[#217C72] shadow-sm">
    <BadgeCheck className="h-4 w-4 shrink-0" />
    <span>Completely Free</span>
  </div>

  <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-[#D4D8FF] bg-[#EEF0FF] px-3 py-2 text-xs font-semibold text-[#5B50C8] shadow-sm">
    <ShieldCheck className="h-4 w-4 shrink-0" />
    <span>Documents Stay With You</span>
  </div>
        </div>
      </div>
    </header>
  );
};

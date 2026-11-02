import React from 'react';
import { 
  FilePlus2, 
  Scissors, 
  Minimize2, 
  RotateCw, 
  LayoutGrid, 
  FileImage, 
  Image as ImageIcon,
  ShieldCheck,
  Settings,
  HardDrive
} from 'lucide-react';
import { ToolId } from '@/types/tools';

interface SidebarProps {
  activeTool: ToolId;
  onSelectTool: (tool: ToolId) => void;
  onOpenContextMenuSettings?: () => void;
}

interface NavItem {
  id: ToolId;
  label: string;
  icon: React.ElementType;
  badge?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTool,
  onSelectTool,
  onOpenContextMenuSettings,
}) => {
  const tools: NavItem[] = [
    { id: 'merge', label: 'Merge PDFs', icon: FilePlus2, badge: 'FR-1' },
    { id: 'split', label: 'Split & Extract', icon: Scissors, badge: 'FR-2/6' },
    { id: 'compress', label: 'Compress PDF', icon: Minimize2, badge: 'FR-3' },
    { id: 'organize', label: 'Visual Reorder', icon: LayoutGrid, badge: 'FR-7' },
    { id: 'rotate', label: 'Rotate & Delete', icon: RotateCw, badge: 'FR-4/5' },
    { id: 'pdf-to-img', label: 'PDF to Images', icon: FileImage, badge: 'FR-8' },
    { id: 'img-to-pdf', label: 'Images to PDF', icon: ImageIcon, badge: 'FR-9' },
  ];

  return (
    <aside className="w-64 border-r border-slate-200 bg-white flex flex-col justify-between dark:border-slate-800 dark:bg-slate-900 select-none">
      <div>
        {/* Brand Header */}
        <div className="flex items-center space-x-3 px-6 py-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-600 to-brand-400 text-white shadow-md shadow-brand-500/20">
            <HardDrive className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
              PDFLite
              <span className="rounded bg-brand-100 px-1.5 py-0.5 text-[10px] font-semibold text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                v0.1
              </span>
            </h1>
            <p className="text-[11px] font-medium text-slate-400">Offline Desktop PDF</p>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="px-3 py-4 space-y-1">
          <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            PDF Operations
          </div>
          {tools.map((tool) => {
            const Icon = tool.icon;
            const isActive = activeTool === tool.id;

            return (
              <button
                key={tool.id}
                onClick={() => onSelectTool(tool.id)}
                className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/30'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{tool.label}</span>
                </div>
                {tool.badge && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                      isActive
                        ? 'bg-brand-600 text-brand-100'
                        : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
                    }`}
                  >
                    {tool.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer / Context Menu Action */}
      <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
        {onOpenContextMenuSettings && (
          <button
            onClick={onOpenContextMenuSettings}
            className="flex w-full items-center space-x-2.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <Settings className="h-4 w-4 text-slate-400" />
            <span>Windows Context Menu</span>
          </button>
        )}
        <div className="flex items-center space-x-2 px-3 py-1.5 text-[11px] text-slate-400">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
          <span>Zero Network Calls Guaranteed</span>
        </div>
      </div>
    </aside>
  );
};

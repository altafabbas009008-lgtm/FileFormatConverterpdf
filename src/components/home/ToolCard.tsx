import React from 'react';
import { ToolBadgeIcon } from './ToolBadgeIcon';
import { ToolItem } from '@/data/toolsData';

interface ToolCardProps {
  tool: ToolItem;
  onClick: (tool: ToolItem) => void;
}

export const ToolCard: React.FC<ToolCardProps> = ({ tool, onClick }) => {
  return (
    <button
      type="button"
      onClick={() => onClick(tool)}
      className="group relative flex h-full w-full flex-col rounded-2xl border border-slate-200/80 bg-white p-5 text-left shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-[#2A9D8F]/50 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2A9D8F] focus-visible:ring-offset-2"
    >
      {/* Icon and optional badge */}
      <div className="flex w-full items-start justify-between gap-3">
        <ToolBadgeIcon
          iconType={tool.iconType}
          badgeColor={tool.badgeColor}
          size="md"
        />

        {tool.isNew && (
          <span className="shrink-0 rounded-full border border-[#2A9D8F]/20 bg-[#E5F5F2] px-2.5 py-1 text-[10px] font-bold tracking-wide text-[#217C72]">
            NEW
          </span>
        )}
      </div>

      {/* Consistent title and description spacing */}
      <div className="mt-4 flex w-full flex-col">
        <h3 className="text-[17px] font-bold leading-6 tracking-tight text-[#273469] transition-colors group-hover:text-[#2A9D8F]">
          {tool.title}
        </h3>

        <p className="mt-2 line-clamp-3 text-sm leading-5 text-slate-500">
          {tool.description}
        </p>
      </div>

      {/* Compact Open action */}
<div className="mt-3 flex w-full justify-end">
  <span className="text-sm font-semibold text-[#2A9D8F] transition-transform group-hover:translate-x-1">
    Open →
  </span>
</div>
    </button>
  );
};

export default ToolCard;

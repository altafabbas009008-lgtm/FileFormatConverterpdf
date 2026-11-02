import React from 'react';
import { ToolCard } from './ToolCard';
import { ToolCategory, ToolItem, TOOLS_DATA } from '@/data/toolsData';

interface ToolGridProps {
  activeCategory: ToolCategory;
  onSelectTool: (tool: ToolItem) => void;
}

export const ToolGrid: React.FC<ToolGridProps> = ({
  activeCategory,
  onSelectTool,
}) => {
  const filteredTools = TOOLS_DATA.filter((tool) => {
    if (activeCategory === 'All') return true;
    return tool.category === activeCategory;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
        {filteredTools.map((tool) => (
          <ToolCard
            key={tool.id}
            tool={tool}
            onClick={onSelectTool}
          />
        ))}
      </div>
    </div>
  );
};

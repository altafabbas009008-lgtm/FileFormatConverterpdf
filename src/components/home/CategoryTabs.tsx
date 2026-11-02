import React from 'react';
import { ToolCategory } from '@/data/toolsData';

interface CategoryTabsProps {
  activeCategory: ToolCategory;
  onSelectCategory: (category: ToolCategory) => void;
}

const CATEGORIES: ToolCategory[] = [
  'All',
  'Organize PDF',
  'Optimize PDF',
  'Convert PDF',
  'Edit PDF',
  'PDF Security',
];

export const CategoryTabs: React.FC<CategoryTabsProps> = ({
  activeCategory,
  onSelectCategory,
}) => {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2.5 px-4 py-2">
      {CATEGORIES.map((cat) => {
        const isActive = activeCategory === cat;
        return (
          <button
            key={cat}
            onClick={() => onSelectCategory(cat)}
            className={`rounded-full px-5 py-2 text-xs md:text-sm font-medium transition-all duration-150 select-none ${
              isActive
                ? 'bg-slate-900 text-white shadow-md'
                : 'bg-white/90 text-slate-700 hover:bg-white hover:text-slate-900 border border-slate-200/90 shadow-sm hover:border-slate-300'
            }`}
          >
            {cat}
          </button>
        );
      })}
    </div>
  );
};

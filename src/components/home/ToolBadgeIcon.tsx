import React from 'react';
import { 
  RotateCw, 
  LayoutGrid, 
  Image as ImageIcon, 
  FileImage, 
  FileText, 
  Scissors, 
  Trash2, 
  Lock, 
  ShieldCheck, 
  Scan, 
  Wrench, 
  Crop, 
  Sparkles, 
  Languages 
} from 'lucide-react';

interface ToolBadgeIconProps {
  iconType: string;
  badgeColor?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const ToolBadgeIcon: React.FC<ToolBadgeIconProps> = ({
  iconType,
  badgeColor = '#ea3636',
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8 rounded-lg text-sm',
    md: 'w-12 h-12 rounded-xl text-base',
    lg: 'w-16 h-16 rounded-2xl text-xl',
  }[size];

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  }[size];

  // Specific bespoke badge designs matching iLovePDF:
  switch (iconType) {
    case 'merge':
      return (
        <div
          className={`${sizeClasses} flex items-center justify-center text-white shadow-sm flex-shrink-0 relative overflow-hidden`}
          style={{ backgroundColor: badgeColor }}
        >
          {/* Visual 2 pages merging into 1 */}
          <div className="flex items-center justify-center relative">
            <svg className={iconSizes} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4v6h6" />
              <path d="M4 10l6-6" />
              <path d="M20 20v-6h-6" />
              <path d="M20 14l-6 6" />
            </svg>
          </div>
        </div>
      );

    case 'split':
      return (
        <div
          className={`${sizeClasses} flex items-center justify-center text-white shadow-sm flex-shrink-0`}
          style={{ backgroundColor: badgeColor }}
        >
          <svg className={iconSizes} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 4h6v6" />
            <path d="M20 4l-6 6" />
            <path d="M10 20H4v-6" />
            <path d="M4 20l6-6" />
          </svg>
        </div>
      );

    case 'compress':
      return (
        <div
          className={`${sizeClasses} flex items-center justify-center text-white shadow-sm flex-shrink-0`}
          style={{ backgroundColor: badgeColor }}
        >
          <svg className={iconSizes} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 9h5V4" />
            <path d="M4 9l5-5" />
            <path d="M20 9h-5V4" />
            <path d="M20 9l-5-5" />
            <path d="M4 15h5v5" />
            <path d="M4 15l5 5" />
            <path d="M20 15h-5v5" />
            <path d="M20 15l-5 5" />
          </svg>
        </div>
      );

    case 'word':
      return (
        <div
          className={`${sizeClasses} flex items-center justify-center text-white shadow-sm font-bold flex-shrink-0`}
          style={{ backgroundColor: '#2b579a' }}
        >
          <span className="text-sm font-black tracking-tighter">W</span>
        </div>
      );

    case 'ppt':
      return (
        <div
          className={`${sizeClasses} flex items-center justify-center text-white shadow-sm font-bold flex-shrink-0`}
          style={{ backgroundColor: '#d24726' }}
        >
          <span className="text-sm font-black tracking-tighter">P</span>
        </div>
      );

    case 'excel':
      return (
        <div
          className={`${sizeClasses} flex items-center justify-center text-white shadow-sm font-bold flex-shrink-0`}
          style={{ backgroundColor: '#107c41' }}
        >
          <span className="text-sm font-black tracking-tighter">X</span>
        </div>
      );

    case 'rotate':
      return (
        <div
          className={`${sizeClasses} flex items-center justify-center text-white shadow-sm flex-shrink-0`}
          style={{ backgroundColor: badgeColor }}
        >
          <RotateCw className={iconSizes} />
        </div>
      );

    case 'organize':
      return (
        <div
          className={`${sizeClasses} flex items-center justify-center text-white shadow-sm flex-shrink-0 font-bold`}
          style={{ backgroundColor: badgeColor }}
        >
          <LayoutGrid className={iconSizes} />
        </div>
      );

    case 'remove-pages':
      return (
        <div
          className={`${sizeClasses} flex items-center justify-center text-white shadow-sm flex-shrink-0`}
          style={{ backgroundColor: badgeColor }}
        >
          <Trash2 className={iconSizes} />
        </div>
      );

    case 'extract-pages':
      return (
        <div
          className={`${sizeClasses} flex items-center justify-center text-white shadow-sm flex-shrink-0`}
          style={{ backgroundColor: badgeColor }}
        >
          <Scissors className={iconSizes} />
        </div>
      );

    case 'pdf-to-img':
      return (
        <div
          className={`${sizeClasses} flex items-center justify-center text-white shadow-sm flex-shrink-0`}
          style={{ backgroundColor: badgeColor }}
        >
          <FileImage className={iconSizes} />
        </div>
      );

    case 'img-to-pdf':
      return (
        <div
          className={`${sizeClasses} flex items-center justify-center text-white shadow-sm flex-shrink-0`}
          style={{ backgroundColor: badgeColor }}
        >
          <ImageIcon className={iconSizes} />
        </div>
      );

    case 'unlock':
      return (
        <div
          className={`${sizeClasses} flex items-center justify-center text-white shadow-sm flex-shrink-0`}
          style={{ backgroundColor: badgeColor }}
        >
          <Lock className={iconSizes} />
        </div>
      );

    case 'protect':
      return (
        <div
          className={`${sizeClasses} flex items-center justify-center text-white shadow-sm flex-shrink-0`}
          style={{ backgroundColor: badgeColor }}
        >
          <ShieldCheck className={iconSizes} />
        </div>
      );

    case 'scan':
      return (
        <div
          className={`${sizeClasses} flex items-center justify-center text-white shadow-sm flex-shrink-0`}
          style={{ backgroundColor: badgeColor }}
        >
          <Scan className={iconSizes} />
        </div>
      );

    case 'repair':
      return (
        <div
          className={`${sizeClasses} flex items-center justify-center text-white shadow-sm flex-shrink-0`}
          style={{ backgroundColor: badgeColor }}
        >
          <Wrench className={iconSizes} />
        </div>
      );

    case 'crop':
      return (
        <div
          className={`${sizeClasses} flex items-center justify-center text-white shadow-sm flex-shrink-0`}
          style={{ backgroundColor: badgeColor }}
        >
          <Crop className={iconSizes} />
        </div>
      );

    case 'ai':
      return (
        <div
          className={`${sizeClasses} flex items-center justify-center text-white shadow-sm flex-shrink-0`}
          style={{ backgroundColor: badgeColor }}
        >
          <Sparkles className={iconSizes} />
        </div>
      );

    case 'translate':
      return (
        <div
          className={`${sizeClasses} flex items-center justify-center text-white shadow-sm flex-shrink-0`}
          style={{ backgroundColor: badgeColor }}
        >
          <Languages className={iconSizes} />
        </div>
      );

    case 'markdown':
      return (
        <div
          className={`${sizeClasses} flex items-center justify-center text-white shadow-sm flex-shrink-0 font-mono font-bold text-xs`}
          style={{ backgroundColor: badgeColor }}
        >
          <span>{`{#}`}</span>
        </div>
      );

    default:
      return (
        <div
          className={`${sizeClasses} flex items-center justify-center text-white shadow-sm flex-shrink-0`}
          style={{ backgroundColor: badgeColor }}
        >
          <FileText className={iconSizes} />
        </div>
      );
  }
};

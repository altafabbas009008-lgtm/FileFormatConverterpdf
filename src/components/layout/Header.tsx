import React from 'react';
import { Shield } from 'lucide-react';

interface HeaderProps {
  title: string;
  tagline: string;
}

export const Header: React.FC<HeaderProps> = ({ title, tagline }) => {
  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 px-8 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80 sticky top-0 z-20">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          {title}
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">{tagline}</p>
      </div>

      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2 rounded-full border border-emerald-200 bg-emerald-50/80 px-3 py-1 text-xs font-medium text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
          </span>
          <Shield className="h-3.5 w-3.5" />
          <span>Local Engine • 100% Offline</span>
        </div>
      </div>
    </header>
  );
};

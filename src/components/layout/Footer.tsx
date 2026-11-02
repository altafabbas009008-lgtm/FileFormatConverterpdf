import React from 'react';
import duckIcon from '@/assets/duck-icon.png';
import {
  ShieldCheck,
  BadgeCheck,
  UserRoundCheck,
  Code2,
  Award,
  Layers,
  Sparkles,
} from 'lucide-react';

interface FooterProps {
  onSelectTool?: (toolId: string) => void;
  onGoHome?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onSelectTool, onGoHome }) => {
  return (
    <footer className="mt-20 border-t border-slate-200/80 bg-white/95 backdrop-blur-md text-slate-700 relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-12">
          
          {/* Column 1: About Donald Doc / App Information */}
          <div className="lg:col-span-5 space-y-4">
            <button
              type="button"
              onClick={onGoHome}
              className="flex items-center gap-2 text-xl font-black uppercase tracking-wide text-black transition-opacity hover:opacity-80"
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

            <p className="text-xs font-bold tracking-wide uppercase text-[#273469] flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-[#5B50C8]" />
              Privacy-First All-in-One PDF &amp; Document Suite
            </p>

            <p className="text-sm text-slate-600 leading-relaxed">
              <strong>Donald Doc</strong> is a comprehensive, lightweight document management platform designed to give you 
              seamless manipulation of your PDFs. Merge, split, compress, convert (Word, Excel, PowerPoint, JPG, HTML), 
              extract text with OCR, organize pages, and add secure digital signatures directly in your browser. 
              No accounts, no watermarks, and completely free to use.
            </p>

            {/* 3 Privacy & Value Pills */}
            <div className="flex flex-wrap gap-2 pt-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border border-[#C7D8FF] bg-[#E8F0FF] text-[#273469] shadow-2xs">
                <UserRoundCheck className="h-3.5 w-3.5 shrink-0 text-[#273469]" />
                No login/signup
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border border-[#B8E5DC] bg-[#E5F5F2] text-[#217C72] shadow-2xs">
                <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-[#217C72]" />
                Completely free
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border border-[#D4D8FF] bg-[#EEF0FF] text-[#5B50C8] shadow-2xs">
                <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-[#5B50C8]" />
                Documents stay with you
              </span>
            </div>
          </div>

          {/* Column 2: Popular Tools */}
          <div className="lg:col-span-3 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-[#273469]" />
              Popular Tools
            </h3>
            <ul className="space-y-2 text-sm text-slate-600 font-medium">
              {[
                { label: 'Merge PDF', id: 'merge' },
                { label: 'Split PDF', id: 'split' },
                { label: 'Compress PDF', id: 'compress' },
                { label: 'Word to PDF', id: 'word-to-pdf' },
                { label: 'PDF to Word', id: 'pdf-to-word' },
                { label: 'JPG to PDF', id: 'img-to-pdf' },
                { label: 'OCR Text Extract', id: 'ocr-pdf' },
                { label: 'Organize Pages', id: 'organize' },
              ].map((tool) => (
                <li key={tool.id}>
                  <button
                    type="button"
                    onClick={() => onSelectTool?.(tool.id)}
                    className="hover:text-[#5B50C8] transition-colors text-left flex items-center gap-1.5 group"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-300 group-hover:bg-[#5B50C8] transition-colors" />
                    <span>{tool.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Builders & Mentor */}
          <div className="lg:col-span-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
              <Code2 className="h-3.5 w-3.5 text-[#273469]" />
              Project Builders &amp; Mentorship
            </h3>
            <p className="text-xs text-slate-500">
              Developed by passionate builders with architectural mentorship:
            </p>

            <div className="space-y-2.5 pt-1">
              {/* Altaf Abbas */}
              <div className="rounded-xl border border-slate-200/90 bg-slate-50/70 p-3 shadow-2xs hover:border-[#5B50C8]/40 hover:bg-white hover:shadow-xs transition-all duration-150">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-full bg-[#E8F0FF] text-[#273469] font-bold text-xs flex items-center justify-center shrink-0 border border-[#C7D8FF]">
                      AA
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-bold text-slate-900">Altaf Abbas</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E8F0FF] text-[#273469] border border-[#C7D8FF]">
                          Builder
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 leading-tight mt-0.5">
                        Lead Developer • Full-stack PDF engines &amp; architecture
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <a
                      href="https://github.com/altafabbas009008-lgtm"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center h-7 w-7 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-colors"
                      title="Altaf Abbas on GitHub"
                      aria-label="Altaf Abbas on GitHub"
                    >
                      <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                        <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
                      </svg>
                    </a>
                    <a
                      href="https://www.linkedin.com/in/altaf-abbas-6075423a8/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center h-7 w-7 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-[#0a66c2] hover:text-white hover:border-[#0a66c2] transition-colors"
                      title="Altaf Abbas on LinkedIn"
                      aria-label="Altaf Abbas on LinkedIn"
                    >
                      <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9h2.77v8.37H6.46v-8.37M7.84 6.2a1.62 1.62 0 1 0 0 3.24 1.62 1.62 0 0 0 0-3.24z"/>
                      </svg>
                    </a>
                  </div>
                </div>
              </div>

              {/* Aman Varma */}
              <div className="rounded-xl border border-slate-200/90 bg-slate-50/70 p-3 shadow-2xs hover:border-[#217C72]/40 hover:bg-white hover:shadow-xs transition-all duration-150">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-full bg-[#E5F5F2] text-[#217C72] font-bold text-xs flex items-center justify-center shrink-0 border border-[#B8E5DC]">
                      AV
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-bold text-slate-900">Aman Varma</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E5F5F2] text-[#217C72] border border-[#B8E5DC]">
                          Teammate
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 leading-tight mt-0.5">
                        Co-Developer • UI components &amp; tool integrations
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <a
                      href="https://github.com/aman21122006"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center h-7 w-7 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-colors"
                      title="Aman Varma on GitHub"
                      aria-label="Aman Varma on GitHub"
                    >
                      <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                        <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
                      </svg>
                    </a>
                    <a
                      href="https://www.linkedin.com/in/aman-varma-616a813b9"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center h-7 w-7 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-[#0a66c2] hover:text-white hover:border-[#0a66c2] transition-colors"
                      title="Aman Varma on LinkedIn"
                      aria-label="Aman Varma on LinkedIn"
                    >
                      <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9h2.77v8.37H6.46v-8.37M7.84 6.2a1.62 1.62 0 1 0 0 3.24 1.62 1.62 0 0 0 0-3.24z"/>
                      </svg>
                    </a>
                  </div>
                </div>
              </div>

              {/* Hardik Chadda */}
              <div className="rounded-xl border border-slate-200/90 bg-slate-50/70 p-3 shadow-2xs hover:border-[#5B50C8]/40 hover:bg-white hover:shadow-xs transition-all duration-150">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-full bg-[#EEF0FF] text-[#5B50C8] font-bold text-xs flex items-center justify-center shrink-0 border border-[#D4D8FF]">
                      HC
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-bold text-slate-900">Hardik Chadda</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EEF0FF] text-[#5B50C8] border border-[#D4D8FF] flex items-center gap-1">
                          <Award className="h-3 w-3" />
                          Project Mentor
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 leading-tight mt-0.5">
                        Technical Mentorship • Engineering best practices &amp; guidance
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <a
                      href="https://github.com/hardikchadda"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center h-7 w-7 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-colors"
                      title="Hardik Chadda on GitHub"
                      aria-label="Hardik Chadda on GitHub"
                    >
                      <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                        <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
                      </svg>
                    </a>
                    <a
                      href="https://www.linkedin.com/in/hardik-chadda/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center h-7 w-7 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-[#0a66c2] hover:text-white hover:border-[#0a66c2] transition-colors"
                      title="Hardik Chadda on LinkedIn"
                      aria-label="Hardik Chadda on LinkedIn"
                    >
                      <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9h2.77v8.37H6.46v-8.37M7.84 6.2a1.62 1.62 0 1 0 0 3.24 1.62 1.62 0 0 0 0-3.24z"/>
                      </svg>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>
            &copy; 2026 <strong className="text-slate-800">DONALD DOC</strong>. Privacy-First Document Management.
          </p>
          <div className="flex items-center space-x-3 font-medium text-slate-600 flex-wrap justify-center">
            <span>Built with React, TypeScript &amp; Tailwind CSS</span>
            <span>•</span>
            <span>Zero Tracking</span>
            <span>•</span>
            <span>100% Free</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

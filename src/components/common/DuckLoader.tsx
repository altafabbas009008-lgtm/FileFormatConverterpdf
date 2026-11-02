import React, { useEffect, useRef, useState } from 'react';
import duckIcon from '@/assets/duck-icon.png';

interface DuckLoaderProps {
  label?: string;
  progress?: number;
  showText?: boolean;
}

const DuckLoader: React.FC<DuckLoaderProps> = ({
  progress,
  showText = false,
  label = 'Processing...',
}) => {
  const [visualProgress, setVisualProgress] = useState(0);
  const startTime = useRef(Date.now());
  const targetProgress = Math.max(
    0,
    Math.min(100, progress !== undefined ? progress : 100)
  );

  useEffect(() => {
    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime.current;

      // Small PDFs / quick tools: Duck takes at least 4 seconds.
      // Large PDFs: Duck follows actual processing progress.
      const minimumTimeProgress = Math.min(
        100,
        (elapsed / 4000) * 100
      );

      const nextProgress =
        elapsed < 4000
          ? Math.min(targetProgress, minimumTimeProgress)
          : targetProgress;

      setVisualProgress(nextProgress);
    }, 40);

    return () => clearInterval(timer);
  }, [targetProgress]);

  const footprintCount = Math.floor(
    (visualProgress / 100) * 20
  );

  return (
    <div className="w-full rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      {showText && (
        <p className="mb-3 text-sm font-semibold text-[#273469]">
          {label} {Math.round(visualProgress)}%
        </p>
      )}

      <div className="duck-walk-area">
        <div
          className="duck-footprint-trail"
          style={{ width: `${visualProgress}%` }}
          aria-hidden="true"
        >
          {Array.from({ length: footprintCount }).map((_, i) => (
            <span
              key={i}
              className="duck-footprint"
              style={{
                opacity: 0.25 + (i / 20) * 0.65,
              }}
            >
              🐾
            </span>
          ))}
        </div>

        <img
          src={duckIcon}
          alt="Walking duck"
          className="duck-walker"
          style={{
            left: `calc(${visualProgress}% - ${visualProgress * 0.4}px)`,
          }}
        />
      </div>
    </div>
  );
};

export default DuckLoader;

import React, { useState, useRef, useEffect } from 'react';

interface FileViewerItemProps {
  url: string;
  index: number;
}

export const FileViewerItem: React.FC<FileViewerItemProps> = ({ url, index }) => {
  const isImage = Boolean(url.match(/\.(jpeg|jpg|gif|png|webp|bmp)$/i));
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleRotate = () => setRotation((r) => (r + 90) % 360);

  // Ctrl + Left Click or Ctrl + Wheel Zooming
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.ctrlKey && e.button === 0) {
      e.preventDefault();
      setZoom((z) => (z >= 2.5 ? 1 : z + 0.5));
    }
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        setZoom((z) => (e.deltaY < 0 ? Math.min(z + 0.15, 4) : Math.max(z - 0.15, 0.5)));
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleWheel);
    };
  }, []);

  return (
    <div className="flex flex-col border border-slate-200 rounded-lg p-1.5 sm:p-2 bg-white shadow-sm flex-1 min-h-0 h-full">
      <div className="flex justify-between items-center mb-1 gap-2 shrink-0">
        <span className="text-xs font-bold text-slate-800 truncate">
          Tài liệu {index + 1}
        </span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleRotate}
            title="Xoay xoay 90 độ"
            className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 h-[26px] px-2 rounded-md text-[11px] font-bold transition-all"
          >
            <span className="material-symbols-outlined text-[14px]">rotate_left</span> Xoay
          </button>
          <a
            href={`${url}?download=`}
            download
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 bg-primary text-white h-[26px] px-2.5 rounded-md text-[11px] font-bold hover:opacity-90 active:scale-95 transition-all shadow-xs"
          >
            <span className="material-symbols-outlined text-[13px]">download</span> Tải về
          </a>
        </div>
      </div>

      {/* Document Viewport */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        className="w-full flex-1 overflow-auto bg-slate-900/5 rounded-md flex items-center justify-center p-0.5 min-h-0 relative select-none cursor-zoom-in h-full"
      >
        <div
          className="transition-transform duration-200 ease-out origin-center flex items-center justify-center w-full h-full"
          style={{ transform: `scale(${zoom})` }}
        >
          {isImage ? (
            <img
              src={url}
              alt={`File ${index + 1}`}
              className="max-w-full max-h-full object-contain shadow-sm rounded border border-slate-200 bg-white transition-transform duration-200"
              style={{ transform: `rotate(${rotation}deg)` }}
            />
          ) : (
            <iframe
              src={url.includes('#') ? url : `${url}#toolbar=0&navpanes=0&scrollbar=0`}
              className="w-full h-full rounded border border-slate-200 bg-white shadow-xs transition-transform duration-200"
              style={{ transform: `rotate(${rotation}deg)` }}
              title={`File ${index + 1}`}
            />
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useState, useRef, useEffect } from 'react';

interface FileViewerItemProps {
  url: string;
  index: number;
}

export const FileViewerItem: React.FC<FileViewerItemProps> = ({ url, index }) => {
  const isImage = Boolean(url.match(/\.(jpeg|jpg|gif|png|webp|bmp)$/i));
  const [zoom, setZoom] = useState<number>(1);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 4));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.5));
  const handleResetZoom = () => setZoom(1);

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
      <div className="flex flex-wrap justify-between items-center mb-1 gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-800 truncate">
            Tài liệu {index + 1}
          </span>
          <span className="text-[11px] text-slate-400 italic hidden sm:inline">
            (💡 Giữ <kbd className="px-1 bg-slate-100 border border-slate-300 rounded font-sans not-italic font-bold text-[10px]">Ctrl</kbd> + Click hoặc Cuộn chuột để Thu/Phóng)
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-slate-100 px-1 py-0.5 rounded-md border border-slate-200 text-xs">
            <button
              onClick={handleZoomOut}
              title="Thu nhỏ"
              className="p-0.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded transition-colors"
            >
              <span className="material-symbols-outlined text-[15px]">remove</span>
            </button>
            <span className="px-1 font-bold text-slate-700 text-[11px] min-w-[36px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              title="Phóng to"
              className="p-0.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded transition-colors"
            >
              <span className="material-symbols-outlined text-[15px]">add</span>
            </button>
            <button
              onClick={handleResetZoom}
              title="Khôi phục kích thước ban đầu"
              className="px-1 py-0.5 text-[10px] font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded transition-colors"
            >
              100%
            </button>
          </div>

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
          className="transition-transform duration-150 ease-out origin-center flex items-center justify-center w-full h-full"
          style={{ transform: `scale(${zoom})` }}
        >
          {isImage ? (
            <img
              src={url}
              alt={`File ${index + 1}`}
              className="max-w-full max-h-full object-contain shadow-sm rounded border border-slate-200 bg-white"
            />
          ) : (
            <iframe
              src={url}
              className="w-full h-full rounded border border-slate-200 bg-white shadow-xs"
              title={`File ${index + 1}`}
            />
          )}
        </div>
      </div>
    </div>
  );
};

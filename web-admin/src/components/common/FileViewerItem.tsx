import React, { useState, useRef, useEffect } from 'react';

interface FileViewerItemProps {
  url: string;
  index: number;
}

export const FileViewerItem: React.FC<FileViewerItemProps> = ({ url, index }) => {
  const isImage = Boolean(url.match(/\.(jpeg|jpg|gif|png|webp|bmp)$/i));
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragMode, setDragMode] = useState<boolean>(true);

  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleRotate = () => setRotation((r) => (r + 90) % 360);
  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 4));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.5));
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  };

  // Mouse Drag to Pan (Kéo di chuyển tài liệu bằng chuột)
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button === 0) {
      if (e.ctrlKey) {
        e.preventDefault();
        setZoom((z) => (z >= 2.5 ? 1 : z + 0.5));
        return;
      }
      setIsDragging(true);
      dragStartRef.current = { x: e.clientX - position.x, y: e.clientY - position.y };
    }
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMoveGlobal = (e: MouseEvent) => {
      setPosition({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y,
      });
    };

    const handleMouseUpGlobal = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMoveGlobal);
    window.addEventListener('mouseup', handleMouseUpGlobal);
    return () => {
      window.removeEventListener('mousemove', handleMouseMoveGlobal);
      window.removeEventListener('mouseup', handleMouseUpGlobal);
    };
  }, [isDragging]);

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
    <div className="flex flex-col border border-slate-200 rounded-lg p-1.5 sm:p-2 bg-white shadow-sm flex-1 min-h-0 h-full select-none">
      {/* Header Toolbar */}
      <div className="flex flex-wrap justify-between items-center mb-1.5 gap-2 shrink-0 border-b border-slate-100 pb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-800 truncate">
            Tài liệu {index + 1}
          </span>
          <span className="text-[11px] text-slate-400 italic hidden md:inline">
            (💡 Nhấn giữ chuột trái để kéo di chuyển trang sang Trái/Phải/Lên/Xuống | <kbd className="px-1 bg-slate-100 border border-slate-300 rounded font-sans not-italic font-bold text-[10px]">Ctrl</kbd> + Cuộn chuột để Thu/Phóng)
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Toggle Drag Mode for PDF */}
          {!isImage && (
            <button
              onClick={() => setDragMode((m) => !m)}
              title={dragMode ? 'Đang ở Chế độ Bàn tay kéo di chuyển (Nhấp để chuyển sang chế độ Cuộn file)' : 'Đang ở Chế độ Cuộn file (Nhấp để chuyển sang chế độ Bàn tay kéo di chuyển)'}
              className={`flex items-center gap-1 h-[26px] px-2 rounded-md text-[11px] font-bold border transition-all ${
                dragMode
                  ? 'bg-blue-50 text-primary border-blue-200 shadow-xs'
                  : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">
                {dragMode ? 'pan_tool' : 'touch_app'}
              </span>
              {dragMode ? 'Bàn tay kéo' : 'Cuộn file'}
            </button>
          )}

          {/* Zoom controls */}
          <div className="flex items-center gap-0.5 bg-slate-100 px-1 py-0.5 rounded-md border border-slate-200 text-xs">
            <button
              onClick={handleZoomOut}
              title="Thu nhỏ (-)"
              className="p-0.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded transition-colors"
            >
              <span className="material-symbols-outlined text-[15px]">remove</span>
            </button>
            <span className="px-1 font-bold text-slate-700 text-[11px] min-w-[38px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              title="Phóng to (+)"
              className="p-0.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded transition-colors"
            >
              <span className="material-symbols-outlined text-[15px]">add</span>
            </button>
            <button
              onClick={handleReset}
              title="Khôi phục mặc định"
              className="px-1.5 py-0.5 text-[10px] font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded transition-colors border-l border-slate-200 ml-0.5"
            >
              100%
            </button>
          </div>

          {/* Rotate Button */}
          <button
            onClick={handleRotate}
            title="Xoay 90 độ"
            className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 h-[26px] px-2 rounded-md text-[11px] font-bold transition-all"
          >
            <span className="material-symbols-outlined text-[14px]">rotate_left</span> Xoay
          </button>

          {/* Download Button */}
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

      {/* Single Clean Main Document Viewport with Mouse Drag & Zoom */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        className={`w-full flex-1 min-h-0 relative h-full bg-slate-900/5 rounded-md overflow-auto border border-slate-200 flex items-center justify-center p-1 select-none ${
          isImage || dragMode ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : ''
        }`}
      >
        {/* Invisible Overlay Layer to capture Drag Events across PDF iframe */}
        {!isImage && dragMode && (
          <div
            onMouseDown={handleMouseDown}
            className="absolute inset-0 z-20 cursor-grab active:cursor-grabbing bg-transparent"
          />
        )}

        <div
          className="transition-transform duration-75 ease-out origin-center flex items-center justify-center w-full h-full min-w-full min-h-full"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
          }}
        >
          {isImage ? (
            <img
              src={url}
              alt={`File ${index + 1}`}
              className="max-w-full max-h-full object-contain shadow-sm rounded border border-slate-200 bg-white transition-transform duration-200 pointer-events-none"
              style={{ transform: `rotate(${rotation}deg)` }}
            />
          ) : (
            <iframe
              src={`${url}#navpanes=0&toolbar=0`}
              className="w-full h-full min-w-full min-h-full rounded border border-slate-200 bg-white shadow-xs transition-transform duration-200"
              style={{ transform: `rotate(${rotation}deg)` }}
              title={`File ${index + 1}`}
            />
          )}
        </div>
      </div>
    </div>
  );
};

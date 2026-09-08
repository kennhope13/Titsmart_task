import React, { useState, useRef, useEffect } from 'react';

interface FileViewerItemProps {
  url: string;
  index: number;
}

export const FileViewerItem: React.FC<FileViewerItemProps> = ({ url, index }) => {
  const isImage = Boolean(url.match(/\.(jpeg|jpg|gif|png|webp|bmp)$/i));
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [showPages, setShowPages] = useState<boolean>(true);

  // Width of left PDF page thumbnails column (in px)
  const [sidebarWidth, setSidebarWidth] = useState<number>(260); // Mặc định 260px
  const [isResizingSidebar, setIsResizingSidebar] = useState<boolean>(false);
  const resizeStartRef = useRef<{ startX: number; startWidth: number }>({ startX: 0, startWidth: 260 });
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

  const handleRotate = () => setRotation((r) => (r + 90) % 360);
  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 4));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.5));
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
  };

  // Measure container dimensions for rotation aspect ratio calculation
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateSize = () => {
      setContainerSize({ w: el.clientWidth, h: el.clientHeight });
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Start dragging split bar (Kéo thanh vạch sang Trái / Phải)
  const handleSidebarResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingSidebar(true);
    resizeStartRef.current = { startX: e.clientX, startWidth: sidebarWidth };
  };

  useEffect(() => {
    if (!isResizingSidebar) return;

    const handleMouseMoveGlobal = (e: MouseEvent) => {
      const deltaX = e.clientX - resizeStartRef.current.startX;
      const newWidth = Math.max(100, Math.min(700, resizeStartRef.current.startWidth + deltaX));
      setSidebarWidth(newWidth);
    };

    const handleMouseUpGlobal = () => {
      setIsResizingSidebar(false);
    };

    window.addEventListener('mousemove', handleMouseMoveGlobal);
    window.addEventListener('mouseup', handleMouseUpGlobal);
    return () => {
      window.removeEventListener('mousemove', handleMouseMoveGlobal);
      window.removeEventListener('mouseup', handleMouseUpGlobal);
    };
  }, [isResizingSidebar]);

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

  // Check if rotated 90deg or 270deg (Xoay ngang)
  const isRotated90 = Math.abs(rotation % 180) === 90;

  const getRotatedContentStyle = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      transform: `rotate(${rotation}deg)`,
      transition: 'transform 200ms ease, width 200ms ease, height 200ms ease',
    };

    if (isRotated90 && containerSize.w > 0 && containerSize.h > 0) {
      // Swap width & height so after 90/270 degree rotation, visual dimensions match container (W, H)
      base.width = `${containerSize.h}px`;
      base.height = `${containerSize.w}px`;
    } else {
      base.width = '100%';
      base.height = '100%';
      base.minWidth = '100%';
      base.minHeight = '100%';
    }

    return base;
  };

  return (
    <div className="flex flex-col border border-slate-200 rounded-lg p-1.5 sm:p-2 bg-white shadow-sm flex-1 min-h-0 h-full select-none">
      {/* Header Toolbar */}
      <div className="flex flex-wrap justify-between items-center mb-1.5 gap-2 shrink-0 border-b border-slate-100 pb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-800 truncate">
            Tài liệu {index + 1}
          </span>
          <span className="text-[11px] text-slate-400 italic hidden md:inline">
            (💡 Kéo vạch xám đứng sang Trái/Phải để thay đổi kích thước cột xem trang | <kbd className="px-1 bg-slate-100 border border-slate-300 rounded font-sans not-italic font-bold text-[10px]">Ctrl</kbd> + Cuộn chuột để Thu/Phóng)
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Toggle PDF Pages Sidebar */}
          {!isImage && (
            <button
              onClick={() => setShowPages((prev) => !prev)}
              title={showPages ? 'Đang hiện danh sách trang PDF (Nhấp để ẩn)' : 'Đang ẩn danh sách trang (Nhấp để bật)'}
              className={`flex items-center gap-1 h-[26px] px-2 rounded-md text-[11px] font-bold border transition-all ${
                showPages
                  ? 'bg-blue-50 text-primary border-blue-200 shadow-xs'
                  : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">view_sidebar</span>
              {showPages ? 'Danh sách trang: Hiện' : 'Danh sách trang: Ẩn'}
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

      {/* Main Split Container */}
      <div className="w-full flex-1 flex min-h-0 relative h-full bg-slate-900/5 rounded-md overflow-hidden border border-slate-200">
        
        {/* Transparent Overlay during resize to ensure continuous drag over iframes */}
        {isResizingSidebar && (
          <div className="fixed inset-0 z-50 cursor-col-resize bg-transparent" />
        )}

        {/* Left PDF Pages Column */}
        {!isImage && showPages && (
          <>
            <div
              style={{ width: `${sidebarWidth}px` }}
              className="h-full bg-slate-800 shrink-0 relative overflow-hidden hidden sm:block"
            >
              <iframe
                src={`${url}#navpanes=1&pagemode=thumbs&toolbar=0`}
                className="w-full h-full border-0"
                title={`Sidebar Pages ${index + 1}`}
              />
            </div>

            {/* Resizer Splitter Handle Bar (Kéo vạch này sang Trái / Phải) */}
            <div
              onMouseDown={handleSidebarResizeStart}
              title="Nhấn giữ chuột & Kéo vạch này sang Trái / Phải để thay đổi kích thước cột bên trái"
              className="w-2.5 bg-slate-300 hover:bg-primary cursor-col-resize shrink-0 transition-colors flex items-center justify-center group z-30 select-none border-x border-slate-400/40 active:bg-blue-600"
            >
              <div className="w-0.5 h-10 bg-slate-600 group-hover:bg-white rounded-full" />
            </div>
          </>
        )}

        {/* Right Main Document Viewport */}
        <div
          ref={containerRef}
          className="flex-1 min-h-0 relative h-full overflow-auto always-visible-scrollbar flex items-center justify-center p-1"
        >
          <div
            className="transition-transform duration-75 ease-out origin-center flex items-center justify-center"
            style={{
              transform: `scale(${zoom})`,
              width: zoom > 1 ? `${zoom * 100}%` : '100%',
              height: zoom > 1 ? `${zoom * 100}%` : '100%',
              minWidth: '100%',
              minHeight: '100%',
            }}
          >
            {isImage ? (
              <img
                src={url}
                alt={`File ${index + 1}`}
                className="max-w-full max-h-full object-contain shadow-sm rounded border border-slate-200 bg-white"
                style={getRotatedContentStyle()}
              />
            ) : (
              <iframe
                src={`${url}#navpanes=0&toolbar=0`}
                className="rounded border border-slate-200 bg-white shadow-xs"
                style={getRotatedContentStyle()}
                title={`File ${index + 1}`}
              />
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

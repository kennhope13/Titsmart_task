import React, { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';

interface FileViewerItemProps {
  url: string;
  index: number;
}

export const FileViewerItem: React.FC<FileViewerItemProps> = ({ url, index }) => {
  const isImage = Boolean(url.match(/\.(jpeg|jpg|gif|png|webp|bmp)$/i));
  const isExcel = Boolean(url.match(/\.(xlsx|xls|csv)$/i));
  const [excelHtml, setExcelHtml] = useState<string>('');
  const [excelLoading, setExcelLoading] = useState<boolean>(false);
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragMode, setDragMode] = useState<boolean>(false);

  useEffect(() => {
    if (!isExcel || !url) return;
    let isMounted = true;
    setExcelLoading(true);
    setExcelHtml('');

    fetch(url)
      .then((res) => res.arrayBuffer())
      .then((buffer) => {
        if (!isMounted) return;
        const workbook = XLSX.read(buffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        if (firstSheetName) {
          const sheet = workbook.Sheets[firstSheetName];
          const html = XLSX.utils.sheet_to_html(sheet, { header: '', footer: '' });
          setExcelHtml(html);
        }
      })
      .catch((err) => {
        console.warn('Failed to parse Excel arrayBuffer locally:', err);
      })
      .finally(() => {
        if (isMounted) setExcelLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [url, isExcel]);

  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

  const handleRotate = () => setRotation((r) => (r + 90) % 360);
  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 4));
  const handleZoomOut = () => {
    setZoom((z) => {
      const next = Math.max(z - 0.25, 0.5);
      if (next <= 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  };
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  };

  const handleToggleDragMode = () => {
    setDragMode((prev) => {
      const next = !prev;
      if (!next && zoom <= 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  };

  // Mouse Drag to Pan khi Bàn tay kéo bật hoặc Zoom > 1
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button === 0 && (zoom > 1 || dragMode || isImage)) {
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

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        setZoom((z) => {
          const next = e.deltaY < 0 ? Math.min(z + 0.15, 4) : Math.max(z - 0.15, 0.5);
          if (next <= 1) setPosition({ x: 0, y: 0 });
          return next;
        });
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleWheel);
    };
  }, []);

  // Check if rotated 90deg or 270deg (Xoay ngang)
  const isRotated90 = Math.abs(rotation % 180) === 90;

  const getContentTransformStyle = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      transform: `translate(${position.x}px, ${position.y}px) scale(${zoom}) rotate(${rotation}deg)`,
      transformOrigin: 'center center',
      transition: isDragging ? 'none' : 'transform 100ms ease-out, width 200ms ease, height 200ms ease',
    };

    if (isRotated90 && containerSize.w > 0 && containerSize.h > 0) {
      // Swap width & height so after 90/270 degree rotation, visual dimensions match container (W, H)
      base.width = `${containerSize.h}px`;
      base.height = `${containerSize.w}px`;
    } else {
      base.width = '100%';
      base.height = '100%';
    }

    return base;
  };

  const isPanActive = dragMode || (zoom > 1 && (position.x !== 0 || position.y !== 0));

  return (
    <div className="flex flex-col border border-slate-200 rounded-lg p-1.5 sm:p-2 bg-white shadow-sm flex-1 min-h-0 h-full select-none">
      {/* Header Toolbar */}
      <div className="flex flex-wrap justify-between items-center mb-1.5 gap-2 shrink-0 border-b border-slate-100 pb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-800 truncate">
            Tài liệu {index + 1}
          </span>
          <span className="text-[11px] text-slate-400 italic hidden md:inline">
            (💡 Xem tài liệu sắc nét HD | Chuyển chế độ Cuộn file / Bàn tay kéo | Giữ <kbd className="px-1 bg-slate-100 border border-slate-300 rounded font-sans not-italic font-bold text-[10px]">Ctrl</kbd> + Cuộn chuột để Thu/Phóng)
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Toggle Hand Drag Mode / Scroll Mode */}
          {!isImage && (
            <button
              onClick={handleToggleDragMode}
              title={dragMode ? 'Đang ở Chế độ Bàn tay kéo (Nhấp để về Chế độ Cuộn file)' : 'Đang ở Chế độ Cuộn file (Nhấp để sang Chế độ Bàn tay kéo)'}
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

      {/* Main Single Crisp Document Viewport */}
      <div className="w-full flex-1 flex min-h-0 relative h-full bg-slate-900/5 rounded-md overflow-hidden border border-slate-200">
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          className={`flex-1 min-h-0 relative h-full flex items-center justify-center p-1 select-none ${
            isPanActive ? 'overflow-hidden' : 'overflow-auto always-visible-scrollbar'
          } ${isPanActive ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : ''}`}
        >
          {/* Overlay to capture mouse dragging ONLY when Bàn tay kéo is ON */}
          {isPanActive && !isImage && (
            <div
              onMouseDown={handleMouseDown}
              className="absolute inset-0 z-20 cursor-grab active:cursor-grabbing bg-transparent"
            />
          )}

          <div className="w-full h-full flex items-center justify-center">
            {isImage ? (
              <img
                src={url}
                alt={`File ${index + 1}`}
                className="max-w-full max-h-full object-contain shadow-sm rounded border border-slate-200 bg-white"
                style={getContentTransformStyle()}
              />
            ) : isExcel ? (
              <div className="w-full h-full relative flex flex-col bg-white overflow-auto p-4 border border-slate-200 rounded">
                {excelLoading ? (
                  <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-500">
                    <span className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs font-bold">Đang tải và đọc tập tin Excel...</span>
                  </div>
                ) : excelHtml ? (
                  <div 
                    className="excel-viewer-table text-xs text-slate-800"
                    dangerouslySetInnerHTML={{ __html: excelHtml }} 
                    style={getContentTransformStyle()}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-600 p-6 text-center">
                    <span className="material-symbols-outlined text-4xl text-amber-500">description</span>
                    <p className="font-bold text-sm">Không thể xem trực tiếp tệp Excel trên trình duyệt</p>
                    <p className="text-xs text-slate-500 max-w-sm">Tệp Excel này có thể được bảo mật hoặc xem từ môi trường localhost/mạng nội bộ.</p>
                    <div className="flex gap-2 mt-2">
                      <a
                        href={url}
                        download
                        target="_blank"
                        rel="noreferrer"
                        className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg shadow-sm hover:bg-blue-800 transition-colors flex items-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-base">download</span> Tải tệp về máy
                      </a>
                      <a
                        href={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-1.5 border border-slate-300"
                      >
                        <span className="material-symbols-outlined text-base">open_in_new</span> Xem trên Office Online
                      </a>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="w-full h-full relative flex flex-col items-center justify-center">
                <iframe
                  src={
                    /\.(doc|docx|ppt|pptx)$/i.test(url)
                      ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`
                      : `${url}#page=1&view=FitH&pagemode=none&toolbar=0&navpanes=0`
                  }
                  className="w-full h-full rounded border border-slate-200 bg-white shadow-xs"
                  style={getContentTransformStyle()}
                  title={`File ${index + 1}`}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

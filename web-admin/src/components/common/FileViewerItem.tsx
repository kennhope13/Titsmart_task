import React, { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';

interface FileViewerItemProps {
  url: string;
  index: number;
}

export const FileViewerItem: React.FC<FileViewerItemProps> = ({ url, index }) => {
  const isImage = Boolean(url.match(/\.(jpeg|jpg|gif|png|webp|bmp)$/i));
  const isExcel = Boolean(url.match(/\.(xlsx|xls|csv)$/i));
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [activeSheet, setActiveSheet] = useState<string>('');
  const [sheetsHtmlMap, setSheetsHtmlMap] = useState<Record<string, string>>({});
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
    setSheetNames([]);
    setActiveSheet('');
    setSheetsHtmlMap({});

    fetch(url)
      .then((res) => res.arrayBuffer())
      .then((buffer) => {
        if (!isMounted) return;
        const workbook = XLSX.read(buffer, { type: 'array', cellStyles: true, cellFormula: true, cellDates: true });
        const names = workbook.SheetNames || [];
        const htmlMap: Record<string, string> = {};

        names.forEach((name) => {
          const sheet = workbook.Sheets[name];
          if (sheet) {
            htmlMap[name] = XLSX.utils.sheet_to_html(sheet, { editable: false });
          }
        });

        setSheetNames(names);
        if (names.length > 0) setActiveSheet(names[0]);
        setSheetsHtmlMap(htmlMap);
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
    let scaleMultiplier = 1;
    if (isRotated90 && containerSize.w > 0 && containerSize.h > 0) {
      // Keep exact 1:1 scale ratio so rotated PDF doesn't shrink into empty space
      scaleMultiplier = containerSize.w / containerSize.h;
    }

    return {
      transform: `translate(${position.x}px, ${position.y}px) scale(${zoom * scaleMultiplier}) rotate(${rotation}deg)`,
      transformOrigin: 'center center',
      transition: isDragging ? 'none' : 'transform 100ms ease-out',
      width: '100%',
      height: '100%',
    };
  };

  const isPanActive = dragMode || zoom !== 1 || position.x !== 0 || position.y !== 0;

  return (
    <div className="flex flex-col border border-slate-200 rounded-lg p-0.5 sm:p-1 bg-white shadow-sm flex-1 min-h-0 h-full select-none">
      {/* Header Toolbar (Only for Image / Excel) */}
      {(isImage || isExcel) && (
        <div className="flex flex-wrap justify-between items-center mb-1 gap-2 shrink-0 border-b border-slate-100 pb-1 px-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-800 truncate">
              Tài liệu {index + 1}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Zoom controls for Image */}
            {isImage && (
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
            )}

            {/* Rotate Button for Image */}
            {isImage && (
              <button
                onClick={handleRotate}
                title="Xoay 90 độ"
                className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 h-[26px] px-2 rounded-md text-[11px] font-bold transition-all"
              >
                <span className="material-symbols-outlined text-[14px]">rotate_left</span> Xoay
              </button>
            )}

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
      )}

      {/* Main Single Crisp Document Viewport */}
      <div className="w-full flex-1 flex min-h-0 relative h-full bg-slate-900/5 rounded-md overflow-hidden border border-slate-200">
        <div
          ref={containerRef}
          className="flex-1 min-h-0 relative h-full flex items-center justify-center p-1 select-none overflow-hidden"
        >

          <div className="w-full h-full flex items-center justify-center">
            {isImage ? (
              <img
                src={url}
                alt={`File ${index + 1}`}
                className="max-w-full max-h-full object-contain shadow-sm rounded border border-slate-200 bg-white"
                style={getContentTransformStyle()}
              />
            ) : isExcel ? (
              <div className="w-full h-full relative flex flex-col bg-white overflow-hidden border border-slate-200 rounded">
                {excelLoading ? (
                  <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-500">
                    <span className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs font-bold">Đang tải và đọc tập tin Excel...</span>
                  </div>
                ) : activeSheet && sheetsHtmlMap[activeSheet] ? (
                  <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
                    <div 
                      className="excel-viewer-table flex-1 overflow-auto p-4 text-xs text-slate-800"
                      dangerouslySetInnerHTML={{ __html: sheetsHtmlMap[activeSheet] }} 
                    />
                    
                    {/* Excel Sheet Tabs Bar at bottom */}
                    {sheetNames.length > 0 && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-slate-100 border-t border-slate-200 overflow-x-auto shrink-0 select-none">
                        <span className="text-[11px] font-bold text-slate-500 px-1 shrink-0">Sheet:</span>
                        {sheetNames.map((name) => (
                          <button
                            key={name}
                            onClick={() => setActiveSheet(name)}
                            className={`px-3 py-1 text-xs font-bold rounded transition-colors whitespace-nowrap ${
                              activeSheet === name
                                ? 'bg-white text-emerald-700 shadow-xs border border-slate-300 border-b-2 border-b-emerald-600'
                                : 'text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
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
                      : url
                  }
                  className="w-full h-full rounded border border-slate-200 bg-white shadow-xs"
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

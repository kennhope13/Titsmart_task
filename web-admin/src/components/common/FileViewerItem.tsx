import React, { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';

interface FileViewerItemProps {
  url: string;
  index: number;
}

export const FileViewerItem: React.FC<FileViewerItemProps> = ({ url, index }) => {
  // Normalize localhost/127.0.0.1 Supabase URLs to current hostname for mobile/LAN access
  const resolvedUrl = (url || '').replace(/http:\/\/(127\.0\.0\.1|localhost):54321/g, `http://${window.location.hostname}:54321`);

  const isExcel = Boolean(resolvedUrl.match(/\.(xlsx|xls|csv)($|\?)/i));
  const isPdf = Boolean(resolvedUrl.match(/\.pdf($|\?)/i) || resolvedUrl.startsWith('data:application/pdf'));
  const isOfficeDoc = Boolean(resolvedUrl.match(/\.(doc|docx|ppt|pptx)($|\?)/i));
  const isImage = Boolean(
    resolvedUrl.match(/\.(jpeg|jpg|gif|png|webp|bmp|svg)($|\?)/i) ||
    resolvedUrl.startsWith('data:image/') ||
    resolvedUrl.startsWith('blob:')
  ) || (!isExcel && !isPdf && !isOfficeDoc);

  // Detect mobile device to use Canvas reader on Mobile and native Chrome viewer on Desktop
  const isMobileDevice = typeof window !== 'undefined' && (
    window.innerWidth < 768 ||
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  );

  // On Desktop: use native Chrome iframe PDF viewer by default (useCanvasPdf = false)
  // On Mobile: use Canvas PDF reader by default (useCanvasPdf = true)
  const [useCanvasPdf, setUseCanvasPdf] = useState<boolean>(isMobileDevice);

  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [activeSheet, setActiveSheet] = useState<string>('');
  const [sheetsHtmlMap, setSheetsHtmlMap] = useState<Record<string, string>>({});
  const [excelLoading, setExcelLoading] = useState<boolean>(false);

  // PDF Viewer State (pdfjs-dist for in-app mobile canvas view)
  const [pdfLoading, setPdfLoading] = useState<boolean>(false);
  const [pdfError, setPdfError] = useState<boolean>(false);
  const [pdfNumPages, setPdfNumPages] = useState<number>(0);
  const [pdfCurrentPage, setPdfCurrentPage] = useState<number>(1);
  const [pdfPageImageUrl, setPdfPageImageUrl] = useState<string>('');
  const [pdfThumbnails, setPdfThumbnails] = useState<string[]>([]);
  const [showSidebar, setShowSidebar] = useState<boolean>(false);

  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragMode, setDragMode] = useState<boolean>(false);

  // Parse Excel locally
  useEffect(() => {
    if (!isExcel || !resolvedUrl) return;
    let isMounted = true;
    setExcelLoading(true);
    setSheetNames([]);
    setActiveSheet('');
    setSheetsHtmlMap({});

    fetch(resolvedUrl)
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
  }, [resolvedUrl, isExcel]);

  // Load PDF and render high-res page + thumbnails when useCanvasPdf is active
  useEffect(() => {
    if (!isPdf || !resolvedUrl || !useCanvasPdf) return;
    let isMounted = true;
    setPdfLoading(true);
    setPdfError(false);

    (async () => {
      try {
        const pdfjs = await import('pdfjs-dist');
        (pdfjs as any).GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

        let pdfDoc: any;
        if (resolvedUrl.startsWith('data:application/pdf;base64,')) {
          const base64Str = resolvedUrl.split(',')[1];
          const binaryStr = atob(base64Str);
          const bytes = new Uint8Array(binaryStr.length);
          for (let i = 0; i < binaryStr.length; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
          }
          pdfDoc = await pdfjs.getDocument({ data: bytes.buffer }).promise;
        } else {
          try {
            const res = await fetch(resolvedUrl);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const arrayBuffer = await res.arrayBuffer();
            pdfDoc = await pdfjs.getDocument({ data: arrayBuffer }).promise;
          } catch {
            pdfDoc = await pdfjs.getDocument({ url: resolvedUrl }).promise;
          }
        }

        if (!isMounted) return;

        setPdfNumPages(pdfDoc.numPages);
        const targetPageNum = Math.min(Math.max(pdfCurrentPage || 1, 1), pdfDoc.numPages);

        // Render target page high-res
        const page = await pdfDoc.getPage(targetPageNum);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (context) {
          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);
          await page.render({ canvasContext: context, viewport, canvas } as any).promise;
          if (isMounted) {
            setPdfPageImageUrl(canvas.toDataURL('image/png'));
          }
        }

        // Generate thumbnail images for sidebar
        const thumbs: string[] = [];
        for (let i = 1; i <= Math.min(pdfDoc.numPages, 20); i++) {
          try {
            const p = await pdfDoc.getPage(i);
            const vp = p.getViewport({ scale: 0.25 });
            const c = document.createElement('canvas');
            const ctx = c.getContext('2d');
            if (ctx) {
              c.width = Math.ceil(vp.width);
              c.height = Math.ceil(vp.height);
              await p.render({ canvasContext: ctx, viewport: vp, canvas: c } as any).promise;
              thumbs.push(c.toDataURL('image/jpeg', 0.7));
            }
          } catch (e) {
            console.warn(`Thumbnail error page ${i}:`, e);
          }
        }
        if (isMounted) {
          setPdfThumbnails(thumbs);
        }
      } catch (err) {
        console.warn('PDF rendering error:', err);
        if (isMounted) {
          setPdfError(true);
        }
      } finally {
        if (isMounted) setPdfLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [resolvedUrl, isPdf, pdfCurrentPage, useCanvasPdf]);

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

  const handlePrint = () => {
    if (pdfPageImageUrl) {
      const win = window.open('');
      if (win) {
        win.document.write(`<img src="${pdfPageImageUrl}" onload="window.print();window.close();" style="max-width:100%"/>`);
        win.document.close();
      }
    } else {
      window.print();
    }
  };

  const touchStartDistRef = useRef<number | null>(null);
  const touchStartZoomRef = useRef<number>(1);

  // Mouse / Touch Drag & Pinch Zoom for Mobile Image / PDF Canvas
  const canInteractImage = isImage || (isPdf && useCanvasPdf && Boolean(pdfPageImageUrl));

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button === 0 && (zoom > 1 || dragMode || canInteractImage)) {
      setIsDragging(true);
      dragStartRef.current = { x: e.clientX - position.x, y: e.clientY - position.y };
    }
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!canInteractImage) return;
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      dragStartRef.current = { x: touch.clientX - position.x, y: touch.clientY - position.y };
    } else if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchStartDistRef.current = dist;
      touchStartZoomRef.current = zoom;
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!canInteractImage) return;
    if (e.touches.length === 1 && isDragging) {
      const touch = e.touches[0];
      setPosition({
        x: touch.clientX - dragStartRef.current.x,
        y: touch.clientY - dragStartRef.current.y,
      });
    } else if (e.touches.length === 2 && touchStartDistRef.current !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const scale = dist / touchStartDistRef.current;
      const nextZoom = Math.min(Math.max(touchStartZoomRef.current * scale, 0.5), 4);
      setZoom(nextZoom);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    touchStartDistRef.current = null;
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

  const isRotated90 = Math.abs(rotation % 180) === 90;

  const getContentTransformStyle = (): React.CSSProperties => {
    let scaleMultiplier = 1;
    if (isRotated90 && containerSize.w > 0 && containerSize.h > 0) {
      scaleMultiplier = containerSize.w / containerSize.h;
    }

    return {
      transform: `translate(${position.x}px, ${position.y}px) scale(${zoom * scaleMultiplier}) rotate(${rotation}deg)`,
      transformOrigin: 'center center',
      transition: isDragging ? 'none' : 'transform 100ms ease-out',
    };
  };

  const renderActiveImageSrc = isPdf ? pdfPageImageUrl : resolvedUrl;

  // PDF File View Mode Handling
  if (isPdf) {
    const fileName = resolvedUrl.split('/').pop()?.split('?')[0] || `Tài liệu ${index + 1}`;

    // Desktop mode (useCanvasPdf = false): Render native Chrome PDF viewer iframe
    if (!useCanvasPdf) {
      return (
        <div className="flex flex-col border border-slate-700 rounded-lg bg-[#323639] text-white shadow-xl flex-1 min-h-0 h-full select-none overflow-hidden relative">
          <div className="flex justify-between items-center px-2 py-1 bg-[#2a2e31] border-b border-[#1f2224] text-xs shrink-0">
            <span className="font-semibold text-slate-200 truncate">{fileName}</span>
            <button
              onClick={() => setUseCanvasPdf(true)}
              className="text-[11px] bg-slate-700 hover:bg-slate-600 text-slate-200 px-2 py-0.5 rounded flex items-center gap-1 border border-slate-600 transition-colors"
              title="Chuyển sang bộ đọc Canvas Cảm ứng Mobile"
            >
              <span className="material-symbols-outlined text-[14px]">touch_app</span> Chế độ Canvas Mobile
            </button>
          </div>
          <iframe
            src={`${resolvedUrl}#toolbar=1`}
            className="w-full h-full rounded-b border-0 bg-[#323639]"
            title={`PDF Viewer ${index + 1}`}
          />
        </div>
      );
    }

    // Mobile mode (useCanvasPdf = true): Render Canvas Dark Theme PDF Reader with touch controls & sidebar
    return (
      <div className="flex flex-col border border-slate-700 rounded-lg bg-[#323639] text-white shadow-xl flex-1 min-h-0 h-full select-none overflow-hidden">
        {/* Dark Chrome PDF Top Header Toolbar */}
        <div className="flex flex-wrap justify-between items-center px-2 py-1.5 bg-[#2a2e31] border-b border-[#1f2224] gap-2 shrink-0 text-xs">
          {/* Left: Sidebar toggle + Filename */}
          <div className="flex items-center gap-2 max-w-[40%] min-w-0">
            {pdfNumPages > 1 && (
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                className={`p-1 rounded hover:bg-slate-700 transition-colors ${showSidebar ? 'bg-slate-700 text-blue-400' : 'text-slate-300'}`}
                title="Hiện / Ẩn trang thu nhỏ bên trái"
              >
                <span className="material-symbols-outlined text-[18px]">menu</span>
              </button>
            )}
            <span className="font-semibold text-slate-200 truncate text-[12px]" title={fileName}>
              {fileName}
            </span>
          </div>

          {/* Center: Page controls + Zoom controls */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Page Counter */}
            {pdfNumPages > 0 && (
              <div className="flex items-center gap-1 bg-[#1a1d1f] px-2 py-0.5 rounded text-[11px] border border-slate-700">
                <button
                  disabled={pdfCurrentPage <= 1}
                  onClick={() => setPdfCurrentPage((p) => Math.max(p - 1, 1))}
                  className="text-slate-400 hover:text-white disabled:opacity-30"
                  title="Trang trước"
                >
                  <span className="material-symbols-outlined text-[14px]">chevron_left</span>
                </button>
                <span className="font-bold text-white px-1">
                  {pdfCurrentPage} / {pdfNumPages}
                </span>
                <button
                  disabled={pdfCurrentPage >= pdfNumPages}
                  onClick={() => setPdfCurrentPage((p) => Math.min(p + 1, pdfNumPages))}
                  className="text-slate-400 hover:text-white disabled:opacity-30"
                  title="Trang sau"
                >
                  <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                </button>
              </div>
            )}

            <span className="h-4 w-[1px] bg-slate-700 hidden sm:block" />

            {/* Zoom Controls */}
            <div className="flex items-center bg-[#1a1d1f] rounded text-[11px] border border-slate-700">
              <button
                onClick={handleZoomOut}
                className="p-1 text-slate-300 hover:text-white hover:bg-slate-700 rounded-l transition-colors"
                title="Thu nhỏ (-)"
              >
                <span className="material-symbols-outlined text-[14px]">remove</span>
              </button>
              <button
                onClick={handleReset}
                className="px-1.5 font-bold text-slate-200 hover:text-white text-[11px]"
                title="Khôi phục 100%"
              >
                {Math.round(zoom * 100)}%
              </button>
              <button
                onClick={handleZoomIn}
                className="p-1 text-slate-300 hover:text-white hover:bg-slate-700 rounded-r transition-colors"
                title="Phóng to (+)"
              >
                <span className="material-symbols-outlined text-[14px]">add</span>
              </button>
            </div>

            {/* Rotate */}
            <button
              onClick={handleRotate}
              className="p-1 text-slate-300 hover:text-white hover:bg-slate-700 rounded transition-colors"
              title="Xoay 90 độ"
            >
              <span className="material-symbols-outlined text-[16px]">rotate_right</span>
            </button>
          </div>

          {/* Right: Toggle Mode + Print & Download */}
          <div className="flex items-center gap-1">
            {!isMobileDevice && (
              <button
                onClick={() => setUseCanvasPdf(false)}
                className="p-1 text-slate-300 hover:text-white hover:bg-slate-700 rounded transition-colors text-[11px] flex items-center gap-1"
                title="Chuyển sang Chrome PDF Gốc"
              >
                <span className="material-symbols-outlined text-[15px]">picture_as_pdf</span>
                <span className="hidden md:inline">Chrome Gốc</span>
              </button>
            )}

            <button
              onClick={handlePrint}
              className="p-1 text-slate-300 hover:text-white hover:bg-slate-700 rounded transition-colors"
              title="In bản vẽ PDF"
            >
              <span className="material-symbols-outlined text-[16px]">print</span>
            </button>

            <a
              href={`${resolvedUrl}?download=`}
              download
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded text-[11px] font-bold shadow-xs transition-colors"
              title="Tải tệp PDF về máy"
            >
              <span className="material-symbols-outlined text-[14px]">download</span> Tải về
            </a>
          </div>
        </div>

        {/* Main Body: Collapsible Thumbnail Sidebar + Dark Viewport */}
        <div className="flex-1 min-h-0 flex relative bg-[#323639]">
          {/* Left Thumbnail Sidebar */}
          {showSidebar && pdfThumbnails.length > 0 && (
            <div className="w-36 bg-[#2a2e31] border-r border-[#1a1d1f] flex flex-col p-2 gap-3 overflow-y-auto shrink-0 animate-in slide-in-from-left duration-200">
              {pdfThumbnails.map((thumb, idx) => (
                <div
                  key={idx}
                  onClick={() => setPdfCurrentPage(idx + 1)}
                  className={`flex flex-col items-center cursor-pointer p-1 rounded transition-colors ${
                    pdfCurrentPage === idx + 1
                      ? 'bg-blue-600/30 border-2 border-blue-500 shadow-md'
                      : 'hover:bg-slate-700 border border-transparent'
                  }`}
                >
                  <img src={thumb} alt={`Page ${idx + 1}`} className="w-full h-auto bg-white rounded shadow-sm object-contain" />
                  <span className="text-[10px] font-bold text-slate-300 mt-1">{idx + 1}</span>
                </div>
              ))}
            </div>
          )}

          {/* Main Dark Viewer Viewport */}
          <div
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="flex-1 min-h-0 relative h-full flex items-center justify-center p-2 select-none overflow-hidden touch-none"
          >
            {pdfLoading ? (
              <div className="flex flex-col items-center justify-center gap-2 text-slate-300 p-6">
                <span className="w-8 h-8 border-3 border-blue-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-semibold text-slate-300">Đang nạp sơ đồ PDF...</span>
              </div>
            ) : pdfError ? (
              <iframe
                src={
                  resolvedUrl.startsWith('http')
                    ? `https://docs.google.com/viewer?url=${encodeURIComponent(resolvedUrl)}&embedded=true`
                    : resolvedUrl
                }
                className="w-full h-full rounded border-0 bg-white shadow-xs"
                title={`PDF Viewer ${index + 1}`}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <img
                  src={pdfPageImageUrl}
                  alt={`Page ${pdfCurrentPage}`}
                  className="max-w-full max-h-full w-auto h-auto object-contain shadow-2xl rounded bg-white block shrink-0 border border-slate-600"
                  style={getContentTransformStyle()}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Standard Light View for Images, Excel, Word
  return (
    <div className="flex flex-col border border-slate-200 rounded-lg p-0.5 sm:p-1 bg-white shadow-sm flex-1 min-h-0 h-full select-none">
      {/* Header Toolbar */}
      <div className="flex flex-wrap justify-between items-center mb-1 gap-2 shrink-0 border-b border-slate-100 pb-1 px-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-800 truncate">
            Tài liệu {index + 1}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
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

          {isImage && (
            <button
              onClick={handleRotate}
              title="Xoay 90 độ"
              className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 h-[26px] px-2 rounded-md text-[11px] font-bold transition-all"
            >
              <span className="material-symbols-outlined text-[14px]">rotate_left</span> Xoay
            </button>
          )}

          <a
            href={`${resolvedUrl}?download=`}
            download
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 bg-primary text-white h-[26px] px-2.5 rounded-md text-[11px] font-bold hover:opacity-90 active:scale-95 transition-all shadow-xs"
          >
            <span className="material-symbols-outlined text-[13px]">download</span> Tải về
          </a>
        </div>
      </div>

      {/* Viewport */}
      <div className="w-full flex-1 flex min-h-0 relative h-full bg-slate-900/5 rounded-md overflow-hidden border border-slate-200">
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="flex-1 min-h-0 relative h-full flex items-center justify-center p-1 select-none overflow-hidden touch-none"
        >

          <div className="w-full h-full flex items-center justify-center">
            {isImage ? (
              <img
                src={renderActiveImageSrc}
                alt={`File ${index + 1}`}
                className="max-w-full max-h-full w-auto h-auto object-contain shadow-sm rounded border border-slate-200 bg-white block shrink-0"
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
                    
                    {/* Excel Sheet Tabs */}
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
                    <div className="flex gap-2 mt-2">
                      <a
                        href={resolvedUrl}
                        download
                        target="_blank"
                        rel="noreferrer"
                        className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-base">download</span> Tải tệp về máy
                      </a>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="w-full h-full relative flex flex-col items-center justify-center">
                <iframe
                  src={
                    /\.(doc|docx|ppt|pptx)$/i.test(resolvedUrl)
                      ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(resolvedUrl)}`
                      : resolvedUrl
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

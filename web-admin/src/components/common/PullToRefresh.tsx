import React, { useState, useRef, useEffect } from 'react';

const checkIsMobile = () => {
  if (typeof window === 'undefined') return false;
  const isSmallScreen = window.innerWidth < 768;
  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent || '');
  return isSmallScreen || (isTouch && isMobileUA);
};

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  onRefresh,
  children,
  className = '',
  disabled = false,
}) => {
  const [isMobile, setIsMobile] = useState(checkIsMobile);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startYRef = useRef(0);
  const currentYRef = useRef(0);
  const isPullingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const THRESHOLD = 65;
  const MAX_PULL = 90;

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(checkIsMobile());
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isMobile || disabled || isRefreshing) return;
    const container = containerRef.current;
    // Only allow pull if the scrollable container is at the very top (scrollTop <= 0)
    if (container && container.scrollTop <= 0) {
      startYRef.current = e.touches[0].clientY;
      currentYRef.current = e.touches[0].clientY;
      isPullingRef.current = true;
    } else {
      isPullingRef.current = false;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isMobile || !isPullingRef.current || isRefreshing || disabled) return;
    const container = containerRef.current;
    if (container && container.scrollTop > 0) {
      isPullingRef.current = false;
      setPullDistance(0);
      return;
    }

    currentYRef.current = e.touches[0].clientY;
    const diff = currentYRef.current - startYRef.current;

    if (diff > 0) {
      // Apply rubberband resistance
      const distance = Math.min(MAX_PULL, diff * 0.45);
      setPullDistance(distance);
      // Prevent standard browser pull-to-refresh reload if we're actively handling it
      if (diff > 10 && e.cancelable) {
        e.preventDefault();
      }
    } else {
      setPullDistance(0);
    }
  };

  const handleTouchEnd = async () => {
    if (!isMobile || !isPullingRef.current || disabled) return;
    isPullingRef.current = false;

    if (pullDistance >= THRESHOLD && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(THRESHOLD);
      try {
        await Promise.resolve(onRefresh());
      } catch (err) {
        console.error('Pull to refresh failed:', err);
      } finally {
        setTimeout(() => {
          setIsRefreshing(false);
          setPullDistance(0);
        }, 300);
      }
    } else {
      setPullDistance(0);
    }
  };

  // On desktop / non-mobile, render as standard scrollable container without pull overlay or animations
  if (!isMobile) {
    return (
      <div
        ref={containerRef}
        className={`relative overflow-y-auto ${className}`}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={`relative overflow-y-auto ${className}`}
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      {/* Pull Indicator */}
      <div
        className="absolute left-0 right-0 top-0 flex items-center justify-center pointer-events-none transition-transform z-20"
        style={{
          transform: `translateY(${pullDistance > 0 || isRefreshing ? (isRefreshing ? THRESHOLD : pullDistance) - 40 : -50}px)`,
          opacity: pullDistance > 10 || isRefreshing ? 1 : 0,
          transition: isPullingRef.current ? 'none' : 'transform 0.25s ease-out, opacity 0.2s ease-out',
        }}
      >
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/95 text-slate-700 shadow-md border border-slate-200 text-xs font-bold backdrop-blur-xs">
          <span
            className={`material-symbols-outlined text-[18px] text-primary ${
              isRefreshing ? 'animate-spin' : ''
            }`}
            style={{
              transform: isRefreshing ? undefined : `rotate(${Math.min(360, (pullDistance / THRESHOLD) * 360)}deg)`,
              transition: isRefreshing ? 'none' : 'transform 0.1s linear',
            }}
          >
            {isRefreshing ? 'sync' : 'arrow_downward'}
          </span>
          <span className="text-[11px] font-semibold text-slate-600">
            {isRefreshing
              ? 'Đang cập nhật...'
              : pullDistance >= THRESHOLD
              ? 'Thả để làm mới'
              : 'Kéo xuống để làm mới'}
          </span>
        </div>
      </div>

      {/* Content wrapper */}
      <div
        style={{
          transform: pullDistance > 0 || isRefreshing ? `translateY(${isRefreshing ? THRESHOLD : pullDistance}px)` : undefined,
          transition: isPullingRef.current ? 'none' : 'transform 0.25s ease-out',
        }}
      >
        {children}
      </div>
    </div>
  );
};

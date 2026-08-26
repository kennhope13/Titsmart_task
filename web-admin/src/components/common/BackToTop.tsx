import React, { useState, useEffect } from 'react';

export const BackToTop: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [activeScrollContainer, setActiveScrollContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    // Listen to ALL scroll events in the capture phase
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement;
      // Filter out small scrollable areas like dropdowns, textareas, etc.
      // We assume the main scroll container is quite large (e.g., > 500px tall)
      if (target && target.clientHeight > 300) {
        if (target.scrollTop > 200) {
          setIsVisible(true);
          setActiveScrollContainer(target);
        } else {
          setIsVisible(false);
        }
      }
    };

    window.addEventListener('scroll', handleScroll, true);

    return () => {
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, []);

  const scrollToTop = () => {
    if (activeScrollContainer) {
      activeScrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100] pointer-events-none">
      <div 
        className={`transition-all duration-300 transform pointer-events-auto ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}
      >
        <button
          onClick={scrollToTop}
          className="w-10 h-10 bg-primary hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-transform hover:-translate-y-1 focus:outline-none"
          title="Lên đầu trang"
        >
          <span className="material-symbols-outlined font-bold">arrow_upward</span>
        </button>
      </div>
    </div>
  );
};

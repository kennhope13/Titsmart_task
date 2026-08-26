import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { ChevronDown } from 'lucide-react';

interface CustomSelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  value?: string | number;
  onChange?: (e: any) => void;
  children?: React.ReactNode;
  searchable?: boolean;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  children,
  className = '',
  disabled = false,
  required = false,
  searchable = false,
  ...rest
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const containerRef = useRef<HTMLDivElement>(null);

  const options: { value: string | number; label: React.ReactNode; className?: string }[] = [];

  const childrenArray = React.Children.toArray(children);
  childrenArray.forEach((child: any) => {
    if (React.isValidElement(child) && child.type === 'option') {
      const childElement = child as React.ReactElement;
      options.push({
        value: childElement.props.value !== undefined ? childElement.props.value : childElement.props.children,
        label: childElement.props.children,
        className: childElement.props.className
      });
    }
  });

  const selectedOption = options.find((opt) => String(opt.value) === String(value));
  const displayLabel = selectedOption ? selectedOption.label : '';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const openDropdown = () => {
    if (disabled || isOpen) return;
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const dropdownHeight = Math.min(options.length * 34 + 8, 240);
      const spaceBelow = window.innerHeight - rect.bottom;

      if (spaceBelow < dropdownHeight && rect.top > dropdownHeight) {
        setDropdownStyle({
          position: 'fixed',
          bottom: window.innerHeight - rect.top + 2,
          left: rect.left,
          width: Math.max(rect.width, 140),
          zIndex: 9999,
        });
      } else {
        setDropdownStyle({
          position: 'fixed',
          top: rect.bottom + 2,
          left: rect.left,
          width: Math.max(rect.width, 140),
          zIndex: 9999,
        });
      }
    }
    setSearchTerm("");
    setIsOpen(true);
  };

  const toggleDropdown = () => {
    if (isOpen) setIsOpen(false);
    else openDropdown();
  };

  const handleSelect = (val: string | number) => {
    setIsOpen(false);
    if (onChange) {
      onChange({ target: { value: val } } as any);
    }
  };

  const hasPadding = className.includes('px-') || className.includes('py-') || className.includes('p-');
  const hasBg = className.includes('bg-');
  const hasBorder = className.includes('border');
  const hasRounded = className.includes('rounded');

  const layoutClassesRegex = /(?<=^|\s)(flex-1|flex-auto|flex-initial|flex-none|w-[^\s]+|h-[^\s]+|min-w-[^\s]+|max-w-[^\s]+|min-h-[^\s]+|max-h-[^\s]+|hidden|block|inline-block)(?=\s|$)/g;
  const layoutClassesMatch = className.match(layoutClassesRegex);
  const layoutClasses = layoutClassesMatch ? layoutClassesMatch.join(' ') : 'inline-block w-full';

  const fontSizeRegex = /(?<=^|\s)(text-(xs|sm|base|lg|xl|2xl|\[\d+px\]))(?=\s|$)/;
  const fontSizeMatch = className.match(fontSizeRegex);
  const fontSizeClass = fontSizeMatch ? fontSizeMatch[1] : '';

  const innerClassName = className.replace(layoutClassesRegex, '').trim();

  const triggerClassName = `relative flex items-center justify-between min-w-0 w-full h-full ${
    hasPadding ? '' : 'px-3 py-2'
  } ${hasBg ? '' : 'bg-white'} ${
    hasBorder ? '' : 'border border-slate-200'
  } ${hasRounded ? '' : 'rounded-lg'} text-left focus:outline-none transition-all cursor-pointer ${
    disabled ? 'opacity-50 cursor-not-allowed bg-slate-50' : 'hover:border-primary/50'
  } ${
    isOpen ? 'ring-2 ring-primary/20 border-primary' : ''
  } ${innerClassName}`.replace(/focus:ring-[^\s]+/g, '');

  const extractText = (node: any): string => {
    if (typeof node === "string" || typeof node === "number") return String(node);
    if (Array.isArray(node)) return node.map(extractText).join("");
    if (node && typeof node === "object" && node.props && node.props.children) return extractText(node.props.children);
    return "";
  };
  const normalizeVN = (str: string) => {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  };
  const filteredOptions = searchable 
    ? options.filter(opt => normalizeVN(extractText(opt.label)).includes(normalizeVN(searchTerm))) 
    : options;

  const dropdownEl = isOpen && !disabled ? (
    <div
      style={dropdownStyle}
      className="bg-white rounded-lg shadow-[0_10px_30px_rgba(0,0,0,0.12)] border border-slate-100 py-1 max-h-60 overflow-auto custom-scrollbar text-left"
    >
      
      {filteredOptions.length === 0 ? (
        <div className={`px-3 py-2 text-slate-500 italic text-center ${fontSizeClass}`}>Trống</div>
      ) : (
        filteredOptions.map((option, idx) => (
          <div
            key={String(option.value) + idx}
            className={`px-3 py-1.5 cursor-pointer transition-colors ${fontSizeClass} ${
              String(value) === String(option.value)
                ? 'bg-blue-50 text-primary font-semibold'
                : 'text-slate-700 hover:bg-slate-50'
            }`}
            onMouseDown={(e) => { e.preventDefault(); handleSelect(option.value); }}
          >
            {option.label}
          </div>
        ))
      )}
    </div>
  ) : null;

  return (
    <div className={`relative ${layoutClasses} min-w-0`} ref={containerRef}>
      
      {searchable ? (
        <div className={triggerClassName} onClick={toggleDropdown} style={{ cursor: disabled ? "not-allowed" : "text" }}>
          <input
            type="text"
            className="w-full h-full bg-transparent border-none outline-none pr-6"
            style={{ color: "inherit", fontWeight: "inherit", fontSize: "inherit", margin: 0, padding: 0 }}
            placeholder={isOpen ? "Nhập để tìm kiếm..." : "-- Chọn --"}
            disabled={disabled}
            value={isOpen ? searchTerm : (typeof displayLabel === "string" ? displayLabel : extractText(displayLabel)) || ""}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              if (!isOpen) openDropdown();
            }}
            onFocus={() => openDropdown()} onClick={(e) => { e.stopPropagation(); openDropdown(); }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && filteredOptions.length > 0) {
                e.preventDefault();
                handleSelect(filteredOptions[0].value);
              }
            }}
          />
          <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
          </span>
        </div>
      ) : (
        <button
          type="button"
          className={triggerClassName}
          onClick={toggleDropdown}
          disabled={disabled}
        >
          <span className="block truncate min-w-0 flex-1 pr-6" title={typeof displayLabel === "string" ? displayLabel : ""}>{displayLabel || "\u00A0"}</span>
          <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
          </span>
        </button>
      )}


      {required && (
        <input
          type="text"
          required
          value={value === undefined || value === null || value === '' ? '' : String(value)}
          onChange={() => {}}
          className="absolute opacity-0 w-0 h-0 pointer-events-none"
          tabIndex={-1}
        />
      )}

      {typeof document !== 'undefined' && ReactDOM.createPortal(dropdownEl, document.body)}
    </div>
  );
};

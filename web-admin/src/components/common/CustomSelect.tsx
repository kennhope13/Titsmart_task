import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface CustomSelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  value?: string | number;
  onChange?: (e: any) => void;
  children?: React.ReactNode;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  children,
  className = '',
  disabled = false,
  required = false,
  ...rest
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const options: { value: string | number; label: React.ReactNode }[] = [];
  
  const childrenArray = React.Children.toArray(children);
  childrenArray.forEach((child: any) => {
    if (React.isValidElement(child) && child.type === 'option') {
      const childElement = child as React.ReactElement;
      options.push({
        value: childElement.props.value !== undefined ? childElement.props.value : childElement.props.children,
        label: childElement.props.children,
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

  const handleSelect = (val: string | number) => {
    setIsOpen(false);
    if (onChange) {
      onChange({ target: { value: val } } as any);
    }
  };

  const hasPadding = className.includes('px-') || className.includes('py-') || className.includes('p-');
  const hasBg = className.includes('bg-');
  const hasBorder = className.includes('border');
  
  const triggerClassName = `relative flex items-center justify-between w-full ${
    hasPadding ? '' : 'px-3 py-2'
  } ${hasBg ? '' : 'bg-white'} ${
    hasBorder ? '' : 'border border-slate-200'
  } rounded-lg text-left focus:outline-none transition-all cursor-pointer ${
    disabled ? 'opacity-50 cursor-not-allowed bg-slate-50' : 'hover:border-primary/50'
  } ${
    isOpen ? 'ring-2 ring-primary/20 border-primary' : ''
  } ${className}`.replace(/focus:ring-[^\s]+/g, '').replace(/focus:outline-none/g, '');

  return (
    <div className="relative inline-block w-full" ref={containerRef}>
      <button
        type="button"
        className={triggerClassName}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
      >
        <span className="block truncate pr-6">{displayLabel || '\u00A0'}</span>
        <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </span>
      </button>

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

      {isOpen && !disabled && (
        <div className="absolute z-[99] mt-1 w-full bg-white rounded-lg shadow-[0_10px_30px_rgba(0,0,0,0.1)] border border-slate-100 py-1 max-h-60 overflow-auto custom-scrollbar">
          {options.length === 0 ? (
            <div className="px-3 py-2 text-sm text-slate-500 italic text-center">Trống</div>
          ) : (
            options.map((option, idx) => (
              <div
                key={String(option.value) + idx}
                className={`px-3 py-2 text-sm cursor-pointer transition-colors ${
                  String(value) === String(option.value)
                    ? 'bg-blue-50 text-primary font-bold'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
                onClick={() => handleSelect(option.value)}
              >
                {option.label}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Search, LucideIcon } from 'lucide-react';
import { useTrading } from '../../context/TradingContext';

export interface SelectOption {
  value: string;
  label: string;
  subtitle?: string;
  icon?: LucideIcon | React.ComponentType<{ className?: string }> | string;
  badge?: string;
  disabled?: boolean;
}

export interface CustomSelectProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  searchable?: boolean;
  disabled?: boolean;
  error?: string;
  hint?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  label,
  value,
  onChange,
  options,
  placeholder = 'Select option...',
  searchable = false,
  disabled = false,
  error,
  hint,
  className = '',
  size = 'md',
}) => {
  const { theme } = useTrading();
  const isLight = theme === 'light';

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  const filteredOptions = searchQuery.trim()
    ? options.filter((opt) =>
        opt.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (opt.subtitle && opt.subtitle.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : options;

  // Auto enable search if > 6 options
  const isSearchEnabled = searchable || options.length > 7;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
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

  useEffect(() => {
    if (isOpen && isSearchEnabled) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
    if (isOpen) {
      const idx = filteredOptions.findIndex((opt) => opt.value === value);
      setHighlightedIndex(idx >= 0 ? idx : 0);
    } else {
      setSearchQuery('');
      setHighlightedIndex(-1);
    }
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < filteredOptions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : filteredOptions.length - 1
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
        const option = filteredOptions[highlightedIndex];
        if (!option.disabled) {
          onChange(option.value);
          setIsOpen(false);
        }
      }
    }
  };

  const sizeClasses = {
    sm: 'h-8 text-xs px-2.5 rounded-lg',
    md: 'h-10 text-xs sm:text-sm px-3 rounded-xl',
    lg: 'h-11 text-sm px-3.5 rounded-xl',
  };

  return (
    <div className={`w-full space-y-1.5 text-left relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-xs font-medium text-[#9CA3AF] select-none">
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className={`w-full flex items-center justify-between gap-2 border transition-all duration-150 cursor-pointer focus:outline-none focus:ring-1 ${
          isLight
            ? 'bg-white text-zinc-900 border-zinc-200 hover:border-zinc-300 focus:border-blue-500 focus:ring-blue-500/20'
            : 'bg-[#080A0D] text-[#F3F4F6] border-[#1C2129] hover:border-[#282E38] focus:border-[#6366F1] focus:ring-[#6366F1]/20'
        } ${
          error
            ? 'border-rose-500/60 focus:border-rose-500'
            : ''
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${sizeClasses[size]}`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1 truncate">
          {selectedOption?.icon && typeof selectedOption.icon === 'string' ? (
            <span className="text-sm shrink-0">{selectedOption.icon}</span>
          ) : selectedOption?.icon ? (
            React.createElement(selectedOption.icon as any, {
              className: 'w-4 h-4 text-[#818CF8] shrink-0',
            })
          ) : null}

          {selectedOption ? (
            <span className="truncate font-medium text-[#F3F4F6]">
              {selectedOption.label}
            </span>
          ) : (
            <span className="text-[#6B7280] truncate font-normal">
              {placeholder}
            </span>
          )}

          {selectedOption?.badge && (
            <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#12161E] text-[#818CF8] border border-[#1C2129]">
              {selectedOption.badge}
            </span>
          )}
        </div>

        <ChevronDown
          className={`w-4 h-4 text-[#71717A] shrink-0 transition-transform duration-150 ${
            isOpen ? 'rotate-180 text-[#818CF8]' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className={`absolute left-0 right-0 z-50 mt-1 rounded-xl border shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 ${
            isLight
              ? 'bg-white border-zinc-200 text-zinc-900'
              : 'bg-[#0A0C10] border-[#1C2129] text-[#F3F4F6]'
          }`}
          style={{ minWidth: '100%', maxHeight: '280px' }}
        >
          {isSearchEnabled && (
            <div className="p-2 border-b border-[#1C2129] bg-[#07090C]">
              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 text-[#71717A] absolute left-2.5 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setHighlightedIndex(0);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Search options..."
                  className="w-full bg-[#0D1014] text-xs text-[#F3F4F6] placeholder-[#6B7280] pl-8 pr-2.5 py-1.5 rounded-lg border border-[#1C2129] focus:outline-none focus:border-[#6366F1]"
                />
              </div>
            </div>
          )}

          <div
            ref={listRef}
            className="max-h-56 overflow-y-auto p-1 space-y-0.5 custom-scrollbar"
          >
            {filteredOptions.length === 0 ? (
              <div className="py-3 px-3 text-center text-xs text-[#71717A] italic">
                No matching options
              </div>
            ) : (
              filteredOptions.map((option, index) => {
                const isSelected = option.value === value;
                const isHighlighted = index === highlightedIndex;

                return (
                  <button
                    key={option.value}
                    type="button"
                    disabled={option.disabled}
                    onClick={() => {
                      if (!option.disabled) {
                        onChange(option.value);
                        setIsOpen(false);
                      }
                    }}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-xs sm:text-sm text-left transition-colors cursor-pointer ${
                      option.disabled
                        ? 'opacity-40 cursor-not-allowed'
                        : isSelected
                        ? 'bg-[#12161E] text-white font-medium'
                        : isHighlighted
                        ? 'bg-[#151820] text-[#F3F4F6]'
                        : 'text-[#D1D5DB] hover:bg-[#151820]'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1 truncate">
                      {option.icon && typeof option.icon === 'string' ? (
                        <span className="text-sm shrink-0">{option.icon}</span>
                      ) : option.icon ? (
                        React.createElement(option.icon as any, {
                          className: `w-4 h-4 shrink-0 ${isSelected ? 'text-[#818CF8]' : 'text-[#71717A]'}`,
                        })
                      ) : null}

                      <div className="min-w-0 flex-1 truncate">
                        <span className="truncate block font-medium">
                          {option.label}
                        </span>
                        {option.subtitle && (
                          <span className="text-[10px] text-[#71717A] truncate block">
                            {option.subtitle}
                          </span>
                        )}
                      </div>

                      {option.badge && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-[#101318] text-[#9CA3AF] border border-[#1C2129] shrink-0">
                          {option.badge}
                        </span>
                      )}
                    </div>

                    {isSelected && (
                      <Check className="w-4 h-4 text-[#818CF8] shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {error && <p className="text-[11px] text-rose-400">{error}</p>}
      {hint && !error && <p className="text-[11px] text-[#71717A]">{hint}</p>}
    </div>
  );
};

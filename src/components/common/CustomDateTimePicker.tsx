import React, { useState, useRef, useEffect } from 'react';
import { Calendar, Clock, ChevronDown, Check } from 'lucide-react';
import { useTrading } from '../../context/TradingContext';

export interface CustomDateTimePickerProps {
  label?: string;
  value: string; // YYYY-MM-DDTHH:mm or ISO string
  onChange: (value: string) => void;
  disabled?: boolean;
  minDate?: string;
  maxDate?: string;
  placeholder?: string;
  error?: string;
  hint?: string;
  className?: string;
  quickPresets?: boolean;
}

export const CustomDateTimePicker: React.FC<CustomDateTimePickerProps> = ({
  label,
  value,
  onChange,
  disabled = false,
  placeholder = 'Select date & time',
  error,
  hint,
  className = '',
  quickPresets = true,
}) => {
  const { theme } = useTrading();
  const isLight = theme === 'light';
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Normalize value to YYYY-MM-DDTHH:mm
  const formatLocalValue = (val: string) => {
    if (!val) return '';
    try {
      const d = new Date(val);
      if (isNaN(d.getTime())) return val;
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch {
      return val;
    }
  };

  const normalizedValue = formatLocalValue(value);

  // Format for display: e.g. "Oct 3, 2026 • 10:35 AM"
  const formattedDisplay = (() => {
    if (!normalizedValue) return '';
    try {
      const d = new Date(normalizedValue);
      if (isNaN(d.getTime())) return normalizedValue;
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }) + ' ' + d.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return normalizedValue;
    }
  })();

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

  const setNow = () => {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    onChange(`${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`);
  };

  const addMinutes = (mins: number) => {
    const base = normalizedValue ? new Date(normalizedValue) : new Date();
    const target = new Date(base.getTime() + mins * 60000);
    const pad = (n: number) => n.toString().padStart(2, '0');
    onChange(`${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(target.getDate())}T${pad(target.getHours())}:${pad(target.getMinutes())}`);
  };

  return (
    <div className={`w-full space-y-1.5 text-left relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-xs font-medium text-[#9CA3AF] select-none">
          {label}
        </label>
      )}

      {/* Main Trigger */}
      <div className="relative flex items-center">
        <input
          type="datetime-local"
          disabled={disabled}
          value={normalizedValue}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full h-10 px-3 text-xs sm:text-sm font-sans font-medium rounded-xl border transition-all focus:outline-none focus:ring-1 ${
            isLight
              ? 'bg-white text-zinc-900 border-zinc-200 focus:border-blue-500 focus:ring-blue-500/20'
              : 'bg-[#080A0D] text-[#F3F4F6] border-[#1C2129] focus:border-[#6366F1] focus:ring-[#6366F1]/20'
          } ${
            error ? 'border-rose-500/60 focus:border-rose-500' : ''
          } ${disabled ? 'opacity-45 cursor-not-allowed bg-[#07090C]' : 'cursor-pointer hover:border-[#282E38]'}`}
        />
      </div>

      {/* Quick Presets Strip if enabled and not disabled */}
      {quickPresets && !disabled && (
        <div className="flex items-center gap-1.5 pt-0.5">
          <button
            type="button"
            onClick={setNow}
            className="px-2 py-0.5 rounded text-[10px] font-mono text-[#9CA3AF] bg-[#0E1117] hover:bg-[#151820] hover:text-[#F3F4F6] border border-[#1C2129] transition-colors cursor-pointer"
          >
            Now
          </button>
          <button
            type="button"
            onClick={() => addMinutes(15)}
            className="px-2 py-0.5 rounded text-[10px] font-mono text-[#9CA3AF] bg-[#0E1117] hover:bg-[#151820] hover:text-[#F3F4F6] border border-[#1C2129] transition-colors cursor-pointer"
          >
            +15m
          </button>
          <button
            type="button"
            onClick={() => addMinutes(30)}
            className="px-2 py-0.5 rounded text-[10px] font-mono text-[#9CA3AF] bg-[#0E1117] hover:bg-[#151820] hover:text-[#F3F4F6] border border-[#1C2129] transition-colors cursor-pointer"
          >
            +30m
          </button>
          <button
            type="button"
            onClick={() => addMinutes(60)}
            className="px-2 py-0.5 rounded text-[10px] font-mono text-[#9CA3AF] bg-[#0E1117] hover:bg-[#151820] hover:text-[#F3F4F6] border border-[#1C2129] transition-colors cursor-pointer"
          >
            +1h
          </button>
        </div>
      )}

      {error && <p className="text-[11px] text-rose-400">{error}</p>}
      {hint && !error && <p className="text-[11px] text-[#71717A]">{hint}</p>}
    </div>
  );
};

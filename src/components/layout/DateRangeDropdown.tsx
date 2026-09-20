import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useTrading } from '../../context/TradingContext';

export interface DateRangeState {
  startDate: string | null; // YYYY-MM-DD
  endDate: string | null;   // YYYY-MM-DD
  presetLabel: string;
}

interface DateRangeDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  selectedRange: DateRangeState;
  onSelectRange: (range: DateRangeState) => void;
}

export const PRESETS = [
  'Today',
  'This week',
  'This month',
  'Last 30 days',
  'Last month',
  'This quarter',
  'YTD (year to date)',
  'All Dates',
];

export const DateRangeDropdown: React.FC<DateRangeDropdownProps> = ({
  isOpen,
  onClose,
  selectedRange,
  onSelectRange,
}) => {
  const { theme } = useTrading();
  const isLight = theme === 'light';
  const containerRef = useRef<HTMLDivElement>(null);

  // Active viewing months for Dual Calendar
  const today = new Date();
  const [currentMonthDate, setCurrentMonthDate] = useState<Date>(() => {
    if (selectedRange.startDate) {
      const d = new Date(selectedRange.startDate);
      return new Date(d.getFullYear(), d.getMonth(), 1);
    }
    return new Date(today.getFullYear(), today.getMonth() - 1, 1);
  });

  // Next month is always currentMonthDate + 1 month
  const nextMonthDate = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 1);

  // Temporary selection state during user interaction
  const [tempStart, setTempStart] = useState<string | null>(selectedRange.startDate);
  const [tempEnd, setTempEnd] = useState<string | null>(selectedRange.endDate);
  const [activePreset, setActivePreset] = useState<string>(selectedRange.presetLabel);

  useEffect(() => {
    setTempStart(selectedRange.startDate);
    setTempEnd(selectedRange.endDate);
    setActivePreset(selectedRange.presetLabel);
  }, [selectedRange, isOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handlePrevMonth = () => {
    setCurrentMonthDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonthDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const computePresetRange = (preset: string) => {
    const now = new Date();
    const toYMD = (d: Date) => d.toISOString().split('T')[0];

    let start: Date | null = null;
    let end: Date | null = null;

    if (preset === 'Today') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (preset === 'This week') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday start
      start = new Date(now.setDate(diff));
      end = new Date();
    } else if (preset === 'This month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (preset === 'Last 30 days') {
      start = new Date();
      start.setDate(now.getDate() - 30);
      end = new Date();
    } else if (preset === 'Last month') {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 0);
    } else if (preset === 'This quarter') {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      start = new Date(now.getFullYear(), currentQuarter * 3, 1);
      end = new Date(now.getFullYear(), (currentQuarter + 1) * 3, 0);
    } else if (preset === 'YTD (year to date)') {
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date();
    } else if (preset === 'All Dates') {
      start = null;
      end = null;
    }

    const range: DateRangeState = {
      startDate: start ? toYMD(start) : null,
      endDate: end ? toYMD(end) : null,
      presetLabel: preset,
    };
    onSelectRange(range);
    onClose();
  };

  const handleDateClick = (dateStr: string) => {
    setActivePreset('Custom');
    if (!tempStart || (tempStart && tempEnd)) {
      setTempStart(dateStr);
      setTempEnd(null);
    } else {
      if (new Date(dateStr) < new Date(tempStart)) {
        setTempStart(dateStr);
        setTempEnd(tempStart);
        onSelectRange({
          startDate: dateStr,
          endDate: tempStart,
          presetLabel: 'Custom',
        });
        onClose();
      } else {
        setTempEnd(dateStr);
        onSelectRange({
          startDate: tempStart,
          endDate: dateStr,
          presetLabel: 'Custom',
        });
        onClose();
      }
    }
  };

  // Helper to render calendar month grid
  const renderCalendar = (monthDate: Date, isFirstMonth: boolean) => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const monthName = monthDate.toLocaleString('default', { month: 'short' });

    // First day of month
    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days = [];

    // Prev month padding days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      days.push({
        dayNumber: daysInPrevMonth - i,
        isCurrentMonth: false,
        dateStr: `${year}-${String(month).padStart(2, '0')}-${String(daysInPrevMonth - i).padStart(2, '0')}`,
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        dayNumber: i,
        isCurrentMonth: true,
        dateStr: `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`,
      });
    }

    // Next month padding days to fill 35 or 42 grid cells
    const remaining = 35 - days.length > 0 ? 35 - days.length : 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        dayNumber: i,
        isCurrentMonth: false,
        dateStr: `${year}-${String(month + 2).padStart(2, '0')}-${String(i).padStart(2, '0')}`,
      });
    }

    return (
      <div className="w-[230px] select-none">
        {/* Month Header with controls */}
        <div className="flex items-center justify-between px-2 py-1 mb-2">
          {isFirstMonth ? (
            <button
              onClick={handlePrevMonth}
              className={`p-1 rounded transition cursor-pointer ${
                isLight ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-100' : 'text-slate-400 hover:text-white hover:bg-[#1E222D]'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          ) : (
            <div className="w-4" />
          )}

          <div className={`flex items-center gap-1.5 text-xs font-semibold ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
            <span>{monthName}</span>
            <span className={`${isLight ? 'text-slate-500' : 'text-slate-400'} font-mono`}>{year}</span>
          </div>

          <button
            onClick={handleNextMonth}
            className={`p-1 rounded transition cursor-pointer ${
              isLight ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-100' : 'text-slate-400 hover:text-white hover:bg-[#1E222D]'
            } ${isFirstMonth ? 'sm:invisible' : ''}`}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Days of week header */}
        <div className={`grid grid-cols-7 text-center text-[10px] font-semibold mb-1 uppercase ${
          isLight ? 'text-slate-400' : 'text-slate-500'
        }`}>
          <span>Su</span>
          <span>Mo</span>
          <span>Tu</span>
          <span>We</span>
          <span>Th</span>
          <span>Fr</span>
          <span>Sa</span>
        </div>

        {/* Day numbers grid */}
        <div className="grid grid-cols-7 gap-y-0.5 text-center text-xs">
          {days.map((d, index) => {
            const isSelectedStart = tempStart === d.dateStr;
            const isSelectedEnd = tempEnd === d.dateStr;
            const isInRange =
              tempStart && tempEnd && new Date(d.dateStr) > new Date(tempStart) && new Date(d.dateStr) < new Date(tempEnd);

            return (
              <button
                key={index}
                onClick={() => handleDateClick(d.dateStr)}
                className={`h-7 w-7 mx-auto rounded-lg flex items-center justify-center text-[11px] font-mono tabular-nums transition-colors cursor-pointer ${
                  !d.isCurrentMonth
                    ? isLight ? 'text-slate-300' : 'text-slate-600'
                    : isSelectedStart || isSelectedEnd
                    ? 'bg-blue-600 text-white font-bold shadow-xs'
                    : isInRange
                    ? isLight ? 'bg-blue-50 text-blue-700 rounded-none' : 'bg-blue-500/15 text-blue-300 rounded-none'
                    : isLight ? 'text-slate-700 hover:bg-slate-100' : 'text-slate-300 hover:bg-[#1E222D]'
                }`}
              >
                {d.dayNumber}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      className={`absolute top-full right-0 mt-2 z-50 rounded-2xl border p-3 sm:p-4 animate-in fade-in duration-100 w-[calc(100vw-32px)] max-w-[620px] sm:w-auto ${
        isLight
          ? 'border-slate-200 bg-white text-slate-900 shadow-[0_12px_36px_rgba(0,0,0,0.12)]'
          : 'border-[rgba(255,255,255,0.10)] bg-[#181A21] text-slate-100 shadow-[0_12px_36px_rgba(0,0,0,0.7)]'
      }`}
    >
      {/* Top Header: Start Date -> End Date */}
      <div className={`flex items-center justify-between pb-3 mb-3 border-b text-xs ${
        isLight ? 'border-slate-100' : 'border-[rgba(255,255,255,0.07)]'
      }`}>
        <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
          <div className={`flex-1 px-2.5 sm:px-3 py-1.5 rounded-lg border font-mono tabular-nums text-center truncate text-[11px] sm:text-xs ${
            isLight ? 'border-slate-200 bg-slate-50 text-slate-800' : 'border-[rgba(255,255,255,0.08)] bg-[#0C0D12] text-slate-200'
          }`}>
            {tempStart ? tempStart : 'Start Date'}
          </div>
          <span className={`font-bold shrink-0 ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>→</span>
          <div className={`flex-1 px-2.5 sm:px-3 py-1.5 rounded-lg border font-mono tabular-nums text-center truncate text-[11px] sm:text-xs ${
            isLight ? 'border-slate-200 bg-slate-50 text-slate-800' : 'border-[rgba(255,255,255,0.08)] bg-[#0C0D12] text-slate-200'
          }`}>
            {tempEnd ? tempEnd : 'End Date'}
          </div>
        </div>
        <button
          onClick={onClose}
          className={`ml-3 p-1 rounded-lg transition cursor-pointer shrink-0 ${
            isLight ? 'text-slate-400 hover:text-slate-700 hover:bg-slate-100' : 'text-slate-400 hover:text-white hover:bg-[#1E222D]'
          }`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Main Dual Calendar + Presets Column */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
        {/* Left Side: Dual Month Calendars */}
        <div className={`flex flex-col sm:flex-row gap-3 sm:gap-4 sm:border-r sm:pr-4 justify-center items-center ${
          isLight ? 'sm:border-slate-100' : 'sm:border-[rgba(255,255,255,0.07)]'
        }`}>
          {renderCalendar(currentMonthDate, true)}
          <div className="hidden md:block">
            {renderCalendar(nextMonthDate, false)}
          </div>
        </div>

        {/* Right Side: Quick Presets */}
        <div className={`w-full sm:w-[130px] flex flex-row sm:flex-col flex-wrap sm:flex-nowrap gap-1 overflow-x-auto custom-scrollbar pt-2 sm:pt-0 border-t sm:border-t-0 ${
          isLight ? 'border-slate-100' : 'border-[rgba(255,255,255,0.07)]'
        }`}>
          <div className={`w-full text-[10px] font-semibold uppercase tracking-wider pb-1 hidden sm:block ${
            isLight ? 'text-slate-400' : 'text-slate-500'
          }`}>
            Quick Select
          </div>
          {PRESETS.map(preset => {
            const isSelected = activePreset === preset;
            return (
              <button
                key={preset}
                onClick={() => computePresetRange(preset)}
                className={`px-2.5 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-medium transition cursor-pointer shrink-0 whitespace-nowrap text-left ${
                  isSelected
                    ? isLight
                      ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-200'
                      : 'bg-blue-600/15 text-blue-400 font-semibold border border-blue-500/30'
                    : isLight
                    ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
                    : 'text-slate-400 hover:text-white hover:bg-[#1E222D] border border-transparent'
                }`}
              >
                {preset}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

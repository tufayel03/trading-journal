import React, { useState } from 'react';
import { X, Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onGoTo: (targetTimestampSec: number) => void;
  initialTimestamp?: number;
  isDarkTheme?: boolean;
}

export const TradingViewGoToModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onGoTo,
  initialTimestamp,
  isDarkTheme = true
}) => {
  if (!isOpen) return null;

  const initDate = initialTimestamp ? new Date(initialTimestamp * 1000) : new Date();
  
  const [activeTab, setActiveTab] = useState<'date' | 'custom'>('date');
  const [selectedDate, setSelectedDate] = useState<Date>(initDate);
  const [timeStr, setTimeStr] = useState<string>(
    String(initDate.getHours()).padStart(2, '0') + ':' + String(initDate.getMinutes()).padStart(2, '0')
  );
  const [viewYear, setViewYear] = useState<number>(initDate.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(initDate.getMonth()); // 0-indexed

  // Calendar calculations
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Sun, 1 = Mon ...
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const adjustedFirstDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1; // 0 = Mon, 6 = Sun

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(y => y - 1);
    } else {
      setViewMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(y => y + 1);
    } else {
      setViewMonth(m => m + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    const newDate = new Date(viewYear, viewMonth, day);
    setSelectedDate(newDate);
  };

  const handleConfirm = () => {
    const [hours, minutes] = timeStr.split(':').map(n => parseInt(n, 10) || 0);
    const targetDate = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      selectedDate.getDate(),
      hours,
      minutes,
      0
    );
    const timestampSec = Math.floor(targetDate.getTime() / 1000);
    onGoTo(timestampSec);
    onClose();
  };

  const formattedDateStr = 
    selectedDate.getFullYear() + '-' +
    String(selectedDate.getMonth() + 1).padStart(2, '0') + '-' +
    String(selectedDate.getDate()).padStart(2, '0');

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/60 backdrop-blur-xs select-none">
      <div className={`w-[340px] rounded-2xl shadow-2xl border p-4 flex flex-col gap-3 font-sans transition-all animate-scaleIn ${
        isDarkTheme 
          ? 'bg-[#1E222D] border-[#2A2E39] text-[#D1D4DC]' 
          : 'bg-white border-gray-200 text-gray-800 shadow-gray-400/50'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between pb-1">
          <h3 className="text-base font-bold tracking-tight text-white dark:text-white">
            Go to
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs: Date vs Custom range */}
        <div className="flex items-center gap-4 border-b border-gray-700/50 text-xs font-semibold pb-1">
          <button
            onClick={() => setActiveTab('date')}
            className={`pb-1.5 transition-all relative ${
              activeTab === 'date' ? 'text-emerald-400 font-bold' : 'text-gray-400 hover:text-white'
            }`}
          >
            Date
            {activeTab === 'date' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400 rounded-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('custom')}
            className={`pb-1.5 transition-all relative ${
              activeTab === 'custom' ? 'text-emerald-400 font-bold' : 'text-gray-400 hover:text-white'
            }`}
          >
            Custom range
            {activeTab === 'custom' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400 rounded-full" />
            )}
          </button>
        </div>

        {/* Date & Time Inputs */}
        <div className="flex items-center gap-2">
          {/* Date Input */}
          <div className="flex-1 flex items-center justify-between px-3 py-2 rounded-xl bg-[#131722] border border-[#2A2E39] text-xs font-mono">
            <span className="text-white font-bold">{formattedDateStr}</span>
            <CalendarIcon className="w-3.5 h-3.5 text-gray-400" />
          </div>

          {/* Time Input */}
          <div className="w-28 flex items-center justify-between px-2.5 py-2 rounded-xl bg-[#131722] border border-[#2A2E39] text-xs font-mono">
            <input
              type="text"
              value={timeStr}
              onChange={(e) => setTimeStr(e.target.value)}
              placeholder="00:00"
              className="w-14 bg-transparent text-white font-bold focus:outline-none"
            />
            <Clock className="w-3.5 h-3.5 text-gray-400" />
          </div>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-between pt-1 px-1 text-xs font-bold text-white">
          <button
            onClick={handlePrevMonth}
            className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span>
            {monthNames[viewMonth]} {viewYear}
          </span>
          <button
            onClick={handleNextMonth}
            className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Weekday Row */}
        <div className="grid grid-cols-7 text-center text-[10px] font-bold text-gray-400">
          <span>Mo</span>
          <span>Tu</span>
          <span>We</span>
          <span>Th</span>
          <span>Fr</span>
          <span>Sa</span>
          <span>Su</span>
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium">
          {/* Empty prefix cells */}
          {Array.from({ length: adjustedFirstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="h-7" />
          ))}

          {/* Day Cells */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const isSelected = 
              selectedDate.getDate() === day &&
              selectedDate.getMonth() === viewMonth &&
              selectedDate.getFullYear() === viewYear;

            return (
              <button
                key={day}
                onClick={() => handleSelectDay(day)}
                className={`h-7 w-7 rounded-lg flex items-center justify-center mx-auto transition-all text-xs font-semibold ${
                  isSelected
                    ? 'bg-emerald-500 text-black font-extrabold shadow-md'
                    : 'text-gray-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                {day}
              </button>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-700/50 mt-1">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-extrabold shadow-lg shadow-emerald-500/25 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
          >
            Go to
          </button>
        </div>
      </div>
    </div>
  );
};

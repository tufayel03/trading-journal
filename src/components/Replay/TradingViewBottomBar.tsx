import React, { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';

interface Props {
  onSelectRange?: (range: string) => void;
  onOpenGoTo?: () => void;
  isDarkTheme?: boolean;
}

export const TradingViewBottomBar: React.FC<Props> = ({
  onSelectRange,
  onOpenGoTo,
  isDarkTheme = true
}) => {
  const [activeRange, setActiveRange] = useState<string>('ALL');
  const [currentTimeStr, setCurrentTimeStr] = useState<string>('');
  const [isLogScale, setIsLogScale] = useState<boolean>(false);
  const [isPercentScale, setIsPercentScale] = useState<boolean>(false);
  const [isAutoScale, setIsAutoScale] = useState<boolean>(true);

  const ranges = ['1D', '5D', '1M', '3M', '6M', 'YTD', '1Y', '5Y', 'ALL'];

  // Update live clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      const tzOffsetHours = -now.getTimezoneOffset() / 60;
      const tzStr = tzOffsetHours >= 0 ? `+${tzOffsetHours}` : `${tzOffsetHours}`;
      setCurrentTimeStr(`${hours}:${minutes}:${seconds} (UTC${tzStr})`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <footer
      className={`h-7 px-3 border-t flex items-center justify-between text-[11px] font-sans select-none z-20 shrink-0 ${
        isDarkTheme
          ? 'bg-[#131722] border-[#2A2E39] text-[#787B86]'
          : 'bg-[#FFFFFF] border-[#E0E3EB] text-[#787B86]'
      }`}
    >
      {/* Left: TradingView Logo Watermark & Date Range Selector */}
      <div className="flex items-center gap-2">
        {/* TradingView Mini Logo Watermark */}
        <div className="flex items-center gap-1 font-black text-xs tracking-tighter text-[#D1D4DC]">
          <span className="text-[#2962FF] font-mono">17</span>
          <span className="hidden sm:inline font-bold">TradingView</span>
        </div>

        <div className={`w-[1px] h-3.5 mx-1 ${isDarkTheme ? 'bg-[#2A2E39]' : 'bg-[#E0E3EB]'}`} />

        {/* Date Ranges */}
        <div className="flex items-center gap-0.5">
          {ranges.map(r => (
            <button
              key={r}
              onClick={() => {
                setActiveRange(r);
                onSelectRange?.(r);
              }}
              className={`px-1.5 py-0.5 rounded font-mono font-medium transition-colors ${
                activeRange === r
                  ? 'text-[#2962FF] font-bold'
                  : isDarkTheme
                  ? 'hover:text-[#D1D4DC]'
                  : 'hover:text-[#131722]'
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        {/* "Go to date" Calendar Icon Button */}
        {onOpenGoTo && (
          <button
            onClick={onOpenGoTo}
            className={`p-1 rounded transition-colors ${
              isDarkTheme ? 'hover:text-[#D1D4DC]' : 'hover:text-[#131722]'
            }`}
            title="Go to Date & Time (Alt+G)"
          >
            <Calendar className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Right: %, log, auto scale toggles + Real-time Clock */}
      <div className="flex items-center gap-2 font-mono">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsPercentScale(!isPercentScale)}
            className={`px-1 py-0.5 rounded font-bold transition-colors ${
              isPercentScale ? 'text-[#2962FF]' : 'hover:text-white'
            }`}
            title="Toggle Percentage Scale"
          >
            %
          </button>
          <button
            onClick={() => setIsLogScale(!isLogScale)}
            className={`px-1 py-0.5 rounded font-bold transition-colors ${
              isLogScale ? 'text-[#2962FF]' : 'hover:text-white'
            }`}
            title="Toggle Logarithmic Scale"
          >
            log
          </button>
          <button
            onClick={() => setIsAutoScale(!isAutoScale)}
            className={`px-1 py-0.5 rounded font-bold transition-colors ${
              isAutoScale ? 'text-[#2962FF]' : 'hover:text-white'
            }`}
            title="Toggle Auto Scale"
          >
            auto
          </button>
        </div>

        <div className={`w-[1px] h-3.5 mx-1 ${isDarkTheme ? 'bg-[#2A2E39]' : 'bg-[#E0E3EB]'}`} />

        {/* Real-time Clock & Timezone */}
        <span className="text-[10px] text-[#787B86] whitespace-nowrap">
          {currentTimeStr}
        </span>
      </div>
    </footer>
  );
};

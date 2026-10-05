import React from 'react';
import {
  BookOpen,
  Sliders,
  Layers,
  HelpCircle,
  Bell,
  Clock,
  BarChart2
} from 'lucide-react';

interface Props {
  activeTab: 'details' | 'notes' | 'drawings' | null;
  onSelectTab: (tab: 'details' | 'notes' | 'drawings' | null) => void;
  isDarkTheme?: boolean;
}

export const TradingViewRightDock: React.FC<Props> = ({
  activeTab,
  onSelectTab,
  isDarkTheme = true
}) => {
  const tabs = [
    { id: 'details' as const, label: 'Trade Execution & Stats', icon: <BarChart2 className="w-4 h-4" /> },
    { id: 'notes' as const, label: 'Journal Notes & Mistakes', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'drawings' as const, label: 'Object Tree & Drawings', icon: <Layers className="w-4 h-4" /> }
  ];

  return (
    <div
      className={`w-11 shrink-0 h-full border-l flex flex-col items-center py-2 select-none z-20 ${
        isDarkTheme
          ? 'bg-[#131722] border-[#2A2E39] text-[#787B86]'
          : 'bg-[#FFFFFF] border-[#E0E3EB] text-[#787B86]'
      }`}
    >
      <div className="flex flex-col gap-1 w-full px-1 items-center">
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(isActive ? null : tab.id)}
              className={`w-9 h-9 rounded-md transition-all flex items-center justify-center relative group ${
                isActive
                  ? 'bg-[#2962FF] text-white shadow-md'
                  : isDarkTheme
                  ? 'hover:bg-[#1E222D] text-[#B2B5BE] hover:text-white'
                  : 'hover:bg-[#F0F3FA] text-[#434651] hover:text-[#131722]'
              }`}
              title={tab.label}
            >
              {tab.icon}

              {/* Tooltip */}
              <div className="absolute right-full mr-2 px-2.5 py-1 bg-[#1E222D] text-white text-[11px] font-medium rounded-md shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 border border-gray-700">
                {tab.label}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-auto flex flex-col gap-1 w-full px-1 items-center">
        <button
          className={`w-9 h-9 rounded-md transition-all flex items-center justify-center ${
            isDarkTheme ? 'hover:bg-[#1E222D] text-[#787B86] hover:text-white' : 'hover:bg-[#F0F3FA] text-[#787B86] hover:text-black'
          }`}
          title="Help & Shortcuts"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

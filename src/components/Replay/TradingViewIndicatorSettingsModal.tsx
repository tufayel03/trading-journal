import React, { useState, useEffect } from 'react';
import { X, Check, RotateCcw, Sliders, Palette, Eye } from 'lucide-react';
import { PineInputSchema } from './KLinePineRunner';

interface Props {
  isOpen: boolean;
  title: string;
  inputSchema: PineInputSchema[];
  currentInputs: Record<string, any>;
  onClose: () => void;
  onApply: (newInputs: Record<string, any>) => void;
}

const TIMEFRAME_OPTIONS = [
  { label: '1 minute', value: '1' },
  { label: '3 minutes', value: '3' },
  { label: '5 minutes', value: '5' },
  { label: '15 minutes', value: '15' },
  { label: '30 minutes', value: '30' },
  { label: '1 hour', value: '60' },
  { label: '4 hours', value: '240' },
  { label: '1 day', value: '1D' },
  { label: '1 week', value: '1W' },
  { label: '1 month', value: '1M' }
];

export const TradingViewIndicatorSettingsModal: React.FC<Props> = ({
  isOpen,
  title,
  inputSchema = [],
  currentInputs = {},
  onClose,
  onApply
}) => {
  const [activeTab, setActiveTab] = useState<'inputs' | 'style'>('inputs');
  const [values, setValues] = useState<Record<string, any>>({});

  useEffect(() => {
    if (isOpen) {
      setValues({ ...currentInputs });
    }
  }, [isOpen, currentInputs]);

  if (!isOpen) return null;

  const handleResetDefaults = () => {
    const defaults: Record<string, any> = {};
    for (const inp of inputSchema) {
      defaults[inp.key] = inp.defval;
    }
    setValues(defaults);
  };

  const handleSave = () => {
    onApply(values);
    onClose();
  };

  const handleChange = (key: string, val: any) => {
    setValues(prev => ({ ...prev, [key]: val }));
  };

  // Separate inputs between 'Inputs' (numbers, booleans, timeframes) and 'Style' (colors, line widths)
  const styleInputs = inputSchema.filter(
    inp => inp.type === 'color' || inp.key.toLowerCase().includes('color') || inp.key.toLowerCase().includes('style')
  );
  const regularInputs = inputSchema.filter(
    inp => !(inp.type === 'color' || inp.key.toLowerCase().includes('color') || inp.key.toLowerCase().includes('style'))
  );

  const displayedList = activeTab === 'style' ? styleInputs : regularInputs;

  // Group inputs by their Pine `group` attribute
  const groupedInputs: { groupName: string; items: PineInputSchema[] }[] = [];
  const groupMap = new Map<string, PineInputSchema[]>();

  displayedList.forEach(inp => {
    const gName = inp.group?.replace(/[━═─-]/g, '').trim() || 'General';
    if (!groupMap.has(gName)) {
      groupMap.set(gName, []);
    }
    groupMap.get(gName)!.push(inp);
  });

  groupMap.forEach((items, groupName) => {
    groupedInputs.push({ groupName, items });
  });

  return (
    <div className="fixed inset-0 z-[100005] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg bg-[#1E222D] border border-[#2A2E39] rounded-xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden text-[#D1D4DC] font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header (1:1 TradingView Indicator Dialog) */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#2A2E39] bg-[#171B26]">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#2962FF]" />
            <h3 className="text-sm font-bold text-white tracking-wide truncate max-w-[340px]">
              {title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-[#2A2E39] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-4 px-5 border-b border-[#2A2E39] bg-[#1B1F2B] text-xs font-semibold">
          <button
            onClick={() => setActiveTab('inputs')}
            className={`py-2.5 transition-colors relative flex items-center gap-1.5 ${
              activeTab === 'inputs' ? 'text-white font-bold' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Inputs</span>
            {activeTab === 'inputs' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2962FF]" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('style')}
            className={`py-2.5 transition-colors relative flex items-center gap-1.5 ${
              activeTab === 'style' ? 'text-white font-bold' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Style</span>
            {activeTab === 'style' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2962FF]" />
            )}
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 text-xs">
          {displayedList.length === 0 ? (
            <div className="py-12 text-center text-gray-500 italic">
              No configurable {activeTab} available for this indicator.
            </div>
          ) : (
            groupedInputs.map(({ groupName, items }) => (
              <div key={groupName} className="space-y-3">
                {groupName !== 'General' && (
                  <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 border-b border-[#2A2E39]/60 pb-1 pt-1">
                    {groupName}
                  </div>
                )}

                <div className="space-y-2.5">
                  {items.map((inp) => {
                    const currentVal = values[inp.key] !== undefined ? values[inp.key] : inp.defval;
                    const cleanTitle = inp.title || inp.key;

                    // 1. Boolean Toggle / Checkbox
                    if (inp.type === 'bool') {
                      return (
                        <label
                          key={inp.key}
                          className="flex items-center justify-between py-1 px-1.5 rounded hover:bg-[#2A2E39]/40 cursor-pointer transition-colors"
                        >
                          <span className="text-gray-200 font-medium select-none">{cleanTitle}</span>
                          <input
                            type="checkbox"
                            checked={Boolean(currentVal)}
                            onChange={(e) => handleChange(inp.key, e.target.checked)}
                            className="w-4 h-4 rounded bg-[#2A2E39] border-[#363C4E] text-[#2962FF] focus:ring-0 focus:ring-offset-0 cursor-pointer accent-[#2962FF]"
                          />
                        </label>
                      );
                    }

                    // 2. Timeframe Selection Dropdown
                    if (inp.type === 'timeframe') {
                      return (
                        <div key={inp.key} className="flex items-center justify-between py-1 px-1.5">
                          <span className="text-gray-200 font-medium">{cleanTitle || 'Timeframe'}</span>
                          <select
                            value={String(currentVal)}
                            onChange={(e) => handleChange(inp.key, e.target.value)}
                            className="bg-[#2A2E39] hover:bg-[#363C4E] border border-[#363C4E] rounded px-2.5 py-1 text-white text-xs font-semibold focus:outline-none focus:border-[#2962FF] cursor-pointer"
                          >
                            {TIMEFRAME_OPTIONS.map((tf) => (
                              <option key={tf.value} value={tf.value}>
                                {tf.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      );
                    }

                    // 3. String Options Dropdown or Freeform Input
                    if (inp.type === 'string' && inp.options && inp.options.length > 0) {
                      return (
                        <div key={inp.key} className="flex items-center justify-between py-1 px-1.5">
                          <span className="text-gray-200 font-medium">{cleanTitle}</span>
                          <select
                            value={String(currentVal)}
                            onChange={(e) => handleChange(inp.key, e.target.value)}
                            className="bg-[#2A2E39] hover:bg-[#363C4E] border border-[#363C4E] rounded px-2.5 py-1 text-white text-xs font-semibold focus:outline-none focus:border-[#2962FF] cursor-pointer"
                          >
                            {inp.options.map((opt: any) => (
                              <option key={String(opt)} value={String(opt)}>
                                {String(opt)}
                              </option>
                            ))}
                          </select>
                        </div>
                      );
                    }

                    // 4. Number Input (int / float)
                    if (inp.type === 'int' || inp.type === 'float') {
                      const step = inp.step || (inp.type === 'float' ? 0.1 : 1);
                      return (
                        <div key={inp.key} className="flex items-center justify-between py-1 px-1.5">
                          <span className="text-gray-200 font-medium">{cleanTitle}</span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleChange(inp.key, Math.max(inp.min ?? -999999, Number(currentVal) - step))}
                              className="w-6 h-6 rounded bg-[#2A2E39] hover:bg-[#363C4E] text-gray-300 flex items-center justify-center font-bold text-sm"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              value={currentVal ?? 0}
                              min={inp.min}
                              max={inp.max}
                              step={step}
                              onChange={(e) => handleChange(inp.key, Number(e.target.value))}
                              className="w-16 bg-[#2A2E39] border border-[#363C4E] rounded px-2 py-1 text-white text-center text-xs font-semibold focus:outline-none focus:border-[#2962FF]"
                            />
                            <button
                              type="button"
                              onClick={() => handleChange(inp.key, Math.min(inp.max ?? 999999, Number(currentVal) + step))}
                              className="w-6 h-6 rounded bg-[#2A2E39] hover:bg-[#363C4E] text-gray-300 flex items-center justify-center font-bold text-sm"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      );
                    }

                    // 5. Color Picker
                    if (inp.type === 'color') {
                      const hexColor = typeof currentVal === 'string' && currentVal.startsWith('#')
                        ? currentVal.slice(0, 7)
                        : '#2962FF';
                      return (
                        <div key={inp.key} className="flex items-center justify-between py-1 px-1.5">
                          <span className="text-gray-200 font-medium">{cleanTitle}</span>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={hexColor}
                              onChange={(e) => handleChange(inp.key, e.target.value)}
                              className="w-7 h-7 rounded border border-[#363C4E] bg-transparent cursor-pointer p-0"
                            />
                            <span className="font-mono text-[11px] text-gray-400 uppercase">{hexColor}</span>
                          </div>
                        </div>
                      );
                    }

                    // 6. Generic Text Input
                    return (
                      <div key={inp.key} className="flex items-center justify-between py-1 px-1.5">
                        <span className="text-gray-200 font-medium">{cleanTitle}</span>
                        <input
                          type="text"
                          value={String(currentVal ?? '')}
                          onChange={(e) => handleChange(inp.key, e.target.value)}
                          className="bg-[#2A2E39] border border-[#363C4E] rounded px-2 py-1 text-white text-xs font-semibold focus:outline-none focus:border-[#2962FF] max-w-[140px]"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer (Defaults, Cancel, OK) */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-[#2A2E39] bg-[#171B26]">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#2A2E39] transition-colors text-xs font-semibold"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Defaults</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-[#363C4E] bg-transparent hover:bg-[#2A2E39] text-gray-300 hover:text-white transition-colors text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-1.5 rounded-lg bg-[#2962FF] hover:bg-[#1E50DB] text-white transition-colors text-xs font-bold shadow-md shadow-blue-500/20"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

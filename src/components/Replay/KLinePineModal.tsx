import React, { useState, useEffect } from 'react';
import {
  X,
  Code,
  Sparkles,
  Play,
  Trash2,
  Copy,
  Check,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  FolderOpen,
  ClipboardPaste
} from 'lucide-react';
import sessionSweepCode from '../../session sweep indicator pine script.pine?raw';
import fadiHtfCandleCode from '../../htf candle fadi.pine?raw';

export interface PinePreset {
  name: string;
  desc: string;
  code: string;
}

export const PINE_SCRIPT_PRESETS: PinePreset[] = [
  {
    name: 'ICT HTF Candles (fadi)',
    desc: 'Multi-HTF candlestick projections with Fair Value Gaps and trace lines',
    code: fadiHtfCandleCode
  },
  {
    name: 'Session Sweeps Enhanced [LuxAlgo]',
    desc: 'Asian, London, NY AM/PM sweeps HUD table, zones & levels',
    code: sessionSweepCode
  }
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onRunScript: (code: string) => Promise<void>;
  onRemoveScript: () => void;
  hasActiveIndicator: boolean;
  activeIndicatorTitle: string | null;
  isCompiling: boolean;
  statusMessage: string | null;
  statusType: 'success' | 'error' | null;
  initialCode?: string | null;
}

export const KLinePineModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onRunScript,
  onRemoveScript,
  hasActiveIndicator,
  activeIndicatorTitle,
  isCompiling,
  statusMessage,
  statusType,
  initialCode
}) => {
  const [selectedPresetIndex, setSelectedPresetIndex] = useState(0);
  const [code, setCode] = useState(() => {
    if (initialCode) return initialCode;
    const saved = localStorage.getItem('kline_pine_custom_code');
    // Sanitize saved code against truncated snippets
    if (saved && saved.includes('indicator(') && saved.length > 50 && !saved.includes('f_renderSessionRow(swpTbl, 1,')) {
      return saved;
    }
    return PINE_SCRIPT_PRESETS[0].code;
  });
  const [copied, setCopied] = useState(false);
  const [localFeedback, setLocalFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && initialCode) {
      setCode(initialCode);
    }
  }, [isOpen, initialCode]);

  useEffect(() => {
    if (code && code.trim().length > 0) {
      localStorage.setItem('kline_pine_custom_code', code);
    }
  }, [code]);

  if (!isOpen) return null;

  const handleSelectPreset = (index: number) => {
    setSelectedPresetIndex(index);
    setCode(PINE_SCRIPT_PRESETS[index].code);
    setLocalFeedback(null);
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim()) {
        setCode(text);
        setLocalFeedback(`✓ Pasted ${text.split('\n').length} lines (${text.length} chars) from clipboard`);
        setTimeout(() => setLocalFeedback(null), 3000);
      }
    } catch {
      setLocalFeedback('Clipboard access denied. Please click into editor and press Ctrl+V.');
      setTimeout(() => setLocalFeedback(null), 3500);
    }
  };

  const handleLoadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        if (text) {
          setCode(text);
          setLocalFeedback(`✓ Loaded "${file.name}" (${text.split('\n').length} lines)`);
          setTimeout(() => setLocalFeedback(null), 4000);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleCompile = async () => {
    await onRunScript(code);
  };

  const lineCount = code.split('\n').length;
  const charCount = code.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-4xl bg-[#1E222D] border border-[#2A2E39] rounded-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-gray-200 font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#2A2E39] bg-[#171B26]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Code className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-wide">Pine Script Indicator Studio</h3>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  Pine v5/v6
                </span>
                <span className="text-[11px] font-mono text-gray-400">
                  ({lineCount} lines, {(charCount / 1024).toFixed(1)} KB)
                </span>
                {hasActiveIndicator && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Running: {activeIndicatorTitle || 'Active'}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Paste any Pine Script or pick a preset to run on KLine Pro Chart in Trade Replay
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-[#2A2E39] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar: Presets & Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-2.5 border-b border-[#2A2E39] bg-[#1B1F2B]">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 font-medium">Presets:</span>
            <div className="relative">
              <select
                value={selectedPresetIndex}
                onChange={(e) => handleSelectPreset(Number(e.target.value))}
                className="appearance-none bg-[#2A2E39] hover:bg-[#363C4E] text-white text-xs font-semibold py-1.5 pl-3 pr-8 rounded-lg border border-[#363C4E] focus:outline-none focus:border-blue-500 cursor-pointer transition-colors max-w-[260px] truncate"
              >
                {PINE_SCRIPT_PRESETS.map((preset, idx) => (
                  <option key={preset.name} value={idx}>
                    {preset.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <span className="text-[11px] text-gray-400 italic hidden sm:inline max-w-[220px] truncate">
              ({PINE_SCRIPT_PRESETS[selectedPresetIndex]?.desc})
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Paste from Clipboard */}
            <button
              type="button"
              onClick={handlePasteClipboard}
              className="p-1.5 px-2 rounded-lg bg-[#2A2E39] hover:bg-[#363C4E] text-blue-300 hover:text-white transition-colors flex items-center gap-1 text-xs font-semibold"
              title="Paste Pine Script code from clipboard"
            >
              <ClipboardPaste className="w-3.5 h-3.5 text-blue-400" />
              <span>Paste Clipboard</span>
            </button>

            {/* Load .pine File */}
            <label
              className="p-1.5 px-2 rounded-lg bg-[#2A2E39] hover:bg-[#363C4E] text-emerald-300 hover:text-white transition-colors flex items-center gap-1 text-xs font-semibold cursor-pointer"
              title="Upload and load a .pine file directly from your computer"
            >
              <FolderOpen className="w-3.5 h-3.5 text-emerald-400" />
              <span>Load .pine File</span>
              <input
                type="file"
                accept=".pine,.txt"
                className="hidden"
                onChange={handleLoadFile}
              />
            </label>

            {/* Copy Code */}
            <button
              type="button"
              onClick={handleCopyCode}
              className="p-1.5 px-2 rounded-lg bg-[#2A2E39] hover:bg-[#363C4E] text-gray-300 hover:text-white transition-colors flex items-center gap-1 text-xs"
              title="Copy code to clipboard"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            {/* Reset to Preset */}
            <button
              type="button"
              onClick={() => setCode(PINE_SCRIPT_PRESETS[selectedPresetIndex].code)}
              className="p-1.5 px-2 rounded-lg bg-[#2A2E39] hover:bg-[#363C4E] text-gray-300 hover:text-white transition-colors flex items-center gap-1 text-xs"
              title="Reset code to current preset"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>

            {/* Clear Editor */}
            <button
              type="button"
              onClick={() => setCode('')}
              className="p-1.5 px-2 rounded-lg bg-[#2A2E39] hover:bg-[#363C4E] text-gray-400 hover:text-red-400 transition-colors flex items-center gap-1 text-xs"
              title="Clear editor"
            >
              <span>Clear</span>
            </button>
          </div>
        </div>

        {/* Code Editor Body */}
        <div className="relative flex-1 min-h-[340px] max-h-[500px] bg-[#131722] overflow-hidden flex">
          {/* Line Numbers gutter */}
          <div className="w-12 py-3 bg-[#171B26] border-r border-[#2A2E39] select-none text-right pr-2.5 text-[11px] font-mono text-gray-600 overflow-hidden leading-5">
            {Array.from({ length: Math.min(lineCount, 500) }).map((_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>

          {/* Code Textarea */}
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="// Paste or write Pine Script v5/v6 code here..."
            spellCheck={false}
            className="flex-1 w-full h-full p-3 bg-transparent text-gray-200 font-mono text-xs leading-5 resize-none outline-none border-none focus:ring-0 whitespace-pre overflow-auto"
            style={{ tabSize: 4 }}
          />
        </div>

        {/* Local Toolbar Feedback */}
        {localFeedback && (
          <div className="px-4 py-1.5 text-xs bg-blue-500/10 border-t border-blue-500/20 text-blue-300 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span className="font-mono text-[11px]">{localFeedback}</span>
          </div>
        )}

        {/* Status / Error Banner */}
        {statusMessage && (
          <div
            className={`px-4 py-2 text-xs flex items-center gap-2 border-t ${
              statusType === 'error'
                ? 'bg-red-500/10 border-red-500/30 text-red-400'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            }`}
          >
            {statusType === 'error' ? (
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            )}
            <span className="font-mono text-[11px] flex-1 break-words">{statusMessage}</span>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-[#2A2E39] bg-[#171B26]">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            {hasActiveIndicator && (
              <button
                type="button"
                onClick={onRemoveScript}
                className="px-3 py-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 font-semibold flex items-center gap-1.5 text-xs transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove from Chart</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg bg-[#2A2E39] hover:bg-[#363C4E] text-gray-300 font-semibold text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isCompiling || !code.trim()}
              onClick={handleCompile}
              className={`px-4 py-1.5 rounded-lg font-bold text-xs flex items-center gap-2 shadow-lg transition-all ${
                isCompiling || !code.trim()
                  ? 'bg-blue-600/50 text-white/50 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-500 active:scale-95 text-white shadow-blue-500/20'
              }`}
            >
              {isCompiling ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Compiling & Executing...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Compile & Add to Chart</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

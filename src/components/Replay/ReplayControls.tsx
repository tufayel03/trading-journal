import React from 'react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  RotateCcw, 
  FastForward, 
  Activity, 
  Target, 
  Clock, 
  TrendingUp, 
  TrendingDown,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Trade } from '../../types';
import { Candle } from './TradingViewReplayChart';

interface Props {
  candles: Candle[];
  currentIndex: number;
  isPlaying: boolean;
  speed: number;
  trade: Trade;
  onPlayToggle: () => void;
  onStepForward: () => void;
  onStepBackward: () => void;
  onJumpToEntry: () => void;
  onJumpToExit: () => void;
  onReset: () => void;
  onSpeedChange: (speed: number) => void;
  onSeek: (index: number) => void;
}

export const ReplayControls: React.FC<Props> = ({
  candles,
  currentIndex,
  isPlaying,
  speed,
  trade,
  onPlayToggle,
  onStepForward,
  onStepBackward,
  onJumpToEntry,
  onJumpToExit,
  onReset,
  onSpeedChange,
  onSeek
}) => {
  const currentCandle = candles[currentIndex] || candles[0];
  const entrySec = Math.floor(new Date(trade.openTime).getTime() / 1000);
  const exitSec = Math.floor(new Date(trade.closeTime).getTime() / 1000);

  const currentSec = currentCandle ? currentCandle.time : 0;
  const isBeforeEntry = currentSec < entrySec;
  const isInTrade = currentSec >= entrySec && currentSec < exitSec;
  const isAfterExit = currentSec >= exitSec;

  const isBuy = trade.direction === 'BUY';
  const isCent = trade.isCent || trade.accountCurrency === 'USC';

  // Calculate live floating PnL and Pips based on current replay candle close
  let liveFloatingPips = 0;
  let liveFloatingPnL = 0;
  let liveFloatingRR = 0;

  if (isInTrade && currentCandle) {
    const diff = isBuy ? currentCandle.close - trade.openPrice : trade.openPrice - currentCandle.close;
    const isGold = trade.symbol.includes('XAU') || trade.symbol.includes('GOLD');
    const isJPY = trade.symbol.includes('JPY');
    const pipFactor = isGold ? 0.10 : isJPY ? 0.01 : 0.0001;

    liveFloatingPips = Number((diff / pipFactor).toFixed(1));

    // Floating P&L estimation
    if (trade.pips && trade.pips !== 0) {
      const pnlPerPip = trade.netProfit / trade.pips;
      liveFloatingPnL = Number((liveFloatingPips * pnlPerPip).toFixed(2));
    } else {
      liveFloatingPnL = Number((diff * trade.lotSize * (isGold ? 100 : 100000) * (isCent ? 100 : 1)).toFixed(2));
    }

    if (trade.stopLoss && trade.stopLoss > 0) {
      const riskPips = Math.abs(trade.openPrice - trade.stopLoss) / pipFactor;
      if (riskPips > 0) {
        liveFloatingRR = Number((liveFloatingPips / riskPips).toFixed(2));
      }
    }
  } else if (isAfterExit) {
    liveFloatingPnL = trade.netProfit;
    liveFloatingPips = trade.pips;
    liveFloatingRR = trade.rMultiple || 0;
  }

  const currentDateFormatted = currentCandle 
    ? new Date(currentCandle.time * 1000).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    : '--';

  const speeds = [0.5, 1, 2, 5, 10];

  return (
    <div className="bg-[#111827] border-t border-[#1F2937] px-4 py-2.5 shadow-2xl flex flex-col gap-2 shrink-0 z-10">
      
      {/* Top Bar: Timeline Scrubber & Live Execution Status */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-2">
        
        {/* Current Replay Time & Scrubber */}
        <div className="flex items-center gap-3 flex-1 w-full">
          <div className="flex items-center gap-1.5 text-xs text-gray-300 font-mono bg-[#0B0F19] px-2.5 py-1 rounded border border-[#1F2937] shrink-0">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            <span>{currentDateFormatted}</span>
          </div>

          <input
            type="range"
            min={0}
            max={Math.max(0, candles.length - 1)}
            value={currentIndex}
            onChange={(e) => onSeek(parseInt(e.target.value, 10))}
            className="w-full h-1.5 bg-[#1F2937] rounded-lg appearance-none cursor-pointer accent-emerald-500 hover:accent-emerald-400"
          />

          <span className="text-[11px] font-mono text-gray-400 shrink-0">
            {currentIndex + 1} / {candles.length} bars
          </span>
        </div>

        {/* Live Execution HUD Badge */}
        <div className="flex items-center gap-2 shrink-0">
          {isBeforeEntry && (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-lg text-xs font-bold animate-pulse">
              <Target className="w-3.5 h-3.5" />
              <span>Pre-Trade Analysis</span>
            </div>
          )}

          {isInTrade && (
            <div className="flex items-center gap-3 px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-lg text-xs font-bold">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <span>POSITION ACTIVE ({trade.direction})</span>
              </div>
              <div className="flex items-center gap-2 border-l border-amber-500/30 pl-2 font-mono">
                <span className={liveFloatingPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                  {liveFloatingPnL >= 0 ? '+' : ''}
                  {isCent ? `${(liveFloatingPnL * 100).toFixed(2)} USC` : `$${liveFloatingPnL.toFixed(2)}`}
                </span>
                <span className="text-gray-400 font-normal">
                  ({liveFloatingPips >= 0 ? '+' : ''}{liveFloatingPips}p)
                </span>
                {liveFloatingRR !== 0 && (
                  <span className="text-amber-400 font-bold">
                    {liveFloatingRR >= 0 ? '+' : ''}{liveFloatingRR}R
                  </span>
                )}
              </div>
            </div>
          )}

          {isAfterExit && (
            <div className={`flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-bold border ${
              trade.netProfit > 0 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                : trade.netProfit < 0 
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' 
                : 'bg-gray-800 border-gray-700 text-gray-300'
            }`}>
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>
                TRADE CLOSED: {trade.netProfit >= 0 ? '+' : ''}
                {isCent ? `${(trade.netProfit * 100).toFixed(2)} USC` : `$${trade.netProfit.toFixed(2)}`} 
                {' '}({trade.pips >= 0 ? '+' : ''}{trade.pips}p)
              </span>
            </div>
          )}
        </div>

      </div>

      {/* Bottom Bar: Action Buttons & Speed Selector */}
      <div className="flex items-center justify-between border-t border-[#1F2937]/50 pt-2">
        
        {/* Left Side: Jump Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onReset}
            title="Reset to Start"
            className="p-1.5 text-gray-400 hover:text-white hover:bg-[#1F2937] rounded-lg transition-colors text-xs flex items-center gap-1 font-semibold"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>

          <button
            onClick={onJumpToEntry}
            title="Jump directly to Entry Candle"
            className="px-2.5 py-1 text-cyan-400 hover:bg-cyan-500/10 border border-cyan-500/20 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
          >
            <Target className="w-3 h-3" />
            <span>To Entry</span>
          </button>

          <button
            onClick={onJumpToExit}
            title="Jump directly to Exit Candle"
            className="px-2.5 py-1 text-emerald-400 hover:bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
          >
            <CheckCircle2 className="w-3 h-3" />
            <span>To Exit</span>
          </button>
        </div>

        {/* Center: Play / Step Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={onStepBackward}
            title="Step 1 Bar Backward (← key)"
            disabled={currentIndex <= 0}
            className="p-2 text-gray-300 hover:text-white hover:bg-[#1F2937] disabled:opacity-30 disabled:hover:bg-transparent rounded-lg transition-colors"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <button
            onClick={onPlayToggle}
            title="Play / Pause Replay (Spacebar)"
            className={`px-5 py-2 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg transition-all ${
              isPlaying
                ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/25 animate-pulse'
                : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/25'
            }`}
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-black" /> : <Play className="w-4 h-4 fill-black" />}
            <span>{isPlaying ? 'PAUSE' : 'PLAY REPLAY'}</span>
          </button>

          <button
            onClick={onStepForward}
            title="Step 1 Bar Forward (→ key)"
            disabled={currentIndex >= candles.length - 1}
            className="p-2 text-gray-300 hover:text-white hover:bg-[#1F2937] disabled:opacity-30 disabled:hover:bg-transparent rounded-lg transition-colors"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        {/* Right Side: Speed Selector */}
        <div className="flex items-center gap-1 bg-[#0B0F19] p-1 rounded-lg border border-[#1F2937]">
          <span className="text-[10px] text-gray-500 px-1.5 font-bold uppercase hidden md:inline">Speed</span>
          {speeds.map((s) => (
            <button
              key={s}
              onClick={() => onSpeedChange(s)}
              className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold transition-all ${
                speed === s
                  ? 'bg-emerald-500 text-black shadow-sm'
                  : 'text-gray-400 hover:text-white hover:bg-[#1F2937]'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>

      </div>

    </div>
  );
};

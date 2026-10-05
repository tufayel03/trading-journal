import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { Trade } from '../../types';
import { TradingViewMT5Datafeed } from './TradingViewDatafeed';
import { AlertCircle, FolderCheck, Copy, Check, ExternalLink, RefreshCw } from 'lucide-react';

export interface OfficialTradingViewChartRef {
  setResolution: (resolution: string) => void;
  setReplayCutoff: (cutoffSec: number | null) => void;
  jumpToTime: (timeSec: number) => void;
}

interface Props {
  trade: Trade;
  timeframe: string;
  isDarkTheme: boolean;
  onFallbackRequested?: () => void;
}

export const OfficialTradingViewChart = forwardRef<OfficialTradingViewChartRef, Props>(({
  trade,
  timeframe,
  isDarkTheme,
  onFallbackRequested
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const tvWidgetRef = useRef<any>(null);
  const datafeedRef = useRef<TradingViewMT5Datafeed | null>(null);

  const [libraryStatus, setLibraryStatus] = useState<'checking' | 'ready' | 'missing'>('checking');
  const [copiedPath, setCopiedPath] = useState(false);

  const tfToResolution = (tf: string): string => {
    const raw = String(tf || '5m').toLowerCase();
    if (raw === '1m') return '1';
    if (raw === '5m') return '5';
    if (raw === '15m') return '15';
    if (raw === '30m') return '30';
    if (raw === '1h') return '60';
    if (raw === '4h') return '240';
    if (raw === '1d') return '1D';
    if (raw === '1w') return '1W';
    if (raw === '1m' || raw === '1mn') return '1M';
    return '5';
  };

  // Check if charting_library exists in public folder
  const checkLibraryAvailability = async () => {
    setLibraryStatus('checking');
    try {
      const res = await fetch('/charting_library/charting_library.standalone.js', { method: 'HEAD' });
      if (res.ok) {
        setLibraryStatus('ready');
        return true;
      }
    } catch {}

    try {
      const res = await fetch('/charting_library/charting_library.js', { method: 'HEAD' });
      if (res.ok) {
        setLibraryStatus('ready');
        return true;
      }
    } catch {}

    setLibraryStatus('missing');
    return false;
  };

  useEffect(() => {
    checkLibraryAvailability();
  }, []);

  // Initialize TradingView Widget once library is available
  useEffect(() => {
    if (libraryStatus !== 'ready' || !containerRef.current) return;

    let isMounted = true;

    const loadAndInit = async () => {
      // Load script if window.TradingView not present
      if (!(window as any).TradingView) {
        const script = document.createElement('script');
        script.src = '/charting_library/charting_library.standalone.js';
        script.async = true;
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        }).catch(async () => {
          const fallbackScript = document.createElement('script');
          fallbackScript.src = '/charting_library/charting_library.js';
          fallbackScript.async = true;
          await new Promise(res => {
            fallbackScript.onload = res;
            document.head.appendChild(fallbackScript);
          });
        });
      }

      if (!isMounted || !containerRef.current || !(window as any).TradingView) return;

      const datafeed = new TradingViewMT5Datafeed(trade);
      datafeedRef.current = datafeed;

      const widgetOptions = {
        symbol: trade.symbol,
        datafeed,
        interval: tfToResolution(timeframe),
        container: containerRef.current,
        library_path: '/charting_library/',
        locale: 'en',
        disabled_features: [
          'use_localstorage_for_settings',
          'header_symbol_search',
          'header_compare'
        ],
        enabled_features: [
          'study_templates',
          'side_toolbar_in_fullscreen_mode',
          'chart_crosshair_menu'
        ],
        fullscreen: false,
        autosize: true,
        theme: isDarkTheme ? 'Dark' : 'Light',
        overrides: {
          'paneProperties.background': isDarkTheme ? '#131722' : '#ffffff',
          'paneProperties.vertGridProperties.color': isDarkTheme ? '#1f2937' : '#f0f3fa',
          'paneProperties.horzGridProperties.color': isDarkTheme ? '#1f2937' : '#f0f3fa',
          'symbolWatermarkProperties.transparency': 90,
          'scalesProperties.textColor': isDarkTheme ? '#9ca3af' : '#4b5563',
        }
      };

      try {
        const widget = new (window as any).TradingView.widget(widgetOptions);
        tvWidgetRef.current = widget;

        widget.onChartReady(() => {
          const chart = widget.chart();
          
          // Draw Entry line
          chart.createPositionLine()
            .setText(`${trade.direction} Entry`)
            .setPrice(trade.openPrice)
            .setLineColor(trade.direction === 'BUY' ? '#22c55e' : '#f43f5e')
            .setBodyTextColor('#ffffff')
            .setBodyBackgroundColor(trade.direction === 'BUY' ? '#15803d' : '#be123c');

          // Draw Stop Loss Line if defined
          if (trade.stopLoss && trade.stopLoss > 0) {
            chart.createOrderLine()
              .setText(`SL (${trade.stopLoss})`)
              .setPrice(trade.stopLoss)
              .setLineColor('#ef4444')
              .setBodyTextColor('#ffffff')
              .setBodyBackgroundColor('#991b1b');
          }

          // Draw Take Profit Line if defined
          if (trade.takeProfit && trade.takeProfit > 0) {
            chart.createOrderLine()
              .setText(`TP (${trade.takeProfit})`)
              .setPrice(trade.takeProfit)
              .setLineColor('#10b981')
              .setBodyTextColor('#ffffff')
              .setBodyBackgroundColor('#065f46');
          }
        });
      } catch (err) {
        console.error('Error creating TradingView widget:', err);
      }
    };

    loadAndInit();

    return () => {
      isMounted = false;
      if (tvWidgetRef.current) {
        try {
          tvWidgetRef.current.remove();
        } catch {}
        tvWidgetRef.current = null;
      }
    };
  }, [libraryStatus, trade, isDarkTheme]);

  useImperativeHandle(ref, () => ({
    setResolution: (res: string) => {
      if (tvWidgetRef.current) {
        try {
          tvWidgetRef.current.chart().setResolution(tfToResolution(res));
        } catch {}
      }
    },
    setReplayCutoff: (cutoffSec: number | null) => {
      datafeedRef.current?.setReplayCutoff(cutoffSec);
    },
    jumpToTime: (timeSec: number) => {
      if (tvWidgetRef.current) {
        try {
          tvWidgetRef.current.chart().setVisibleRange({
            from: timeSec - 3600 * 24,
            to: timeSec + 3600 * 4
          });
        } catch {}
      }
    }
  }));

  const copyFolderLocation = () => {
    navigator.clipboard.writeText('public/charting_library/');
    setCopiedPath(true);
    setTimeout(() => setCopiedPath(false), 2000);
  };

  // If library files are missing, show instructions
  if (libraryStatus === 'missing') {
    return (
      <div className={`w-full h-full flex flex-col items-center justify-center p-6 ${isDarkTheme ? 'bg-[#131722] text-[#d1d4dc]' : 'bg-gray-50 text-gray-800'}`}>
        <div className={`max-w-xl w-full p-6 rounded-2xl border shadow-2xl flex flex-col gap-5 ${
          isDarkTheme ? 'bg-[#1e222d] border-[#2a2e39]' : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shrink-0">
              <FolderCheck className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white mb-1">
                Official TradingView Advanced Charts Integration
              </h2>
              <p className="text-xs text-gray-400 leading-relaxed">
                To run the official TradingView chart engine with 100+ native drawing tools, 0 scroll lag, and full 60fps performance, copy the library files to your project.
              </p>
            </div>
          </div>

          <div className={`p-4 rounded-xl border font-mono text-xs space-y-2 ${
            isDarkTheme ? 'bg-[#131722] border-[#2a2e39]' : 'bg-gray-100 border-gray-300'
          }`}>
            <div className="flex items-center justify-between text-gray-400 text-[11px]">
              <span>Destination Folder:</span>
              <button 
                onClick={copyFolderLocation}
                className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                {copiedPath ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedPath ? 'Copied!' : 'Copy Path'}</span>
              </button>
            </div>
            <div className="text-emerald-400 font-bold break-all">
              trading-journal/public/charting_library/
            </div>
            <div className="text-[11px] text-gray-400 pt-2 border-t border-gray-700/50">
              Drop these 2 items from TradingView:
              <ul className="list-disc pl-5 mt-1 text-gray-300 space-y-0.5">
                <li><code className="text-amber-400">charting_library.standalone.js</code></li>
                <li><code className="text-amber-400">bundles/</code> folder</li>
              </ul>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={checkLibraryAvailability}
              className="flex-1 py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-500/20"
            >
              <RefreshCw className="w-4 h-4" />
              Check & Initialize TradingView
            </button>

            {onFallbackRequested && (
              <button
                onClick={onFallbackRequested}
                className="py-2.5 px-4 rounded-xl bg-[#2a2e39] hover:bg-[#363a45] text-white font-semibold text-xs transition-colors"
              >
                Use Standard Chart
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative min-w-0 min-h-0">
      <div ref={containerRef} className="w-full h-full min-w-0 min-h-0" />
    </div>
  );
});

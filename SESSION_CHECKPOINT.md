# 🚀 Trading Journal & Replay Engine - Session Checkpoint

**Date & Time:** August 11, 2026  
**Active Accounts:**
- Exness Real Pro `#276133463` (Exness-MT5Real26)
- Exness Real Cent `#160096169` (Exness-MT5Real20)
- Exness Real Standard `#104675892` (Exness-MT5Real15)
- The5ers $100K `#26573113` (FivePercentOnline-Real - Initial Capital: $100,000.00)

---

## 📌 Key Architectural Achievements & Current State

### 1. 🎯 Authentic MT5 Trade History Overlay & Theme in Replay Studio
- **File:** [`src/components/Replay/MT5TradeOverlay.tsx`](file:///c:/Users/ashar/Documents/trading%20journal/trading-journal/src/components/Replay/MT5TradeOverlay.tsx)
- **Features:**
  - **BUY Trades:** Blue entry notch (`—`) + Blue upward triangle arrow (`▲`) at `openPrice`; Red exit notch (`—`) + Red downward triangle arrow (`▼`) at `closePrice`.
  - **SELL Trades:** Red entry notch (`—`) + Red downward triangle arrow (`▼`) at `openPrice`; Blue exit notch (`—`) + Blue upward triangle arrow (`▲`) at `closePrice`.
  - **Connecting Dashed Trendline:** Blue (BUY) or Red (SELL) dashed line connecting entry to exit across the chart. During replay playback, dynamically stretches from the Entry notch to the live active replay bar.
  - **Timeframe Continuity:** Seamlessly preserves the exact replay timestamp, candle position, and trade progression when switching between timeframes (e.g. 5m ➔ 1m, 15m, 1h).
  - **Same-Bar Separation:** Automatic horizontal offset for scalps where entry and exit occurred within the same candle bar.
  - **Interactive Hover Tooltip:** Floating MT5-style popup with ticket number, lots, open/close prices, and net P&L with pips.
  - **MT5 Classic Candlestick Theme:** Added `MT5` button in header supporting pure White/Hollow bull candles and solid Black bear candles matching desktop MT5.

### 2. 🕒 Broker Timezone & Terminal Alignment
- **Problem Solved:** Previously, candles backfilled from The5ers MT5 were shifted by 2 hours due to GMT+2/GMT+3 server timezone differences, causing Exness trades to appear offset.
- **Solution:** Configured [`scripts/fetch_mt5_candles.py`](file:///c:/Users/ashar/Documents/trading%20journal/trading-journal/scripts/fetch_mt5_candles.py) to prioritize the **Exness MT5 terminal** (`C:\Program Files\MetaTrader 5 EXNESS\terminal64.exe`).
- **Result:** Trade entry (e.g. `#680261277` at `1.34915`) and exit (`1.35038`) match 100% with the exact candle bottom and peak in Replay mode, identical to desktop MT5.

### 3. 🗄️ Permanent Candlestick Accumulation Vault (Exness 6-Month History Preservation)
- **Files:** `data/candles/{symbol}_{timeframe}.json`
- **Pairs Covered:** `GBPUSD`, `XAUUSD`, `EURUSD`, `BTCUSD`, `ETHUSD`, `USDJPY`, `USOIL`, `USTE`, `AMD`, `ORCL`, `META`, `MSFT`, `TSLA`, `NVDA`.
- **Merge Engine:** All scripts (`fetch_mt5_candles.py`, `sync_mt5_account.py`, and `scanMT5DirectFiles` in `vite.config.ts`) use a timestamp-keyed Map (`Map<number, Candle>`) to permanently append new incoming bars without deleting or truncating older history.

### 4. ⚡ Live Sync & Background Automation
- **Sub-second Sync:** Direct MT5 polling every 3.5s via Vite server / daemon.
- **Auto-Sync Daemon:** `scripts/auto_sync_daemon.py`, `Setup_Startup_AutoSync.bat`, and `Run_Auto_Sync_Now.bat` configured for background Windows startup execution.
- **Starting Deposit Detection:** Exact initial deposit auto-detected from `DEAL_TYPE_BALANCE` history to anchor equity curve starting capital accurately.

---

## 📂 Git Status
- **Current Branch:** `main`
- **Latest Commit:** `a2c3c24` (`feat(replay): add authentic MT5 trade execution history overlay, Exness terminal sync, and permanent candle engine`)
- **Status:** Clean working tree. Zero TypeScript / build errors (`npm run build` verified).

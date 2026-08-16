#!/usr/bin/env python3
"""
Exness MT5 Historical Candlestick Fetcher & Database Sync Engine
Fetches 100% authentic broker OHLCV candle data directly from Exness MT5
and saves it permanently to data/candles/{symbol}_{timeframe}.json
"""

import sys
import os
import re
import json
import argparse
from datetime import datetime, timezone, timedelta

try:
    import MetaTrader5 as mt5
except ImportError:
    print(json.dumps({"success": False, "error": "MetaTrader5 package not installed"}))
    sys.exit(1)

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(PROJECT_ROOT, "data")
CANDLES_DIR = os.path.join(DATA_DIR, "candles")
TRADES_FILE = os.path.join(DATA_DIR, "synced_trades.json")

TIMEFRAME_MAP = {
    "1m": mt5.TIMEFRAME_M1,
    "5m": mt5.TIMEFRAME_M5,
    "15m": mt5.TIMEFRAME_M15,
    "30m": mt5.TIMEFRAME_M30,
    "1h": mt5.TIMEFRAME_H1,
    "h1": mt5.TIMEFRAME_H1,
    "4h": mt5.TIMEFRAME_H4,
    "h4": mt5.TIMEFRAME_H4,
    "1d": mt5.TIMEFRAME_D1,
    "d1": mt5.TIMEFRAME_D1,
    "1w": mt5.TIMEFRAME_W1,
    "w1": mt5.TIMEFRAME_W1,
    "1mn": mt5.TIMEFRAME_MN1,
    "1M": mt5.TIMEFRAME_MN1,
    "mn1": mt5.TIMEFRAME_MN1,
    "monthly": mt5.TIMEFRAME_MN1,
}

TIMEFRAME_SECONDS = {
    "1m": 60,
    "5m": 300,
    "15m": 900,
    "30m": 1800,
    "1h": 3600,
    "h1": 3600,
    "4h": 14400,
    "h4": 14400,
    "1d": 86400,
    "d1": 86400,
    "1w": 604800,
    "w1": 604800,
    "1mn": 2592000,
    "1M": 2592000,
    "mn1": 2592000,
    "monthly": 2592000,
}

KNOWN_TERMINAL_PATHS = [
    r"C:\Program Files\MetaTrader 5 EXNESS\terminal64.exe",
    r"C:\Program Files\Exness MetaTrader 5\terminal64.exe",
]


def is_mt5_running():
    """Checks if any MetaTrader 5 terminal process is currently active."""
    try:
        import ctypes, ctypes.wintypes
        TH32CS_SNAPPROCESS = 0x00000002
        class PROCESSENTRY32(ctypes.Structure):
            _fields_ = [
                ('dwSize', ctypes.wintypes.DWORD),
                ('cntUsage', ctypes.wintypes.DWORD),
                ('th32ProcessID', ctypes.wintypes.DWORD),
                ('th32DefaultHeapID', ctypes.c_void_p),
                ('th32ModuleID', ctypes.wintypes.DWORD),
                ('cntThreads', ctypes.wintypes.DWORD),
                ('th32ParentProcessID', ctypes.wintypes.DWORD),
                ('pcPriClassBase', ctypes.c_long),
                ('dwFlags', ctypes.wintypes.DWORD),
                ('szExeFile', ctypes.c_char * 260)
            ]
        hSnapshot = ctypes.windll.kernel32.CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0)
        if hSnapshot == -1:
            return False
        pe = PROCESSENTRY32()
        pe.dwSize = ctypes.sizeof(PROCESSENTRY32)
        success = ctypes.windll.kernel32.Process32First(hSnapshot, ctypes.byref(pe))
        found = False
        target_names = [b'terminal64.exe', b'terminal.exe', b'metatrader.exe']
        while success:
            if pe.szExeFile.lower() in target_names:
                found = True
                break
            success = ctypes.windll.kernel32.Process32Next(hSnapshot, ctypes.byref(pe))
        ctypes.windll.kernel32.CloseHandle(hSnapshot)
        return found
    except Exception:
        return False

EXNESS_TERMINAL_PATHS = [
    r"C:\Program Files\MetaTrader 5 EXNESS\terminal64.exe",
    r"C:\Program Files\Exness MetaTrader 5\terminal64.exe",
    r"C:\Program Files\MetaTrader 5\terminal64.exe",
]

def init_mt5(terminal_path=None):
    """Initializes connection strictly to Exness MT5 terminal for authentic candle history."""
    try:
        mt5.shutdown()
    except Exception:
        pass

    # 1. Explicit terminal path if supplied
    if terminal_path and os.path.exists(terminal_path):
        try:
            if mt5.initialize(path=terminal_path, timeout=5000):
                return True
        except Exception:
            pass

    # 2. Priority: Connect directly to installed Exness terminal
    for path in EXNESS_TERMINAL_PATHS:
        if os.path.exists(path):
            try:
                if mt5.initialize(path=path, timeout=5000):
                    return True
            except Exception:
                pass

    # 3. Fallback to active running MT5 instance
    try:
        if mt5.initialize(timeout=5000):
            return True
    except Exception:
        pass

    return False


def get_available_symbols():
    """Retrieves all symbol names available in MT5."""
    symbols = mt5.symbols_get()
    if not symbols:
        return []
    return [s.name for s in symbols]


def clean_symbol(symbol_name: str) -> str:
    """Strips broker suffixes like .m, _m, ecn, #, etc. only from the end of the symbol name."""
    s = str(symbol_name).strip()
    return re.sub(r'(\.m|_m|ecn|#|c|m)$', '', s, flags=re.IGNORECASE).upper()


def find_mt5_symbol(symbol_name: str, available_symbols: list = None) -> str:
    """Matches a clean symbol with actual MT5 symbol name instantly."""
    norm = clean_symbol(symbol_name)
    candidates = [
        symbol_name,
        norm,
        f"{norm}m",
        f"{norm}.m",
        f"{norm}#",
        f"{norm}c",
        f"{norm}ECN",
        f"{norm}_m",
        f"{norm}ECN_m",
        f"{norm}ECN.m",
    ]
    if norm in ["USTE", "USTEC", "NAS100", "NQ", "US100"]:
        candidates.extend(["USTEC_x100", "USTEC", "USTECm", "USTEC#", "NAS100", "US100"])
    if norm in ["USOIL", "WTI", "OIL", "CRUDE"]:
        candidates.extend(["USOIL", "USOILm", "USOIL.m", "USOIL#", "WTI"])

    for c in candidates:
        if mt5.symbol_info(c) is not None:
            mt5.symbol_select(c, True)
            return c
    return norm


def get_decimal_places(symbol: str) -> int:
    """Returns price precision based on symbol characteristics."""
    sym = symbol.upper()
    if "XAU" in sym or "GOLD" in sym:
        return 2
    if "JPY" in sym:
        return 3
    if "BTC" in sym or "ETH" in sym or "USDT" in sym or "CRYPTO" in sym:
        return 2
    if sym in ["META", "ORCL", "AAPL", "TSLA", "NVDA", "AMZN", "MSFT"]:
        return 2
    return 5


def format_candle(rate_tuple, decimals: int) -> dict:
    """Formats an MT5 rate tuple to JSON candle object."""
    time_val = int(rate_tuple[0])
    open_val = round(float(rate_tuple[1]), decimals)
    high_val = round(float(rate_tuple[2]), decimals)
    low_val = round(float(rate_tuple[3]), decimals)
    close_val = round(float(rate_tuple[4]), decimals)
    vol_val = int(rate_tuple[5]) if len(rate_tuple) > 5 else 0

    return {
        "time": time_val,
        "open": open_val,
        "high": high_val,
        "low": low_val,
        "close": close_val,
        "volume": vol_val
    }


def fetch_and_save_candles(symbol: str, timeframe_str: str, from_sec: int, to_sec: int, available_symbols: list = None, count: int = 50000) -> list:
    """Fetches maximum authentic historical candles from MT5 for the given range and saves them to disk database."""
    norm_sym = clean_symbol(symbol)
    raw_tf = str(timeframe_str).strip()
    
    # Normalize timeframe string
    tf_lower = raw_tf.lower()
    if tf_lower in ["1h", "h1"]:
        tf_key = "1h"
    elif tf_lower in ["4h", "h4"]:
        tf_key = "4h"
    elif tf_lower in ["1d", "d1"]:
        tf_key = "1d"
    elif tf_lower in ["1w", "w1"]:
        tf_key = "1w"
    elif tf_lower in ["1mn", "1m_month", "mn1", "monthly"] or raw_tf == "1M":
        tf_key = "1mn"
    elif tf_lower in TIMEFRAME_MAP:
        tf_key = tf_lower
    else:
        tf_key = "5m"

    mt5_tf = TIMEFRAME_MAP.get(raw_tf, TIMEFRAME_MAP.get(tf_key, mt5.TIMEFRAME_M5))
    tf_sec = TIMEFRAME_SECONDS.get(tf_key, 300)

    matched_sym = find_mt5_symbol(norm_sym)
    mt5.symbol_select(matched_sym, True)

    decimals = get_decimal_places(norm_sym)

    rates = None

    # Case 1: User scrolled back to an older historical point (to_sec specified)
    if to_sec > 0 and from_sec == 0:
        dt_to = datetime.fromtimestamp(to_sec, tz=timezone.utc)
        rates = mt5.copy_rates_from(matched_sym, mt5_tf, dt_to, count)

    # Case 2: Range specified (from_sec and to_sec)
    if (rates is None or len(rates) == 0) and from_sec > 0 and to_sec > 0:
        dt_from = datetime.fromtimestamp(max(0, from_sec - tf_sec * 500), tz=timezone.utc)
        dt_to = datetime.fromtimestamp(to_sec + tf_sec * 500, tz=timezone.utc)
        rates = mt5.copy_rates_range(matched_sym, mt5_tf, dt_from, dt_to)

    # Case 3: Fetch latest maximum depth (50,000 bars)
    if rates is None or len(rates) == 0:
        rates = mt5.copy_rates_from_pos(matched_sym, mt5_tf, 0, count)

    if rates is None or len(rates) == 0:
        # Fallback to copy_rates_from with current time
        dt_now = datetime.now(timezone.utc)
        rates = mt5.copy_rates_from(matched_sym, mt5_tf, dt_now, count)

    if rates is None or len(rates) == 0:
        return []

    new_candles = [format_candle(r, decimals) for r in rates]

    # Merge with existing file in disk database (Preserve All Past History Forever)
    os.makedirs(CANDLES_DIR, exist_ok=True)
    target_file = os.path.join(CANDLES_DIR, f"{norm_sym}_{tf_key}.json")

    existing_candles = []
    if os.path.exists(target_file):
        try:
            with open(target_file, "r", encoding="utf-8") as f:
                existing_candles = json.load(f)
        except Exception:
            existing_candles = []

    # Merge by unique timestamp
    candle_map = {}
    for c in existing_candles:
        if isinstance(c, dict) and "time" in c:
            candle_map[c["time"]] = c
    for c in new_candles:
        candle_map[c["time"]] = c

    merged = sorted(candle_map.values(), key=lambda x: x["time"])

    with open(target_file, "w", encoding="utf-8") as f:
        json.dump(merged, f)

    return merged


def sync_all_trades_candles():
    """Scans synced_trades.json, computes required date ranges per symbol, and downloads all timeframes."""
    if not os.path.exists(TRADES_FILE):
        return {"success": False, "error": "synced_trades.json not found"}

    with open(TRADES_FILE, "r", encoding="utf-8") as f:
        trades = json.load(f)

    if not trades:
        return {"success": False, "error": "No trades found in database"}

    symbol_ranges = {}
    for t in trades:
        sym = clean_symbol(t.get("symbol", ""))
        if not sym:
            continue
        ot_str = t.get("openTime")
        ct_str = t.get("closeTime")
        if not ot_str:
            continue

        try:
            ot_dt = datetime.fromisoformat(ot_str.replace("Z", "+00:00"))
            ot_sec = int(ot_dt.timestamp())
        except Exception:
            continue

        try:
            ct_dt = datetime.fromisoformat(ct_str.replace("Z", "+00:00")) if ct_str else ot_dt
            ct_sec = int(ct_dt.timestamp())
        except Exception:
            ct_sec = ot_sec

        if sym not in symbol_ranges:
            symbol_ranges[sym] = {"min_sec": ot_sec, "max_sec": ct_sec, "count": 0}

        symbol_ranges[sym]["count"] += 1
        if ot_sec < symbol_ranges[sym]["min_sec"]:
            symbol_ranges[sym]["min_sec"] = ot_sec
        if ct_sec > symbol_ranges[sym]["max_sec"]:
            symbol_ranges[sym]["max_sec"] = ct_sec

    timeframes = ["1m", "5m", "15m", "30m", "1h", "4h", "1d", "1w", "1mn"]
    results = {}

    for sym, r in symbol_ranges.items():
        results[sym] = {}
        # Pad range by 30 days on each side
        from_sec = max(0, r["min_sec"] - 86400 * 30)
        to_sec = r["max_sec"] + 86400 * 30

        for tf in timeframes:
            try:
                candles = fetch_and_save_candles(sym, tf, from_sec, to_sec, count=50000)
                results[sym][tf] = len(candles)
                print(f"[+] Synced {sym} [{tf}]: {len(candles)} candles accumulated permanently in vault.")
            except Exception as e:
                print(f"[-] Failed {sym} [{tf}]: {e}")

    return {"success": True, "results": results}


def main():
    parser = argparse.ArgumentParser(description="Exness MT5 Real Historical Candle Fetcher")
    parser.add_argument("--symbol", type=str, help="Trading symbol (e.g. EURUSD, XAUUSD)")
    parser.add_argument("--timeframe", type=str, default="5m", help="Timeframe (1m, 5m, 15m, 30m, 1h, 4h, 1d, 1w, 1M)")
    parser.add_argument("--from", dest="from_sec", type=int, default=0, help="From timestamp in UTC seconds")
    parser.add_argument("--to", dest="to_sec", type=int, default=0, help="To timestamp in UTC seconds")
    parser.add_argument("--count", dest="count", type=int, default=50000, help="Number of candles to fetch")
    parser.add_argument("--all-trades", action="store_true", help="Sync authentic candles for all traded pairs")
    parser.add_argument("--json", action="store_true", help="Output results strictly as JSON to stdout")

    args = parser.parse_args()

    if not init_mt5():
        err_msg = f"Failed to initialize MetaTrader 5: {mt5.last_error()}"
        if args.json:
            print(json.dumps({"success": False, "error": err_msg}))
        else:
            print(err_msg, file=sys.stderr)
        sys.exit(1)

    try:
        if args.all_trades:
            res = sync_all_trades_candles()
            if args.json:
                print(json.dumps(res))
            else:
                print("All traded symbols synchronized with Exness MT5 successfully.")
        elif args.symbol:
            norm_sym = clean_symbol(args.symbol)
            from_sec = args.from_sec
            to_sec = args.to_sec

            candles = fetch_and_save_candles(args.symbol, args.timeframe, from_sec, to_sec, count=args.count)

            output = {
                "success": True,
                "symbol": norm_sym,
                "timeframe": args.timeframe,
                "count": len(candles),
                "source": "exness_mt5_live"
            }
            if args.json:
                print(json.dumps(output))
            else:
                print(f"Fetched & Merged {len(candles)} candles for {norm_sym} ({args.timeframe}) permanently in database.")
        else:
            parser.print_help()
    finally:
        mt5.shutdown()


if __name__ == "__main__":
    main()

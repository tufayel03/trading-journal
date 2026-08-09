#!/usr/bin/env python3
"""
Multi-Terminal Direct Automated MT5 Sync Script for HyperTrade Journal
Connects directly to all running/installed MetaTrader 5 terminals (The5ers, Exness, etc.),
extracts all account info, closed trade history, active open positions, and broker candlestick data.
"""

import sys
import os
import json
import re
import urllib.request
from datetime import datetime, timezone, timedelta

try:
    import MetaTrader5 as mt5
except ImportError:
    print(json.dumps({"success": False, "error": "MetaTrader5 python package not installed"}))
    sys.exit(1)

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(PROJECT_ROOT, "data")
CANDLES_DIR = os.path.join(DATA_DIR, "candles")
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(CANDLES_DIR, exist_ok=True)

TERMINAL_PATHS = [
    r"C:\Program Files\Five Percent Online MetaTrader 5\terminal64.exe",
    r"C:\Program Files\MetaTrader 5 EXNESS\terminal64.exe",
    r"C:\Program Files\Exness MetaTrader 5\terminal64.exe",
    r"C:\Program Files\MetaTrader 5\terminal64.exe",
    r"C:\Program Files\ACG Markets MT5 Terminal\terminal64.exe"
]

def format_iso(timestamp):
    if not timestamp or timestamp <= 0:
        dt = datetime.now(timezone.utc)
    else:
        dt = datetime.fromtimestamp(timestamp, tz=timezone.utc)
    return dt.strftime("%Y-%m-%dT%H:%M:%S.000Z")

def clean_symbol(sym):
    s = str(sym).strip().upper()
    return re.sub(r'(\.M|_M|ECN|#|C|M)$', '', s, flags=re.IGNORECASE).upper()

def sync_terminal(path):
    if not os.path.exists(path):
        return None

    try:
        mt5.shutdown()
    except Exception:
        pass

    if not mt5.initialize(path=path):
        return None

    acc = mt5.account_info()
    if acc is None:
        mt5.shutdown()
        return None

    login = str(acc.login)
    server = acc.server
    currency = acc.currency or "USD"
    is_cent = (
        currency.upper() == "USC" or
        "CENT" in currency.upper() or
        "cent" in server.lower()
    )
    if is_cent:
        currency = "USC"

    balance = float(acc.balance)
    equity = float(acc.equity)
    margin = float(acc.margin)
    free_margin = float(acc.margin_free)
    name = acc.name or ""

    print(f"\n==========================================")
    print(f"Syncing MT5: {login} ({name}) | Server: {server}")
    print(f"Path: {path}")
    print(f"Balance: {balance:.2f} {currency} | Equity: {equity:.2f} {currency}")

    # 1. Fetch Open Positions
    positions = mt5.positions_get() or []
    open_positions_json = []
    traded_symbols = set()

    for p in positions:
        sym = clean_symbol(p.symbol)
        traded_symbols.add(p.symbol)
        traded_symbols.add(sym)
        direction = "BUY" if p.type == 0 else "SELL"
        open_positions_json.append({
            "ticket": str(p.ticket),
            "symbol": sym,
            "direction": direction,
            "lotSize": round(float(p.volume), 2),
            "openPrice": round(float(p.price_open), 5),
            "currentPrice": round(float(p.price_current), 5),
            "stopLoss": round(float(p.sl), 5) if p.sl else 0.0,
            "takeProfit": round(float(p.tp), 5) if p.tp else 0.0,
            "profit": round(float(p.profit), 2),
            "openTime": format_iso(p.time),
            "comment": p.comment or "",
            "accountLogin": login,
            "accountServer": server,
            "accountCurrency": currency,
            "isCent": is_cent
        })

    # 2. Fetch Closed Deals History
    deals = mt5.history_deals_get(0, 2000000000) or []
    print(f"Found {len(positions)} active open position(s), {len(deals)} history deal(s)")

    pos_entry_map = {}
    for d in deals:
        if d.entry == 0:  # DEAL_ENTRY_IN
            pos_entry_map[d.position_id] = d
        sym = clean_symbol(d.symbol)
        if sym:
            traded_symbols.add(d.symbol)
            traded_symbols.add(sym)

    closed_trades_json = []
    for d in deals:
        if d.entry == 1:  # DEAL_ENTRY_OUT (Close deal)
            sym = clean_symbol(d.symbol)
            close_price = round(float(d.price), 5)
            close_time = d.time
            profit = round(float(d.profit), 2)
            commission = round(float(d.commission), 2)
            swap = round(float(d.swap), 2)
            volume = round(float(d.volume), 2)
            direction = "SELL" if d.type == 0 else "BUY"

            open_deal = pos_entry_map.get(d.position_id)
            if open_deal:
                open_price = round(float(open_deal.price), 5)
                open_time = open_deal.time
                direction = "BUY" if open_deal.type == 0 else "SELL"
            else:
                open_price = close_price
                open_time = close_time - 60

            trade_obj = {
                "ticket": str(d.ticket),
                "positionId": str(d.position_id),
                "symbol": sym,
                "direction": direction,
                "openPrice": open_price,
                "closePrice": close_price,
                "openTime": format_iso(open_time),
                "closeTime": format_iso(close_time),
                "profit": profit,
                "netProfit": profit + commission + swap,
                "lots": volume,
                "lotSize": volume,
                "commission": commission,
                "swap": swap,
                "comment": d.comment or "",
                "accountLogin": login,
                "accountServer": server,
                "accountCurrency": currency,
                "isCent": is_cent,
                "status": "CLOSED"
            }
            closed_trades_json.append(trade_obj)

    print(f"Constructed {len(closed_trades_json)} completed trade(s)")

    # 3. Fetch Candles
    tf_map = {
        "1m": mt5.TIMEFRAME_M1,
        "5m": mt5.TIMEFRAME_M5,
        "15m": mt5.TIMEFRAME_M15,
        "30m": mt5.TIMEFRAME_M30,
        "1h": mt5.TIMEFRAME_H1,
        "4h": mt5.TIMEFRAME_H4,
        "1d": mt5.TIMEFRAME_D1,
        "1w": mt5.TIMEFRAME_W1,
        "1mn": mt5.TIMEFRAME_MN1,
    }

    for raw_sym in traded_symbols:
        c_sym = clean_symbol(raw_sym)
        if not c_sym:
            continue
        for tf_name, tf_val in tf_map.items():
            try:
                rates = mt5.copy_rates_from_pos(raw_sym, tf_val, 0, 1500)
                if rates is not None and len(rates) > 0:
                    candles_list = []
                    for r in rates:
                        candles_list.append({
                            "time": int(r['time']),
                            "open": float(r['open']),
                            "high": float(r['high']),
                            "low": float(r['low']),
                            "close": float(r['close']),
                            "volume": int(r['tick_volume'])
                        })
                    out_path = os.path.join(CANDLES_DIR, f"{c_sym}_{tf_name}.json")
                    with open(out_path, "w", encoding="utf-8") as cf:
                        json.dump(candles_list, cf)
            except Exception:
                pass

    mt5.shutdown()

    account_json = {
        "login": login,
        "server": server,
        "name": name,
        "balance": balance,
        "equity": equity,
        "margin": margin,
        "freeMargin": free_margin,
        "currency": currency,
        "isCent": is_cent,
        "status": "connected",
        "openPositionsCount": len(open_positions_json),
        "lastUpdate": format_iso(int(datetime.now(timezone.utc).timestamp()))
    }

    return {
        "account": account_json,
        "openPositions": open_positions_json,
        "trades": closed_trades_json
    }

def sync_all():
    all_accounts = {}
    all_open_positions = []
    all_trades = []

    # Load existing status file so we preserve other accounts (e.g. Cent accounts)
    status_file = os.path.join(DATA_DIR, "account_status.json")
    if os.path.exists(status_file):
        try:
            with open(status_file, "r", encoding="utf-8") as f:
                existing_status = json.load(f)
                if existing_status.get("accounts"):
                    all_accounts.update(existing_status["accounts"])
        except Exception:
            pass

    for path in TERMINAL_PATHS:
        if os.path.exists(path):
            result = sync_terminal(path)
            if result:
                acc = result["account"]
                login = acc["login"]
                all_accounts[login] = acc
                all_open_positions.extend(result["openPositions"])
                all_trades.extend(result["trades"])

                # Post individual bundle to webhook
                try:
                    req = urllib.request.Request(
                        "http://localhost:3000/api/webhook/batch",
                        data=json.dumps(result).encode("utf-8"),
                        headers={"Content-Type": "application/json"}
                    )
                    with urllib.request.urlopen(req, timeout=5) as response:
                        print(f"Synced {login} to journal webhook.")
                except Exception as e:
                    print(f"Webhook notice: {e}")

    # Save aggregated account status
    active_login = list(all_accounts.keys())[0] if all_accounts else None
    primary_acc = all_accounts.get(active_login) if active_login else None

    with open(os.path.join(DATA_DIR, "account_status.json"), "w", encoding="utf-8") as f:
        json.dump({
            "account": primary_acc,
            "accounts": all_accounts,
            "openPositions": all_open_positions,
            "lastSync": format_iso(int(datetime.now(timezone.utc).timestamp())),
            "totalSyncedDeals": len(all_trades)
        }, f, indent=2)

    print(f"\nSUCCESS: All {len(all_accounts)} accounts synced automatically!")

if __name__ == "__main__":
    sync_all()

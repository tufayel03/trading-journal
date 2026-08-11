#!/usr/bin/env python3
"""
Multi-Terminal & Multi-Account Automated MT5 Direct Sync Engine for HyperTrade Journal
Connects directly to all installed MetaTrader 5 terminals (The5ers, Exness, ACG, etc.),
sequentially switches and authenticates with every saved trading account,
extracts all account balances, equities, live open positions, closed trade history, and candlestick data.
"""

import sys
import os
import json
import re
import time
import urllib.request
from datetime import datetime, timezone, timedelta

try:
    if sys.stdout.encoding != 'utf-8':
        sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

try:
    import MetaTrader5 as mt5
except ImportError:
    print(json.dumps({"success": False, "error": "MetaTrader5 python package not installed"}))
    sys.exit(1)

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(PROJECT_ROOT, "data")
CANDLES_DIR = os.path.join(DATA_DIR, "candles")
SYNCED_TRADES_FILE = os.path.join(DATA_DIR, "synced_trades.json")
ACCOUNT_STATUS_FILE = os.path.join(DATA_DIR, "account_status.json")

os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(CANDLES_DIR, exist_ok=True)

# Standard Terminal Executable Locations
TERMINAL_CONFIGS = [
    {
        "name": "Five Percent Online (The5ers)",
        "paths": [
            r"C:\Program Files\Five Percent Online MetaTrader 5\terminal64.exe",
        ],
        "default_servers": ["FivePercentOnline-Real"],
        "known_accounts": [26573113]
    },
    {
        "name": "Exness Multi-Account Terminal",
        "paths": [
            r"C:\Program Files\MetaTrader 5 EXNESS\terminal64.exe",
            r"C:\Program Files\Exness MetaTrader 5\terminal64.exe",
        ],
        "default_servers": ["Exness-MT5Real15", "Exness-MT5Real20", "Exness-MT5Real26"],
        "known_accounts": [104675892, 160096169, 276133463]
    },
    {
        "name": "ACG Markets MT5",
        "paths": [
            r"C:\Program Files\ACG Markets MT5 Terminal\terminal64.exe",
        ],
        "default_servers": ["ACGMarkets-Main"],
        "known_accounts": []
    },
    {
        "name": "MetaTrader 5 (Default)",
        "paths": [
            r"C:\Program Files\MetaTrader 5\terminal64.exe",
        ],
        "default_servers": [],
        "known_accounts": []
    }
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

def extract_account_data(login_str, default_server=""):
    acc = mt5.account_info()
    if acc is None:
        return None

    login = str(acc.login)
    server = acc.server or default_server
    currency = acc.currency or "USD"
    
    is_cent = (
        currency.upper() == "USC" or
        "CENT" in currency.upper() or
        ("cent" in server.lower() and "fivepercent" not in server.lower() and "percent" not in server.lower())
    ) and currency.upper() != "USD"

    if is_cent:
        currency = "USC"
    else:
        currency = acc.currency or "USD"

    rate = 0.01 if is_cent else 1.0
    balance = float(acc.balance)
    equity = float(acc.equity)
    margin = float(acc.margin)
    free_margin = float(acc.margin_free)
    name = acc.name or ""

    usd_balance = round(balance * rate, 2)
    usd_equity = round(equity * rate, 2)

    print(f"\n==========================================")
    print(f"Syncing Account: #{login} ({name}) | Server: {server}")
    print(f"Balance: {balance:.2f} {currency} (${usd_balance:.2f} USD) | Equity: {equity:.2f} {currency} (${usd_equity:.2f} USD)")

    # 1. Fetch Open Positions
    positions = mt5.positions_get() or []
    open_positions_json = []
    traded_symbols = set()

    for p in positions:
        sym = clean_symbol(p.symbol)
        traded_symbols.add(p.symbol)
        traded_symbols.add(sym)
        direction = "BUY" if p.type == 0 else "SELL"
        raw_profit = float(p.profit)
        normalized_profit = round(raw_profit * rate, 4)

        open_positions_json.append({
            "ticket": str(p.ticket),
            "symbol": sym,
            "direction": direction,
            "lotSize": round(float(p.volume), 2),
            "openPrice": round(float(p.price_open), 5),
            "currentPrice": round(float(p.price_current), 5),
            "stopLoss": round(float(p.sl), 5) if p.sl else 0.0,
            "takeProfit": round(float(p.tp), 5) if p.tp else 0.0,
            "profit": normalized_profit,
            "nativeProfit": round(raw_profit, 2),
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

    # Detect Initial Starting Deposit & Balance Transactions (DEAL_TYPE_BALANCE = 2)
    initial_deposit_raw = 0.0
    total_deposits_raw = 0.0
    total_withdrawals_raw = 0.0

    balance_deals = [d for d in deals if getattr(d, 'type', None) == 2]
    if balance_deals:
        # Sort by deal time ascending to find the earliest deposit
        sorted_balance_deals = sorted(balance_deals, key=lambda x: getattr(x, 'time', 0))
        positive_deposits = [d for d in sorted_balance_deals if float(getattr(d, 'profit', 0)) > 0]
        if positive_deposits:
            initial_deposit_raw = float(positive_deposits[0].profit)

        for bd in balance_deals:
            prof = float(getattr(bd, 'profit', 0))
            if prof > 0:
                total_deposits_raw += prof
            elif prof < 0:
                total_withdrawals_raw += abs(prof)

    # Fallback if no balance deal exists: calculate from current balance minus closed trades net PnL
    if initial_deposit_raw <= 0:
        closed_deals_pnl = sum(
            float(getattr(d, 'profit', 0)) + float(getattr(d, 'commission', 0)) + float(getattr(d, 'swap', 0)) 
            for d in deals if getattr(d, 'entry', -1) == 1
        )
        initial_deposit_raw = max(0.0, balance - closed_deals_pnl)

    initial_deposit_usd = round(initial_deposit_raw * rate, 2)

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
            raw_profit = round(float(d.profit), 2)
            raw_commission = round(float(d.commission), 2)
            raw_swap = round(float(d.swap), 2)
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

            net_profit_usd = round((raw_profit + raw_commission + raw_swap) * rate, 4)

            # Auto calculate pips
            pips = 0.0
            if open_price and close_price:
                diff = (close_price - open_price) if direction == 'BUY' else (open_price - close_price)
                if 'XAU' in sym or 'GOLD' in sym:
                    pips = round(diff / 0.10, 1)
                elif 'JPY' in sym:
                    pips = round(diff / 0.01, 1)
                elif 'BTC' in sym or 'ETH' in sym:
                    pips = round(diff, 2)
                elif open_price < 5:
                    pips = round(diff / 0.0001, 1)
                else:
                    pips = round(diff, 2)

            # Auto session detection
            session = "NY_AM"
            try:
                dt_open = datetime.fromtimestamp(open_time, tz=timezone.utc)
                h = dt_open.hour
                if 0 <= h < 7: session = "ASIAN"
                elif 7 <= h < 12: session = "LONDON_OPEN"
                elif 12 <= h < 17: session = "NY_AM"
                elif 17 <= h < 20: session = "NY_PM"
                else: session = "LONDON_CLOSE"
            except:
                pass

            trade_obj = {
                "id": f"mt5-{login}-{d.ticket}",
                "ticket": str(d.ticket),
                "positionId": str(d.position_id),
                "symbol": sym,
                "direction": direction,
                "openPrice": open_price,
                "closePrice": close_price,
                "openTime": format_iso(open_time),
                "closeTime": format_iso(close_time),
                "profit": round(raw_profit * rate, 4),
                "netProfit": net_profit_usd,
                "nativeNetProfit": round(raw_profit + raw_commission + raw_swap, 2),
                "lots": volume,
                "lotSize": volume,
                "pips": pips,
                "commission": round(raw_commission * rate, 4),
                "swap": round(raw_swap * rate, 4),
                "nativeCommission": raw_commission,
                "nativeSwap": raw_swap,
                "session": session,
                "strategy": "HyperTrade MT5 Auto Sync",
                "confluences": ["MT5 Live Execution"],
                "mistakes": [],
                "emotions": "Disciplined",
                "comment": d.comment or "",
                "notes": f"Auto-synced from MT5 #{login}" if not d.comment else f"MT5 Deal #{d.ticket}: {d.comment}",
                "accountLogin": login,
                "accountServer": server,
                "accountCurrency": currency,
                "isCent": is_cent,
                "status": "CLOSED"
            }
            closed_trades_json.append(trade_obj)

    # 3. Permanent Candle Vault Sync (Runs when --candles flag is passed or on demand)
    should_sync_candles = "--candles" in sys.argv
    if should_sync_candles:
        primary_tfs = {
            "1m": mt5.TIMEFRAME_M1,
            "5m": mt5.TIMEFRAME_M5,
            "15m": mt5.TIMEFRAME_M15,
            "1h": mt5.TIMEFRAME_H1,
            "1d": mt5.TIMEFRAME_D1,
        }

        priority_symbols = set([p["symbol"] for p in open_positions_json])
        for t in closed_trades_json[:5]:
            if t.get("symbol"):
                priority_symbols.add(t["symbol"])

        for raw_sym in priority_symbols:
            c_sym = clean_symbol(raw_sym)
            if not c_sym:
                continue
            for tf_name, tf_val in primary_tfs.items():
                try:
                    rates = mt5.copy_rates_from_pos(raw_sym, tf_val, 0, 2000)
                    if rates is not None and len(rates) > 0:
                        out_path = os.path.join(CANDLES_DIR, f"{c_sym}_{tf_name}.json")
                        candle_map = {}
                        if os.path.exists(out_path):
                            try:
                                with open(out_path, "r", encoding="utf-8") as cf:
                                    existing = json.load(cf)
                                    for c in existing:
                                        if isinstance(c, dict) and "time" in c:
                                            candle_map[c["time"]] = c
                            except Exception:
                                pass

                        for r in rates:
                            t_sec = int(r['time'])
                            candle_map[t_sec] = {
                                "time": t_sec,
                                "open": float(r['open']),
                                "high": float(r['high']),
                                "low": float(r['low']),
                                "close": float(r['close']),
                                "volume": int(r['tick_volume'])
                            }

                        merged_candles = sorted(candle_map.values(), key=lambda x: x["time"])
                        with open(out_path, "w", encoding="utf-8") as cf:
                            json.dump(merged_candles, cf)
                except Exception:
                    pass

    account_json = {
        "login": login,
        "server": server,
        "name": name,
        "balance": balance,
        "equity": equity,
        "margin": margin,
        "freeMargin": free_margin,
        "usdBalance": usd_balance,
        "usdEquity": usd_equity,
        "initialDeposit": initial_deposit_usd,
        "nativeInitialDeposit": round(initial_deposit_raw, 2),
        "totalDeposits": round(total_deposits_raw * rate, 2),
        "totalWithdrawals": round(total_withdrawals_raw * rate, 2),
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

def sync_terminal_instance(terminal_path, target_accounts):
    """
    Connects to a terminal executable and sequentially syncs all associated accounts.
    """
    if not os.path.exists(terminal_path):
        return []

    try:
        mt5.shutdown()
    except Exception:
        pass

    if not mt5.initialize(path=terminal_path, timeout=5000):
        print(f"Could not initialize MT5 at path: {terminal_path}")
        return []

    results = []
    active_acc = mt5.account_info()
    active_login = active_acc.login if active_acc else None

    # Build unique list of logins to try
    logins_to_sync = set()
    if active_login:
        logins_to_sync.add(active_login)
    for acc in target_accounts:
        try:
            logins_to_sync.add(int(acc.get("login") if isinstance(acc, dict) else acc))
        except:
            pass

    for login_id in logins_to_sync:
        # If not active login, attempt switch
        if active_login != login_id:
            # Find matching server hint if available
            server_hint = None
            if isinstance(target_accounts, list):
                for acc in target_accounts:
                    if isinstance(acc, dict) and int(acc.get("login", 0)) == login_id:
                        server_hint = acc.get("server")
                        break

            login_success = False
            if server_hint:
                login_success = mt5.login(login_id, server=server_hint)
            if not login_success:
                login_success = mt5.login(login_id)

            if not login_success:
                print(f"Skipping account #{login_id} (not stored in this terminal or credentials require update)")
                continue

            # Give MT5 terminal 0.8s to fully connect and update account & positions database
            for _ in range(12):
                time.sleep(0.1)
                curr_acc = mt5.account_info()
                if curr_acc and curr_acc.login == login_id:
                    break
        else:
            time.sleep(0.3)

        res = extract_account_data(str(login_id))
        if res:
            results.append(res)

    mt5.shutdown()
    return results

def merge_trades_to_disk(new_trades):
    """
    Merges new trades into data/synced_trades.json, preserving user notes, ratings, etc.
    """
    existing_trades = []
    if os.path.exists(SYNCED_TRADES_FILE):
        try:
            with open(SYNCED_TRADES_FILE, "r", encoding="utf-8") as f:
                existing_trades = json.load(f)
        except Exception:
            existing_trades = []

    trade_map = {}
    for t in existing_trades:
        key = str(t.get("ticket") or t.get("id"))
        trade_map[key] = t

    for nt in new_trades:
        key = str(nt.get("ticket") or nt.get("id"))
        if key in trade_map:
            ex = trade_map[key]
            # Preserve user edits
            merged = dict(nt)
            merged.update({
                "mistakes": ex.get("mistakes") or nt.get("mistakes") or [],
                "notes": ex.get("notes") if (ex.get("notes") and not ex.get("notes").startswith("Auto-synced")) else (nt.get("notes") or ex.get("notes")),
                "rating": ex.get("rating") or nt.get("rating") or 0,
                "emotions": ex.get("emotions") or nt.get("emotions") or "Disciplined",
                "strategy": ex.get("strategy") if (ex.get("strategy") and ex.get("strategy") != "HyperTrade MT5 Auto Sync") else (nt.get("strategy") or ex.get("strategy")),
                "confluences": ex.get("confluences") if (ex.get("confluences") and ex.get("confluences") != ["MT5 Live Execution"]) else (nt.get("confluences") or ex.get("confluences")),
                "beforeChartUrl": ex.get("beforeChartUrl") or nt.get("beforeChartUrl"),
                "afterChartUrl": ex.get("afterChartUrl") or nt.get("afterChartUrl"),
            })
            trade_map[key] = merged
        else:
            trade_map[key] = nt

    final_trades = list(trade_map.values())
    # Sort descending by closeTime or openTime
    final_trades.sort(key=lambda x: x.get("closeTime") or x.get("openTime") or "", reverse=True)

    with open(SYNCED_TRADES_FILE, "w", encoding="utf-8") as f:
        json.dump(final_trades, f, indent=2)

    return final_trades

def sync_all():
    print(f"================================================================")
    print(f"  [*] HYPERTRADE PRO - ALL ACCOUNTS AUTO-SYNC ENGINE STARTING  ")
    print(f"  Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"================================================================")

    all_accounts = {}
    all_open_positions = []
    all_new_trades = []

    # Load existing status file
    status_data = {}
    if os.path.exists(ACCOUNT_STATUS_FILE):
        try:
            with open(ACCOUNT_STATUS_FILE, "r", encoding="utf-8") as f:
                status_data = json.load(f)
                if status_data.get("accounts"):
                    all_accounts.update(status_data["accounts"])
        except Exception:
            pass

    # Collect known accounts from saved status
    saved_accounts_list = []
    for login, acc_obj in all_accounts.items():
        if acc_obj.get("status") != "disconnected":
            saved_accounts_list.append(acc_obj)

    # 1. First sync currently running desktop MT5 terminal immediately (sub-second)
    has_active_terminal = False
    try:
        if mt5.initialize():
            active_info = mt5.account_info()
            if active_info:
                active_login = str(active_info.login)
                active_res = extract_account_data(active_login, active_info.server)
                if active_res:
                    all_accounts[active_login] = active_res["account"]
                    all_open_positions.extend(active_res["openPositions"])
                    all_new_trades.extend(active_res["trades"])
                    has_active_terminal = True
                    print(f"[+] Synced active desktop terminal #{active_login} ({active_info.server})")
    except Exception:
        pass

    # 2. Iterate through configured terminals if requested or if no terminal was active
    should_scan_all_terminals = "--all-terminals" in sys.argv or not has_active_terminal
    if should_scan_all_terminals:
        for config in TERMINAL_CONFIGS:
            term_name = config["name"]
            target_logins = list(config.get("known_accounts", []))

            # Also add any saved accounts matching default servers
            for acc in saved_accounts_list:
                srv = acc.get("server", "")
                if any(ds.lower() in srv.lower() for ds in config.get("default_servers", [])):
                    target_logins.append(acc)

            for p in config["paths"]:
                if os.path.exists(p):
                    print(f"\n[*] Scanning Terminal: {term_name} -> {p}")
                    results = sync_terminal_instance(p, target_logins)
                    for res in results:
                        acc = res["account"]
                        login = str(acc["login"])
                        all_accounts[login] = acc
                        all_open_positions.extend(res["openPositions"])
                        all_new_trades.extend(res["trades"])

                        # Post to local web server webhook if active and not disabled
                        if "--no-webhook" not in sys.argv:
                            try:
                                req = urllib.request.Request(
                                    "http://localhost:3000/api/webhook/batch",
                                    data=json.dumps(res).encode("utf-8"),
                                    headers={"Content-Type": "application/json"}
                                )
                                with urllib.request.urlopen(req, timeout=1) as response:
                                    print(f"[+] Posted Account #{login} to live web journal.")
                            except Exception:
                                pass
                    break

    # Persist trades directly to disk
    merged_trades = merge_trades_to_disk(all_new_trades)

    # Save aggregated account status to disk
    active_login = list(all_accounts.keys())[0] if all_accounts else None
    primary_acc = all_accounts.get(active_login) if active_login else None

    final_status = {
        "accounts": all_accounts,
        "account": primary_acc,
        "openPositions": all_open_positions,
        "totalSyncedDeals": len(merged_trades),
        "lastSync": format_iso(int(datetime.now(timezone.utc).timestamp())),
        "removedAccounts": status_data.get("removedAccounts", [])
    }

    with open(ACCOUNT_STATUS_FILE, "w", encoding="utf-8") as f:
        json.dump(final_status, f, indent=2)

    print(f"\n================================================================")
    print(f"  [SUCCESS] All {len(all_accounts)} accounts synchronized completely!")
    print(f"  Total Trades in Vault: {len(merged_trades)} | Open Positions: {len(all_open_positions)}")
    print(f"================================================================\n")
    return final_status

if __name__ == "__main__":
    sync_all()

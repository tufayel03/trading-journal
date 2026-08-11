#!/usr/bin/env python3
"""
HyperTrade PRO - Silent Background Auto-Sync Daemon
Runs on Windows Startup / PC boot to automatically keep all MT5 trading accounts,
open positions, closed trades, and candlestick data synchronized continuously.
"""

import sys
import os
import time
import signal
import argparse
import subprocess
from datetime import datetime

# Reconfigure stdout for Windows console/logging
try:
    if sys.stdout.encoding != 'utf-8':
        sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(PROJECT_ROOT, "data")
LOG_FILE = os.path.join(DATA_DIR, "auto_sync_daemon.log")
PID_FILE = os.path.join(DATA_DIR, "auto_sync_daemon.pid")
SYNC_SCRIPT = os.path.join(PROJECT_ROOT, "scripts", "sync_mt5_account.py")

os.makedirs(DATA_DIR, exist_ok=True)

def log_message(msg):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    formatted = f"[{timestamp}] {msg}"
    print(formatted)
    try:
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(formatted + "\n")
    except Exception:
        pass

def write_pid():
    try:
        with open(PID_FILE, "w", encoding="utf-8") as f:
            f.write(str(os.getpid()))
    except Exception:
        pass

def remove_pid():
    try:
        if os.path.exists(PID_FILE):
            os.remove(PID_FILE)
    except Exception:
        pass

running = True

def signal_handler(signum, frame):
    global running
    log_message("Stop signal received. Shutting down HyperTrade Auto-Sync Daemon gracefully.")
    running = False

def run_sync_cycle():
    try:
        log_message("Starting scheduled multi-account sync cycle...")
        result = subprocess.run(
            [sys.executable, SYNC_SCRIPT],
            cwd=PROJECT_ROOT,
            capture_output=True,
            text=True,
            timeout=120
        )
        if result.returncode == 0:
            log_message("Multi-account sync cycle completed successfully.")
            # Log summary lines from stdout
            lines = [l.strip() for l in result.stdout.splitlines() if l.strip()]
            for l in lines[-3:]:
                log_message(f"  {l}")
        else:
            log_message(f"Sync error (code {result.returncode}): {result.stderr.strip()[:200]}")
    except subprocess.TimeoutExpired:
        log_message("Sync cycle timed out (exceeded 120 seconds).")
    except Exception as e:
        log_message(f"Sync execution exception: {str(e)}")

def main():
    parser = argparse.ArgumentParser(description="HyperTrade PRO Auto-Sync Daemon")
    parser.add_argument("--once", action="store_true", help="Run once and exit immediately")
    parser.add_argument("--interval", type=int, default=30, help="Sync interval in seconds (default: 30)")
    parser.add_argument("--daemon", action="store_true", help="Run in continuous background daemon mode")
    args = parser.parse_args()

    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    write_pid()
    log_message(f"============================================================")
    log_message(f"HyperTrade Auto-Sync Daemon Started (PID: {os.getpid()})")
    log_message(f"Sync Interval: {args.interval}s | Mode: {'One-Shot' if args.once else 'Continuous Daemon'}")
    log_message(f"============================================================")

    try:
        if args.once:
            run_sync_cycle()
            return

        # Continuous background loop
        while running:
            run_sync_cycle()
            
            # Sleep in 1-second chunks so we can stop quickly if requested
            for _ in range(args.interval):
                if not running:
                    break
                time.sleep(1)

    finally:
        remove_pid()
        log_message("HyperTrade Auto-Sync Daemon exited.")

if __name__ == "__main__":
    main()

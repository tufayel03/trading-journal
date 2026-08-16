#!/usr/bin/env python3
"""
HyperTrade PRO - Windows Startup Auto-Sync Installer
Creates a Windows Startup shortcut and starts the background daemon.
"""

import os
import sys
import subprocess

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VBS_PATH = os.path.join(PROJECT_ROOT, "scripts", "start_background_sync.vbs")
APPDATA = os.environ.get("APPDATA", "")
STARTUP_DIR = os.path.join(APPDATA, "Microsoft", "Windows", "Start Menu", "Programs", "Startup")
SHORTCUT_PATH = os.path.join(STARTUP_DIR, "HyperTrade_AutoSync.lnk")

def install_startup():
    print("================================================================")
    print("  HYPERTRADE PRO - WINDOWS STARTUP AUTO-SYNC REGISTRATION")
    print("================================================================")

    if not os.path.exists(STARTUP_DIR):
        os.makedirs(STARTUP_DIR, exist_ok=True)

    # Use Windows Script Host via VBScript to create shortcut reliably
    vbs_creator = os.path.join(PROJECT_ROOT, "scripts", "_create_shortcut.vbs")
    vbs_code = f'''
Set ws = CreateObject("WScript.Shell")
Set s = ws.CreateShortcut("{SHORTCUT_PATH}")
s.TargetPath = "wscript.exe"
s.Arguments = """{VBS_PATH}"""
s.WorkingDirectory = "{PROJECT_ROOT}"
s.Description = "HyperTrade PRO MT5 Multi-Account Auto-Sync Daemon"
s.Save
'''
    try:
        with open(vbs_creator, "w", encoding="utf-8") as f:
            f.write(vbs_code)
        subprocess.run(["cscript", "//nologo", vbs_creator], check=True, timeout=10)
        if os.path.exists(vbs_creator):
            os.remove(vbs_creator)
    except Exception as e:
        print(f"Error creating shortcut: {e}")

    if os.path.exists(SHORTCUT_PATH):
        print(f"[SUCCESS] Windows Startup Shortcut installed at:")
        print(f"  {SHORTCUT_PATH}")
    else:
        print(f"[!] Warning: Shortcut file not detected at {SHORTCUT_PATH}")

    # Launch daemon in background now
    try:
        subprocess.Popen(["wscript.exe", VBS_PATH], cwd=PROJECT_ROOT)
        print("[SUCCESS] Background Auto-Sync Daemon started silently!")
    except Exception as e:
        print(f"[!] Note on daemon start: {e}")

def remove_startup():
    print("================================================================")
    print("  HYPERTRADE PRO - REMOVE STARTUP AUTO-SYNC")
    print("================================================================")
    if os.path.exists(SHORTCUT_PATH):
        try:
            os.remove(SHORTCUT_PATH)
            print(f"[SUCCESS] Removed Windows Startup shortcut from:")
            print(f"  {SHORTCUT_PATH}")
        except Exception as e:
            print(f"Error removing shortcut: {e}")
    else:
        print("[*] Startup shortcut does not exist.")

    # Stop daemon if running
    pid_file = os.path.join(PROJECT_ROOT, "data", "auto_sync_daemon.pid")
    if os.path.exists(pid_file):
        try:
            with open(pid_file, "r") as f:
                pid = int(f.read().strip())
            os.kill(pid, 9)
            os.remove(pid_file)
            print("[SUCCESS] Stopped running background daemon.")
        except Exception:
            pass

    return True

if __name__ == "__main__":
    if "--remove" in sys.argv or "--uninstall" in sys.argv:
        remove_startup()
    else:
        install_startup()

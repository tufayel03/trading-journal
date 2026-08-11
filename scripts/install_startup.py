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

    print("\nAll MT5 accounts will now auto-sync whenever your PC turns on!")
    return os.path.exists(SHORTCUT_PATH)

if __name__ == "__main__":
    install_startup()

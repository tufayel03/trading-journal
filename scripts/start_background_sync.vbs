' HyperTrade PRO Silent Background Auto-Sync Launcher
' Launches the Python multi-account sync daemon silently with no popup window

Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' Get project directory
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
projectDir = fso.GetParentFolderName(scriptDir)

pythonScript = projectDir & "\scripts\auto_sync_daemon.py"

' Look for pythonw.exe or python.exe
pythonExe = "pythonw.exe"
userPythonW = "C:\Users\ashar\AppData\Local\Programs\Python\Python39\pythonw.exe"
if fso.FileExists(userPythonW) Then
    pythonExe = """" & userPythonW & """"
End If

cmd = pythonExe & " """ & pythonScript & """ --daemon --interval 30"

' Run with window style 0 (completely hidden) and do not wait for return
WshShell.CurrentDirectory = projectDir
WshShell.Run cmd, 0, False

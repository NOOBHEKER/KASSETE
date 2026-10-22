# Foldman smoke-test helpers (desktop automation for verification runs).
param(
  [string]$Action = 'focus',
  [string]$Exe = 'G:\kleosal-cassete\src-tauri\target\release\foldman-pc.exe',
  [int]$Width = 1180,
  [int]$Height = 800,
  [string]$Keys = ''
)

Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;
public class FoldmanWin {
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr h);
  [DllImport("user32.dll")] public static extern bool MoveWindow(IntPtr h, int x, int y, int w, int hh, bool repaint);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int cmd);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr h, StringBuilder s, int max);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, IntPtr pid);
  [DllImport("user32.dll")] public static extern bool AttachThreadInput(uint attach, uint attachTo, bool on);
  [DllImport("kernel32.dll")] public static extern uint GetCurrentThreadId();
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] public static extern void mouse_event(uint flags, uint dx, uint dy, uint data, UIntPtr extra);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
}
"@ -ErrorAction SilentlyContinue
Add-Type -AssemblyName System.Windows.Forms -ErrorAction SilentlyContinue

function Get-AppHandle {
  $p = Get-Process -Name 'foldman-pc' -ErrorAction SilentlyContinue |
    Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
  if (-not $p) { throw 'Foldman is not running.' }
  return [IntPtr]$p.MainWindowHandle
}

function Focus-App {
  $h = Get-AppHandle
  $fg = [FoldmanWin]::GetForegroundWindow()
  $fgThread = [FoldmanWin]::GetWindowThreadProcessId($fg, [IntPtr]::Zero)
  $myThread = [FoldmanWin]::GetCurrentThreadId()
  [FoldmanWin]::AttachThreadInput($myThread, $fgThread, $true) | Out-Null
  [FoldmanWin]::ShowWindow($h, 9) | Out-Null
  [FoldmanWin]::BringWindowToTop($h) | Out-Null
  [FoldmanWin]::SetForegroundWindow($h) | Out-Null
  [FoldmanWin]::AttachThreadInput($myThread, $fgThread, $false) | Out-Null
  Start-Sleep -Milliseconds 350
  $sb = New-Object System.Text.StringBuilder 256
  [FoldmanWin]::GetWindowText([FoldmanWin]::GetForegroundWindow(), $sb, 256) | Out-Null
  return $sb.ToString()
}

function Click-At([int]$x, [int]$y) {
  [FoldmanWin]::SetCursorPos($x, $y) | Out-Null
  Start-Sleep -Milliseconds 120
  [FoldmanWin]::mouse_event(0x02, 0, 0, 0, [UIntPtr]::Zero)
  Start-Sleep -Milliseconds 60
  [FoldmanWin]::mouse_event(0x04, 0, 0, 0, [UIntPtr]::Zero)
  Start-Sleep -Milliseconds 350
}

switch ($Action) {
  'start' {
    if (-not (Get-Process -Name 'foldman-pc' -ErrorAction SilentlyContinue)) {
      Start-Process -FilePath $Exe | Out-Null
    }
    Start-Sleep -Seconds 4
    "foreground=" + (Focus-App)
  }
  'focus' {
    "foreground=" + (Focus-App)
  }
  'where' {
    $h = Get-AppHandle
    $r = New-Object FoldmanWin+RECT
    [FoldmanWin]::GetWindowRect($h, [ref]$r) | Out-Null
    $sb = New-Object System.Text.StringBuilder 256
    [FoldmanWin]::GetWindowText([FoldmanWin]::GetForegroundWindow(), $sb, 256) | Out-Null
    "app=$($r.Left),$($r.Top) size=$($r.Right - $r.Left)x$($r.Bottom - $r.Top) foreground=$($sb.ToString())"
  }
  'resize' {
    $h = Get-AppHandle
    [FoldmanWin]::MoveWindow($h, 60, 40, $Width, $Height, $true) | Out-Null
    Start-Sleep -Milliseconds 700
    $r = New-Object FoldmanWin+RECT
    [FoldmanWin]::GetWindowRect($h, [ref]$r) | Out-Null
    "window=$($r.Right - $r.Left)x$($r.Bottom - $r.Top) at $($r.Left),$($r.Top)"
  }
  'keys' {
    $fg = Focus-App
    [System.Windows.Forms.SendKeys]::SendWait($Keys)
    "keys sent to: $fg"
  }
  'click' {
    $fg = Focus-App
    Click-At $Width $Height
    "clicked $Width,$Height over: $fg"
  }
  'close' {
    Get-Process -Name 'foldman-pc' -ErrorAction SilentlyContinue | Stop-Process -Force
    'closed'
  }
}

$ErrorActionPreference = "SilentlyContinue"
$projectPath = Split-Path -Parent $PSScriptRoot
while ($true) {
  $activeRecordings = Get-CimInstance Win32_Process | Where-Object {
    $_.Name -eq "ffmpeg.exe" -and $_.CommandLine -like "*khuree-live-recorder*"
  }
  if (-not $activeRecordings) { break }
  Start-Sleep -Seconds 20
}
$workers = Get-CimInstance Win32_Process | Where-Object {
  $_.Name -eq "node.exe" -and $_.CommandLine -like "*scripts/live-recorder.mjs*"
}
$workers | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
Start-Sleep -Seconds 2
& (Join-Path $projectPath "scripts\start-live-recorder.ps1")

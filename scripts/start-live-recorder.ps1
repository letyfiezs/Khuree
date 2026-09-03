$ErrorActionPreference = "Stop"
$projectPath = Split-Path -Parent $PSScriptRoot
$alreadyRunning = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
  Where-Object { $_.Name -eq "node.exe" -and $_.CommandLine -like "*scripts/live-recorder.mjs*" }
if ($alreadyRunning) { exit 0 }
$logDirectory = Join-Path $projectPath "storage\recorder-logs"
New-Item -ItemType Directory -Force -Path $logDirectory | Out-Null
Set-Location -LiteralPath $projectPath

$stamp = Get-Date -Format "yyyy-MM-dd"
$stdout = Join-Path $logDirectory "$stamp.log"
$stderr = Join-Path $logDirectory "$stamp-error.log"
$node = (Get-Command node -ErrorAction Stop).Source

Start-Process -FilePath $node `
  -ArgumentList "--env-file=.env.local", "scripts/live-recorder.mjs" `
  -WorkingDirectory $projectPath `
  -WindowStyle Hidden `
  -RedirectStandardOutput $stdout `
  -RedirectStandardError $stderr

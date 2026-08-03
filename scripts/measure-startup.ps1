param(
  [string]$ExePath = '',
  [ValidateRange(1, 50)]
  [int]$Runs = 5,
  [ValidateRange(1, 120)]
  [int]$TimeoutSeconds = 15,
  [string]$WindowTitle = 'CHMarkDown'
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
if (-not $ExePath) {
  $packagePath = Join-Path $projectRoot 'package.json'
  $package = [System.IO.File]::ReadAllText(
    $packagePath,
    [System.Text.Encoding]::UTF8
  ) | ConvertFrom-Json
  $ExePath = Join-Path $projectRoot "release\CHMarkDown-$($package.version)-portable-x64.exe"
}
$resolvedExe = (Resolve-Path -LiteralPath $ExePath).Path
$tempBase = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
$dataRoot = Join-Path $tempBase "chmarkdown-startup-$([guid]::NewGuid().ToString('N'))"
New-Item -ItemType Directory -Path $dataRoot | Out-Null

function Stop-RunProcesses([string]$RunDirectory, $Launcher) {
  $targets = Get-CimInstance Win32_Process | Where-Object {
    $_.CommandLine -and $_.CommandLine.IndexOf(
      $RunDirectory,
      [System.StringComparison]::OrdinalIgnoreCase
    ) -ge 0
  }
  foreach ($target in $targets) {
    Stop-Process -Id $target.ProcessId -Force -ErrorAction SilentlyContinue
  }
  if ($Launcher -and -not $Launcher.HasExited) {
    Stop-Process -Id $Launcher.Id -Force -ErrorAction SilentlyContinue
  }
}

$measurements = [System.Collections.Generic.List[double]]::new()
try {
  for ($index = 1; $index -le $Runs; $index += 1) {
    $runDirectory = Join-Path $dataRoot "run-$index"
    New-Item -ItemType Directory -Path $runDirectory | Out-Null
    $launcher = $null
    try {
      $startedAt = Get-Date
      $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
      $launcher = Start-Process -FilePath $resolvedExe -ArgumentList "--user-data-dir=$runDirectory" -PassThru
      $windowFound = $false

      while ($stopwatch.Elapsed.TotalSeconds -lt $TimeoutSeconds) {
        $window = Get-Process -ErrorAction SilentlyContinue |
          Where-Object { $_.MainWindowTitle -eq $WindowTitle -and $_.StartTime -ge $startedAt } |
          Select-Object -First 1
        if ($window) {
          $windowFound = $true
          break
        }
        Start-Sleep -Milliseconds 25
      }

      $stopwatch.Stop()
      if (-not $windowFound) {
        throw "Run $index did not show the main window within $TimeoutSeconds seconds"
      }
      $measurements.Add([math]::Round($stopwatch.Elapsed.TotalSeconds, 3))
    } finally {
      Stop-RunProcesses $runDirectory $launcher
    }
    Start-Sleep -Milliseconds 500
  }
} finally {
  $resolvedDataRoot = (Resolve-Path -LiteralPath $dataRoot -ErrorAction SilentlyContinue).Path
  if (
    $resolvedDataRoot -and
    $resolvedDataRoot.StartsWith($tempBase, [System.StringComparison]::OrdinalIgnoreCase) -and
    (Split-Path -Leaf $resolvedDataRoot).StartsWith('chmarkdown-startup-')
  ) {
    Remove-Item -LiteralPath $resolvedDataRoot -Recurse -Force
  }
}

$sorted = @($measurements | Sort-Object)
$median = if ($sorted.Count % 2 -eq 1) {
  $sorted[[math]::Floor($sorted.Count / 2)]
} else {
  ($sorted[$sorted.Count / 2 - 1] + $sorted[$sorted.Count / 2]) / 2
}

[pscustomobject]@{
  Executable = $resolvedExe
  Runs = $measurements -join ', '
  MedianSeconds = [math]::Round($median, 3)
  MinimumSeconds = $sorted[0]
  MaximumSeconds = $sorted[-1]
}

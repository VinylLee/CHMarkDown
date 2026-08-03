param(
  [string]$PortablePath,
  [string]$UnpackedPath,
  [string]$CleanupTestDirectory
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$package = Get-Content -LiteralPath (Join-Path $projectRoot 'package.json') -Raw -Encoding UTF8 |
  ConvertFrom-Json

if (-not $PortablePath) {
  $PortablePath = Join-Path $projectRoot (
    "release\CHMarkDown-$($package.version)-portable-x64.exe"
  )
}
if (-not $UnpackedPath) {
  $UnpackedPath = Join-Path $projectRoot 'release\win-unpacked\CHMarkDown.exe'
}

$PortablePath = (Resolve-Path -LiteralPath $PortablePath).Path
$UnpackedPath = (Resolve-Path -LiteralPath $UnpackedPath).Path
$tempBase = [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\')

function Remove-SafeTestDirectory([string]$directoryPath) {
  $resolvedTestDirectory = [IO.Path]::GetFullPath($directoryPath)
  $safePrefix = $tempBase + '\'
  $safeLeaf = (Split-Path $resolvedTestDirectory -Leaf).StartsWith(
    'chmarkdown-v100-',
    [StringComparison]::OrdinalIgnoreCase
  )
  if (
    -not $resolvedTestDirectory.StartsWith(
      $safePrefix,
      [StringComparison]::OrdinalIgnoreCase
    ) -or -not $safeLeaf
  ) {
    throw "Refusing to clean unverified test directory: $resolvedTestDirectory"
  }
  if (Test-Path -LiteralPath $resolvedTestDirectory) {
    Remove-Item -LiteralPath $resolvedTestDirectory -Recurse -Force
  }
}

if ($CleanupTestDirectory) {
  Remove-SafeTestDirectory $CleanupTestDirectory
  Write-Output "Removed smoke-test directory: $CleanupTestDirectory"
  exit 0
}

function Get-TestProcesses([string]$testToken) {
  Get-CimInstance Win32_Process | Where-Object {
    $_.CommandLine -and
    $_.CommandLine.IndexOf(
      $testToken,
      [StringComparison]::OrdinalIgnoreCase
    ) -ge 0
  }
}

function Get-TestMainWindows([string]$testToken) {
  $relatedIds = @(Get-TestProcesses $testToken | ForEach-Object ProcessId)
  @(
    foreach ($relatedId in $relatedIds) {
      Get-Process -Id $relatedId -ErrorAction SilentlyContinue |
        Where-Object {
          $_.MainWindowHandle -ne 0 -and $_.MainWindowTitle -like '*CHMarkDown*'
        }
    }
  )
}

function Test-PackagedApp([string]$label, [string]$executablePath) {
  $testToken = "chmarkdown-v100-$label-$([guid]::NewGuid().ToString('N'))"
  $testDirectory = Join-Path $tempBase $testToken
  $markdownPath = Join-Path $testDirectory 'smoke-test.md'
  New-Item -ItemType Directory -Path $testDirectory | Out-Null
  Set-Content -LiteralPath $markdownPath -Encoding UTF8 -Value @(
    '# CHMarkDown 1.0.0',
    '',
    'Packaged release smoke test.'
  )

  try {
    $launchArguments = @("--user-data-dir=$testDirectory", $markdownPath)
    Start-Process -FilePath $executablePath -ArgumentList $launchArguments |
      Out-Null

    $windowDeadline = [DateTime]::UtcNow.AddSeconds(35)
    do {
      Start-Sleep -Milliseconds 250
      $mainWindows = @(Get-TestMainWindows $testToken)
    } until ($mainWindows.Count -ge 1 -or [DateTime]::UtcNow -ge $windowDeadline)
    if ($mainWindows.Count -ne 1) {
      throw "$label initial window count was $($mainWindows.Count), expected 1"
    }

    $dataDeadline = [DateTime]::UtcNow.AddSeconds(12)
    $recentRecorded = $false
    $sessionRecorded = $false
    do {
      Start-Sleep -Milliseconds 250
      $recentPath = Join-Path $testDirectory 'recent-files.json'
      $sessionPath = Join-Path $testDirectory 'session.json'
      if (Test-Path -LiteralPath $recentPath) {
        $recentRecorded = (Get-Content -LiteralPath $recentPath -Raw).Contains(
          'smoke-test.md'
        )
      }
      if (Test-Path -LiteralPath $sessionPath) {
        $sessionRecorded = (Get-Content -LiteralPath $sessionPath -Raw).Contains(
          'smoke-test.md'
        )
      }
    } until (
      ($recentRecorded -and $sessionRecorded) -or
      [DateTime]::UtcNow -ge $dataDeadline
    )

    $secondLauncher = Start-Process -FilePath $executablePath -ArgumentList @(
      "--user-data-dir=$testDirectory"
    ) -PassThru
    $null = $secondLauncher.WaitForExit(15000)
    Start-Sleep -Seconds 2
    $secondLauncher.Refresh()
    $mainWindows = @(Get-TestMainWindows $testToken)
    $relatedIds = @(Get-TestProcesses $testToken | ForEach-Object ProcessId)

    if ($mainWindows.Count -ne 1) {
      throw "$label second launch left $($mainWindows.Count) windows, expected 1"
    }
    if (-not $secondLauncher.HasExited) {
      throw "$label second launcher did not exit"
    }
    if (-not $recentRecorded -or -not $sessionRecorded) {
      throw "$label did not persist the Markdown file opened from the command line"
    }

    [PSCustomObject]@{
      Package = $label
      MainWindowCount = $mainWindows.Count
      SecondLauncherExited = $secondLauncher.HasExited
      MarkdownOpenedAndRecorded = $recentRecorded
      SessionRecorded = $sessionRecorded
      RelatedElectronProcesses = $relatedIds.Count
    }
  } finally {
    foreach ($processInfo in @(Get-TestProcesses $testToken)) {
      Stop-Process -Id $processInfo.ProcessId -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Milliseconds 500

    Remove-SafeTestDirectory $testDirectory
  }
}

$results = @(
  Test-PackagedApp 'unpacked' $UnpackedPath
  Test-PackagedApp 'portable' $PortablePath
)
$results | Format-Table -AutoSize

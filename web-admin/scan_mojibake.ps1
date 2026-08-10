# Scan cost-plan files for CP437 mojibake (UTF-8 text double-encoded via codepage 437)
$ErrorActionPreference = 'Stop'
$dir = "d:\HỆ THỐNG QUẢN LÝ CÔNG VIỆC-web-app-titsmart\web-admin\src\pages\cost-plan"

function Test-Mojibake([string]$text) {
  # Mojibake chars: box drawing U+2500-U+257F, block U+2591-U+2593, plus chars like ß ╞ ░ ─ Γ
  foreach ($ch in $text.ToCharArray()) {
    $cp = [int]$ch
    if (($cp -ge 0x2500 -and $cp -le 0x257F) -or ($cp -ge 0x2590 -and $cp -le 0x259F) -or $cp -eq 0x00DF -or $cp -eq 0x2310 -or $cp -eq 0x0393) {
      return $true
    }
  }
  return $false
}

foreach ($f in (Get-ChildItem -Path $dir -Filter *.tsx)) {
  $content = [System.IO.File]::ReadAllText($f.FullName, [System.Text.Encoding]::UTF8)
  $bad = Test-Mojibake $content
  Write-Output "$($f.Name): mojibake=$bad"
}

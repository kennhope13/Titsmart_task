# Build script for LOCAL development.
#
# WHY this script exists:
#   The repo lives under a path containing Vietnamese characters:
#     D:\HỆ THỐNG QUẢN LÝ CÔNG VIỆC-web-app-titsmart\...
#   electron-builder renames the unpacked dir (win-unpacked.tmp -> win-unpacked)
#   via Node.js fs.rename, which fails with EPERM inside a non-ASCII path.
#   (PowerShell Rename-Item fails the same way there; ASCII paths work fine.)
#
# FIX: build into a TEMPORARY ASCII path, then copy the artifacts back into
#   web-admin\release. No Defender changes needed.
#
# Usage:  .\build-electron-local.ps1

Set-Location -Path $PSScriptRoot

$tempOutput = Join-Path $env:LOCALAPPDATA "titsmart-build\release"
$asciiRoot  = Join-Path $env:LOCALAPPDATA "titsmart-build"

Write-Host "==> Buoc 1: 'vite build' (tao dist + dist-electron, chay trong repo)..."
npx vite build
if ($LASTEXITCODE -ne 0) { Write-Host "vite build THAT BAI."; exit 1 }

Write-Host ""
Write-Host "==> Buoc 2: electron-builder build vao duong dan ASCII (khong dau):"
Write-Host "    $tempOutput"
New-Item -ItemType Directory -Force -Path $asciiRoot | Out-Null
Remove-Item -Recurse -Force $tempOutput -ErrorAction SilentlyContinue

npx electron-builder --win --config.directories.output="$tempOutput"
if ($LASTEXITCODE -ne 0) { Write-Host "electron-builder THAT BAI."; exit 1 }

Write-Host ""
Write-Host "==> Buoc 3: Copy artifacts vao web-admin\release..."
New-Item -ItemType Directory -Force -Path "release" | Out-Null
cmd /c robocopy "$tempOutput" "$PSScriptRoot\release" /E /NFL /NDL /NJH /NJS /NP | Out-Null

Write-Host ""
if (Test-Path "release\TITSMART-Setup.exe") {
    Write-Host "BUILD THANH CONG."
    Get-ChildItem release\TITSMART-Setup.exe, release\*.exe.blockmap, release\latest.yml |
        Select-Object Name, @{N='MB';E={[math]::Round($_.Length/1MB, 2)}}, LastWriteTime
} else {
    Write-Host "Copy that bai: khong thay TITSMART-Setup.exe trong release."
    exit 1
}
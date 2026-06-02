# deploy.ps1
# Script to automate building and deploying the TW Arrow Nav plugin to the local vault

$ErrorActionPreference = "Stop"

# 1. Run npm install
Write-Host "1. Running 'npm install'..." -ForegroundColor Cyan
npm install

# 2. Run npm run build
Write-Host "2. Running 'npm run build'..." -ForegroundColor Cyan
npm run build

# Destination plugin directory
$destDir = "D:\obsidian\tw-arrow-nav\vault\.obsidian\plugins\tw-arrow-nav"

# 3. Delete all files in the destination directory
Write-Host "3. Clearing destination directory: $destDir" -ForegroundColor Cyan
if (Test-Path $destDir) {
    Remove-Item -Path "$destDir\*" -Recurse -Force
} else {
    New-Item -ItemType Directory -Force -Path $destDir
}

# 4. Add the new files to the destination directory
Write-Host "4. Copying new build files to destination..." -ForegroundColor Cyan
$filesToCopy = @("main.js", "manifest.json", "styles.css")
foreach ($file in $filesToCopy) {
    $srcPath = Join-Path $PSScriptRoot $file
    if (Test-Path $srcPath) {
        Copy-Item -Path $srcPath -Destination $destDir -Force
        Write-Host "   Copied $file" -ForegroundColor Green
    } else {
        Write-Warning "   File not found: $file"
    }
}

Write-Host "Success! TW Arrow Nav plugin deployed to vault." -ForegroundColor Green

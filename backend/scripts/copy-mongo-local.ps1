param(
    [string]$SourceUri = "mongodb://localhost:27017/",
    [string]$TargetUri = "mongodb://localhost:5678/",
    [string]$Database = "",
    [switch]$DropTarget = $true
)

$ErrorActionPreference = "Stop"

function Assert-CommandExists {
    param([string]$CommandName)

    if (-not (Get-Command $CommandName -ErrorAction SilentlyContinue)) {
        throw "Required command '$CommandName' was not found. Install MongoDB Database Tools and make sure it's on PATH."
    }
}

try {
    Assert-CommandExists -CommandName "mongodump"
    Assert-CommandExists -CommandName "mongorestore"

    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $tempRoot = Join-Path $env:TEMP "mongo-copy-$timestamp"
    New-Item -ItemType Directory -Path $tempRoot | Out-Null

    Write-Host "[1/3] Dumping source data from $SourceUri" -ForegroundColor Cyan

    $dumpArgs = @("--uri=$SourceUri", "--out=$tempRoot")

    if ($Database) {
        $dumpArgs += "--db=$Database"
    }
    else {
        # Skip system databases when copying all data.
        $dumpArgs += @("--nsExclude=admin.*", "--nsExclude=config.*", "--nsExclude=local.*")
    }

    & mongodump @dumpArgs
    if ($LASTEXITCODE -ne 0) {
        throw "mongodump failed with exit code $LASTEXITCODE"
    }

    Write-Host "[2/3] Restoring into target $TargetUri" -ForegroundColor Cyan

    $restoreArgs = @("--uri=$TargetUri", "--dir=$tempRoot")

    if ($DropTarget) {
        $restoreArgs += "--drop"
    }

    if ($Database) {
        $restoreArgs += "--nsInclude=$Database.*"
    }

    & mongorestore @restoreArgs
    if ($LASTEXITCODE -ne 0) {
        throw "mongorestore failed with exit code $LASTEXITCODE"
    }

    Write-Host "[3/3] Cleaning temporary files" -ForegroundColor Cyan
    Remove-Item -Path $tempRoot -Recurse -Force

    Write-Host "MongoDB copy completed successfully." -ForegroundColor Green
    Write-Host "Source: $SourceUri"
    Write-Host "Target: $TargetUri"
    if ($Database) {
        Write-Host "Database: $Database"
    }
    else {
        Write-Host "Databases: all non-system databases"
    }
}
catch {
    Write-Error $_
    exit 1
}

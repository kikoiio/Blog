$ErrorActionPreference = 'Stop'

Set-Location -LiteralPath $PSScriptRoot

$message = if ($args.Count -gt 0) { $args[0] } else { '' }

Write-Host "==> Building production site"
hugo --gc --minify --cleanDestinationDir

Write-Host ""
Write-Host "==> Git status"
git status --short

git diff --cached --quiet
if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "No staged changes found."
    Write-Host "Stage only the files you want to publish, then rerun:"
    Write-Host '  .\deploy.ps1 "commit message"'
    exit 0
}

if ([string]::IsNullOrWhiteSpace($message)) {
    Write-Host ""
    Write-Host "A commit message is required when staged changes are present."
    Write-Host 'Usage: .\deploy.ps1 "commit message"'
    exit 1
}

Write-Host ""
Write-Host "==> Committing staged changes"
git commit -m $message

Write-Host ""
Write-Host "==> Pushing to origin"
git push

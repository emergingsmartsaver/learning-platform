param(
    [Parameter(Mandatory=$true)]
    [string]$SourceFolder
)

$dest = "C:\Users\emerg\OneDrive\Documents\EmergingSmartGroup\Projects\learning-platform-live"

robocopy $SourceFolder $dest /E `
    /XD node_modules .git dist `
    /XF .env.local serviceAccountKey.json package-lock.json

Write-Host "`nSync complete. Now run:" -ForegroundColor Cyan
Write-Host "  cd `"$dest`""
Write-Host "  git status"
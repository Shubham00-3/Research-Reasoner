# Script to update .env file for production deployment
$envFile = Join-Path $PSScriptRoot ".env"

if (-not (Test-Path $envFile)) {
    Write-Host "Error: .env file not found at $envFile" -ForegroundColor Red
    exit 1
}

Write-Host "Updating .env file for production deployment..." -ForegroundColor Yellow

# Read current content
$content = Get-Content $envFile

# Update content
$updatedContent = $content | ForEach-Object {
    if ($_ -match '^NODE_ENV=') {
        'NODE_ENV=production'
    }
    elseif ($_ -match '^# GROQ_API_KEY=') {
        'GROQ_API_KEY=your_groq_api_key_here'
    }
    elseif ($_ -match '^# Optional LLM for chat/insights') {
        '# Groq API Configuration (Required for AI features)'
    }
    else {
        $_
    }
}

# Write updated content
$updatedContent | Set-Content $envFile

Write-Host "✅ .env file updated for production!" -ForegroundColor Green
Write-Host "⚠️  Don't forget to:" -ForegroundColor Yellow
Write-Host "   1. Replace 'your_groq_api_key_here' with your actual Groq API key" -ForegroundColor Yellow
Write-Host "   2. Set these same variables in Railway dashboard for deployment" -ForegroundColor Yellow


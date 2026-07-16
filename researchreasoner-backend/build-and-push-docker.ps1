# ResearchReasoner Backend - Build and Push Docker Image for Railway
# This script builds the Docker image with the latest code changes and pushes to Docker Hub

$DOCKERHUB_USERNAME = "shubhamgangwar"
$IMAGE_NAME = "researchreasoner-backend"
$VERSION = "1.0.4"  # Incremented version for latest changes
$LATEST = "latest"
$IMAGE_TAG_VERSION = "${DOCKERHUB_USERNAME}/${IMAGE_NAME}:${VERSION}"
$IMAGE_TAG_LATEST = "${DOCKERHUB_USERNAME}/${IMAGE_NAME}:${LATEST}"

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "ResearchReasoner Backend Docker Build" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is running
Write-Host "Checking Docker status..." -ForegroundColor Yellow
$dockerRunning = docker info 2>$null
if (-not $dockerRunning) {
    Write-Host "ERROR: Docker Desktop is not running!" -ForegroundColor Red
    Write-Host "Please start Docker Desktop and try again." -ForegroundColor Red
    exit 1
}
Write-Host "✅ Docker is running!" -ForegroundColor Green
Write-Host ""

# Navigate to backend directory
Write-Host "Navigating to backend directory..." -ForegroundColor Yellow
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendPath = Join-Path $scriptPath "."
Set-Location $backendPath
Write-Host "✅ Working in: $(Get-Location)" -ForegroundColor Green
Write-Host ""

# Build the Docker image
Write-Host "Building Docker image with latest changes..." -ForegroundColor Yellow
Write-Host "Image: $IMAGE_TAG_VERSION" -ForegroundColor Cyan
Write-Host ""

docker build -t $IMAGE_TAG_VERSION -t $IMAGE_TAG_LATEST .

if (-not $?) {
    Write-Host "ERROR: Docker build failed!" -ForegroundColor Red
    exit 1
}
Write-Host ""
Write-Host "✅ Build successful!" -ForegroundColor Green
Write-Host ""

# Show built images
Write-Host "Built images:" -ForegroundColor Yellow
docker images | Select-String -Pattern $IMAGE_NAME
Write-Host ""

# Login to Docker Hub
Write-Host "Logging in to Docker Hub..." -ForegroundColor Yellow
docker login
if (-not $?) {
    Write-Host "ERROR: Docker Hub login failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Login successful!" -ForegroundColor Green
Write-Host ""

# Push images
Write-Host "Pushing images to Docker Hub..." -ForegroundColor Yellow
docker push $IMAGE_TAG_VERSION
if (-not $?) {
    Write-Host "ERROR: Failed to push version tag!" -ForegroundColor Red
    exit 1
}

docker push $IMAGE_TAG_LATEST
if (-not $?) {
    Write-Host "ERROR: Failed to push latest tag!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=====================================" -ForegroundColor Green
Write-Host "✅ SUCCESS! Image pushed to Docker Hub" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Go to Railway dashboard" -ForegroundColor White
Write-Host "2. Trigger a redeploy or wait for Railway to pull the new image" -ForegroundColor White
Write-Host "3. Verify the deployment is using the updated image" -ForegroundColor White
Write-Host ""
Write-Host "Image URL: https://hub.docker.com/r/$DOCKERHUB_USERNAME/$IMAGE_NAME" -ForegroundColor Cyan


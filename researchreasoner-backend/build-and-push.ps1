# ResearchReasoner Backend - Docker Build & Push Script
# Replace YOUR_DOCKERHUB_USERNAME with your actual username

$DOCKERHUB_USERNAME = "shubhamgangwar"
$IMAGE_NAME = "researchreasoner-backend"
$VERSION = "1.0.0"
$LATEST = "latest"

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
Write-Host "Docker is running!" -ForegroundColor Green
Write-Host ""

# Navigate to backend directory
Write-Host "Navigating to backend directory..." -ForegroundColor Yellow
cd researchreasoner-backend
if (-not $?) {
    Write-Host "ERROR: Could not find researchreasoner-backend directory" -ForegroundColor Red
    exit 1
}
Write-Host "Directory found!" -ForegroundColor Green
Write-Host ""

# Build the Docker image
Write-Host "Building Docker image..." -ForegroundColor Yellow
Write-Host "Image: $DOCKERHUB_USERNAME/$IMAGE_NAME:$VERSION" -ForegroundColor Cyan
docker build -t $DOCKERHUB_USERNAME/$IMAGE_NAME:$VERSION -t $DOCKERHUB_USERNAME/$IMAGE_NAME:$LATEST .

if (-not $?) {
    Write-Host "ERROR: Docker build failed!" -ForegroundColor Red
    exit 1
}
Write-Host "Build successful!" -ForegroundColor Green
Write-Host ""

# Show built images
Write-Host "Built images:" -ForegroundColor Yellow
docker images | Select-String -Pattern $IMAGE_NAME
Write-Host ""

# Push images
Write-Host "Ready to push to Docker Hub!" -ForegroundColor Yellow
Write-Host "Commands to run manually:" -ForegroundColor Cyan
Write-Host ""
Write-Host "  docker login" -ForegroundColor White
Write-Host "  docker push $DOCKERHUB_USERNAME/$IMAGE_NAME:$VERSION" -ForegroundColor White
Write-Host "  docker push $DOCKERHUB_USERNAME/$IMAGE_NAME:$LATEST" -ForegroundColor White
Write-Host ""
Write-Host "Or run this script with -Push flag to push automatically" -ForegroundColor Cyan

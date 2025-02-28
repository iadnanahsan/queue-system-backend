#!/bin/bash
# Deployment script for VPS only
set -e  # Exit immediately if a command exits with a non-zero status

echo "Starting deployment process..."

# Store the current commit hash before pulling
OLD_COMMIT=$(git rev-parse HEAD)

# Pull the latest changes
echo "Fetching latest changes from repository..."
git fetch
git pull

# Check if there are actual changes
NEW_COMMIT=$(git rev-parse HEAD)
if [ "$OLD_COMMIT" == "$NEW_COMMIT" ]; then
    echo "No changes detected. Skipping deployment."
    exit 0
fi

echo "Changes detected. Proceeding with deployment..."

# Install dependencies (only if package.json changed)
if git diff --name-only $OLD_COMMIT $NEW_COMMIT | grep -q "package.json"; then
    echo "Package.json changed. Installing dependencies..."
    npm install
else
    echo "Package.json unchanged. Skipping npm install."
fi

# Build the application
echo "Building the application..."
npm run build

# Restart the application with zero-downtime reload
echo "Restarting the application..."
pm2 reload queue-system --update-env

echo "Deployment completed successfully!"
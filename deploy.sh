#!/bin/bash
set -e  # Exit immediately if a command exits with a non-zero status

# Colors for better readability
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting deployment process...${NC}"

# 1. Commit and push changes to GitHub
echo -e "${YELLOW}Checking for uncommitted changes...${NC}"

# Check if there are any changes to commit
if [[ -n $(git status -s) ]]; then
    echo -e "${YELLOW}Uncommitted changes found. Committing...${NC}"
    
    # Ask for commit message
    echo -e "${YELLOW}Enter commit message:${NC}"
    read commit_message
    
    # Add all changes
    git add .
    
    # Commit with the provided message
    git commit -m "$commit_message"
    
    echo -e "${GREEN}Changes committed successfully.${NC}"
else
    echo -e "${GREEN}No uncommitted changes found.${NC}"
fi

# Get current branch
current_branch=$(git symbolic-ref --short HEAD)
echo -e "${YELLOW}Pushing to branch: ${current_branch}${NC}"

# Push to GitHub
git push origin $current_branch

echo -e "${GREEN}Changes pushed to GitHub successfully.${NC}"

# 2. SSH into the VPS and deploy
echo -e "${YELLOW}Connecting to VPS and deploying...${NC}"

# Replace with your VPS details
VPS_USER="root"
VPS_HOST="your-vps-ip-or-hostname"

# SSH commands to run on the VPS
ssh $VPS_USER@$VPS_HOST << 'EOF'
    # Go to the project directory
    cd /var/www/queue-system-backend

    # Store the current commit hash before pulling
    OLD_COMMIT=$(git rev-parse HEAD)

    # Pull the latest changes
    git fetch
    git pull

    # Check if there are actual changes
    NEW_COMMIT=$(git rev-parse HEAD)
    if [ "$OLD_COMMIT" == "$NEW_COMMIT" ]; then
        echo "No changes detected. Skipping deployment."
        exit 0
    fi

    # Install dependencies (only if package.json changed)
    if git diff --name-only $OLD_COMMIT $NEW_COMMIT | grep -q "package.json"; then
        echo "Package.json changed. Installing dependencies..."
        npm install
    else
        echo "Package.json unchanged. Skipping npm install."
    fi

    # Build the application
    npm run build

    # Restart the application with zero-downtime reload
    pm2 reload queue-system --update-env

    echo "Deployment completed successfully!"
EOF

# Check if SSH command was successful
if [ $? -eq 0 ]; then
    echo -e "${GREEN}Deployment completed successfully!${NC}"
else
    echo -e "${RED}Deployment failed. Please check the error messages above.${NC}"
    exit 1
fi
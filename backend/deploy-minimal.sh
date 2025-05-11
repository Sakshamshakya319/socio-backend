#!/bin/bash
# Minimal deployment script for Socio.io backend

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored message
print_message() {
  local color=$1
  local message=$2
  echo -e "${color}${message}${NC}"
}

# Create deployment directory
print_message "$BLUE" "Creating deployment directory..."
mkdir -p deploy

# Copy minimal files
print_message "$BLUE" "Copying minimal files..."
cp server-minimal.js deploy/
cp index.js deploy/
cp package-minimal.json deploy/package.json

# Create Procfile
print_message "$BLUE" "Creating Procfile..."
echo "web: node index.js" > deploy/Procfile

print_message "$GREEN" "Deployment files prepared in the 'deploy' directory."
print_message "$YELLOW" "To deploy to Render:"
print_message "$YELLOW" "1. Push the contents of the 'deploy' directory to your GitHub repository"
print_message "$YELLOW" "2. Create a new Web Service on Render"
print_message "$YELLOW" "3. Connect your GitHub repository"
print_message "$YELLOW" "4. Configure as described in MINIMAL_DEPLOYMENT.md"
print_message "$YELLOW" "5. Click 'Create Web Service'"
#!/bin/bash
# Deployment script for Socio.io backend
# This script automates the deployment process to Render

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

# Check if command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
check_prerequisites() {
  print_message "$BLUE" "Checking prerequisites..."
  
  # Check if Node.js is installed
  if ! command_exists node; then
    print_message "$RED" "Error: Node.js is not installed. Please install Node.js and try again."
    exit 1
  fi
  
  # Check Node.js version
  NODE_VERSION=$(node -v | cut -d 'v' -f 2)
  NODE_MAJOR_VERSION=$(echo $NODE_VERSION | cut -d '.' -f 1)
  
  if [ "$NODE_MAJOR_VERSION" -lt 14 ]; then
    print_message "$RED" "Error: Node.js version 14 or higher is required. Current version: $NODE_VERSION"
    exit 1
  fi
  
  # Check if npm is installed
  if ! command_exists npm; then
    print_message "$RED" "Error: npm is not installed. Please install npm and try again."
    exit 1
  fi
  
  # Check if git is installed
  if ! command_exists git; then
    print_message "$RED" "Error: git is not installed. Please install git and try again."
    exit 1
  fi
  
  print_message "$GREEN" "All prerequisites are met."
}

# Build the application
build_app() {
  print_message "$BLUE" "Building the application..."
  
  # Install dependencies
  print_message "$YELLOW" "Installing dependencies..."
  npm install
  
  if [ $? -ne 0 ]; then
    print_message "$RED" "Error: Failed to install dependencies."
    exit 1
  fi
  
  # Run the build script
  print_message "$YELLOW" "Running build script..."
  node build.js
  
  if [ $? -ne 0 ]; then
    print_message "$RED" "Error: Build failed."
    exit 1
  fi
  
  print_message "$GREEN" "Application built successfully."
}

# Prepare for deployment
prepare_deployment() {
  print_message "$BLUE" "Preparing for deployment..."
  
  # Check if .env file exists
  if [ ! -f .env ]; then
    print_message "$YELLOW" "Warning: .env file not found. Creating a sample .env file..."
    echo "PORT=5000" > .env
  fi
  
  # Check if render.yaml exists
  if [ ! -f render.yaml ]; then
    print_message "$YELLOW" "Warning: render.yaml file not found. Creating a sample render.yaml file..."
    cat > render.yaml << EOL
services:
  - type: web
    name: socio-io-backend
    env: node
    buildCommand: npm install
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 10000
    healthCheckPath: /ping
EOL
  fi
  
  print_message "$GREEN" "Deployment preparation completed."
}

# Deploy to Render
deploy_to_render() {
  print_message "$BLUE" "Deploying to Render..."
  
  # Check if git repository exists
  if [ ! -d .git ]; then
    print_message "$YELLOW" "Warning: Git repository not found. Initializing git repository..."
    git init
    git add .
    git commit -m "Initial commit for Render deployment"
  else
    # Commit any changes
    git add .
    git commit -m "Update for Render deployment"
  fi
  
  print_message "$YELLOW" "To deploy to Render, follow these steps:"
  print_message "$YELLOW" "1. Push your code to GitHub or GitLab"
  print_message "$YELLOW" "2. Log in to your Render account"
  print_message "$YELLOW" "3. Create a new Web Service and connect your repository"
  print_message "$YELLOW" "4. Configure the service as described in RENDER_DEPLOYMENT.md"
  print_message "$YELLOW" "5. Click 'Create Web Service' to deploy"
  
  print_message "$GREEN" "Deployment instructions provided."
}

# Main function
main() {
  print_message "$BLUE" "Starting deployment process for Socio.io backend..."
  
  check_prerequisites
  build_app
  prepare_deployment
  deploy_to_render
  
  print_message "$GREEN" "Deployment process completed successfully."
  print_message "$GREEN" "For detailed deployment instructions, see RENDER_DEPLOYMENT.md"
}

# Run the main function
main
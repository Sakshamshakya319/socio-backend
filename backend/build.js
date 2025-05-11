/**
 * Build script for Socio.io backend
 * 
 * This script automates the build process for the backend:
 * - Validates the environment
 * - Installs dependencies
 * - Runs linting (if configured)
 * - Creates necessary directories
 * - Copies static files
 * - Generates build artifacts
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const config = {
  requiredDirs: ['logs'],
  requiredFiles: ['.env', 'server.js', 'content_filter.js', 'text_analysis.js'],
  buildDir: 'build',
  filesToCopy: [
    'server.js',
    'content_filter.js',
    'text_analysis.js',
    'package.json',
    'package-lock.json',
    'Procfile',
    '.env',
    'render.yaml'
  ]
};

// Utility functions
function log(message, type = 'info') {
  const colors = {
    info: '\x1b[36m%s\x1b[0m',    // Cyan
    success: '\x1b[32m%s\x1b[0m',  // Green
    warning: '\x1b[33m%s\x1b[0m',  // Yellow
    error: '\x1b[31m%s\x1b[0m'     // Red
  };
  
  console.log(colors[type], `[${type.toUpperCase()}] ${message}`);
}

function ensureDirectoryExists(dir) {
  if (!fs.existsSync(dir)) {
    log(`Creating directory: ${dir}`, 'info');
    fs.mkdirSync(dir, { recursive: true });
  }
}

function validateEnvironment() {
  log('Validating environment...', 'info');
  
  // Check Node.js version
  const nodeVersion = process.version;
  log(`Node.js version: ${nodeVersion}`, 'info');
  
  const versionNum = nodeVersion.slice(1).split('.').map(Number);
  if (versionNum[0] < 14) {
    log('Node.js version 14 or higher is required', 'error');
    process.exit(1);
  }
  
  // Check required directories
  config.requiredDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      log(`Creating required directory: ${dir}`, 'info');
      fs.mkdirSync(dir, { recursive: true });
    }
  });
  
  // Check required files
  const missingFiles = config.requiredFiles.filter(file => !fs.existsSync(file));
  if (missingFiles.length > 0) {
    log(`Missing required files: ${missingFiles.join(', ')}`, 'error');
    process.exit(1);
  }
  
  log('Environment validation completed', 'success');
}

function installDependencies() {
  log('Installing dependencies...', 'info');
  try {
    execSync('npm install', { stdio: 'inherit' });
    log('Dependencies installed successfully', 'success');
  } catch (error) {
    log(`Failed to install dependencies: ${error.message}`, 'error');
    process.exit(1);
  }
}

function cleanBuildDirectory() {
  log(`Cleaning build directory: ${config.buildDir}`, 'info');
  if (fs.existsSync(config.buildDir)) {
    fs.rmSync(config.buildDir, { recursive: true, force: true });
  }
  ensureDirectoryExists(config.buildDir);
  log('Build directory cleaned', 'success');
}

function copyFiles() {
  log('Copying files to build directory...', 'info');
  
  config.filesToCopy.forEach(file => {
    if (fs.existsSync(file)) {
      const destPath = path.join(config.buildDir, file);
      const destDir = path.dirname(destPath);
      
      // Ensure destination directory exists
      ensureDirectoryExists(destDir);
      
      // Copy the file
      fs.copyFileSync(file, destPath);
      log(`Copied: ${file}`, 'info');
    } else {
      log(`Warning: File not found: ${file}`, 'warning');
    }
  });
  
  log('Files copied successfully', 'success');
}

function createBuildArtifacts() {
  log('Creating build artifacts...', 'info');
  
  // Create a build info file
  const buildInfo = {
    version: require('./package.json').version,
    buildDate: new Date().toISOString(),
    nodeVersion: process.version
  };
  
  fs.writeFileSync(
    path.join(config.buildDir, 'build-info.json'),
    JSON.stringify(buildInfo, null, 2)
  );
  
  log('Build artifacts created', 'success');
}

// Main build process
function build() {
  const startTime = Date.now();
  log('Starting build process...', 'info');
  
  try {
    validateEnvironment();
    installDependencies();
    cleanBuildDirectory();
    copyFiles();
    createBuildArtifacts();
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    log(`Build completed successfully in ${duration}s`, 'success');
  } catch (error) {
    log(`Build failed: ${error.message}`, 'error');
    process.exit(1);
  }
}

// Run the build
build();
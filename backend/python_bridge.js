/**
 * Python Bridge Module
 * This module provides a bridge between Node.js and Python for content filtering
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const winston = require('winston');

// Configure logging
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `${timestamp} - ${level}: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console()
  ]
});

class PythonBridge {
  constructor() {
    // Try multiple possible locations for Google Cloud credentials
    const possibleCredentialPaths = [
      path.join(__dirname, 'my-project-92814-457204-c90e6bf83130.json'),
      path.join(__dirname, 'google_credentials.json'),
      process.env.GOOGLE_APPLICATION_CREDENTIALS // Check if already set in environment
    ].filter(Boolean); // Remove undefined entries
    
    // Find the first valid credentials file
    this.credentialsPath = possibleCredentialPaths.find(p => p && fs.existsSync(p));
    
    if (this.credentialsPath) {
      logger.info(`Google Cloud credentials found at ${this.credentialsPath}`);
      // Set the environment variable for Google Cloud
      process.env.GOOGLE_APPLICATION_CREDENTIALS = this.credentialsPath;
    } else {
      logger.warn('Google Cloud credentials not found in any of the expected locations');
      
      // Check if credentials are provided as environment variables (for deployment)
      if (process.env.GOOGLE_CLOUD_CREDENTIALS_JSON) {
        logger.info('Using Google Cloud credentials from environment variable');
        
        // Write the credentials to a temporary file
        this.credentialsPath = path.join(os.tmpdir(), `google_credentials_${Date.now()}.json`);
        fs.writeFileSync(this.credentialsPath, process.env.GOOGLE_CLOUD_CREDENTIALS_JSON);
        
        // Set the environment variable for Google Cloud
        process.env.GOOGLE_APPLICATION_CREDENTIALS = this.credentialsPath;
        
        // Register cleanup on process exit
        process.on('exit', () => {
          try {
            if (fs.existsSync(this.credentialsPath)) {
              fs.unlinkSync(this.credentialsPath);
            }
          } catch (error) {
            logger.error(`Error cleaning up temporary credentials file: ${error.message}`);
          }
        });
      } else {
        logger.error('No Google Cloud credentials found. Vision API features will not work.');
      }
    }
    
    // Determine Python executable based on platform
    this.pythonCommand = os.platform() === 'win32' ? 'python' : 'python3';
    
    // Check if Python is installed
    this._checkPythonInstallation();
  }
  
  /**
   * Check if Python is installed
   * @private
   */
  async _checkPythonInstallation() {
    try {
      const pythonVersion = spawn(this.pythonCommand, ['--version']);
      
      return new Promise((resolve) => {
        pythonVersion.on('close', (code) => {
          if (code === 0) {
            logger.info('Python is installed');
            resolve(true);
          } else {
            logger.error('Python is not installed or not in PATH');
            resolve(false);
          }
        });
      });
    } catch (error) {
      logger.error(`Error checking Python installation: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Run a Python script with arguments and return the result
   * @param {string} scriptPath - Path to the Python script
   * @param {Array} args - Arguments to pass to the script
   * @returns {Promise<object>} - Result of the script execution
   * @private
   */
  async _runPythonScript(scriptPath, args = []) {
    return new Promise((resolve, reject) => {
      // Set environment variables for the Python process
      const env = {
        ...process.env,
        GOOGLE_APPLICATION_CREDENTIALS: this.credentialsPath,
        PYTHONIOENCODING: 'utf-8'
      };
      
      // Spawn the Python process
      const pythonProcess = spawn(this.pythonCommand, [scriptPath, ...args], {
        env,
        cwd: __dirname
      });
      
      let stdout = '';
      let stderr = '';
      
      // Collect stdout data
      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      // Collect stderr data
      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      // Handle process completion
      pythonProcess.on('close', (code) => {
        if (code === 0) {
          try {
            // Try to parse the output as JSON
            const result = JSON.parse(stdout);
            resolve(result);
          } catch (error) {
            logger.error(`Error parsing Python script output: ${error.message}`);
            resolve({ error: 'Error parsing Python script output', stdout, stderr });
          }
        } else {
          logger.error(`Python script exited with code ${code}: ${stderr}`);
          reject(new Error(`Python script exited with code ${code}: ${stderr}`));
        }
      });
      
      // Handle process error
      pythonProcess.on('error', (error) => {
        logger.error(`Error running Python script: ${error.message}`);
        reject(error);
      });
    });
  }
  
  /**
   * Filter text content for inappropriate content using Python
   * @param {string} text - The text to filter
   * @returns {Promise<object>} - Result of the filtering operation
   */
  async filterText(text) {
    try {
      // Create a temporary file with the text
      const tempFilePath = path.join(os.tmpdir(), `text_${Date.now()}.txt`);
      fs.writeFileSync(tempFilePath, text);
      
      // Run the Python script
      const result = await this._runPythonScript(
        path.join(__dirname, 'python_text_filter.py'),
        [tempFilePath]
      );
      
      // Clean up the temporary file
      fs.unlinkSync(tempFilePath);
      
      return result;
    } catch (error) {
      logger.error(`Error filtering text with Python: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Filter image content for inappropriate content using Python
   * @param {string} imageUrl - URL of the image to filter
   * @returns {Promise<object>} - Result of the filtering operation
   */
  async filterImage(imageUrl) {
    try {
      // Run the Python script
      const result = await this._runPythonScript(
        path.join(__dirname, 'python_image_filter.py'),
        [imageUrl]
      );
      
      return result;
    } catch (error) {
      logger.error(`Error filtering image with Python: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Decrypt previously encrypted content
   * @param {string} encrypted - Encrypted content as a base64 string
   * @returns {Promise<string>} - Decrypted content
   */
  async decryptContent(encrypted) {
    try {
      // Create a temporary file with the encrypted content
      const tempFilePath = path.join(os.tmpdir(), `encrypted_${Date.now()}.txt`);
      fs.writeFileSync(tempFilePath, encrypted);
      
      // Run the Python script
      const result = await this._runPythonScript(
        path.join(__dirname, 'python_decrypt.py'),
        [tempFilePath]
      );
      
      // Clean up the temporary file
      fs.unlinkSync(tempFilePath);
      
      return result.decrypted || '';
    } catch (error) {
      logger.error(`Error decrypting content with Python: ${error.message}`);
      throw error;
    }
  }
}

module.exports = PythonBridge;
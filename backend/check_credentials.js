/**
 * Simple script to check if Google Cloud credentials file exists and is valid
 * 
 * This script checks:
 * 1. If the GOOGLE_APPLICATION_CREDENTIALS environment variable is set
 * 2. If the credentials file exists
 * 3. If the credentials file is valid JSON
 * 4. Basic information about the credentials
 * 
 * Usage:
 * node check_credentials.js
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

console.log('=== GOOGLE CLOUD CREDENTIALS CHECK ===');

// Check if environment variable is set
const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!credentialsPath) {
  console.error('❌ ERROR: GOOGLE_APPLICATION_CREDENTIALS environment variable is not set');
  console.log('Please set this variable in your .env file or environment');
  process.exit(1);
}

console.log(`📄 Credentials path: ${credentialsPath}`);

// Check if file exists
try {
  if (!fs.existsSync(credentialsPath)) {
    console.error(`❌ ERROR: Credentials file not found at ${credentialsPath}`);
    process.exit(1);
  }
  console.log('✅ Credentials file exists');
  
  // Check if file is readable
  try {
    const stats = fs.statSync(credentialsPath);
    console.log(`📊 File size: ${stats.size} bytes`);
    console.log(`📅 Last modified: ${stats.mtime}`);
    
    // Check file permissions
    const permissions = stats.mode.toString(8).slice(-3);
    console.log(`🔒 File permissions: ${permissions}`);
    
    if (!(stats.mode & fs.constants.R_OK)) {
      console.warn('⚠️ WARNING: File may not be readable by the current user');
    }
  } catch (err) {
    console.error(`❌ ERROR: Cannot read file stats: ${err.message}`);
  }
  
  // Check if file is valid JSON
  try {
    const content = fs.readFileSync(credentialsPath, 'utf8');
    const credentials = JSON.parse(content);
    console.log('✅ Credentials file is valid JSON');
    
    // Display basic information
    console.log('\n=== CREDENTIALS INFORMATION ===');
    console.log(`🆔 Project ID: ${credentials.project_id || 'Not found'}`);
    console.log(`📧 Client Email: ${credentials.client_email || 'Not found'}`);
    console.log(`🔑 Private Key ID: ${credentials.private_key_id ? credentials.private_key_id.substring(0, 8) + '...' : 'Not found'}`);
    console.log(`🌐 Token URI: ${credentials.token_uri || 'Not found'}`);
    
    // Check for required fields
    const requiredFields = ['type', 'project_id', 'private_key_id', 'private_key', 'client_email', 'client_id', 'auth_uri', 'token_uri'];
    const missingFields = requiredFields.filter(field => !credentials[field]);
    
    if (missingFields.length > 0) {
      console.warn(`⚠️ WARNING: The following required fields are missing: ${missingFields.join(', ')}`);
    } else {
      console.log('✅ All required fields are present');
    }
    
    // Check if it's a service account
    if (credentials.type === 'service_account') {
      console.log('✅ This is a service account key file');
    } else {
      console.warn(`⚠️ WARNING: This is not a service account key file (type: ${credentials.type || 'unknown'})`);
    }
    
    // Check private key format
    if (credentials.private_key && credentials.private_key.includes('-----BEGIN PRIVATE KEY-----')) {
      console.log('✅ Private key appears to be in the correct format');
    } else {
      console.warn('⚠️ WARNING: Private key may not be in the correct format');
    }
    
  } catch (err) {
    console.error(`❌ ERROR: File is not valid JSON: ${err.message}`);
    process.exit(1);
  }
  
} catch (err) {
  console.error(`❌ ERROR: ${err.message}`);
  process.exit(1);
}

console.log('\n✅ CREDENTIALS CHECK COMPLETED SUCCESSFULLY');
console.log('Your credentials file appears to be valid. You can now run the full API connection test:');
console.log('node test_vision_connection.js');
/**
 * Encode Google Cloud credentials to Base64
 * Run this script to convert your credentials file to a Base64 string
 * that you can use as an environment variable in Render
 */

const fs = require('fs');
const path = require('path');

// Path to your credentials file
const credentialsPath = path.join(__dirname, 'my-project-92814-457204-c90e6bf83130.json');

// Check if the file exists
if (!fs.existsSync(credentialsPath)) {
  console.error(`Credentials file not found at: ${credentialsPath}`);
  process.exit(1);
}

// Read the file
const credentialsJson = fs.readFileSync(credentialsPath, 'utf8');

// Convert to Base64
const credentialsBase64 = Buffer.from(credentialsJson).toString('base64');

console.log('=== GOOGLE_CLOUD_CREDENTIALS_BASE64 ===');
console.log(credentialsBase64);
console.log('\nCopy the above string and add it as an environment variable in Render:');
console.log('GOOGLE_CLOUD_CREDENTIALS_BASE64=<the-base64-string>');
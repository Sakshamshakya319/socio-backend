/**
 * Encode Google Cloud credentials for Render deployment
 * 
 * This script reads your Google Cloud credentials file and encodes it to Base64,
 * which can be used as an environment variable in Render.
 * 
 * Usage:
 * node encode_credentials_new.js
 */

require('dotenv').config();
const fs = require('fs');

// Get credentials path from environment variable or use default
const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || './my-project-92814-457204-04288ea99d5d.json';

console.log(`Reading credentials from: ${credentialsPath}`);

try {
  // Check if file exists
  if (!fs.existsSync(credentialsPath)) {
    console.error(`Error: Credentials file not found at ${credentialsPath}`);
    process.exit(1);
  }

  // Read the credentials file
  const credentials = fs.readFileSync(credentialsPath, 'utf8');
  
  // Validate JSON
  try {
    JSON.parse(credentials);
    console.log("Credentials file is valid JSON");
  } catch (err) {
    console.error(`Error: Credentials file is not valid JSON: ${err.message}`);
    process.exit(1);
  }

  // Convert to Base64
  const base64Credentials = Buffer.from(credentials).toString('base64');

  // Output the Base64 string
  console.log('\n===== YOUR BASE64 ENCODED CREDENTIALS =====');
  console.log(base64Credentials);
  console.log('\n===== INSTRUCTIONS FOR RENDER DEPLOYMENT =====');
  console.log('1. Copy the Base64 string above');
  console.log('2. In your Render dashboard, go to your web service');
  console.log('3. Navigate to the "Environment" tab');
  console.log('4. Add a new Secret File with:');
  console.log('   - Path: /etc/secrets/google-credentials/google-credentials.json');
  console.log('   - Content: Paste the entire content of your original JSON credentials file');
  console.log('5. Add this environment variable:');
  console.log('   - GOOGLE_APPLICATION_CREDENTIALS=/etc/secrets/google-credentials/google-credentials.json');
  console.log('\nAlternatively, you can use the Base64 method:');
  console.log('1. Add this environment variable:');
  console.log('   - GOOGLE_CLOUD_CREDENTIALS_BASE64=[paste-the-base64-string-here]');
  console.log('2. Add this to your server startup code to decode the credentials:');
  console.log(`
// Decode and save credentials from Base64 environment variable
if (process.env.GOOGLE_CLOUD_CREDENTIALS_BASE64) {
  const fs = require('fs');
  const path = require('path');
  const credentialsDir = path.join(__dirname, 'credentials');
  const credentialsPath = path.join(credentialsDir, 'google-credentials.json');
  
  // Create credentials directory if it doesn't exist
  if (!fs.existsSync(credentialsDir)) {
    fs.mkdirSync(credentialsDir, { recursive: true });
  }
  
  // Decode and save credentials
  const decodedCredentials = Buffer.from(
    process.env.GOOGLE_CLOUD_CREDENTIALS_BASE64, 
    'base64'
  ).toString('utf8');
  
  fs.writeFileSync(credentialsPath, decodedCredentials);
  
  // Set environment variable to point to the saved file
  process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsPath;
  console.log(\`Credentials decoded and saved to \${credentialsPath}\`);
}
`);

} catch (err) {
  console.error(`Error: ${err.message}`);
  process.exit(1);
}
/**
 * Dependency Check Script
 * 
 * This script checks if all dependencies can be loaded correctly.
 * Run this before deploying to Render to ensure all packages are compatible.
 */

console.log('Checking dependencies...');

try {
  // Check core dependencies
  console.log('Loading express...');
  const express = require('express');
  console.log('✅ Express loaded successfully');
  
  console.log('Loading dotenv...');
  require('dotenv').config();
  console.log('✅ Dotenv loaded successfully');
  
  console.log('Loading body-parser...');
  const bodyParser = require('body-parser');
  console.log('✅ Body-parser loaded successfully');
  
  console.log('Loading cors...');
  const cors = require('cors');
  console.log('✅ CORS loaded successfully');
  
  // Check Google Cloud dependencies
  console.log('\nChecking Google Cloud dependencies...');
  
  try {
    console.log('Loading @google-cloud/vision...');
    const vision = require('@google-cloud/vision');
    console.log('✅ Vision API loaded successfully');
  } catch (err) {
    console.error('❌ Error loading Vision API:', err.message);
  }
  
  try {
    console.log('Loading @google-cloud/vertexai...');
    const vertexai = require('@google-cloud/vertexai');
    console.log('✅ Vertex AI loaded successfully');
  } catch (err) {
    console.error('❌ Error loading Vertex AI:', err.message);
  }
  
  try {
    console.log('Loading @google-cloud/aiplatform...');
    const aiplatform = require('@google-cloud/aiplatform');
    console.log('✅ AI Platform loaded successfully');
  } catch (err) {
    console.error('❌ Error loading AI Platform:', err.message);
  }
  
  // Check other dependencies
  console.log('\nChecking other dependencies...');
  
  try {
    console.log('Loading node-fetch...');
    const fetch = require('node-fetch');
    console.log('✅ Node-fetch loaded successfully');
  } catch (err) {
    console.error('❌ Error loading node-fetch:', err.message);
  }
  
  try {
    console.log('Loading canvas...');
    const canvas = require('canvas');
    console.log('✅ Canvas loaded successfully');
  } catch (err) {
    console.error('❌ Error loading canvas:', err.message);
  }
  
  // Check environment variables
  console.log('\nChecking environment variables...');
  
  const requiredEnvVars = [
    'GOOGLE_CLOUD_PROJECT',
    'GOOGLE_APPLICATION_CREDENTIALS',
    'VERTEX_AI_LOCATION',
    'VERTEX_AI_MODEL'
  ];
  
  let allEnvVarsPresent = true;
  
  for (const envVar of requiredEnvVars) {
    if (process.env[envVar]) {
      console.log(`✅ ${envVar} is set to: ${envVar === 'GOOGLE_APPLICATION_CREDENTIALS' ? '[CREDENTIALS FILE]' : process.env[envVar]}`);
    } else {
      console.error(`❌ ${envVar} is not set`);
      allEnvVarsPresent = false;
    }
  }
  
  // Check credentials file
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    const fs = require('fs');
    const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    
    try {
      if (fs.existsSync(credentialsPath)) {
        console.log(`✅ Credentials file exists at: ${credentialsPath}`);
        
        try {
          const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
          console.log('✅ Credentials file is valid JSON');
          console.log(`   Project ID: ${credentials.project_id}`);
          console.log(`   Client Email: ${credentials.client_email}`);
        } catch (err) {
          console.error('❌ Credentials file is not valid JSON:', err.message);
        }
      } else {
        console.error(`❌ Credentials file not found at: ${credentialsPath}`);
      }
    } catch (err) {
      console.error('❌ Error checking credentials file:', err.message);
    }
  }
  
  // Summary
  console.log('\n=== DEPENDENCY CHECK SUMMARY ===');
  if (allEnvVarsPresent) {
    console.log('✅ All required environment variables are set');
  } else {
    console.error('❌ Some environment variables are missing');
  }
  
  console.log('\nIf all checks passed, your backend should be ready for deployment to Render.');
  console.log('If any checks failed, fix the issues before deploying.');
  
} catch (err) {
  console.error('Error during dependency check:', err);
}
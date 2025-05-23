/**
 * Test script to verify Google Cloud Vision API connection
 * 
 * This script tests if your Google Cloud Vision API credentials are working correctly.
 * It attempts to connect to the Vision API and perform a simple image analysis.
 * 
 * Usage:
 * node test_vision_connection.js
 */

require('dotenv').config();
const { ImageAnnotatorClient } = require('@google-cloud/vision');
const fs = require('fs');
const path = require('path');

// Set up simple logging
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = type === 'error' ? '❌ ERROR' : type === 'success' ? '✅ SUCCESS' : 'ℹ️ INFO';
  console.log(`[${timestamp}] ${prefix}: ${message}`);
}

async function testVisionConnection() {
  log('Starting Google Cloud Vision API connection test');
  
  // Check if credentials file exists
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  
  if (!credentialsPath) {
    log('GOOGLE_APPLICATION_CREDENTIALS environment variable is not set', 'error');
    log('Please set this variable to the path of your Google Cloud credentials JSON file');
    return false;
  }
  
  log(`Looking for credentials at: ${credentialsPath}`);
  
  try {
    // Check if the file exists
    if (!fs.existsSync(credentialsPath)) {
      log(`Credentials file not found at ${credentialsPath}`, 'error');
      return false;
    }
    
    // Try to read and parse the file to validate it's proper JSON
    try {
      const credentialsContent = fs.readFileSync(credentialsPath, 'utf8');
      const credentials = JSON.parse(credentialsContent);
      log('Credentials file found and valid JSON format confirmed');
      
      // Log some basic info about the credentials (without sensitive details)
      log(`Project ID: ${credentials.project_id}`);
      log(`Client Email: ${credentials.client_email}`);
    } catch (e) {
      log(`Credentials file exists but is not valid JSON: ${e.message}`, 'error');
      return false;
    }
    
    // Initialize the Vision client
    log('Initializing Vision API client...');
    const client = new ImageAnnotatorClient({
      keyFilename: credentialsPath,
      projectId: process.env.GOOGLE_CLOUD_PROJECT
    });
    
    log('Vision API client initialized successfully');
    
    // Test with a sample image URL
    const imageUrl = 'https://cloud.google.com/vision/docs/images/bicycle_example.png';
    log(`Testing Vision API with sample image: ${imageUrl}`);
    
    // Perform a simple label detection
    const [result] = await client.labelDetection(imageUrl);
    const labels = result.labelAnnotations;
    
    if (labels && labels.length > 0) {
      log('Vision API connection successful!', 'success');
      log('Labels detected in the sample image:');
      labels.forEach(label => {
        console.log(`- ${label.description} (${Math.round(label.score * 100)}% confidence)`);
      });
      return true;
    } else {
      log('Vision API returned empty results. This might indicate an issue.', 'error');
      return false;
    }
    
  } catch (error) {
    log(`Error testing Vision API connection: ${error.message}`, 'error');
    
    // Provide more detailed error information
    if (error.message.includes('permission')) {
      log('This appears to be a permissions issue. Make sure your service account has the Vision API enabled and proper roles assigned.', 'error');
    } else if (error.message.includes('quota')) {
      log('You may have exceeded your quota. Check your Google Cloud Console for quota information.', 'error');
    } else if (error.message.includes('billing')) {
      log('This may be a billing issue. Ensure billing is enabled for your Google Cloud project.', 'error');
    }
    
    return false;
  }
}

// Test Vertex AI connection
async function testVertexAiConnection() {
  log('Starting Google Vertex AI connection test');
  
  try {
    const { VertexAI } = require('@google-cloud/vertexai');
    
    // Check if credentials file exists
    const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    
    if (!credentialsPath) {
      log('GOOGLE_APPLICATION_CREDENTIALS environment variable is not set', 'error');
      log('Please set this variable to the path of your Google Cloud credentials JSON file');
      return false;
    }
    
    // Get project ID and location from environment variables
    const projectId = process.env.GOOGLE_CLOUD_PROJECT;
    const location = process.env.VERTEX_AI_LOCATION || 'us-central1';
    const modelName = process.env.VERTEX_AI_MODEL || 'gemini-1.5-flash-001';
    
    if (!projectId) {
      log('GOOGLE_CLOUD_PROJECT environment variable is not set', 'error');
      return false;
    }
    
    log(`Initializing Vertex AI with project: ${projectId}, location: ${location}, model: ${modelName}`);
    
    // Initialize Vertex AI
    const vertexAi = new VertexAI({
      project: projectId,
      location: location,
      apiEndpoint: `${location}-aiplatform.googleapis.com`
    });
    
    log('Vertex AI instance created successfully');
    
    // Get the generative model
    const generativeModel = vertexAi.getGenerativeModel({
      model: modelName,
      generationConfig: {
        temperature: 0.1,
        topK: 40,
        topP: 0.8,
        maxOutputTokens: 1024,
      }
    });
    
    log(`Generative model created for ${modelName}`);
    
    // Test with a simple prompt
    const prompt = "Analyze this text for any harmful content: 'Hello, this is a test message.'";
    log(`Testing Vertex AI with prompt: "${prompt}"`);
    
    // Generate content
    const request = {
      contents: [{ role: "user", parts: [{ text: prompt }] }]
    };
    
    log('Sending request to Gemini model...');
    const response = await generativeModel.generateContent(request);
    
    if (response && response.response) {
      log('Vertex AI connection successful!', 'success');
      const responseText = response.response.candidates[0].content.parts[0].text;
      log('Response from Vertex AI:');
      console.log(responseText.substring(0, 200) + (responseText.length > 200 ? '...' : ''));
      return true;
    } else {
      log('Vertex AI returned empty results. This might indicate an issue.', 'error');
      return false;
    }
    
  } catch (error) {
    log(`Error testing Vertex AI connection: ${error.message}`, 'error');
    
    // Provide more detailed error information
    if (error.message.includes('permission')) {
      log('This appears to be a permissions issue. Make sure your service account has the Vertex AI API enabled and proper roles assigned.', 'error');
    } else if (error.message.includes('quota')) {
      log('You may have exceeded your quota. Check your Google Cloud Console for quota information.', 'error');
    } else if (error.message.includes('billing')) {
      log('This may be a billing issue. Ensure billing is enabled for your Google Cloud project.', 'error');
    }
    
    return false;
  }
}

// Run both tests
async function runTests() {
  log('=== GOOGLE CLOUD API CONNECTION TESTS ===');
  log(`Using credentials: ${process.env.GOOGLE_APPLICATION_CREDENTIALS}`);
  log(`Project ID: ${process.env.GOOGLE_CLOUD_PROJECT}`);
  
  // Test Vision API
  log('\n--- VISION API TEST ---');
  const visionResult = await testVisionConnection();
  
  // Test Vertex AI
  log('\n--- VERTEX AI TEST ---');
  const vertexResult = await testVertexAiConnection();
  
  // Summary
  log('\n=== TEST SUMMARY ===');
  log(`Vision API: ${visionResult ? 'PASSED ✅' : 'FAILED ❌'}`);
  log(`Vertex AI: ${vertexResult ? 'PASSED ✅' : 'FAILED ❌'}`);
  
  if (visionResult && vertexResult) {
    log('All tests passed! Your Google Cloud credentials are working correctly.', 'success');
    log('You can proceed with deploying your application to Render.');
  } else {
    log('Some tests failed. Please check the error messages above and fix the issues before deploying.', 'error');
  }
}

// Run the tests
runTests().catch(error => {
  log(`Unexpected error during tests: ${error.message}`, 'error');
  process.exit(1);
});
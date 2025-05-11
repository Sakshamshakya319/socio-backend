/**
 * Test script for Socio.io backend
 * 
 * This script tests the basic functionality of the backend API
 * Run with: node test.js
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

// Configuration
const config = {
  baseUrl: process.env.API_URL || 'http://localhost:5000',
  endpoints: {
    ping: '/ping',
    filterText: '/filter/text',
    filterImage: '/filter/image',
    status: '/status'
  },
  testData: {
    text: {
      clean: 'This is a clean test message.',
      inappropriate: 'This message contains hate and violence and explicit content.'
    },
    image: {
      clean: 'https://example.com/clean-image.jpg',
      inappropriate: 'https://example.com/nsfw-image.jpg'
    }
  }
};

// Utility functions
function log(message, type = 'info') {
  const colors = {
    info: '\x1b[36m%s\x1b[0m',    // Cyan
    success: '\x1b[32m%s\x1b[0m',  // Green
    warning: '\x1b[33m%s\x1b[0m',  // Yellow
    error: '\x1b[31m%s\x1b[0m',    // Red
    result: '\x1b[90m%s\x1b[0m'    // Gray
  };
  
  console.log(colors[type], `[${type.toUpperCase()}] ${message}`);
}

function makeRequest(method, endpoint, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, config.baseUrl);
    const options = {
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    // Choose http or https based on URL
    const client = url.protocol === 'https:' ? https : http;
    
    const req = client.request(url, options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          resolve({ statusCode: res.statusCode, data: parsedData });
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Test functions
async function testPing() {
  log('Testing ping endpoint...', 'info');
  
  try {
    const response = await makeRequest('GET', config.endpoints.ping);
    
    if (response.statusCode === 200 && response.data.status === 'ok') {
      log('Ping test passed', 'success');
      log(`Response: ${JSON.stringify(response.data)}`, 'result');
      return true;
    } else {
      log(`Ping test failed: Unexpected response: ${JSON.stringify(response.data)}`, 'error');
      return false;
    }
  } catch (error) {
    log(`Ping test failed: ${error.message}`, 'error');
    return false;
  }
}

async function testFilterText() {
  log('Testing text filter endpoint...', 'info');
  
  try {
    // Test with clean text
    log('Testing with clean text...', 'info');
    const cleanResponse = await makeRequest('POST', config.endpoints.filterText, {
      text: config.testData.text.clean
    });
    
    if (cleanResponse.statusCode !== 200) {
      log(`Text filter test failed: Unexpected status code: ${cleanResponse.statusCode}`, 'error');
      return false;
    }
    
    log(`Clean text response: ${JSON.stringify(cleanResponse.data)}`, 'result');
    
    // Test with inappropriate text
    log('Testing with inappropriate text...', 'info');
    const inappropriateResponse = await makeRequest('POST', config.endpoints.filterText, {
      text: config.testData.text.inappropriate
    });
    
    if (inappropriateResponse.statusCode !== 200) {
      log(`Text filter test failed: Unexpected status code: ${inappropriateResponse.statusCode}`, 'error');
      return false;
    }
    
    log(`Inappropriate text response: ${JSON.stringify(inappropriateResponse.data)}`, 'result');
    
    log('Text filter test passed', 'success');
    return true;
  } catch (error) {
    log(`Text filter test failed: ${error.message}`, 'error');
    return false;
  }
}

async function testFilterImage() {
  log('Testing image filter endpoint...', 'info');
  
  try {
    // Test with clean image
    log('Testing with clean image URL...', 'info');
    const cleanResponse = await makeRequest('POST', config.endpoints.filterImage, {
      url: config.testData.image.clean
    });
    
    if (cleanResponse.statusCode !== 200) {
      log(`Image filter test failed: Unexpected status code: ${cleanResponse.statusCode}`, 'error');
      return false;
    }
    
    log(`Clean image response: ${JSON.stringify(cleanResponse.data)}`, 'result');
    
    // Test with inappropriate image
    log('Testing with inappropriate image URL...', 'info');
    const inappropriateResponse = await makeRequest('POST', config.endpoints.filterImage, {
      url: config.testData.image.inappropriate
    });
    
    if (inappropriateResponse.statusCode !== 200) {
      log(`Image filter test failed: Unexpected status code: ${inappropriateResponse.statusCode}`, 'error');
      return false;
    }
    
    log(`Inappropriate image response: ${JSON.stringify(inappropriateResponse.data)}`, 'result');
    
    log('Image filter test passed', 'success');
    return true;
  } catch (error) {
    log(`Image filter test failed: ${error.message}`, 'error');
    return false;
  }
}

async function testStatus() {
  log('Testing status endpoint...', 'info');
  
  try {
    const response = await makeRequest('GET', config.endpoints.status);
    
    if (response.statusCode === 200 && response.data.status === 'running') {
      log('Status test passed', 'success');
      log(`Response: ${JSON.stringify(response.data)}`, 'result');
      return true;
    } else {
      log(`Status test failed: Unexpected response: ${JSON.stringify(response.data)}`, 'error');
      return false;
    }
  } catch (error) {
    log(`Status test failed: ${error.message}`, 'error');
    return false;
  }
}

// Main test function
async function runTests() {
  log('Starting API tests...', 'info');
  log(`Testing API at: ${config.baseUrl}`, 'info');
  
  const results = {
    ping: await testPing(),
    filterText: await testFilterText(),
    filterImage: await testFilterImage(),
    status: await testStatus()
  };
  
  // Print summary
  log('\nTest Summary:', 'info');
  for (const [test, passed] of Object.entries(results)) {
    log(`${test}: ${passed ? 'PASSED' : 'FAILED'}`, passed ? 'success' : 'error');
  }
  
  const allPassed = Object.values(results).every(result => result);
  if (allPassed) {
    log('\nAll tests passed!', 'success');
  } else {
    log('\nSome tests failed.', 'error');
  }
}

// Run the tests
runTests().catch(error => {
  log(`Test execution failed: ${error.message}`, 'error');
});
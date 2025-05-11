/**
 * Simplified Socio.io Content Moderation Backend Server
 * This Express server provides basic content moderation APIs for the Socio.io browser extension.
 */

const express = require('express');
const cors = require('cors');

// Initialize Express app
const app = express();
app.use(express.json());
app.use(cors({
  origin: '*', // Allow all origins for testing
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Simple endpoint to check if the server is running
app.get('/ping', (req, res) => {
  console.log('Received ping request');
  res.json({ status: 'ok', message: 'pong' });
});

// Filter text content for inappropriate content
app.post('/filter/text', (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'No text provided' });
    }
    
    console.log(`Filtering text: ${text.substring(0, 50)}...`);
    
    // Simple filtering logic
    const inappropriate = /hate|violence|abuse|explicit|obscene|racist|sexist|discriminat|nsfw|porn|xxx/i.test(text);
    
    if (inappropriate) {
      // Replace inappropriate content with asterisks
      const modifiedText = text.replace(/hate|violence|abuse|explicit|obscene|racist|sexist|discriminat|nsfw|porn|xxx/gi, 
        match => '*'.repeat(match.length));
      
      return res.json({
        filtered: true,
        reason: 'Inappropriate content detected',
        original: text,
        modified: modifiedText,
        encrypted: Buffer.from(text).toString('base64')
      });
    }
    
    return res.json({
      filtered: false,
      reason: 'No inappropriate content detected',
      original: text,
      modified: text
    });
  } catch (error) {
    console.error(`Error filtering text: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
});

// Filter image content for inappropriate content
app.post('/filter/image', (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'No image URL provided' });
    }
    
    console.log(`Filtering image: ${url}`);
    
    // Simple filtering logic based on URL patterns
    const inappropriate = /nsfw|adult|xxx|porn|explicit/i.test(url);
    
    if (inappropriate) {
      return res.json({
        filtered: true,
        reason: 'Potentially inappropriate image',
        original: url,
        modified: 'https://via.placeholder.com/400x300?text=Content+Filtered',
        encrypted: Buffer.from(url).toString('base64')
      });
    }
    
    return res.json({
      filtered: false,
      reason: 'No inappropriate content detected',
      original: url,
      modified: url
    });
  } catch (error) {
    console.error(`Error filtering image: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
});

// Decrypt previously filtered content
app.post('/decrypt', (req, res) => {
  try {
    const { encrypted } = req.body;
    if (!encrypted) {
      return res.status(400).json({ error: 'No encrypted content provided' });
    }
    
    console.log('Decrypting content...');
    
    // Simple base64 decoding
    const decrypted = Buffer.from(encrypted, 'base64').toString('utf-8');
    
    return res.json({ decrypted });
  } catch (error) {
    console.error(`Error decrypting content: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
});

// Get the status of the backend server
app.get('/status', (req, res) => {
  try {
    return res.json({
      status: 'running',
      stats: {
        text_filtered: 0,
        images_filtered: 0,
        total_requests: 0
      },
      version: '1.0.0'
    });
  } catch (error) {
    console.error(`Error getting status: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
});

// Add a root route for the homepage
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Socio.io Backend</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            line-height: 1.6;
          }
          h1 {
            color: #4285f4;
          }
          .endpoint {
            background-color: #f5f5f5;
            padding: 10px;
            margin-bottom: 10px;
            border-radius: 5px;
          }
          .method {
            font-weight: bold;
            color: #0066cc;
          }
        </style>
      </head>
      <body>
        <h1>Socio.io Backend Server</h1>
        <p>This is the backend server for the Socio.io content moderation browser extension.</p>
        
        <h2>Available Endpoints:</h2>
        
        <div class="endpoint">
          <p><span class="method">GET</span> /ping</p>
          <p>Check if the server is running.</p>
        </div>
        
        <div class="endpoint">
          <p><span class="method">POST</span> /filter/text</p>
          <p>Filter text content for inappropriate content.</p>
        </div>
        
        <div class="endpoint">
          <p><span class="method">POST</span> /filter/image</p>
          <p>Filter image content for inappropriate content.</p>
        </div>
        
        <div class="endpoint">
          <p><span class="method">POST</span> /decrypt</p>
          <p>Decrypt previously filtered content.</p>
        </div>
        
        <div class="endpoint">
          <p><span class="method">GET</span> /status</p>
          <p>Get the status of the backend server.</p>
        </div>
        
        <p>Server is running!</p>
      </body>
    </html>
  `);
});

// Start the server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Starting Socio.io backend server on port ${PORT}`);
});
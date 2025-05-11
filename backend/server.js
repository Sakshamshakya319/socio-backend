/**
 * Socio.io Content Moderation Backend Server
 * This Express server provides content moderation APIs for the Socio.io browser extension.
 */

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const winston = require('winston');
const ContentFilter = require('./content_filter');

// Load environment variables
dotenv.config();

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

// Initialize Express app
const app = express();
app.use(express.json());
app.use(cors());

// Initialize content filter
const contentFilter = new ContentFilter();

// Simple endpoint to check if the server is running
app.get('/ping', (req, res) => {
  logger.info('Received ping request');
  res.json({ status: 'ok', message: 'pong' });
});

// Filter text content for inappropriate content
app.post('/filter/text', (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'No text provided' });
    }
    
    logger.info(`Filtering text: ${text.substring(0, 50)}...`);
    
    // Filter the text
    const result = contentFilter.filterText(text);
    
    return res.json(result);
  } catch (error) {
    logger.error(`Error filtering text: ${error.message}`);
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
    
    logger.info(`Filtering image: ${url}`);
    
    // Filter the image
    const result = contentFilter.filterImage(url);
    
    return res.json(result);
  } catch (error) {
    logger.error(`Error filtering image: ${error.message}`);
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
    
    logger.info('Decrypting content...');
    
    // Decrypt the content
    const result = contentFilter.decryptContent(encrypted);
    
    return res.json({ decrypted: result });
  } catch (error) {
    logger.error(`Error decrypting content: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
});

// Get the status of the backend server
app.get('/status', (req, res) => {
  try {
    const stats = contentFilter.getStats();
    return res.json({
      status: 'running',
      stats,
      version: '1.0.0'
    });
  } catch (error) {
    logger.error(`Error getting status: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  logger.info(`Starting Socio.io backend server on port ${PORT}`);
});
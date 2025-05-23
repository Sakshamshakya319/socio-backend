/**
 * Content Filter Module
 * Provides content moderation for text and images
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const dotenv = require('dotenv');
const winston = require('winston');
const { VertexAI } = require('@google-cloud/vertexai');

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

class ContentFilter {
  constructor() {
    // Initialize stats
    this.stats = {
      text_filtered: 0,
      images_filtered: 0,
      total_requests: 0,
      python_available: false,
      google_cloud_available: false,
      vertex_ai_available: false
    };

    // Initialize Vertex AI
    try {
      const projectId = process.env.GOOGLE_CLOUD_PROJECT;
      const location = process.env.VERTEX_AI_LOCATION || 'us-central1';
      const modelName = process.env.VERTEX_AI_MODEL || 'gemini-1.5-flash-001';
      
      if (!projectId) {
        throw new Error('GOOGLE_CLOUD_PROJECT environment variable is not set');
      }
      
      logger.info(`Initializing Vertex AI with project: ${projectId}, location: ${location}, model: ${modelName}`);
      
      this.vertexAi = new VertexAI({
        project: projectId,
        location: location,
      });
      
      this.generativeModel = this.vertexAi.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature: 0.1,
          topK: 40,
          topP: 0.8,
          maxOutputTokens: 1024,
        }
      });
      
      this.stats.vertex_ai_available = true;
      this.stats.google_cloud_available = true;
      logger.info('Vertex AI initialized successfully');
    } catch (error) {
      logger.error(`Error initializing Vertex AI: ${error.message}`);
      this.vertexAi = null;
      this.generativeModel = null;
    }

    // Check if Python bridge is available
    try {
      const pythonBridge = require('./python_bridge');
      this.pythonBridge = pythonBridge;
      this.stats.python_available = true;
      logger.info('Python bridge initialized successfully');
    } catch (error) {
      logger.error(`Error initializing Python bridge: ${error.message}`);
      this.pythonBridge = null;
    }

    logger.info('Content filter initialized');
  }

  /**
   * Filter text content for inappropriate content
   * @param {string} text - The text to filter
   * @returns {Object} - Filtering results
   */
  async filterText(text) {
    try {
      this.stats.total_requests++;
      
      // Use Vertex AI if available
      if (this.generativeModel) {
        try {
          logger.info('Using Vertex AI for text analysis');
          
          const prompt = `
          Analyze the following text and identify if it contains inappropriate content such as:
          - Hate speech
          - Profanity
          - Violence
          - Sexual content
          - Discrimination
          - Personal attacks
          
          Return a JSON object with these fields:
          - "filtered": boolean (true if inappropriate content is detected)
          - "reason": string (explanation of why content was filtered or not)
          - "modified": string (the original text with inappropriate words replaced by asterisks)
          
          Text to analyze: "${text}"
          
          Respond with ONLY the JSON object. No other text.
          `;
          
          const request = {
            contents: [{ role: "user", parts: [{ text: prompt }] }]
          };
          
          const response = await this.generativeModel.generateContent(request);
          const responseText = response.response.candidates[0].content.parts[0].text;
          
          // Try to parse the JSON response
          try {
            // Clean up the response text to ensure it's valid JSON
            const cleanedResponse = responseText.replace(/```json|```/g, '').trim();
            const result = JSON.parse(cleanedResponse);
            
            if (result.filtered) {
              this.stats.text_filtered++;
            }
            
            return {
              filtered: result.filtered,
              reason: result.reason,
              original: text,
              modified: result.modified || text,
              encrypted: this.encryptContent(text),
              analysis: {
                provider: 'vertex_ai',
                model: process.env.VERTEX_AI_MODEL || 'gemini-1.5-flash-001'
              }
            };
          } catch (parseError) {
            logger.error(`Error parsing Vertex AI response: ${parseError.message}`);
            logger.error(`Raw response: ${responseText}`);
            throw new Error('Failed to parse Vertex AI response');
          }
        } catch (vertexError) {
          logger.error(`Vertex AI analysis error: ${vertexError.message}`);
          // Fall back to regex-based filtering
        }
      }
      
      // Simple regex-based filtering as fallback
      logger.warn('Using fallback text filtering (regex-based)');
      
      // Simple regex-based filtering
      const inappropriate = /hate|violence|abuse|explicit|obscene|racist|sexist|discriminat|nsfw|porn|xxx/i.test(text);
      
      if (inappropriate) {
        // Replace inappropriate content with asterisks
        const modifiedText = text.replace(/hate|violence|abuse|explicit|obscene|racist|sexist|discriminat|nsfw|porn|xxx/gi, 
          match => '*'.repeat(match.length));
        
        this.stats.text_filtered++;
        
        return {
          filtered: true,
          reason: 'Inappropriate content detected',
          original: text,
          modified: modifiedText,
          encrypted: this.encryptContent(text)
        };
      }
      
      return {
        filtered: false,
        reason: 'No inappropriate content detected',
        original: text,
        modified: text
      };
    } catch (error) {
      logger.error(`Error filtering text: ${error.message}`);
      
      // Return a safe fallback response
      return {
        filtered: false,
        reason: 'Error during content analysis',
        original: text,
        modified: text,
        error: error.message
      };
    }
  }

  /**
   * Filter image content for inappropriate content
   * @param {string} url - URL of the image to filter
   * @returns {Object} - Filtering results
   */
  async filterImage(url) {
    try {
      this.stats.total_requests++;
      
      // Use Vertex AI if available
      if (this.generativeModel) {
        try {
          logger.info('Using Vertex AI for image URL analysis');
          
          const prompt = `
          Analyze this image URL and determine if it might contain inappropriate content:
          ${url}
          
          Based only on the URL (not the actual image content), check for keywords or patterns that suggest:
          - Adult content
          - Violence
          - Hate speech
          - Explicit material
          
          Return a JSON object with these fields:
          - "filtered": boolean (true if URL suggests inappropriate content)
          - "reason": string (explanation of why URL was flagged or not)
          - "confidence": number (0-1 indicating confidence in the assessment)
          
          Respond with ONLY the JSON object. No other text.
          `;
          
          const request = {
            contents: [{ role: "user", parts: [{ text: prompt }] }]
          };
          
          const response = await this.generativeModel.generateContent(request);
          const responseText = response.response.candidates[0].content.parts[0].text;
          
          // Try to parse the JSON response
          try {
            // Clean up the response text to ensure it's valid JSON
            const cleanedResponse = responseText.replace(/```json|```/g, '').trim();
            const result = JSON.parse(cleanedResponse);
            
            if (result.filtered) {
              this.stats.images_filtered++;
              
              return {
                filtered: true,
                reason: result.reason,
                original: url,
                modified: 'https://via.placeholder.com/400x300?text=Content+Filtered',
                encrypted: this.encryptContent(url),
                analysis: {
                  provider: 'vertex_ai',
                  model: process.env.VERTEX_AI_MODEL || 'gemini-1.5-flash-001',
                  confidence: result.confidence
                }
              };
            }
            
            return {
              filtered: false,
              reason: result.reason,
              original: url,
              modified: url,
              analysis: {
                provider: 'vertex_ai',
                model: process.env.VERTEX_AI_MODEL || 'gemini-1.5-flash-001',
                confidence: result.confidence
              }
            };
          } catch (parseError) {
            logger.error(`Error parsing Vertex AI response: ${parseError.message}`);
            logger.error(`Raw response: ${responseText}`);
            throw new Error('Failed to parse Vertex AI response');
          }
        } catch (vertexError) {
          logger.error(`Vertex AI analysis error: ${vertexError.message}`);
          // Fall back to regex-based filtering
        }
      }
      
      // Simple URL-based filtering as fallback
      logger.warn('Using fallback image filtering (URL-based)');
      
      // Simple URL-based filtering
      const inappropriate = /nsfw|adult|xxx|porn|explicit/i.test(url);
      
      if (inappropriate) {
        this.stats.images_filtered++;
        
        return {
          filtered: true,
          reason: 'Potentially inappropriate image URL',
          original: url,
          modified: 'https://via.placeholder.com/400x300?text=Content+Filtered',
          encrypted: this.encryptContent(url)
        };
      }
      
      return {
        filtered: false,
        reason: 'No inappropriate content detected in URL',
        original: url,
        modified: url
      };
    } catch (error) {
      logger.error(`Error filtering image: ${error.message}`);
      
      // Return a safe fallback response
      return {
        filtered: false,
        reason: 'Error during content analysis',
        original: url,
        modified: url,
        error: error.message
      };
    }
  }

  /**
   * Encrypt content for secure storage
   * @param {string} content - Content to encrypt
   * @returns {string} - Encrypted content (base64)
   */
  encryptContent(content) {
    try {
      // Simple base64 encoding for the minimal version
      return Buffer.from(content).toString('base64');
    } catch (error) {
      logger.error(`Error encrypting content: ${error.message}`);
      return '';
    }
  }

  /**
   * Decrypt previously filtered content
   * @param {string} encrypted - Encrypted content
   * @returns {string} - Decrypted content
   */
  async decryptContent(encrypted) {
    try {
      // Simple base64 decoding for the minimal version
      return Buffer.from(encrypted, 'base64').toString('utf-8');
    } catch (error) {
      logger.error(`Error decrypting content: ${error.message}`);
      throw new Error('Failed to decrypt content');
    }
  }

  /**
   * Get statistics about content filtering
   * @returns {Object} - Statistics
   */
  getStats() {
    return {
      text_filtered: this.stats.text_filtered,
      images_filtered: this.stats.images_filtered,
      total_requests: this.stats.total_requests,
      python_available: this.stats.python_available,
      google_cloud_available: this.stats.google_cloud_available,
      vertex_ai_available: this.stats.vertex_ai_available
    };
  }
}

module.exports = ContentFilter;
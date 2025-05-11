#!/usr/bin/env python3
"""
Socio.io Content Moderation Backend Server
This Flask server provides content moderation APIs for the Socio.io browser extension.
"""

import os
import sys
import json
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
import content_filter

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger('socioio-backend')

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Initialize content filter
content_filter = content_filter.ContentFilter()

@app.route('/ping', methods=['GET'])
def ping():
    """Simple endpoint to check if the server is running."""
    logger.info("Received ping request")
    return jsonify({"status": "ok", "message": "pong"})

@app.route('/filter/text', methods=['POST'])
def filter_text():
    """Filter text content for inappropriate content."""
    try:
        data = request.json
        if not data or 'text' not in data:
            return jsonify({"error": "No text provided"}), 400
        
        text = data['text']
        logger.info(f"Filtering text: {text[:50]}...")
        
        # Filter the text
        result = content_filter.filter_text(text)
        
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error filtering text: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/filter/image', methods=['POST'])
def filter_image():
    """Filter image content for inappropriate content."""
    try:
        data = request.json
        if not data or 'url' not in data:
            return jsonify({"error": "No image URL provided"}), 400
        
        image_url = data['url']
        logger.info(f"Filtering image: {image_url}")
        
        # Filter the image
        result = content_filter.filter_image(image_url)
        
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error filtering image: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/decrypt', methods=['POST'])
def decrypt_content():
    """Decrypt previously filtered content."""
    try:
        data = request.json
        if not data or 'encrypted' not in data:
            return jsonify({"error": "No encrypted content provided"}), 400
        
        encrypted = data['encrypted']
        logger.info("Decrypting content...")
        
        # Decrypt the content
        result = content_filter.decrypt_content(encrypted)
        
        return jsonify({"decrypted": result})
    except Exception as e:
        logger.error(f"Error decrypting content: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/status', methods=['GET'])
def status():
    """Get the status of the backend server."""
    try:
        stats = content_filter.get_stats()
        return jsonify({
            "status": "running",
            "stats": stats,
            "version": "1.0.0"
        })
    except Exception as e:
        logger.error(f"Error getting status: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    logger.info(f"Starting Socio.io backend server on port {port}")
    app.run(host='127.0.0.1', port=port, debug=True)
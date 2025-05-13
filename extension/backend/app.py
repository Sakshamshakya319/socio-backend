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

# Import text analysis functions
try:
    from text_analysis import detect_content, process_text, recover_text
    text_analysis_available = True
    print("Text analysis module loaded successfully")
except ImportError:
    text_analysis_available = False
    print("WARNING: Text analysis module not available. Text analysis endpoints will return errors.")

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

@app.route('/analyze', methods=['POST'])
def analyze_image():
    """Analyze image content using the image_content_filter."""
    try:
        # Check if image file is in the request
        if 'image' not in request.files:
            return jsonify({"success": False, "error": "No image file provided"}), 400
        
        image_file = request.files['image']
        if image_file.filename == '':
            return jsonify({"success": False, "error": "No image file selected"}), 400
        
        # Import the image content filter
        try:
            from image_content_filter import ImageContentFilter
            image_filter = ImageContentFilter()
        except ImportError:
            logger.error("Could not import ImageContentFilter")
            return jsonify({"success": False, "error": "Image analysis module not available"}), 500
        
        # Save the file temporarily
        temp_path = os.path.join(os.path.dirname(__file__), "temp_image.jpg")
        image_file.save(temp_path)
        
        # Analyze the image
        try:
            results = image_filter.analyze_image(image_path=temp_path, show_results=False, export_comparison=False)
            
            # Clean up the temporary file
            if os.path.exists(temp_path):
                os.remove(temp_path)
            
            return jsonify({
                "success": True,
                "results": {
                    "safety_score": results.get("safety_score", {}),
                    "overall_safety": results.get("overall_safety", "unknown"),
                    "suggested_action": results.get("suggested_action", "unknown"),
                    "content_flags": results.get("content_flags", []),
                    "detected_objects": results.get("detected_objects", [])
                }
            })
        except Exception as e:
            logger.error(f"Error analyzing image: {str(e)}")
            # Clean up the temporary file
            if os.path.exists(temp_path):
                os.remove(temp_path)
            return jsonify({"success": False, "error": f"Error analyzing image: {str(e)}"}), 500
    
    except Exception as e:
        logger.error(f"Error in analyze_image endpoint: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

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

@app.route('/analyze', methods=['POST'])
def analyze_text_endpoint():
    """Analyze text content for hate speech, profanity, and sensitive information."""
    try:
        if not text_analysis_available:
            return jsonify({"success": False, "error": "Text analysis module not available"}), 500
            
        data = request.json
        if not data or 'text' not in data:
            return jsonify({"success": False, "error": "No text provided"}), 400
            
        text = data['text']
        logger.info(f"Analyzing text: {text[:50]}...")
        
        # Get project ID and location from environment variables
        project_id = os.environ.get("GOOGLE_CLOUD_PROJECT")
        location = os.environ.get("VERTEX_AI_LOCATION", "us-central1")
        model_name = os.environ.get("VERTEX_AI_MODEL", "gemini-2.0-flash-001")
        
        # Analyze the text
        detection_results = detect_content(text, project_id, location, model_name)
        
        return jsonify({
            "success": True, 
            "results": detection_results
        })
    except Exception as e:
        logger.error(f"Error analyzing text: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/process', methods=['POST'])
def process_text_endpoint():
    """Process text content based on detection results."""
    try:
        if not text_analysis_available:
            return jsonify({"success": False, "error": "Text analysis module not available"}), 500
            
        data = request.json
        if not data or 'text' not in data:
            return jsonify({"success": False, "error": "No text provided"}), 400
            
        text = data['text']
        action = data.get('action', 'keep')  # Default action is 'keep'
        
        if action not in ['keep', 'remove', 'encrypt']:
            return jsonify({"success": False, "error": "Invalid action. Must be 'keep', 'remove', or 'encrypt'"}), 400
            
        logger.info(f"Processing text with action '{action}': {text[:50]}...")
        
        # First analyze the text
        project_id = os.environ.get("GOOGLE_CLOUD_PROJECT")
        location = os.environ.get("VERTEX_AI_LOCATION", "us-central1")
        model_name = os.environ.get("VERTEX_AI_MODEL", "gemini-2.0-flash-001")
        
        detection_results = detect_content(text, project_id, location, model_name)
        
        # Process the text based on detection results
        processed_text, encryption_log = process_text(text, detection_results, action)
        
        return jsonify({
            "success": True,
            "processed_text": processed_text,
            "encryption_log": encryption_log if action == "encrypt" else None
        })
    except Exception as e:
        logger.error(f"Error processing text: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/recover', methods=['POST'])
def recover_text_endpoint():
    """Recover original content from encrypted text and encryption log."""
    try:
        if not text_analysis_available:
            return jsonify({"success": False, "error": "Text analysis module not available"}), 500
            
        data = request.json
        if not data or 'processed_text' not in data or 'encryption_log' not in data:
            return jsonify({"success": False, "error": "Missing required parameters"}), 400
            
        processed_text = data['processed_text']
        encryption_log = data['encryption_log']
        
        logger.info("Recovering text from encrypted content")
        
        # Recover the original text
        recovered_text = recover_text(processed_text, encryption_log)
        
        return jsonify({
            "success": True,
            "recovered_text": recovered_text
        })
    except Exception as e:
        logger.error(f"Error recovering text: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    logger.info(f"Starting Socio.io backend server on port {port}")
    app.run(host='127.0.0.1', port=port, debug=True)
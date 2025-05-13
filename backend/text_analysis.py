from flask import Flask, request, jsonify
import os
from dotenv import load_dotenv

# Import the main text processing functions and utilities from the existing script
from text_processing_module import (
    detect_content,
    process_text,
    save_processing_log,
    recover_encrypted_text,
    load_encryption_log,
)

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)

# =================================================================
# API Endpoints
# =================================================================

@app.route('/analyze', methods=['POST'])
def analyze_content():
    """
    Endpoint to analyze text content for hate speech, profanity, and sensitive information.
    Input:
        - JSON body with "text" field containing the content to analyze.
    Output:
        - JSON response with detection results.
    """
    try:
        data = request.json
        text = data.get("text", "").strip()
        if not text:
            return jsonify({"error": "No text provided for analysis"}), 400
        
        # Analyze content using the detection module
        project_id = os.environ.get("GOOGLE_CLOUD_PROJECT")
        location = os.environ.get("VERTEX_AI_LOCATION", "us-central1")
        model_name = os.environ.get("VERTEX_AI_MODEL", "gemini-2.0-flash-001")
        
        detection_results = detect_content(text, project_id, location, model_name)
        return jsonify({"success": True, "results": detection_results}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/process', methods=['POST'])
def process_content():
    """
    Endpoint to process text content based on detection results.
    Input:
        - JSON body with:
            - "text": The original text to process.
            - "action": The action to take ("keep", "remove", or "encrypt").
    Output:
        - JSON response with processed text and optional encryption log.
    """
    try:
        data = request.json
        text = data.get("text", "").strip()
        action = data.get("action", "keep").lower()
        
        if not text:
            return jsonify({"error": "No text provided for processing"}), 400
        if action not in ["keep", "remove", "encrypt"]:
            return jsonify({"error": f"Invalid action: {action}. Must be 'keep', 'remove', or 'encrypt'"}), 400
        
        # Analyze content first to get detection results
        project_id = os.environ.get("GOOGLE_CLOUD_PROJECT")
        location = os.environ.get("VERTEX_AI_LOCATION", "us-central1")
        model_name = os.environ.get("VERTEX_AI_MODEL", "gemini-2.0-flash-001")
        
        detection_results = detect_content(text, project_id, location, model_name)
        
        # Process text based on the specified action
        processed_text, encryption_log = process_text(text, detection_results, action)
        
        # Save processing log
        log_filename = save_processing_log(text, processed_text, detection_results, encryption_log, action)
        
        response = {
            "success": True,
            "processed_text": processed_text,
            "log_file": log_filename,
            "encryption_log": encryption_log if action == "encrypt" else None
        }
        return jsonify(response), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/recover', methods=['POST'])
def recover_content():
    """
    Endpoint to recover original content from encrypted text and encryption log.
    Input:
        - JSON body with:
            - "processed_text": The processed text containing encrypted placeholders.
            - "encryption_log": The encryption log used to recover the original text.
    Output:
        - JSON response with the recovered text.
    """
    try:
        data = request.json
        processed_text = data.get("processed_text", "").strip()
        encryption_log = data.get("encryption_log", [])
        
        if not processed_text:
            return jsonify({"error": "No processed text provided for recovery"}), 400
        if not encryption_log:
            return jsonify({"error": "No encryption log provided for recovery"}), 400
        
        # Recover the original text
        recovered_text = recover_encrypted_text(processed_text, encryption_log)
        return jsonify({"success": True, "recovered_text": recovered_text}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# =================================================================
# Start Flask Server
# =================================================================

if __name__ == "__main__":
    # Check for environment type and enable debug mode for development
    env = os.environ.get("FLASK_ENV", "development").lower()
    debug_mode = env == "development"
    port = int(os.environ.get("PORT", 5000))  # Default to port 5000 if not specified
    
    print(f"Starting Flask server in {'DEBUG' if debug_mode else 'PRODUCTION'} mode on port {port}")
    app.run(debug=debug_mode, host="0.0.0.0", port=port)
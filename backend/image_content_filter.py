from flask import Flask, request, jsonify
import os
import io
import base64
from dotenv import load_dotenv
from PIL import Image, ImageFilter
import requests
import logging
import json
import datetime
from google.cloud import vision

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Initialize the Flask app
app = Flask(__name__)

class ImageContentFilter:
    def __init__(self):
        """Initialize the content filter with Google Cloud Vision API"""
        self._initialize_google_vision_client()
        self.confidence_thresholds = {
            "adult": 0.7,
            "violence": 0.6,
            "racy": 0.7,
            "medical": 0.8,
            "spoof": 0.8,
        }
        self.blur_settings = {"unsafe": 30, "questionable": 15, "potentially_concerning": 8}
        self.offensive_terms = ["hate", "kill", "attack", "violence", "racist", "nazi"]
        logger.info("Content filter initialized successfully")

    def _initialize_google_vision_client(self):
        """Initialize Google Vision API client"""
        credentials_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
        if credentials_path and os.path.exists(credentials_path):
            self.client = vision.ImageAnnotatorClient.from_service_account_json(credentials_path)
        else:
            try:
                self.client = vision.ImageAnnotatorClient()
            except Exception as e:
                logger.error("Failed to initialize Google Vision client: %s", e)
                raise

    def analyze_image(self, image_path=None, image_url=None, image_data=None):
        """Analyze an image for inappropriate content"""
        try:
            image_content = self._load_image(image_path, image_url, image_data)
            display_image = Image.open(io.BytesIO(image_content))
            features = [
                vision.Feature(type_=vision.Feature.Type.SAFE_SEARCH_DETECTION),
                vision.Feature(type_=vision.Feature.Type.LABEL_DETECTION, max_results=10),
            ]
            request = vision.AnnotateImageRequest(image=vision.Image(content=image_content), features=features)
            response = self.client.annotate_image(request=request)
            if response.error.message:
                raise ValueError(f"Google Vision API error: {response.error.message}")

            results = self._process_response(response, display_image)
            return results
        except Exception as e:
            logger.error("Error analyzing image: %s", e)
            raise

    def _load_image(self, image_path, image_url, image_data):
        """Load image data from a file, URL, or raw data"""
        if image_path:
            with open(image_path, 'rb') as f:
                return f.read()
        elif image_url:
            response = requests.get(image_url, timeout=10)
            response.raise_for_status()
            return response.content
        elif image_data:
            return image_data
        else:
            raise ValueError("No image source provided. Provide either image_path, image_url, or image_data.")

    def _process_response(self, response, display_image):
        """Process the response from Google Vision API"""
        results = {"safe_search": {}, "labels": [], "content_flags": []}
        safe_search = response.safe_search_annotation
        likelihood_scores = {
            vision.Likelihood.UNKNOWN: 0.0,
            vision.Likelihood.VERY_UNLIKELY: 0.1,
            vision.Likelihood.UNLIKELY: 0.3,
            vision.Likelihood.POSSIBLE: 0.5,
            vision.Likelihood.LIKELY: 0.7,
            vision.Likelihood.VERY_LIKELY: 0.9,
        }
        for category in ["adult", "violence", "racy", "medical", "spoof"]:
            score = likelihood_scores[getattr(safe_search, category)]
            results["safe_search"][category] = score
            if score >= self.confidence_thresholds[category]:
                results["content_flags"].append(category)

        for label in response.label_annotations:
            results["labels"].append({"description": label.description, "score": label.score})
            if label.score > 0.7 and any(keyword in label.description.lower() for keyword in self.offensive_terms):
                results["content_flags"].append(f"label:{label.description}")

        results["overall_safety"] = self._determine_safety(results["content_flags"])
        return results

    def _determine_safety(self, content_flags):
        """Determine the overall safety rating"""
        if "adult" in content_flags or "violence" in content_flags:
            return "unsafe"
        elif any(flag.startswith("label:") for flag in content_flags):
            return "questionable"
        elif content_flags:
            return "potentially_concerning"
        return "safe"

# Create an instance of the filter
filter_instance = ImageContentFilter()

@app.route('/analyze', methods=['POST'])
def analyze_image():
    """API endpoint to analyze an image"""
    try:
        data = request.json
        image_url = data.get('image_url')
        image_data = None

        # Check if an image file is uploaded
        if 'image' in request.files:
            image_file = request.files['image']
            image_data = image_file.read()

        # Validate input
        if not image_data and not image_url:
            return jsonify({"error": "No image provided. Please upload an image or provide an image URL."}), 400

        # Perform image analysis
        results = filter_instance.analyze_image(image_url=image_url, image_data=image_data)
        return jsonify({"success": True, "results": results}), 200
    except Exception as e:
        logger.error("Failed to analyze the image: %s", e)
        return jsonify({"success": False, "error": str(e)}), 500

if __name__ == '__main__':
    # Run the Flask app
    app.run(debug=True, port=5000)
#!/usr/bin/env python3
"""
Python Image Filter Script
This script filters image content for inappropriate content using the image_content_filter.py module
"""

import os
import sys
import json
import logging
from image_content_filter import ImageContentFilter
from text_analysis import encrypt_data

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def filter_image(image_url):
    """
    Filter image content for inappropriate content
    
    Args:
        image_url (str): URL of the image to filter
        
    Returns:
        dict: Result of the filtering operation
    """
    try:
        # Initialize the image content filter
        image_filter = ImageContentFilter()
        
        # Analyze the image
        results = image_filter.analyze_image(image_url=image_url, show_results=False, export_comparison=False)
        
        # Determine if the image should be filtered
        if results["overall_safety"] in ["unsafe", "questionable"]:
            # Create a placeholder URL
            placeholder_url = "https://via.placeholder.com/400x300?text=Content+Filtered"
            
            return {
                "filtered": True,
                "reason": f"{results['overall_safety'].capitalize()} content detected: {', '.join(results['content_flags'])}",
                "original": image_url,
                "modified": placeholder_url,
                "encrypted": encrypt_data(image_url),
                "safety_score": results["overall_safety"],
                "content_flags": results["content_flags"]
            }
        
        # For potentially concerning content, only add a warning if there are specific flags
        if results["overall_safety"] == "potentially_concerning":
            # Check if there are any serious flags that warrant a warning
            serious_flags = ["violence", "racy", "adult"]
            has_serious_flags = any(flag in serious_flags for flag in results["content_flags"])
            
            if has_serious_flags:
                return {
                    "filtered": False,
                    "warning": True,
                    "reason": f"Potentially concerning content: {', '.join(results['content_flags'])}",
                    "original": image_url,
                    "modified": image_url,
                    "safety_score": results["overall_safety"],
                    "content_flags": results["content_flags"]
                }
            else:
                # If no serious flags, treat as safe
                return {
                    "filtered": False,
                    "warning": False,
                    "reason": "No inappropriate content detected",
                    "original": image_url,
                    "modified": image_url,
                    "safety_score": "safe"
                }
        
        # Safe content
        return {
            "filtered": False,
            "reason": "No inappropriate content detected",
            "original": image_url,
            "modified": image_url,
            "safety_score": results["overall_safety"]
        }
    
    except Exception as e:
        logger.exception(f"Error filtering image: {str(e)}")
        
        # Fall back to simple URL-based filtering
        inappropriate = any(term in image_url.lower() for term in [
            "nsfw", "adult", "xxx", "porn", "explicit"
        ])
        
        if inappropriate:
            return {
                "filtered": True,
                "reason": "Potentially inappropriate image (URL pattern match)",
                "original": image_url,
                "modified": "https://via.placeholder.com/400x300?text=Content+Filtered",
                "encrypted": encrypt_data(image_url)
            }
        
        return {
            "filtered": False,
            "reason": "No inappropriate content detected (fallback check)",
            "original": image_url,
            "modified": image_url
        }

def main():
    """Main function"""
    try:
        # Check if an image URL was provided
        if len(sys.argv) < 2:
            logger.error("No image URL provided")
            print(json.dumps({"error": "No image URL provided"}))
            sys.exit(1)
        
        # Get the image URL
        image_url = sys.argv[1]
        
        # Filter the image
        result = filter_image(image_url)
        
        # Print the result as JSON
        print(json.dumps(result))
    
    except Exception as e:
        logger.exception(f"Error in main function: {str(e)}")
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()
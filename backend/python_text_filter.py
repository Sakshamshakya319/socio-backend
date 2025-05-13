#!/usr/bin/env python3
"""
Python Text Filter Script
This script filters text content for inappropriate content using the text_analysis.py module
"""

import os
import sys
import json
import logging
from text_analysis import detect_hate_speech_profanity, detect_sensitive_info, encrypt_data

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def filter_text(text):
    """
    Filter text content for inappropriate content
    
    Args:
        text (str): The text to filter
        
    Returns:
        dict: Result of the filtering operation
    """
    try:
        # Detect hate speech and profanity
        hate_speech_results = detect_hate_speech_profanity(text)
        
        # Detect sensitive information
        sensitive_info_results = detect_sensitive_info(text)
        
        # Combine results
        detection_results = {
            **hate_speech_results,
            "sensitive_info": sensitive_info_results
        }
        
        # Check if any problematic content was detected
        inappropriate = (
            detection_results["hate_speech"] or 
            detection_results["profanity"] or 
            any(items for items in detection_results["sensitive_info"].values() if items)
        )
        
        if inappropriate:
            # Encrypt the original content
            encrypted = encrypt_data(text)
            
            # Replace inappropriate content with asterisks
            modified_text = text
            
            # Replace flagged words with asterisks
            for word in detection_results["flagged_words"]:
                modified_text = modified_text.replace(word, '*' * len(word))
            
            # Mask sensitive information
            for type_name, items in detection_results["sensitive_info"].items():
                for item in items:
                    # For sensitive info like credit cards, only show last 4 digits
                    if type_name == "credit_cards":
                        last_four = item[-4:]
                        masked = '*' * (len(item) - 4) + last_four
                        modified_text = modified_text.replace(item, masked)
                    else:
                        modified_text = modified_text.replace(item, '*' * len(item))
            
            return {
                "filtered": True,
                "reason": "Inappropriate content detected",
                "analysis": detection_results,
                "original": text,
                "modified": modified_text,
                "encrypted": encrypted
            }
        
        return {
            "filtered": False,
            "reason": "No inappropriate content detected",
            "original": text,
            "modified": text
        }
    
    except Exception as e:
        logger.exception(f"Error filtering text: {str(e)}")
        return {
            "error": str(e),
            "filtered": False,
            "original": text,
            "modified": text
        }

def main():
    """Main function"""
    try:
        # Check if a file path was provided
        if len(sys.argv) < 2:
            logger.error("No input file provided")
            print(json.dumps({"error": "No input file provided"}))
            sys.exit(1)
        
        # Get the file path
        file_path = sys.argv[1]
        
        # Check if the file exists
        if not os.path.exists(file_path):
            logger.error(f"Input file not found: {file_path}")
            print(json.dumps({"error": f"Input file not found: {file_path}"}))
            sys.exit(1)
        
        # Read the text from the file
        with open(file_path, 'r', encoding='utf-8') as f:
            text = f.read()
        
        # Filter the text
        result = filter_text(text)
        
        # Print the result as JSON
        print(json.dumps(result))
    
    except Exception as e:
        logger.exception(f"Error in main function: {str(e)}")
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()
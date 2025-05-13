#!/usr/bin/env python3
"""
Python Decrypt Script
This script decrypts previously encrypted content using the text_analysis.py module
"""

import os
import sys
import json
import logging
from text_analysis import decrypt_data

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def decrypt_content(encrypted):
    """
    Decrypt previously encrypted content
    
    Args:
        encrypted (str): Encrypted content as a base64 string
        
    Returns:
        dict: Result of the decryption operation
    """
    try:
        # Decrypt the content
        decrypted = decrypt_data(encrypted)
        
        return {
            "decrypted": decrypted
        }
    
    except Exception as e:
        logger.exception(f"Error decrypting content: {str(e)}")
        return {
            "error": str(e),
            "decrypted": ""
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
        
        # Read the encrypted content from the file
        with open(file_path, 'r', encoding='utf-8') as f:
            encrypted = f.read()
        
        # Decrypt the content
        result = decrypt_content(encrypted)
        
        # Print the result as JSON
        print(json.dumps(result))
    
    except Exception as e:
        logger.exception(f"Error in main function: {str(e)}")
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()
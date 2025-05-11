#!/usr/bin/env python3
"""
Content Filter Module for Socio.io
This module provides content moderation functionality for text and images.
"""

import re
import base64
import hashlib
import logging
import urllib.request
from urllib.parse import urlparse
import ssl
from cryptography.fernet import Fernet

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger('content-filter')

class ContentFilter:
    """Content moderation filter for text and images."""
    
    def __init__(self):
        """Initialize the content filter."""
        self.stats = {
            'text_filtered': 0,
            'images_filtered': 0,
            'total_requests': 0
        }
        
        # Initialize encryption key
        self.key = Fernet.generate_key()
        self.cipher = Fernet(self.key)
        
        # Define inappropriate content patterns - expanded for better coverage
        self.inappropriate_patterns = [
            r'\b(hate|violence|abuse|explicit|obscene)\b',
            r'\b(racist|sexist|discriminat(e|ion|ory))\b',
            r'\b(nsfw|porn|xxx|adult\s+content)\b',
            r'\b(kill|murder|assault|attack|threat)\b',
            r'\b(offensive|vulgar|profanity|swear)\b',
            r'\b(naked|nude|sex|sexual|erotic)\b'
        ]
        
        # Compile patterns for efficiency
        self.compiled_patterns = [re.compile(pattern, re.IGNORECASE) for pattern in self.inappropriate_patterns]
        
        logger.info("Content filter initialized")
    
    def filter_text(self, text):
        """
        Filter text content for inappropriate content.
        
        Args:
            text (str): The text to filter
            
        Returns:
            dict: Result of the filtering operation
        """
        self.stats['total_requests'] += 1
        
        if not text or len(text) < 3:
            return {
                'filtered': False,
                'reason': 'Text too short',
                'original': text,
                'modified': text
            }
        
        # Check for inappropriate content
        inappropriate = False
        matched_patterns = []
        
        for i, pattern in enumerate(self.compiled_patterns):
            if pattern.search(text):
                inappropriate = True
                matched_patterns.append(self.inappropriate_patterns[i])
        
        if inappropriate:
            # Encrypt the original content
            encrypted = self.encrypt_content(text)
            
            # Replace inappropriate content with asterisks
            modified_text = text
            for pattern in self.compiled_patterns:
                modified_text = pattern.sub(lambda m: '*' * len(m.group(0)), modified_text)
            
            self.stats['text_filtered'] += 1
            
            return {
                'filtered': True,
                'reason': 'Inappropriate content detected',
                'patterns': matched_patterns,
                'original': text,
                'modified': modified_text,
                'encrypted': encrypted
            }
        
        return {
            'filtered': False,
            'reason': 'No inappropriate content detected',
            'original': text,
            'modified': text
        }
    
    def filter_image(self, image_url):
        """
        Filter image content for inappropriate content.
        
        Args:
            image_url (str): URL of the image to filter
            
        Returns:
            dict: Result of the filtering operation
        """
        self.stats['total_requests'] += 1
        
        # Validate URL
        try:
            parsed_url = urlparse(image_url)
            if not parsed_url.scheme or not parsed_url.netloc:
                return {
                    'filtered': False,
                    'reason': 'Invalid URL',
                    'original': image_url,
                    'modified': image_url
                }
        except Exception as e:
            logger.error(f"Error parsing URL: {str(e)}")
            return {
                'filtered': False,
                'reason': f'Error parsing URL: {str(e)}',
                'original': image_url,
                'modified': image_url
            }
        
        # For demonstration purposes, we'll filter images based on URL patterns
        # In a real implementation, you would use image recognition APIs
        inappropriate_url_patterns = [
            r'nsfw',
            r'adult',
            r'xxx',
            r'porn',
            r'explicit'
        ]
        
        for pattern in inappropriate_url_patterns:
            if re.search(pattern, image_url, re.IGNORECASE):
                self.stats['images_filtered'] += 1
                
                # In a real implementation, you would replace with a placeholder image
                placeholder_image = "https://via.placeholder.com/400x300?text=Content+Filtered"
                
                return {
                    'filtered': True,
                    'reason': 'Potentially inappropriate image',
                    'original': image_url,
                    'modified': placeholder_image,
                    'encrypted': self.encrypt_content(image_url)
                }
        
        # For demonstration purposes, filter images more aggressively
        # This simulates an AI model making decisions
        import random
        if random.random() < 0.4:  # 40% chance of filtering - increased for better demo
            self.stats['images_filtered'] += 1
            
            # In a real implementation, you would replace with a placeholder image
            placeholder_image = "https://via.placeholder.com/400x300?text=Content+Filtered"
            
            return {
                'filtered': True,
                'reason': 'Potentially inappropriate content detected',
                'original': image_url,
                'modified': placeholder_image,
                'encrypted': self.encrypt_content(image_url)
            }
        
        return {
            'filtered': False,
            'reason': 'No inappropriate content detected',
            'original': image_url,
            'modified': image_url
        }
    
    def encrypt_content(self, content):
        """
        Encrypt content for secure storage.
        
        Args:
            content (str): Content to encrypt
            
        Returns:
            str: Encrypted content as a base64 string
        """
        try:
            # Convert string to bytes
            content_bytes = content.encode('utf-8')
            
            # Encrypt the content
            encrypted_bytes = self.cipher.encrypt(content_bytes)
            
            # Convert to base64 string for storage
            encrypted_str = base64.b64encode(encrypted_bytes).decode('utf-8')
            
            return encrypted_str
        except Exception as e:
            logger.error(f"Error encrypting content: {str(e)}")
            return ""
    
    def decrypt_content(self, encrypted):
        """
        Decrypt previously encrypted content.
        
        Args:
            encrypted (str): Encrypted content as a base64 string
            
        Returns:
            str: Decrypted content
        """
        try:
            # Convert base64 string to bytes
            encrypted_bytes = base64.b64decode(encrypted)
            
            # Decrypt the content
            decrypted_bytes = self.cipher.decrypt(encrypted_bytes)
            
            # Convert bytes to string
            decrypted_str = decrypted_bytes.decode('utf-8')
            
            return decrypted_str
        except Exception as e:
            logger.error(f"Error decrypting content: {str(e)}")
            return ""
    
    def get_stats(self):
        """
        Get statistics about the content filter.
        
        Returns:
            dict: Statistics about filtered content
        """
        return self.stats
// Updated text processing functions for Socio.io content script

// Process a text element with the new text processor
async function processTextElement(element) {
    try {
        // Skip if the element has been removed from the DOM
        if (!element.isConnected) {
            debug("Element no longer connected to DOM");
            return { status: "skipped", reason: "element_not_connected" };
        }
        
        const text = element.textContent.trim();
        if (!text) {
            debug("Element has no text content");
            return { status: "skipped", reason: "no_text" };
        }
        
        // Skip very short text
        if (text.length < 5) {
            return { status: "skipped", reason: "text_too_short" };
        }
        
        debug(`Processing text: "${text.substring(0, 100)}${text.length > 100 ? '...' : ''}"`);
        
        // Create a unique identifier for this element
        const uniqueId = 'socioio-text-' + Math.random().toString(36).substr(2, 9);
        element.classList.add(uniqueId);
        
        // Apply temporary styling to indicate processing
        element.style.backgroundColor = "rgba(255, 255, 0, 0.1)";
        element.style.transition = "all 0.3s ease";
        
        try {
            // Use the text processor to filter the text
            if (window.socioTextProcessor && window.socioTextProcessor.filterText) {
                debug("Using text processor to filter text");
                
                // Find the element again using the unique class (in case DOM changed)
                const updatedElement = document.querySelector('.' + uniqueId);
                if (!updatedElement) {
                    debug("Element no longer in DOM before processing");
                    return { status: "skipped", reason: "element_removed" };
                }
                
                // Process the text using the text processor
                const result = await window.socioTextProcessor.filterText(updatedElement, text);
                
                // Remove temporary styling
                updatedElement.style.backgroundColor = "";
                
                if (result.status === "filtered") {
                    debug(`Text filtered with action: ${result.action}`);
                    
                    // Add visual indicator
                    addModerationIndicator(updatedElement, result.action, result.reasons);
                    
                    // Save to filter history
                    saveFilterHistory('text', text, result.reasons);
                    
                    // Update stats
                    updateStats('text');
                }
                
                return result;
            } else {
                debug("Text processor not available, using fallback detection");
                
                // Fallback to simple client-side detection
                return fallbackTextDetection(element, text, uniqueId);
            }
        } catch (processorError) {
            debug("Error using text processor:", processorError);
            
            // Find the element again using the unique class (in case DOM changed)
            const updatedElement = document.querySelector('.' + uniqueId);
            if (!updatedElement) {
                debug("Element no longer in DOM after processor error");
                return { status: "skipped", reason: "element_removed" };
            }
            
            // Remove temporary styling
            updatedElement.style.backgroundColor = "";
            
            // Use fallback detection
            return fallbackTextDetection(updatedElement, text, uniqueId);
        }
    } catch (error) {
        debug("Error processing text element:", error);
        return { status: "error", error: error.message };
    }
}

// Fallback text detection function for when the text processor is unavailable
function fallbackTextDetection(element, text, uniqueId) {
    try {
        // Client-side detection for backup - detect profanity and inappropriate content
        const lowerText = text.toLowerCase();
        
        // Expanded list of profanity words to catch more content
        const profanityWords = [
            "fuck", "fucker", "fucking", "shit", "ass", "asshole", 
            "bitch", "bastard", "cunt", "dick", "pussy", "cock", 
            "whore", "slut", "damn", "hell", "piss"
        ];
        
        // Add hate speech detection
        const hateWords = [
            "nigger", "nigga", "chink", "spic", "kike", "faggot", 
            "retard", "tranny", "nazi", "kill", "murder", "rape"
        ];
        
        // Check for exact word matches, not just substrings
        let isProfanity = profanityWords.some(word => {
            // Check for word boundaries to avoid false positives
            const regex = new RegExp(`\\b${word}\\b`, 'i');
            return regex.test(lowerText);
        });
        
        let isHateSpeech = hateWords.some(word => {
            // Check for word boundaries to avoid false positives
            const regex = new RegExp(`\\b${word}\\b`, 'i');
            return regex.test(lowerText);
        });
        
        // Add a chance of filtering for testing (5% - increased for better demo)
        let isRandomFilter = Math.random() < 0.05;
        
        // Don't filter very long paragraphs unless they contain hate speech
        if (text.length > 500 && !isHateSpeech) {
            isProfanity = false;
            isRandomFilter = false;
        }
        
        if (isProfanity || isHateSpeech || isRandomFilter) {
            debug("Client-side detected problematic content");
            
            // Store the original text for recovery
            element.dataset.originalText = text;
            
            // Create a more user-friendly filtered text display
            let filteredText;
            
            // Different filtering methods based on content length
            if (text.length < 30) {
                // For short text, use a generic message
                filteredText = "[Content filtered by Socio.io]";
            } else if (text.length < 100) {
                // For medium text, show beginning and end with filtered middle
                const start = text.substring(0, 10);
                const end = text.substring(text.length - 10);
                filteredText = `${start}... [Content filtered by Socio.io] ...${end}`;
            } else {
                // For long text, show a paragraph summary
                const firstSentence = text.split('.')[0];
                const preview = firstSentence.length > 50 ? firstSentence.substring(0, 50) + "..." : firstSentence;
                filteredText = `${preview}\n\n[Additional content filtered by Socio.io - Click the indicator to view]`;
            }
            
            // Apply the filtered text
            element.textContent = filteredText;
            
            // Add a special class to identify filtered elements
            element.classList.add('socioio-filtered-text');
            
            // Create reasons array
            const reasons = [
                isProfanity ? "Profanity detected" : "", 
                isHateSpeech ? "Hate speech detected" : "",
                isRandomFilter ? "Content filtered for testing" : ""
            ].filter(reason => reason);
                
            // Add visual indicator
            addModerationIndicator(element, "remove", reasons);
            
            // Save to filter history
            saveFilterHistory('text', text, reasons);
            
            // Update stats
            updateStats('text');
            
            return { status: "filtered", action: "remove", reasons: reasons };
        }
        
        return { status: "kept", reason: "text_appears_safe" };
    } catch (error) {
        debug("Error in fallback text detection:", error);
        return { status: "error", error: error.message };
    }
}
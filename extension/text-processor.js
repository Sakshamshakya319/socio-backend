// Text Processor for Socio.io
// This module provides text content analysis and filtering

// Debug logging function
function debug(message, obj = null) {
    const timestamp = new Date().toISOString();
    if (obj) {
        console.log(`[Socio.io Text ${timestamp}]`, message, obj);
    } else {
        console.log(`[Socio.io Text ${timestamp}]`, message);
    }
}

// Function to analyze text using the backend API
async function analyzeText(text) {
    try {
        debug("Analyzing text with backend API");
        
        // First try the cloud backend
        const API_BASE_URL = 'https://socio-backend-zxxd.onrender.com';
        
        try {
            const response = await fetch(`${API_BASE_URL}/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text }),
            });
            
            if (!response.ok) {
                throw new Error(`Cloud backend returned status ${response.status}`);
            }
            
            const result = await response.json();
            if (result.success) {
                debug('Cloud Analysis Results:', result.results);
                return result.results;
            } else {
                debug('Cloud Analysis Error:', result.error);
                throw new Error(result.error);
            }
        } catch (cloudError) {
            debug("Cloud backend failed, trying local backend:", cloudError);
            
            // If cloud backend fails, try local backend
            const response = await fetch('http://localhost:5000/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text }),
            });
            
            if (!response.ok) {
                throw new Error(`Local backend returned status ${response.status}`);
            }
            
            const result = await response.json();
            if (result.success) {
                debug('Local Analysis Results:', result.results);
                return result.results;
            } else {
                debug('Local Analysis Error:', result.error);
                throw new Error(result.error);
            }
        }
    } catch (error) {
        debug('Text Analysis Error:', error);
        throw error;
    }
}

// Function to process text using the backend API
async function processText(text, action = "keep") {
    try {
        debug(`Processing text with action '${action}'`);
        
        // First try the cloud backend
        const API_BASE_URL = 'https://socio-backend-zxxd.onrender.com';
        
        try {
            const response = await fetch(`${API_BASE_URL}/process`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, action }),
            });
            
            if (!response.ok) {
                throw new Error(`Cloud backend returned status ${response.status}`);
            }
            
            const result = await response.json();
            if (result.success) {
                debug('Cloud Processing Results:', result);
                return result;
            } else {
                debug('Cloud Processing Error:', result.error);
                throw new Error(result.error);
            }
        } catch (cloudError) {
            debug("Cloud backend failed, trying local backend:", cloudError);
            
            // If cloud backend fails, try local backend
            const response = await fetch('http://localhost:5000/process', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, action }),
            });
            
            if (!response.ok) {
                throw new Error(`Local backend returned status ${response.status}`);
            }
            
            const result = await response.json();
            if (result.success) {
                debug('Local Processing Results:', result);
                return result;
            } else {
                debug('Local Processing Error:', result.error);
                throw new Error(result.error);
            }
        }
    } catch (error) {
        debug('Text Processing Error:', error);
        throw error;
    }
}

// Function to recover text using the backend API
async function recoverText(processedText, encryptionLog) {
    try {
        debug("Recovering text from encrypted content");
        
        // First try the cloud backend
        const API_BASE_URL = 'https://socio-backend-zxxd.onrender.com';
        
        try {
            const response = await fetch(`${API_BASE_URL}/recover`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    processed_text: processedText, 
                    encryption_log: encryptionLog 
                }),
            });
            
            if (!response.ok) {
                throw new Error(`Cloud backend returned status ${response.status}`);
            }
            
            const result = await response.json();
            if (result.success) {
                debug('Cloud Recovery Results:', result);
                return result.recovered_text;
            } else {
                debug('Cloud Recovery Error:', result.error);
                throw new Error(result.error);
            }
        } catch (cloudError) {
            debug("Cloud backend failed, trying local backend:", cloudError);
            
            // If cloud backend fails, try local backend
            const response = await fetch('http://localhost:5000/recover', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    processed_text: processedText, 
                    encryption_log: encryptionLog 
                }),
            });
            
            if (!response.ok) {
                throw new Error(`Local backend returned status ${response.status}`);
            }
            
            const result = await response.json();
            if (result.success) {
                debug('Local Recovery Results:', result);
                return result.recovered_text;
            } else {
                debug('Local Recovery Error:', result.error);
                throw new Error(result.error);
            }
        }
    } catch (error) {
        debug('Text Recovery Error:', error);
        throw error;
    }
}

// Function to filter text content
async function filterText(element, text) {
    try {
        debug("Filtering text content");
        
        // Skip empty text
        if (!text || text.trim() === '') {
            debug("Empty text, skipping");
            return { status: "skipped", reason: "empty_text" };
        }
        
        // Skip very short text (less than 5 characters)
        if (text.length < 5) {
            debug("Text too short, skipping");
            return { status: "skipped", reason: "text_too_short" };
        }
        
        // Analyze the text
        const analysisResults = await analyzeText(text);
        
        // Determine if we should filter the text
        const hasProfanity = analysisResults.profanity === true;
        const hasHateSpeech = analysisResults.hate_speech === true;
        const hasSensitiveInfo = Object.values(analysisResults.sensitive_info || {}).some(arr => arr && arr.length > 0);
        
        const shouldFilter = hasProfanity || hasHateSpeech || hasSensitiveInfo;
        
        if (shouldFilter) {
            debug("Text contains problematic content, filtering");
            
            // Store the original text
            element.dataset.originalText = text;
            
            // Process the text (encrypt or remove)
            const action = hasSensitiveInfo ? "encrypt" : "remove";
            const processResult = await processText(text, action);
            
            // Update the element with processed text
            element.textContent = processResult.processed_text;
            
            // Add styling
            element.classList.add('socioio-filtered-text');
            
            // Store encryption log if available
            if (processResult.encryption_log) {
                element.dataset.encryptionLog = JSON.stringify(processResult.encryption_log);
            }
            
            // Update stats
            try {
                chrome.runtime.sendMessage({
                    action: 'updateStats',
                    type: 'text',
                    count: 1
                });
            } catch (e) {
                debug("Error updating stats:", e);
            }
            
            return { 
                status: "filtered", 
                action: action,
                reasons: [
                    hasProfanity ? "profanity" : null,
                    hasHateSpeech ? "hate_speech" : null,
                    hasSensitiveInfo ? "sensitive_info" : null
                ].filter(Boolean)
            };
        } else {
            debug("Text appears safe, not filtering");
            return { status: "kept", reason: "text_appears_safe" };
        }
    } catch (error) {
        debug("Error filtering text:", error);
        
        // Apply a fallback filter if analysis fails
        if (element && text) {
            element.dataset.originalText = text;
            element.textContent = "[Content hidden - Analysis unavailable]";
            element.classList.add('socioio-filtered-text');
            
            try {
                chrome.runtime.sendMessage({
                    action: 'updateStats',
                    type: 'text',
                    count: 1
                });
            } catch (e) {
                debug("Error updating stats:", e);
            }
        }
        
        return { status: "error", error: error.message };
    }
}

// Export functions for use in content script
window.socioTextProcessor = {
    analyzeText,
    processText,
    recoverText,
    filterText
};
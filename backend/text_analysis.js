/**
 * Text Analysis Module for Socio.io
 * This module provides text analysis functionality for content moderation.
 */

// Define patterns for hate speech and profanity detection
const HATE_SPEECH_KEYWORDS = [
  // Violence and elimination keywords
  '\\b(?:kill|eliminate|destroy|murder|slaughter|genocide)\\s+(?:all|every|each)\\s+(?:\\w+\\s+)*(?:people|group|community|race|ethnicity)\\b',
  '\\b(?:death|die|eliminate|exterminate)\\s+to\\s+(?:all|every)\\s+(?:\\w+\\s+)*(?:people|group|community|race|ethnicity)\\b',
  
  // Dehumanization patterns
  '\\b(?:all|every|those)\\s+(?:\\w+\\s+)*(?:people|group|community|race|ethnicity)\\s+(?:are|is)\\s+(?:animals|vermin|cockroaches|rats|trash|garbage)\\b',
  
  // Violent action patterns
  '\\b(?:we|they|people|everyone)\\s+should\\s+(?:kill|eliminate|eradicate|remove|cleanse)\\s+(?:all|every|the|those)\\s+(?:\\w+\\s+)*(?:people|group|community|race|ethnicity)\\b',
  
  // General hate patterns
  '\\b(?:hate|despise|loathe)\\s+(?:all|every|those|these)\\s+(?:\\w+\\s+)*(?:people|group|community|race|ethnicity)\\b',
  
  // Explicit discriminatory statements
  '\\b(?:all|every|each)\\s+(?:\\w+\\s+)*(?:people|group|community|race|ethnicity)\\s+(?:should|must|need to)\\s+(?:be|get)\\s+(?:banned|deported|removed|eliminated|killed)\\b',
];

// Common profanity and slurs (abbreviated/masked to avoid explicit content)
const PROFANITY_PATTERNS = [
  // Common general profanity (abbreviated)
  '\\ba[s$][s$]\\b', '\\bb[i!]t?ch\\b', '\\bf[u\\*][c\\*]k\\b', '\\bs[h\\*][i\\*]t\\b', 
  '\\bd[a\\*]mn\\b', '\\bh[e\\*]ll\\b', '\\bcr[a\\*]p\\b', '\\bd[i\\*]ck\\b',
  
  // Hindi/Urdu profanity
  '\\bg[a\\*][a\\*]nd\\b', '\\bch[u\\*]t[i\\*]ya\\b', '\\bb[e\\*][h\\*][e\\*]n ?ch[o\\*]d\\b',
  
  // Various slurs (intentionally abbreviated)
  '\\bn[i\\*]gg[e\\*]r\\b', '\\bf[a\\*]g\\b', '\\bc[u\\*]nt\\b',
  
  // Common substitutions
  '\\bf\\*\\*k\\b', '\\bs\\*\\*t\\b', '\\ba\\*\\*\\b', '\\bb\\*\\*\\*h\\b',
];

// Patterns for sensitive information detection
const SENSITIVE_PATTERNS = {
  // Indian phone numbers - start with 6, 7, 8, or 9 followed by 9 digits
  phone_numbers: [
    '\\b(?:\\+91[\\s-]?)?[6-9]\\d{9}\\b',  // Indian format with or without +91
    '\\b(?:0)?[6-9]\\d{9}\\b',           // With optional 0 prefix
    '\\b[6-9]\\d{2}[\\s-]?\\d{3}[\\s-]?\\d{4}\\b',  // With separators
  ],
  
  // Email addresses
  emails: [
    '\\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}\\b'
  ],
  
  // Aadhaar numbers (12 digits, often with spaces after every 4 digits)
  aadhaar: [
    '\\b\\d{4}\\s?\\d{4}\\s?\\d{4}\\b'
  ],
  
  // PAN (Permanent Account Number) - 5 uppercase letters followed by 4 digits and 1 uppercase letter
  pan: [
    '\\b[A-Z]{5}[0-9]{4}[A-Z]\\b'
  ],
  
  // Credit card numbers (with or without separators)
  credit_cards: [
    '\\b(?:\\d{4}[\\s-]?){3}\\d{4}\\b',  // Common format with separators
    '\\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|6(?:011|5[0-9]{2})[0-9]{12}|(?:2131|1800|35\\d{3})\\d{11})\\b'  // Various card formats without separators
  ],
};

/**
 * Detect hate speech and profanity in text
 * 
 * @param {string} text - The text to analyze
 * @returns {object} Analysis results
 */
function detectHateSpeechProfanity(text) {
  const results = {
    hate_speech: false,
    profanity: false,
    flagged_words: [],
    flagged_sentences: []
  };
  
  // Split text into sentences
  const sentences = [];
  // First split by newlines to preserve paragraph structure
  const paragraphs = text.split('\n');
  for (const paragraph of paragraphs) {
    // Then split each paragraph into sentences
    const paragraphSentences = paragraph.split(/(?<=[.!?])\s+|(?<=[.!?])$/);
    // Filter out empty strings
    const filteredSentences = paragraphSentences.filter(s => s.trim());
    sentences.push(...filteredSentences);
  }
  
  // Check each sentence for hate speech patterns
  for (const sentence of sentences) {
    let hasHateSpeech = false;
    let hasProfanity = false;
    const profanityWords = [];
    
    // Check for hate speech
    for (const pattern of HATE_SPEECH_KEYWORDS) {
      const regex = new RegExp(pattern, 'i');
      if (regex.test(sentence.toLowerCase())) {
        hasHateSpeech = true;
        results.hate_speech = true;
        break;
      }
    }
    
    // Check for profanity
    for (const pattern of PROFANITY_PATTERNS) {
      const regex = new RegExp(pattern, 'gi');
      let match;
      while ((match = regex.exec(sentence.toLowerCase())) !== null) {
        hasProfanity = true;
        results.profanity = true;
        const flaggedWord = match[0];
        if (!results.flagged_words.includes(flaggedWord)) {
          results.flagged_words.push(flaggedWord);
        }
        profanityWords.push(flaggedWord);
      }
    }
    
    // Add sentence to flagged sentences if it contains hate speech or profanity
    if (hasHateSpeech || hasProfanity) {
      if (!results.flagged_sentences.includes(sentence)) {
        results.flagged_sentences.push(sentence);
      }
    }
  }
  
  return results;
}

/**
 * Detect sensitive information in text
 * 
 * @param {string} text - The text to analyze
 * @returns {object} Detected sensitive information
 */
function detectSensitiveInfo(text) {
  const results = {
    phone_numbers: [],
    emails: [],
    aadhaar: [],
    pan: [],
    credit_cards: []
  };
  
  // Check for each type of sensitive information
  for (const [type, patterns] of Object.entries(SENSITIVE_PATTERNS)) {
    for (const pattern of patterns) {
      const regex = new RegExp(pattern, 'gi');
      let match;
      while ((match = regex.exec(text)) !== null) {
        const value = match[0];
        if (!results[type].includes(value)) {
          results[type].push(value);
        }
      }
    }
  }
  
  return results;
}

/**
 * Analyze text for problematic content
 * 
 * @param {string} text - The text to analyze
 * @returns {object} Analysis results
 */
function analyzeText(text) {
  // Detect hate speech and profanity
  const hateSpeechResults = detectHateSpeechProfanity(text);
  
  // Detect sensitive information
  const sensitiveInfoResults = detectSensitiveInfo(text);
  
  // Combine results
  return {
    ...hateSpeechResults,
    sensitive_info: sensitiveInfoResults
  };
}

module.exports = {
  analyzeText,
  detectHateSpeechProfanity,
  detectSensitiveInfo
};
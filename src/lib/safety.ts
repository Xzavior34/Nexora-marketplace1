/**
 * Message Safety Utility
 * Prevents sharing of contact info and external platform keywords
 */

interface SafetyCheckResult {
  safe: boolean;
  message: string;
}

/**
 * Nigerian phone number patterns:
 * - Standard: 080, 081, 090, 091, 070, 071
 * - With country code: +234, 234
 * - Obfuscated: 0.8.0, 0-8-0, 0 8 0, zero eight zero
 */
const phonePatterns = [
  // Standard Nigerian numbers
  /(?:0|\+?234)\s*[789]\s*[01]\s*\d(?:[\s.\-]?\d){7,}/gi,
  // Spaced/dotted obfuscation
  /0\s*[.\-\s]?\s*[789]\s*[.\-\s]?\s*[01](?:\s*[.\-\s]?\s*\d){7,}/gi,
  // Word-based obfuscation (zero eight zero...)
  /(?:zero|one|two|three|four|five|six|seven|eight|nine)[\s,.\-]+(?:zero|one|two|three|four|five|six|seven|eight|nine)[\s,.\-]+(?:zero|one|two|three|four|five|six|seven|eight|nine)/gi,
  // International format
  /\+\d{1,3}[\s.\-]?\d{3,4}[\s.\-]?\d{3,4}[\s.\-]?\d{3,4}/gi,
];

// Email pattern
const emailPattern = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/gi;

// External platform keywords (case insensitive)
const externalKeywords = [
  'whatsapp',
  'whats app',
  'watsapp',
  'telegram',
  'instagram',
  'ig handle',
  'snapchat',
  'twitter',
  'facebook',
  'pay outside',
  'payment outside',
  'pay me directly',
  'direct payment',
  'bank transfer',
  'transfer to my account',
  'my account number',
  'send to my account',
  'call me on',
  'call me at',
  'reach me on',
  'contact me on',
  'text me on',
  'dm me',
  'message me on',
];

/**
 * Check if a message contains sensitive content that should be blocked
 */
export function checkMessageSafety(text: string): SafetyCheckResult {
  const normalizedText = text.toLowerCase().trim();

  // Check for phone numbers
  for (const pattern of phonePatterns) {
    if (pattern.test(text)) {
      return {
        safe: false,
        message: "For your protection, sharing phone numbers is not allowed. Please use the in-app chat.",
      };
    }
  }

  // Check for email addresses
  if (emailPattern.test(text)) {
    return {
      safe: false,
      message: "Sharing email addresses is not allowed to protect both parties. Keep communication within Nexora.",
    };
  }

  // Check for external platform keywords
  for (const keyword of externalKeywords) {
    if (normalizedText.includes(keyword)) {
      return {
        safe: false,
        message: `Mentioning external platforms like "${keyword}" is not allowed. All transactions must stay on Nexora for your protection.`,
      };
    }
  }

  return {
    safe: true,
    message: "",
  };
}

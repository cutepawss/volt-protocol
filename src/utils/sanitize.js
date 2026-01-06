/**
 * Sanitize user input to prevent XSS attacks
 * Removes dangerous HTML/JavaScript code
 */
export const sanitizeInput = (input) => {
  if (!input || typeof input !== 'string') return input;
  
  // Remove HTML tags and dangerous characters
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};
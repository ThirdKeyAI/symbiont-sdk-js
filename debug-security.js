// Simple debug script to test SecurityManager behavior
const path = require('path');

// Helper function to simulate the SecurityManager behavior
function debugSanitization() {
  console.log('=== Testing Sanitization Logic ===');
  
  const sensitiveFields = [
    'password', 'token', 'secret', 'key', 'apiKey', 'accessToken', 'refreshToken',
    'authorization', 'auth', 'jwt', 'bearer', 'credential', 'privateKey', 'publicKey',
    'signature', 'hash', 'salt'
  ];

  function sanitizeAuditData(data, visited = new WeakSet()) {
    console.log('Sanitizing:', JSON.stringify(data, null, 2));
    
    // Handle primitive types
    if (data === null || data === undefined || typeof data !== 'object') {
      console.log('Returning primitive:', data);
      return data;
    }

    // Handle circular references
    if (visited.has(data)) {
      console.log('Circular reference detected');
      return '[CIRCULAR]';
    }
    visited.add(data);

    // Handle arrays
    if (Array.isArray(data)) {
      console.log('Processing array');
      return data.map(item => sanitizeAuditData(item, visited));
    }

    // Handle objects
    const result = {};
    
    for (const [key, value] of Object.entries(data)) {
      console.log(`Processing key: "${key}", value type: ${typeof value}`);
      
      // Check if field name contains sensitive keywords (case-insensitive)
      const keyLower = key.toLowerCase();
      const isSensitive = sensitiveFields.some(field => 
        keyLower.includes(field.toLowerCase())
      );
      
      console.log(`Key "${key}" is sensitive: ${isSensitive}`);

      if (isSensitive && (typeof value !== 'object' || value === null)) {
        // Only redact primitive sensitive values, not objects
        result[key] = '[REDACTED]';
        console.log(`Set ${key} to [REDACTED]`);
      } else if (value !== null && typeof value === 'object') {
        // Always recursively sanitize nested objects, even if the key is sensitive
        console.log(`Recursively processing ${key}`);
        result[key] = sanitizeAuditData(value, visited);
      } else {
        result[key] = value;
        console.log(`Set ${key} to ${value}`);
      }
    }

    console.log('Result for this level:', JSON.stringify(result, null, 2));
    return result;
  }

  // Test the exact data from the failing test
  const nestedEventData = {
    user: {
      id: 'user123',
      credentials: {
        password: 'secret123',
        token: 'jwt-token-here'
      }
    },
    session: {
      id: 'session123',
      secret: 'session-secret'
    }
  };

  console.log('\n=== Original Data ===');
  console.log(JSON.stringify(nestedEventData, null, 2));
  
  console.log('\n=== Sanitization Process ===');
  const result = sanitizeAuditData(nestedEventData);
  
  console.log('\n=== Final Result ===');
  console.log(JSON.stringify(result, null, 2));
  
  console.log('\n=== Test Assertions ===');
  console.log('user.id:', result.user.id);
  console.log('user.credentials.password:', result.user.credentials?.password);
  console.log('user.credentials.token:', result.user.credentials?.token);
  console.log('session.id:', result.session.id);
  console.log('session.secret:', result.session.secret);
}

function debugXSSValidation() {
  console.log('\n=== Testing XSS Validation ===');
  
  const xssPatterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /<iframe[^>]*>.*?<\/iframe>/gi,
    /<object[^>]*>.*?<\/object>/gi,
    /<embed[^>]*>/gi,
    /<link[^>]*>/gi,
    /<meta[^>]*>/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /data:/gi,
    /on\w+\s*=/gi
  ];

  const testInput = '<script>alert("xss")</script>';
  console.log('Testing input:', testInput);
  
  for (let i = 0; i < xssPatterns.length; i++) {
    const pattern = xssPatterns[i];
    const isMatch = pattern.test(testInput);
    console.log(`Pattern ${i} (${pattern}): ${isMatch}`);
    // Reset regex state
    pattern.lastIndex = 0;
  }
  
  const anyMatch = xssPatterns.some(pattern => {
    const result = pattern.test(testInput);
    pattern.lastIndex = 0; // Reset state
    return result;
  });
  
  console.log('Any pattern matches:', anyMatch);
  console.log('Should be invalid (return false for valid):', !anyMatch ? 'PASS' : 'FAIL');
}

// Run the debug functions
debugSanitization();
debugXSSValidation();
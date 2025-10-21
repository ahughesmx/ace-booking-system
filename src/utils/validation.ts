
// Input validation utilities for security
export const validateWebhookUrl = (url: string): string | null => {
  try {
    const parsedUrl = new URL(url);
    
    // Only allow HTTPS URLs
    if (parsedUrl.protocol !== 'https:') {
      return 'Solo se permiten URLs HTTPS';
    }
    
    // Block localhost and private IP ranges
    const hostname = parsedUrl.hostname.toLowerCase();
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('172.16.') ||
      hostname.includes('169.254.') // Link-local
    ) {
      return 'No se permiten URLs locales o privadas';
    }
    
    // Check for suspicious patterns
    if (hostname.includes('..') || url.includes('javascript:') || url.includes('data:')) {
      return 'URL contiene patrones sospechosos';
    }
    
    return null;
  } catch (error) {
    return 'URL inválida';
  }
};

export const validateWebhookHeaders = (headersJson: string): { isValid: boolean; error?: string; headers?: Record<string, string> } => {
  if (!headersJson.trim()) {
    return { isValid: true, headers: {} };
  }
  
  try {
    const headers = JSON.parse(headersJson);
    
    if (typeof headers !== 'object' || Array.isArray(headers)) {
      return { isValid: false, error: 'Los headers deben ser un objeto JSON' };
    }
    
    // Validate each header
    for (const [key, value] of Object.entries(headers)) {
      if (typeof key !== 'string' || typeof value !== 'string') {
        return { isValid: false, error: 'Todas las claves y valores de headers deben ser strings' };
      }
      
      if (key.length > 100 || value.length > 500) {
        return { isValid: false, error: 'Headers demasiado largos' };
      }
      
      // Block potentially dangerous headers
      const lowerKey = key.toLowerCase();
      if (lowerKey.includes('cookie') || lowerKey.includes('session')) {
        return { isValid: false, error: 'No se permiten headers de cookies o sesión' };
      }
    }
    
    return { isValid: true, headers };
  } catch (error) {
    return { isValid: false, error: 'JSON inválido en headers' };
  }
};

export const sanitizeInput = (input: string, maxLength: number = 255): string => {
  return input
    .trim()
    .slice(0, maxLength)
    .replace(/[<>]/g, '') // Remove potentially dangerous characters
    .replace(/javascript:/gi, '')
    .replace(/data:/gi, '');
};

export const validateEventType = (eventType: string): boolean => {
  const validEvents = [
    'booking_created',
    'booking_cancelled',
    'booking_reminder',
    'match_created',
    'match_completed',
    'match_invitation_sent',
    'match_invitation_responded',
    'user_registered',
    'emergency_closure',
    'user_registration_approved'
  ];
  return validEvents.includes(eventType);
};

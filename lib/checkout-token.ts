/**
 * JWT Token Validation for Cross-App Checkout
 *
 * When apps (Calculator, Timekeeper) redirect to checkout, they send a signed JWT
 * containing the user's identity. This prevents session mixing between different
 * users who may be logged into the auth hub with different accounts.
 *
 * Token structure:
 * - sub: user_id (UUID from Supabase)
 * - email: user's email
 * - app: 'calculator' | 'timekeeper'
 * - iat: issued at timestamp
 * - exp: expiration timestamp (5 minutes)
 * - jti: unique token ID (for anti-replay)
 */

const JWT_SECRET = process.env.CHECKOUT_JWT_SECRET;

export interface CheckoutTokenPayload {
  sub: string;      // user_id
  email: string;
  app: string;
  iat: number;
  exp: number;
  jti: string;
}

export type TokenValidationSuccess = {
  valid: true;
  userId: string;
  email: string;
  app: string;
  tokenId: string;
};

export type TokenValidationError = {
  valid: false;
  error: string;
};

export type TokenValidationResult = TokenValidationSuccess | TokenValidationError;

function base64urlDecode(str: string): string {
  // Replace URL-safe characters and add padding
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return Buffer.from(str, 'base64').toString('utf8');
}

async function verifySignature(data: string, signature: string, secret: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const dataToVerify = encoder.encode(data);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );

  // Decode signature from base64url
  let sigStr = signature.replace(/-/g, '+').replace(/_/g, '/');
  while (sigStr.length % 4) sigStr += '=';
  const sigBuffer = Buffer.from(sigStr, 'base64');

  return crypto.subtle.verify('HMAC', cryptoKey, sigBuffer, dataToVerify);
}

/**
 * Validates a checkout JWT token from an app
 *
 * @param token - The JWT token string
 * @returns Validation result with user data if valid, or error if invalid
 */
export async function validateCheckoutToken(token: string): Promise<TokenValidationResult> {
  if (!JWT_SECRET) {
    console.error('CHECKOUT_JWT_SECRET is not configured');
    return { valid: false, error: 'Server configuration error' };
  }

  try {
    // 1. Split token into parts
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { valid: false, error: 'Invalid token format' };
    }

    const [header, payload, signature] = parts;

    // 2. Verify signature
    const dataToVerify = `${header}.${payload}`;
    const isValid = await verifySignature(dataToVerify, signature, JWT_SECRET);

    if (!isValid) {
      return { valid: false, error: 'Invalid signature' };
    }

    // 3. Decode payload
    const decodedPayload: CheckoutTokenPayload = JSON.parse(base64urlDecode(payload));

    // 4. Verify expiration
    const now = Math.floor(Date.now() / 1000);
    if (decodedPayload.exp < now) {
      return { valid: false, error: 'Token expired' };
    }

    // 5. Validate required fields
    if (!decodedPayload.sub || !decodedPayload.email || !decodedPayload.app) {
      return { valid: false, error: 'Missing required token fields' };
    }

    // 6. Validate app name
    if (!['calculator', 'timekeeper'].includes(decodedPayload.app)) {
      return { valid: false, error: 'Invalid app in token' };
    }

    // 7. Return validated data
    return {
      valid: true,
      userId: decodedPayload.sub,
      email: decodedPayload.email,
      app: decodedPayload.app,
      tokenId: decodedPayload.jti,
    };

  } catch (err) {
    console.error('Token validation error:', err);
    return { valid: false, error: 'Token validation failed' };
  }
}

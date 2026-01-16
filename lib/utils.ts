/**
 * Validates if a redirect URL is allowed (security measure)
 * Prevents open redirect attacks
 */
export function isValidRedirectUrl(url: string): boolean {
  // Allow relative URLs
  if (url.startsWith('/')) {
    return true;
  }

  // Allow deep links for mobile apps
  const allowedSchemes = ['onsiteclub://', 'onsitecalculator://', 'onsitetimekeeper://'];
  if (allowedSchemes.some(scheme => url.startsWith(scheme))) {
    return true;
  }

  try {
    const parsedUrl = new URL(url);
    const allowedDomains = (process.env.ALLOWED_REDIRECT_DOMAINS || 'onsiteclub.ca,localhost')
      .split(',')
      .map(d => d.trim());

    // Check if the hostname matches or is a subdomain of allowed domains
    return allowedDomains.some(domain => {
      return (
        parsedUrl.hostname === domain ||
        parsedUrl.hostname.endsWith(`.${domain}`)
      );
    });
  } catch {
    return false;
  }
}

/**
 * Gets the redirect URL from query params, with fallback
 */
export function getRedirectUrl(searchParams: URLSearchParams): string {
  const redirect = searchParams.get('redirect');

  if (redirect && isValidRedirectUrl(redirect)) {
    return redirect;
  }

  // Default to home page (shows apps list and subscriptions)
  return '/';
}

/**
 * Constructs a callback URL with tokens for mobile apps
 */
export function buildCallbackUrl(
  baseUrl: string,
  accessToken: string,
  refreshToken: string
): string {
  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}access_token=${encodeURIComponent(accessToken)}&refresh_token=${encodeURIComponent(refreshToken)}`;
}

/**
 * Formats error messages for display
 */
export function formatAuthError(error: string): string {
  const errorMessages: Record<string, string> = {
    'Invalid login credentials': 'Email ou senha incorretos. Tente novamente.',
    'Email not confirmed': 'Por favor, confirme seu email antes de fazer login.',
    'User already registered': 'Este email já está cadastrado. Tente fazer login.',
    'Password should be at least 6 characters': 'A senha deve ter pelo menos 6 caracteres.',
    'Unable to validate email address: invalid format': 'Formato de email inválido.',
    'Email rate limit exceeded': 'Muitas tentativas. Aguarde alguns minutos.',
    'Invalid email or password': 'Email ou senha incorretos.',
  };

  return errorMessages[error] || error;
}

/**
 * Validates email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates password strength
 */
export function validatePassword(password: string): { valid: boolean; message?: string } {
  if (password.length < 6) {
    return { valid: false, message: 'A senha deve ter pelo menos 6 caracteres.' };
  }
  return { valid: true };
}

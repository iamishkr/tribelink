/**
 * Centralized Authentication Error Mapping Utility for Supabase Auth
 */

export function getAuthErrorMessage(error: any): string {
  if (!error) return 'An unexpected error occurred. Please try again.';

  const code = error?.code || error?.status || '';
  const message = error?.message || String(error);

  // Rate limits
  if (code === 'over_email_send_rate_limit' || message.includes('rate limit')) {
    return 'Too many requests. Please wait a few minutes before trying again, or tap "Quick Demo Login" below.';
  }
  if (code === 'over_request_rate_limit') {
    return 'Too many attempts. Please wait a few minutes before trying again.';
  }

  // Invalid credentials & user state
  if (message.includes('Invalid login credentials') || code === 'invalid_credentials') {
    return 'Incorrect email or password. Please check your credentials and try again.';
  }
  if (message.includes('User not found') || code === 'user_not_found') {
    return 'No account found with this email address.';
  }
  if (message.includes('Email not confirmed') || code === 'email_not_confirmed') {
    return 'Please check your email inbox and click the confirmation link before signing in.';
  }
  if (message.includes('User already registered') || message.includes('already exists') || code === 'user_already_exists') {
    return 'An account with this email address already exists. Try signing in instead.';
  }

  // Passwords & OTP
  if (message.includes('Password should be at least') || code === 'weak_password') {
    return 'Password must be at least 8 characters long.';
  }
  if (message.includes('Token has expired') || message.includes('invalid') || code === 'otp_expired') {
    return 'The verification code or reset link has expired. Please request a new one.';
  }

  // Network or Server errors
  if (message.includes('Network request failed') || message.includes('fetch failed')) {
    return 'Network connection error. Please check your internet connection and try again.';
  }

  return message;
}

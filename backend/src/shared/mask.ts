/**
 * Data masking utilities for sensitive information.
 *
 * Per Requirement 32.10: THE SwapSmart_Platform SHALL mask sensitive identifiers
 * (phone numbers, payment account numbers), displaying all but the last 4 characters
 * as a masking character, in the UI and in logs.
 */

/**
 * Masks a Nigerian phone number.
 * Input:  +2348131234519
 * Output: +234 8** *** **19
 *
 * Shows the country code (+234), first digit after country code, and last 2 digits.
 * All other digits are replaced with asterisks.
 */
export function maskPhone(phone: string): string {
  if (!phone) return '***';

  // Remove spaces and non-digit chars except +
  const cleaned = phone.replace(/[^\d+]/g, '');

  // Handle +234 format (Nigerian numbers)
  if (cleaned.startsWith('+234') && cleaned.length >= 14) {
    const countryCode = '+234';
    const digits = cleaned.slice(4); // 10 digits after +234
    const first = digits[0];
    const last2 = digits.slice(-2);
    return `${countryCode} ${first}** *** **${last2}`;
  }

  // Handle shorter numbers or other formats
  if (cleaned.length <= 4) return '***';

  const last4 = cleaned.slice(-4);
  const masked = '*'.repeat(cleaned.length - 4);
  return `${masked}${last4}`;
}

/**
 * Masks a payment account number (card number, bank account, etc.).
 * Input:  4521123456784521
 * Output: •••• 4521
 *
 * Shows only the last 4 digits, all others replaced with bullets.
 */
export function maskPaymentAccount(account: string): string {
  if (!account) return '••••';

  // Remove spaces and dashes
  const cleaned = account.replace(/[\s-]/g, '');

  if (cleaned.length <= 4) return cleaned;

  const last4 = cleaned.slice(-4);
  return `•••• ${last4}`;
}

/**
 * Masks an email address.
 * Input:  user@example.com
 * Output: u***@example.com
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return '***';

  const [local, domain] = email.split('@');
  if (local.length <= 1) return `${local}***@${domain}`;

  return `${local[0]}***@${domain}`;
}

/**
 * Masks a generic string, showing only the last N characters.
 */
export function maskString(value: string, visibleChars = 4): string {
  if (!value) return '***';
  if (value.length <= visibleChars) return value;

  const masked = '*'.repeat(value.length - visibleChars);
  return `${masked}${value.slice(-visibleChars)}`;
}

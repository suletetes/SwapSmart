import { describe, it, expect } from 'vitest';
import { maskPhone, maskPaymentAccount, maskEmail, maskString } from './mask.js';

describe('maskPhone', () => {
  it('masks a Nigerian phone number correctly', () => {
    expect(maskPhone('+2348131234519')).toBe('+234 8** *** **19');
  });

  it('masks another Nigerian phone number', () => {
    expect(maskPhone('+2349012345678')).toBe('+234 9** *** **78');
  });

  it('handles empty string', () => {
    expect(maskPhone('')).toBe('***');
  });

  it('handles short numbers gracefully', () => {
    expect(maskPhone('+234')).toBe('***');
  });

  it('handles non-Nigerian format with fallback', () => {
    // +1234567890 cleaned is "+1234567890" (11 chars), last 4 = "7890", masked = 7 stars + "7890"
    expect(maskPhone('+1234567890')).toBe('*******7890');
  });
});

describe('maskPaymentAccount', () => {
  it('masks a card number showing last 4 digits', () => {
    expect(maskPaymentAccount('4521123456784521')).toBe('•••• 4521');
  });

  it('masks a bank account number', () => {
    expect(maskPaymentAccount('0123456789')).toBe('•••• 6789');
  });

  it('handles card with spaces', () => {
    expect(maskPaymentAccount('4521 1234 5678 4521')).toBe('•••• 4521');
  });

  it('handles card with dashes', () => {
    expect(maskPaymentAccount('4521-1234-5678-4521')).toBe('•••• 4521');
  });

  it('handles empty string', () => {
    expect(maskPaymentAccount('')).toBe('••••');
  });

  it('handles short account (4 or fewer chars)', () => {
    expect(maskPaymentAccount('1234')).toBe('1234');
  });
});

describe('maskEmail', () => {
  it('masks an email address', () => {
    expect(maskEmail('user@example.com')).toBe('u***@example.com');
  });

  it('handles single-char local part', () => {
    expect(maskEmail('a@example.com')).toBe('a***@example.com');
  });

  it('handles empty string', () => {
    expect(maskEmail('')).toBe('***');
  });

  it('handles string without @', () => {
    expect(maskEmail('notanemail')).toBe('***');
  });
});

describe('maskString', () => {
  it('masks a string showing last 4 chars', () => {
    expect(maskString('secretvalue')).toBe('*******alue');
  });

  it('handles custom visible chars', () => {
    expect(maskString('secretvalue', 2)).toBe('*********ue');
  });

  it('handles empty string', () => {
    expect(maskString('')).toBe('***');
  });

  it('handles string shorter than visible chars', () => {
    expect(maskString('abc', 4)).toBe('abc');
  });
});

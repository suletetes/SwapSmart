import crypto from 'crypto';

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || '';
const PAYSTACK_BASE_URL = 'https://api.paystack.co';

export interface PaystackInitializeInput {
  /** Amount in kobo (Naira * 100) */
  amountKobo: number;
  email: string;
  callbackUrl: string;
  reference?: string;
  metadata?: Record<string, unknown>;
}

export interface PaystackInitializeResult {
  success: boolean;
  authorizationUrl?: string;
  accessCode?: string;
  reference?: string;
  error?: string;
}

/**
 * Initialize a Paystack transaction.
 * Amount is in kobo (₦1 = 100 kobo).
 */
export async function initializeTransaction(
  input: PaystackInitializeInput
): Promise<PaystackInitializeResult> {
  try {
    const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: input.amountKobo,
        email: input.email,
        callback_url: input.callbackUrl,
        reference: input.reference,
        metadata: input.metadata,
        currency: 'NGN',
      }),
    });

    const data = (await response.json()) as {
      status: boolean;
      message: string;
      data?: {
        authorization_url: string;
        access_code: string;
        reference: string;
      };
    };

    if (!data.status || !data.data) {
      return { success: false, error: data.message || 'Paystack initialization failed' };
    }

    return {
      success: true,
      authorizationUrl: data.data.authorization_url,
      accessCode: data.data.access_code,
      reference: data.data.reference,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Paystack API call failed';
    return { success: false, error: message };
  }
}

/**
 * Verify Paystack webhook signature using HMAC-SHA512.
 * Returns true if the signature is valid.
 */
export function verifyWebhookSignature(payload: string, signature: string): boolean {
  if (!PAYSTACK_SECRET_KEY || !signature || !payload) {
    return false;
  }

  const hash = crypto
    .createHmac('sha512', PAYSTACK_SECRET_KEY)
    .update(payload)
    .digest('hex');

  return hash === signature;
}

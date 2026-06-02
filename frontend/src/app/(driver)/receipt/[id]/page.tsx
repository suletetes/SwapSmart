'use client';

import React, { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/auth.store';

interface SwapReceipt {
  receiptId: string;
  stationName: string;
  stationAddress: string;
  dateTime: string;
  batteryReceived: { id: string; chargeLevel: number };
  batteryReturned: { id: string; chargeLevel: number };
  amount: number;
  paymentMethod: string;
  healthScore: number;
  estimatedRange: number;
  savings: number;
  cumulativeSavings: number;
}

export default function ReceiptPage() {
  const router = useRouter();
  const params = useParams();
  const receiptId = params.id as string;
  const token = useAuthStore((s) => s.tokens?.accessToken);
  const [rating, setRating] = useState(0);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [showSuccess] = useState(true);

  const { data: receipt, isLoading } = useQuery({
    queryKey: ['receipt', receiptId],
    queryFn: async () => {
      const response = await fetch(`/api/v1/swaps/${receiptId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch receipt');
      return response.json() as Promise<SwapReceipt>;
    },
    enabled: !!receiptId && !!token,
  });

  // Fallback mock data for demo
  const displayReceipt: SwapReceipt = receipt || {
    receiptId: receiptId || 'RCP-2026-0001',
    stationName: 'GreenCharge Ikeja',
    stationAddress: '15 Allen Avenue, Ikeja, Lagos',
    dateTime: new Date().toISOString(),
    batteryReceived: { id: 'BAT-047', chargeLevel: 100 },
    batteryReturned: { id: 'BAT-023', chargeLevel: 8 },
    amount: 1500,
    paymentMethod: 'Wallet Balance',
    healthScore: 94,
    estimatedRange: 60,
    savings: 4500,
    cumulativeSavings: 4500,
  };

  const handleRating = async (stars: number) => {
    setRating(stars);
    try {
      await fetch(`/api/v1/swaps/${receiptId}/rate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ rating: stars }),
      });
      setRatingSubmitted(true);
    } catch {
      // Rating submission failed silently
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: 'SwapSmart Receipt',
      text: `Battery swap at ${displayReceipt.stationName} - ₦${displayReceipt.amount.toLocaleString()}. Receipt: ${displayReceipt.receiptId}`,
    };
    if (navigator.share) {
      await navigator.share(shareData);
    } else {
      await navigator.clipboard.writeText(shareData.text);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background-light dark:bg-background-dark">
        <div className="animate-pulse text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-700 mx-auto" />
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-48 mx-auto" />
          <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded-card w-72 mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background-light dark:bg-background-dark pb-8">
      {/* Success animation header */}
      {showSuccess && (
        <div className="bg-primary pt-12 pb-8 px-6 text-center rounded-b-[32px] motion-safe:animate-fade-in">
          {/* Green checkmark animation */}
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/20 mb-4">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-heading font-bold text-white mb-1">
            Swap Complete!
          </h1>
          <p className="text-sm text-white/80">
            Your battery has been swapped successfully
          </p>
        </div>
      )}

      <div className="px-4 -mt-4 space-y-4">
        {/* Receipt card */}
        <div className="bg-surface-light dark:bg-surface-dark rounded-card shadow-elevated p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-border-light dark:border-border-dark pb-3">
            <h2 className="text-base font-heading font-semibold text-text-primary-light dark:text-text-primary-dark">
              Receipt
            </h2>
            <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark font-mono">
              {displayReceipt.receiptId}
            </span>
          </div>

          {/* Station */}
          <ReceiptRow label="Station" value={displayReceipt.stationName} />
          
          {/* Date/Time */}
          <ReceiptRow
            label="Date & Time"
            value={new Date(displayReceipt.dateTime).toLocaleString('en-NG', {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          />

          {/* Battery received */}
          <ReceiptRow
            label="Battery received"
            value={`#${displayReceipt.batteryReceived.id} • ${displayReceipt.batteryReceived.chargeLevel}%`}
            valueColor="text-success"
          />

          {/* Battery returned */}
          <ReceiptRow
            label="Battery returned"
            value={`#${displayReceipt.batteryReturned.id} • ${displayReceipt.batteryReturned.chargeLevel}%`}
            valueColor="text-error"
          />

          {/* Amount */}
          <div className="flex items-center justify-between pt-3 border-t border-border-light dark:border-border-dark">
            <span className="text-sm font-semibold text-text-primary-light dark:text-text-primary-dark">Amount</span>
            <span className="text-lg font-bold text-primary">₦{displayReceipt.amount.toLocaleString()}</span>
          </div>

          {/* Payment method */}
          <ReceiptRow label="Payment" value={displayReceipt.paymentMethod} />
        </div>

        {/* Battery health summary */}
        <div className="bg-surface-light dark:bg-surface-dark rounded-card shadow-soft p-5">
          <h3 className="text-sm font-heading font-semibold text-text-primary-light dark:text-text-primary-dark mb-3">
            Battery Health Summary
          </h3>
          <div className="flex items-center gap-6">
            {/* Health score circle */}
            <div className="relative w-16 h-16 flex-shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64" aria-hidden="true">
                <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="4" className="text-gray-200 dark:text-gray-700" />
                <circle
                  cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="4"
                  strokeDasharray={`${2 * Math.PI * 28 * (displayReceipt.healthScore / 100)} ${2 * Math.PI * 28}`}
                  strokeLinecap="round"
                  className="text-primary"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-bold text-text-primary-light dark:text-text-primary-dark">
                  {displayReceipt.healthScore}
                </span>
              </div>
            </div>
            <div>
              <p className="text-sm text-text-primary-light dark:text-text-primary-dark font-medium">
                Score: {displayReceipt.healthScore}/100
              </p>
              <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
                Est. range: {displayReceipt.estimatedRange}km
              </p>
            </div>
          </div>
        </div>

        {/* Station rating */}
        <div className="bg-surface-light dark:bg-surface-dark rounded-card shadow-soft p-5 text-center">
          <h3 className="text-sm font-heading font-semibold text-text-primary-light dark:text-text-primary-dark mb-3">
            Rate this station
          </h3>
          <div className="flex justify-center gap-2" role="radiogroup" aria-label="Station rating">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => handleRating(star)}
                disabled={ratingSubmitted}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center focus-visible:ring-2 focus-visible:ring-primary rounded"
                aria-label={`${star} star${star > 1 ? 's' : ''}`}
                aria-pressed={rating >= star}
              >
                <svg
                  className={`w-8 h-8 transition-colors ${
                    rating >= star ? 'text-accent fill-accent' : 'text-gray-300 dark:text-gray-600'
                  }`}
                  viewBox="0 0 24 24"
                  fill={rating >= star ? 'currentColor' : 'none'}
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </button>
            ))}
          </div>
          {ratingSubmitted && (
            <p className="text-xs text-success mt-2">Thanks for your rating!</p>
          )}
        </div>

        {/* Savings tracker */}
        <div className="bg-gradient-to-r from-primary/10 to-success/10 dark:from-primary/20 dark:to-success/20 rounded-card p-4 text-center border border-primary/20">
          <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mb-1">
            💰 Savings vs petrol today
          </p>
          <p className="text-lg font-bold text-primary">
            You&apos;ve saved ₦{displayReceipt.cumulativeSavings.toLocaleString()} vs petrol today!
          </p>
        </div>

        {/* Action buttons */}
        <div className="space-y-3 pt-2">
          <Button fullWidth variant="outlined" onClick={handleShare} leftIcon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          }>
            Share Receipt
          </Button>
          <Button fullWidth variant="primary" onClick={() => router.push('/')}>
            Back to Map
          </Button>
        </div>
      </div>
    </div>
  );
}

interface ReceiptRowProps {
  label: string;
  value: string;
  valueColor?: string;
}

function ReceiptRow({ label, value, valueColor }: ReceiptRowProps) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-text-secondary-light dark:text-text-secondary-dark">{label}</span>
      <span className={`text-sm font-medium ${valueColor || 'text-text-primary-light dark:text-text-primary-dark'}`}>
        {value}
      </span>
    </div>
  );
}

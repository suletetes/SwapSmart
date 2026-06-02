'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { ModalSheet } from '@/components/ui/ModalSheet';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAuthStore } from '@/stores/auth.store';

interface WalletData {
  balance: number;
  transactions: Transaction[];
}

interface Transaction {
  id: string;
  type: 'CREDIT' | 'DEBIT';
  amount: number;
  description: string;
  reference: string;
  createdAt: string;
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
}

interface PaymentMethod {
  id: string;
  type: 'card' | 'bank';
  label: string;
  last4: string;
  isDefault: boolean;
}

const QUICK_AMOUNTS = [1000, 2000, 5000, 10000];
const MIN_AMOUNT = 100;
const MAX_AMOUNT = 500000;

export default function WalletPage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.tokens?.accessToken);
  const queryClient = useQueryClient();

  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState<number | ''>('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [topUpError, setTopUpError] = useState('');
  const [paymentFailed, setPaymentFailed] = useState(false);

  // Fetch wallet data
  const { data: wallet, isLoading, isError, refetch } = useQuery({
    queryKey: ['wallet'],
    queryFn: async () => {
      const response = await fetch('/api/v1/wallet', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch wallet');
      return response.json() as Promise<WalletData>;
    },
    enabled: !!token,
  });

  // Mock payment methods
  const paymentMethods: PaymentMethod[] = [
    { id: 'pm-1', type: 'card', label: 'Visa', last4: '4242', isDefault: true },
    { id: 'pm-2', type: 'bank', label: 'GTBank', last4: '1234', isDefault: false },
  ];

  // Top-up mutation
  const topUpMutation = useMutation({
    mutationFn: async (amount: number) => {
      const response = await fetch('/api/v1/wallet/topup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount, paymentMethodId: selectedPaymentMethod }),
      });
      if (!response.ok) throw new Error('Payment failed');
      return response.json();
    },
    onSuccess: () => {
      setShowTopUpModal(false);
      setTopUpAmount('');
      setPaymentFailed(false);
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
    },
    onError: () => {
      setPaymentFailed(true);
    },
  });

  const handleTopUp = () => {
    setTopUpError('');
    const amount = Number(topUpAmount);
    if (!amount || amount < MIN_AMOUNT || amount > MAX_AMOUNT) {
      setTopUpError(`Amount must be between ₦${MIN_AMOUNT.toLocaleString()} and ₦${MAX_AMOUNT.toLocaleString()}`);
      return;
    }
    if (!selectedPaymentMethod) {
      setTopUpError('Please select a payment method');
      return;
    }
    topUpMutation.mutate(amount);
  };

  const displayBalance = wallet?.balance ?? 12500;
  const transactions = wallet?.transactions ?? [];

  return (
    <div className="min-h-dvh bg-background-light dark:bg-background-dark pb-8">
      {/* Header */}
      <header className="flex items-center px-4 py-3 bg-surface-light dark:bg-surface-dark border-b border-border-light dark:border-border-dark">
        <button
          onClick={() => router.back()}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Go back"
        >
          <svg className="w-5 h-5 text-text-primary-light dark:text-text-primary-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="flex-1 text-center text-base font-heading font-semibold text-text-primary-light dark:text-text-primary-dark">
          Wallet
        </h1>
        <div className="w-[44px]" /> {/* Spacer for centering */}
      </header>

      <div className="px-4 pt-4 space-y-5">
        {/* Balance card */}
        <div className="bg-gradient-to-br from-primary to-emerald-600 rounded-card p-6 shadow-elevated text-white">
          <p className="text-sm opacity-80 mb-1">Available Balance</p>
          <p className="text-3xl font-bold mb-6" aria-label={`Balance: ${displayBalance.toLocaleString()} Naira`}>
            ₦{displayBalance.toLocaleString()}
          </p>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setShowTopUpModal(true);
                setPaymentFailed(false);
                setTopUpError('');
              }}
              className="!bg-white/20 !text-white hover:!bg-white/30 flex-1"
            >
              Top Up
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="!bg-white/10 !text-white hover:!bg-white/20 flex-1"
            >
              Withdraw
            </Button>
          </div>
        </div>

        {/* Quick top-up amounts */}
        <div>
          <h2 className="text-sm font-heading font-semibold text-text-primary-light dark:text-text-primary-dark mb-3">
            Quick Top-Up
          </h2>
          <div className="grid grid-cols-4 gap-2">
            {QUICK_AMOUNTS.map((amount) => (
              <button
                key={amount}
                onClick={() => {
                  setTopUpAmount(amount);
                  setSelectedPaymentMethod(paymentMethods[0]?.id || '');
                  setShowTopUpModal(true);
                  setPaymentFailed(false);
                  setTopUpError('');
                }}
                className="min-h-[44px] px-2 py-3 rounded-button border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark text-sm font-medium text-text-primary-light dark:text-text-primary-dark hover:border-primary hover:text-primary transition-colors focus-visible:ring-2 focus-visible:ring-primary"
              >
                ₦{amount.toLocaleString()}
              </button>
            ))}
          </div>
        </div>

        {/* Payment methods */}
        <div>
          <h2 className="text-sm font-heading font-semibold text-text-primary-light dark:text-text-primary-dark mb-3">
            Payment Methods
          </h2>
          <div className="space-y-2">
            {paymentMethods.map((method) => (
              <div
                key={method.id}
                className="flex items-center gap-3 p-4 rounded-card bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  {method.type === 'card' ? (
                    <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-text-primary-light dark:text-text-primary-dark">
                    {method.label} •••• {method.last4}
                  </p>
                </div>
                {method.isDefault && (
                  <span className="px-2 py-1 text-xs font-medium bg-primary/10 text-primary rounded-full">
                    Default
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Recent transactions */}
        <div>
          <h2 className="text-sm font-heading font-semibold text-text-primary-light dark:text-text-primary-dark mb-3">
            Recent Transactions
          </h2>

          {isLoading && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-4 rounded-card bg-surface-light dark:bg-surface-dark animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700" />
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-1" />
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                    </div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!isLoading && transactions.length === 0 && (
            <EmptyState
              message="No transactions yet"
              description="Your transaction history will appear here after your first top-up or swap."
              icon={
                <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              }
            />
          )}

          {!isLoading && transactions.length > 0 && (
            <div className="space-y-2">
              {transactions.slice(0, 20).map((tx) => (
                <TransactionItem key={tx.id} transaction={tx} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Top-up Modal (Bottom Sheet) */}
      <ModalSheet
        isOpen={showTopUpModal}
        onClose={() => setShowTopUpModal(false)}
        title="Top Up Wallet"
      >
        <div className="space-y-5">
          {/* Payment failed state */}
          {paymentFailed && (
            <div className="p-4 rounded-card bg-error/10 border border-error/20">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm font-medium text-error">Payment failed</p>
              </div>
              <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
                Your payment could not be processed. Please try again or use a different payment method.
              </p>
            </div>
          )}

          {/* Amount input */}
          <div>
            <label htmlFor="topup-amount" className="block text-sm font-medium text-text-primary-light dark:text-text-primary-dark mb-2">
              Amount (₦)
            </label>
            <input
              id="topup-amount"
              type="number"
              min={MIN_AMOUNT}
              max={MAX_AMOUNT}
              value={topUpAmount}
              onChange={(e) => {
                setTopUpAmount(e.target.value ? Number(e.target.value) : '');
                setTopUpError('');
              }}
              placeholder="Enter amount"
              className="w-full min-h-[44px] px-4 py-3 text-lg font-semibold border border-border-light dark:border-border-dark rounded-button bg-background-light dark:bg-background-dark text-text-primary-light dark:text-text-primary-dark placeholder:text-text-secondary-light/50 focus:outline-none focus:ring-2 focus:ring-primary"
              aria-describedby="amount-hint"
            />
            <p id="amount-hint" className="text-xs text-text-secondary-light dark:text-text-secondary-dark mt-1">
              Min ₦{MIN_AMOUNT.toLocaleString()} — Max ₦{MAX_AMOUNT.toLocaleString()}
            </p>
          </div>

          {/* Quick amount chips */}
          <div className="flex gap-2 flex-wrap">
            {QUICK_AMOUNTS.map((amount) => (
              <button
                key={amount}
                onClick={() => { setTopUpAmount(amount); setTopUpError(''); }}
                className={`min-h-[44px] px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  topUpAmount === amount
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-text-secondary-light dark:text-text-secondary-dark hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                ₦{amount.toLocaleString()}
              </button>
            ))}
          </div>

          {/* Payment method selection */}
          <div>
            <label className="block text-sm font-medium text-text-primary-light dark:text-text-primary-dark mb-2">
              Payment Method
            </label>
            <div className="space-y-2">
              {paymentMethods.map((method) => (
                <button
                  key={method.id}
                  onClick={() => setSelectedPaymentMethod(method.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-button border transition-colors min-h-[44px] ${
                    selectedPaymentMethod === method.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border-light dark:border-border-dark'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedPaymentMethod === method.id ? 'border-primary' : 'border-gray-300 dark:border-gray-600'
                  }`}>
                    {selectedPaymentMethod === method.id && (
                      <div className="w-3 h-3 rounded-full bg-primary" />
                    )}
                  </div>
                  <span className="text-sm text-text-primary-light dark:text-text-primary-dark">
                    {method.label} •••• {method.last4}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Error message */}
          {topUpError && (
            <p className="text-sm text-error" role="alert">{topUpError}</p>
          )}

          {/* Pay button */}
          <Button
            fullWidth
            size="lg"
            variant="primary"
            onClick={handleTopUp}
            isLoading={topUpMutation.isPending}
            disabled={!topUpAmount || topUpMutation.isPending}
          >
            {topUpAmount ? `Pay ₦${Number(topUpAmount).toLocaleString()}` : 'Enter amount'}
          </Button>

          {/* Secured note */}
          <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark text-center flex items-center justify-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Secured by Paystack
          </p>
        </div>
      </ModalSheet>
    </div>
  );
}

function TransactionItem({ transaction }: { transaction: Transaction }) {
  const isCredit = transaction.type === 'CREDIT';

  return (
    <div className="flex items-center gap-3 p-4 rounded-card bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
        isCredit ? 'bg-success/10' : 'bg-error/10'
      }`}>
        <svg className={`w-5 h-5 ${isCredit ? 'text-success' : 'text-error'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          {isCredit ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
          )}
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary-light dark:text-text-primary-dark truncate">
          {transaction.description}
        </p>
        <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
          {new Date(transaction.createdAt).toLocaleDateString('en-NG', { dateStyle: 'medium' })}
        </p>
      </div>
      <span className={`text-sm font-semibold ${isCredit ? 'text-success' : 'text-error'}`}>
        {isCredit ? '+' : '-'}₦{transaction.amount.toLocaleString()}
      </span>
    </div>
  );
}

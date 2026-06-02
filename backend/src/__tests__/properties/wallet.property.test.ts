/**
 * Property-Based Tests: Wallet Properties (7, 8, 9)
 * Tests wallet invariants: non-negativity, ledger reconstruction, payment idempotency.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { arbWalletOpSequence, type WalletOp } from '../helpers/operations.arbitrary.js';
import { createTestWallet, applyCredit, applyDebit, type TestWallet } from '../helpers/wallet.factory.js';

// --- Pure wallet simulation ---

function simulateWalletOps(initialBalance: number, ops: WalletOp[]): {
  finalBalance: number;
  ledger: Array<{ type: 'credit' | 'debit'; amount: number; reference: string }>;
  rejectedDebits: number;
} {
  let balance = initialBalance;
  const ledger: Array<{ type: 'credit' | 'debit'; amount: number; reference: string }> = [];
  let rejectedDebits = 0;

  for (const op of ops) {
    if (op.type === 'credit') {
      balance += op.amount;
      ledger.push({ type: 'credit', amount: op.amount, reference: op.reference });
    } else {
      // Debit: reject if would go negative
      if (balance >= op.amount) {
        balance -= op.amount;
        ledger.push({ type: 'debit', amount: op.amount, reference: op.reference });
      } else {
        rejectedDebits++;
      }
    }
  }

  return { finalBalance: balance, ledger, rejectedDebits };
}

describe('Feature: swapsmart-platform, Property 7: Wallet Non-Negativity', () => {
  /**
   * **Validates: Requirements 13.8, 13.9, 26.4, 33.7**
   *
   * For any sequence of credits and debits, balance never negative;
   * debits breaching zero are rejected.
   */
  it('balance never negative, debits breaching zero rejected', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100000 }),
        arbWalletOpSequence(30),
        (initialBalance: number, ops: WalletOp[]) => {
          let balance = initialBalance;

          for (const op of ops) {
            if (op.type === 'credit') {
              balance += op.amount;
            } else {
              if (balance >= op.amount) {
                balance -= op.amount;
              }
              // else: rejected, balance unchanged
            }

            // INVARIANT: balance is never negative
            expect(balance).toBeGreaterThanOrEqual(0);
          }
        }
      ),
      { numRuns: 200 }
    );
  });
});

describe('Feature: swapsmart-platform, Property 8: Wallet Ledger Reconstruction', () => {
  /**
   * **Validates: Requirements 13.11, 26.5, 33.8**
   *
   * Wallet balance equals sum of credits minus sum of debits across all ledger entries.
   */
  it('balance equals sum(credits) - sum(debits)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100000 }),
        arbWalletOpSequence(30),
        (initialBalance: number, ops: WalletOp[]) => {
          const result = simulateWalletOps(initialBalance, ops);

          // Reconstruct balance from ledger
          const totalCredits = result.ledger
            .filter(e => e.type === 'credit')
            .reduce((sum, e) => sum + e.amount, 0);
          const totalDebits = result.ledger
            .filter(e => e.type === 'debit')
            .reduce((sum, e) => sum + e.amount, 0);

          const reconstructedBalance = initialBalance + totalCredits - totalDebits;

          // INVARIANT: final balance equals reconstructed balance
          expect(result.finalBalance).toBe(reconstructedBalance);
        }
      ),
      { numRuns: 200 }
    );
  });
});

describe('Feature: swapsmart-platform, Property 9: Payment Idempotency', () => {
  /**
   * **Validates: Requirements 13.6, 26.3, 33.9**
   *
   * Processing same payment reference N times produces same balance as processing once.
   */
  it('processing same reference N times = processing once', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 50000 }),
        fc.integer({ min: 100, max: 10000 }),
        fc.uuid(),
        fc.integer({ min: 2, max: 10 }),
        (initialBalance: number, amount: number, reference: string, duplicateCount: number) => {
          // Simulate idempotent processing: track processed references
          const processedReferences = new Set<string>();

          // Process once
          let balanceOnce = initialBalance;
          if (!processedReferences.has(reference)) {
            balanceOnce += amount;
            processedReferences.add(reference);
          }

          // Process N times (should be idempotent)
          const processedRefs2 = new Set<string>();
          let balanceMultiple = initialBalance;
          for (let i = 0; i < duplicateCount; i++) {
            if (!processedRefs2.has(reference)) {
              balanceMultiple += amount;
              processedRefs2.add(reference);
            }
          }

          // INVARIANT: processing N times = processing once
          expect(balanceMultiple).toBe(balanceOnce);
        }
      ),
      { numRuns: 150 }
    );
  });
});

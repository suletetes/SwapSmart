/**
 * Wallet Factory — creates test wallets with configurable balances
 */

export interface TestLedgerEntry {
  entryId: string;
  type: 'CREDIT' | 'DEBIT';
  amount: number;
  reference: string;
  source: string;
  description: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  timestamp: string;
  balanceAfter?: number;
}

export interface TestWallet {
  userId: string;
  balance: number;
  ledger: TestLedgerEntry[];
}

let walletCounter = 0;
let entryCounter = 0;

export interface WalletFactoryOptions {
  userId?: string;
  balance?: number;
  ledgerEntries?: Partial<TestLedgerEntry>[];
}

export function createTestWallet(options: WalletFactoryOptions = {}): TestWallet {
  walletCounter++;
  const userId = options.userId || `user-${walletCounter}`;
  const balance = options.balance ?? 5000;

  const ledger: TestLedgerEntry[] = (options.ledgerEntries || []).map((e) => ({
    entryId: e.entryId || `entry-${++entryCounter}`,
    type: e.type || 'CREDIT',
    amount: e.amount ?? 1000,
    reference: e.reference || `ref-${entryCounter}`,
    source: e.source || 'PAYSTACK_TOPUP',
    description: e.description || 'Test entry',
    status: e.status || 'COMPLETED',
    timestamp: e.timestamp || new Date().toISOString(),
    balanceAfter: e.balanceAfter,
  }));

  return { userId, balance, ledger };
}

/**
 * Apply a credit to a test wallet (pure logic, no DB)
 */
export function applyCredit(wallet: TestWallet, amount: number, reference: string): TestWallet {
  const newBalance = wallet.balance + amount;
  const entry: TestLedgerEntry = {
    entryId: `entry-${++entryCounter}`,
    type: 'CREDIT',
    amount,
    reference,
    source: 'PAYSTACK_TOPUP',
    description: `Credit ₦${amount}`,
    status: 'COMPLETED',
    timestamp: new Date().toISOString(),
    balanceAfter: newBalance,
  };
  return { ...wallet, balance: newBalance, ledger: [...wallet.ledger, entry] };
}

/**
 * Apply a debit to a test wallet (pure logic, no DB).
 * Returns null if insufficient balance.
 */
export function applyDebit(wallet: TestWallet, amount: number, reference: string): TestWallet | null {
  if (wallet.balance < amount) return null;
  const newBalance = wallet.balance - amount;
  const entry: TestLedgerEntry = {
    entryId: `entry-${++entryCounter}`,
    type: 'DEBIT',
    amount,
    reference,
    source: 'SWAP',
    description: `Debit ₦${amount}`,
    status: 'COMPLETED',
    timestamp: new Date().toISOString(),
    balanceAfter: newBalance,
  };
  return { ...wallet, balance: newBalance, ledger: [...wallet.ledger, entry] };
}

export function resetWalletCounters(): void {
  walletCounter = 0;
  entryCounter = 0;
}

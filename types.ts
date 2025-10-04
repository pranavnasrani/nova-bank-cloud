// FIX: The import of `Card` from './types' was removed as it caused a conflict with the local declaration of `Card`.
export interface Card {
  cardNumber: string;
  expiryDate: string;
  cvv: string;
  cardType: 'Visa' | 'Mastercard';
  creditLimit: number;
  creditBalance: number;
  apr: number; // Annual Percentage Rate
  paymentDueDate: string;
  statementBalance: number;
  minimumPayment: number;
  transactions: Transaction[];
}

export interface Loan {
  id: string;
  userId: string;
  loanAmount: number;
  interestRate: number; // Annual percentage
  termMonths: number;
  monthlyPayment: number;
  remainingBalance: number;
  status: 'Active' | 'Paid Off';
  startDate: string;
  paymentDueDate: string;
}

export interface User {
  id: string; // Corresponds to Firebase Auth UID
  name: string;
  email: string;
  balance: number;
  savingsAccountNumber: string;
  investmentAccountNumber?: string;
  avatarUrl: string;
  cards: Card[];
  loans: Loan[];
}

export interface Transaction {
  id: string;
  userId: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  timestamp: string;
  partyName: string;
  category: string; // e.g., 'Groceries', 'Transport', 'Entertainment'
  cardId?: string; // Optional field to link transaction to a card
}
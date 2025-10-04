
import React, { useState, createContext, useEffect } from 'react';
import { generateMockCard, generateMockLoan, generateAccountNumber } from './constants';
import { User, Transaction, Card, Loan } from './types';
import { LoginScreen } from './components/LoginScreen';
import { Dashboard } from './components/Dashboard';
import { AnimatePresence, motion } from 'framer-motion';
import { WelcomeScreen } from './components/OnboardingScreen'; // Repurposed as WelcomeScreen
import { RegisterScreen } from './components/DataScreen'; // Repurposed as RegisterScreen
import { auth, db } from './services/firebase';
import { 
    onAuthStateChanged, 
    signInWithEmailAndPassword, 
    signOut, 
    createUserWithEmailAndPassword,
    User as FirebaseUser
} from 'firebase/auth';
import { 
    doc, 
    getDoc, 
    setDoc, 
    collection, 
    query, 
    where, 
    onSnapshot,
    runTransaction,
    addDoc,
    writeBatch,
    updateDoc,
    arrayUnion,
    getDocs
} from 'firebase/firestore';


export interface CardApplicationDetails {
    fullName: string;
    address: string;
    dateOfBirth: string;
    employmentStatus: string;
    employer: string;
    annualIncome: number;
}

export interface LoanApplicationDetails extends CardApplicationDetails {
    loanAmount: number;
    loanTerm: number;
}

interface BankContextType {
    currentUser: User | null;
    contacts: User[];
    transactions: Transaction[];
    login: (email: string, password: string) => Promise<boolean>;
    logout: () => void;
    registerUser: (name: string, email: string, password: string) => Promise<boolean>;
    transferMoney: (recipientIdentifier: string, amount: number) => Promise<{ success: boolean; message: string }>;
    addCardToUser: (details: CardApplicationDetails) => Promise<{ success: boolean; message: string; newCard?: Card }>;
    addLoanToUser: (details: LoanApplicationDetails) => Promise<{ success: boolean; message: string; newLoan?: Loan }>;
    requestPaymentExtension: (accountId: string, type: 'card' | 'loan') => Promise<{ success: boolean; message: string; newDueDate?: string }>;
}

export const BankContext = createContext<BankContextType>(null!);

type AuthScreen = 'welcome' | 'login' | 'register';

export default function App() {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [contacts, setContacts] = useState<User[]>([]);
    const [authScreen, setAuthScreen] = useState<AuthScreen>('welcome');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (authUser) => {
            if (authUser) {
                const userDocRef = doc(db, 'users', authUser.uid);
                const unsubscribeUser = onSnapshot(userDocRef, (doc) => {
                    if (doc.exists()) {
                        setCurrentUser({ id: doc.id, ...doc.data() } as User);
                    }
                });

                const transactionsQuery = query(collection(db, 'transactions'), where('userId', '==', authUser.uid));
                const unsubscribeTransactions = onSnapshot(transactionsQuery, (snapshot) => {
                    const userTransactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
                    setTransactions(userTransactions);
                });
                
                const contactsQuery = query(collection(db, 'users'));
                const unsubscribeContacts = onSnapshot(contactsQuery, (snapshot) => {
                    const allUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
                    setContacts(allUsers);
                });

                setLoading(false);
                return () => {
                    unsubscribeUser();
                    unsubscribeTransactions();
                    unsubscribeContacts();
                };
            } else {
                setCurrentUser(null);
                setTransactions([]);
                setContacts([]);
                setLoading(false);
            }
        });

        return () => unsubscribeAuth();
    }, []);


    const login = async (email: string, password: string): Promise<boolean> => {
        try {
            await signInWithEmailAndPassword(auth, email, password);
            return true;
        } catch (error) {
            console.error("Login failed:", error);
            return false;
        }
    };

    const logout = async () => {
        try {
            await signOut(auth);
            setAuthScreen('welcome');
        } catch (error) {
            console.error("Logout failed:", error);
        }
    };

    const registerUser = async (name: string, email: string, password: string): Promise<boolean> => {
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const firebaseUser = userCredential.user;

            const newUser: Omit<User, 'id'> = {
                name,
                email,
                balance: 1000, // Starting balance
                savingsAccountNumber: generateAccountNumber(),
                avatarUrl: `https://picsum.photos/seed/${email}/100`,
                cards: [generateMockCard()],
                loans: [],
            };

            await setDoc(doc(db, "users", firebaseUser.uid), newUser);
            return true;
        } catch (error) {
            console.error("Registration failed:", error);
            return false;
        }
    }

    const transferMoney = async (recipientIdentifier: string, amount: number): Promise<{ success: boolean; message: string }> => {
        if (!currentUser) return { success: false, message: 'Error: You are not logged in.' };
        if (amount <= 0) return { success: false, message: 'Error: Payment amount must be positive.' };

        try {
            await runTransaction(db, async (transaction) => {
                const senderDocRef = doc(db, 'users', currentUser.id);
                
                // Find recipient
                const nameQuery = query(collection(db, 'users'), where('name', '==', recipientIdentifier));
                const accountQuery = query(collection(db, 'users'), where('savingsAccountNumber', '==', recipientIdentifier));
                
                const nameSnapshot = await getDocs(nameQuery);
                const accountSnapshot = await getDocs(accountQuery);

                let recipientDoc;
                if (!nameSnapshot.empty) {
                    recipientDoc = nameSnapshot.docs[0];
                } else if (!accountSnapshot.empty) {
                    recipientDoc = accountSnapshot.docs[0];
                } else {
                    throw new Error(`Contact or account "${recipientIdentifier}" not found.`);
                }
                
                const recipientDocRef = recipientDoc.ref;
                const senderDoc = await transaction.get(senderDocRef);
                const recipientData = recipientDoc.data() as User;

                if (!senderDoc.exists()) throw new Error("Sender document does not exist!");

                if (senderDoc.id === recipientDoc.id) throw new Error('Cannot send money to yourself.');
                
                const senderBalance = senderDoc.data().balance;
                if (senderBalance < amount) throw new Error(`Insufficient funds. Your balance is $${senderBalance.toFixed(2)}.`);

                // Update balances
                transaction.update(senderDocRef, { balance: senderBalance - amount });
                transaction.update(recipientDocRef, { balance: recipientData.balance + amount });
                
                const timestamp = new Date().toISOString();
                const transactionsCollection = collection(db, 'transactions');
                
                // Create transaction logs
                transaction.set(doc(transactionsCollection), {
                    userId: currentUser.id, type: 'debit', amount, description: `Payment to ${recipientData.name}`, timestamp, partyName: recipientData.name, category: 'Transfers',
                });
                 transaction.set(doc(transactionsCollection), {
                    userId: recipientDoc.id, type: 'credit', amount, description: `Payment from ${currentUser.name}`, timestamp, partyName: currentUser.name, category: 'Transfers',
                });
            });
            return { success: true, message: `Success! You sent $${amount.toFixed(2)}.` };
        } catch (e: any) {
            return { success: false, message: `Error: ${e.message}` };
        }
    };
    
    const addCardToUser = async (details: CardApplicationDetails): Promise<{ success: boolean; message: string; newCard?: Card }> => {
        if (!currentUser) return { success: false, message: 'Error: You are not logged in.' };

        if (Math.random() < 0.2) { // 20% rejection rate
             return { success: false, message: `We're sorry, ${details.fullName}, but we were unable to approve your credit card application at this time.` };
        }

        const newCard = generateMockCard();
        try {
            const userDocRef = doc(db, 'users', currentUser.id);
            await updateDoc(userDocRef, {
                cards: arrayUnion(newCard)
            });
            return { success: true, message: `Congratulations, ${details.fullName}! Your new ${newCard.cardType} card has been approved.`, newCard };
        } catch(e) {
            console.error(e);
            return { success: false, message: 'An error occurred while adding the card.' };
        }
    };

    const addLoanToUser = async (details: LoanApplicationDetails): Promise<{ success: boolean; message: string; newLoan?: Loan }> => {
        if (!currentUser) return { success: false, message: 'Error: You are not logged in.' };
        
        if (Math.random() < 0.3) { // 30% rejection rate
            return { success: false, message: `We're sorry, ${details.fullName}, but we were unable to approve your loan application for ${details.loanAmount} at this time.` };
        }

        const { loanAmount, loanTerm } = details;
        const interestRate = parseFloat((Math.random() * 10 + 3).toFixed(2));
        const monthlyInterestRate = interestRate / 100 / 12;
        const monthlyPayment = (loanAmount * monthlyInterestRate * Math.pow(1 + monthlyInterestRate, loanTerm)) / (Math.pow(1 + monthlyInterestRate, loanTerm) - 1);
        const paymentDueDate = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString();

        const newLoan: Loan = {
            id: `loan-${currentUser.id}-${Date.now()}`, userId: currentUser.id, loanAmount, interestRate, termMonths: loanTerm,
            monthlyPayment: parseFloat(monthlyPayment.toFixed(2)), remainingBalance: loanAmount, status: 'Active',
            startDate: new Date().toISOString(), paymentDueDate,
        };

        try {
            const userDocRef = doc(db, 'users', currentUser.id);
            const newBalance = currentUser.balance + loanAmount;
            
            const batch = writeBatch(db);
            batch.update(userDocRef, {
                loans: arrayUnion(newLoan),
                balance: newBalance,
            });
            batch.set(doc(collection(db, 'transactions')), {
                 id: `t-loan-${newLoan.id}`, userId: currentUser.id, type: 'credit', amount: loanAmount,
                 description: `Loan Disbursement`, timestamp: new Date().toISOString(), partyName: "Nova Bank Loans", category: 'Income',
            });
            
            await batch.commit();

            return { success: true, message: `Congratulations! Your loan for $${loanAmount.toFixed(2)} has been approved. The funds are now available in your account.`, newLoan };
        } catch (e) {
            console.error(e);
            return { success: false, message: 'An error occurred while processing your loan.' };
        }
    };

    const requestPaymentExtension = async (accountId: string, type: 'card' | 'loan'): Promise<{ success: boolean; message: string; newDueDate?: string }> => {
        if (!currentUser) return { success: false, message: 'Error: You are not logged in.' };
        
        if (Math.random() < 0.1) { // 10% rejection rate
             return { success: false, message: `We're sorry, but we were unable to process a payment extension for this account at this time.` };
        }
        
        let newDueDate: Date | null = null;
        let message = '';
        const updatedUser = { ...currentUser };

        if (type === 'card') {
            const cardIndex = updatedUser.cards.findIndex(c => c.cardNumber.slice(-4) === accountId);
            if (cardIndex === -1) return { success: false, message: `Error: Card ending in ${accountId} not found.`};
            const originalDueDate = new Date(updatedUser.cards[cardIndex].paymentDueDate);
            newDueDate = new Date(originalDueDate.setDate(originalDueDate.getDate() + 14));
            updatedUser.cards[cardIndex].paymentDueDate = newDueDate.toISOString();
            message = `Success! Your payment due date for the card ending in ${accountId} has been extended to`;

        } else if (type === 'loan') {
            const loanIndex = updatedUser.loans.findIndex(l => l.id === accountId);
            if (loanIndex === -1) return { success: false, message: `Error: Loan with ID ${accountId} not found.`};
            const originalDueDate = new Date(updatedUser.loans[loanIndex].paymentDueDate);
            newDueDate = new Date(originalDueDate.setDate(originalDueDate.getDate() + 14));
            updatedUser.loans[loanIndex].paymentDueDate = newDueDate.toISOString();
            message = `Success! Your payment due date for loan ${accountId} has been extended to`;
        } else {
            return { success: false, message: `Invalid account type.` };
        }
        
        try {
            const userDocRef = doc(db, 'users', currentUser.id);
            await updateDoc(userDocRef, { cards: updatedUser.cards, loans: updatedUser.loans });
            const formattedDate = newDueDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
            return { success: true, message: `${message} ${formattedDate}.`, newDueDate: newDueDate.toISOString() };
        } catch (e) {
            console.error(e);
            return { success: false, message: 'Error updating payment date.' };
        }
    };

    const contextValue = { currentUser, contacts, transactions, login, logout, registerUser, transferMoney, addCardToUser, addLoanToUser, requestPaymentExtension };

    if (loading) {
        return <div className="min-h-screen w-full bg-slate-900 grid place-items-center text-white">Loading...</div>; // Or a proper spinner
    }

    const screenKey = currentUser ? 'dashboard' : authScreen;
    
    const renderAuthScreen = () => {
        switch(authScreen) {
            case 'login':
                return <LoginScreen onLogin={login} onBack={() => setAuthScreen('welcome')} />;
            case 'register':
                return <RegisterScreen onRegister={registerUser} onBack={() => setAuthScreen('welcome')} />;
            case 'welcome':
            default:
                return <WelcomeScreen onNavigateToLogin={() => setAuthScreen('login')} onNavigateToRegister={() => setAuthScreen('register')} />;
        }
    }

    return (
        <BankContext.Provider value={contextValue}>
            <AnimatePresence mode="wait">
                <motion.div
                    key={screenKey}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5, ease: 'easeInOut' }}
                >
                    {currentUser ? <Dashboard /> : renderAuthScreen() }
                </motion.div>
            </AnimatePresence>
        </BankContext.Provider>
    );
}
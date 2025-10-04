

import { GoogleGenAI, FunctionDeclaration, Type, Chat, GenerateContentResponse } from '@google/genai';
import { Transaction } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
    console.warn("API_KEY is not set in environment variables.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const initiatePaymentFunctionDeclaration: FunctionDeclaration = {
    name: 'initiatePayment',
    description: 'Initiates a payment from the current user to a specified recipient.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            recipientName: {
                type: Type.STRING,
                description: "The full name or first name of the person to receive the money. This must be one of the available contacts. Use this OR recipientAccountNumber.",
            },
            recipientAccountNumber: {
                type: Type.STRING,
                description: "The 10-digit account number of the recipient. Use this OR recipientName.",
            },
            amount: {
                type: Type.NUMBER,
                description: 'The amount of money to send.',
            },
        },
        required: ['amount'],
    },
};

const getCardStatementDetailsFunctionDeclaration: FunctionDeclaration = {
    name: 'getCardStatementDetails',
    description: "Retrieves the current statement details for a user's credit card, including balance, minimum payment, and due date.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            cardLast4: { type: Type.STRING, description: "The last 4 digits of the card number to query. If not provided, defaults to the user's primary card." },
        },
        required: [],
    },
};

const getCardTransactionsFunctionDeclaration: FunctionDeclaration = {
    name: 'getCardTransactions',
    description: 'Fetches the recent transaction history for a specified credit card.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            cardLast4: { type: Type.STRING, description: "The last 4 digits of the card number. If not provided, defaults to the primary card." },
            limit: { type: Type.NUMBER, description: "The number of recent transactions to return. Defaults to 5." },
        },
        required: [],
    },
};

const requestPaymentExtensionFunctionDeclaration: FunctionDeclaration = {
    name: 'requestPaymentExtension',
    description: 'Requests a 14-day payment extension for a credit card or loan.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            accountType: { type: Type.STRING, description: "The type of account, either 'card' or 'loan'." },
            accountId: { type: Type.STRING, description: "The last 4 digits of the card number or the loan ID." },
        },
        required: ['accountType', 'accountId'],
    },
};


const applyForCreditCardFunctionDeclaration: FunctionDeclaration = {
    name: 'applyForCreditCard',
    description: 'Processes a new credit card application for the user. All necessary personal and financial information must be collected before calling this function.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            applicationDetails: {
                type: Type.OBJECT,
                description: "Object containing all user-provided application details.",
                properties: {
                    fullName: { type: Type.STRING, description: "The user's full legal name." },
                    address: { type: Type.STRING, description: "The user's full residential address." },
                    dateOfBirth: { type: Type.STRING, description: "The user's date of birth (e.g., YYYY-MM-DD)." },
                    employmentStatus: { type: Type.STRING, description: "e.g., Employed, Self-Employed, Unemployed." },
                    employer: { type: Type.STRING, description: "Name of the user's employer. Can be 'N/A'." },
                    annualIncome: { type: Type.NUMBER, description: "The user's total annual income." },
                },
                required: ['fullName', 'address', 'dateOfBirth', 'employmentStatus', 'employer', 'annualIncome']
            }
        },
        required: ['applicationDetails'],
    },
};

const applyForLoanFunctionDeclaration: FunctionDeclaration = {
    name: 'applyForLoan',
    description: 'Processes a new loan application for the user after collecting necessary personal and financial information.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            applicationDetails: {
                type: Type.OBJECT,
                description: "Object containing all user-provided loan application details.",
                properties: {
                    loanAmount: { type: Type.NUMBER, description: "The amount of money the user wants to borrow." },
                    // Re-use personal details for simplicity. The AI should collect these as well.
                    fullName: { type: Type.STRING, description: "The user's full legal name." },
                    address: { type: Type.STRING, description: "The user's full residential address." },
                    dateOfBirth: { type: Type.STRING, description: "The user's date of birth (e.g., YYYY-MM-DD)." },
                    employmentStatus: { type: Type.STRING, description: "e.g., Employed, Self-Employed, Unemployed." },
                    annualIncome: { type: Type.NUMBER, description: "The user's total annual income." },
                },
                required: ['loanAmount', 'fullName', 'address', 'dateOfBirth', 'employmentStatus', 'annualIncome']
            }
        },
        required: ['applicationDetails'],
    },
};

const getSpendingAnalysisFunctionDeclaration: FunctionDeclaration = {
    name: 'getSpendingAnalysis',
    description: 'Analyzes the user\'s spending habits over a specified period using AI. Covers both bank and card transactions.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            period: {
                type: Type.STRING,
                description: "The time period for the analysis, e.g., 'this month', 'last week', 'this year'. Defaults to 'this month'."
            },
        },
        required: [],
    },
};


export const createChatSession = (userFullName: string, contacts: string[], language: 'en' | 'es' | 'th' | 'tl'): Chat => {
    const model = 'gemini-2.5-flash';
    const langNameMap = {
        en: 'English',
        es: 'Spanish',
        th: 'Thai',
        tl: 'Tagalog'
    };
    const langName = langNameMap[language];

    const systemInstruction = `You are a world-class banking assistant named Nova for a user named ${userFullName}.
Your capabilities include initiating payments, providing card information, analyzing spending, processing applications, and handling payment extensions.

1.  **Payments**:
    - If the user asks to "send", "pay", "transfer", or similar, you MUST use the 'initiatePayment' tool.
    - You must have a recipient and an amount. The recipient can be identified by their name OR their account number. Prioritize using the account number if provided.
    - Available contacts by name are: ${contacts.join(', ')}. If a name doesn't match, inform the user. Do not hallucinate contacts.

2.  **Spending Analysis**:
    - If the user asks "how much did I spend", "what's my spending breakdown", "show my expenses", or similar, you MUST use the 'getSpendingAnalysis' tool.
    - This tool uses AI to provide a categorical breakdown of their spending from all their accounts for a given period.

3.  **Card & Account Information**:
    - If the user asks about their "bill," "statement," "due date," or "minimum payment," you MUST use the 'getCardStatementDetails' tool.
    - If the user asks for their "recent transactions," "spending history," or similar on a card, you MUST use the 'getCardTransactions' tool.
    - If a card is not specified, assume they mean their primary (first) card.

4.  **Payment Extensions**:
    - If the user says they "can't pay," "need more time," or asks for an "extension" on a bill or loan, you MUST use the 'requestPaymentExtension' tool.
    - You must ask for which account (card or loan) they need an extension on and get the last 4 digits of the card or the loan ID before calling the tool.

5.  **Credit Card Application**:
    - If the user expresses intent to "apply for a credit card," you MUST use the 'applyForCreditCard' tool.
    - Before calling the tool, you MUST collect all required information: full name, address, date of birth, employment status, employer, and annual income.
    - Ask for any missing information conversationally.

6.  **Loan Application**:
    - If the user wants to "apply for a loan," you MUST use the 'applyForLoan' tool.
    - Before calling the tool, collect the desired loan amount and the same personal/financial details as a credit card application.
    - Ask for missing information conversationally.

7.  **General Conversation**:
    - For any other queries, provide polite, brief, and helpful responses.
    - Always maintain a friendly and professional tone.
    - VERY IMPORTANT: You MUST respond exclusively in ${langName}. Do not switch languages.`;

    const functionDeclarations = [
        initiatePaymentFunctionDeclaration,
        getCardStatementDetailsFunctionDeclaration,
        getCardTransactionsFunctionDeclaration,
        requestPaymentExtensionFunctionDeclaration,
        applyForCreditCardFunctionDeclaration,
        applyForLoanFunctionDeclaration,
        getSpendingAnalysisFunctionDeclaration
    ];

    return ai.chats.create({
        model,
        config: {
            systemInstruction,
            tools: [{ functionDeclarations }],
        },
    });
};


export const extractPaymentDetailsFromImage = async (base64Image: string): Promise<{ recipientName: string, amount: number, recipientAccountNumber: string }> => {
    const prompt = `Analyze the provided image, which could be a photo of a handwritten note or a document. Extract the following three pieces of information for a financial transaction:
1. The recipient's full name (recipientName).
2. The monetary amount (amount).
3. The recipient's account number (recipientAccountNumber), which should be a string of digits.

Return the information as a JSON object. If any piece of information is unclear or missing, return an empty string for that field.`;

    const imagePart = {
        inlineData: {
            mimeType: 'image/jpeg',
            data: base64Image,
        },
    };

    const textPart = {
        text: prompt
    };
    
    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            recipientName: { type: Type.STRING },
            amount: { type: Type.NUMBER },
            recipientAccountNumber: { type: Type.STRING },
        },
        required: ["recipientName", "amount", "recipientAccountNumber"],
    };

    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [imagePart, textPart] },
            config: {
                responseMimeType: "application/json",
                responseSchema,
            }
        });

        const jsonString = response.text.trim();
        return JSON.parse(jsonString);

    } catch (error) {
        console.error("Error extracting details from image:", error);
        throw new Error("Failed to parse payment details from the image.");
    }
};

export const analyzeSpendingWithAI = async (transactions: Transaction[], language: 'en' | 'es' | 'th' | 'tl'): Promise<{ name: string; value: number }[]> => {
    const langNameMap = {
        en: 'English',
        es: 'Spanish',
        th: 'Thai',
        tl: 'Tagalog'
    };
    const languageName = langNameMap[language];

    const expenseTransactions = transactions
        .filter(tx => tx.type === 'debit')
        .map(tx => `- ${tx.description}: $${tx.amount.toFixed(2)} on ${new Date(tx.timestamp).toLocaleDateString()}`)
        .join('\n');
    
    if (!expenseTransactions) {
        return [];
    }

    const prompt = `Analyze the following list of financial transactions. Group them into meaningful spending categories (e.g., 'Food & Dining', 'Transport', 'Shopping', 'Bills & Utilities', 'Entertainment', 'Groceries', 'Transfers', 'Other'). Sum the total amount for each category.

Transactions:
${expenseTransactions}

Return the result as a JSON array of objects. Each object must have a "name" (string) and a "value" (number) key. The "name" for each category MUST be translated into ${languageName}. Example: [{ "name": "Shopping", "value": 150.75 }, { "name": "Food & Dining", "value": 85.20 }]`;

    const responseSchema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                name: { type: Type.STRING },
                value: { type: Type.NUMBER },
            },
            required: ['name', 'value'],
        },
    };

    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema,
            }
        });

        const jsonString = response.text.trim();
        return JSON.parse(jsonString);
    } catch (error) {
        console.error("Error analyzing spending with AI:", error);
        return [];
    }
};

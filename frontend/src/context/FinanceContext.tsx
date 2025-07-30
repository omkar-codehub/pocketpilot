import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios'; // Import axios for API calls
import { v4 as uuidv4 } from 'uuid';


const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;

export interface Transaction {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: Date;
  type: 'income' | 'expense';
}

export interface SavingsGoal {
  id:string;
  name: string;
  target: number;
  current: number;
  deadline: Date;
}

export interface Budget {
  id: string; // Add id to identify budgets for updates
  category: string;
  limit: number;
  spent: number;
}

interface FinanceContextType {
  transactions: Transaction[];
  savings: SavingsGoal[];
  budgets: Budget[];
  roundUpSavings: number; // This can remain client-side or be fetched if persisted
  addTransaction: (transaction: Omit<Transaction, 'id'>) => Promise<void>;
  editTransaction: (id: string, transaction: Omit<Transaction, 'id'>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  addSavingsGoal: (goal: Omit<SavingsGoal, 'id'>) => Promise<void>;
  updateSavingsGoal: (id: string, updates: Partial<Omit<SavingsGoal, 'id'>>) => Promise<void>;
  updateBudget: (id: string, limit: number) => Promise<void>; // Update by ID now
  getExpensesByCategory: () => { [key: string]: number };
  canAfford: (amount: number) => { canAfford: boolean; suggestion: string };
  checkRegretRisk: (amount: number, category: string) => { risk: number; message: string };
  fetchTransactions: () => Promise<void>;
  fetchSavings: () => Promise<void>;
  fetchRoundUpSavings: () => Promise<void>;
}

export const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  // Initialize state with empty arrays
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [savings, setSavings] = useState<SavingsGoal[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [roundUpSavings, setRoundUpSavings] = useState<number>(0); // Start at 0

  // Fetch all initial data from the backend when the component mounts
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [transactionsRes, savingsRes, budgetsRes, roundUpRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/api/transactions`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }),
          axios.get(`${API_BASE_URL}/api/savings`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }),
          axios.get(`${API_BASE_URL}/api/budgets`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }),
          axios.get(`${API_BASE_URL}/api/round-ups/total`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
        ]);
        console.log(transactionsRes);
        // Note: You may need to parse dates from string to Date objects
        setTransactions(transactionsRes.data.data.map((t: any) => ({...t, date: new Date(t.date), id: t.id || uuidv4()})));
        setSavings(savingsRes.data.data.map((s: any) => ({...s, deadline: new Date(s.deadline)})));
        setBudgets(budgetsRes.data.data);
        console.log(roundUpRes.data);
        setRoundUpSavings(roundUpRes.data.total);

      } catch (error) {
        console.error("Failed to fetch initial financial data:", error);
      }
    };

    fetchInitialData();
  }, []); // Empty dependency array means this runs once on mount

  const addTransaction = async (transaction: Omit<Transaction, 'id'>) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/transactions`, transaction, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      const newTransaction = {...response.data.data, date: new Date(response.data.data.date), id: response.data.data.id || uuidv4()};
      
      setTransactions(prev => [newTransaction, ...prev]);
      
      if (transaction.type === 'expense') {
        const roundUp = Math.ceil(transaction.amount) - transaction.amount;
        if (roundUp > 0) {
          setRoundUpSavings(prev => prev + roundUp);
        }
        setBudgets(prev => prev.map(budget => 
          budget.category === transaction.category 
            ? { ...budget, spent: budget.spent + transaction.amount }
            : budget
        ));
      }
    } catch (error) {
      console.error("Failed to add transaction:", error);
    }
  };

  const editTransaction = async (id: string, transaction: Omit<Transaction, 'id'>) => {
     try {
        console.log(id);
      
        const response = await axios.put(`${API_BASE_URL}/api/transactions/${id}`, transaction, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
        const updatedTransaction = {...response.data.data, date: new Date(response.data.data.date)};

        // Manually update budgets based on the change
        const oldTransaction = transactions.find(t => t.id === id);
        if(oldTransaction) {
             // Revert old transaction's effect on budget
            if (oldTransaction.type === 'expense') {
                setBudgets(prev => prev.map(budget =>
                    budget.category === oldTransaction.category
                        ? { ...budget, spent: budget.spent - oldTransaction.amount }
                        : budget
                ));
            }
        }
       
        // Apply new transaction's effect on budget
        if (updatedTransaction.type === 'expense') {
            setBudgets(prev => prev.map(budget =>
                budget.category === updatedTransaction.category
                    ? { ...budget, spent: budget.spent + updatedTransaction.amount }
                    : budget
            ));
        }

        setTransactions(prev => prev.map(t => t.id === id ? updatedTransaction : t));

    } catch (error) {
      console.error("Failed to edit transaction:", error);
    }
  };
  
  const deleteTransaction = async (id: string) => {
    try {
      await axios.delete(`${API_BASE_URL}/api/transactions/${id}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      const transactionToDelete = transactions.find(t => t.id === id);

      if (transactionToDelete && transactionToDelete.type === 'expense') {
         setBudgets(prev => prev.map(budget => 
            budget.category === transactionToDelete.category 
            ? { ...budget, spent: Math.max(0, budget.spent - transactionToDelete.amount) }
            : budget
        ));
      }

      setTransactions(prev => prev.filter(t => t.id !== id));
    } catch (error) {
        console.error("Failed to delete transaction:", error);
    }
  };

  const addSavingsGoal = async (goal: Omit<SavingsGoal, 'id'>) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/api/savings`, goal, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
        const newGoal = {...response.data.data, deadline: new Date(response.data.data.deadline)};
        setSavings(prev => [...prev, newGoal]);
    } catch (error) {
        console.error("Failed to add savings goal:", error);
    }
  };

  const updateSavingsGoal = async (id: string, updates: Partial<Omit<SavingsGoal, 'id'>>) => {
    try {
      const response = await axios.put(`${API_BASE_URL}/api/savings/${id}`, updates, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      const updatedGoal = { ...response.data.data, deadline: new Date(response.data.data.deadline) };
      setSavings(prev => prev.map(s => s.id === id ? updatedGoal : s));
    } catch (error) {
      console.error("Failed to update savings goal:", error);
    }
  };

  const fetchTransactions = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/transactions`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      setTransactions(response.data.data.map((t: any) => ({...t, date: new Date(t.date), id: t.id || uuidv4()})));
      await fetchRoundUpSavings(); // Call fetchRoundUpSavings after transactions are fetched
    } catch (error) {
      console.error("Failed to fetch transactions:", error);
    }
  };

  const fetchSavings = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/savings`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      setSavings(response.data.data.map((s: any) => ({...s, deadline: new Date(s.deadline)})));
    } catch (error) {
      console.error("Failed to fetch savings goals:", error);
    }
  };

  const fetchRoundUpSavings = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/savings/roundup`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      setRoundUpSavings(response.data.data.roundUpAmount);
    } catch (error) {
      console.error("Failed to fetch round-up savings:", error);
    }
  };

  const updateBudget = async (id: string, limit: number) => {
    try {
        const response = await axios.put(`${API_BASE_URL}/api/budgets/${id}`, { limit }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
        const updatedBudget = response.data.data;
        setBudgets(prev => prev.map(b => b.id === id ? updatedBudget : b));
    } catch(error) {
        console.error("Failed to update budget:", error);
    }
  };

  // The functions below can remain as client-side helpers
  // or be updated to use AI endpoints for more complex analysis.

  const getExpensesByCategory = () => {
    return transactions
      .filter(t => t.type === 'expense')
      .reduce((acc, transaction) => {
        acc[transaction.category] = (acc[transaction.category] || 0) + transaction.amount;
        return acc;
      }, {} as { [key: string]: number });
  };

  const canAfford = (amount: number) => {
    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalExpenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const availableBalance = totalIncome - totalExpenses;
    const canAfford = availableBalance >= amount;
    
    const suggestions = [
      "Consider saving for a few more days before this purchase",
      "Try the 24-hour rule before buying non-essentials",
      "Look for alternatives or wait for a sale",
      "Focus on your savings goals first",
      "Skip one dining out to make room for this purchase"
    ];
    
    return {
      canAfford,
      suggestion: canAfford 
        ? "You can afford this! Consider your other goals too." 
        : suggestions[Math.floor(Math.random() * suggestions.length)]
    };
  };

  const checkRegretRisk = (amount: number, category: string) => {
    const categoryExpenses = transactions
      .filter(t => t.type === 'expense' && t.category === category)
      .reduce((sum, t) => sum + t.amount, 0);
    
    const budget = budgets.find(b => b.category === category);
    const risk = budget ? (categoryExpenses + amount) / budget.limit : 0.5;
    
    const messages = [
      "You've been spending a lot in this category lately. Sure about this?",
      "Remember your savings goals. Is this purchase aligned?",
      "You bought something similar recently. Still need it?",
      "This might push you over budget. Consider waiting?",
      "Great choice! This fits well within your budget."
    ];
    
    return {
      risk: Math.min(risk, 1),
      message: risk > 0.8 ? messages[Math.floor(Math.random() * 4)] : messages[4]
    };
  };

  return (
    <FinanceContext.Provider value={{
        transactions,
        savings,
        budgets,
        roundUpSavings,
        addTransaction,
        editTransaction,
        deleteTransaction,
        addSavingsGoal,
        updateSavingsGoal,
        updateBudget,
        getExpensesByCategory,
        canAfford,
        checkRegretRisk,
        fetchTransactions,
        fetchSavings,
        fetchRoundUpSavings,
      }}>
        {children}
      </FinanceContext.Provider>
  );
}

export function useFinance() {
  const context = useContext(FinanceContext);
  if (context === undefined) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
}
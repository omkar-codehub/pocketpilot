import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { FinanceContext, Transaction } from '../../src/context/FinanceContext';

interface SelectedTransaction { 
  transaction: Transaction;
  notes: string;
}

const RegretRadar = () => {
  const financeContext = useContext(FinanceContext);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedTransaction, setSelectedTransaction] = useState<SelectedTransaction | null>(null);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          console.error('No authentication token found.');
          return;
        }
        const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/regret-feedback`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (response.data && Array.isArray(response.data.data)) {
          setTransactions(response.data.data);
        } else {
          console.error('API response data is not an array:', response.data);
          setTransactions([]);
        }
        setSelectedTransaction(null);
      } catch (error) {
        console.error('Failed to fetch transactions:', error);
      }
    };
    fetchTransactions();
  }, []);

  const handleRadioChange = (transaction: Transaction) => {
    setSelectedTransaction(prev => 
      prev?.transaction._id === transaction._id ? null : { transaction, notes: '' }
    );
  };

  const handleNotesChange = (notes: string) => {
    if (selectedTransaction) {
      setSelectedTransaction({
        ...selectedTransaction,
        notes
      });
    }
  };

  const handleSubmit = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found.');
        return;
      }

      const regretFeedbackData = selectedTransaction ? {
        transactionId: selectedTransaction.transaction._id,
        notes: selectedTransaction.notes
      } : {};
      console.log(selectedTransaction);
      
      await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/regret-feedback/transaction`, regretFeedbackData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      console.log('Regret feedback submitted successfully!');
      // Optionally, clear selected transactions or provide user feedback
      setSelectedTransaction(null);
    } catch (error) {
      console.error('Failed to submit regret feedback:', error);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Regret Radar</h1>
      <p className="mb-4 text-gray-600 dark:text-gray-400">Select transactions you regret and add notes.</p>
      <div className="space-y-4">
        {transactions.length === 0 ? (
          <p className="text-gray-600 dark:text-gray-400">No transactions found.</p>
        ) : (
          transactions.map(transaction => (
            <div key={transaction._id} className="flex items-center space-x-4 p-3 border rounded-lg shadow-sm bg-white dark:bg-gray-800 dark:border-gray-700">
              <input
                type="radio"
                name="regretTransaction"
                checked={selectedTransaction?.transaction._id === transaction._id}
                onChange={() => handleRadioChange(transaction)}
                className="form-radio h-5 w-5 text-blue-600"
              />
              <div className="flex-grow">
                <p className="font-semibold text-gray-900 dark:text-white">{transaction.description} - ${transaction.amount.toFixed(2)}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{new Date(transaction.date).toLocaleDateString()}</p>
              </div>
              {selectedTransaction?.transaction._id === transaction._id && (
                <input
                  type="text"
                  value={selectedTransaction?.notes || ''}
                  onChange={(e) => handleNotesChange(e.target.value)}
                  placeholder="Add regret notes..."
                  className="flex-grow p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                />
              )}
            </div>
          ))
        )}
      </div>
      <button
        onClick={handleSubmit}
        className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        Submit Regrets
      </button>
    </div>
  );
};

export default RegretRadar;
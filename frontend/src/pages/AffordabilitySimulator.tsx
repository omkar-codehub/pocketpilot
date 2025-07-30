import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;
import { 
  CalculatorIcon,
  CheckCircleIcon,
  XCircleIcon,
  LightBulbIcon,
  CurrencyRupeeIcon
} from '@heroicons/react/24/outline';

export default function AffordabilitySimulator() {
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [itemName, setItemName] = useState('');
  const [result, setResult] = useState<any>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const categories = ['Food', 'Transportation', 'Shopping', 'Entertainment', 'Bills', 'Healthcare', 'Education', 'Other'];

  const handleSimulation = async () => {
    if (!amount || parseFloat(amount) <= 0 || !itemName || !category) return;

    setIsCalculating(true);
    setResult(null);
    
    try {
      // FIX: Use the correct key for the auth token
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_BASE_URL}/api/ai/affordability`,
        {
          itemName: itemName,
          itemPrice: parseFloat(amount),
          category: category,
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.data && response.data.success) {
        // FIX: Set the result state with the new data structure from the backend
        console.log(response.data.data);
        setResult({
            ...response.data.data, // Contains decision, tip, impact, etc.
            amount: parseFloat(amount),
            itemName: itemName
        });
      }
    } catch (error) {
      console.error('Error analyzing affordability:', error);
    } finally {
      setIsCalculating(false);
    }
  };

  const suggestions = [
    { amount: '500', category: 'Food', label: 'Dinner at restaurant' },
    { amount: '1200', category: 'Shopping', label: 'New shirt' },
    { amount: '15000', category: 'Shopping', label: 'New smartphone' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", delay: 0.2 }}
          className="mx-auto w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center mb-4"
        >
          <CalculatorIcon className="w-8 h-8 text-white" />
        </motion.div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Affordability Simulator</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Ask "Can I afford this?" and get AI-powered financial advice
        </p>
      </div>

      {/* Main Simulator */}
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg border border-gray-100 dark:border-gray-700"
        >
          <div className="space-y-6">
            {/* Item Name, Amount, and Category Inputs... */}
             <div>
              <label className="block text-lg font-medium text-gray-900 dark:text-white mb-3">What do you want to buy?</label>
              <input type="text" value={itemName} onChange={(e) => setItemName(e.target.value)} className="w-full px-4 py-4 text-lg border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-blue-500" placeholder="e.g., New Laptop" />
            </div>
            <div>
              <label className="block text-lg font-medium text-gray-900 dark:text-white mb-3">How much does it cost?</label>
              <div className="relative">
                <CurrencyRupeeIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full pl-12 pr-4 py-4 text-2xl border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-blue-500" placeholder="Enter amount" />
              </div>
            </div>
            <div>
              <label className="block text-lg font-medium text-gray-900 dark:text-white mb-3">What category is this for?</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-4 py-4 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-blue-500">
                <option value="">Select a category</option>
                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>

            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleSimulation} disabled={!amount || !itemName || !category || parseFloat(amount) <= 0 || isCalculating} className="w-full py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-lg font-semibold rounded-xl shadow-lg disabled:opacity-50">
              {isCalculating ? 'Analyzing...' : 'Can I Afford This?'}
            </motion.button>
          </div>
        </motion.div>

        {/* Result */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className={`mt-6 p-8 rounded-2xl shadow-lg ${
                result.decision 
                  ? 'bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-900/20'
                  : 'bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20'
              }`}
            >
              <div className="flex items-start space-x-4">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.2 }} className={`p-3 rounded-full ${result.decision ? 'bg-emerald-100' : 'bg-red-100'}`}>
                  {result.decision ? <CheckCircleIcon className="w-8 h-8 text-emerald-600" /> : <XCircleIcon className="w-8 h-8 text-red-600" />}
                </motion.div>
                
                <div className="flex-1 space-y-4">
                  <motion.h3 initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className={`text-2xl font-bold ${result.decision ? 'text-emerald-800' : 'text-red-800'}`}>
                    {result.decision ? `Yes, you can afford the ${result.itemName}!` : 'This might not be a good time...'}
                  </motion.h3>
                  
                  {/* AI Tip */}
                  <div className="p-4 bg-white/50 dark:bg-gray-900/20 rounded-lg">
                    <p className="font-medium text-gray-900 dark:text-white mb-1">💡 AI Tip:</p>
                    <p className="text-gray-700 dark:text-gray-300">{result.tip}</p>
                  </div>
                  
                  {/* Impact Analysis */}
                  <div className="p-4 bg-white/50 dark:bg-gray-900/20 rounded-lg">
                     <p className="font-medium text-gray-900 dark:text-white mb-1">📈 Impact Analysis:</p>
                     <p className="text-gray-700 dark:text-gray-300">{result.impact}</p>
                  </div>

                  {/* Alternatives */}
                  {result.alternatives && result.alternatives.length > 0 && (
                     <div className="p-4 bg-white/50 dark:bg-gray-900/20 rounded-lg">
                       <p className="font-medium text-gray-900 dark:text-white mb-2">🤔 Alternatives to consider:</p>
                       <div className="flex flex-wrap gap-2">
                         {result.alternatives.map((alt: string, index: number) => (
                           <span key={index} className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 rounded-full">{alt}</span>
                         ))}
                       </div>
                     </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
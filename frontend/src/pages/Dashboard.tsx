import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { 
  CurrencyRupeeIcon, 
  ArrowTrendingUpIcon, 
  ArrowTrendingDownIcon,
  BanknotesIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { useFinance } from '../context/FinanceContext';

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

export default function Dashboard() {
  const { transactions, savings, budgets, roundUpSavings, getExpensesByCategory } = useFinance();
  const [monthlyData, setMonthlyData] = useState([]);

  useEffect(() => {
    // This function processes transactions to create monthly summary data
    const processMonthlyData = () => {
      if (transactions.length === 0) return;

      const summary = {};

      transactions.forEach(t => {
        const month = new Date(t.date).toLocaleString('default', { month: 'short' });
        if (!summary[month]) {
          summary[month] = { month, income: 0, expenses: 0 };
        }
        if (t.type === 'income') {
          summary[month].income += t.amount;
        } else {
          summary[month].expenses += t.amount;
        }
      });
      
      // Convert summary object to an array for the chart and sort it chronologically
      const monthOrder = {
        Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
        Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11
      };

      const sortedMonthlyData = Object.values(summary).sort((a: any, b: any) => {
        const dateA = new Date(new Date().getFullYear(), monthOrder[a.month as keyof typeof monthOrder], 1);
        const dateB = new Date(new Date().getFullYear(), monthOrder[b.month as keyof typeof monthOrder], 1);
        return dateA.getTime() - dateB.getTime();
      });

      setMonthlyData(sortedMonthlyData);
    };

    processMonthlyData();
  }, [transactions]); // Re-run this logic whenever transactions change

  // These calculations are now fully dynamic based on the fetched transactions
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  


  const expensesByCategory = getExpensesByCategory();
  const pieData = Object.entries(expensesByCategory).map(([category, amount]) => ({
    name: category,
    value: amount
  }));

  // The main values are dynamic, but change percentages are placeholders
  const stats = [
    {
      name: 'Total Balance',
      value: `₹${(totalIncome - totalExpenses).toLocaleString()}`,
      
      trend: 'up',
      icon: CurrencyRupeeIcon,
      color: 'emerald'
    },
    {
      name: 'Monthly Income',
      value: `₹${totalIncome.toLocaleString()}`,
      
      trend: 'up',
      icon: ArrowTrendingUpIcon,
      color: 'blue'
    },
    {
      name: 'Monthly Expenses',
      value: `₹${totalExpenses.toLocaleString()}`,
      
      trend: 'down',
      icon: ArrowTrendingDownIcon,
      color: 'red'
    },
    {
      name: 'Round-up Savings',
      value: `₹${roundUpSavings.toFixed(2)}`,
      
      trend: 'up',
      icon: BanknotesIcon,
      color: 'amber'
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Welcome back! Here's your financial overview.</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-200 border border-gray-100 dark:border-gray-700"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{stat.name}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{stat.value}</p>
                <div className={`flex items-center mt-2 text-sm ${
                  stat.trend === 'up' ? 'text-emerald-600' : 'text-red-600'
                }`}>
          
                </div>
              </div>
              <div className={`p-3 rounded-xl bg-${stat.color}-100 dark:bg-${stat.color}-900/20`}>
                <stat.icon className={`w-8 h-8 text-${stat.color}-600`} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expense Categories Pie Chart */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700"
        >
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Expense Categories</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} outerRadius={100} fill="#8884d8" dataKey="value">
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`₹${value.toLocaleString()}`, 'Amount']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Monthly Trends - Now uses client-side processed data */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700"
        >
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Monthly Trends</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => [`₹${value.toLocaleString()}`, '']} />
                <Line type="monotone" dataKey="income" stroke="#10B981" strokeWidth={3} name="Income" />
                <Line type="monotone" dataKey="expenses" stroke="#EF4444" strokeWidth={3} name="Expenses" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>
      
      {/* Other components remain the same as they correctly use data from the useFinance hook */}

    </motion.div>
  );
}
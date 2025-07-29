// src/AddIncome.jsx
import React, { useState } from 'react';

export default function AddIncome() {
  const [amount, setAmount] = useState('');
  const [source, setSource] = useState('');
  const [date, setDate] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    try {
      const token = localStorage.getItem('token');

      const res = await fetch('http://localhost:5000/api/income', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`, // send token
        },
        body: JSON.stringify({ amount, source, date }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || 'Failed to add income');

      setMessage('Income added successfully!');
      setAmount('');
      setSource('');
      setDate('');
    } catch (err) {
      setMessage(err.message);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white shadow-md rounded-lg">
      <h2 className="text-xl font-semibold mb-4">Add Income</h2>

      {message && (
        <p className="mb-4 text-sm text-blue-600 bg-blue-100 p-2 rounded">
          {message}
        </p>
      )}

      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-sm mb-1">Amount</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            className="w-full px-3 py-2 border rounded"
            placeholder="e.g. 5000"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm mb-1">Source</label>
          <input
            type="text"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="w-full px-3 py-2 border rounded"
            placeholder="e.g. Salary"
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3 py-2 border rounded"
          />
        </div>

        <button
          type="submit"
          className="w-full bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600 transition"
        >
          Add Income
        </button>
      </form>
    </div>
  );
}

"use client";

import React from 'react';

export default function PaymentsPage() {
  // Placeholder payment transactions data (updated to match Firestore structure)
  const transactions = [
    {
      id: 'VTXDC5WyROSz5BPFHV17',
      amount: 5000,
      initiatedById: 'OGytrAaMadgp2VbDRz51hpIHUdk2',
      initiatedByName: 'Jake Dwyer',
      metadata: { ratePerMillion: null, vid: null },
      targetUserId: '',
      typeOfTransaction: 'income',
      date: '2023-05-15',
    },
    {
      id: 'VTXDC5WyROSz5BPFHV18',
      amount: -2000,
      initiatedById: 'OGytrAaMadgp2VbDRz51hpIHUdk3',
      initiatedByName: 'Alex Johnson',
      metadata: { ratePerMillion: null, vid: null },
      targetUserId: '',
      typeOfTransaction: 'expense',
      date: '2023-05-12',
    },
  ];

  // Calculate available balance from transactions
  const availableBalance = transactions.reduce((sum, t) => sum + (typeof t.amount === 'number' ? t.amount : 0), 0);

  // Function to format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Function to format date
  const formatDate = (dateInput: string | number) => {
    const date = new Date(dateInput);
    return date.toLocaleDateString('en-US', {
      year: 'numeric', 
      month: 'short', 
      day: 'numeric'
    });
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
        <h1 className="text-3xl font-bold text-gray-800">Payments & Finances</h1>
        <button className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg w-full md:w-auto">
          Withdraw Funds
        </button>
      </div>
      
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6" role="alert">
        <span className="block sm:inline">Page Under Maintenance</span>
      </div>
      
      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <p className="text-sm font-medium text-gray-900">Available Balance</p>
          <p className="text-3xl font-bold mt-2 text-green-600">{formatCurrency(availableBalance)}</p>
        </div>
      </div>
      
      {/* Payment Methods */}
      {/* Removed Payment Methods section */}
      
      {/* Transactions */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-medium text-gray-900">Recent Transactions</h2>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              placeholder="Search transactions..."
              className="border border-gray-300 rounded-lg px-3 py-1 text-sm text-gray-900"
            />
            <button className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1 rounded-lg text-sm">
              Filter
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                  Transaction ID
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                  Date
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                  Initiated By
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                  Type
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {transactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {transaction.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(transaction.date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {transaction.initiatedByName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {transaction.typeOfTransaction}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <span className={transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {formatCurrency(transaction.amount)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center">
          <p className="text-sm text-gray-900">Showing {transactions.length} transactions</p>
        </div>
      </div>
    </div>
  );
} 
"use client";

import React from 'react';

export default function PaymentsPage() {
  // Placeholder payment transactions data
  const transactions = [
    { 
      id: 'TRX-4829', 
      date: '2023-05-15', 
      description: 'Royalty Payment - April 2023', 
      amount: 2450.75, 
      status: 'Completed',
      recipient: 'Alex Johnson' 
    },
    { 
      id: 'TRX-4830', 
      date: '2023-05-12', 
      description: 'Platform Fee', 
      amount: -125.00, 
      status: 'Completed',
      recipient: 'Sketch Music' 
    },
    { 
      id: 'TRX-4831', 
      date: '2023-05-10', 
      description: 'Campaign Payment - Summer Beats', 
      amount: -500.00, 
      status: 'Completed',
      recipient: 'Marketing Agency' 
    },
    { 
      id: 'TRX-4832', 
      date: '2023-05-05', 
      description: 'Royalty Payment - March 2023', 
      amount: 1875.25, 
      status: 'Completed',
      recipient: 'Sarah Williams' 
    },
    { 
      id: 'TRX-4833', 
      date: '2023-05-01', 
      description: 'Distribution Advance', 
      amount: 5000.00, 
      status: 'Pending',
      recipient: 'The Groove Collective' 
    }
  ];

  // Placeholder balance data
  const balanceData = {
    available: 8750.50,
    pending: 3250.25,
    nextPayout: '2023-05-30'
  };

  // Function to format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Function to format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
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
      
      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <p className="text-sm font-medium text-gray-900">Available Balance</p>
          <p className="text-3xl font-bold mt-2 text-green-600">{formatCurrency(balanceData.available)}</p>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-6">
          <p className="text-sm font-medium text-gray-900">Pending Balance</p>
          <p className="text-3xl font-bold mt-2 text-gray-700">{formatCurrency(balanceData.pending)}</p>
          <p className="text-sm text-gray-900 mt-4">Available on {formatDate(balanceData.nextPayout)}</p>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-6">
          <p className="text-sm font-medium text-gray-900">Next Payout</p>
          <p className="text-3xl font-bold mt-2 text-gray-700">{formatDate(balanceData.nextPayout)}</p>
          <button className="mt-4 w-full bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-lg">
            View Schedule
          </button>
        </div>
      </div>
      
      {/* Payment Methods */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium text-gray-900">Payment Methods</h2>
          <button className="text-primary hover:text-primary-dark">+ Add Method</button>
        </div>
        
        <div className="border border-gray-200 rounded-lg p-4 mb-4 flex justify-between items-center">
          <div className="flex items-center">
            <div className="w-10 h-6 bg-blue-600 rounded mr-4"></div>
            <div>
              <p className="font-medium text-gray-900">Visa ending in 4242</p>
              <p className="text-sm text-gray-900">Expires 05/2025</p>
            </div>
          </div>
          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Default</span>
        </div>
        
        <div className="border border-gray-200 rounded-lg p-4 flex justify-between items-center">
          <div className="flex items-center">
            <div className="w-10 h-6 bg-gray-800 rounded mr-4"></div>
            <div>
              <p className="font-medium text-gray-900">Bank Account (ACH)</p>
              <p className="text-sm text-gray-900">Wells Fargo ****2568</p>
            </div>
          </div>
          <button className="text-gray-900 hover:text-gray-700 text-sm">Set as Default</button>
        </div>
      </div>
      
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
                  Description
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                  Recipient
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                  Amount
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                  Status
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
                    {transaction.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {transaction.recipient}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <span className={transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {formatCurrency(transaction.amount)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      transaction.status === 'Completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {transaction.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center">
          <p className="text-sm text-gray-900">Showing 5 of 25 transactions</p>
          <div className="flex space-x-2">
            <button className="border border-gray-300 rounded-lg px-3 py-1 text-sm" disabled>Previous</button>
            <button className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1 rounded-lg text-sm">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
} 
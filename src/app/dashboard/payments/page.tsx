"use client";

import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Image from 'next/image';
import { toast } from 'react-hot-toast';
import { useQuery, useCollection } from '@/hooks';
import { Campaign, Video, Transaction } from '@/types/campaign';
import { useAuth } from '@/contexts/AuthContext';
import { User } from '@/types/user';
import { doc, getDoc, collection, onSnapshot, Timestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import VideoModal from '@/components/VideoModal';
import CampaignModal from '@/components/CampaignModal';



export default function PaymentsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [isLoadingCampaign, setIsLoadingCampaign] = useState(false);
  const [creatorDetails, setCreatorDetails] = useState<Record<string, User>>({});
  const [isLoadingCreators, setIsLoadingCreators] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const { documents: transactions = [], loading: loadingTransactions } = useCollection<Transaction>('transactions');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showPaymentReceiptModal, setShowPaymentReceiptModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositForm, setDepositForm] = useState({
    campaignId: '',
    amount: '',
    paymentMethod: 'paypal',
    paymentReference: ''
  });
  const [isSubmittingDeposit, setIsSubmittingDeposit] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [isPaymentSuccess, setIsPaymentSuccess] = useState(false);
  const [isReleasingPayments, setIsReleasingPayments] = useState(false);
  const [expandedCreators, setExpandedCreators] = useState<Set<string>>(new Set());
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  
  // Fetch campaigns with proper cleanup
  useEffect(() => {
    const campaignsRef = collection(db, 'campaigns');
    const unsubscribe = onSnapshot(campaignsRef, (snapshot) => {
      const campaignsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Campaign[];
      setCampaigns(campaignsData);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  // Calculate financial metrics with proper rounding
  const parseAndRoundAmount = (amount: string | number): number => {
    const parsed = typeof amount === 'string' ? parseFloat(amount) : amount;
    return typeof parsed === 'number' && !isNaN(parsed) ? Math.round(parsed * 100) / 100 : 0;
  };

  const totalRevenue = Math.round(
    transactions
      .filter(t => {
        const amount = parseAndRoundAmount(t.amount);
        return amount > 0;
      })
      .reduce((sum, t) => {
        const amount = parseAndRoundAmount(t.amount);
        return sum + amount;
      }, 0) * 100
  ) / 100;

  const totalExpenses = Math.round(
    transactions
      .filter(t => {
        const amount = parseAndRoundAmount(t.amount);
        return amount < 0;
      })
      .reduce((sum, t) => {
        const amount = parseAndRoundAmount(t.amount);
        return sum + Math.abs(amount);
      }, 0) * 100
  ) / 100;

  const netIncome = Math.round((totalRevenue - totalExpenses) * 100) / 100;
  const availableBalance = netIncome;

  // Sort transactions by date (most recent first)
  const sortedTransactions = React.useMemo(() => {
    return [...transactions].sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
  }, [transactions]);

  // Generate graph data with better date handling and appropriate time granularity
  const graphData = React.useMemo(() => {
    if (!transactions.length) return [];

    // Helper to safely parse dates
    const parseTransactionDate = (dateInput: string | number | Timestamp | undefined): Date => {
      if (!dateInput) return new Date();
      
      if (typeof dateInput === 'object' && 'toDate' in dateInput) {
        return dateInput.toDate();
      } else if (typeof dateInput === 'string') {
        return new Date(dateInput);
      } else if (typeof dateInput === 'number') {
        return new Date(dateInput);
      }
      return new Date();
    };

    // Helper to safely parse and round amounts
    const parseAmount = (amount: string | number): number => {
      const parsed = typeof amount === 'string' ? parseFloat(amount) : amount;
      return typeof parsed === 'number' && !isNaN(parsed) ? Math.round(parsed * 100) / 100 : 0;
    };

    // Sort transactions by date first
    const sortedTransactions = [...transactions].sort((a, b) => {
      const dateA = parseTransactionDate(a.createdAt);
      const dateB = parseTransactionDate(b.createdAt);
      return dateA.getTime() - dateB.getTime();
    });

    // Determine if we should group by day, week, or month based on data span
    const firstDate = parseTransactionDate(sortedTransactions[0]?.createdAt);
    const lastDate = parseTransactionDate(sortedTransactions[sortedTransactions.length - 1]?.createdAt);
    const daysDiff = Math.ceil((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));

    let groupBy: 'day' | 'week' | 'month';
    let formatLabel: (date: Date) => string;

    if (daysDiff <= 30) {
      // Less than 30 days: group by day
      groupBy = 'day';
      formatLabel = (date: Date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else if (daysDiff <= 180) {
      // Less than 6 months: group by week
      groupBy = 'week';
      formatLabel = (date: Date) => {
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - date.getDay());
        return `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      };
    } else {
      // More than 6 months: group by month
      groupBy = 'month';
      formatLabel = (date: Date) => date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    }

    // Group transactions
    const dataMap = new Map<string, { income: number; expenses: number; date: Date }>();

    sortedTransactions.forEach((transaction) => {
      const date = parseTransactionDate(transaction.createdAt);
      let groupKey: string;
      let groupDate: Date;

      if (groupBy === 'day') {
        groupDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        groupKey = formatLabel(groupDate);
      } else if (groupBy === 'week') {
        groupDate = new Date(date);
        groupDate.setDate(date.getDate() - date.getDay()); // Start of week
        groupKey = formatLabel(groupDate);
      } else {
        groupDate = new Date(date.getFullYear(), date.getMonth(), 1);
        groupKey = formatLabel(groupDate);
      }

      const entry = dataMap.get(groupKey) || { income: 0, expenses: 0, date: groupDate };
      const amount = parseAmount(transaction.amount);

      if (amount > 0) {
        entry.income = Math.round((entry.income + amount) * 100) / 100;
      } else if (amount < 0) {
        entry.expenses = Math.round((entry.expenses + Math.abs(amount)) * 100) / 100;
      }

      dataMap.set(groupKey, entry);
    });

    // Convert to array and sort by date
    const result = Array.from(dataMap.entries())
      .map(([period, data]) => ({
        period,
        income: data.income,
        expenses: data.expenses,
        date: data.date
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    // If we still have less than 3 data points, fill in some gaps to make the chart more readable
    if (result.length < 3 && result.length > 0) {
      const startDate = result[0].date;
      const endDate = result[result.length - 1].date;
      
      // eslint-disable-next-line prefer-const
      let currentDate = new Date(startDate);
      const filledResult: typeof result = [];
      
      while (currentDate <= endDate) {
        const key = formatLabel(currentDate);
        const existing = result.find(r => r.period === key);
        
        if (existing) {
          filledResult.push(existing);
        } else {
          filledResult.push({
            period: key,
            income: 0,
            expenses: 0,
            date: new Date(currentDate)
          });
        }
        
        // Increment date based on groupBy
        if (groupBy === 'day') {
          currentDate.setDate(currentDate.getDate() + 1);
        } else if (groupBy === 'week') {
          currentDate.setDate(currentDate.getDate() + 7);
        } else {
          currentDate.setMonth(currentDate.getMonth() + 1);
        }
      }
      
      return filledResult;
    }

    return result;
  }, [transactions]);

  // Function to format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Function to format date
  const formatDate = (dateInput: string | number | Timestamp) => {
    let date: Date;
    if (dateInput && typeof dateInput === 'object' && 'toDate' in dateInput) {
      // Firestore timestamp
      date = dateInput.toDate();
    } else if (typeof dateInput === 'string') {
      // String timestamp
      date = new Date(dateInput);
    } else if (typeof dateInput === 'number') {
      // Number timestamp (milliseconds)
      date = new Date(dateInput);
    } else {
      // Fallback to current date
      date = new Date();
    }
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Fetch creator details when campaign changes
  useEffect(() => {
    const fetchCreatorDetails = async () => {
      if (!selectedCampaign?.videos?.length) return;
      
      setIsLoadingCreators(true);
      const uniqueCreatorIds = Array.from(new Set(selectedCampaign.videos.map(v => v.author_id)));
      const details: Record<string, User> = {};
      
      try {
        await Promise.all(
          uniqueCreatorIds.map(async (creatorId) => {
            const userDoc = await getDoc(doc(db, 'users', creatorId));
            if (userDoc.exists()) {
              details[creatorId] = userDoc.data() as User;
            }
          })
        );
        setCreatorDetails(details);
      } catch (error) {
        console.error('Error fetching creator details:', error);
        toast.error('Failed to fetch creator details');
      } finally {
        setIsLoadingCreators(false);
      }
    };

    fetchCreatorDetails();
  }, [selectedCampaign]);



  // Helper function to toggle creator expansion
  const toggleCreatorExpansion = (creatorId: string) => {
    setExpandedCreators(prev => {
      const newSet = new Set(prev);
      if (newSet.has(creatorId)) {
        newSet.delete(creatorId);
      } else {
        newSet.add(creatorId);
      }
      return newSet;
    });
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
        <h1 className="text-3xl font-bold text-gray-800">Payments & Finances</h1>
        <button 
          onClick={() => setShowDepositModal(true)}
          className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg w-full md:w-auto hover:cursor-pointer"
        >
          Record Deposit
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`${
              activeTab === 'overview'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm hover:cursor-pointer`}
          >
            <div className="flex items-center space-x-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span>Overview</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('pay-creators')}
            className={`${
              activeTab === 'pay-creators'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm hover:cursor-pointer`}
          >
            <div className="flex items-center space-x-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <span>Pay Creators</span>
            </div>
          </button>
        </nav>
      </div>

      {activeTab === 'overview' && (
        <>
          {/* Balance Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <p className="text-sm font-medium text-gray-900">Available Balance</p>
              <p className={`text-3xl font-bold mt-2 ${availableBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(availableBalance)}
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6">
              <p className="text-sm font-medium text-gray-900">Total Revenue</p>
              <p className="text-3xl font-bold mt-2 text-green-600">{formatCurrency(totalRevenue)}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6">
              <p className="text-sm font-medium text-gray-900">Total Expenses</p>
              <p className="text-3xl font-bold mt-2 text-red-600">{formatCurrency(totalExpenses)}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6">
              <p className="text-sm font-medium text-gray-900">Net Income</p>
              <div className="flex items-center mt-2">
                <p className={`text-3xl font-bold ${netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(netIncome)}
                </p>
                {netIncome >= 0 ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </div>
            </div>
          </div>

          {/* Financial Overview Graph */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Financial Overview</h2>
            <div className="h-80">
              {graphData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={graphData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="period" 
                      tick={{ fontSize: 12 }}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis 
                      tickFormatter={(value) => `$${value.toFixed(0)}`}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        color: '#374151'
                      }}
                      labelStyle={{
                        color: '#374151',
                        fontWeight: '600'
                      }}
                      formatter={(value: number, name: string) => [
                        `$${value.toFixed(2)}`,
                        name === 'income' ? 'Income' : 'Expenses'
                      ]}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="income" 
                      stroke="#10B981" 
                      strokeWidth={2}
                      dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                      name="Income" 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="expenses" 
                      stroke="#EF4444" 
                      strokeWidth={2}
                      dot={{ fill: '#EF4444', strokeWidth: 2, r: 4 }}
                      name="Expenses" 
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Financial Data</h3>
                    <p className="text-gray-600">Financial overview will appear here after transactions are recorded.</p>
                  </div>
                </div>
              )}
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
                <button className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1 rounded-lg text-sm hover:cursor-pointer">
                  Filter
                </button>
              </div>
            </div>
            <div className="px-4 py-2 bg-blue-50 border-b border-blue-100">
              <p className="text-sm text-blue-700">If you recently made a payment and don&apos;t see it here, please refresh the page.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                      Date & Time
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                      Transaction ID
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                      Initiated By
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                      Recipient
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                      Type
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                      Amount
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                      {/* Test Payment Flag */}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loadingTransactions ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                        Loading transactions...
                      </td>
                    </tr>
                  ) : sortedTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                        No transactions found. Transactions will appear here after payments are processed.
                      </td>
                    </tr>
                  ) : (
                    sortedTransactions.map((transaction) => {
                      const recipient = transaction.targetUserName || 'N/A';
                      const isTestPayment = (transaction as Transaction & { isTestPayment?: boolean }).isTestPayment === true;
                      return (
                        <tr
                          key={transaction.id}
                          className="hover:bg-gray-50 hover:cursor-pointer"
                          onClick={() => {
                            setSelectedTransaction(transaction);
                            setShowTransactionModal(true);
                          }}
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDate(transaction.createdAt)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {transaction.id}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {transaction.actorName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {recipient}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {transaction.type === 'creatorPayout' ? 'Creator Payout' : 
                             transaction.type === 'deposit' ? 'Deposit' :
                             transaction.type === 'withdrawal' ? 'Withdrawal' :
                             transaction.type}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <span className={(typeof transaction.amount === 'string' ? parseFloat(transaction.amount) : transaction.amount) >= 0 ? 'text-green-600' : 'text-red-600'}>
                              {formatCurrency(typeof transaction.amount === 'string' ? parseFloat(transaction.amount) : transaction.amount)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {isTestPayment && (
                              <span className="inline-block bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-semibold">Test Payment</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center">
              <p className="text-sm text-gray-900">Showing {sortedTransactions.length} transactions</p>
            </div>
          </div>
        </>
      )}

      {activeTab === 'pay-creators' && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="mb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Select Campaign</h2>
            <select 
              className="w-full p-2 border border-gray-300 rounded-lg text-gray-900"
              onChange={(e) => {
                const campaignId = e.target.value;
                if (!campaignId) return;
                
                const selectedCampaign = campaigns.find(c => c.id === campaignId);
                if (selectedCampaign) {
                  setSelectedCampaign(selectedCampaign);
                  // Reset payment states when selecting a new campaign
                  setIsPaymentSuccess(false);
                  setIsReleasingPayments(false);
                }
              }}
            >
              <option value="">Select a campaign...</option>
              {campaigns.map((campaign) => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.name} {campaign.isComplete ? '(Completed)' : ''}
                </option>
              ))}
            </select>
          </div>

          {isLoadingCampaign && (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          )}

          {!isLoadingCampaign && selectedCampaign && (
            <>
              {/* Campaign Overview */}
              <div className="mb-8">
                <div className="flex items-center gap-4 mb-4">
                  {selectedCampaign.imageUrl ? (
                    <Image
                      src={selectedCampaign.imageUrl}
                      alt={selectedCampaign.name}
                      width={64}
                      height={64}
                      className="rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center">
                      <span className="text-primary font-bold text-xl">
                        {selectedCampaign.name.charAt(0)}
                      </span>
                    </div>
                  )}
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{selectedCampaign.name}</h3>
                    <p className="text-sm text-gray-600">Campaign ID: {selectedCampaign.id}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-auto">
                    <button
                      onClick={() => setShowVideoModal(true)}
                      className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 px-4 py-2 rounded-lg flex items-center gap-2 hover:cursor-pointer"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <span>Manage Videos</span>
                    </button>
                    <button
                      onClick={() => setShowCampaignModal(true)}
                      className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 px-4 py-2 rounded-lg flex items-center gap-2 hover:cursor-pointer"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      <span>Edit Campaign</span>
                    </button>

                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Budget</p>
                    <p className="font-medium text-gray-900">${selectedCampaign.budget.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Rate per 1M</p>
                    <p className="font-medium text-gray-900">${selectedCampaign.ratePerMillion.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Views</p>
                    <p className="font-medium text-gray-900">{selectedCampaign.views.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Videos</p>
                    <p className="font-medium text-gray-900">{selectedCampaign.videos?.length || 0}</p>
                  </div>
                </div>
              </div>

              {!selectedCampaign.isComplete ? (
                <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-600" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <p className="text-yellow-800 font-medium">Campaign is still active. Complete campaign before sending payments</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Creators List */}
                  <div className="mb-8">
                    <div className="w-full">
                      {/* Total Payout Display */}
                      {(() => {
                        const totalPayout = selectedCampaign.videos
                          ?.filter((v: Video) => v.status === 'approved')
                          .reduce((sum: number, v: Video) => sum + (v.earnings || 0), 0) || 0;
                        
                        return (
                          <div className="mb-6 p-6 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl">
                            <div className="text-center">
                              <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Released To Creators</h3>
                              <p className="text-4xl font-bold text-green-600">${totalPayout.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                              <p className="text-sm text-gray-600 mt-2">This amount will be distributed to all approved creators</p>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Only show release payments button if payments haven't been released yet */}
                      {!selectedCampaign.fundsReleased && !selectedCampaign.paymentsReleased && (
                        <button
                          onClick={async () => {
                            if (!selectedCampaign.videos?.length) return;
                            
                            // Calculate total payout for confirmation
                            const totalPayout = selectedCampaign.videos
                              .filter((v: Video) => v.status === 'approved')
                              .reduce((sum: number, v: Video) => sum + (v.earnings || 0), 0);
                            
                            // Show confirmation modal
                            setShowConfirmationModal(true);
                          }}
                          disabled={(() => {
                            // Check if no videos in campaign
                            if (!selectedCampaign.videos?.length) return true;
                            
                            // Check if any videos are still pending
                            if (selectedCampaign.videos.some((v: Video) => v.status === 'pending')) return true;
                            
                            // Check if currently releasing payments
                            if (isReleasingPayments) return true;
                            
                            return false;
                          })()}
                          className={`${
                            (() => {
                              // Check if no videos in campaign or pending videos
                              if (!selectedCampaign.videos?.length || selectedCampaign.videos.some((v: Video) => v.status === 'pending')) {
                                return 'bg-gray-300 text-gray-500 cursor-not-allowed';
                              }
                              
                              // Check if currently releasing payments
                              if (isReleasingPayments) {
                                return 'bg-blue-500 text-white cursor-not-allowed';
                              }
                              
                              // Default state
                              return 'bg-primary hover:bg-primary-dark text-white hover:cursor-pointer transform hover:scale-105 transition-all duration-200';
                            })()
                          } w-full px-12 py-6 rounded-2xl text-xl font-bold shadow-lg flex flex-col items-center gap-2 relative overflow-hidden`}
                        >
                          {isReleasingPayments ? (
                            <>
                              <div className="animate-spin rounded-full h-8 w-8 border-4 border-white border-t-transparent"></div>
                              <div className="text-center">
                                <div className="text-xl font-bold">Releasing Payments...</div>
                                <div className="text-sm font-normal opacity-90">Please wait while we process payments</div>
                              </div>
                            </>
                          ) : (
                            <>
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <div className="text-center">
                                <div className="text-xl font-bold">Release Payments</div>
                                <div className="text-sm font-normal opacity-90">Send payments to creator wallets</div>
                              </div>
                            </>
                          )}
                        </button>
                      )}

                      {/* Show success message when payments have been released */}
                      {(selectedCampaign.fundsReleased || selectedCampaign.paymentsReleased) && (
                        <div className="w-full px-12 py-6 rounded-2xl text-xl font-bold shadow-lg flex flex-col items-center gap-2 bg-green-500 text-white">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <div className="text-center">
                            <div className="text-xl font-bold">Payments Successfully Released</div>
                            <div className="text-sm font-normal opacity-90">All payments have been distributed</div>
                          </div>
                        </div>
                      )}

                      {/* View Released Payments Receipt Button */}
                      {(selectedCampaign.fundsReleased || selectedCampaign.paymentsReleased) && (
                        <div className="mt-6">
                          <button
                            onClick={() => setShowPaymentReceiptModal(true)}
                            className="w-full px-8 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl text-lg font-semibold shadow-lg transform hover:scale-105 transition-all duration-200 flex items-center justify-center gap-3 hover:cursor-pointer"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            View Released Payments Receipt
                          </button>
                        </div>
                      )}

                      {/* Debug info - remove this after testing */}
                      <div className="mt-4 p-2 bg-gray-100 rounded text-xs">
                        Debug: fundsReleased={String(selectedCampaign.fundsReleased)}, paymentsReleased={String(selectedCampaign.paymentsReleased)}
                      </div>

                      {/* Disabled notification - only show when button is visible but disabled */}
                      {!selectedCampaign.fundsReleased && !selectedCampaign.paymentsReleased && (() => {
                        // Check if no videos in campaign
                        if (!selectedCampaign.videos?.length) {
                          return (
                            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                              <div className="flex items-center gap-2 text-red-700">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="font-medium">Cannot release payments: No videos found in this campaign</span>
                              </div>
                              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded">
                                <p className="text-sm text-blue-700">💡 If you recently added videos and don&apos;t see them here, please refresh the page to see your changes.</p>
                              </div>
                            </div>
                          );
                        }
                        
                        // Check if any videos are still pending
                        if (selectedCampaign.videos.some((v: Video) => v.status === 'pending')) {
                          const pendingCount = selectedCampaign.videos.filter((v: Video) => v.status === 'pending').length;
                          return (
                            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                              <div className="flex items-center gap-2 text-yellow-700">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                </svg>
                                <span className="font-medium">
                                  Cannot release payments: {pendingCount} video{pendingCount > 1 ? 's' : ''} still pending review. Please approve or deny all videos first.
                                </span>
                              </div>
                              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded">
                                <p className="text-sm text-blue-700">💡 If you recently approved or denied videos and don&apos;t see the updated status, please refresh the page to see your changes.</p>
                              </div>
                            </div>
                          );
                        }
                        
                        return null;
                      })()}
                    </div>
                  </div>

                  <div className="mb-6">
                    <h2 className="text-lg font-medium text-gray-900 mb-4">Creators</h2>
                  </div>

                  <div className="space-y-3">
                    {(() => {
                      // Group videos by author_id and calculate total earnings
                      const creatorMap = new Map();
                      selectedCampaign.videos?.forEach(video => {
                        if (!video.author_id) return;
                        
                        const existing = creatorMap.get(video.author_id) || {
                          author_id: video.author_id,
                          totalEarnings: 0,
                          videos: [],
                          allPaid: true,
                        };
                        
                        existing.totalEarnings += video.earnings || 0;
                        existing.videos.push(video);
                        if (!video.hasBeenPaid) {
                          existing.allPaid = false;
                        }
                        
                        creatorMap.set(video.author_id, existing);
                      });

                      return Array.from(creatorMap.values()).map(creator => {
                        const userDetails = creatorDetails[creator.author_id];
                        const paymentEmail = userDetails?.paymentEmail;
                        const isExpanded = expandedCreators.has(creator.author_id);
                        
                        // Calculate additional metrics
                        const approvedVideos = creator.videos.filter((v: Video) => v.status === 'approved');
                        const deniedVideos = creator.videos.filter((v: Video) => v.status === 'denied');
                        const totalViews = creator.videos.reduce((sum: number, v: Video) => sum + (v.views || 0), 0);
                        const totalPayout = approvedVideos.reduce((sum: number, v: Video) => sum + (v.earnings || 0), 0);
                        
                        return (
                          <div key={creator.author_id} className="border border-gray-200 rounded-lg overflow-hidden">
                            {/* Collapsed Header - Clickable */}
                            <div 
                              className="p-4 hover:bg-gray-50 hover:cursor-pointer transition-colors"
                              onClick={() => toggleCreatorExpansion(creator.author_id)}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                      <h4 className="font-medium text-gray-900 text-sm">
                                        {userDetails ? `${userDetails.firstName} ${userDetails.lastName}` : 'Unknown User'}
                                      </h4>
                                      <span className="text-xs text-gray-500">•</span>
                                      <span className="text-xs text-gray-600">{userDetails?.email || 'No email'}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-semibold text-green-600">
                                        ${totalPayout.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </span>
                                      <svg 
                                        xmlns="http://www.w3.org/2000/svg" 
                                        className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                                        fill="none" 
                                        viewBox="0 0 24 24" 
                                        stroke="currentColor"
                                      >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                      </svg>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-6 text-xs text-gray-600">
                                    <div className="flex items-center gap-1">
                                      <span>Payment:</span>
                                      {paymentEmail ? (
                                        <div className="flex items-center gap-1">
                                          <span className="text-gray-900">{paymentEmail}</span>
                                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                          </svg>
                                        </div>
                                      ) : (
                                        <span className="text-red-500 font-medium">Missing</span>
                                      )}
                                    </div>
                                    <div>
                                      <span>{creator.videos.length} videos</span>
                                    </div>
                                    <div>
                                      <span className="text-green-600">{approvedVideos.length} approved</span>
                                    </div>
                                    <div>
                                      <span className="text-red-600">{deniedVideos.length} denied</span>
                                    </div>
                                    <div>
                                      <span>{totalViews.toLocaleString()} views</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Expanded Content */}
                            {isExpanded && (
                              <div className="border-t border-gray-200 p-4 bg-gray-50">
                                {/* Video Itemization */}
                                <div className="space-y-2">
                                  <h5 className="text-sm font-medium text-gray-900 mb-3">Video Details:</h5>
                                  {creator.videos.map((video: Video, index: number) => (
                                    <div key={video.id} className="text-sm bg-white rounded p-3 border border-gray-200">
                                      <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                          <a 
                                            href={video.url} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="text-primary hover:text-primary-dark hover:cursor-pointer font-medium"
                                          >
                                            Video {index + 1}
                                          </a>
                                          <span className="text-gray-600 ml-2">{video.title || 'Untitled Video'}</span>
                                        </div>
                                        <div className="flex items-center gap-4 text-xs">
                                          <span className="font-medium text-gray-800">
                                            ${video.status === 'approved' ? (video.earnings || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                                          </span>
                                          <span className={`px-2 py-1 rounded-full font-medium ${
                                            video.status === 'approved' ? 'bg-green-100 text-green-700' :
                                            video.status === 'denied' ? 'bg-red-100 text-red-700' :
                                            'bg-yellow-100 text-yellow-700'
                                          }`}>
                                            {video.status?.charAt(0).toUpperCase() + video.status?.slice(1) || 'Pending'}
                                          </span>
                                          <span className="text-gray-600">{video.views?.toLocaleString() || 0} views</span>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                  
                                  <div className="pt-3 border-t border-gray-300 bg-white rounded p-3 mt-3">
                                    <div className="flex justify-between items-center">
                                      <span className="text-sm font-medium text-gray-900">Total Payout:</span>
                                      <span className="text-lg font-bold text-green-600">
                                        ${totalPayout.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </span>
                                    </div>
                                  </div>
                                  
                                  {creator.videos.some((v: Video) => v.status === 'pending') && (
                                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                                      <p className="text-sm text-yellow-800">
                                        ⚠️ You have videos still pending. Please approve or deny all videos before submitting payment.
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>

                  {isLoadingCreators && (
                    <div className="flex justify-center items-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmationModal && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Confirm Payment Release</h3>
              <button
                onClick={() => setShowConfirmationModal(false)}
                className="text-gray-500 hover:text-gray-700 hover:cursor-pointer p-2 rounded-lg hover:bg-gray-100"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Are you sure?</h4>
              <p className="text-gray-600 mb-4">
                You are about to release payments totaling{' '}
                <span className="font-bold text-blue-600">
                  ${(() => {
                    const totalPayout = selectedCampaign?.videos
                      ?.filter((v: Video) => v.status === 'approved')
                      .reduce((sum: number, v: Video) => sum + (v.earnings || 0), 0) || 0;
                    return totalPayout.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                  })()}
                </span>
              </p>
              <p className="text-sm text-gray-500">
                This action cannot be undone. All approved creators will receive their payments immediately.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmationModal(false)}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 hover:cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setShowConfirmationModal(false);
                  
                  if (!selectedCampaign?.videos?.length) {
                    toast.error('No videos found in this campaign');
                    return;
                  }
                  
                  // Check if payments have already been released (frontend state)
                  if (selectedCampaign.paymentsReleased || selectedCampaign.fundsReleased) {
                    toast.error('Payments have already been released for this campaign');
                    return;
                  }
                  
                  setIsReleasingPayments(true);
                  
                  // Double-check database state before sending request
                  try {
                    const campaignDoc = await getDoc(doc(db, 'campaigns', selectedCampaign.id));
                    if (!campaignDoc.exists()) {
                      toast.error('Campaign not found');
                      setIsReleasingPayments(false);
                      return;
                    }
                    
                    const latestCampaignData = campaignDoc.data() as Campaign;
                    if (latestCampaignData.paymentsReleased || latestCampaignData.fundsReleased) {
                      toast.error('Payments have already been released for this campaign (verified from database)');
                      setIsReleasingPayments(false);
                      // Update local state to match database
                      setSelectedCampaign(prev => prev ? { ...prev, paymentsReleased: latestCampaignData.paymentsReleased, fundsReleased: latestCampaignData.fundsReleased } : null);
                      return;
                    }
                  } catch (dbError) {
                    console.error('Error checking campaign status:', dbError);
                    toast.error('Failed to verify campaign status. Please try again.');
                    setIsReleasingPayments(false);
                    return;
                  }
                  
                  const userIds = Array.from(new Set(selectedCampaign.videos.map((v: Video) => v.author_id)));
                  try {
                    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/release-campaign-payments`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        userIds,
                        campaignId: selectedCampaign.id,
                        actorId: user?.uid,
                      }),
                    });
                    
                    if (!response.ok) {
                      const errorData = await response.json();
                      throw new Error(errorData.error || 'Failed to release payments');
                    }
                    
                    const data = await response.json();
                    
                    // Update campaign with payment release data and mark as paid
                    const updatedCampaign: Campaign = {
                      ...selectedCampaign,
                      paymentsReleased: true,
                      fundsReleased: true,
                      paymentsReleasedBy: user?.uid,
                      paymentsReleasedAt: Date.now(),
                      paymentReleaseReceipt: data.paymentReleaseReceipt,
                      // Update hasBeenPaid for all approved videos
                      videos: selectedCampaign.videos?.map(video => {
                        if (video.status === 'approved') {
                          return { ...video, hasBeenPaid: true };
                        }
                        return video;
                      })
                    };
                    setSelectedCampaign(updatedCampaign);
                    
                    // Update the campaigns list
                    setCampaigns(prevCampaigns => 
                      prevCampaigns.map(c => c.id === selectedCampaign.id ? updatedCampaign : c)
                    );
                    
                    // Show success modal
                    setShowSuccessModal(true);
                    
                    toast.success(data.message || 'Successfully released payments to all creators');
                    
                  } catch (error) {
                    console.error('Error releasing payments:', error);
                    toast.error(error instanceof Error ? error.message : 'Failed to release payments');
                  } finally {
                    setIsReleasingPayments(false);
                  }
                }}
                disabled={isReleasingPayments}
                className={`flex-1 px-4 py-3 rounded-lg ${
                  isReleasingPayments
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                    : 'bg-primary hover:bg-primary-dark text-white hover:cursor-pointer'
                }`}
              >
                {isReleasingPayments ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                    Processing...
                  </div>
                ) : (
                  'Confirm Release'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Payments Successful!</h3>
              <p className="text-gray-600 mb-6">
                All payments have been successfully released to the creators.
              </p>
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  window.location.reload();
                }}
                className="w-full px-4 py-3 bg-primary hover:bg-primary-dark text-white rounded-lg hover:cursor-pointer"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Receipt Modal */}
      {showPaymentReceiptModal && selectedCampaign && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-8 py-6 rounded-t-xl">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">Payment Release Receipt</h3>
                  <p className="text-sm text-gray-600 mt-1">Campaign: {selectedCampaign.name}</p>
                </div>
                <button
                  onClick={() => setShowPaymentReceiptModal(false)}
                  className="text-gray-500 hover:text-gray-700 hover:cursor-pointer p-2 rounded-lg hover:bg-gray-100"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-8 space-y-8">
              {/* Payment Summary */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
                <div className="text-center">
                  <div className="flex items-center justify-center mb-4">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                  <h4 className="text-xl font-bold text-gray-900 mb-2">Payments Successfully Released</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Released on: {selectedCampaign.paymentsReleasedAt ? new Date(selectedCampaign.paymentsReleasedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : 'N/A'}
                  </p>
                  <p className="text-sm text-gray-600">
                    Released by: {selectedCampaign.paymentsReleasedBy || 'Unknown'}
                  </p>
                </div>
              </div>

              {/* Wallet Updates */}
              {selectedCampaign.paymentReleaseReceipt?.walletUpdates && (
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <h5 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Wallet Updates ({selectedCampaign.paymentReleaseReceipt.walletUpdates.length} creators)
                  </h5>
                  
                  <div className="grid gap-4">
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {selectedCampaign.paymentReleaseReceipt.walletUpdates.map((update: any, index: number) => (
                      <div key={update.userId} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex-1">
                            <h6 className="font-semibold text-gray-900 text-lg">
                              {update.userData.firstName} {update.userData.lastName}
                            </h6>
                            <p className="text-sm text-gray-600">{update.userData.email}</p>
                            <p className="text-sm text-gray-600">Payment: {update.userData.paymentEmail}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-green-600">
                              +${update.payoutAmount.toFixed(2)}
                            </p>
                            <p className="text-sm text-gray-600">Payout Amount</p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
                          <div className="text-center">
                            <p className="text-sm text-gray-600">Previous Wallet</p>
                            <p className="text-lg font-semibold text-gray-900">${update.previousWallet.toFixed(2)}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-sm text-gray-600">Payout Amount</p>
                            <p className="text-lg font-semibold text-green-600">+${update.payoutAmount.toFixed(2)}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-sm text-gray-600">New Wallet</p>
                            <p className="text-lg font-semibold text-blue-600">${update.newWallet.toFixed(2)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Total Summary */}
                  <div className="mt-6 pt-6 border-t border-gray-300 bg-white rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold text-gray-900">Total Distributed:</span>
                      <span className="text-2xl font-bold text-green-600">
                        ${selectedCampaign.paymentReleaseReceipt.walletUpdates.reduce((sum: number, update: {
                          userId: string;
                          previousWallet: number;
                          payoutAmount: number;
                          newWallet: number;
                          userData: {
                            email: string;
                            firstName: string;
                            lastName: string;
                            paymentEmail: string;
                            wallet: number;
                          };
                        }) => sum + update.payoutAmount, 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Unpaid Videos */}
              {selectedCampaign.paymentReleaseReceipt?.unpaidVideos && selectedCampaign.paymentReleaseReceipt.unpaidVideos.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <h5 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Unpaid Videos ({selectedCampaign.paymentReleaseReceipt.unpaidVideos.length})
                  </h5>
                  <p className="text-sm text-gray-600 mb-4">
                    Videos that either made $0.00 or were rejected
                  </p>
                  <div className="space-y-2">
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {selectedCampaign.paymentReleaseReceipt.unpaidVideos.map((unpaidVideo: any, index: number) => (
                      <div key={unpaidVideo.video?.id || index} className="bg-gray-50 rounded p-3 border border-gray-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{unpaidVideo.video?.title || 'Untitled Video'}</p>
                            <p className="text-sm text-gray-600">Status: {unpaidVideo.video?.status || 'Unknown'}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-600">{unpaidVideo.video?.views?.toLocaleString() || 0} views</p>
                            <p className="text-sm text-gray-600">Potential: ${(unpaidVideo.video?.earnings || 0).toFixed(2)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Transaction Details Modal */}
      {showTransactionModal && selectedTransaction && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-xl">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Transaction Details</h3>
                  <p className="text-sm text-gray-600 mt-1">ID: {selectedTransaction.id}</p>
                </div>
                <button
                  onClick={() => setShowTransactionModal(false)}
                  className="text-gray-500 hover:text-gray-700 hover:cursor-pointer p-2 rounded-lg hover:bg-gray-100"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Main Transaction Info */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      (typeof selectedTransaction.amount === 'string' ? parseFloat(selectedTransaction.amount) : selectedTransaction.amount) >= 0 
                        ? 'bg-green-100' 
                        : 'bg-red-100'
                    }`}>
                      {(typeof selectedTransaction.amount === 'string' ? parseFloat(selectedTransaction.amount) : selectedTransaction.amount) >= 0 ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900">
                        {selectedTransaction.type === 'creatorPayout' ? 'Creator Payout' : 
                         selectedTransaction.type === 'deposit' ? 'Deposit' :
                         selectedTransaction.type === 'withdrawal' ? 'Withdrawal' :
                         selectedTransaction.type}
                      </h4>
                      <p className="text-sm text-gray-600">{formatDate(selectedTransaction.createdAt)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-2xl font-bold ${
                      (typeof selectedTransaction.amount === 'string' ? parseFloat(selectedTransaction.amount) : selectedTransaction.amount) >= 0 
                        ? 'text-green-600' 
                        : 'text-red-600'
                    }`}>
                      {formatCurrency(typeof selectedTransaction.amount === 'string' ? parseFloat(selectedTransaction.amount) : selectedTransaction.amount)}
                    </p>
                    <p className="text-sm text-gray-600">{selectedTransaction.currency}</p>
                  </div>
                </div>

                {/* Status Badge */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                      selectedTransaction.status === 'completed' ? 'bg-green-100 text-green-800' :
                      selectedTransaction.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      selectedTransaction.status === 'failed' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {selectedTransaction.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">Method: {selectedTransaction.paymentMethod}</p>
                </div>
              </div>

              {/* Parties Involved */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-xl p-4">
                  <h5 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    From (Actor)
                  </h5>
                  <div className="space-y-2">
                    <p className="text-lg font-medium text-gray-900">{selectedTransaction.actorName}</p>
                    <p className="text-sm text-gray-600">ID: {selectedTransaction.actorId}</p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-4">
                  <h5 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2m0 0V9a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    To (Recipient)
                  </h5>
                  <div className="space-y-2">
                    <p className="text-lg font-medium text-gray-900">
                      {selectedTransaction.targetUserName || 'N/A'}
                    </p>
                    <p className="text-sm text-gray-600">ID: {selectedTransaction.targetUserId}</p>
                    {selectedTransaction.paymentEmail && (
                      <p className="text-sm text-gray-600">Email: {selectedTransaction.paymentEmail}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Campaign Info */}
              {selectedTransaction.campaignId && (
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                  <h5 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    Campaign Information
                  </h5>
                  <p className="text-sm text-gray-600">Campaign ID: {selectedTransaction.campaignId}</p>
                </div>
              )}

              {/* Payment Details */}
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <h5 className="text-sm font-semibold text-gray-900 mb-4">Payment Details</h5>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Reference</p>
                    <p className="font-medium text-gray-900">{selectedTransaction.paymentReference}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Source</p>
                    <p className="font-medium text-gray-900">{selectedTransaction.source}</p>
                  </div>
                </div>
              </div>

              {/* Video Information */}
              {selectedTransaction.metadata?.videoCount && selectedTransaction.metadata.videoCount > 0 && (
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <h5 className="text-sm font-semibold text-gray-900 mb-4">Video Information</h5>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Video Count</p>
                      <p className="font-medium text-gray-900">{selectedTransaction.metadata.videoCount}</p>
                    </div>
                    {selectedTransaction.metadata.totalViews && (
                      <div>
                        <p className="text-gray-600">Total Views</p>
                        <p className="font-medium text-gray-900">{selectedTransaction.metadata.totalViews.toLocaleString()}</p>
                      </div>
                    )}
                  </div>
                  {selectedTransaction.metadata.videoIds && selectedTransaction.metadata.videoIds.length > 0 && (
                    <div className="mt-3">
                      <p className="text-gray-600 text-sm mb-2">Video IDs:</p>
                      <div className="bg-gray-50 rounded p-2">
                        <p className="text-xs text-gray-700 break-all">{selectedTransaction.metadata.videoIds.join(', ')}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Additional Metadata */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h5 className="text-sm font-semibold text-gray-900 mb-3">Additional Information</h5>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {selectedTransaction.completedAt && (
                    <div>
                      <p className="text-gray-600">Completed At</p>
                      <p className="font-medium text-gray-900">{formatDate(selectedTransaction.completedAt)}</p>
                    </div>
                  )}
                  {selectedTransaction.payoutBatchId && (
                    <div>
                      <p className="text-gray-600">Payout Batch ID</p>
                      <p className="font-medium text-gray-900">{selectedTransaction.payoutBatchId}</p>
                    </div>
                  )}
                  {selectedTransaction.reconciliationId && (
                    <div>
                      <p className="text-gray-600">Reconciliation ID</p>
                      <p className="font-medium text-gray-900">{selectedTransaction.reconciliationId}</p>
                    </div>
                  )}
                  {selectedTransaction.walletAmount && (
                    <div>
                      <p className="text-gray-600">Wallet Amount</p>
                      <p className="font-medium text-gray-900">{formatCurrency(selectedTransaction.walletAmount)}</p>
                    </div>
                  )}
                  {selectedTransaction.isTestPayment && (
                    <div>
                      <p className="text-gray-600">Test Payment</p>
                      <p className="font-medium text-yellow-600">Yes</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Record Deposit Modal */}
      {showDepositModal && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Record Deposit</h3>
              <button
                onClick={() => {
                  setShowDepositModal(false);
                  setDepositForm({
                    campaignId: '',
                    amount: '',
                    paymentMethod: 'paypal',
                    paymentReference: ''
                  });
                }}
                className="text-gray-500 hover:text-gray-700 hover:cursor-pointer p-2 rounded-lg hover:bg-gray-100"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!depositForm.campaignId || !depositForm.amount) {
                toast.error('Please fill in all required fields');
                return;
              }

              const amount = parseFloat(depositForm.amount);
              if (isNaN(amount) || amount <= 0) {
                toast.error('Please enter a valid amount');
                return;
              }

              setIsSubmittingDeposit(true);
              try {
                const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/record-deposit`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    actorId: user?.uid,
                    campaignId: depositForm.campaignId,
                    amount: amount,
                    paymentMethod: depositForm.paymentMethod,
                    paymentReference: depositForm.paymentReference || null,
                  }),
                });

                if (!response.ok) {
                  const errorData = await response.json();
                  throw new Error(errorData.error || 'Failed to record deposit');
                }

                const data = await response.json();
                toast.success('Deposit recorded successfully!');
                
                // Reload the page to show the new transaction
                window.location.reload();
                
              } catch (error) {
                console.error('Error recording deposit:', error);
                toast.error(error instanceof Error ? error.message : 'Failed to record deposit');
              } finally {
                setIsSubmittingDeposit(false);
              }
            }} className="space-y-4">
              {/* Campaign Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Campaign *
                </label>
                <select
                  value={depositForm.campaignId}
                  onChange={(e) => setDepositForm(prev => ({ ...prev, campaignId: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-primary focus:border-primary"
                  required
                >
                  <option value="">Select a campaign...</option>
                  {campaigns.map((campaign) => (
                    <option key={campaign.id} value={campaign.id}>
                      {campaign.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Amount (USD) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={depositForm.amount}
                  onChange={(e) => setDepositForm(prev => ({ ...prev, amount: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="0.00"
                  required
                />
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Payment Method *
                </label>
                <select
                  value={depositForm.paymentMethod}
                  onChange={(e) => setDepositForm(prev => ({ ...prev, paymentMethod: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-primary focus:border-primary"
                  required
                >
                  <option value="paypal">PayPal</option>
                  <option value="stripe">Stripe</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="check">Check</option>
                  <option value="cash">Cash</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Payment Reference (Optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Payment Reference (Optional)
                </label>
                <input
                  type="text"
                  value={depositForm.paymentReference}
                  onChange={(e) => setDepositForm(prev => ({ ...prev, paymentReference: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="Transaction ID, check number, etc."
                />
              </div>

              {/* Submit Button */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowDepositModal(false);
                    setDepositForm({
                      campaignId: '',
                      amount: '',
                      paymentMethod: 'paypal',
                      paymentReference: ''
                    });
                  }}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 hover:cursor-pointer"
                  disabled={isSubmittingDeposit}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingDeposit}
                  className="flex-1 px-4 py-3 bg-primary hover:bg-primary-dark text-white rounded-lg hover:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmittingDeposit ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Recording...
                    </div>
                  ) : (
                    'Record Deposit'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Video Modal */}
      {showVideoModal && selectedCampaign && (
        <VideoModal
          campaignId={selectedCampaign.id}
          videoUrls={selectedCampaign.videos || []}
          onClose={() => setShowVideoModal(false)}
          onVideosUpdated={() => {
            // The VideoModal component will handle the database update internally
            // We just need to refresh our local state by triggering a re-fetch
            // The existing useEffect with onSnapshot will automatically update the campaigns
            toast.success('Videos updated successfully!');
          }}
        />
      )}

      {/* Campaign Modal */}
      {showCampaignModal && selectedCampaign && (
        <CampaignModal
          initialData={selectedCampaign}
          onClose={() => setShowCampaignModal(false)}
          onSave={async (updatedCampaign) => {
            try {
              // Update the campaign in the database
              const campaignRef = doc(db, 'campaigns', updatedCampaign.id);
              await updateDoc(campaignRef, {
                ...updatedCampaign,
                lastUpdated: Date.now()
              });
              
              // Update the campaigns list with the edited campaign
              setCampaigns(prevCampaigns => 
                prevCampaigns.map(c => c.id === updatedCampaign.id ? updatedCampaign : c)
              );
              setSelectedCampaign(updatedCampaign);
              setShowCampaignModal(false);
              toast.success('Campaign updated successfully!');
            } catch (error) {
              console.error('Error updating campaign:', error);
              toast.error('Failed to update campaign. Please try again.');
            }
          }}
          isLoading={false}
        />
      )}
    </div>
  );
} 
"use client";

import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Image from 'next/image';
import { toast } from 'react-hot-toast';
import { useQuery, useCollection } from '@/hooks';
import { Campaign, Video, Transaction } from '@/types/campaign';
import { useAuth } from '@/contexts/AuthContext';
import { User } from '@/types/user';
import { doc, getDoc, collection, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface ReceiptData {
  receiptId: string;
  creator: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    paymentEmail: string;
  };
  processedBy: {
    id: string;
    name: string;
  };
  payment: {
    amount: number;
    currency: string;
    method: string;
    status: string;
    batchId: string;
    timestamp: number;
  };
  summary: {
    netAmount: number;
    platformFee: number;
    totalVideos: number;
    totalViews: number;
    unpaidVideosCount: number;
  };
  metadata: {
    paymentReference: string;
  };
}

export default function PaymentsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [isLoadingCampaign, setIsLoadingCampaign] = useState(false);
  const [creatorDetails, setCreatorDetails] = useState<Record<string, User>>({});
  const [isLoadingCreators, setIsLoadingCreators] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [showCampaignReceiptsModal, setShowCampaignReceiptsModal] = useState(false);
  const { documents: transactions = [], loading: loadingTransactions } = useCollection<Transaction>('transactions');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositForm, setDepositForm] = useState({
    campaignId: '',
    amount: '',
    paymentMethod: 'paypal',
    paymentReference: ''
  });
  const [isSubmittingDeposit, setIsSubmittingDeposit] = useState(false);
  
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

  // Calculate financial metrics
  const totalRevenue = transactions
    .filter(t => {
      const amount = typeof t.amount === 'string' ? parseFloat(t.amount) : t.amount;
      return amount > 0;
    })
    .reduce((sum, t) => {
      const amount = typeof t.amount === 'string' ? parseFloat(t.amount) : t.amount;
      return sum + (typeof amount === 'number' && !isNaN(amount) ? amount : 0);
    }, 0);

  const totalExpenses = transactions
    .filter(t => {
      const amount = typeof t.amount === 'string' ? parseFloat(t.amount) : t.amount;
      return amount < 0;
    })
    .reduce((sum, t) => {
      const amount = typeof t.amount === 'string' ? parseFloat(t.amount) : t.amount;
      return sum + (typeof amount === 'number' && !isNaN(amount) ? Math.abs(amount) : 0);
    }, 0);

  const netIncome = totalRevenue - totalExpenses;
  const availableBalance = totalRevenue - totalExpenses;

  // Sort transactions by date (most recent first)
  const sortedTransactions = React.useMemo(() => {
    return [...transactions].sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
  }, [transactions]);

  // Group transactions by month for the graph
  const graphData = React.useMemo(() => {
    // Helper to get month label
    const getMonthLabel = (date: Date) =>
      date.toLocaleString('en-US', { month: 'short', year: '2-digit' });
    // Helper to get month index from short name
    const monthIndex: Record<string, number> = {
      Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11
    };
    // Group by month
    const map = new Map<string, { income: number; expenses: number }>();
    transactions.forEach((t) => {
      // Handle different timestamp formats
      let d: Date;
      if (t.createdAt && typeof t.createdAt === 'object' && 'toDate' in t.createdAt) {
        // Firestore timestamp
        d = (t.createdAt as Timestamp).toDate();
      } else if (typeof t.createdAt === 'string') {
        // String timestamp
        d = new Date(t.createdAt);
      } else if (typeof t.createdAt === 'number') {
        // Number timestamp (milliseconds)
        d = new Date(t.createdAt);
      } else {
        // Fallback to current date
        d = new Date();
      }
      
      const label = getMonthLabel(d);
      const entry = map.get(label) || { income: 0, expenses: 0 };
      
      // Handle potential string amounts and ensure proper number conversion
      const amount = typeof t.amount === 'string' ? parseFloat(t.amount) : t.amount;
      
      // Positive amounts are income, negative amounts are expenses
      if (typeof amount === 'number' && !isNaN(amount)) {
        if (amount > 0) {
          entry.income += amount;
        } else if (amount < 0) {
          entry.expenses += Math.abs(amount);
        }
      }
      
      map.set(label, entry);
    });
    // Sort by date (ascending)
    const sorted = Array.from(map.entries())
      .map(([month, vals]) => ({ month, ...vals }))
      .sort((a, b) => {
        // Parse year and month for sorting
        const [aMonth, aYear] = a.month.split(' ');
        const [bMonth, bYear] = b.month.split(' ');
        const aDate = new Date(2000 + parseInt(aYear, 10), monthIndex[aMonth]);
        const bDate = new Date(2000 + parseInt(bYear, 10), monthIndex[bMonth]);
        return aDate.getTime() - bDate.getTime();
      });
    return sorted;
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

  // Helper function to update campaign state after payment
  const updateCampaignAfterPayment = (campaign: Campaign, receiptData: ReceiptData, paidUserIds: string[]) => {
    const updatedCampaign = {
      ...campaign,
      receipts: [...(campaign.receipts || []), receiptData],
      // Update hasBeenPaid for videos of the paid creators
      videos: campaign.videos?.map(video => {
        if (paidUserIds.includes(video.author_id) && video.status === 'approved') {
          return { ...video, hasBeenPaid: true };
        }
        return video;
      })
    };
    
    setSelectedCampaign(updatedCampaign);
    
    // Update the campaigns list
    setCampaigns(prevCampaigns => 
      prevCampaigns.map(c => c.id === campaign.id ? updatedCampaign : c)
    );
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
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={graphData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
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
                  />
                  <Line type="monotone" dataKey="income" stroke="#10B981" name="Income" />
                  <Line type="monotone" dataKey="expenses" stroke="#EF4444" name="Expenses" />
                </LineChart>
              </ResponsiveContainer>
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
                      const recipient =
                        (transaction as Transaction & { targetFirstName?: string; targetLastName?: string }).targetFirstName || (transaction as Transaction & { targetFirstName?: string; targetLastName?: string }).targetLastName
                          ? `${(transaction as Transaction & { targetFirstName?: string; targetLastName?: string }).targetFirstName || ''} ${(transaction as Transaction & { targetFirstName?: string; targetLastName?: string }).targetLastName || ''}`.trim() || 'N/A'
                          : 'N/A';
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
                  <button
                    onClick={() => setShowCampaignReceiptsModal(true)}
                    className="ml-auto bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 px-4 py-2 rounded-lg flex items-center gap-2 hover:cursor-pointer"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                    </svg>
                    <span>{selectedCampaign.receipts?.length || 0} Receipts</span>
                  </button>
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
                  <div className="mb-6">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-lg font-medium text-gray-900">Creators</h2>
                      <button
                        onClick={async () => {
                          if (!selectedCampaign.videos?.length) return;
                          
                          const userIds = Array.from(new Set(selectedCampaign.videos.map((v: Video) => v.author_id)));
                          try {
                            const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/pay-creators`, {
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
                              throw new Error('Failed to pay creators');
                            }
                            
                            const data = await response.json();
                            
                            // Update state immediately after successful payment
                            updateCampaignAfterPayment(selectedCampaign, data, userIds);
                            
                            setReceiptData(data);
                            setShowReceiptModal(true);
                            
                            toast.success('Successfully paid all creators');
                          } catch (error) {
                            console.error('Error paying creators:', error);
                            toast.error('Failed to pay creators');
                          }
                        }}
                        disabled={(() => {
                          if (!selectedCampaign.videos?.length) return true;
                          
                          // Group videos by author_id and check for disabling conditions
                          const creatorMap = new Map();
                          selectedCampaign.videos.forEach(video => {
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

                          // Check if any creator has disabling conditions (same logic as individual buttons)
                          return Array.from(creatorMap.values()).some(creator => {
                            return creator.videos
                              .filter((v: Video) => v.status === 'approved')
                              .every((v: Video) => v.hasBeenPaid) || // All approved videos already paid
                              creator.videos.some((v: Video) => v.status === 'pending') || // Has pending videos
                              creator.videos
                                .filter((v: Video) => v.status === 'approved')
                                .reduce((sum: number, v: Video) => sum + (v.earnings || 0), 0) === 0; // No earnings from approved videos
                          });
                        })()}
                        className={`${
                          (() => {
                            if (!selectedCampaign.videos?.length) return true;
                            
                            // Group videos by author_id and check for disabling conditions
                            const creatorMap = new Map();
                            selectedCampaign.videos.forEach(video => {
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

                            // Check if any creator has disabling conditions (same logic as individual buttons)
                            return Array.from(creatorMap.values()).some(creator => {
                              return creator.videos
                                .filter((v: Video) => v.status === 'approved')
                                .every((v: Video) => v.hasBeenPaid) || // All approved videos already paid
                                creator.videos.some((v: Video) => v.status === 'pending') || // Has pending videos
                                creator.videos
                                  .filter((v: Video) => v.status === 'approved')
                                  .reduce((sum: number, v: Video) => sum + (v.earnings || 0), 0) === 0; // No earnings from approved videos
                            });
                          })()
                            ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                            : 'bg-primary hover:bg-primary-dark text-white hover:cursor-pointer'
                        } px-4 py-2 rounded-lg`}
                      >
                        Pay All Users
                      </button>
                    </div>

                    {/* Alert message for disabled "Pay All Users" button */}
                    {(() => {
                      if (!selectedCampaign.videos?.length) return null;
                      
                      // Group videos by author_id and check for disabling conditions
                      const creatorMap = new Map();
                      selectedCampaign.videos.forEach(video => {
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

                      const creatorsWithIssues = Array.from(creatorMap.values()).filter(creator => {
                        return creator.videos
                          .filter((v: Video) => v.status === 'approved')
                          .every((v: Video) => v.hasBeenPaid) || // All approved videos already paid
                          creator.videos.some((v: Video) => v.status === 'pending') || // Has pending videos
                          creator.videos
                            .filter((v: Video) => v.status === 'approved')
                            .reduce((sum: number, v: Video) => sum + (v.earnings || 0), 0) === 0; // No earnings from approved videos
                      });

                      if (creatorsWithIssues.length > 0) {
                        return (
                          <div className="mt-2 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-center">
                            <p className="text-gray-600 text-sm">Pay all users button unavailable. Payment not applicable for some users</p>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>

                  <div className="space-y-4">
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
                        
                        return (
                          <div key={creator.author_id} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex justify-between items-start">
                              <div className="space-y-2">
                                <div>
                                  <h4 className="font-medium text-gray-900">
                                    {userDetails ? `${userDetails.firstName} ${userDetails.lastName}` : 'Unknown User'}
                                  </h4>
                                  <p className="text-sm text-gray-600">{userDetails?.email || 'No email available'}</p>
                                </div>
                                
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-gray-600">Payment Email:</span>
                                  {paymentEmail ? (
                                    <div className="flex items-center gap-1">
                                      <span className="text-sm text-gray-900">{paymentEmail}</span>
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                      </svg>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1">
                                      <span className="text-sm text-gray-500">N/A</span>
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                      </svg>
                                    </div>
                                  )}
                                </div>

                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-gray-600">Total Earnings:</span>
                                  <span className="text-sm font-medium text-gray-900">${creator.totalEarnings.toFixed(2)}</span>
                                </div>

                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-gray-600">Videos Submitted:</span>
                                  <span className="text-sm font-medium text-gray-900">{creator.videos.length}</span>
                                </div>

                                {/* Video Itemization */}
                                <div className="mt-2 space-y-2">
                                  {creator.videos.map((video: Video, index: number) => (
                                    <div key={video.id} className="text-sm">
                                      <a 
                                        href={video.url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-primary hover:text-primary-dark hover:cursor-pointer"
                                      >
                                        Video {index + 1}
                                      </a>
                                      {' - '}
                                      <span className="text-gray-600">{video.title || 'Untitled Video'}</span>
                                      {' - '}
                                      <span className="font-medium text-gray-800">${video.status === 'approved' ? (video.earnings || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}</span>
                                      {' '}
                                      <span className={`${
                                        video.status === 'approved' ? 'text-green-600' :
                                        video.status === 'denied' ? 'text-red-600' :
                                        'text-yellow-500 font-bold'
                                      }`}>
                                        {video.status?.charAt(0).toUpperCase() + video.status?.slice(1) || 'Pending'}
                                      </span>
                                      {' - '}
                                      <span className="text-gray-600">{video.views?.toLocaleString() || 0} views</span>
                                    </div>
                                  ))}
                                  <div className="pt-1 border-t border-gray-200">
                                    <span className="text-sm text-gray-600">Total Payout: </span>
                                    <span className="text-sm font-bold text-gray-800">
                                      ${creator.videos
                                        .filter((v: Video) => v.status === 'approved')
                                        .reduce((sum: number, v: Video) => sum + (v.earnings || 0), 0)
                                        .toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                  </div>
                                  {creator.videos.some((v: Video) => v.status === 'pending') && (
                                    <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                                      <p className="text-sm text-yellow-800">
                                        ⚠️ You have videos still pending. Please approve or deny all videos before submitting payment.
                                      </p>
                                    </div>
                                  )}
                                </div>

                                <div className="flex items-center gap-2">
                                  <span className={`text-sm ${
                                    creator.videos
                                      .filter((v: Video) => v.status === 'approved')
                                      .every((v: Video) => v.hasBeenPaid) 
                                      ? 'text-green-600' 
                                      : 'text-yellow-600'
                                  }`}>
                                    {creator.videos
                                      .filter((v: Video) => v.status === 'approved')
                                      .every((v: Video) => v.hasBeenPaid)
                                      ? 'Paid'
                                      : 'Unpaid'}
                                  </span>
                                  {!creator.videos
                                    .filter((v: Video) => v.status === 'approved')
                                    .every((v: Video) => v.hasBeenPaid) && 
                                    creator.videos
                                      .filter((v: Video) => v.status === 'approved')
                                      .some((v: Video) => v.hasBeenPaid) && (
                                    <span className="text-sm text-yellow-600">
                                      (Partial payment detected)
                                    </span>
                                  )}
                                </div>
                              </div>

                              <button
                                onClick={async () => {
                                  try {
                                    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/pay-creators`, {
                                      method: 'POST',
                                      headers: {
                                        'Content-Type': 'application/json',
                                      },
                                      body: JSON.stringify({
                                        userIds: [creator.author_id],
                                        campaignId: selectedCampaign.id,
                                        actorId: user?.uid,
                                      }),
                                    });
                                    
                                    if (!response.ok) {
                                      throw new Error('Failed to pay creator');
                                    }
                                    
                                    const data = await response.json();
                                    
                                    // Update state immediately after successful payment
                                    updateCampaignAfterPayment(selectedCampaign, data, [creator.author_id]);
                                    
                                    setReceiptData(data);
                                    setShowReceiptModal(true);
                                    
                                    toast.success('Successfully paid creator');
                                  } catch (error) {
                                    console.error('Error paying creator:', error);
                                    toast.error('Failed to pay creator');
                                  }
                                }}
                                disabled={creator.videos
                                  .filter((v: Video) => v.status === 'approved')
                                  .every((v: Video) => v.hasBeenPaid) || 
                                  creator.videos.some((v: Video) => v.status === 'pending') ||
                                  creator.videos
                                    .filter((v: Video) => v.status === 'approved')
                                    .reduce((sum: number, v: Video) => sum + (v.earnings || 0), 0) === 0}
                                className={`${
                                  creator.videos
                                    .filter((v: Video) => v.status === 'approved')
                                    .every((v: Video) => v.hasBeenPaid) || 
                                    creator.videos.some((v: Video) => v.status === 'pending') ||
                                    creator.videos
                                      .filter((v: Video) => v.status === 'approved')
                                      .reduce((sum: number, v: Video) => sum + (v.earnings || 0), 0) === 0
                                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                                    : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300 hover:cursor-pointer'
                                } px-4 py-2 rounded-lg border`}
                              >
                                Pay Creator
                              </button>
                            </div>
                            
                            {/* Alert message for disabled button */}
                            {(creator.videos
                              .filter((v: Video) => v.status === 'approved')
                              .every((v: Video) => v.hasBeenPaid) || 
                              creator.videos.some((v: Video) => v.status === 'pending') ||
                              creator.videos
                                .filter((v: Video) => v.status === 'approved')
                                .reduce((sum: number, v: Video) => sum + (v.earnings || 0), 0) === 0) && (
                              <div className="mt-3 p-3 rounded-lg text-sm">
                                {creator.videos
                                  .filter((v: Video) => v.status === 'approved')
                                  .every((v: Video) => v.hasBeenPaid) ? (
                                  <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    <span>Creator has been paid</span>
                                  </div>
                                ) : creator.videos.some((v: Video) => v.status === 'pending') ? (
                                  <div className="flex items-center gap-2 text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                    </svg>
                                    <span>Please approve or deny any pending videos before paying creator</span>
                                  </div>
                                ) : creator.videos
                                    .filter((v: Video) => v.status === 'approved')
                                    .reduce((sum: number, v: Video) => sum + (v.earnings || 0), 0) === 0 ? (
                                  <div className="flex items-center gap-2 text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span>Cannot send a payment of $0.00</span>
                                  </div>
                                ) : null}
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

      {/* Receipt Modal */}
      {showReceiptModal && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg w-full max-w-lg p-6">
            <div className="space-y-4">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h4 className="text-xl font-semibold text-gray-900 mb-2">Payment Successful!</h4>
                <p className="text-gray-600">
                  You can see payment information by clicking the receipts button next to the campaign on this page or see your transactions in the overview tab.
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setShowReceiptModal(false)}
                className="px-4 py-2 bg-primary hover:bg-primary-dark text-white font-medium rounded-md transition-colors hover:cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Campaign Receipts Modal */}
      {showCampaignReceiptsModal && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Campaign Receipts</h3>
              <button
                onClick={() => setShowCampaignReceiptsModal(false)}
                className="text-gray-500 hover:text-gray-700 hover:cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              {selectedCampaign?.receipts?.map((receipt: ReceiptData, index: number) => (
                <div key={receipt.receiptId} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900">Receipt #{index + 1}</h4>
                      <p className="text-sm text-gray-600">ID: {receipt.receiptId}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Processed by: {receipt.processedBy?.name || 'Unknown'}</p>
                      <p className="text-sm text-gray-600">
                        {new Date(receipt.payment.timestamp).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6 mb-4">
                    <div>
                      <h5 className="text-sm font-medium text-gray-900 mb-2">Creator Details</h5>
                      <div className="space-y-1">
                        <p className="text-sm text-gray-600">
                          Name: {receipt.creator.firstName} {receipt.creator.lastName}
                        </p>
                        <p className="text-sm text-gray-600">Email: {receipt.creator.email}</p>
                        <p className="text-sm text-gray-600">Payment Email: {receipt.creator.paymentEmail}</p>
                      </div>
                    </div>
                    <div>
                      <h5 className="text-sm font-medium text-gray-900 mb-2">Payment Details</h5>
                      <div className="space-y-1">
                        <p className="text-sm text-gray-600">
                          Amount: ${receipt.payment.amount.toFixed(2)} {receipt.payment.currency}
                        </p>
                        <p className="text-sm text-gray-600">Method: {receipt.payment.method}</p>
                        <p className="text-sm text-gray-600">Status: {receipt.payment.status}</p>
                        <p className="text-sm text-gray-600">Batch ID: {receipt.payment.batchId}</p>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <h5 className="text-sm font-medium text-gray-900 mb-2">Summary</h5>
                    <div className="grid grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Net Amount</p>
                        <p className="text-sm font-medium text-gray-900">${receipt.summary.netAmount.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Platform Fee</p>
                        <p className="text-sm font-medium text-gray-900">${receipt.summary.platformFee.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Total Videos</p>
                        <p className="text-sm font-medium text-gray-900">{receipt.summary.totalVideos}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Total Views</p>
                        <p className="text-sm font-medium text-gray-900">{receipt.summary.totalViews.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">Paid Videos:</span>
                        <span className="text-sm font-medium text-green-600">
                          {receipt.summary.totalVideos - receipt.summary.unpaidVideosCount}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">Unpaid Videos:</span>
                        <span className="text-sm font-medium text-yellow-600">
                          {receipt.summary.unpaidVideosCount}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
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
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    To (Recipient)
                  </h5>
                  <div className="space-y-2">
                    <p className="text-lg font-medium text-gray-900">
                      {(selectedTransaction as Transaction & { targetFirstName?: string; targetLastName?: string }).targetFirstName || (selectedTransaction as Transaction & { targetFirstName?: string; targetLastName?: string }).targetLastName
                        ? `${(selectedTransaction as Transaction & { targetFirstName?: string; targetLastName?: string }).targetFirstName || ''} ${(selectedTransaction as Transaction & { targetFirstName?: string; targetLastName?: string }).targetLastName || ''}`.trim() || 'N/A'
                        : 'N/A'}
                    </p>
                    <p className="text-sm text-gray-600">ID: {selectedTransaction.targetUserId}</p>
                    {selectedTransaction.metadata?.paymentEmail && (
                      <p className="text-sm text-gray-600">Email: {selectedTransaction.metadata.paymentEmail}</p>
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

              {/* Financial Breakdown */}
              {selectedTransaction.metadata && (
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <h5 className="text-sm font-semibold text-gray-900 mb-4">Financial Breakdown</h5>
                  <div className="space-y-3">
                    {selectedTransaction.metadata.netAmount && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Net Amount</span>
                        <span className="font-medium text-gray-900">
                          {formatCurrency(typeof selectedTransaction.metadata.netAmount === 'string' ? parseFloat(selectedTransaction.metadata.netAmount) : selectedTransaction.metadata.netAmount)}
                        </span>
                      </div>
                    )}
                    {selectedTransaction.metadata.platformFee && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Platform Fee</span>
                        <span className="font-medium text-gray-900">
                          {formatCurrency(typeof selectedTransaction.metadata.platformFee === 'string' ? parseFloat(selectedTransaction.metadata.platformFee) : selectedTransaction.metadata.platformFee)}
                        </span>
                      </div>
                    )}
                    {selectedTransaction.metadata.ratePerMillion && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Rate per Million</span>
                        <span className="font-medium text-gray-900">${selectedTransaction.metadata.ratePerMillion}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

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
                  <div>
                    <p className="text-gray-600">Payment Status</p>
                    <p className="font-medium text-gray-900">{selectedTransaction.metadata?.paymentStatus || 'N/A'}</p>
                  </div>
                  {selectedTransaction.metadata?.timestamp && (
                    <div>
                      <p className="text-gray-600">Timestamp</p>
                      <p className="font-medium text-gray-900">{formatDate(selectedTransaction.metadata.timestamp)}</p>
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
    </div>
  );
} 
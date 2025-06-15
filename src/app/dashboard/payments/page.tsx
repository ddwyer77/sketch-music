"use client";

import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Image from 'next/image';
import { toast } from 'react-hot-toast';
import { useQuery } from '@/hooks';
import { Campaign, Video } from '@/types/campaign';
import { useAuth } from '@/contexts/AuthContext';
import { User } from '@/types/user';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function PaymentsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [isLoadingCampaign, setIsLoadingCampaign] = useState(false);
  const [creatorDetails, setCreatorDetails] = useState<Record<string, User>>({});
  const [isLoadingCreators, setIsLoadingCreators] = useState(false);
  
  // Fetch campaigns
  const { documents: campaigns = [] } = useQuery<Campaign>('campaigns', []);
  
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
    }
  ];

  // Calculate financial metrics
  const totalRevenue = transactions
    .filter(t => t.typeOfTransaction === 'income')
    .reduce((sum, t) => sum + (typeof t.amount === 'number' ? t.amount : 0), 0);

  const totalExpenses = transactions
    .filter(t => t.typeOfTransaction === 'expense')
    .reduce((sum, t) => sum + (typeof t.amount === 'number' ? Math.abs(t.amount) : 0), 0);

  const netIncome = totalRevenue - totalExpenses;

  // Sample data for the graph - last 6 months of transactions
  const graphData = [
    { month: 'Jan', income: 3000, expenses: 1500 },
    { month: 'Feb', income: 4500, expenses: 2000 },
    { month: 'Mar', income: 3800, expenses: 1800 },
    { month: 'Apr', income: 5200, expenses: 2200 },
    { month: 'May', income: 4800, expenses: 1900 },
    { month: 'Jun', income: 5500, expenses: 2100 },
  ];

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

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
        <h1 className="text-3xl font-bold text-gray-800">Payments & Finances</h1>
        <button className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg w-full md:w-auto hover:cursor-pointer">
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
              <p className="text-3xl font-bold mt-2 text-green-600">{formatCurrency(totalRevenue - totalExpenses)}</p>
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
            <span className="text-red-600">*Displaying dummy data until we have enough transactions.</span>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={graphData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
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
        </>
      )}

      {activeTab === 'pay-creators' && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="mb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Select Campaign</h2>
            <select 
              className="w-full p-2 border border-gray-300 rounded-lg text-gray-900"
              onChange={async (e) => {
                const campaignId = e.target.value;
                if (!campaignId) return;
                
                setIsLoadingCampaign(true);
                // Update metrics
                try {
                  const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/update-metrics`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ campaignIds: [campaignId] }),
                  });
                  
                  if (!response.ok) {
                    throw new Error('Failed to update metrics');
                  }
                  
                  // Refresh campaign data
                  const updatedCampaign = campaigns.find(c => c.id === campaignId);
                  if (updatedCampaign) {
                    setSelectedCampaign(updatedCampaign);
                  }
                } catch (error) {
                  console.error('Error updating metrics:', error);
                  toast.error('Failed to update campaign metrics');
                } finally {
                  setIsLoadingCampaign(false);
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

              {/* Creators List */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-medium text-gray-900">Creators</h2>
                  <button
                    onClick={async () => {
                      if (!selectedCampaign.videos?.length) return;
                      
                      const userIds = Array.from(new Set(selectedCampaign.videos.map((v: Video) => v.author_id)));
                      try {
                        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/pay-creators`, {
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
                        setReceiptData(data);
                        setShowReceiptModal(true);
                        toast.success('Successfully paid all creators');
                      } catch (error) {
                        console.error('Error paying creators:', error);
                        toast.error('Failed to pay creators');
                      }
                    }}
                    className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg hover:cursor-pointer"
                  >
                    Pay All Users
                  </button>
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
                                  {userDetails ? `${userDetails.first_name} ${userDetails.last_name}` : 'Unknown User'}
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
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-600">Total Earnings:</span>
                                <span className="text-sm font-medium text-gray-900">${creator.totalEarnings.toFixed(2)}</span>
                              </div>

                              <div className="flex items-center gap-2">
                                <span className={`text-sm ${creator.allPaid ? 'text-green-600' : 'text-yellow-600'}`}>
                                  {creator.allPaid ? 'Paid' : 'Unpaid'}
                                </span>
                                {!creator.allPaid && creator.videos.some((v: Video) => v.hasBeenPaid) && (
                                  <span className="text-sm text-yellow-600">
                                    (Partial payment detected)
                                  </span>
                                )}
                              </div>
                            </div>

                            <button
                              onClick={async () => {
                                try {
                                  const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/pay-creators`, {
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
                                  setReceiptData(data);
                                  setShowReceiptModal(true);
                                  toast.success('Successfully paid creator');
                                } catch (error) {
                                  console.error('Error paying creator:', error);
                                  toast.error('Failed to pay creator');
                                }
                              }}
                              className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 px-4 py-2 rounded-lg hover:cursor-pointer"
                            >
                              Pay Creator
                            </button>
                          </div>
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
              </div>
            </>
          )}
        </div>
      )}

      {/* Receipt Modal */}
      {showReceiptModal && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg w-full max-w-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Payment Receipt</h3>
            <div className="space-y-4">
              <p className="text-gray-600">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
              </p>
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
    </div>
  );
} 
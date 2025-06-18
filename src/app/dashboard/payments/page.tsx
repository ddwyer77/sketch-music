"use client";

import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Image from 'next/image';
import { toast } from 'react-hot-toast';
import { useQuery, useCollection } from '@/hooks';
import { Campaign, Video, Transaction } from '@/types/campaign';
import { useAuth } from '@/contexts/AuthContext';
import { User } from '@/types/user';
import { doc, getDoc, collection, onSnapshot } from 'firebase/firestore';
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
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [showCampaignReceiptsModal, setShowCampaignReceiptsModal] = useState(false);
  const { documents: transactions = [], loading: loadingTransactions } = useCollection<Transaction>('transactions');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  
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
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + (typeof t.amount === 'number' ? t.amount : 0), 0);

  const totalExpenses = transactions
    .filter(t => t.type === 'expense')
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
                    <tr
                      key={transaction.id}
                      className="hover:bg-gray-50 hover:cursor-pointer"
                      onClick={() => {
                        setSelectedTransaction(transaction);
                        setShowTransactionModal(true);
                      }}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {transaction.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(transaction.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {transaction.actorName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {transaction.type}
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
                            setReceiptData(data);
                            setShowReceiptModal(true);
                            
                            // Update the campaign state with the new receipt
                            if (selectedCampaign) {
                              const updatedCampaign = {
                                ...selectedCampaign,
                                receipts: [...(selectedCampaign.receipts || []), data]
                              };
                              setSelectedCampaign(updatedCampaign);
                              
                              // Update the campaigns list
                              setCampaigns(prevCampaigns => 
                                prevCampaigns.map(campaign => 
                                  campaign.id === selectedCampaign.id ? updatedCampaign : campaign
                                )
                              );
                            }
                            
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
                                      setReceiptData(data);
                                      setShowReceiptModal(true);
                                      
                                      // Update the campaign state with the new receipt
                                      if (selectedCampaign) {
                                        const updatedCampaign = {
                                          ...selectedCampaign,
                                          receipts: [...(selectedCampaign.receipts || []), data]
                                        };
                                        setSelectedCampaign(updatedCampaign);
                                        
                                        // Update the campaigns list
                                        setCampaigns(prevCampaigns => 
                                          prevCampaigns.map(campaign => 
                                            campaign.id === selectedCampaign.id ? updatedCampaign : campaign
                                          )
                                        );
                                      }
                                      
                                      toast.success('Successfully paid creator');
                                    } catch (error) {
                                      console.error('Error paying creator:', error);
                                      toast.error('Failed to pay creator');
                                    }
                                  }}
                                  disabled={creator.videos
                                    .filter((v: Video) => v.status === 'approved')
                                    .every((v: Video) => v.hasBeenPaid) || 
                                    creator.videos.some((v: Video) => v.status === 'pending')}
                                  className={`${
                                    creator.videos
                                      .filter((v: Video) => v.status === 'approved')
                                      .every((v: Video) => v.hasBeenPaid) || 
                                    creator.videos.some((v: Video) => v.status === 'pending')
                                      ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                                      : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300 hover:cursor-pointer'
                                  } px-4 py-2 rounded-lg border`}
                                  title={
                                    creator.videos
                                      .filter((v: Video) => v.status === 'approved')
                                      .every((v: Video) => v.hasBeenPaid)
                                      ? "Creator has been paid"
                                      : creator.videos.some((v: Video) => v.status === 'pending')
                                      ? "Please approve or deny any pending videos before paying creator"
                                      : "Pay Creator"
                                  }
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
              {selectedCampaign?.receipts?.map((receipt: any, index: number) => (
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
                          {receipt.videos?.paid?.length || 0}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">Unpaid Videos:</span>
                        <span className="text-sm font-medium text-yellow-600">
                          {receipt.videos?.unpaid?.length || 0}
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
          <div className="bg-white rounded-lg w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Transaction Details</h3>
              <button
                onClick={() => setShowTransactionModal(false)}
                className="text-gray-500 hover:text-gray-700 hover:cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-500">Actor ID</p>
                  <p className="text-gray-800 font-medium">{selectedTransaction.actorId}</p>
                </div>
                <div>
                  <p className="text-gray-500">Actor Name</p>
                  <p className="text-gray-800 font-medium">{selectedTransaction.actorName}</p>
                </div>
                <div>
                  <p className="text-gray-500">Amount</p>
                  <p className="text-gray-800 font-medium">{formatCurrency(selectedTransaction.amount)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Campaign ID</p>
                  <p className="text-gray-800 font-medium">{selectedTransaction.campaignId}</p>
                </div>
                <div>
                  <p className="text-gray-500">Created At</p>
                  <p className="text-gray-800 font-medium">{formatDate(selectedTransaction.createdAt)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Currency</p>
                  <p className="text-gray-800 font-medium">{selectedTransaction.currency}</p>
                </div>
                <div>
                  <p className="text-gray-500">Payment Method</p>
                  <p className="text-gray-800 font-medium">{selectedTransaction.paymentMethod}</p>
                </div>
                <div>
                  <p className="text-gray-500">Payment Reference</p>
                  <p className="text-gray-800 font-medium">{selectedTransaction.paymentReference}</p>
                </div>
                <div>
                  <p className="text-gray-500">Source</p>
                  <p className="text-gray-800 font-medium">{selectedTransaction.source}</p>
                </div>
                <div>
                  <p className="text-gray-500">Status</p>
                  <p className="text-gray-800 font-medium">{selectedTransaction.status}</p>
                </div>
                <div>
                  <p className="text-gray-500">Target User ID</p>
                  <p className="text-gray-800 font-medium">{selectedTransaction.targetUserId}</p>
                </div>
                <div>
                  <p className="text-gray-500">Type</p>
                  <p className="text-gray-800 font-medium">{selectedTransaction.type}</p>
                </div>
              </div>
              <div className="mt-4">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">Metadata</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-500">Net Amount</p>
                    <p className="text-gray-800 font-medium">{formatCurrency(selectedTransaction.metadata.netAmount)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Payment Email</p>
                    <p className="text-gray-800 font-medium">{selectedTransaction.metadata.paymentEmail}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Payment Status</p>
                    <p className="text-gray-800 font-medium">{selectedTransaction.metadata.paymentStatus}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Payout Batch ID</p>
                    <p className="text-gray-800 font-medium">{selectedTransaction.metadata.payoutBatchId}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Platform Fee</p>
                    <p className="text-gray-800 font-medium">{formatCurrency(selectedTransaction.metadata.platformFee)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Rate Per Million</p>
                    <p className="text-gray-800 font-medium">{selectedTransaction.metadata.ratePerMillion}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Reconciliation ID</p>
                    <p className="text-gray-800 font-medium">{selectedTransaction.metadata.reconciliationId}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Timestamp</p>
                    <p className="text-gray-800 font-medium">{formatDate(selectedTransaction.metadata.timestamp)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Total Views</p>
                    <p className="text-gray-800 font-medium">{selectedTransaction.metadata.totalViews}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Video Count</p>
                    <p className="text-gray-800 font-medium">{selectedTransaction.metadata.videoCount}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Video IDs</p>
                    <p className="text-gray-800 font-medium break-all">{selectedTransaction.metadata.videoIds?.join(', ')}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Views</p>
                    <p className="text-gray-800 font-medium">{selectedTransaction.metadata.views?.join(', ')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 
"use client";

import { useState, useEffect, useMemo } from 'react';
import { useCollection, useQuery, createConstraints } from '@/hooks';
import { Campaign, Transaction } from '@/types/campaign';
import { useAuth } from '@/contexts/AuthContext';
import Image from 'next/image';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { User } from '@/types/user';
import DiscordCommandTable from '@/components/DiscordCommandTable';
import FAQTable from '@/components/FAQTable';
import Link from 'next/link';
import CampaignCardReadOnly from '@/components/CampaignCardReadOnly';

type Tab = 'campaigns' | 'analytics' | 'settings' | 'discord' | 'wallet' | 'submissions';

const ITEMS_PER_PAGE = 15;

export default function CreatorDashboard() {
  const { user } = useAuth();
  const { documents: campaigns = [], refresh } = useCollection<Campaign>('campaigns');
  
  // Memoize query constraints to prevent infinite loops
  const transactionConstraints = useMemo(() => {
    return user ? [createConstraints.filter('targetUserId', '==', user.uid)] : [];
  }, [user]);
  
  // Query for user's transactions
  const { documents: transactions = [], loading: loadingTransactions } = useQuery<Transaction>(
    'transactions',
    transactionConstraints
  );
  
  const [activeTab, setActiveTab] = useState<Tab>('campaigns');
  const [userData, setUserData] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTooltip, setActiveTooltip] = useState<'campaign' | 'server' | null>(null);
  const [denialModalOpen, setDenialModalOpen] = useState(false);
  const [selectedDenialReason, setSelectedDenialReason] = useState<string | null>(null);
  const [tiktokUsername, setTiktokUsername] = useState('');
  const [isLinking, setIsLinking] = useState(false);
  const [linkingError, setLinkingError] = useState<string | null>(null);
  const [linkingSuccess, setLinkingSuccess] = useState<string | null>(null);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [isGeneratingToken, setIsGeneratingToken] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [paymentEmail, setPaymentEmail] = useState('');
  const [isSavingEmail, setIsSavingEmail] = useState(false);
  const [emailSaveError, setEmailSaveError] = useState<string | null>(null);
  const [emailSaveSuccess, setEmailSaveSuccess] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawSuccessModal, setWithdrawSuccessModal] = useState<{ show: boolean; amount: number }>({ show: false, amount: 0 });
  const [selectedLeaderboardCampaign, setSelectedLeaderboardCampaign] = useState<string>('');
  const [leaderboardDropdownOpen, setLeaderboardDropdownOpen] = useState(false);

  const discordCommands = [
    {
      name: 'Log In',
      command: '/login'
    },
    {
      name: 'Add Video To Campaign',
      command: '/submit <campaign ID> <url>'
    },
    {
      name: 'See Campaigns',
      command: '/campaigns'
    },
    {
      name: 'Check Account Status',
      command: '/status'
    },
    {
      name: 'Link TikTok Account',
      command: '/link <username> <token>'
    },
    {
      name: 'View All Commands',
      command: '/commands'
    },
    {
      name: 'Unlink Discord Account',
      command: '/logout'
    }
  ];

  const faqItems = [
    {
      question: 'Where do I get the server ID?',
      answer: (
        <div className="space-y-2">
          <p className="text-gray-800">Use the command <i>/status</i></p>
          <b>--OR--</b>
          <p className="text-gray-800">First, enable Developer Mode in Discord:</p>
          <ol className="list-decimal list-inside text-gray-800 space-y-1">
            <li>Open Discord Settings (⚙️)</li>
            <li>Go to &quot;App Settings&quot; → &quot;Advanced&quot;</li>
            <li>Enable &quot;Developer Mode&quot;</li>
          </ol>
          <p className="text-gray-800 mt-2">Then, right-click on your server icon and select &quot;Copy Server ID&quot;</p>
        </div>
      )
    },
    {
      question: 'How do I get the campaign ID?',
      answer: (
        <div className="space-y-2">
          <p className="text-gray-800">Use the <code className="bg-gray-100 px-2 py-1 rounded">/campaigns</code> command to see all current campaigns along with their campaign IDs.</p>
          <b>--OR--</b>
          <p className="text-gray-800">You can&apos;t find campaign info on your creator dashboard under the campaigns section</p>
        </div>
      )
    }
  ];

  const filteredCampaigns = campaigns.filter(campaign => {
    const searchLower = searchQuery.toLowerCase();
    return (
      !campaign.isComplete && (
        campaign.id.toLowerCase().includes(searchLower) ||
        campaign.name.toLowerCase().includes(searchLower) ||
        campaign.serverIds?.some(id => id.toLowerCase().includes(searchLower))
      )
    );
  });

  const totalPages = Math.ceil(filteredCampaigns.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedCampaigns = filteredCampaigns.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  useEffect(() => {
    const fetchUserData = async () => {
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data() as User;
          setUserData(data);
          setPaymentEmail(data.paymentEmail || '');
        }
      }
    };
    fetchUserData();
  }, [user]);

  useEffect(() => {
    const checkLinkToken = async () => {
      if (!user?.uid) return;
      
      try {
        const tokenDoc = await getDoc(doc(db, 'socialMediaAccountLinkTokens', user.uid));
        if (tokenDoc.exists()) {
          const tokenData = tokenDoc.data();
          const now = Date.now();
          
          // Only show token if it's not expired and not used
          if (tokenData.expires_at > now && !tokenData.used) {
            setLinkToken(tokenData.token);
          }
        }
      } catch (error) {
        console.error('Error checking link token:', error);
      }
    };
    
    checkLinkToken();
  }, [user]);

  useEffect(() => {
    const fetchLastUpdated = async () => {
      try {
        const systemInfoRef = doc(db, 'system_info', 'crons');
        const systemInfoDoc = await getDoc(systemInfoRef);
        
        if (systemInfoDoc.exists()) {
          const data = systemInfoDoc.data();
          const updateMetrics = data.updateMetrics;
          if (updateMetrics && updateMetrics.lastUpdated) {
            // Check if it's a Firestore Timestamp object
            if (updateMetrics.lastUpdated.toDate) {
              // Convert Firestore Timestamp to readable string
              const date = updateMetrics.lastUpdated.toDate();
              const formattedDate = date.toLocaleString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                second: '2-digit',
                timeZoneName: 'short'
              });
              setLastUpdated(formattedDate);
            } else {
              // If it's already a string, use it directly
              setLastUpdated(updateMetrics.lastUpdated);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching last updated time:', error);
      }
    };
    
    fetchLastUpdated();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (leaderboardDropdownOpen && !target.closest('.leaderboard-dropdown')) {
        setLeaderboardDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [leaderboardDropdownOpen]);

  const handleGenerateToken = async () => {
    if (!user?.uid) return;
    
    setIsGeneratingToken(true);
    setTokenError(null);
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/generate-social-media-account-link-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firebaseUserId: user.uid
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.token) {
        setLinkToken(data.token);
      } else {
        setTokenError(data.error || 'Failed to generate token');
      }
    } catch (error) {
      console.error('Error generating token:', error);
      setTokenError('An error occurred while generating the token');
    } finally {
      setIsGeneratingToken(false);
    }
  };

  const handleSavePaymentEmail = async () => {
    if (!user?.uid) return;
    
    setIsSavingEmail(true);
    setEmailSaveError(null);
    setEmailSaveSuccess(null);
    
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        paymentEmail: paymentEmail
      });
      
      setEmailSaveSuccess('Payment email updated successfully!');
      setUserData(prev => prev ? { ...prev, paymentEmail } : null);
    } catch (error) {
      console.error('Error updating payment email:', error);
      setEmailSaveError('Failed to update payment email. Please try again.');
    } finally {
      setIsSavingEmail(false);
    }
  };

  const handleWithdrawFunds = async () => {
    if (!user?.uid) return;
    
    setIsWithdrawing(true);
    setWithdrawError(null);
    
    try {
      // Get the current user's Firebase ID token
      const idToken = await user.getIdToken();
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/pay-creator`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}` // Firebase ID token
        },
        body: JSON.stringify({
          userId: user.uid // The user's Firebase UID
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        console.log('Payment successful!', data);
        // Show success modal with the withdrawal amount
        setWithdrawSuccessModal({ show: true, amount: userData?.wallet || 0 });
      } else {
        console.error('Payment failed:', data.error);
        throw new Error(data.error || 'Failed to withdraw funds');
      }
    } catch (error) {
      console.error('Request failed:', error);
      setWithdrawError(error instanceof Error ? error.message : 'An error occurred while withdrawing funds');
      
      // Clear error after 10 seconds
      setTimeout(() => {
        setWithdrawError(null);
      }, 10000);
    } finally {
      setIsWithdrawing(false);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Helper function to format dates for receipts
  const formatReceiptDate = (dateInput: string | number | { toDate: () => Date } | undefined) => {
    if (!dateInput) return 'N/A';
    
    let date: Date;
    if (typeof dateInput === 'object' && 'toDate' in dateInput) {
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

  // Helper function to safely convert any date input to a Date object
  const safeDateConversion = (dateInput: string | number | { toDate: () => Date } | undefined): Date => {
    if (!dateInput) return new Date();
    
    if (typeof dateInput === 'object' && 'toDate' in dateInput) {
      // Firestore timestamp
      return dateInput.toDate();
    } else if (typeof dateInput === 'string') {
      // String timestamp
      return new Date(dateInput);
    } else if (typeof dateInput === 'number') {
      // Number timestamp (milliseconds)
      return new Date(dateInput);
    } else {
      // Fallback to current date
      return new Date();
    }
  };

  const handleLinkTikTok = async () => {
    if (!user?.uid || !tiktokUsername || !linkToken) return;
    
    setIsLinking(true);
    setLinkingError(null);
    setLinkingSuccess(null);
    
    try {
      // Get the current user's Firebase ID token
      const idToken = await user.getIdToken();
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/link-tiktok-account/${tiktokUsername}?firebaseUserId=${user.uid}&token=${linkToken}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}` // Add Firebase ID token
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setLinkingSuccess('TikTok account linked successfully! You can now remove the token from your bio.');
        setTiktokUsername('');
        setLinkToken(null);
      } else {
        setLinkingError(data.message || 'Failed to link TikTok account');
      }
    } catch (error) {
      console.error('Error linking TikTok account:', error);
      setLinkingError('An error occurred while linking your TikTok account');
    } finally {
      setIsLinking(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-800">Please log in to view your dashboard.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Creator Dashboard</h1>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('campaigns')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 hover:cursor-pointer ${
                activeTab === 'campaigns'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zm2 3a1 1 0 100 2h6a1 1 0 100-2H7z" />
              </svg>
              Campaigns
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 hover:cursor-pointer ${
                activeTab === 'analytics'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
              </svg>
              Analytics
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 hover:cursor-pointer ${
                activeTab === 'settings'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
              Settings
            </button>
            <button
              onClick={() => setActiveTab('discord')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 hover:cursor-pointer ${
                activeTab === 'discord'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 127.14 96.36" className="w-5 h-5">
                <path fill="currentColor" d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z"/>
              </svg>
              Discord
            </button>
            <button
              onClick={() => setActiveTab('wallet')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 hover:cursor-pointer ${
                activeTab === 'wallet'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zM18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" />
              </svg>
              Wallet
            </button>
            <button
              onClick={() => setActiveTab('submissions')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 hover:cursor-pointer ${
                activeTab === 'submissions'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
              Submissions
            </button>
          </nav>
        </div>

        {activeTab === 'campaigns' && (
          <>
            <div className="mb-8">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-800">Campaigns</h2>
                {lastUpdated && (
                  <div className="text-sm text-gray-600">
                    Campaigns are automatically updated every 15 minutes. Last update: {lastUpdated}
                  </div>
                )}
              </div>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by campaign ID, name, or server ID..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-gray-500 text-gray-800"
                />
                <div className="absolute left-3 top-2.5 text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
              <div className="mt-2 text-sm text-gray-600 flex items-center gap-2">
                <span>Filter by:</span>
                <span className="flex items-center gap-1">
                  Campaign ID
                  <div className="relative">
                    <button
                      onClick={() => setActiveTooltip(activeTooltip === 'campaign' ? null : 'campaign')}
                      className="text-gray-400 hover:text-gray-600 hover:cursor-pointer"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                      </svg>
                    </button>
                    {activeTooltip === 'campaign' && (
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 p-2 bg-gray-800 text-white text-sm rounded-lg z-10">
                        Use the /campaigns command in Discord to see campaign IDs
                      </div>
                    )}
                  </div>
                </span>
                <span>•</span>
                <span>Name</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  Server ID
                  <div className="relative">
                    <button
                      onClick={() => setActiveTooltip(activeTooltip === 'server' ? null : 'server')}
                      className="text-gray-400 hover:text-gray-600 hover:cursor-pointer"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                      </svg>
                    </button>
                    {activeTooltip === 'server' && (
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 p-2 bg-gray-800 text-white text-sm rounded-lg z-10">
                        Use the /status command in your Discord server
                        <br />
                        --OR--
                        <br />
                        Enable Developer Mode in Discord settings, then right-click your server icon and select &quot;Copy Server ID&quot;
                      </div>
                    )}
                  </div>
                </span>
              </div>
            </div>

            {paginatedCampaigns.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-10 text-center">
                <h2 className="text-xl font-medium mb-4 text-gray-800">No campaigns found</h2>
                <p className="text-gray-900 mb-6">
                  {campaigns.length === 0 
                    ? "No campaigns available"
                    : "No campaigns match your search criteria"}
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {paginatedCampaigns.map((campaign) => (
                    <div 
                      key={campaign.id}
                    >
                      <CampaignCardReadOnly campaign={campaign}>
                        <div className="mt-auto pt-4">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-medium text-gray-500">Progress</span>
                            <span className="text-sm font-medium text-primary">{Math.round((campaign.budgetUsed / campaign.budget) * 100)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div 
                              className="bg-primary h-2.5 rounded-full" 
                              style={{ width: `${Math.min(100, (campaign.budgetUsed / campaign.budget) * 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </CampaignCardReadOnly>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-8 flex justify-center items-center gap-2">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="px-3 py-1 rounded border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed hover:cursor-pointer"
                    >
                      Previous
                    </button>
                    
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <button
                          key={page}
                          onClick={() => handlePageChange(page)}
                          className={`w-8 h-8 rounded ${
                            currentPage === page
                              ? 'bg-primary text-white'
                              : 'text-gray-700 hover:bg-gray-100'
                          } hover:cursor-pointer`}
                        >
                          {page}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 rounded border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed hover:cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {activeTab === 'analytics' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - User Statistics */}
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                  </svg>
                  My Campaign Statistics
                </h2>
                
                {(() => {
                  // Get campaigns where user has submitted videos
                  const userCampaigns = campaigns.filter(campaign => 
                    campaign.videos?.some(video => video.author_id === user?.uid)
                  );

                  if (userCampaigns.length === 0) {
                    return (
                      <div className="text-center py-12">
                        <div className="flex justify-center mb-4">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-medium text-gray-800 mb-2">No statistics yet</h3>
                        <p className="text-gray-600">Submit videos to campaigns to see your performance analytics here.</p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-4">
                      {userCampaigns.map(campaign => {
                        const userVideos = campaign.videos?.filter(video => video.author_id === user?.uid) || [];
                        const totalEarnings = userVideos.reduce((sum, video) => sum + (video.earnings || 0), 0);
                        const approvedVideos = userVideos.filter(video => video.status === 'approved');
                        const pendingVideos = userVideos.filter(video => video.status === 'pending');
                        const deniedVideos = userVideos.filter(video => video.status === 'denied');

                        return (
                          <div key={campaign.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                            <div className="flex items-center justify-between mb-3">
                              <h3 className="text-lg font-semibold text-gray-800">{campaign.name}</h3>
                              <div className="text-right">
                                <div className="text-2xl font-bold text-green-600">
                                  ${totalEarnings.toFixed(2)}
                                </div>
                                <div className="text-sm text-gray-600">Total Earnings</div>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                              <div className="text-center">
                                <div className="text-xl font-bold text-gray-800">{userVideos.length}</div>
                                <div className="text-sm text-gray-600">Videos Submitted</div>
                              </div>
                              <div className="text-center">
                                <div className="text-xl font-bold text-green-600">{approvedVideos.length}</div>
                                <div className="text-sm text-gray-600">Approved</div>
                              </div>
                              <div className="text-center">
                                <div className="text-xl font-bold text-yellow-600">{pendingVideos.length}</div>
                                <div className="text-sm text-gray-600">Pending</div>
                              </div>
                              <div className="text-center">
                                <div className="text-xl font-bold text-red-600">{deniedVideos.length}</div>
                                <div className="text-sm text-gray-600">Denied</div>
                              </div>
                            </div>

                            {/* Individual Video Earnings */}
                            <div className="border-t border-gray-200 pt-3">
                              <h4 className="text-sm font-medium text-gray-800 mb-2">Individual Video Earnings</h4>
                              <div className="space-y-2 max-h-32 overflow-y-auto">
                                {userVideos.map(video => (
                                  <div key={video.id} className="flex items-center justify-between text-sm">
                                    <div className="flex-1 min-w-0">
                                      <a 
                                        href={video.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-gray-700 hover:text-primary hover:cursor-pointer truncate block"
                                      >
                                        {video.title || 'Untitled Video'}
                                      </a>
                                    </div>
                                    <div className="flex items-center gap-3 ml-2">
                                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                        video.status === 'approved' ? 'bg-green-100 text-green-800' :
                                        video.status === 'denied' ? 'bg-red-100 text-red-800' :
                                        'bg-yellow-100 text-yellow-800'
                                      }`}>
                                        {video.status}
                                      </span>
                                      <span className={`font-medium ${
                                        video.status === 'denied' ? 'text-red-600' : 'text-green-600'
                                      }`}>
                                        ${video.status === 'denied' ? '0.00' : (video.earnings || 0).toFixed(2)}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Right Column - Leaderboard */}
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z" clipRule="evenodd" />
                    </svg>
                    Campaign Leaderboard
                  </h2>
                  
                  {/* Campaign Dropdown */}
                  <div className="relative leaderboard-dropdown">
                    <button
                      onClick={() => setLeaderboardDropdownOpen(!leaderboardDropdownOpen)}
                      className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 hover:cursor-pointer"
                    >
                      <span>
                        {selectedLeaderboardCampaign 
                          ? campaigns.find(c => c.id === selectedLeaderboardCampaign)?.name || 'Select Campaign'
                          : 'Select Campaign'
                        }
                      </span>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                    
                    {leaderboardDropdownOpen && (
                      <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                        <div className="py-1">
                          {campaigns.map(campaign => (
                            <button
                              key={campaign.id}
                              onClick={() => {
                                setSelectedLeaderboardCampaign(campaign.id);
                                setLeaderboardDropdownOpen(false);
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:cursor-pointer"
                            >
                              {campaign.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Leaderboard Content */}
                {(() => {
                  if (!selectedLeaderboardCampaign) {
                    return (
                      <div className="text-center py-12">
                        <div className="flex justify-center mb-4">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-medium text-gray-800 mb-2">Select a Campaign</h3>
                        <p className="text-gray-600">Choose a campaign from the dropdown to view its leaderboard.</p>
                      </div>
                    );
                  }

                  const selectedCampaign = campaigns.find(c => c.id === selectedLeaderboardCampaign);
                  if (!selectedCampaign) return null;

                  // Check if current user has videos in this campaign
                  const userHasVideos = selectedCampaign.videos?.some(video => video.author_id === user?.uid);
                  
                  if (!userHasVideos) {
                    return (
                      <div className="text-center py-12">
                        <div className="flex justify-center mb-4">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-medium text-gray-800 mb-2">No Videos Submitted</h3>
                        <p className="text-gray-600">You haven&apos;t submitted any videos to this campaign yet. Submit a video to see the leaderboard!</p>
                      </div>
                    );
                  }

                  // Calculate leaderboard data
                  const userEarnings = new Map<string, { 
                    totalEarnings: number; 
                    videoCount: number; 
                    firstName: string; 
                    tiktokUniqueId: string;
                  }>();

                  selectedCampaign.videos?.forEach(video => {
                    if (video.author_id && video.earnings && video.status === 'approved') {
                      const current = userEarnings.get(video.author_id) || { 
                        totalEarnings: 0, 
                        videoCount: 0, 
                        firstName: '', 
                        tiktokUniqueId: video.author?.uniqueId || ''
                      };
                      
                      current.totalEarnings += video.earnings;
                      current.videoCount += 1;
                      current.tiktokUniqueId = video.author?.uniqueId || current.tiktokUniqueId;
                      
                      // Get first name from userData if available
                      if (userData && video.author_id === user?.uid) {
                        current.firstName = userData.firstName || video.author?.nickname?.split(' ')[0] || 'Unknown';
                      } else {
                        current.firstName = video.author?.nickname?.split(' ')[0] || 'Unknown';
                      }
                      
                      userEarnings.set(video.author_id, current);
                    }
                  });

                  // Sort by total earnings (descending)
                  const leaderboardData = Array.from(userEarnings.entries())
                    .map(([userId, data]) => ({ userId, ...data }))
                    .sort((a, b) => b.totalEarnings - a.totalEarnings);

                  if (leaderboardData.length === 0) {
                    return (
                      <div className="text-center py-12">
                        <div className="flex justify-center mb-4">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-medium text-gray-800 mb-2">No Approved Videos</h3>
                        <p className="text-gray-600">No approved videos with earnings in this campaign yet.</p>
                      </div>
                    );
                  }

                  const currentUserRank = leaderboardData.findIndex(entry => entry.userId === user?.uid) + 1;
                  const isFirstPlace = currentUserRank === 1;

                  return (
                    <div className="space-y-4">
                      {/* First Place Celebration */}
                      {isFirstPlace && (
                        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-4 text-center">
                          <div className="flex items-center justify-center gap-2 text-lg font-bold text-yellow-800">
                            <span className="text-2xl">🎉</span>
                            <span>Congratulations! You&apos;re in first place for this campaign!</span>
                            <span className="text-2xl">🎉</span>
                          </div>
                        </div>
                      )}

                      {/* Leaderboard */}
                      <div className="space-y-2">
                        {leaderboardData.map((entry, index) => {
                          const rank = index + 1;
                          const isCurrentUser = entry.userId === user?.uid;
                          
                          return (
                            <div 
                              key={entry.userId}
                              className={`flex items-center justify-between p-3 rounded-lg border ${
                                isCurrentUser 
                                  ? 'bg-blue-50 border-blue-200' 
                                  : 'bg-gray-50 border-gray-200'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                {/* Rank Badge */}
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                                  rank === 1 ? 'bg-yellow-500 text-white' :
                                  rank === 2 ? 'bg-gray-400 text-white' :
                                  rank === 3 ? 'bg-orange-600 text-white' :
                                  'bg-gray-200 text-gray-700'
                                }`}>
                                  {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank}
                                </div>
                                
                                {/* User Info */}
                                <div>
                                  <div className="font-medium text-gray-800">
                                    {entry.firstName}
                                    {isCurrentUser && <span className="text-blue-600 ml-1">(You)</span>}
                                  </div>
                                  <div className="text-sm text-gray-600">
                                    @{entry.tiktokUniqueId}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="text-right">
                                <div className="font-bold text-green-600">
                                  ${entry.totalEarnings.toFixed(2)}
                                </div>
                                <div className="text-sm text-gray-600">
                                  {entry.videoCount} video{entry.videoCount !== 1 ? 's' : ''}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-8">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Account Settings</h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-1">Email</label>
                  <p className="text-gray-800">{userData?.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-1">Name</label>
                  <p className="text-gray-800">{userData?.firstName} {userData?.lastName}</p>
                </div>
                
                {/* Payment Email Section */}
                <div>
                  <label htmlFor="payment-email" className="block text-sm font-medium text-gray-800 mb-1">
                    Payment Email
                  </label>
                  <div className="flex gap-4">
                    <input
                      type="email"
                      id="payment-email"
                      value={paymentEmail}
                      onChange={(e) => setPaymentEmail(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Enter your payment email"
                    />
                    <button
                      onClick={handleSavePaymentEmail}
                      disabled={isSavingEmail || paymentEmail === userData?.paymentEmail}
                      className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-md font-medium transition-colors hover:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isSavingEmail ? (
                        <>
                          <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <span>💾</span>
                          <span>Save Changes</span>
                        </>
                      )}
                    </button>
                  </div>
                  {emailSaveError && (
                    <p className="mt-2 text-sm text-red-600">{emailSaveError}</p>
                  )}
                  {emailSaveSuccess && (
                    <p className="mt-2 text-sm text-green-600">{emailSaveSuccess}</p>
                  )}
                </div>

                {/* Discord ID Section */}
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-1">
                    Discord ID
                  </label>
                  <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-800">
                    {userData?.discord_id || 'Not linked'}
                  </div>
                </div>
              </div>
            </div>

            {/* TikTok Information Section */}
            {userData?.tiktokData && Object.keys(userData.tiktokData).length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">TikTok Accounts</h3>
                  {userData.tiktokVerified && (
                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                      Verified ✓
                    </span>
                  )}
                </div>
                
                <div className="space-y-6">
                  {userData.tiktokData && Object.entries(userData.tiktokData).map(([username, tiktokAccount]) => (
                    <div key={username} className="flex items-start gap-6 p-4 bg-gray-50 rounded-lg">
                      <div className="flex-shrink-0">
                        {tiktokAccount.profileImage ? (
                          <Image
                            src={tiktokAccount.profileImage}
                            alt={`${tiktokAccount.uniqueId}'s profile`}
                            width={100}
                            height={100}
                            className="rounded-full"
                            onError={(e) => {
                              // Fallback to a default avatar if image fails to load
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const fallback = target.nextElementSibling as HTMLElement;
                              if (fallback) fallback.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        {/* Fallback avatar when image fails to load or is missing */}
                        <div 
                          className={`w-[100px] h-[100px] rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-medium text-lg ${tiktokAccount.profileImage ? 'hidden' : 'flex'}`}
                          style={{ display: tiktokAccount.profileImage ? 'none' : 'flex' }}
                        >
                          {tiktokAccount.uniqueId ? tiktokAccount.uniqueId.charAt(0).toUpperCase() : username.charAt(0).toUpperCase()}
                        </div>
                      </div>
                      
                      <div className="flex-1 space-y-2">
                        <div>
                          <h4 className="text-lg font-medium text-gray-800">
                            @{tiktokAccount.uniqueId || username}
                          </h4>
                          <p className="text-gray-600">{tiktokAccount.title || 'No title'}</p>
                        </div>
                        
                        {tiktokAccount.description && (
                          <p className="text-gray-700 text-sm">
                            {tiktokAccount.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'discord' && (
          <div className="space-y-8">
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
              <div className="space-y-8">
                <div className="bg-blue-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <span>🔑</span> Account Link Token
                  </h3>
                  <p className="text-gray-700 mb-4">
                    Generate a one-time use token to link your social media account. If you have any issues, you can generate a new token.
                  </p>
                  
                  {linkToken ? (
                    <div className="space-y-4">
                      <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <div className="flex items-center justify-between">
                          <code className="text-gray-800 font-mono">{linkToken}</code>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(linkToken);
                            }}
                            className="flex items-center gap-2 text-primary hover:text-primary-dark hover:cursor-pointer"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                              <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                            </svg>
                            <span>Copy to clipboard</span>
                          </button>
                        </div>
                      </div>
                      <button
                        onClick={handleGenerateToken}
                        disabled={isGeneratingToken}
                        className="w-full bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-md font-medium transition-colors hover:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {isGeneratingToken ? (
                          <>
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Generating...</span>
                          </>
                        ) : (
                          <>
                            <span>🔄</span>
                            <span>Generate New Token</span>
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleGenerateToken}
                      disabled={isGeneratingToken}
                      className="w-full bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-md font-medium transition-colors hover:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isGeneratingToken ? (
                        <>
                          <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Generating...</span>
                        </>
                      ) : (
                        <>
                          <span>🔑</span>
                          <span>Generate Account Link Token</span>
                        </>
                      )}
                    </button>
                  )}
                  
                  {tokenError && (
                    <div className="mt-2 flex items-center gap-2 text-sm text-red-600">
                      <span>⚠️</span>
                      <span>{tokenError}</span>
                    </div>
                  )}
                </div>

                <div className="bg-blue-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <span>🤖</span> Method 1: Link through Discord
                  </h3>
                  <ol className="list-decimal list-inside space-y-3 text-gray-700">
                    <li className="flex items-start gap-2">
                      <span className="flex-shrink-0">1.</span>
                      <span>Log in to your Sketch Music account with the <code className="bg-white px-2 py-1 rounded shadow-sm">/login</code> command</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="flex-shrink-0">2.</span>
                      <span>Copy your account link token (shown above) and add it to your TikTok bio</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="flex-shrink-0">3.</span>
                      <span>Use the <code className="bg-white px-2 py-1 rounded shadow-sm">/link</code> command and add your TikTok username</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="flex-shrink-0">4.</span>
                      <span>Once you receive a success message, your account is linked and you can remove the token from your bio</span>
                    </li>
                  </ol>
                </div>

                <div className="bg-purple-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <span>💻</span> Method 2: Link directly here
                  </h3>
                  <ol className="list-decimal list-inside space-y-3 text-gray-700 mb-6">
                    <li className="flex items-start gap-2">
                      <span className="flex-shrink-0">1.</span>
                      <span>Copy your account link token (shown above) and add it to your TikTok bio</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="flex-shrink-0">2.</span>
                      <span>Enter your TikTok username and paste your account link token in the fields below</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="flex-shrink-0">3.</span>
                      <span>Click the &quot;Link TikTok Account&quot; button</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="flex-shrink-0">4.</span>
                      <span>Once you receive a success message, your account is linked and you can remove the token from your bio</span>
                    </li>
                  </ol>

                  <div className="space-y-4">
                    <div>
                      <label htmlFor="tiktok-username" className="block text-sm font-medium text-gray-900 mb-1 items-center gap-2">
                        <span>📱</span> TikTok Username
                      </label>
                      <input
                        type="text"
                        id="tiktok-username"
                        value={tiktokUsername}
                        onChange={(e) => setTiktokUsername(e.target.value)}
                        placeholder="@yourusername"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label htmlFor="account-link-token" className="block text-sm font-medium text-gray-900 mb-1 items-center gap-2">
                        <span>🔑</span> Account Link Token
                      </label>
                      <input
                        type="text"
                        id="account-link-token"
                        value={linkToken || ''}
                        onChange={(e) => setLinkToken(e.target.value)}
                        placeholder="Enter your account link token"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                    <button
                      onClick={handleLinkTikTok}
                      disabled={isLinking || !tiktokUsername || !linkToken}
                      className="w-full bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-md font-medium transition-colors hover:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isLinking ? (
                        <>
                          <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Linking...</span>
                        </>
                      ) : (
                        <>
                          <span>🔗</span>
                          <span>Link TikTok Account</span>
                        </>
                      )}
                    </button>
                    {linkingError && (
                      <div className="mt-2 flex items-center gap-2 text-sm text-red-600">
                        <span>⚠️</span>
                        <span>{linkingError}</span>
                      </div>
                    )}
                    {linkingSuccess && (
                      <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
                        <span>✅</span>
                        <span>{linkingSuccess}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <span>🤖</span> Discord Commands
              </h2>
              <DiscordCommandTable commands={discordCommands} />
            </div>
            
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <span>❓</span> Frequently Asked Questions
              </h2>
              <FAQTable items={faqItems} />
            </div>
          </div>
        )}

        {activeTab === 'wallet' && (
          <div className="space-y-8">
            {/* Wallet Header and Balance */}
            <div className="text-center">
              <h1 className="text-4xl font-bold text-gray-800 mb-6">Wallet</h1>
              
              {/* Wallet Icon */}
              <div className="flex justify-center mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="h-32 w-32 text-primary">
                  <g transform="translate(0,0)">
                    <path d="M200.4 27.39 180.9 183h42.8l49.1-146.57-72.4-9.04zm91.7 8L242.7 183l149.7.1 34.3-102.61-134.6-45.1zM180 46.03l-71.9 7.84L122.2 183h40.7L180 46.03zM64 153c-11.5 0-19.18 8.8-21.27 17.2-1.04 4.2-.45 7.6.73 9.5 1.17 1.8 2.79 3.3 8.54 3.3h52.1l-3.3-30H64zm357.4 0-10 30h47.5c-2.6-5-3.7-10.3-3-15.6.7-5.2 2.7-9.9 5.3-14.4h-39.8zM41 201v246.9c0 5.1 2.79 11.1 7.37 15.7C52.96 468.2 59 471 64 471l384 .1c5 0 11-2.8 15.6-7.4 4.6-4.6 7.4-10.6 7.4-15.7v-71h-87c-44 0-44-82 0-82h87v-93.9L41 201zm343 112c-20 0-20 46 0 46h22.3c-9-3.8-15.3-12.7-15.3-23s6.3-19.2 15.3-23H384zm41.7 0c9 3.8 15.3 12.7 15.3 23s-6.3 19.2-15.3 23H487v-46h-61.3zm-9.7 16c-4 0-7 3-7 7s3 7 7 7 7-3 7-7-3-7-7-7z" fill="currentColor"/>
                  </g>
                </svg>
              </div>
              
              {/* Balance Display */}
              <div className="mb-8">
                <div className="text-6xl font-bold text-gray-800 mb-2">
                  ${(userData?.wallet || 0).toFixed(2)}
                </div>
                <p className="text-lg text-gray-600">Available Balance</p>
              </div>
              
              {/* Withdrawal Button */}
              <div className="mb-8">
                <button
                  onClick={handleWithdrawFunds}
                  disabled={isWithdrawing || (userData?.wallet || 0) < 25 || !userData?.paymentEmail}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white text-xl font-bold py-4 px-8 rounded-lg transition-colors hover:cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-3"
                >
                  {isWithdrawing ? (
                    <>
                      <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="h-6 w-6 text-white">
                        <g transform="translate(0,0)">
                          <path d="M327.027 65.816 229.79 128.23l9.856 5.397 86.51-55.53 146.735 83.116-84.165 54.023 4.1 2.244v6.848l65.923-42.316 13.836 7.838-79.76 51.195v11.723l64.633-41.487 15.127 8.57-79.76 51.195v11.723l64.633-41.487 15.127 8.57-79.76 51.195v11.723l100.033-64.21-24.828-14.062 24.827-15.937-24.828-14.064 24.827-15.937-23.537-13.333 23.842-15.305-166.135-94.106zm31.067 44.74c-21.038 10.556-49.06 12.342-68.79 4.383l-38.57 24.757 126.903 69.47 36.582-23.48c-14.41-11.376-13.21-28.35 2.942-41.67l-59.068-33.46zM227.504 147.5l-70.688 46.094 135.61 78.066 1.33-.85c2.5-1.61 6.03-3.89 10.242-6.613 8.42-5.443 19.563-12.66 30.674-19.86 16.002-10.37 24.248-15.72 31.916-20.694L227.504 147.5zm115.467 1.17a8.583 14.437 82.068 0 1 .003 0 8.583 14.437 82.068 0 1 8.32 1.945 8.583 14.437 82.068 0 1-.87 12.282 8.583 14.437 82.068 0 1-20.273 1.29 8.583 14.437 82.068 0 1 .87-12.28 8.583 14.437 82.068 0 1 11.95-3.237zm-218.423 47.115L19.143 263.44l23.537 13.333-23.842 15.305 24.828 14.063-24.828 15.938 24.828 14.063-24.828 15.938 166.135 94.106L285.277 381.8v-11.72l-99.433 63.824L39.11 350.787l14.255-9.15 131.608 74.547L285.277 351.8v-11.72l-99.433 63.824L39.11 320.787l14.255-9.15 131.608 74.547L285.277 321.8v-11.72l-99.433 63.824L39.11 290.787l13.27-8.52 132.9 75.28 99.997-64.188v-5.05l-5.48-3.154-93.65 60.11-146.73-83.116 94.76-60.824-9.63-5.543zm20.46 11.78-46.92 30.115c14.41 11.374 13.21 28.348-2.942 41.67l59.068 33.46c21.037-10.557 49.057-12.342 68.787-4.384l45.965-29.504-123.96-71.358zm229.817 32.19c-8.044 5.217-15.138 9.822-30.363 19.688a36221.458 36221.458 0 0 1-30.69 19.873c-4.217 2.725-7.755 5.01-10.278 6.632-.09.06-.127.08-.215.137v85.924l71.547-48.088v-84.166zm-200.99 17.48a8.583 14.437 82.068 0 1 8.32 1.947 8.583 14.437 82.068 0 1-.87 12.28 8.583 14.437 82.068 0 1-20.27 1.29 8.583 14.437 82.068 0 1 .87-12.28 8.583 14.437 82.068 0 1 11.95-3.236z" fill="currentColor"/>
                        </g>
                      </svg>
                      <span>Withdraw Funds</span>
                    </>
                  )}
                </button>
                
                {/* Minimum Withdrawal Notice */}
                <div className={`mt-4 text-center ${(userData?.wallet || 0) < 25 || !userData?.paymentEmail ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                  {!userData?.paymentEmail 
                    ? 'Payment email is required to withdraw funds. Please set your payment email in the "My Info" tab.'
                    : 'Minimum withdrawal amount: $25.00'
                  }
                </div>
                
                {/* Error Message */}
                {withdrawError && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2 text-red-600">
                      <span>⚠️</span>
                      <span>{withdrawError}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Payment Receipts Section */}
            <div className="border-t border-gray-200 pt-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Payment Receipts</h2>
              
              {loadingTransactions ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex items-center gap-3">
                    <svg className="animate-spin h-6 w-6 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="text-gray-600">Loading receipts...</span>
                  </div>
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-12">
                  <div className="flex justify-center mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-800 mb-2">No receipts yet</h3>
                  <p className="text-gray-600">Once you withdraw funds from your wallet, your payment receipts will appear here for your records.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {transactions
                    .sort((a, b) => {
                      // Sort by completedAt if available, otherwise by createdAt
                      const dateA = a.completedAt || a.createdAt;
                      const dateB = b.completedAt || b.createdAt;
                      return safeDateConversion(dateB).getTime() - safeDateConversion(dateA).getTime();
                    })
                    .map((transaction) => (
                      <div key={transaction.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                                </svg>
                                <span className="font-medium text-gray-800">
                                  {transaction.type === 'creatorPayout' ? 'Creator Payout' : 
                                   transaction.type === 'withdrawal' ? 'Wallet Withdrawal' :
                                   transaction.type}
                                </span>
                              </div>
                              {transaction.isTestPayment && (
                                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                                  Test Payment
                                </span>
                              )}
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                              <div>
                                <span className="text-gray-600">Payment Reference:</span>
                                <p className="font-mono text-gray-800">{transaction.paymentReference}</p>
                              </div>
                              <div>
                                <span className="text-gray-600">Date:</span>
                                <p className="text-gray-800">{formatReceiptDate(transaction.completedAt || transaction.createdAt)}</p>
                              </div>
                              <div>
                                <span className="text-gray-600">Status:</span>
                                <div className="flex items-center gap-2">
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    transaction.status === 'completed' ? 'bg-green-100 text-green-800' :
                                    transaction.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-red-100 text-red-800'
                                  }`}>
                                    {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            {transaction.paymentEmail && (
                              <div className="mt-2 text-sm">
                                <span className="text-gray-600">Payment Email:</span>
                                <p className="text-gray-800">{transaction.paymentEmail}</p>
                              </div>
                            )}
                          </div>
                          
                          <div className="text-right ml-4">
                            <div className="text-2xl font-bold text-green-600">
                              ${Math.abs(transaction.amount).toFixed(2)}
                            </div>
                            <div className="text-sm text-gray-600">{transaction.currency}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'submissions' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-6">My Submissions</h2>
              
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-yellow-700">
                      <strong className="font-medium text-yellow-800">Important Notice:</strong> All earnings shown are estimates and may be adjusted based on campaign criteria and final review. Final payment amounts are subject to verification and approval.
                    </p>
                  </div>
                </div>
              </div>

              {campaigns.length === 0 ? (
                <div className="bg-white rounded-lg shadow-md p-10 text-center">
                  <h2 className="text-xl font-medium mb-4 text-gray-800">No submissions found</h2>
                  <p className="text-gray-900 mb-6">You haven&apos;t submitted any videos to campaigns yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {campaigns.map((campaign) => {
                    const userVideos = campaign.videos?.filter(video => video.author_id === user?.uid) || [];
                    if (userVideos.length === 0) return null;

                    return (
                      <div key={`campaign-${campaign.id}`} className="bg-white rounded-lg shadow-md overflow-hidden">
                        <div className="p-4 border-b border-gray-200">
                          <h3 className="text-lg font-semibold text-gray-800">{campaign.name}</h3>
                        </div>
                        <div className="divide-y divide-gray-200">
                          {userVideos.map((video) => (
                            <div key={`video-${video.id}`} className="p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                  <a 
                                    href={video.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-gray-800 hover:text-primary hover:cursor-pointer font-medium truncate block"
                                  >
                                    {video.title || 'Untitled Video'}
                                  </a>
                                </div>
                                <div className="flex items-center gap-4 ml-4">
                                  <div className="flex items-center gap-1">
                                    {video.soundIdMatch ? (
                                      <svg key="sound-match" xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                      </svg>
                                    ) : (
                                      <svg key="sound-mismatch" xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                      </svg>
                                    )}
                                    <span className="text-sm text-gray-600">Sound Match</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-600">Submission Status:</span>
                                    <div className={`px-2 py-1 rounded-full text-sm font-medium ${
                                      video.status === 'approved' ? 'bg-green-100 text-green-800' :
                                      video.status === 'denied' ? 'bg-red-100 text-red-800' :
                                      'bg-yellow-100 text-yellow-800'
                                    }`}>
                                      {video.status.charAt(0).toUpperCase() + video.status.slice(1)}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-600">Estimated Earnings:</span>
                                    <span className={`text-sm font-medium ${
                                      video.status === 'denied' ? 'text-red-600' : 
                                      video.status === 'approved' ? 'text-green-600' : 
                                      'text-gray-800'
                                    }`}>
                                      ${video.status === 'denied' ? '0.00' : (video.hasBeenPaid ? video.payoutAmountForVideo?.toFixed(2) : video.earnings?.toFixed(2) || '0.00')}
                                    </span>
                                  </div>
                                  {video.status === 'denied' && (
                                    <button
                                      key={`denial-${video.id}`}
                                      onClick={() => {
                                        setSelectedDenialReason(video.reasonForDenial || 'N/A - No reason provided.');
                                        setDenialModalOpen(true);
                                      }}
                                      className="text-sm text-red-600 hover:text-red-800 hover:cursor-pointer"
                                    >
                                      Why was this denied?
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {denialModalOpen && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Reason for Denial</h3>
              <button 
                onClick={() => setDenialModalOpen(false)}
                className="text-gray-500 hover:text-gray-700 hover:cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-gray-800">{selectedDenialReason}</p>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setDenialModalOpen(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 hover:cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Withdrawal Success Modal */}
      {withdrawSuccessModal.show && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md p-8 text-center">
            {/* Success Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            
            {/* Success Message */}
            <h3 className="text-xl font-bold text-gray-800 mb-2">Withdraw Successful!</h3>
            <p className="text-gray-600 mb-6">
              ${withdrawSuccessModal.amount.toFixed(2)} has been sent to your payment email.
            </p>
            
            {/* OK Button */}
            <button
              onClick={() => {
                setWithdrawSuccessModal({ show: false, amount: 0 });
                window.location.reload();
              }}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-6 rounded-lg transition-colors hover:cursor-pointer"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 
"use client";

import { useState, useEffect } from 'react';
import { useCollection } from '@/hooks';
import { Campaign } from '@/types/campaign';
import { useAuth } from '@/contexts/AuthContext';
import Image from 'next/image';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { User } from '@/types/user';
import DiscordCommandTable from '@/components/DiscordCommandTable';
import FAQTable from '@/components/FAQTable';
import Link from 'next/link';
import CampaignCardReadOnly from '@/components/CampaignCardReadOnly';

type Tab = 'campaigns' | 'settings' | 'discord' | 'submissions';

const ITEMS_PER_PAGE = 15;

export default function CreatorDashboard() {
  const { user } = useAuth();
  const { documents: campaigns = [], refresh } = useCollection<Campaign>('campaigns');
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
          setUserData(userDoc.data() as User);
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

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLinkTikTok = async () => {
    if (!user?.uid || !tiktokUsername || !linkToken) return;
    
    setIsLinking(true);
    setLinkingError(null);
    setLinkingSuccess(null);
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/link-tiktok-account/${tiktokUsername}?firebaseUserId=${user.uid}&token=${linkToken}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
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
                <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
              </svg>
              Campaigns
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
              onClick={() => setActiveTab('submissions')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 hover:cursor-pointer ${
                activeTab === 'submissions'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
              </svg>
              My Submissions
            </button>
          </nav>
        </div>

        {activeTab === 'campaigns' && (
          <>
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Campaigns</h2>
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
                      className="block hover:cursor-pointer"
                      onClick={() => window.location.href = `/campaigns/${campaign.id}`}
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

        {activeTab === 'settings' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Account Settings</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1">Email</label>
                <p className="text-gray-800">{userData?.email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1">Name</label>
                <p className="text-gray-800">{userData?.first_name} {userData?.last_name}</p>
              </div>
              {userData?.payment_info && userData.payment_info.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-1">Payment Email</label>
                  <p className="text-gray-800">{userData.payment_info[0].email}</p>
                </div>
              )}
            </div>
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

        {activeTab === 'submissions' && (
          <div className="space-y-6">
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
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-gray-600">Payment Status:</span>
                                  <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                                    video.hasBeenPaid ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                  }`}>
                                    {video.hasBeenPaid ? 'Paid' : 'Pending'}
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
    </div>
  );
} 
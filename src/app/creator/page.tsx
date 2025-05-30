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

type Tab = 'campaigns' | 'settings' | 'discord';

const ITEMS_PER_PAGE = 15;

export default function CreatorDashboard() {
  const { user } = useAuth();
  const { documents: campaigns = [], refresh } = useCollection<Campaign>('campaigns');
  const [activeTab, setActiveTab] = useState<Tab>('campaigns');
  const [userData, setUserData] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTooltip, setActiveTooltip] = useState<'campaign' | 'server' | null>(null);

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
      name: 'Get Helpful Info',
      command: '/help'
    },
    {
      name: 'Check Account Status',
      command: '/status'
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
          <p className="text-gray-800">You can find campaign info on your creator dashboard under the campaigns section</p>
        </div>
      )
    }
  ];

  const filteredCampaigns = campaigns.filter(campaign => {
    const searchLower = searchQuery.toLowerCase();
    return (
      campaign.id.toLowerCase().includes(searchLower) ||
      campaign.name.toLowerCase().includes(searchLower) ||
      campaign.serverIds?.some(id => id.toLowerCase().includes(searchLower))
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

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'campaigns'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Campaigns
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'settings'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Settings
            </button>
            <button
              onClick={() => setActiveTab('discord')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
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
                <div className="space-y-4">
                  {paginatedCampaigns.map((campaign) => (
                    <Link 
                      href={`/campaigns/${campaign.id}`}
                      key={campaign.id}
                      className="block bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-200"
                    >
                      <div className="flex items-center p-4">
                        <div className="w-24 h-24 bg-gray-200 relative flex-shrink-0">
                          {campaign.imageUrl ? (
                            <Image
                              src={campaign.imageUrl}
                              alt={campaign.name}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-primary/10">
                              <div className="text-primary font-bold text-xl">
                                {campaign.name.charAt(0)}
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <div className="ml-6 flex-grow">
                          <h3 className="font-bold text-lg text-gray-800 mb-1">{campaign.name}</h3>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <span>Campaign ID:</span>
                            <code className="bg-gray-100 px-2 py-1 rounded">{campaign.id}</code>
                          </div>
                          {campaign.description && (
                            <p className="text-gray-800 mt-2 line-clamp-2">{campaign.description}</p>
                          )}
                        </div>
                      </div>
                    </Link>
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
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Discord Commands</h2>
              <DiscordCommandTable commands={discordCommands} />
            </div>
            
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Frequently Asked Questions</h2>
              <FAQTable items={faqItems} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 
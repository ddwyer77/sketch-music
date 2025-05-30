"use client";

import { useState, useEffect } from 'react';
import { useCollection } from '@/hooks';
import { Campaign } from '@/types/campaign';
import { useAuth } from '@/contexts/AuthContext';
import Image from 'next/image';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { User } from '@/types/user';
import SubmitVideoModal from '@/components/SubmitVideoModal';
import DiscordCommandTable from '@/components/DiscordCommandTable';
import FAQTable from '@/components/FAQTable';

type Tab = 'campaigns' | 'settings' | 'discord';

export default function CreatorDashboard() {
  const { user } = useAuth();
  const { documents: campaigns = [], refresh } = useCollection<Campaign>('campaigns');
  const [myCampaigns, setMyCampaigns] = useState<Campaign[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('campaigns');
  const [userData, setUserData] = useState<User | null>(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

  const discordCommands = [
    {
      name: 'Log In',
      command: '/login'
    },
    {
      name: 'Add Video To Campaign',
      command: '/add <campaign ID> <url>'
    },
    {
      name: 'See Campaigns',
      command: '/campaigns <server ID>'
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
      name: 'Unlink Discord Account',
      command: '/logout'
    }
  ];

  const faqItems = [
    {
      question: 'Where do I get the server ID?',
      answer: (
        <div className="space-y-2">
          <p className="text-gray-800">First, enable Developer Mode in Discord:</p>
          <ol className="list-decimal list-inside text-gray-800 space-y-1">
            <li>Open Discord Settings (⚙️)</li>
            <li>Go to "App Settings" → "Advanced"</li>
            <li>Enable "Developer Mode"</li>
          </ol>
          <p className="text-gray-800 mt-2">Then, right-click on your server icon and select "Copy Server ID"</p>
          <b>--OR--</b>
          <p className="text-gray-800">Use the command <i>/help</i></p>
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
    if (user?.email && campaigns.length > 0) {
      const campaignsWithMe = campaigns.filter(campaign => 
        campaign.creators?.includes(user.email as string)
      );
      setMyCampaigns(campaignsWithMe);
    }
  }, [user, campaigns]);

  const handleSubmitVideo = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setShowSubmitModal(true);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-800">Please log in to view your dashboard.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto p-6">
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

        {/* Tab Content */}
        {activeTab === 'campaigns' && (
          <>
            <h2 className="text-2xl font-bold text-gray-800 mb-8">My Campaigns</h2>
            {myCampaigns.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-10 text-center">
                <h2 className="text-xl font-medium mb-4 text-gray-800">No campaigns yet</h2>
                <p className="text-gray-900 mb-6">You haven&apos;t been invited to any campaigns yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myCampaigns.map((campaign) => (
                  <div key={campaign.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                    <div className="h-48 bg-gray-200 relative">
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
                    
                    <div className="p-6">
                      <h3 className="font-bold text-lg text-gray-800 mb-2">{campaign.name}</h3>
                      {campaign.description && (
                        <p className="text-gray-800 mb-4">{campaign.description}</p>
                      )}
                      <div className="flex justify-between items-center text-sm text-gray-800 mb-4">
                        <span>Status: {campaign.status}</span>
                        <span>Created: {new Date(campaign.createdAt).toLocaleDateString()}</span>
                      </div>
                      <button
                        onClick={() => handleSubmitVideo(campaign)}
                        className="w-full bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-md font-medium transition-colors"
                      >
                        Submit Video
                      </button>
                    </div>
                  </div>
                ))}
              </div>
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

        {showSubmitModal && selectedCampaign && (
          <SubmitVideoModal
            campaignId={selectedCampaign.id}
            onClose={() => {
              setShowSubmitModal(false);
              setSelectedCampaign(null);
            }}
            onVideosUpdated={refresh}
          />
        )}
      </div>
    </div>
  );
} 
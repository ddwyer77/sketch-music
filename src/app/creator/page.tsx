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

type Tab = 'campaigns' | 'settings';

export default function CreatorDashboard() {
  const { user } = useAuth();
  const { documents: campaigns = [], refresh } = useCollection<Campaign>('campaigns');
  const [myCampaigns, setMyCampaigns] = useState<Campaign[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('campaigns');
  const [userData, setUserData] = useState<User | null>(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

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
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'campaigns' && (
          <>
            <h2 className="text-2xl font-bold text-gray-800 mb-8">My Campaigns</h2>
            {myCampaigns.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-10 text-center">
                <h2 className="text-xl font-medium mb-4 text-gray-800">No campaigns yet</h2>
                <p className="text-gray-800">You haven't been invited to any campaigns yet.</p>
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
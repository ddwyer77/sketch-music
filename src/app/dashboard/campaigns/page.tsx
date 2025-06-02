"use client";

import React, { useState, useMemo } from 'react';
import { useQuery, useFirestoreOperations } from '../../../hooks';
import { where } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import VideoModal from '../../../components/VideoModal';
import CampaignModal from '../../../components/CampaignModal';
import Image from 'next/image';
import { Campaign } from '@/types/campaign';
import CampaignCreatorModal from '../../../components/CampaignCreatorModal';

export default function CampaignsPage() {
  const { user } = useAuth();
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showCreatorModal, setShowCreatorModal] = useState(false);

  // Use a stable query reference
  const queryConstraints = useMemo(() => [], []);

  const {
    documents: campaigns,
    loading,
    error,
    refresh
  } = useQuery<Campaign>(
    'campaigns',
    queryConstraints
  );
  
  const { 
    addDocument, 
    updateDocument,
    loading: operationLoading 
  } = useFirestoreOperations<Omit<Campaign, 'id'>>('campaigns');

  // Function to format currency values
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value);
  };

  // Function to format large numbers with commas
  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  // Calculate budget utilization percentage
  const getBudgetUtilization = (used: number, total: number) => {
    if (total <= 0) return 0;
    return Math.min(100, (used / total) * 100);
  };

  // Sort campaigns by view count (descending)
  const sortedCampaigns = useMemo(() => 
    [...campaigns].sort((a, b) => b.views - a.views),
    [campaigns]
  );

  const handleViewVideos = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setShowVideoModal(true);
  };

  const handleCloseVideoModal = () => {
    setShowVideoModal(false);
    setSelectedCampaign(null);
  };

  const handleCreateCampaign = () => {
    setShowCampaignModal(true);
  };

  const handleCloseCampaignModal = () => {
    setShowCampaignModal(false);
  };

  const handleSaveCampaign = async (campaign: Campaign) => {
    setIsSaving(true);
    try {
      // Extract everything except the id since Firestore will generate one
      const { id, ...campaignData } = campaign;
      
      // If this is a new campaign (no id), create it and set the path
      if (!id) {
        const docId = await addDocument({
          ...campaignData,
          createdAt: Date.now(),
          views: 0,
          shares: 0,
          comments: 0,
          lastUpdated: Date.now()
        });

        // Update the campaign with its path using the Firestore document ID
        if (docId) {
          await updateDocument(docId, {
            campaign_path: `/campaigns/${docId}`
          });
        }
      } else {
        // For existing campaigns, preserve the campaign_path
        await updateDocument(id, {
          ...campaignData,
          lastUpdated: Date.now()
        });
      }

      setShowCampaignModal(false);
      await refresh();
    } catch (error) {
      console.error('Error saving campaign:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleManageCreators = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setShowCreatorModal(true);
  };

  if (loading) {
    return <div className="p-4 text-center">Loading campaigns data...</div>;
  }

  if (error) {
    return <div className="p-4 text-center text-red-500">Error: {error.message}</div>;
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
        <h1 className="text-3xl font-bold text-gray-800">Campaigns</h1>
        <button 
          onClick={handleCreateCampaign}
          className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg w-full md:w-auto"
        >
          Create Campaign
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                  Campaign Name
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                  Views
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                  Engagement
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                  Budget
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                  Videos
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                  Contributions
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                  Creators
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sortedCampaigns.map(campaign => (
                <tr key={campaign.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {campaign.imageUrl ? (
                        <Image
                          className="h-10 w-10 rounded-full mr-3 object-cover"
                          src={campaign.imageUrl}
                          alt={campaign.name}
                          width={40}
                          height={40}
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full mr-3 bg-gray-200 flex items-center justify-center">
                          <span className="text-gray-900">{campaign.name.charAt(0)}</span>
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-gray-900">{campaign.name}</div>
                        <div className="text-xs text-gray-900">
                          Created: {new Date(campaign.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{formatNumber(campaign.views)}</div>
                    <div className="text-xs text-gray-900">
                      Rate: {formatCurrency(campaign.ratePerMillion)} per 1M
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      <div>{formatNumber(campaign.comments)} comments</div>
                      <div>{formatNumber(campaign.shares)} shares</div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      <div>{formatCurrency(campaign.budgetUsed)} of {formatCurrency(campaign.budget)}</div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div 
                          className="bg-primary h-2 rounded-full" 
                          style={{ width: `${getBudgetUtilization(campaign.budgetUsed, campaign.budget)}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="text-sm text-gray-900">{campaign.videos?.length || 0} videos</div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                    <button 
                      className="text-indigo-600 hover:text-indigo-900 hover:cursor-pointer"
                      onClick={() => handleViewVideos(campaign)}
                    >
                      Manage
                    </button>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                    <button
                      onClick={() => handleManageCreators(campaign)}
                      className="text-primary hover:text-primary/90 font-medium"
                    >
                      Manage
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Video Modal */}
      {selectedCampaign && (
        <VideoModal
          campaignId={selectedCampaign.id}
          videoUrls={selectedCampaign.videos || []}
          onClose={handleCloseVideoModal}
          onVideosUpdated={refresh}
        />
      )}

      {/* Campaign Modal */}
      {showCampaignModal && (
        <CampaignModal
          onClose={handleCloseCampaignModal}
          onSave={handleSaveCampaign}
          initialData={null}
          isLoading={isSaving}
        />
      )}

      {showCreatorModal && (
        <CampaignCreatorModal
          isOpen={showCreatorModal}
          onClose={() => {
            setShowCreatorModal(false);
            setSelectedCampaign(null);
          }}
          selectedCampaign={selectedCampaign || undefined}
        />
      )}
    </div>
  );
}

// You would need to implement these functions:
const handleEditCampaign = (campaign: Campaign) => {
  // Open edit modal with campaign data
};

"use client";

import React, { useState, useMemo } from 'react';
import { useQuery, useFirestoreOperations } from '../../../hooks';
import { where } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import VideoModal from '../../../components/VideoModal';
import CampaignModal from '../../../components/CampaignModal';
import Image from 'next/image';
import { Campaign } from '@/types/campaign';

// Utility function to convert campaign data to CSV format
const exportCampaignToCSV = (campaign: Campaign) => {
  // Helper function to safely convert timestamps to ISO string
  const safeDateToISO = (timestamp: any): string => {
    if (!timestamp) return '';
    
    try {
      let date: Date;
      
      // Handle Firestore timestamp objects
      if (typeof timestamp === 'object' && timestamp._seconds) {
        date = new Date(timestamp._seconds * 1000);
      } else if (typeof timestamp === 'number') {
        date = new Date(timestamp);
      } else if (typeof timestamp === 'string') {
        date = new Date(timestamp);
      } else {
        return '';
      }
      
      // Check if the date is valid
      if (isNaN(date.getTime())) {
        return '';
      }
      
      return date.toISOString();
    } catch (error) {
      console.warn('Invalid date value:', timestamp);
      return '';
    }
  };

  // Create CSV headers for campaign data
  const campaignHeaders = [
    'Campaign ID',
    'Name',
    'Description',
    'Type',
    'Budget',
    'Budget Used',
    'Rate Per Million',
    'Max Creator Earnings Per Post',
    'Views',
    'Shares',
    'Comments',
    'Likes',
    'Created At',
    'Updated At',
    'Last Updated',
    'Is Complete',
    'Max Submissions',
    'Funds Released',
    'Payments Released',
    'Payments Released By',
    'Payments Released At',
    'Campaign Path',
    'Owner ID',
    'Image URL',
    'Sound ID',
    'Sound URL',
    'Require Sound',
    'Notes',
    'Server IDs',
    'Creators',
    'Video Count',
    'Pending Videos',
    'Approved Videos',
    'Denied Videos',
    // Campaign Termination Details
    'Termination Date',
    'Termination Budget',
    'Termination Max Submissions',
    'Termination Manual',
    'Termination Other',
    'Termination Comments',
    // Payment Release Receipt
    'Unpaid Videos Count',
    'Wallet Updates Count',
    'Total Payout Amount'
  ];

  // Create CSV data row for campaign
  const campaignData = [
    campaign.id,
    campaign.name,
    campaign.description || '',
    campaign.type || '',
    campaign.budget,
    campaign.budgetUsed,
    campaign.ratePerMillion,
    campaign.maxCreatorEarningsPerPost || 'No limit',
    campaign.views,
    campaign.shares,
    campaign.comments,
    campaign.likes,
    safeDateToISO(campaign.createdAt),
    safeDateToISO(campaign.updatedAt),
    safeDateToISO(campaign.lastUpdated),
    campaign.isComplete,
    campaign.maxSubmissions || 0,
    campaign.fundsReleased || false,
    campaign.paymentsReleased || false,
    campaign.paymentsReleasedBy || '',
    safeDateToISO(campaign.paymentsReleasedAt),
    campaign.campaign_path || '',
    campaign.owner_id,
    campaign.imageUrl || '',
    campaign.soundId || '',
    campaign.soundUrl || '',
    campaign.requireSound || false,
    campaign.notes || '',
    (campaign.serverIds || []).join(';'),
    (campaign.creators || []).join(';'),
    campaign.videos?.length || 0,
    campaign.videos?.filter(v => v.status === 'pending').length || 0,
    campaign.videos?.filter(v => v.status === 'approved').length || 0,
    campaign.videos?.filter(v => v.status === 'denied').length || 0,
    // Campaign Termination Details
    campaign.campaignTerminationDetails?.date || false,
    campaign.campaignTerminationDetails?.budget || false,
    campaign.campaignTerminationDetails?.maxSubmissions || false,
    campaign.campaignTerminationDetails?.manualTermination || false,
    campaign.campaignTerminationDetails?.other || false,
    campaign.campaignTerminationDetails?.comments || '',
    // Payment Release Receipt
    campaign.paymentReleaseReceipt?.unpaidVideos?.length || 0,
    campaign.paymentReleaseReceipt?.walletUpdates?.length || 0,
    campaign.paymentReleaseReceipt?.walletUpdates?.reduce((sum, update) => sum + (update.payoutAmount || 0), 0) || 0
  ];

  // Create CSV headers for videos
  const videoHeaders = [
    'Video ID',
    'Video URL',
    'Video Status',
    'Video Author ID',
    'Video Created At',
    'Video Updated At',
    'Video Sound ID Match',
    'Video Title',
    'Video Reason For Denial',
    'Video Has Been Paid',
    'Video Payout Amount',
    'Video Earnings',
    'Video Views',
    'Video Shares',
    'Video Comments',
    'Video Likes',
    'Video Description',
    'Video Music Title',
    'Video Music Author',
    'Video Music ID',
    'Video Marked For Deletion',
    'Video Author Nickname',
    'Video Author Unique ID',
    'Video Created At Date'
  ];

  // Create CSV data for videos
  const videoData = (campaign.videos || []).map(video => [
    video.id,
    video.url,
    video.status,
    video.author_id,
    safeDateToISO(video.created_at),
    safeDateToISO(video.updated_at),
    video.soundIdMatch || false,
    video.title || '',
    video.reasonForDenial || '',
    video.hasBeenPaid || false,
    video.payoutAmountForVideo || 0,
    video.earnings || 0,
    video.views || 0,
    video.shares || 0,
    video.comments || 0,
    video.likes || 0,
    video.description || '',
    video.musicTitle || '',
    video.musicAuthor || '',
    video.musicId || '',
    video.markedForDeletion || false,
    video.author?.nickname || '',
    video.author?.uniqueId || '',
    // Handle the createdAt field that might exist in the actual data
    (video as any).createdAt || ''
  ]);

  // Create CSV headers for wallet updates
  const walletUpdateHeaders = [
    'Wallet Update User ID',
    'Wallet Update Previous Wallet',
    'Wallet Update Payout Amount',
    'Wallet Update New Wallet',
    'Wallet Update User Email',
    'Wallet Update User First Name',
    'Wallet Update User Last Name',
    'Wallet Update User Payment Email',
    'Wallet Update User Wallet',
    'Wallet Update User Roles',
    'Wallet Update User Discord ID',
    'Wallet Update User TikTok Verified',
    'Wallet Update User Created At',
    'Wallet Update User Updated At',
    'Wallet Update User Last Payout Amount',
    'Wallet Update User Last Payout Batch ID',
    'Wallet Update User Last Payout At',
    'Wallet Update User TikTok Data Count'
  ];

  // Create CSV data for wallet updates
  const walletUpdateData = (campaign.paymentReleaseReceipt?.walletUpdates || []).map(update => {
    // Cast to any to access the extended userData properties that exist in actual data
    const userData = update.userData as any;
    return [
      update.userId,
      update.previousWallet || 0,
      update.payoutAmount || 0,
      update.newWallet || 0,
      userData?.email || '',
      userData?.firstName || '',
      userData?.lastName || '',
      userData?.paymentEmail || '',
      userData?.wallet || 0,
      (userData?.roles || []).join(';'),
      userData?.discord_id || '',
      userData?.tiktokVerified || false,
      safeDateToISO(userData?.createdAt),
      safeDateToISO(userData?.updatedAt),
      userData?.lastPayoutAmount || 0,
      userData?.lastPayoutBatchId || '',
      safeDateToISO(userData?.lastPayoutAt),
      Object.keys(userData?.tiktokData || {}).length
    ];
  });

  // Escape CSV values (handle commas, quotes, and newlines)
  const escapeCSVValue = (value: any): string => {
    if (value === null || value === undefined) return '';
    const stringValue = String(value);
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  };

  // Create CSV content with campaign data
  let csvContent = [campaignHeaders.map(escapeCSVValue).join(',')];
  csvContent.push(campaignData.map(escapeCSVValue).join(','));

  // Add video data if there are videos
  if (videoData.length > 0) {
    csvContent.push(''); // Empty line separator
    csvContent.push('VIDEOS DATA');
    csvContent.push(videoHeaders.map(escapeCSVValue).join(','));
    videoData.forEach(video => {
      csvContent.push(video.map(escapeCSVValue).join(','));
    });
  }

  // Add wallet update data if there are wallet updates
  if (walletUpdateData.length > 0) {
    csvContent.push(''); // Empty line separator
    csvContent.push('WALLET UPDATES DATA');
    csvContent.push(walletUpdateHeaders.map(escapeCSVValue).join(','));
    walletUpdateData.forEach(update => {
      csvContent.push(update.map(escapeCSVValue).join(','));
    });
  }

  // Create and download the file
  const blob = new Blob([csvContent.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `campaign-${campaign.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${Date.now()}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export default function CampaignsPage() {
  const { user } = useAuth();
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);

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
    setEditingCampaign(null);
    setShowCampaignModal(true);
  };

  const handleCloseCampaignModal = () => {
    setShowCampaignModal(false);
    setEditingCampaign(null);
  };

  const handleEditCampaign = (campaign: Campaign) => {
    setEditingCampaign(campaign);
    setShowCampaignModal(true);
  };

  const handleExportCampaign = (campaign: Campaign) => {
    try {
      exportCampaignToCSV(campaign);
    } catch (error) {
      console.error('Error exporting campaign:', error);
    }
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
          isComplete: false,
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
                  Settings
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                  Data
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
                    <div className="text-xs text-gray-900">
                      Max: {campaign.maxCreatorEarningsPerPost === null || campaign.maxCreatorEarningsPerPost === undefined ? 'No limit' : formatCurrency(campaign.maxCreatorEarningsPerPost)}
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
                    <div className="flex flex-col items-center">
                      <div className="text-sm text-gray-900 relative">
                        {campaign.videos?.length || 0} videos
                        {(campaign.videos?.filter(v => v.status === 'pending') || []).length > 0 && (
                          <span className="absolute -top-2 -right-6 inline-flex items-center justify-center w-5 h-5 text-xs font-bold leading-none text-white bg-red-500 rounded-full">
                            {(campaign.videos?.filter(v => v.status === 'pending') || []).length}
                          </span>
                        )}
                      </div>
                      <button 
                        className="text-primary hover:text-primary/90 hover:cursor-pointer text-sm"
                        onClick={() => handleViewVideos(campaign)}
                      >
                        Manage
                      </button>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                    <button
                      onClick={() => handleEditCampaign(campaign)}
                      className="text-primary hover:text-primary/90 font-medium hover:cursor-pointer"
                    >
                      Edit
                    </button>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                    <button
                      onClick={() => handleExportCampaign(campaign)}
                      className="text-primary hover:text-primary/90 font-medium hover:cursor-pointer"
                    >
                      Export
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
          initialData={editingCampaign}
          isLoading={isSaving}
        />
      )}
    </div>
  );
}

// You would need to implement these functions:
const handleEditCampaign = (campaign: Campaign) => {
  // Open edit modal with campaign data
};

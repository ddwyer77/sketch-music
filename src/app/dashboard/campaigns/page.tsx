"use client";

import React, { useState } from 'react';
import { useEffect } from 'react';
import { useCollection } from '../../../hooks';
import VideoModal from '../../../components/VideoModal';
import Image from 'next/image';

// Define the Campaign type
interface Campaign {
  id: string;
  name: string;
  budget: number;
  budgetUsed: number;
  ratePerMillion: number;
  imageUrl: string;
  videoUrls: string[];
  createdAt: string;
  views: number;
  shares: number;
  comments: number;
  lastUpdated: string;
}

export default function CampaignsPage() {
  const {
    documents: campaigns,
    loading,
    error,
    refresh
  } = useCollection<Campaign>('campaigns');
  
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [showVideoModal, setShowVideoModal] = useState(false);

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
  const sortedCampaigns = [...campaigns].sort((a, b) => b.views - a.views);

  const handleViewVideos = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setShowVideoModal(true);
  };

  const handleCloseVideoModal = () => {
    setShowVideoModal(false);
  };

  if (loading) {
    return <div className="p-4 text-center">Loading campaigns data...</div>;
  }

  if (error) {
    return <div className="p-4 text-center text-red-500">Error: {error.message}</div>;
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Campaigns</h1>
        <button className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg">
          Create Campaign
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Campaign Name
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Views
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Engagement
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Budget
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Videos
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
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
                          <span className="text-gray-500">{campaign.name.charAt(0)}</span>
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-gray-900">{campaign.name}</div>
                        <div className="text-xs text-gray-500">
                          Created: {new Date(campaign.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{formatNumber(campaign.views)}</div>
                    <div className="text-xs text-gray-500">
                      Rate: {formatCurrency(campaign.ratePerMillion)} per 1M
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm">
                      <div>{formatNumber(campaign.comments)} comments</div>
                      <div>{formatNumber(campaign.shares)} shares</div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm">
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
                    <div className="text-sm text-gray-900">{campaign.videoUrls.length} videos</div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button 
                      className="text-indigo-600 hover:text-indigo-900 mr-3 hover:cursor-pointer"
                      onClick={() => handleViewVideos(campaign)}
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
      {showVideoModal && selectedCampaign && (
        <VideoModal
          campaignId={selectedCampaign.id}
          videoUrls={selectedCampaign.videoUrls}
          onClose={handleCloseVideoModal}
          onVideosUpdated={refresh}
        />
      )}
    </div>
  );
}

// You would need to implement these functions:
const handleEditCampaign = (campaign: Campaign) => {
  // Open edit modal with campaign data
};

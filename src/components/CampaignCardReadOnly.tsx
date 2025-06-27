"use client";

import Image from 'next/image';
import { ReactNode, useState } from 'react';
import { Campaign } from '@/types/campaign';
import toast from 'react-hot-toast';

type CampaignCardReadOnlyProps = {
  campaign: Campaign;
  children?: ReactNode;
};

export default function CampaignCardReadOnly({ campaign, children }: CampaignCardReadOnlyProps) {
  const [showDetails, setShowDetails] = useState(false);

  // Format number with commas
  const formatNumber = (num: number): string => {
    return num.toLocaleString('en-US');
  };
  
  // Format date
  const formatDate = (dateInput: string | number): string => {
    const date = new Date(dateInput);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Use actual views if available, otherwise calculate estimate
  const views = campaign.views || 0;
  const comments = campaign.comments || 0;
  const shares = campaign.shares || 0;
  const likes = campaign.likes || 0;

  // Calculate budget used based on actual views
  // Formula: (views / 1,000,000) * ratePerMillion
  const viewsBasedBudget = (views / 1000000) * campaign.ratePerMillion;
  
  // For last updated time
  const lastUpdated = campaign.lastUpdated 
    ? formatDate(campaign.lastUpdated)
    : 'Not yet updated';

  const handleCampaignUrlClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (campaign.campaign_path) {
      window.open(campaign.campaign_path, '_blank');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="flex flex-col h-full">
        {/* Campaign Image or Placeholder */}
        <div className="h-64 bg-gradient-to-br from-gray-50 to-gray-100 relative overflow-hidden">
          {campaign.imageUrl ? (
            <Image 
              src={campaign.imageUrl} 
              alt={campaign.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 33vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10">
              <div className="text-primary font-bold text-3xl">{campaign.name.charAt(0)}</div>
            </div>
          )}
          
          {/* Type Badge - Top Left */}
          <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm rounded-full px-3 py-2 shadow-lg">
            <div className="text-center">
              <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Type</div>
              <div className="text-sm font-bold text-blue-600">{campaign.type || 'Default'}</div>
            </div>
          </div>
        </div>
        
        <div className="p-6 flex-1 flex flex-col">
          {/* Campaign Name */}
          <h3 className="font-bold text-xl text-gray-900 mb-2 leading-tight">{campaign.name}</h3>
          {campaign.campaign_path && (
            <button
              onClick={handleCampaignUrlClick}
              className="font-semibold text-sm text-primary hover:text-primary/80 underline decoration-2 underline-offset-2 hover:cursor-pointer transition-colors mb-1 text-left"
            >
              Campaign URL
            </button>
          )}
          
          <div className="flex items-center gap-3 mb-1">
            <span className="text-sm text-gray-600 font-medium"><strong>Campaign ID:</strong> {campaign.id}</span>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                navigator.clipboard.writeText(campaign.id);
                toast.success('Campaign ID copied to clipboard', {
                  duration: 2000,
                  position: 'bottom-right',
                });
              }}
              className="p-1.5 hover:bg-gray-100 rounded-full hover:cursor-pointer transition-all duration-200 hover:scale-105"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-4 h-4 text-gray-500">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
            </button>
          </div>
          
          {/* Sound Section */}
          <div className="mb-2">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600 font-medium"><strong>Sound ID:</strong></span>
              {campaign.soundId ? (
                <>
                  <span className="text-sm text-gray-700 bg-gray-50 px-2 py-1 rounded-md font-mono">{campaign.soundId}</span>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (campaign.soundId) {
                        navigator.clipboard.writeText(campaign.soundId);
                        toast.success('Sound ID copied to clipboard', {
                          duration: 2000,
                          position: 'bottom-right',
                        });
                      }
                    }}
                    className="p-1.5 hover:bg-gray-100 rounded-full hover:cursor-pointer transition-all duration-200 hover:scale-105"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-4 h-4 text-gray-500">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                  </button>
                </>
              ) : (
                <span className="text-sm text-gray-400 italic">N/A</span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-sm text-gray-600 font-medium"><strong>Sound URL:</strong></span>
              {campaign.soundUrl ? (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (campaign.soundUrl) {
                      window.open(campaign.soundUrl, '_blank');
                    }
                  }}
                  className="text-sm text-primary hover:text-primary/80 underline decoration-2 underline-offset-2 hover:cursor-pointer transition-colors"
                >
                  Sound URL
                </button>
              ) : (
                <span className="text-sm text-gray-400 italic">N/A</span>
              )}
            </div>
          </div>
          
          {/* Details Section */}
          <div>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="w-full flex items-center justify-between text-sm font-semibold text-gray-700 hover:text-gray-900 hover:cursor-pointer bg-white px-4 py-3 rounded-lg transition-all duration-200 hover:shadow-md shadow-sm border border-gray-200"
            >
              <span>Details</span>
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor" 
                className={`w-4 h-4 transition-transform duration-200 ${showDetails ? 'rotate-180' : ''}`}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showDetails && (
              <div className="mt-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-white p-3 rounded-lg shadow-sm">
                    <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-1">Budget</p>
                    <p className="font-semibold text-gray-900">${campaign.budget.toFixed(2)}</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg shadow-sm">
                    <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-1">Used</p>
                    <p className="font-semibold text-gray-900">${viewsBasedBudget.toFixed(2)}</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg shadow-sm">
                    <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-1">Rate per 1M</p>
                    <p className="font-semibold text-gray-900">${campaign.ratePerMillion.toFixed(2)}</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg shadow-sm">
                    <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-1">Max Earnings/Post</p>
                    <p className="font-semibold text-gray-900">
                      {campaign.maxCreatorEarningsPerPost === null || campaign.maxCreatorEarningsPerPost === undefined ? 'No limit' : `$${campaign.maxCreatorEarningsPerPost.toFixed(2)}`}
                    </p>
                  </div>
                  <div className="bg-white p-3 rounded-lg shadow-sm">
                    <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-1">Views</p>
                    <p className="font-semibold text-gray-900">{formatNumber(views)}</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg shadow-sm">
                    <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-1">Likes</p>
                    <p className="font-semibold text-gray-900">{formatNumber(likes)}</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg shadow-sm">
                    <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-1">Videos</p>
                    <p className="font-semibold text-gray-900">{campaign.videos?.length || 0}</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg shadow-sm">
                    <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-1">Shares</p>
                    <p className="font-semibold text-gray-900">{formatNumber(shares)}</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg shadow-sm">
                    <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-1">Comments</p>
                    <p className="font-semibold text-gray-900">{formatNumber(comments)}</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg shadow-sm">
                    <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-1">Created</p>
                    <p className="font-semibold text-gray-900">{formatDate(campaign.createdAt)}</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg shadow-sm">
                    <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-1">Last Updated</p>
                    <p className="font-semibold text-gray-900">{lastUpdated}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Progress Bar - based on budget utilization */}
          {children}
        </div>
      </div>
    </div>
  );
} 
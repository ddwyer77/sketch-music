"use client";

import Image from 'next/image';
import { ReactNode } from 'react';
import { Campaign } from '@/types/campaign';
import toast from 'react-hot-toast';

type CampaignCardReadOnlyProps = {
  campaign: Campaign;
  children?: ReactNode;
};

export default function CampaignCardReadOnly({ campaign, children }: CampaignCardReadOnlyProps) {
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
    <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-100 hover:shadow-lg transition-shadow">
      <div className="flex flex-col h-full">
        {/* Campaign Image or Placeholder */}
        <div className="h-64 bg-gray-200 relative">
          {campaign.imageUrl ? (
            <Image 
              src={campaign.imageUrl} 
              alt={campaign.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 33vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-primary/10">
              <div className="text-primary font-bold text-xl">{campaign.name.charAt(0)}</div>
            </div>
          )}
        </div>
        
        <div className="p-5 flex-1 flex flex-col">
          {/* Campaign Name */}
          <h3 className="font-bold text-lg text-gray-800">{campaign.name}</h3>
          {campaign.campaign_path && (
            <button
              onClick={handleCampaignUrlClick}
              className="font-bold text-sm text-primary underline hover:cursor-pointer text-left"
            >
              Campaign URL
            </button>
          )}
          
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm text-gray-600"><strong>Campaign ID: </strong>{campaign.id}</span>
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
              className="p-1 hover:bg-gray-100 rounded-full hover:cursor-pointer transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-4 h-4 text-gray-500">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
            </button>
          </div>
          
          {/* Campaign Stats */}
          <div className="flex-1 grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Budget</p>
              <p className="font-medium text-gray-900">${campaign.budget.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-gray-500">Used</p>
              <p className="font-medium text-gray-900">${viewsBasedBudget.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-gray-500">Rate per 1M</p>
              <p className="font-medium text-gray-900">${campaign.ratePerMillion.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-gray-500">Views</p>
              <p className="font-medium text-gray-900">{formatNumber(views)}</p>
            </div>
            <div>
              <p className="text-gray-500">Likes</p>
              <p className="font-medium text-gray-900">{formatNumber(likes)}</p>
            </div>
            <div>
              <p className="text-gray-500">Videos</p>
              <p className="font-medium text-gray-900">{campaign.videos?.length || 0}</p>
            </div>
            <div>
              <p className="text-gray-500">Shares</p>
              <p className="font-medium text-gray-900">{formatNumber(shares)}</p>
            </div>
            <div>
              <p className="text-gray-500">Comments</p>
              <p className="font-medium text-gray-900">{formatNumber(comments)}</p>
            </div>
            <div>
              <p className="text-gray-500">Created</p>
              <p className="font-medium text-gray-900">{formatDate(campaign.createdAt)}</p>
            </div>
            <div>
              <p className="text-gray-500">Last Updated</p>
              <p className="font-medium text-gray-900">{lastUpdated}</p>
            </div>
          </div>
          
          {/* Progress Bar - based on budget utilization */}
          {children}
        </div>
      </div>
    </div>
  );
} 
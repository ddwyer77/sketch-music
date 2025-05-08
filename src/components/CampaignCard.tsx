"use client";

import Image from 'next/image';
import { Campaign } from '../app/dashboard/page';
import { ReactNode } from 'react';

type CampaignCardProps = {
  campaign: Campaign;
  onEdit: () => void;
  onDelete: () => void;
  children?: ReactNode;
};

export default function CampaignCard({ campaign, onEdit, onDelete, children }: CampaignCardProps) {
  // Format number with commas
  const formatNumber = (num: number): string => {
    return num.toLocaleString('en-US');
  };
  
  // Format date
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
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
          
          <div className="absolute top-2 right-2 flex space-x-1">
            <button
              onClick={onEdit}
              className="p-1 bg-white rounded-full shadow-md hover:bg-gray-100 hover:scale-110 hover:cursor-pointer transition-all duration-200 text-gray-500"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
            <button
              onClick={onDelete}
              className="p-1 bg-white rounded-full shadow-md hover:bg-red-100 hover:scale-110 text-gray-500 hover:text-red-500 hover:cursor-pointer transition-all duration-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
        
        <div className="p-5 flex-1 flex flex-col">
          {/* Campaign Name */}
          <h3 className="font-bold text-lg mb-4 text-gray-800">{campaign.name}</h3>
          
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
              <p className="font-medium text-gray-900">{campaign.videos.length}</p>
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
"use client";

import Image from 'next/image';
import { ReactNode, useState } from 'react';
import { Campaign } from '@/types/campaign';
import toast from 'react-hot-toast';

type CampaignCardProps = {
  campaign: Campaign;
  onEdit: () => void;
  onReactivate?: (campaign: Campaign) => void;
  children?: ReactNode;
};

export default function CampaignCard({ campaign, onEdit, onReactivate, children }: CampaignCardProps) {
  const [showReactivateModal, setShowReactivateModal] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
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

  // Check if there are videos with non-approved status
  const hasNonApprovedVideos = (): boolean => {
    return campaign.videos?.some(video => video.status !== 'approved') || false;
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
          {campaign.isComplete && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
              <button
                onClick={() => setShowReactivateModal(true)}
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                className="relative bg-red-500/70 text-white text-base font-medium px-6 py-2 rounded-full shadow-md backdrop-blur-sm hover:bg-red-600/70 transition-colors hover:cursor-pointer"
                style={{fontFamily: 'Inter, sans-serif', letterSpacing: '0.02em'}}
              >
                Complete
                {showTooltip && (
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-gray-800 text-white text-sm rounded-lg whitespace-nowrap">
                    Undo mark as complete
                  </div>
                )}
              </button>
            </div>
          )}
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
          </div>
        </div>
        
        <div className="p-5 flex-1 flex flex-col">
          {/* Campaign Name */}
          <h3 className="font-bold text-lg text-gray-800">{campaign.name}</h3>
          <span className="inline-block bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full mb-2">
            {campaign.type || 'Default Campaign Type'}
          </span>
          <a 
            href={campaign.campaign_path} 
            className="font-bold text-sm text-primary underline hover:cursor-pointer" 
            target="_blank"
          >
            Campaign URL
          </a>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600"><strong>Campaign ID: </strong>{campaign.id}</span>
            <button
              onClick={() => {
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
          
          {/* Sound Section */}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600"><strong>Sound ID: </strong></span>
              {campaign.soundId ? (
                <>
                  <span className="text-sm text-gray-600">{campaign.soundId}</span>
                  <button
                    onClick={() => {
                      if (campaign.soundId) {
                        navigator.clipboard.writeText(campaign.soundId);
                        toast.success('Sound ID copied to clipboard', {
                          duration: 2000,
                          position: 'bottom-right',
                        });
                      }
                    }}
                    className="p-1 hover:bg-gray-200 rounded-full hover:cursor-pointer transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-4 h-4 text-gray-500">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                  </button>
                </>
              ) : (
                <span className="text-sm text-gray-500">N/A</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600"><strong>Sound URL: </strong></span>
              {campaign.soundUrl ? (
                <a 
                  href={campaign.soundUrl} 
                  className="text-sm text-primary underline hover:cursor-pointer" 
                  target="_blank"
                >
                  Sound URL
                </a>
              ) : (
                <span className="text-sm text-gray-500">N/A</span>
              )}
            </div>
          </div>
          
          {/* Details Section */}
          <div className="mt-4">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:cursor-pointer bg-gray-50 hover:bg-gray-100 px-3 py-2 rounded-lg transition-colors"
            >
              <span>Details</span>
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor" 
                className={`w-4 h-4 transition-transform ${showDetails ? 'rotate-180' : ''}`}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showDetails && (
              <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
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
                  <p className="text-gray-500">Max Earnings/Post</p>
                  <p className="font-medium text-gray-900">
                    {campaign.maxCreatorEarningsPerPost === null || campaign.maxCreatorEarningsPerPost === undefined ? 'No limit' : `$${campaign.maxCreatorEarningsPerPost.toFixed(2)}`}
                  </p>
                </div>
                <div className="relative">
                  <div className="flex items-center gap-1">
                    <p className="text-gray-500">Views</p>
                  </div>
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
            )}
          </div>
          
          {/* Progress Bar - based on budget utilization */}
          {children}
        </div>
      </div>

      {/* Reactivation Modal */}
      {showReactivateModal && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg w-full max-w-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Reactivate Campaign</h3>
            <div className="space-y-4">
              <p className="text-gray-600">
                Are you sure you want to reactivate this campaign? This will make it available for submissions again.
              </p>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="text-yellow-800 font-medium mb-2">Important Note</h4>
                <p className="text-yellow-700 text-sm">
                  Before reactivating, please review and update:
                </p>
                <ul className="list-disc list-inside text-yellow-700 text-sm mt-2 space-y-1">
                  <li>Campaign budget</li>
                  <li>Maximum submissions limit</li>
                  <li>End date</li>
                  <li>Other termination criteria</li>
                </ul>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => setShowReactivateModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-medium transition-colors hover:cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onReactivate) {
                    onReactivate({
                      ...campaign,
                      isComplete: false
                    });
                  }
                  setShowReactivateModal(false);
                }}
                className="px-4 py-2 bg-primary hover:bg-primary/90 text-white font-medium rounded-md transition-colors hover:cursor-pointer"
              >
                Reactivate Campaign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 
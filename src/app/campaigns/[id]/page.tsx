"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useCollection } from '@/hooks';
import Image from 'next/image';
import Link from 'next/link';
import SubmitVideoModal from '@/components/SubmitVideoModal';
import { Campaign } from '@/types/campaign';

export default function CampaignPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [showVideoModal, setShowVideoModal] = useState(false);
  const { documents: campaigns = [], loading, error, refresh } = useCollection<Campaign>('campaigns');
  
  // Find the specific campaign
  const campaign = campaigns.find(c => c.id === id);

  // Calculate budget utilization percentage
  const getBudgetUtilization = (used: number, total: number) => {
    if (total <= 0) return 0;
    return Math.min(100, (used / total) * 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Campaign Not Found</h1>
          <Link href="/" className="text-primary hover:text-primary/90">
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Campaign Header */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="relative h-64 sm:h-80">
            {campaign.imageUrl ? (
              <Image
                src={campaign.imageUrl}
                alt={campaign.name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-primary/10">
                <div className="text-primary font-bold text-4xl">
                  {campaign.name.charAt(0)}
                </div>
              </div>
            )}
          </div>
          
          <div className="p-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">{campaign.name}</h1>
            
            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-gray-500">Progress</span>
                <span className="text-sm font-medium text-primary">
                  {Math.round((campaign.budgetUsed / campaign.budget) * 100)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-primary h-2.5 rounded-full" 
                  style={{ width: `${getBudgetUtilization(campaign.budgetUsed, campaign.budget)}%` }}
                ></div>
              </div>
            </div>

            {/* Authentication Check */}
            {!user ? (
              <div className="text-center py-6 border-t border-gray-200">
                <p className="text-gray-600 mb-4">Sign in to contribute to this campaign</p>
                <div className="space-x-4">
                  <Link 
                    href={`/auth/signin?redirect=${encodeURIComponent(window.location.pathname)}`}
                    className="inline-block bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-md font-medium transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link 
                    href={`/auth/signup?type=creator&redirect=${encodeURIComponent(window.location.pathname)}`}
                    className="inline-block bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-md font-medium transition-colors"
                  >
                    Sign Up
                  </Link>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 border-t border-gray-200 space-y-4">
                <button
                  onClick={() => setShowVideoModal(true)}
                  className="bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-md font-medium transition-colors"
                >
                  Submit a Video
                </button>
                <div>
                  <Link
                    href="/creator"
                    className="inline-block bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-md font-medium transition-colors"
                  >
                    Creator Dashboard
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Video Submission Modal */}
      {showVideoModal && (
        <SubmitVideoModal
          campaignId={campaign.id}
          onClose={() => setShowVideoModal(false)}
          onVideosUpdated={refresh}
        />
      )}
    </div>
  );
} 
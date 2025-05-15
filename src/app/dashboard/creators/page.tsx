"use client";

import { useState } from 'react';
import { useCollection } from '@/hooks';
import { useAuth } from '@/contexts/AuthContext';
import { User } from '@/types/user';
import { Campaign, Video } from '@/types/campaign';
import Image from 'next/image';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

type Contribution = {
  campaignName: string;
  video: Video;
};

type CampaignContribution = {
  id: string;
  name: string;
};

export default function CreatorsPage() {
  const { user } = useAuth();
  const [selectedCreator, setSelectedCreator] = useState<User | null>(null);
  const [showContributionsModal, setShowContributionsModal] = useState(false);
  const [showCampaignContributionsModal, setShowCampaignContributionsModal] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<CampaignContribution[]>([]);
  const { documents: users = [], loading: usersLoading } = useCollection<User>('users');
  const { documents: campaigns = [], loading: campaignsLoading } = useCollection<Campaign>('campaigns');

  const getCreatorContributions = (creatorId: string): Contribution[] => {
    const contributions: Contribution[] = [];
    
    campaigns.forEach(campaign => {
      if (campaign.videos && Array.isArray(campaign.videos)) {
        campaign.videos.forEach(video => {
          if (video.author_id === creatorId) {
            contributions.push({
              campaignName: campaign.name || 'Unnamed Campaign',
              video
            });
          }
        });
      }
    });
    
    return contributions;
  };

  const handleViewContributions = (creator: User) => {
    setSelectedCreator(creator);
    setShowContributionsModal(true);
  };

  const handleViewCampaignContributions = (creator: User) => {
    setSelectedCreator(creator);
    setPendingChanges(creator.campaign_contributions || []);
    setShowCampaignContributionsModal(true);
  };

  const handleCampaignToggle = (campaignId: string, campaignName: string) => {
    const isAlreadyContributing = pendingChanges.some(c => c.id === campaignId);

    let newContributions: CampaignContribution[];
    if (isAlreadyContributing) {
      newContributions = pendingChanges.filter(c => c.id !== campaignId);
    } else {
      newContributions = [...pendingChanges, { id: campaignId, name: campaignName }];
    }

    setPendingChanges(newContributions);
  };

  const handleSaveChanges = async () => {
    if (!selectedCreator) return;

    try {
      await updateDoc(doc(db, 'users', selectedCreator.id), {
        campaign_contributions: pendingChanges
      });
      // Refresh the users collection to get updated data
      window.location.reload();
      setShowCampaignContributionsModal(false);
    } catch (error) {
      console.error('Error updating campaign contributions:', error);
    }
  };

  if (usersLoading || campaignsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Creators</h1>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment Info
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Groups
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Campaign Collaborations
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((creator) => (
                  <tr key={creator.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {creator.first_name} {creator.last_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{creator.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {creator.payment_info?.[0]?.email || 'Not set'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {creator.groups?.length ? creator.groups.join(', ') : 'none'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => handleViewCampaignContributions(creator)}
                        className="text-primary hover:text-primary/90 font-medium"
                      >
                        View Collaborations
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => handleViewContributions(creator)}
                        className="text-primary hover:text-primary/90 font-medium"
                      >
                        View Videos
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Video Contributions Modal */}
      {showContributionsModal && selectedCreator && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">
                Video Collaborations by {selectedCreator.first_name} {selectedCreator.last_name}
              </h2>
              <button 
                onClick={() => setShowContributionsModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              {getCreatorContributions(selectedCreator.id).length === 0 ? (
                <p className="text-gray-500 text-center py-4">No collaborations found.</p>
              ) : (
                <div className="space-y-4">
                  {getCreatorContributions(selectedCreator.id).map((contribution, index) => (
                    <div key={index} className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium text-gray-900">{contribution.campaignName}</h3>
                          <p className="text-sm text-gray-500 mt-1 break-all">{contribution.video.url}</p>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          contribution.video.status === 'approved' ? 'bg-green-100 text-green-800' :
                          contribution.video.status === 'denied' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {contribution.video.status.charAt(0).toUpperCase() + contribution.video.status.slice(1)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setShowContributionsModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Campaign Contributions Modal */}
      {showCampaignContributionsModal && selectedCreator && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">
                Campaign Collaborations for {selectedCreator.first_name} {selectedCreator.last_name}
              </h2>
              <button 
                onClick={() => setShowCampaignContributionsModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              {campaigns.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No campaigns available.</p>
              ) : (
                <div className="space-y-4">
                  {campaigns.map((campaign) => {
                    const isContributing = pendingChanges.some(
                      c => c.id === campaign.id
                    );
                    
                    return (
                      <div key={campaign.id} className="p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-center space-x-4">
                          <input
                            type="checkbox"
                            checked={isContributing}
                            onChange={() => handleCampaignToggle(campaign.id, campaign.name || '')}
                            className="h-5 w-5 text-primary focus:ring-primary border-gray-300 rounded"
                          />
                          <div className="flex-1 flex items-center space-x-4">
                            {campaign.imageUrl ? (
                              <Image
                                src={campaign.imageUrl}
                                alt={campaign.name || 'Campaign'}
                                width={40}
                                height={40}
                                className="rounded-lg object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center">
                                <span className="text-gray-500 font-medium">
                                  {(campaign.name || 'C').charAt(0)}
                                </span>
                              </div>
                            )}
                            <div>
                              <h3 className="font-medium text-gray-900">{campaign.name || 'Unnamed Campaign'}</h3>
                              <p className="text-sm text-gray-500">
                                Created: {campaign.createdAt ? new Date(campaign.createdAt).toLocaleDateString() : 'Unknown date'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end space-x-4">
              <button
                onClick={() => setShowCampaignContributionsModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveChanges}
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 
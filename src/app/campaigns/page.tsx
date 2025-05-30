"use client";

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useCollection } from '@/hooks';
import { Campaign } from '@/types/campaign';
import Image from 'next/image';

export default function CampaignsPage() {
  const searchParams = useSearchParams();
  const serverId = searchParams?.get('serverId');
  const { documents: campaigns = [] } = useCollection<Campaign>('campaigns');
  const [filteredCampaigns, setFilteredCampaigns] = useState<Campaign[]>([]);

  useEffect(() => {
    if (serverId && campaigns.length > 0) {
      const matchingCampaigns = campaigns.filter(campaign => 
        campaign.serverIds?.includes(serverId)
      );
      setFilteredCampaigns(matchingCampaigns);
    } else {
      setFilteredCampaigns([]);
    }
  }, [serverId, campaigns]);

  if (!serverId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">No Server ID Provided</h1>
          <p className="text-gray-600">Please provide a server ID in the URL parameter</p>
        </div>
      </div>
    );
  }

  if (filteredCampaigns.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">No Campaigns Found</h1>
          <p className="text-gray-600">No campaigns are available for this server ID</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Available Campaigns</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCampaigns.map((campaign) => (
            <div 
              key={campaign.id} 
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-200"
            >
              <div className="relative h-48 bg-gray-200">
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
                <h2 className="text-xl font-semibold text-gray-800 mb-2">{campaign.name}</h2>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-sm text-gray-600">Campaign ID:</span>
                  <code className="bg-gray-100 px-2 py-1 rounded text-sm text-gray-800">
                    {campaign.id}
                  </code>
                </div>

                {/* Budget Progress Section */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Budget Used</span>
                    <span className="font-medium text-gray-800">
                      ${campaign.budgetUsed.toFixed(2)} / ${campaign.budget.toFixed(2)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${Math.min((campaign.budgetUsed / campaign.budget) * 100, 100)}%`
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 
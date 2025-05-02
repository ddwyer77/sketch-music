"use client";

import { useState, useEffect } from 'react';
import CampaignModal from '../../components/CampaignModal';
import CampaignCard from '../../components/CampaignCard';
import { useCampaigns } from '../../hooks/useCampaigns';

export type Campaign = {
  id: string;
  name: string;
  budget: number;
  budgetUsed: number;
  ratePerMillion: number;
  imageUrl: string;
  videoUrls: string[];
  createdAt: string;
};

export default function Dashboard() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  
  const { 
    campaigns, 
    loading, 
    error, 
    addCampaign, 
    updateCampaign, 
    deleteCampaign 
  } = useCampaigns();
  
  const openModal = (campaign?: Campaign) => {
    if (campaign) {
      setEditingCampaign(campaign);
    } else {
      setEditingCampaign(null);
    }
    setIsModalOpen(true);
  };
  
  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCampaign(null);
  };
  
  const handleSaveCampaign = async (campaign: Campaign) => {
    if (editingCampaign) {
      // Update existing campaign
      await updateCampaign(campaign.id, campaign);
    } else {
      // Add new campaign
      await addCampaign(campaign);
    }
    closeModal();
  };
  
  const handleDeleteCampaign = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this campaign?')) {
      await deleteCampaign(id);
    }
  };
  
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-10 text-center">
        <p className="text-gray-500">Loading campaigns...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto py-10">
        <div className="bg-red-50 p-4 rounded-md border border-red-200 text-center">
          <h2 className="text-red-800 font-medium mb-2">Error</h2>
          <p className="text-red-600">{error}</p>
          <p className="mt-4 text-gray-600">Using data from local storage as fallback.</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <button
          onClick={() => openModal()}
          className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-md font-medium transition-colors"
        >
          Create Campaign
        </button>
      </div>
      
      {campaigns.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-10 text-center">
          <h2 className="text-xl font-medium mb-4">No campaigns yet</h2>
          <p className="text-gray-500 mb-6">Start creating your first campaign to track your marketing efforts</p>
          <button
            onClick={() => openModal()}
            className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-md font-medium transition-colors"
          >
            Create Your First Campaign
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaigns.map(campaign => (
            <CampaignCard 
              key={campaign.id} 
              campaign={campaign} 
              onEdit={() => openModal(campaign)}
              onDelete={() => handleDeleteCampaign(campaign.id)}
            />
          ))}
        </div>
      )}
      
      {isModalOpen && (
        <CampaignModal
          onClose={closeModal}
          onSave={handleSaveCampaign}
          initialData={editingCampaign}
        />
      )}
    </div>
  );
} 
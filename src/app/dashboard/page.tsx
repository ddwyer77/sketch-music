"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import CampaignModal from '../../components/CampaignModal';
import CampaignCard from '../../components/CampaignCard';
import { useQuery, useFirestoreOperations } from '../../hooks';
import { doc, updateDoc, where, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Campaign } from '@/types/campaign';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { getDoc } from 'firebase/firestore';
import CampaignCreatorModal from '../../components/CampaignCreatorModal';

export default function Dashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<string | null>(null);
  const [showCreatorModal, setShowCreatorModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  
  // Use a stable query reference
  const queryConstraints = useMemo(() => [], []);
  
  const { documents: campaigns = [], loading, error, refresh } = useQuery<Campaign>(
    'campaigns',
    queryConstraints
  );
  
  const { 
    addDocument, 
    updateDocument, 
    deleteDocument, 
    loading: operationLoading 
  } = useFirestoreOperations<Omit<Campaign, 'id'>>('campaigns');
  
  // Redirect if not an admin
  useEffect(() => {
    if (user) {
      const checkAdminStatus = async () => {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (!userData.roles?.includes('admin')) {
            router.push('/creator');
          }
        }
      };
      checkAdminStatus();
    }
  }, [user, router]);
  
  // Function to update all campaign metrics
  const handleUpdateMetrics = useCallback(async () => {
    if (isUpdating || !campaigns?.length) return;
    
    try {
      setIsUpdating(true);
      setUpdateMessage('Updating campaign metrics...');
      
      // Call the new API endpoint
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/update-metrics`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `HTTP error! status: ${response.status}`);
      }
      
      // Refresh campaigns list with updated data
      await refresh();
      
      setUpdateMessage('Metrics updated successfully');
      
      // Clear message after 3 seconds
      setTimeout(() => {
        setUpdateMessage(null);
      }, 3000);
    } catch (error: any) {
      console.error('Error updating metrics:', error);
      setUpdateMessage(`Error updating metrics: ${error.message || 'Unknown error'}`);
      
      // Clear error message after 5 seconds
      setTimeout(() => {
        setUpdateMessage(null);
      }, 5000);
    } finally {
      setIsUpdating(false);
    }
  }, [campaigns, isUpdating, refresh]);
  
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
    if (!user) {
      console.error('No user logged in');
      return;
    }

    if (editingCampaign && campaign.id) {
      // Update existing campaign
      const { id, ...campaignData } = campaign;
      await updateDocument(id, campaignData);
    } else {
      // Create new campaign
      const { id, owner_id, ...campaignData } = campaign; // Remove any existing owner_id
      
      // Create the campaign with explicit owner_id
      const newCampaign = {
        ...campaignData,
        owner_id: user.uid,
        createdAt: Date.now(),
        views: 0,
        shares: 0,
        comments: 0,
        lastUpdated: Date.now()
      };

      console.log('Creating new campaign:', newCampaign);
      const docId = await addDocument(newCampaign);

      if (docId) {
        await updateDocument(docId, {
          campaign_path: `/campaigns/${docId}`
        });
      }
    }
    
    refresh();
    closeModal();
  };
  
  const handleDeleteCampaign = async (id: string) => {
    if (window.confirm('Are you sure you want to archive this campaign?')) {
      try {
        // Get the campaign document
        const campaignRef = doc(db, 'campaigns', id);
        const campaignDoc = await getDoc(campaignRef);
        
        if (campaignDoc.exists()) {
          // Create the same document in the archive collection
          const archiveRef = doc(db, 'campaigns_archive', id);
          await setDoc(archiveRef, campaignDoc.data());
          
          // Delete from the original collection
          await deleteDoc(campaignRef);
          
          // Refresh the campaigns list
          await refresh();
        }
      } catch (error) {
        console.error('Error archiving campaign:', error);
        alert('Failed to archive campaign. Please try again.');
      }
    }
  };
  
  const handleManageCreators = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setShowCreatorModal(true);
  };
  
  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8 flex-wrap">
        <h1 className="text-3xl font-bold w-full md:w-auto mb-2 md:mb-0 text-gray-900">Dashboard</h1>
        <div className="flex gap-3 flex-wrap w-full md:w-auto">
          {updateMessage && (
            <div className={`py-2 px-3 rounded-md text-sm font-medium ${
              updateMessage.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
            }`}>
              {updateMessage}
            </div>
          )}
          <button
            onClick={handleUpdateMetrics}
            disabled={isUpdating || loading}
            className="bg-secondary hover:bg-primary hover:text-white text-gray-900 px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center hover:cursor-pointer w-full md:w-auto justify-center"
          >
            {isUpdating ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Updating...
              </>
            ) : 'Update Metrics'}
          </button>
          <button
            onClick={() => openModal()}
            className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-md font-medium transition-colors hover:cursor-pointer w-full md:w-auto"
          >
            Create Campaign
          </button>
        </div>
      </div>
      
      {loading ? (
        <div className="bg-white rounded-lg shadow-md p-10 text-center">
          <p>Loading campaigns...</p>
        </div>
      ) : error ? (
        <div className="bg-white rounded-lg shadow-md p-10 text-center text-red-500">
          <p>Error loading campaigns: {error.message}</p>
        </div>
      ) : campaigns.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-10 text-center">
          <h2 className="text-xl font-medium mb-4 text-gray-800">No campaigns yet</h2>
          <p className="text-gray-900 mb-6">Start creating your first campaign to track your marketing efforts</p>
          <button
            onClick={() => openModal()}
            className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-md font-medium transition-colors"
          >
            Create Your First Campaign
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mx-auto">
          {campaigns.map((campaign) => (
            <CampaignCard 
              key={campaign.id} 
              campaign={campaign} 
              onEdit={() => openModal(campaign)}
              onDelete={() => handleDeleteCampaign(campaign.id)}
              onManageCreators={() => handleManageCreators(campaign)}
            >
              <div className="mt-auto pt-4">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-gray-500">Progress</span>
                  <span className="text-sm font-medium text-primary">{Math.round((campaign.budgetUsed / campaign.budget) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-primary h-2.5 rounded-full" 
                    style={{ width: `${Math.min(100, (campaign.budgetUsed / campaign.budget) * 100)}%` }}
                  ></div>
                </div>
              </div>
            </CampaignCard>
          ))}
        </div>
      )}
      
      {isModalOpen && (
        <CampaignModal
          onClose={closeModal}
          onSave={handleSaveCampaign}
          initialData={editingCampaign}
          isLoading={operationLoading}
        />
      )}
      {showCreatorModal && (
        <CampaignCreatorModal
          isOpen={showCreatorModal}
          onClose={() => {
            setShowCreatorModal(false);
            setSelectedCampaign(null);
          }}
          selectedCampaign={selectedCampaign || undefined}
        />
      )}
    </div>
  );
} 
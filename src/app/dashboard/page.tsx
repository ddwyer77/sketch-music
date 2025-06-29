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
import { toast } from 'react-hot-toast';

export default function Dashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  
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
  
  // Function to fetch last updated time from system_info
  const fetchLastUpdated = useCallback(async () => {
    try {
      const systemInfoRef = doc(db, 'system_info', 'crons');
      const systemInfoDoc = await getDoc(systemInfoRef);
      
      if (systemInfoDoc.exists()) {
        const data = systemInfoDoc.data();
        const updateMetrics = data.updateMetrics;
        if (updateMetrics && updateMetrics.lastUpdated) {
          // Check if it's a Firestore Timestamp object
          if (updateMetrics.lastUpdated.toDate) {
            // Convert Firestore Timestamp to readable string
            const date = updateMetrics.lastUpdated.toDate();
            const formattedDate = date.toLocaleString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
              second: '2-digit',
              timeZoneName: 'short'
            });
            setLastUpdated(formattedDate);
          } else {
            // If it's already a string, use it directly
            setLastUpdated(updateMetrics.lastUpdated);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching last updated time:', error);
    }
  }, []);

  // Fetch last updated time on component mount
  useEffect(() => {
    fetchLastUpdated();
  }, [fetchLastUpdated]);
  
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
  
  // Count active campaigns
  const activeCampaignCount = useMemo(() => {
    return campaigns?.filter(campaign => !campaign.isComplete).length || 0;
  }, [campaigns]);
  
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
      
      // Fetch updated last updated time
      await fetchLastUpdated();
      
      setUpdateMessage('Metrics updated successfully');
      
      // Clear message after 3 seconds
      setTimeout(() => {
        setUpdateMessage(null);
      }, 3000);
    } catch (error: Error | unknown) {
      console.error('Error updating metrics:', error);
      setUpdateMessage(`Error updating metrics: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // Clear error message after 5 seconds
      setTimeout(() => {
        setUpdateMessage(null);
      }, 5000);
    } finally {
      setIsUpdating(false);
    }
  }, [campaigns, isUpdating, refresh, fetchLastUpdated]);
  
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
        isComplete: false,
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
  
  const handleReactivateCampaign = async (campaign: Campaign) => {
    try {
      await updateDocument(campaign.id, {
        ...campaign,
        isComplete: false,
        lastUpdated: Date.now()
      });
      await refresh();
      toast.success('Campaign reactivated successfully');
    } catch (error) {
      console.error('Error reactivating campaign:', error);
      toast.error('Failed to reactivate campaign');
    }
  };
  
  return (
    <div className="max-w-6xl mx-auto">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <button
          onClick={() => openModal()}
          className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-md font-medium transition-colors hover:cursor-pointer"
        >
          Create Campaign
        </button>
      </div>

      {/* Update Metrics Section */}
      <div className="mb-8">
        <button
          onClick={handleUpdateMetrics}
          disabled={isUpdating || loading}
          className="w-full bg-primary hover:bg-secondary hover:text-gray-900 disabled:bg-gray-400 text-white px-8 py-6 rounded-xl font-semibold text-lg transition-all duration-200 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transform hover:scale-[1.01] disabled:transform-none disabled:hover:scale-100 hover:cursor-pointer"
        >
          {isUpdating ? (
            <>
              <svg className="animate-spin h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Updating Metrics...</span>
            </>
          ) : (
            <>
              <svg className="h-6 w-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <div className="flex flex-col items-center">
                <span>Update Metrics for {activeCampaignCount} Active Campaign{activeCampaignCount !== 1 ? 's' : ''}</span>
                <span className="text-sm opacity-75 mt-1">and channel #active-campaigns</span>
              </div>
            </>
          )}
        </button>

        {/* Status Messages */}
        {updateMessage && (
          <div className={`mt-4 py-3 px-4 rounded-lg text-center font-medium ${
            updateMessage.includes('Error') 
              ? 'bg-red-50 text-red-700 border border-red-200' 
              : 'bg-green-50 text-green-700 border border-green-200'
          }`}>
            {updateMessage}
          </div>
        )}

        {/* Last Updated Info */}
        {lastUpdated && (
          <div className="mt-4 text-center">
            <div className="inline-flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-lg border">
              <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm text-gray-600 font-medium">Last updated: {lastUpdated}</span>
            </div>
          </div>
        )}
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
              onReactivate={handleReactivateCampaign}
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
          onDelete={handleDeleteCampaign}
          initialData={editingCampaign}
          isLoading={operationLoading}
        />
      )}
    </div>
  );
} 
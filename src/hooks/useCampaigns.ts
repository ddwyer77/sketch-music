import { useState, useEffect } from 'react';
import { addDocument, getAllDocuments, updateDocument, deleteDocument, getDocumentById } from '../lib/firestore';
import { Campaign } from '../app/dashboard/page';

const CAMPAIGN_COLLECTION = 'campaigns';

export function useCampaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load campaigns from Firestore
  const loadCampaigns = async () => {
    setLoading(true);
    try {
      const data = await getAllDocuments<Campaign>(CAMPAIGN_COLLECTION);
      setCampaigns(data);
      setError(null);
    } catch (err) {
      console.error('Error loading campaigns:', err);
      setError('Failed to load campaigns');
      
      // Fallback to localStorage if Firestore fails
      const storedCampaigns = localStorage.getItem('campaigns');
      if (storedCampaigns) {
        setCampaigns(JSON.parse(storedCampaigns));
      }
    } finally {
      setLoading(false);
    }
  };

  // Add a new campaign
  const addCampaign = async (campaign: Omit<Campaign, 'id'>) => {
    try {
      const newId = await addDocument<Campaign>(CAMPAIGN_COLLECTION, campaign);
      const newCampaign = { ...campaign, id: newId };
      setCampaigns(prev => [...prev, newCampaign]);
      
      // Also save to localStorage as backup
      localStorage.setItem('campaigns', JSON.stringify([...campaigns, newCampaign]));
      
      return newId;
    } catch (err) {
      console.error('Error adding campaign:', err);
      setError('Failed to add campaign');
      
      // Fallback to localStorage if Firestore fails
      const newCampaign = { ...campaign, id: crypto.randomUUID() };
      const updatedCampaigns = [...campaigns, newCampaign];
      setCampaigns(updatedCampaigns);
      localStorage.setItem('campaigns', JSON.stringify(updatedCampaigns));
      
      return newCampaign.id;
    }
  };

  // Update an existing campaign
  const updateCampaign = async (id: string, data: Partial<Campaign>) => {
    try {
      await updateDocument<Campaign>(CAMPAIGN_COLLECTION, id, data);
      setCampaigns(prev => 
        prev.map(campaign => 
          campaign.id === id ? { ...campaign, ...data } : campaign
        )
      );
      
      // Also update localStorage
      localStorage.setItem('campaigns', JSON.stringify(
        campaigns.map(campaign => campaign.id === id ? { ...campaign, ...data } : campaign)
      ));
      
      return true;
    } catch (err) {
      console.error('Error updating campaign:', err);
      setError('Failed to update campaign');
      
      // Fallback to localStorage if Firestore fails
      const updatedCampaigns = campaigns.map(campaign => 
        campaign.id === id ? { ...campaign, ...data } : campaign
      );
      setCampaigns(updatedCampaigns);
      localStorage.setItem('campaigns', JSON.stringify(updatedCampaigns));
      
      return true;
    }
  };

  // Delete a campaign
  const deleteCampaign = async (id: string) => {
    try {
      await deleteDocument(CAMPAIGN_COLLECTION, id);
      setCampaigns(prev => prev.filter(campaign => campaign.id !== id));
      
      // Also update localStorage
      localStorage.setItem('campaigns', JSON.stringify(
        campaigns.filter(campaign => campaign.id !== id)
      ));
      
      return true;
    } catch (err) {
      console.error('Error deleting campaign:', err);
      setError('Failed to delete campaign');
      
      // Fallback to localStorage if Firestore fails
      const updatedCampaigns = campaigns.filter(campaign => campaign.id !== id);
      setCampaigns(updatedCampaigns);
      localStorage.setItem('campaigns', JSON.stringify(updatedCampaigns));
      
      return true;
    }
  };

  // Get a single campaign by ID
  const getCampaign = async (id: string): Promise<Campaign | null> => {
    try {
      return await getDocumentById<Campaign>(CAMPAIGN_COLLECTION, id);
    } catch (err) {
      console.error('Error getting campaign:', err);
      setError('Failed to get campaign');
      
      // Fallback to localStorage if Firestore fails
      const localCampaign = campaigns.find(campaign => campaign.id === id) || null;
      return localCampaign;
    }
  };

  // Load campaigns when component mounts
  useEffect(() => {
    loadCampaigns();
  }, []);

  return {
    campaigns,
    loading,
    error,
    loadCampaigns,
    addCampaign,
    updateCampaign,
    deleteCampaign,
    getCampaign
  };
} 
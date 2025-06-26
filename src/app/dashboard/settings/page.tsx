"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, setDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { user } = useAuth();
  const [campaignTypes, setCampaignTypes] = useState<string[]>([]);
  const [newType, setNewType] = useState('');
  const [editingType, setEditingType] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch campaign types from configuration collection
  useEffect(() => {
    const fetchCampaignTypes = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        const configDoc = doc(db, 'configuration', 'campaigns');
        const configSnapshot = await getDoc(configDoc);
        
        if (configSnapshot.exists()) {
          const data = configSnapshot.data();
          setCampaignTypes(data.campaignTypes || []);
        } else {
          // Initialize with empty array if document doesn't exist
          setCampaignTypes([]);
        }
      } catch (error) {
        console.error('Error fetching campaign types:', error);
        toast.error('Failed to load campaign types');
      } finally {
        setLoading(false);
      }
    };

    fetchCampaignTypes();
  }, [user]);

  const addCampaignType = async () => {
    if (!newType.trim()) {
      toast.error('Please enter a campaign type name');
      return;
    }

    if (campaignTypes.includes(newType.trim())) {
      toast.error('This campaign type already exists');
      return;
    }

    try {
      setSaving(true);
      const configDoc = doc(db, 'configuration', 'campaigns');
      
      // Check if document exists, if not create it
      const configSnapshot = await getDoc(configDoc);
      if (!configSnapshot.exists()) {
        // Create the document with initial data
        await setDoc(configDoc, {
          campaignTypes: [newType.trim()]
        });
      } else {
        // Add to existing array
        await updateDoc(configDoc, {
          campaignTypes: arrayUnion(newType.trim())
        });
      }
      
      setCampaignTypes(prev => [...prev, newType.trim()]);
      setNewType('');
      toast.success('Campaign type added successfully');
    } catch (error) {
      console.error('Error adding campaign type:', error);
      toast.error('Failed to add campaign type');
    } finally {
      setSaving(false);
    }
  };

  const startEditType = (type: string) => {
    setEditingType(type);
    setEditValue(type);
  };

  const saveEditType = async () => {
    if (!editingType || !editValue.trim()) {
      toast.error('Please enter a valid campaign type name');
      return;
    }

    if (campaignTypes.includes(editValue.trim()) && editValue.trim() !== editingType) {
      toast.error('This campaign type already exists');
      return;
    }

    try {
      setSaving(true);
      const configDoc = doc(db, 'configuration', 'campaigns');
      
      // Check if document exists
      const configSnapshot = await getDoc(configDoc);
      if (!configSnapshot.exists()) {
        toast.error('Configuration document not found');
        return;
      }
      
      // Remove old type and add new type
      await updateDoc(configDoc, {
        campaignTypes: arrayRemove(editingType)
      });
      await updateDoc(configDoc, {
        campaignTypes: arrayUnion(editValue.trim())
      });
      
      setCampaignTypes(prev => 
        prev.map(type => type === editingType ? editValue.trim() : type)
      );
      setEditingType(null);
      setEditValue('');
      toast.success('Campaign type updated successfully');
    } catch (error) {
      console.error('Error updating campaign type:', error);
      toast.error('Failed to update campaign type');
    } finally {
      setSaving(false);
    }
  };

  const cancelEditType = () => {
    setEditingType(null);
    setEditValue('');
  };

  const deleteCampaignType = async (type: string) => {
    if (!window.confirm(`Are you sure you want to delete the campaign type "${type}"?`)) {
      return;
    }

    try {
      setSaving(true);
      const configDoc = doc(db, 'configuration', 'campaigns');
      
      // Check if document exists
      const configSnapshot = await getDoc(configDoc);
      if (!configSnapshot.exists()) {
        toast.error('Configuration document not found');
        return;
      }
      
      await updateDoc(configDoc, {
        campaignTypes: arrayRemove(type)
      });
      
      setCampaignTypes(prev => prev.filter(t => t !== type));
      toast.success('Campaign type deleted successfully');
    } catch (error) {
      console.error('Error deleting campaign type:', error);
      toast.error('Failed to delete campaign type');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
          <h1 className="text-3xl font-bold text-gray-800">Configuration</h1>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2 text-gray-600">Loading campaign types...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
        <h1 className="text-3xl font-bold text-gray-800">Configuration</h1>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button className="py-4 px-6 text-sm font-medium border-b-2 border-primary text-primary">
              Campaigns
            </button>
          </nav>
        </div>
        
        {/* Tab Content */}
        <div className="p-6">
          <div>
            <h2 className="text-lg font-medium text-gray-900 mb-6">Campaign Types</h2>
            
            <div className="space-y-6">
              {/* Add New Campaign Type */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-md font-medium text-gray-900 mb-4">Add New Campaign Type</h3>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    placeholder="Enter campaign type name"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    onKeyPress={(e) => e.key === 'Enter' && addCampaignType()}
                  />
                  <button
                    onClick={addCampaignType}
                    disabled={saving || !newType.trim()}
                    className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:cursor-pointer"
                  >
                    {saving ? 'Adding...' : 'Add Type'}
                  </button>
                </div>
              </div>
              
              {/* Campaign Types List */}
              <div className="border border-gray-200 rounded-lg">
                <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                  <h3 className="text-md font-medium text-gray-900">Existing Campaign Types</h3>
                </div>
                
                {campaignTypes.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    No campaign types configured yet. Add your first campaign type above.
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {campaignTypes.map((type, index) => (
                      <div key={index} className="p-4 flex items-center justify-between">
                        {editingType === type ? (
                          <div className="flex items-center gap-3 flex-1">
                            <input
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                              onKeyPress={(e) => e.key === 'Enter' && saveEditType()}
                            />
                            <button
                              onClick={saveEditType}
                              disabled={saving}
                              className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:cursor-pointer"
                            >
                              Save
                            </button>
                            <button
                              onClick={cancelEditType}
                              disabled={saving}
                              className="px-3 py-1 bg-gray-500 hover:bg-gray-600 text-white rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <>
                            <span className="text-gray-900 font-medium">{type}</span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => startEditType(type)}
                                disabled={saving}
                                className="p-1 text-blue-600 hover:text-blue-800 hover:cursor-pointer disabled:opacity-50"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => deleteCampaignType(type)}
                                disabled={saving}
                                className="p-1 text-red-600 hover:text-red-800 hover:cursor-pointer disabled:opacity-50"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
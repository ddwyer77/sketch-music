"use client";

import { useState, useEffect, useRef } from 'react';
import { storage } from '../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import Image from 'next/image';
import { Campaign } from '@/types/campaign';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Server } from '@/types/server';

type CampaignModalProps = {
  onClose: () => void;
  onSave: (campaign: Campaign) => void;
  initialData: Campaign | null;
  isLoading?: boolean;
};

export default function CampaignModal({ onClose, onSave, initialData, isLoading = false }: CampaignModalProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState<Omit<Campaign, 'id' | 'createdAt'>>({
    name: '',
    budget: 0,
    budgetUsed: 0,
    ratePerMillion: 0,
    imageUrl: '',
    soundId: '',
    soundUrl: '',
    requireSound: false,
    notes: '',
    campaign_path: '',
    videos: [{
      id: crypto.randomUUID(),
      url: '',
      status: 'pending' as const,
      author_id: '',
      created_at: Date.now(),
      updated_at: Date.now()
    }],
    serverIds: [],
    views: 0,
    shares: 0,
    comments: 0,
    likes: 0,
    status: 'draft',
    updatedAt: Date.now(),
    lastUpdated: Date.now(),
    owner_id: '',
    maxSubmissions: 0,
    isComplete: false
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [bulkImportText, setBulkImportText] = useState('');
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [servers, setServers] = useState<Server[]>([]);
  const [selectedServerId, setSelectedServerId] = useState<string>('');
  const [visibleTooltip, setVisibleTooltip] = useState<string | null>(null);
  
  // Initialize form with editing data if available
  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        budget: initialData.budget,
        budgetUsed: initialData.budgetUsed,
        ratePerMillion: initialData.ratePerMillion,
        imageUrl: initialData.imageUrl,
        soundId: initialData.soundId || '',
        soundUrl: initialData.soundUrl || '',
        requireSound: initialData.requireSound || false,
        notes: initialData.notes || '',
        campaign_path: initialData.campaign_path,
        videos: initialData.videos?.length ? initialData.videos : [{
          id: crypto.randomUUID(),
          url: '',
          status: 'pending' as const,
          author_id: '',
          created_at: Date.now(),
          updated_at: Date.now()
        }],
        serverIds: initialData.serverIds || [],
        views: initialData.views,
        shares: initialData.shares,
        comments: initialData.comments,
        likes: initialData.likes,
        status: initialData.status,
        updatedAt: initialData.updatedAt,
        lastUpdated: initialData.lastUpdated,
        owner_id: initialData.owner_id,
        maxSubmissions: initialData.maxSubmissions || 0,
        isComplete: initialData.isComplete || false
      });
    }
  }, [initialData]);
  
  // Fetch servers
  useEffect(() => {
    const fetchServers = async () => {
      if (!user) return;
      
      try {
        const serversQuery = query(
          collection(db, 'servers'),
          where('owner_id', '==', user.uid)
        );
        
        const querySnapshot = await getDocs(serversQuery);
        const serversData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Server[];
        
        setServers(serversData);
      } catch (error) {
        console.error('Error fetching servers:', error);
      }
    };

    fetchServers();
  }, [user]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    
    // Convert numeric fields to numbers
    if (type === 'number') {
      const numValue = parseFloat(value) || 0;
      setFormData({
        ...formData,
        [name]: numValue,
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
    
    // Clear error for this field
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: '',
      });
    }
  };
  
  const handleVideoUrlChange = (index: number, value: string) => {
    const updatedVideos = [...(formData.videos || [])];
    updatedVideos[index] = { ...updatedVideos[index], url: value };
    
    setFormData({
      ...formData,
      videos: updatedVideos,
    });
  };
  
  const addVideoUrl = () => {
    setFormData({
      ...formData,
      videos: [
        ...(formData.videos || []),
        {
          id: crypto.randomUUID(),
          url: '',
          status: 'pending' as const,
          author_id: '',
          created_at: Date.now(),
          updated_at: Date.now()
        }
      ]
    });
  };

  const removeVideoUrl = (index: number) => {
    const updatedVideos = (formData.videos || []).filter((_, i) => i !== index);
    setFormData({
      ...formData,
      videos: updatedVideos
    });
  };
  
  const addServerId = () => {
    if (!selectedServerId) return;
    
    // Check if server is already added
    if (formData.serverIds?.includes(selectedServerId)) {
      return;
    }
    
    setFormData({
      ...formData,
      serverIds: [...(formData.serverIds || []), selectedServerId]
    });
    setSelectedServerId(''); // Reset selection
  };

  const removeServerId = (index: number) => {
    const updatedServerIds = (formData.serverIds || []).filter((_, i) => i !== index);
    setFormData({
      ...formData,
      serverIds: updatedServerIds
    });
  };

  const handleBulkImportChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setBulkImportText(e.target.value);
  };
  
  const handleBulkImport = () => {
    if (!bulkImportText.trim()) return;
    
    // Parse comma-separated URLs
    const urls = bulkImportText
      .split(',')
      .map(url => url.trim())
      .filter(url => url !== '');
    
    if (urls.length > 0) {
      setFormData({
        ...formData,
        videos: [
          ...(formData.videos || []).filter(video => video.url.trim() !== ''),
          ...urls.map(url => ({
            id: crypto.randomUUID(),
            url,
            status: 'pending' as const,
            author_id: '',
            created_at: Date.now(),
            updated_at: Date.now()
          }))
        ],
      });
      setBulkImportText('');
      setShowBulkImport(false);
    }
  };
  
  const handleImageUpload = async (file: File) => {
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setErrors(prev => ({ ...prev, imageUrl: 'Please upload an image file' }));
      return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, imageUrl: 'Image size should be less than 5MB' }));
      return;
    }

    setIsUploading(true);
    try {
      // Create a unique filename
      const filename = `${Date.now()}-${file.name}`;
      const storageRef = ref(storage, `images/${filename}`);
      
      // Upload file
      await uploadBytes(storageRef, file);
      
      // Get download URL
      const downloadURL = await getDownloadURL(storageRef);
      
      // Update form data
      setFormData(prev => ({
        ...prev,
        imageUrl: downloadURL
      }));
      
      // Clear any previous errors
      setErrors(prev => ({ ...prev, imageUrl: '' }));
    } catch (error) {
      console.error('Error uploading image:', error);
      setErrors(prev => ({ ...prev, imageUrl: 'Failed to upload image. Please try again.' }));
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleImageUpload(e.target.files[0]);
    }
  };
  
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Campaign name is required';
    }
    
    if (formData.budget <= 0) {
      newErrors.budget = 'Budget must be greater than 0';
    }
    
    if (formData.ratePerMillion <= 0) {
      newErrors.ratePerMillion = 'Rate per million views must be greater than 0';
    }
    
    // Validate server IDs
    if (!formData.serverIds || formData.serverIds.length === 0 || formData.serverIds.some(id => !id.trim())) {
      newErrors.serverIds = 'At least one Discord server ID is required';
    }
    
    // Only require the first video URL if any are entered
    const videos = formData.videos || [];
    if (videos[0]?.url && !isValidUrl(videos[0].url)) {
      newErrors.videos = 'Please enter a valid URL';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    const campaign: Campaign = {
      id: initialData?.id || '', // Let Firestore generate the ID
      createdAt: initialData?.createdAt || Date.now(),
      ...formData,
      // Preserve the existing campaign_path if it exists
      campaign_path: initialData?.campaign_path || formData.campaign_path,
      // Filter out empty video URLs and ensure all required properties
      videos: (formData.videos || [])
        .filter(video => video.url.trim() !== '')
        .map(video => ({
          id: video.id || crypto.randomUUID(),
          url: video.url,
          status: video.status || 'pending' as const,
          author_id: video.author_id || '',
          created_at: video.created_at || Date.now(),
          updated_at: video.updated_at || Date.now()
        })),
      // Don't include owner_id here - it will be set by the parent component
      owner_id: initialData?.owner_id || ''  // Only include if editing
    };

    onSave(campaign);
  };
  
  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            {initialData ? 'Edit Campaign' : 'Create New Campaign'}
          </h2>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Campaign Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-900 mb-1">
              Campaign Name*
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md text-gray-900 placeholder-gray-500 ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="Enter campaign name"
            />
            {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
          </div>
          
          {/* Sound Settings Group */}
          <div className="space-y-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
            <h3 className="text-lg font-medium text-gray-900">Sound Settings</h3>
            
            {/* Sound ID */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <label htmlFor="soundId" className="block text-sm font-medium text-gray-900">
                  Sound ID
                </label>
                <div className="relative">
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className="h-5 w-5 text-gray-400 hover:text-gray-600 hover:cursor-pointer" 
                    viewBox="0 0 20 20" 
                    fill="currentColor"
                    onClick={() => setVisibleTooltip(visibleTooltip === 'soundId' ? null : 'soundId')}
                  >
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  </svg>
                  <div className={`absolute top-full left-0 mt-2 w-64 p-2 bg-gray-800 text-white text-sm rounded-lg transition-opacity duration-200 z-50 ${visibleTooltip === 'soundId' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                    Example: 7462880899001616400
                  </div>
                </div>
              </div>
              <input
                type="text"
                id="soundId"
                name="soundId"
                value={formData.soundId}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-500"
                placeholder="Enter sound ID"
              />
            </div>
            
            {/* Sound URL */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <label htmlFor="soundUrl" className="block text-sm font-medium text-gray-900">
                  Sound URL
                </label>
                <div className="relative">
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className="h-5 w-5 text-gray-400 hover:text-gray-600 hover:cursor-pointer" 
                    viewBox="0 0 20 20" 
                    fill="currentColor"
                    onClick={() => setVisibleTooltip(visibleTooltip === 'soundUrl' ? null : 'soundUrl')}
                  >
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  </svg>
                  <div className={`absolute top-full left-0 mt-2 w-64 p-2 bg-gray-800 text-white text-sm rounded-lg transition-opacity duration-200 z-50 ${visibleTooltip === 'soundUrl' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                    Example: https://www.tiktok.com/music/Die-With-A-Smile-7403588534353528848
                  </div>
                </div>
              </div>
              <input
                type="text"
                id="soundUrl"
                name="soundUrl"
                value={formData.soundUrl}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-500"
                placeholder="Enter sound URL"
              />
            </div>

            {/* Require Sound Checkbox */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="requireSound"
                name="requireSound"
                checked={formData.requireSound}
                onChange={(e) => setFormData({ ...formData, requireSound: e.target.checked })}
                className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
              />
              <label htmlFor="requireSound" className="ml-2 block text-sm text-gray-900">
                Require users to submit content with this sound
              </label>
            </div>
          </div>
          
          {/* Notes */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <label htmlFor="notes" className="block text-sm font-medium text-gray-900">
                Notes
              </label>
              <div className="relative">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-5 w-5 text-gray-400 hover:text-gray-600 hover:cursor-pointer" 
                  viewBox="0 0 20 20" 
                  fill="currentColor"
                  onClick={() => setVisibleTooltip(visibleTooltip === 'notes' ? null : 'notes')}
                >
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
                <div className={`absolute top-full left-0 mt-2 w-64 p-2 bg-gray-800 text-white text-sm rounded-lg transition-opacity duration-200 z-50 ${visibleTooltip === 'notes' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                  This field supports markdown formatting. You can use **bold**, *italic*, [links](url), and more.
                </div>
              </div>
            </div>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 min-h-[100px] resize-y"
              placeholder="Add any additional notes about this campaign..."
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Budget */}
            <div>
              <label htmlFor="budget" className="block text-sm font-medium text-gray-900 mb-1">
                Budget ($)*
              </label>
              <input
                type="number"
                id="budget"
                name="budget"
                min="0"
                step="0.01"
                value={formData.budget}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md text-gray-900 placeholder-gray-500 ${errors.budget ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="0.00"
              />
              {errors.budget && <p className="mt-1 text-sm text-red-500">{errors.budget}</p>}
            </div>
            
            {/* Rate Per Million Views */}
            <div>
              <label htmlFor="ratePerMillion" className="block text-sm font-medium text-gray-900 mb-1">
                Rate Per 1M Views ($)*
              </label>
              <input
                type="number"
                id="ratePerMillion"
                name="ratePerMillion"
                min="0"
                step="0.01"
                value={formData.ratePerMillion}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md text-gray-900 placeholder-gray-500 ${errors.ratePerMillion ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="0.00"
              />
              {errors.ratePerMillion && <p className="mt-1 text-sm text-red-500">{errors.ratePerMillion}</p>}
            </div>

            {/* Max Submissions */}
            <div>
              <label htmlFor="maxSubmissions" className="block text-sm font-medium text-gray-900 mb-1">
                Max Submissions
              </label>
              <input
                type="number"
                id="maxSubmissions"
                name="maxSubmissions"
                min="0"
                value={formData.maxSubmissions}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-500"
                placeholder="0"
              />
            </div>
          </div>
          
          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Campaign Image
            </label>
            <div
              className={`relative border-2 border-dashed rounded-lg p-4 text-center ${
                dragActive ? 'border-primary bg-primary/5' : 'border-gray-300'
              } ${isUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => !isUploading && fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileInput}
                className="hidden"
                disabled={isUploading}
              />
              
              {formData.imageUrl ? (
                <div className="relative w-full aspect-video">
                  <Image
                    src={formData.imageUrl}
                    alt="Campaign preview"
                    fill
                    className="object-contain rounded"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFormData(prev => ({ ...prev, imageUrl: '' }));
                    }}
                    className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <div className="py-8">
                  {isUploading ? (
                    <div className="flex items-center justify-center">
                      <svg className="animate-spin h-6 w-6 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                  ) : (
                    <>
                      <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <p className="mt-1 text-sm text-gray-600">
                        Drag and drop an image here, or click to select
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        PNG, JPG, GIF up to 5MB
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
            {errors.imageUrl && (
              <p className="mt-1 text-sm text-red-500">{errors.imageUrl}</p>
            )}
          </div>
          
          {/* Server IDs */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <label className="block text-sm font-medium text-gray-900">
                Discord Servers*
              </label>
              <div className="relative">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-5 w-5 text-gray-400 hover:text-gray-600 hover:cursor-pointer" 
                  viewBox="0 0 20 20" 
                  fill="currentColor"
                  onClick={() => setVisibleTooltip(visibleTooltip === 'servers' ? null : 'servers')}
                >
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
                <div className={`absolute top-full left-0 mt-2 w-64 p-2 bg-gray-800 text-white text-sm rounded-lg transition-opacity duration-200 z-50 ${visibleTooltip === 'servers' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                  Select the Discord servers where this campaign should be visible. You can add multiple servers.
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              {/* Server Selection */}
              <div className="flex items-center gap-2">
                <select
                  value={selectedServerId}
                  onChange={(e) => setSelectedServerId(e.target.value)}
                  className="flex-1 p-2 border border-gray-300 rounded text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">Select a server</option>
                  {servers.map((server) => (
                    <option key={server.id} value={server.server_id}>
                      {server.name} ({server.server_id})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={addServerId}
                  disabled={!selectedServerId}
                  className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed hover:cursor-pointer"
                >
                  Add
                </button>
              </div>

              {/* Selected Servers */}
              <div className="space-y-2">
                {(formData.serverIds || []).map((serverId, index) => {
                  const server = servers.find(s => s.server_id === serverId);
                  return (
                    <div key={serverId} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                      <div className="flex items-center space-x-3">
                        {server?.image ? (
                          <Image 
                            src={server.image} 
                            alt={server.name} 
                            width={32} 
                            height={32} 
                            className="w-8 h-8 rounded-full object-cover" 
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium text-gray-900">{server?.name || 'Unknown Server'}</p>
                          <p className="text-xs text-gray-500">ID: {serverId}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeServerId(index)}
                        className="text-red-500 hover:text-red-700 hover:cursor-pointer"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </div>
              {errors.serverIds && <p className="mt-1 text-sm text-red-500">{errors.serverIds}</p>}
            </div>
          </div>
          
          {/* Video URLs */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-900">
                Video URLs
              </label>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setShowBulkImport(!showBulkImport)}
                  className="text-primary hover:text-primary/90 text-sm font-medium hover:cursor-pointer" 
                >
                  {showBulkImport ? 'Cancel Bulk Import' : 'Bulk Import'}
                </button>
                <button
                  type="button"
                  onClick={addVideoUrl}
                  className="text-primary hover:text-primary/90 text-sm font-medium hover:cursor-pointer"
                >
                  + Add New Video URL
                </button>
              </div>
            </div>
            
            {/* Bulk Import Section */}
            {showBulkImport && (
              <div className="mt-4 p-4 border rounded-lg bg-gray-50">
                <h3 className="text-lg font-medium mb-2">Bulk Import Videos</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Enter multiple video URLs separated by commas
                </p>
                <textarea
                  value={bulkImportText}
                  onChange={(e) => setBulkImportText(e.target.value)}
                  className="w-full p-2 border rounded mb-4"
                  rows={4}
                  placeholder="https://example.com/video1, https://example.com/video2, ..."
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowBulkImport(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleBulkImport}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Import
                  </button>
                </div>
              </div>
            )}
            
            {/* Video URL List */}
            <div className="space-y-4">
              {(formData.videos || []).map((video, index) => (
                <div key={video.id || index} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={video.url}
                    onChange={(e) => handleVideoUrlChange(index, e.target.value)}
                    placeholder="Video URL"
                    className="flex-1 p-2 border rounded text-gray-600"
                  />
                  <button
                    type="button"
                    onClick={() => removeVideoUrl(index)}
                    className="p-2 text-red-500 hover:text-red-700 hover:cursor-pointer"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
            {errors.videos && <p className="mt-1 text-sm text-red-500">{errors.videos}</p>}
          </div>
          
          <div className="flex justify-end space-x-4 border-t border-gray-200 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-medium transition-colors hover:cursor-pointer"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary hover:cursor-pointer hover:bg-primary/90 rounded-md text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : (
                'Save Campaign'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 
"use client";

import { useState, useEffect, useRef } from 'react';
import { storage } from '../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import Image from 'next/image';
import { Campaign } from '@/types/campaign';

type CampaignModalProps = {
  onClose: () => void;
  onSave: (campaign: Campaign) => void;
  initialData: Campaign | null;
  isLoading?: boolean;
};

export default function CampaignModal({ onClose, onSave, initialData, isLoading = false }: CampaignModalProps) {
  const [formData, setFormData] = useState<Omit<Campaign, 'id' | 'createdAt'>>({
    name: '',
    budget: 0,
    budgetUsed: 0,
    ratePerMillion: 0,
    imageUrl: '',
    campaign_path: '',
    videos: [{
      id: crypto.randomUUID(),
      url: '',
      status: 'pending' as const,
      author_id: '',
      created_at: Date.now(),
      updated_at: Date.now()
    }],
    views: 0,
    shares: 0,
    comments: 0,
    likes: 0,
    status: 'draft',
    updatedAt: Date.now(),
    lastUpdated: Date.now(),
    owner_id: ''
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [bulkImportText, setBulkImportText] = useState('');
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Initialize form with editing data if available
  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        budget: initialData.budget,
        budgetUsed: initialData.budgetUsed,
        ratePerMillion: initialData.ratePerMillion,
        imageUrl: initialData.imageUrl,
        campaign_path: initialData.campaign_path,
        videos: initialData.videos?.length ? initialData.videos : [{
          id: crypto.randomUUID(),
          url: '',
          status: 'pending' as const,
          author_id: '',
          created_at: Date.now(),
          updated_at: Date.now()
        }],
        views: initialData.views,
        shares: initialData.shares,
        comments: initialData.comments,
        likes: initialData.likes,
        status: initialData.status,
        updatedAt: initialData.updatedAt,
        lastUpdated: initialData.lastUpdated,
        owner_id: initialData.owner_id
      });
    }
  }, [initialData]);
  
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
  
  const handleVideoAuthorChange = (index: number, value: string) => {
    const updatedVideos = [...(formData.videos || [])];
    updatedVideos[index] = { ...updatedVideos[index], author_id: value };
    
    setFormData({
      ...formData,
      videos: updatedVideos,
    });
  };
  
  const addVideoUrl = () => {
    setFormData({
      ...formData,
      videos: [...(formData.videos || []), {
        id: crypto.randomUUID(),
        url: '',
        status: 'pending' as const,
        author_id: '',
        created_at: Date.now(),
        updated_at: Date.now()
      }],
    });
  };
  
  const removeVideoUrl = (index: number) => {
    const updatedVideos = (formData.videos || []).filter((_, i) => i !== index);
    setFormData({
      ...formData,
      videos: updatedVideos.length ? updatedVideos : [{
        id: crypto.randomUUID(),
        url: '',
        status: 'pending' as const,
        author_id: '',
        created_at: Date.now(),
        updated_at: Date.now()
      }],
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
    
    console.log('CampaignModal sending data:', campaign); // Debug log
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
                <div key={video.id} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={video.url}
                    onChange={(e) => handleVideoUrlChange(index, e.target.value)}
                    placeholder="Video URL"
                    className="flex-1 p-2 border rounded"
                  />
                  <input
                    type="text"
                    value={video.author_id}
                    onChange={(e) => handleVideoAuthorChange(index, e.target.value)}
                    placeholder="Author ID"
                    className="flex-1 p-2 border rounded"
                  />
                  <button
                    type="button"
                    onClick={() => removeVideoUrl(index)}
                    className="p-2 text-red-500 hover:text-red-700"
                  >
                    X
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
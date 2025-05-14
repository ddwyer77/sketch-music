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
    campaign_url: '',
    videos: [{ url: '', status: 'pending', author_id: '' }],
    views: 0,
    shares: 0,
    comments: 0,
    lastUpdated: new Date().toISOString()
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
        budgetUsed: Math.round(initialData.budgetUsed / 100) * 100,
        ratePerMillion: initialData.ratePerMillion,
        imageUrl: initialData.imageUrl,
        campaign_url: initialData.campaign_url,
        videos: initialData.videos.length ? initialData.videos : [{ url: '', status: 'pending', author_id: '' }],
        views: initialData.views,
        shares: initialData.shares,
        comments: initialData.comments,
        lastUpdated: initialData.lastUpdated
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
        [name]: name === 'budgetUsed' ? Math.round(numValue / 100) * 100 : numValue,
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
    const updatedVideos = [...formData.videos];
    updatedVideos[index] = { ...updatedVideos[index], url: value };
    
    setFormData({
      ...formData,
      videos: updatedVideos,
    });
  };
  
  const handleVideoAuthorChange = (index: number, value: string) => {
    const updatedVideos = [...formData.videos];
    updatedVideos[index] = { ...updatedVideos[index], author_id: value };
    
    setFormData({
      ...formData,
      videos: updatedVideos,
    });
  };
  
  const addVideoUrl = () => {
    setFormData({
      ...formData,
      videos: [...formData.videos, { url: '', status: 'pending', author_id: '' }],
    });
  };
  
  const removeVideoUrl = (index: number) => {
    const updatedVideos = formData.videos.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      videos: updatedVideos.length ? updatedVideos : [{ url: '', status: 'pending', author_id: '' }],
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
          ...formData.videos.filter(video => video.url.trim() !== ''),
          ...urls.map(url => ({ url, status: 'pending' as const, author_id: '' }))
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
    if (formData.videos[0]?.url && !isValidUrl(formData.videos[0].url)) {
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
      createdAt: initialData?.createdAt || new Date().toISOString(),
      ...formData,
      // Preserve the existing campaign_url if it exists
      campaign_url: initialData?.campaign_url || formData.campaign_url,
      // Filter out empty video URLs
      videos: formData.videos.filter(video => video.url.trim() !== ''),
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
            
            {/* Budget Used */}
            <div>
              <label htmlFor="budgetUsed" className="block text-sm font-medium text-gray-900 mb-1">
                Budget Used ($)
              </label>
              <input
                type="number"
                id="budgetUsed"
                name="budgetUsed"
                min="0"
                step="0.01"
                value={formData.budgetUsed}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-500"
                placeholder="0.00"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              <div className="mb-4 p-3 border border-gray-200 rounded-md">
                <div className="mb-2">
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Paste comma-separated URLs
                  </label>
                  <textarea
                    value={bulkImportText}
                    onChange={handleBulkImportChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-500"
                    rows={3}
                    placeholder="https://example.com/video1, https://example.com/video2, ..."
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <label htmlFor="csv-upload" className="inline-block px-4 py-2 bg-gray-200 text-gray-900 rounded-md cursor-pointer hover:bg-gray-300 text-sm font-medium">
                      Import from CSV
                    </label>
                    <input
                      id="csv-upload"
                      type="file"
                      accept=".csv,.txt"
                      onChange={handleFileInput}
                      className="hidden"
                    />
                  </div>
                  
                  <button
                    type="button"
                    onClick={handleBulkImport}
                    className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 text-sm font-medium"
                    disabled={!bulkImportText.trim()}
                  >
                    Add URLs
                  </button>
                </div>
              </div>
            )}
            
            {/* Video URL List */}
            <div className="space-y-4">
              {formData.videos.map((video, index) => (
                <div key={index} className="flex gap-4 items-start">
                  <div className="flex-grow">
                    <input
                      type="text"
                      value={video.url}
                      onChange={(e) => handleVideoUrlChange(index, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-500"
                      placeholder="Enter video URL"
                    />
                  </div>
                  <div className="flex-grow">
                    <input
                      type="text"
                      value={video.author_id}
                      onChange={(e) => handleVideoAuthorChange(index, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-500"
                      placeholder="Author ID"
                    />
                  </div>
                  {formData.videos.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeVideoUrl(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  )}
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
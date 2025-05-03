"use client";

import { useState, useEffect } from 'react';
import { Campaign } from '../app/dashboard/page';

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
    videoUrls: [''],
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Initialize form with editing data if available
  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        budget: initialData.budget,
        budgetUsed: initialData.budgetUsed,
        ratePerMillion: initialData.ratePerMillion,
        imageUrl: initialData.imageUrl,
        videoUrls: initialData.videoUrls.length ? initialData.videoUrls : [''],
      });
    }
  }, [initialData]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    
    // Convert numeric fields to numbers
    if (type === 'number') {
      setFormData({
        ...formData,
        [name]: parseFloat(value) || 0,
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
    const updatedUrls = [...formData.videoUrls];
    updatedUrls[index] = value;
    
    setFormData({
      ...formData,
      videoUrls: updatedUrls,
    });
  };
  
  const addVideoUrl = () => {
    setFormData({
      ...formData,
      videoUrls: [...formData.videoUrls, ''],
    });
  };
  
  const removeVideoUrl = (index: number) => {
    const updatedUrls = formData.videoUrls.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      videoUrls: updatedUrls.length ? updatedUrls : [''],
    });
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
    if (formData.videoUrls[0] && !isValidUrl(formData.videoUrls[0])) {
      newErrors.videoUrls = 'Please enter a valid URL';
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
      id: initialData?.id || crypto.randomUUID(),
      createdAt: initialData?.createdAt || new Date().toISOString(),
      ...formData,
      // Filter out empty video URLs
      videoUrls: formData.videoUrls.filter(url => url.trim() !== ''),
    };
    
    onSave(campaign);
  };
  
  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold">
            {initialData ? 'Edit Campaign' : 'Create New Campaign'}
          </h2>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Campaign Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Campaign Name*
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
            />
            {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Budget */}
            <div>
              <label htmlFor="budget" className="block text-sm font-medium text-gray-700 mb-1">
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
                className={`w-full px-3 py-2 border rounded-md ${errors.budget ? 'border-red-500' : 'border-gray-300'}`}
              />
              {errors.budget && <p className="mt-1 text-sm text-red-500">{errors.budget}</p>}
            </div>
            
            {/* Budget Used */}
            <div>
              <label htmlFor="budgetUsed" className="block text-sm font-medium text-gray-700 mb-1">
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Rate Per Million Views */}
            <div>
              <label htmlFor="ratePerMillion" className="block text-sm font-medium text-gray-700 mb-1">
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
                className={`w-full px-3 py-2 border rounded-md ${errors.ratePerMillion ? 'border-red-500' : 'border-gray-300'}`}
              />
              {errors.ratePerMillion && <p className="mt-1 text-sm text-red-500">{errors.ratePerMillion}</p>}
            </div>
            
            {/* Image URL */}
            <div>
              <label htmlFor="imageUrl" className="block text-sm font-medium text-gray-700 mb-1">
                Campaign Image URL
              </label>
              <input
                type="text"
                id="imageUrl"
                name="imageUrl"
                value={formData.imageUrl}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="https://example.com/image.jpg"
              />
            </div>
          </div>
          
          {/* Video URLs */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Video URLs
              </label>
              <button
                type="button"
                onClick={addVideoUrl}
                className="text-primary hover:text-primary/90 text-sm font-medium"
              >
                + Add New Video URL
              </button>
            </div>
            
            {formData.videoUrls.map((url, index) => (
              <div key={index} className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  value={url}
                  onChange={(e) => handleVideoUrlChange(index, e.target.value)}
                  className={`flex-1 px-3 py-2 border rounded-md ${
                    index === 0 && errors.videoUrls ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="https://example.com/video"
                />
                <button
                  type="button"
                  onClick={() => removeVideoUrl(index)}
                  className="text-gray-500 hover:text-red-500"
                  disabled={formData.videoUrls.length === 1}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
            {errors.videoUrls && <p className="mt-1 text-sm text-red-500">{errors.videoUrls}</p>}
          </div>
          
          <div className="flex justify-end space-x-4 border-t border-gray-200 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-medium transition-colors"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary hover:bg-primary/90 rounded-md text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
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
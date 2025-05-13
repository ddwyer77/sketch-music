"use client";

import { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useFirestoreOperations } from '@/hooks';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

type Video = {
  url: string;
  status: 'pending' | 'approved' | 'denied';
  author_id: string;
};

type VideoModalProps = {
  campaignId: string;
  videoUrls: Video[];
  onClose: () => void;
  onVideosUpdated: () => void;
};

export default function VideoModal({ campaignId, videoUrls, onClose, onVideosUpdated }: VideoModalProps) {
  const { user } = useAuth();
  const [videos, setVideos] = useState<Video[]>([{ url: '', status: 'pending', author_id: user?.uid || '' }]);
  const [bulkImportText, setBulkImportText] = useState('');
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleVideoUrlChange = (index: number, value: string) => {
    const updatedVideos = [...videos];
    updatedVideos[index] = { ...updatedVideos[index], url: value };
    setVideos(updatedVideos);
  };

  const addVideoUrl = () => {
    setVideos([...videos, { url: '', status: 'pending', author_id: user?.uid || '' }]);
  };

  const removeVideoUrl = (index: number) => {
    const updatedVideos = videos.filter((_, i) => i !== index);
    setVideos(updatedVideos.length ? updatedVideos : [{ url: '', status: 'pending', author_id: user?.uid || '' }]);
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
      setVideos([
        ...videos.filter(video => video.url.trim() !== ''),
        ...urls.map(url => ({ url, status: 'pending' as const, author_id: user?.uid || '' }))
      ]);
      setBulkImportText('');
      setShowBulkImport(false);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      
      reader.onload = (event) => {
        if (event.target?.result) {
          const text = event.target.result as string;
          setBulkImportText(text);
        }
      };
      
      reader.readAsText(file);
    }
  };

  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate URLs
    const invalidUrls = videos.filter(video => video.url && !isValidUrl(video.url));
    if (invalidUrls.length > 0) {
      alert('Please enter valid URLs');
      return;
    }

    setIsSubmitting(true);
    try {
      // Filter out empty URLs and ensure author_id is set
      const validVideos = videos
        .filter(video => video.url.trim() !== '')
        .map(video => ({
          ...video,
          author_id: user?.uid || ''
        }));

      // Get the campaign document reference
      const campaignRef = doc(db, 'campaigns', campaignId);
      
      // Update the campaign with new videos
      await updateDoc(campaignRef, {
        videos: [...videoUrls, ...validVideos],
        lastUpdated: new Date().toISOString()
      });

      onVideosUpdated();
      onClose();
    } catch (error) {
      console.error('Error submitting videos:', error);
      alert('Failed to submit videos. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Submit Videos</h2>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
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
              {videos.map((video, index) => (
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
                  {videos.length > 1 && (
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
          </div>
          
          <div className="flex justify-end space-x-4 border-t border-gray-200 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-medium transition-colors hover:cursor-pointer"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary hover:cursor-pointer hover:bg-primary/90 rounded-md text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Submitting...
                </>
              ) : (
                'Submit Videos'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 
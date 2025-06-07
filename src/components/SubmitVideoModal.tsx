"use client";

import { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useFirestoreOperations } from '@/hooks';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import toast from 'react-hot-toast';

type SubmitVideoModalProps = {
  campaignId: string;
  onClose: () => void;
  onVideosUpdated: () => void;
};

export default function SubmitVideoModal({ campaignId, onClose, onVideosUpdated }: SubmitVideoModalProps) {
  const [videoUrl, setVideoUrl] = useState('');
  const [bulkImportText, setBulkImportText] = useState('');
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { updateDocument } = useFirestoreOperations('campaigns');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSingleVideoSubmit = async () => {
    if (!videoUrl.trim()) {
      setError('Please enter a video URL');
      return;
    }

    if (!isValidUrl(videoUrl)) {
      setError('Please enter a valid URL');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const newVideo = {
        id: crypto.randomUUID(),
        url: videoUrl.trim(),
        status: 'pending' as const,
        author_id: user?.uid || '',
        created_at: Date.now(),
        updated_at: Date.now()
      };

      await updateDocument(campaignId, {
        videos: arrayUnion(newVideo)
      });

      setVideoUrl('');
      onVideosUpdated();
      toast.success(
        'Your video has been submitted successfully! Our team will review it shortly.',
        {
          duration: 5000,
          position: 'top-center',
          style: {
            background: '#10B981',
            color: '#fff',
            padding: '16px',
            borderRadius: '8px',
          },
        }
      );
      onClose();
    } catch (error) {
      console.error('Error submitting video:', error);
      setError('Failed to submit video. Please try again.');
      toast.error(
        'Failed to submit video. Please check your connection and try again.',
        {
          duration: 5000,
          position: 'bottom-right',
          style: {
            background: '#EF4444',
            color: '#fff',
            padding: '16px',
            borderRadius: '8px',
          },
        }
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkImport = async () => {
    if (!bulkImportText.trim()) {
      setError('Please enter video URLs');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Parse comma-separated URLs
      const urls = bulkImportText
        .split(',')
        .map(url => url.trim())
        .filter(url => url !== '' && isValidUrl(url));

      if (urls.length === 0) {
        setError('No valid URLs found');
        return;
      }

      const newVideos = urls.map(url => ({
        id: crypto.randomUUID(),
        url,
        status: 'pending' as const,
        author_id: user?.uid || '',
        created_at: Date.now(),
        updated_at: Date.now()
      }));

      await updateDocument(campaignId, {
        videos: arrayUnion(...newVideos)
      });

      setBulkImportText('');
      onVideosUpdated();
      toast.success(
        `Successfully submitted ${newVideos.length} video${newVideos.length > 1 ? 's' : ''}! Our team will review them shortly.`,
        {
          duration: 5000,
          position: 'bottom-right',
          style: {
            background: '#10B981',
            color: '#fff',
            padding: '16px',
            borderRadius: '8px',
          },
        }
      );
      onClose();
    } catch (error) {
      console.error('Error submitting videos:', error);
      setError('Failed to submit videos. Please try again.');
      toast.error(
        'Failed to submit videos. Please check your connection and try again.',
        {
          duration: 5000,
          position: 'bottom-right',
          style: {
            background: '#EF4444',
            color: '#fff',
            padding: '16px',
            borderRadius: '8px',
          },
        }
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError('');

    try {
      const text = await file.text();
      setBulkImportText(text);
      setShowBulkImport(true);
    } catch (error) {
      console.error('Error reading file:', error);
      setError('Failed to read file. Please try again.');
      toast.error(
        'Failed to read file. Please make sure it\'s a valid text or CSV file.',
        {
          duration: 5000,
          position: 'bottom-right',
          style: {
            background: '#EF4444',
            color: '#fff',
            padding: '16px',
            borderRadius: '8px',
          },
        }
      );
    } finally {
      setIsLoading(false);
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

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">Submit Video</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 hover:cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
              <span className="block sm:inline">{error}</span>
            </div>
          )}

          <div className="space-y-6">
            {/* Single Video URL Input */}
            <div>
              <label htmlFor="video-url" className="block text-sm font-medium text-gray-900 mb-2">
                TikTok Video URL
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  id="video-url"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://www.tiktok.com/@username/video/1234567890123456789"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                <button
                  onClick={handleSingleVideoSubmit}
                  disabled={isLoading || !videoUrl.trim()}
                  className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed hover:cursor-pointer"
                >
                  {isLoading ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </div>

            {/* Bulk Import Section */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-900">
                  Bulk Import
                </label>
                <button
                  type="button"
                  onClick={() => setShowBulkImport(!showBulkImport)}
                  className="text-primary hover:text-primary/90 text-sm font-medium hover:cursor-pointer"
                >
                  {showBulkImport ? 'Cancel' : 'Import Multiple Videos'}
                </button>
              </div>

              {showBulkImport && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Paste comma-separated URLs
                    </label>
                    <textarea
                      value={bulkImportText}
                      onChange={(e) => setBulkImportText(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      rows={4}
                      placeholder="https://tiktok.com/@user1/video/123, https://tiktok.com/@user2/video/456"
                    />
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label htmlFor="csv-upload" className="inline-block px-4 py-2 bg-gray-200 text-gray-900 rounded-md cursor-pointer hover:bg-gray-300 text-sm font-medium hover:cursor-pointer">
                        Import from CSV
                      </label>
                      <input
                        id="csv-upload"
                        type="file"
                        accept=".csv,.txt"
                        onChange={handleFileUpload}
                        className="hidden"
                        ref={fileInputRef}
                      />
                    </div>

                    <button
                      onClick={handleBulkImport}
                      disabled={isLoading || !bulkImportText.trim()}
                      className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed hover:cursor-pointer"
                    >
                      {isLoading ? 'Submitting...' : 'Submit All'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
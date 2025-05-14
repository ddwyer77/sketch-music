"use client";

import { useState, useEffect } from 'react';
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
  const [selectedVideoIndex, setSelectedVideoIndex] = useState(0);
  const [embedUrl, setEmbedUrl] = useState<string>('');
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [isAddingVideo, setIsAddingVideo] = useState(false);
  const [localVideos, setLocalVideos] = useState<Video[]>(videoUrls);
  const [hasChanges, setHasChanges] = useState(false);
  const { user } = useAuth();
  const { updateDocument, loading } = useFirestoreOperations('campaigns');

  // Update local videos when prop changes
  useEffect(() => {
    setLocalVideos(videoUrls);
    setHasChanges(false);
  }, [videoUrls]);

  useEffect(() => {
    if (localVideos.length > 0) {
      const url = localVideos[selectedVideoIndex].url;
      // Convert TikTok URL to embed URL
      try {
        // Extract video ID from TikTok URL format
        // Example: https://www.tiktok.com/@username/video/1234567890123456789
        const match = url.match(/\/video\/(\d+)/);
        if (match && match[1]) {
          const videoId = match[1];
          setEmbedUrl(`https://www.tiktok.com/embed/v2/${videoId}`);
        } else {
          // If we can't parse it, just use the original URL
          setEmbedUrl(url);
        }
      } catch (error) {
        console.error('Error parsing TikTok URL:', error);
        setEmbedUrl(url);
      }
    }
  }, [localVideos, selectedVideoIndex]);

  const handleStatusChange = (index: number, newStatus: 'pending' | 'approved' | 'denied') => {
    setLocalVideos(prevVideos => 
      prevVideos.map((video, i) => 
        i === index ? { ...video, status: newStatus } : video
      )
    );
    setHasChanges(true);
  };

  const handleSaveChanges = async () => {
    try {
      await updateDocument(campaignId, { videos: localVideos });
      setHasChanges(false);
      onVideosUpdated();
      onClose();
    } catch (error) {
      console.error('Error saving changes:', error);
      alert('Failed to save changes. Please try again.');
    }
  };

  const handleDeleteVideo = async (indexToDelete: number) => {
    if (window.confirm('Are you sure you want to delete this video?')) {
      setLocalVideos(prevVideos => prevVideos.filter((_, index) => index !== indexToDelete));
      setHasChanges(true);
      
      // If we deleted the currently selected video, select the first one
      if (indexToDelete === selectedVideoIndex) {
        setSelectedVideoIndex(0);
      }
      // If we deleted a video before the currently selected one, adjust the index
      else if (indexToDelete < selectedVideoIndex) {
        setSelectedVideoIndex(selectedVideoIndex - 1);
      }
    }
  };

  const handleAddVideo = async () => {
    if (!newVideoUrl.trim()) return;

    const newVideo = { 
      url: newVideoUrl.trim(), 
      status: 'pending' as const, 
      author_id: user?.uid || '' 
    };

    setLocalVideos(prevVideos => [...prevVideos, newVideo]);
    setNewVideoUrl('');
    setIsAddingVideo(false);
    setHasChanges(true);
  };

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-6xl h-[80vh] flex flex-col">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">Campaign Videos</h2>
          <div className="flex items-center gap-4">
            {hasChanges && (
              <button
                onClick={handleSaveChanges}
                disabled={loading}
                className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            )}
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Video List - Left Column */}
          <div className="w-1/3 border-r border-gray-200 p-6 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Video List</h3>
              <button
                onClick={() => setIsAddingVideo(true)}
                className="bg-primary hover:bg-primary/90 text-white px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
              >
                Add Video
              </button>
            </div>

            {isAddingVideo && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <input
                  type="text"
                  value={newVideoUrl}
                  onChange={(e) => setNewVideoUrl(e.target.value)}
                  placeholder="Enter TikTok video URL"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-gray-500"
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={handleAddVideo}
                    disabled={!newVideoUrl.trim()}
                    className="bg-primary hover:bg-primary/90 text-white px-3 py-1.5 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => {
                      setIsAddingVideo(false);
                      setNewVideoUrl('');
                    }}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {localVideos.length === 0 ? (
              <p className="text-gray-500">No videos in this campaign.</p>
            ) : (
              <ul className="space-y-3">
                {localVideos.map((video, index) => (
                  <li 
                    key={index} 
                    className={`flex justify-between items-center p-3 rounded-lg ${
                      selectedVideoIndex === index 
                        ? 'bg-primary/10 outline-primary outline-2' 
                        : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <div 
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => setSelectedVideoIndex(index)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-gray-900 truncate">Video {index + 1}</span>
                        <div>
                          <select
                            value={video.status}
                            onChange={(e) => handleStatusChange(index, e.target.value as 'pending' | 'approved' | 'denied')}
                            className={`shrink-0 px-2 py-1 text-sm rounded-md ${
                              video.status === 'approved' ? 'bg-green-50 text-green-700 border-green-200' :
                              video.status === 'denied' ? 'bg-red-50 text-red-700 border-red-200' :
                              'bg-yellow-50 text-yellow-700 border-yellow-200'
                            }`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <option value="pending" className="bg-yellow-50 text-gray-900">Pending</option>
                            <option value="approved" className="bg-green-50 text-gray-900">Approved</option>
                            <option value="denied" className="bg-red-50 text-gray-900">Denied</option>
                          </select>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteVideo(index);
                            }}
                            className={`ml-2 shrink-0 p-1 rounded-full ${
                              selectedVideoIndex === index 
                                ? 'bg-gray-200 hover:bg-gray-300 text-red-500' 
                                : 'bg-gray-200 hover:bg-gray-300 text-red-500'
                            }`}
                            title="Delete video"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      <div className="text-xs text-gray-900 mt-1 truncate">
                        {video.url}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Video Preview - Right Column */}
          <div className="flex-1 p-6 flex flex-col">
            <h3 className="text-lg font-medium mb-4 text-gray-900">Video Preview</h3>
            
            {localVideos.length > 0 ? (
              <div className="flex-1 bg-black rounded-lg overflow-hidden">
                {embedUrl ? (
                  <iframe
                    src={embedUrl}
                    className="w-full h-full"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                ) : (
                  <div className="text-white flex items-center justify-center h-full">Loading video...</div>
                )}
              </div>
            ) : (
              <div className="flex-1 bg-gray-100 rounded-lg flex items-center justify-center">
                <p className="text-gray-500">No video selected</p>
              </div>
            )}
            
            {localVideos.length > 0 && (
              <div className="mt-4">
                <p className="text-sm text-gray-500 break-all">
                  {localVideos[selectedVideoIndex].url}
                </p>
              </div>
            )}
          </div>
        </div>
        
        <div className="p-6 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
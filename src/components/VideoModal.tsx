"use client";

import { useState, useEffect } from 'react';
import { useFirestoreOperations } from '../hooks';

interface VideoModalProps {
  campaignId: string;
  videoUrls: string[];
  onClose: () => void;
  onVideosUpdated: () => void;
}

export default function VideoModal({ campaignId, videoUrls, onClose, onVideosUpdated }: VideoModalProps) {
  const [selectedVideoIndex, setSelectedVideoIndex] = useState(0);
  const [embedUrl, setEmbedUrl] = useState<string>('');
  const { updateDocument, loading } = useFirestoreOperations('campaigns');

  useEffect(() => {
    if (videoUrls.length > 0) {
      const url = videoUrls[selectedVideoIndex];
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
  }, [videoUrls, selectedVideoIndex]);

  const handleDeleteVideo = async (indexToDelete: number) => {
    if (window.confirm('Are you sure you want to delete this video?')) {
      const updatedUrls = videoUrls.filter((_, index) => index !== indexToDelete);
      
      try {
        await updateDocument(campaignId, { videoUrls: updatedUrls });
        // If we deleted the currently selected video, select the first one
        if (indexToDelete === selectedVideoIndex) {
          setSelectedVideoIndex(0);
        }
        // If we deleted a video before the currently selected one, adjust the index
        else if (indexToDelete < selectedVideoIndex) {
          setSelectedVideoIndex(selectedVideoIndex - 1);
        }
        
        onVideosUpdated();
      } catch (error) {
        console.error('Error deleting video:', error);
        alert('Failed to delete video. Please try again.');
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-bold">Campaign Videos</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="flex flex-col md:flex-row h-[70vh]">
          {/* Video List - Left Column */}
          <div className="w-full md:w-1/3 border-r border-gray-200 overflow-y-auto p-4">
            <h3 className="text-lg font-medium mb-4">Video List</h3>
            
            {videoUrls.length === 0 ? (
              <p className="text-gray-500">No videos in this campaign.</p>
            ) : (
              <ul className="space-y-3">
                {videoUrls.map((url, index) => (
                  <li 
                    key={index} 
                    className={`flex justify-between items-center p-3 rounded-lg ${
                      selectedVideoIndex === index 
                        ? 'bg-primary text-white' 
                        : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <button
                      className="flex-1 text-left truncate"
                      onClick={() => setSelectedVideoIndex(index)}
                    >
                      <span className="font-medium">Video {index + 1}</span>
                      <div className="text-xs truncate">
                        {url}
                      </div>
                    </button>
                    
                    <button
                      onClick={() => handleDeleteVideo(index)}
                      className={`ml-2 p-1 rounded-full ${
                        selectedVideoIndex === index 
                          ? 'bg-white/20 hover:bg-white/30 text-white' 
                          : 'bg-gray-200 hover:bg-gray-300 text-red-500'
                      }`}
                      title="Delete video"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          
          {/* Video Preview - Right Column */}
          <div className="w-full md:w-2/3 p-4 flex flex-col">
            <h3 className="text-lg font-medium mb-4">Video Preview</h3>
            
            {videoUrls.length > 0 ? (
              <div className="flex-1 bg-black flex items-center justify-center rounded-lg overflow-hidden">
                {embedUrl ? (
                  <iframe
                    src={embedUrl}
                    className="w-full h-full"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                ) : (
                  <div className="text-white">Loading video...</div>
                )}
              </div>
            ) : (
              <div className="flex-1 bg-gray-100 flex items-center justify-center rounded-lg">
                <p className="text-gray-500">No video selected</p>
              </div>
            )}
            
            {videoUrls.length > 0 && (
              <div className="mt-4">
                <p className="text-sm text-gray-500 break-all">
                  {videoUrls[selectedVideoIndex]}
                </p>
              </div>
            )}
          </div>
        </div>
        
        <div className="p-4 border-t border-gray-200 flex justify-end">
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
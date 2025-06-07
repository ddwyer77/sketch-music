"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useFirestoreOperations } from '@/hooks';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

type Video = {
  id: string;
  url: string;
  status: 'pending' | 'approved' | 'denied';
  author_id: string;
  soundIdMatch?: boolean;
  title?: string;
  reasonForDenial?: string | null;
  markedForDeletion?: boolean;
  author?: {
    nickname: string;
    uniqueId: string;
  };
  views?: number;
  shares?: number;
  comments?: number;
  likes?: number;
  description?: string;
  createdAt?: string;
  musicTitle?: string;
  musicAuthor?: string;
  musicId?: string;
};

type DenialModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (reason: string | null) => void;
};

type ConfirmationModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
};

function ConfirmationModal({ isOpen, onClose, onConfirm, title, message, confirmText, cancelText }: ConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-[70] p-4">
      <div className="bg-white rounded-lg w-full max-w-md p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 hover:cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors hover:cursor-pointer"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

function DenialModal({ isOpen, onClose, onSave }: DenialModalProps) {
  const [reason, setReason] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-lg w-full max-w-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Deny Video</h3>
        <div className="mb-4">
          <label htmlFor="denialReason" className="block text-sm font-medium text-gray-700 mb-2">
            Let the user know why their video was denied
          </label>
          <textarea
            id="denialReason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-gray-800"
            rows={4}
            placeholder="Enter reason for denial..."
          />
        </div>
        <div className="flex justify-end gap-3">
          <button
            onClick={() => onSave(null)}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 hover:cursor-pointer"
          >
            Continue without message
          </button>
          <button
            onClick={() => onClose()}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 hover:cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(reason.trim() || null)}
            className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors hover:cursor-pointer"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

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
  const [isCheckingSoundIds, setIsCheckingSoundIds] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'denied'>('pending');
  const [isDenialModalOpen, setIsDenialModalOpen] = useState(false);
  const [pendingDenialIndex, setPendingDenialIndex] = useState<number | null>(null);
  const [isCloseConfirmationOpen, setIsCloseConfirmationOpen] = useState(false);
  const [isDeleteConfirmationOpen, setIsDeleteConfirmationOpen] = useState(false);
  const [pendingDeleteIndex, setPendingDeleteIndex] = useState<number | null>(null);
  const { user } = useAuth();
  const { updateDocument, loading } = useFirestoreOperations('campaigns');

  // Filter videos based on active tab
  const filteredVideos = localVideos.filter(video => video.status === activeTab);

  // Initial setup of videos with titles and sound ID check
  useEffect(() => {
    const setupVideos = async () => {
      setIsCheckingSoundIds(true);
      try {
        // Get campaign to check soundId
        const campaignRef = doc(db, 'campaigns', campaignId);
        const campaignDoc = await getDoc(campaignRef);
        const campaign = campaignDoc.data();
        const soundId = campaign?.soundId;

        // Process all videos using existing data
        const updatedVideos = videoUrls.map(video => ({
          ...video,
          id: video.id || crypto.randomUUID(),
          soundIdMatch: soundId ? video.musicId === soundId : false
        }));

        setLocalVideos(updatedVideos);
      } catch (error) {
        // If there's an error with the campaign fetch, just set the videos without sound ID check
        const updatedVideos = videoUrls.map(video => ({
          ...video,
          id: video.id || crypto.randomUUID(),
          soundIdMatch: false
        }));
        setLocalVideos(updatedVideos);
      } finally {
        setIsCheckingSoundIds(false);
      }
    };

    setupVideos();
  }, [campaignId, videoUrls]);

  // Update embed URL when selected video changes
  useEffect(() => {
    if (localVideos.length > 0) {
      const url = localVideos[selectedVideoIndex].url;
      try {
        const match = url.match(/\/video\/(\d+)/);
        if (match && match[1]) {
          const videoId = match[1];
          setEmbedUrl(`https://www.tiktok.com/embed/v2/${videoId}`);
        } else {
          setEmbedUrl(url);
        }
      } catch (error) {
        console.error('Error parsing TikTok URL:', error);
        setEmbedUrl(url);
      }
    }
  }, [localVideos, selectedVideoIndex]);

  const handleStatusChange = (index: number, newStatus: 'pending' | 'approved' | 'denied') => {
    if (newStatus === 'denied') {
      setPendingDenialIndex(index);
      setIsDenialModalOpen(true);
    } else {
      setLocalVideos(prevVideos => 
        prevVideos.map((video, i) => 
          i === index ? { ...video, status: newStatus } : video
        )
      );
      setHasChanges(true);
    }
  };

  const handleDenialSave = (reason: string | null) => {
    if (pendingDenialIndex !== null) {
      setLocalVideos(prevVideos => 
        prevVideos.map((video, i) => 
          i === pendingDenialIndex ? { ...video, status: 'denied', reasonForDenial: reason } : video
        )
      );
      setHasChanges(true);
    }
    setIsDenialModalOpen(false);
    setPendingDenialIndex(null);
  };

  const handleDeleteVideo = (indexToDelete: number) => {
    setLocalVideos(prevVideos => 
      prevVideos.map((video, index) => 
        index === indexToDelete ? { ...video, markedForDeletion: true } : video
      )
    );
    setHasChanges(true);
  };

  const handleUndoDelete = (indexToUndo: number) => {
    setLocalVideos(prevVideos => 
      prevVideos.map((video, index) => 
        index === indexToUndo ? { ...video, markedForDeletion: false } : video
      )
    );
  };

  const handleSaveChanges = async () => {
    try {
      // Filter out videos marked for deletion before saving
      const videosToSave = localVideos.filter(video => !video.markedForDeletion);
      await updateDocument(campaignId, { videos: videosToSave });
      setHasChanges(false);
      onVideosUpdated();
      onClose();
    } catch (error) {
      console.error('Error saving changes:', error);
      alert('Failed to save changes. Please try again.');
    }
  };

  // Count videos marked for deletion
  const deletedVideosCount = localVideos.filter(v => v.markedForDeletion).length;

  const handleAddVideo = async () => {
    if (!newVideoUrl.trim()) return;

    try {
      // Check if the URL is valid by trying to fetch its data
      const metrics = await extractTikTokMetrics(await fetchTikTokDataFromUrl(newVideoUrl.trim()));
      
      const newVideo = { 
        id: crypto.randomUUID(),
        url: newVideoUrl.trim(), 
        status: 'pending' as const, 
        author_id: user?.uid || '',
        soundIdMatch: false // Will be updated when the modal opens
      };

      setLocalVideos(prevVideos => [...prevVideos, newVideo]);
      setNewVideoUrl('');
      setIsAddingVideo(false);
      setHasChanges(true);
    } catch (error) {
      console.error('Error adding video:', error);
      alert('Invalid TikTok URL. Please check the URL and try again.');
    }
  };

  const handleCloseAttempt = () => {
    if (hasChanges) {
      setIsCloseConfirmationOpen(true);
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-6xl h-[80vh] flex flex-col">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">Campaign Videos</h2>
          <button 
            onClick={handleCloseAttempt}
            className="text-gray-500 hover:text-gray-700 hover:cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {deletedVideosCount > 0 && (
          <div className="bg-red-50 border-b border-red-200 px-6 py-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-red-800">
                {deletedVideosCount} video{deletedVideosCount === 1 ? '' : 's'} marked for deletion. Press save to confirm.
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-1 min-h-0">
          {/* Video List - Left Column */}
          <div className="w-2/3 border-r border-gray-200 p-6 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <div className="flex space-x-4">
                <button
                  onClick={() => setActiveTab('pending')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors hover:cursor-pointer ${
                    activeTab === 'pending'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Pending
                </button>
                <button
                  onClick={() => setActiveTab('approved')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors hover:cursor-pointer ${
                    activeTab === 'approved'
                      ? 'bg-green-100 text-green-800'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Approved
                </button>
                <button
                  onClick={() => setActiveTab('denied')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors hover:cursor-pointer ${
                    activeTab === 'denied'
                      ? 'bg-red-100 text-red-800'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Denied
                </button>
              </div>
              <button
                onClick={() => setIsAddingVideo(true)}
                className="bg-primary hover:bg-primary/90 text-white px-3 py-1.5 rounded-md text-sm font-medium transition-colors hover:cursor-pointer"
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
                    className="bg-primary hover:bg-primary/90 text-white px-3 py-1.5 rounded-md text-sm font-medium transition-colors disabled:opacity-50 hover:cursor-pointer"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => {
                      setIsAddingVideo(false);
                      setNewVideoUrl('');
                    }}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1.5 rounded-md text-sm font-medium transition-colors hover:cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {filteredVideos.length === 0 ? (
              <p className="text-gray-500">No {activeTab} videos in this campaign.</p>
            ) : (
              <ul className="space-y-2">
                {filteredVideos.map((video, index) => {
                  const originalIndex = localVideos.findIndex(v => v.url === video.url);
                  return (
                    <li 
                      key={video.id} 
                      className={`flex justify-between items-center p-2 rounded-lg relative ${
                        selectedVideoIndex === originalIndex 
                          ? 'bg-primary/10 outline-primary outline-2' 
                          : 'bg-gray-50 hover:bg-gray-100'
                      } ${video.markedForDeletion ? 'opacity-50' : ''}`}
                    >
                      {video.markedForDeletion && (
                        <div className="absolute inset-0 flex items-center justify-center bg-red-50/80 rounded-lg">
                          <div className="flex items-center gap-2">
                            <span className="text-red-600 font-medium">Video Marked for Deletion</span>
                            <button
                              onClick={() => handleUndoDelete(originalIndex)}
                              className="text-sm text-red-600 hover:text-red-800 hover:cursor-pointer font-medium"
                            >
                              Undo
                            </button>
                          </div>
                        </div>
                      )}
                      <div 
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => setSelectedVideoIndex(originalIndex)}
                      >
                        <div className="flex flex-col">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                                <a 
                                  href={video.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-bold text-gray-900 hover:text-primary hover:cursor-pointer truncate block"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {video.title ? (
                                    video.title.length > 50 ? `${video.title.substring(0, 50)}...` : video.title
                                  ) : (
                                    `Video ${originalIndex + 1}`
                                  )}
                                </a>
                                {video.author && (
                                  <span className="text-sm text-gray-600 whitespace-nowrap">
                                    @{video.author.uniqueId} • {video.author.nickname}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <select
                                value={video.status}
                                onChange={(e) => handleStatusChange(originalIndex, e.target.value as 'pending' | 'approved' | 'denied')}
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
                                  handleDeleteVideo(originalIndex);
                                }}
                                className={`shrink-0 p-1 rounded-full ${
                                  selectedVideoIndex === originalIndex 
                                    ? 'bg-gray-200 hover:bg-gray-300 text-red-500' 
                                    : 'bg-gray-200 hover:bg-gray-300 text-red-500'
                                } hover:cursor-pointer`}
                                title="Delete video"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>
                          {video.status === 'denied' && video.reasonForDenial && (
                            <div className="mt-1 text-sm text-red-600">
                              Reason: {video.reasonForDenial}
                            </div>
                          )}
                          <div className="flex items-center gap-1 mt-1">
                            {isCheckingSoundIds ? (
                              <svg className="animate-spin h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            ) : video.soundIdMatch ? (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                              </svg>
                            )}
                            <span className="text-xs text-gray-600">Sound ID Match</span>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Video Preview - Right Column */}
          <div className="w-1/3 p-6 flex flex-col">
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
                <a 
                  href={localVideos[selectedVideoIndex].url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:text-primary/90 hover:cursor-pointer"
                >
                  Video URL
                </a>
              </div>
            )}
          </div>
        </div>
        
        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          {hasChanges && (
            <button
              onClick={handleSaveChanges}
              disabled={loading}
              className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 hover:cursor-pointer"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          )}
          <button
            onClick={handleCloseAttempt}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 hover:cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>

      <DenialModal
        isOpen={isDenialModalOpen}
        onClose={() => {
          setIsDenialModalOpen(false);
          setPendingDenialIndex(null);
        }}
        onSave={handleDenialSave}
      />

      <ConfirmationModal
        isOpen={isCloseConfirmationOpen}
        onClose={() => setIsCloseConfirmationOpen(false)}
        onConfirm={onClose}
        title="Unsaved Changes"
        message="You have unsaved changes. Are you sure you want to close without saving?"
        confirmText="Close Without Saving"
        cancelText="Go Back"
      />
    </div>
  );
}
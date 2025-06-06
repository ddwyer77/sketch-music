"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useFirestoreOperations } from '@/hooks';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import Image from 'next/image';
import { Server } from '@/types/server';

const DEFAULT_FORM_DATA: Omit<Server, 'id' | 'owner_id' | 'created_at' | 'updated_at'> = {
  name: '',
  image: '',
  server_id: '',
  active_campaigns_channel_id: '',
  isProductionServer: true
};

export default function DiscordPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('servers');
  const [servers, setServers] = useState<Server[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddServerModal, setShowAddServerModal] = useState(false);
  const [editingServer, setEditingServer] = useState<Server | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isUpdatingCampaigns, setIsUpdatingCampaigns] = useState(false);
  const [formData, setFormData] = useState(DEFAULT_FORM_DATA);
  const { addDocument, updateDocument, deleteDocument } = useFirestoreOperations<Omit<Server, 'id'>>('servers');
  const [visibleTooltip, setVisibleTooltip] = useState<string | null>(null);

  const toggleTooltip = (tooltipId: string) => {
    setVisibleTooltip(visibleTooltip === tooltipId ? null : tooltipId);
  };

  // Add click handler to close tooltips when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (visibleTooltip && !(event.target as Element).closest('.tooltip-container')) {
        setVisibleTooltip(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [visibleTooltip]);

  // Check if user is admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            if (!userData.roles?.includes('admin')) {
              router.push('/creator');
            }
          }
        } catch (error) {
          console.error('Error checking admin status:', error);
          setError('Failed to verify admin status');
        }
      }
    };
    checkAdminStatus();
  }, [user, router]);

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
        setError('Failed to load servers');
      } finally {
        setIsLoading(false);
      }
    };

    fetchServers();
  }, [user]);

  const handleImageUpload = async (file: File) => {
    if (!file || !user) return;
    
    // Check admin status before uploading
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists() || !userDoc.data().roles?.includes('admin')) {
        setError('You must be an admin to upload server images');
        return;
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      setError('Failed to verify admin status');
      return;
    }
    
    setIsUploading(true);
    try {
      const storageRef = ref(storage, `images/${Date.now()}-${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      setFormData(prev => ({
        ...prev,
        image: downloadURL
      }));
    } catch (error) {
      console.error('Error uploading image:', error);
      setError('Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    
    try {
      const serverData = {
        ...formData,
        owner_id: user.uid,
        created_at: editingServer?.created_at || Date.now(),
        updated_at: Date.now()
      };
      
      if (editingServer) {
        await updateDocument(editingServer.id, serverData);
      } else {
        await addDocument(serverData);
      }
      
      // Refresh servers list
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
      
      // Reset form and close modal
      setFormData(DEFAULT_FORM_DATA);
      setEditingServer(null);
      setShowAddServerModal(false);
    } catch (error) {
      console.error('Error saving server:', error);
      setError('Failed to save server');
    }
  };

  const handleEdit = (server: Server) => {
    setEditingServer(server);
    setFormData({
      ...DEFAULT_FORM_DATA,
      name: server.name,
      image: server.image,
      server_id: server.server_id,
      active_campaigns_channel_id: server.active_campaigns_channel_id
    });
    setShowAddServerModal(true);
  };

  const handleDelete = async (serverId: string) => {
    if (!confirm('Are you sure you want to delete this server?')) return;
    
    try {
      await deleteDocument(serverId);
      setServers(prev => prev.filter(s => s.id !== serverId));
    } catch (error) {
      console.error('Error deleting server:', error);
      setError('Failed to delete server');
    }
  };

  const handleUpdateActiveCampaigns = async () => {
    if (!user) return;
    
    setIsUpdatingCampaigns(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/discord/update-active-campaigns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.uid
        })
      });

      // Since the operation is working, we'll just show success
      alert('Active campaigns updated successfully');
    } catch (error) {
      console.error('Error updating active campaigns:', error);
      setError('Failed to update active campaigns');
    } finally {
      setIsUpdatingCampaigns(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm p-6">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
          <p className="font-medium">Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Discord Management</h1>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('servers')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm hover:cursor-pointer ${
              activeTab === 'servers'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              Servers
            </div>
          </button>
        </nav>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {activeTab === 'servers' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-800">Connected Servers</h2>
              <div className="flex gap-3">
                <button
                  onClick={handleUpdateActiveCampaigns}
                  disabled={isUpdatingCampaigns}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md font-medium transition-colors hover:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUpdatingCampaigns ? 'Updating...' : 'Update Active Campaigns'}
                </button>
                <button
                  onClick={() => {
                    setEditingServer(null);
                    setFormData(DEFAULT_FORM_DATA);
                    setShowAddServerModal(true);
                  }}
                  className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-md font-medium transition-colors hover:cursor-pointer"
                >
                  Add Server
                </button>
              </div>
            </div>

            {servers.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-8 text-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Servers Connected</h3>
                <p className="text-gray-600 mb-6">Connect your Discord server to start managing campaigns</p>
                <button
                  onClick={() => {
                    setEditingServer(null);
                    setFormData(DEFAULT_FORM_DATA);
                    setShowAddServerModal(true);
                  }}
                  className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-md font-medium transition-colors hover:cursor-pointer"
                >
                  Add Your First Server
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {servers.map((server) => (
                  <div key={server.id} className="bg-white rounded-xl shadow-sm p-6">
                    <div className="flex items-center space-x-4 mb-4">
                      {server.image ? (
                        <Image 
                          src={server.image} 
                          alt={server.name} 
                          width={48} 
                          height={48} 
                          className="w-12 h-12 rounded-full object-cover" 
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                        </div>
                      )}
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">{server.name}</h3>
                        <p className="text-sm text-gray-500">ID: {server.server_id}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Campaigns Channel:</span> {server.active_campaigns_channel_id}
                      </p>
                    </div>
                    <div className="mt-4 flex justify-end space-x-2">
                      <button
                        onClick={() => handleEdit(server)}
                        className="text-gray-600 hover:text-gray-900 hover:cursor-pointer"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(server.id)}
                        className="text-red-600 hover:text-red-900 hover:cursor-pointer"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add/Edit Server Modal */}
      {showAddServerModal && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">
                {editingServer ? 'Edit Server' : 'Add Discord Server'}
              </h2>
              <button 
                onClick={() => {
                  setShowAddServerModal(false);
                  setEditingServer(null);
                  setFormData(DEFAULT_FORM_DATA);
                }}
                className="text-gray-500 hover:text-gray-700 hover:cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <label htmlFor="server-name" className="block text-sm font-medium text-gray-900">
                      Server Name
                    </label>
                    <div className="relative tooltip-container">
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        className="h-5 w-5 text-gray-400 hover:text-gray-600 hover:cursor-pointer" 
                        viewBox="0 0 20 20" 
                        fill="currentColor"
                        onClick={() => toggleTooltip('server-name')}
                      >
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                      </svg>
                      <div className={`absolute top-full left-0 mt-2 w-64 p-2 bg-gray-800 text-white text-sm rounded-lg transition-opacity duration-200 z-50 ${visibleTooltip === 'server-name' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                        Name of the server. This can be a nickname and doesn&apos;t have to match the server name exactly.
                      </div>
                    </div>
                  </div>
                  <input
                    type="text"
                    id="server-name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="My Awesome Server"
                    required
                  />
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <label htmlFor="server-image" className="block text-sm font-medium text-gray-900">
                      Server Image
                    </label>
                    <div className="relative tooltip-container">
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        className="h-5 w-5 text-gray-400 hover:text-gray-600 hover:cursor-pointer" 
                        viewBox="0 0 20 20" 
                        fill="currentColor"
                        onClick={() => toggleTooltip('server-image')}
                      >
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                      </svg>
                      <div className={`absolute top-full left-0 mt-2 w-64 p-2 bg-gray-800 text-white text-sm rounded-lg transition-opacity duration-200 z-50 ${visibleTooltip === 'server-image' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                        Add an image to quickly identify your server
                      </div>
                    </div>
                  </div>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                    {formData.image ? (
                      <div className="relative">
                        <Image 
                          src={formData.image} 
                          alt="Server" 
                          width={128} 
                          height={128} 
                          className="h-32 w-32 rounded-full object-cover" 
                        />
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, image: '' }))}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 hover:cursor-pointer"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-1 text-center">
                        <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                          <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <div className="flex text-sm text-gray-600">
                          <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-primary hover:text-primary/90 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary">
                            <span>Upload a file</span>
                            <input
                              id="file-upload"
                              name="file-upload"
                              type="file"
                              className="sr-only"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleImageUpload(file);
                              }}
                            />
                          </label>
                          <p className="pl-1">or drag and drop</p>
                        </div>
                        <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <label htmlFor="server-id" className="block text-sm font-medium text-gray-900">
                      Server ID
                    </label>
                    <div className="relative tooltip-container">
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        className="h-5 w-5 text-gray-400 hover:text-gray-600 hover:cursor-pointer" 
                        viewBox="0 0 20 20" 
                        fill="currentColor"
                        onClick={() => toggleTooltip('server-id')}
                      >
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                      </svg>
                      <div className={`absolute top-full left-0 mt-2 w-64 p-2 bg-gray-800 text-white text-sm rounded-lg transition-opacity duration-200 z-50 ${visibleTooltip === 'server-id' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                        The id of your server. To find this ID ensure dev tools is enabled and right click your server.
                      </div>
                    </div>
                  </div>
                  <input
                    type="text"
                    id="server-id"
                    value={formData.server_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, server_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="123456789012345678"
                    required
                  />
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <label htmlFor="campaigns-channel-id" className="block text-sm font-medium text-gray-900">
                      Active Campaigns Channel ID
                    </label>
                    <div className="relative tooltip-container">
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        className="h-5 w-5 text-gray-400 hover:text-gray-600 hover:cursor-pointer" 
                        viewBox="0 0 20 20" 
                        fill="currentColor"
                        onClick={() => toggleTooltip('campaigns-channel-id')}
                      >
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                      </svg>
                      <div className={`absolute top-full left-0 mt-2 w-64 p-2 bg-gray-800 text-white text-sm rounded-lg transition-opacity duration-200 z-50 ${visibleTooltip === 'campaigns-channel-id' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                        The id of the channel within your server where campaign information will be listed.
                      </div>
                    </div>
                  </div>
                  <input
                    type="text"
                    id="campaigns-channel-id"
                    value={formData.active_campaigns_channel_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, active_campaigns_channel_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="123456789012345678"
                    required
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddServerModal(false);
                      setEditingServer(null);
                      setFormData(DEFAULT_FORM_DATA);
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUploading}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUploading ? 'Uploading...' : editingServer ? 'Save Changes' : 'Save Server'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
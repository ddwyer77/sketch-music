"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@/hooks';
import { toast } from 'react-hot-toast';
import { collection, doc, updateDoc, addDoc, serverTimestamp, query, orderBy, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import Image from 'next/image';
import { Bug } from '@/types/bug';

export default function BugsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('active');
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingBug, setEditingBug] = useState<Bug | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [type, setType] = useState('bug');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string>('');
  const [removeImage, setRemoveImage] = useState(false);
  const [localBugs, setLocalBugs] = useState<Bug[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  // Create stable query constraints to prevent infinite loop
  const queryConstraints = useMemo(() => [orderBy('order', 'asc')], []);

  // Fetch bugs with ordering
  const { documents: bugs = [], loading } = useQuery<Bug>(
    'bugs',
    queryConstraints
  );

  // Update local bugs when server data changes
  useEffect(() => {
    setLocalBugs(bugs);
  }, [bugs]);

  const activeBugs = localBugs.filter(bug => bug.status === 'active');
  const completeBugs = localBugs.filter(bug => bug.status === 'complete');

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const openEditModal = (bug: Bug) => {
    setIsEditing(true);
    setEditingBug(bug);
    setTitle(bug.title);
    setDescription(bug.description || '');
    setPriority(bug.priority || 'medium');
    setType(bug.type || 'bug');
    setSelectedImage(null);
    setPreviewUrl(bug.imageUrl || null);
    setRemoveImage(false);
    setShowModal(true);
  };

  const openImagePreview = (imageUrl: string) => {
    setPreviewImageUrl(imageUrl);
    setShowImagePreview(true);
  };

  const resetModal = () => {
    setIsEditing(false);
    setEditingBug(null);
    setTitle('');
    setDescription('');
    setPriority('medium');
    setType('bug');
    setSelectedImage(null);
    setPreviewUrl(null);
    setRemoveImage(false);
    setShowModal(false);
  };

  const handleDelete = async () => {
    if (!editingBug) return;
    
    if (!confirm('Are you sure you want to delete this report? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    
    // Immediately remove from local state for instant UI feedback
    setLocalBugs(prev => prev.filter(bug => bug.id !== editingBug.id));
    
    try {
      await updateDoc(doc(db, 'bugs', editingBug.id), {
        status: 'deleted'
      });
      toast.success('Report deleted successfully');
      resetModal();
    } catch (error) {
      console.error('Error deleting report:', error);
      toast.error('Failed to delete report');
      // Revert local state if database update fails
      setLocalBugs(bugs);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Please fill in the title');
      return;
    }

    setIsSubmitting(true);
    try {
      let imageUrl = editingBug?.imageUrl || '';
      if (selectedImage) {
        setIsUploading(true);
        const storageRef = ref(storage, `bugs/${Date.now()}_${selectedImage.name}`);
        const snapshot = await uploadBytes(storageRef, selectedImage);
        imageUrl = await getDownloadURL(snapshot.ref);
        setIsUploading(false);
      } else if (removeImage) {
        imageUrl = '';
      }

      if (isEditing && editingBug) {
        // Update existing bug
        const updateData = {
          title: title.trim(),
          description: description.trim(),
          priority,
          type,
          imageUrl,
          updatedAt: serverTimestamp()
        };

        await updateDoc(doc(db, 'bugs', editingBug.id), updateData);
        toast.success('Report updated successfully');
      } else {
        // Create new bug
        const newBug = {
          title: title.trim(),
          description: description.trim(),
          priority,
          type,
          status: 'active',
          imageUrl,
          createdAt: serverTimestamp(),
          createdBy: {
            id: user?.uid,
            name: user?.displayName || 'Unknown User'
          },
          order: activeBugs.length // Add to the end of the list
        };

        const docRef = await addDoc(collection(db, 'bugs'), newBug);
        
        // Immediately add to local state for instant UI feedback
        const newBugWithId = {
          id: docRef.id,
          ...newBug,
          createdAt: Timestamp.fromDate(new Date()) // Use proper Timestamp for local state
        } as Bug;
        
        setLocalBugs(prev => [...prev, newBugWithId]);
        toast.success('Report submitted successfully');
      }

      resetModal();
    } catch (error) {
      console.error('Error submitting report:', error);
      toast.error(isEditing ? 'Failed to update report' : 'Failed to submit report');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkComplete = async (bugId: string) => {
    // Immediately update local state for instant UI feedback
    setLocalBugs(prev => prev.map(bug => 
      bug.id === bugId ? { ...bug, status: 'complete' } : bug
    ));
    
    try {
      await updateDoc(doc(db, 'bugs', bugId), {
        status: 'complete'
      });
      toast.success('Report marked as complete');
    } catch (error) {
      console.error('Error updating report:', error);
      toast.error('Failed to update report status');
      // Revert local state if database update fails
      setLocalBugs(bugs);
    }
  };

  const handleReorder = async (bugId: string, direction: 'up' | 'down') => {
    const currentBug = activeBugs.find(b => b.id === bugId);
    if (!currentBug) return;

    const currentIndex = activeBugs.findIndex(b => b.id === bugId);
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    
    if (targetIndex < 0 || targetIndex >= activeBugs.length) return;

    const targetBug = activeBugs[targetIndex];
    
    // Immediately update local state for instant UI feedback
    const updatedBugs = [...localBugs];
    const currentBugIndex = updatedBugs.findIndex(b => b.id === bugId);
    const targetBugIndex = updatedBugs.findIndex(b => b.id === targetBug.id);
    
    // Swap the bugs in the local array
    [updatedBugs[currentBugIndex], updatedBugs[targetBugIndex]] = [updatedBugs[targetBugIndex], updatedBugs[currentBugIndex]];
    
    setLocalBugs(updatedBugs);
    
    try {
      // Update database in background
      await updateDoc(doc(db, 'bugs', bugId), {
        order: targetBug.order
      });
      await updateDoc(doc(db, 'bugs', targetBug.id), {
        order: currentBug.order
      });
    } catch (error) {
      console.error('Error reordering reports:', error);
      toast.error('Failed to reorder reports');
      // Revert local state if database update fails
      setLocalBugs(bugs);
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'low':
        return '🟢';
      case 'medium':
        return '🟡';
      case 'high':
        return '🔴';
      default:
        return '🟡';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'bug':
        return '🐛';
      case 'task':
        return '📋';
      default:
        return '🐛';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'high':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'bug':
        return 'bg-red-100 text-red-800';
      case 'task':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-red-100 text-red-800';
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
        <h1 className="text-3xl font-bold text-gray-800">Bugs and Tasks</h1>
        <button 
          onClick={() => {
            resetModal();
            setShowModal(true);
          }}
          className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg w-full md:w-auto hover:cursor-pointer flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Bug or Task
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('active')}
            className={`${
              activeTab === 'active'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm hover:cursor-pointer`}
          >
            <div className="flex items-center space-x-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Active ({activeBugs.length})</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('complete')}
            className={`${
              activeTab === 'complete'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm hover:cursor-pointer`}
          >
            <div className="flex items-center space-x-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Complete ({completeBugs.length})</span>
            </div>
          </button>
        </nav>
      </div>

      {/* Bug List */}
      <div className="space-y-4">
        {(activeTab === 'active' ? activeBugs : completeBugs).map((bug) => (
          <div key={bug.id} className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg font-medium text-gray-900">{bug.title}</h3>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    bug.status === 'active' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {bug.status}
                  </span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(bug.priority || 'medium')}`}>
                    {getPriorityIcon(bug.priority || 'medium')} {bug.priority || 'medium'}
                  </span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(bug.type || 'bug')}`}>
                    {getTypeIcon(bug.type || 'bug')} {bug.type || 'bug'}
                  </span>
                </div>
                {bug.description && (
                  <p className="text-gray-600 mb-4">{bug.description}</p>
                )}
                {bug.imageUrl && (
                  <div className="mb-4">
                    <Image
                      src={bug.imageUrl}
                      alt={bug.title}
                      width={200}
                      height={200}
                      className="rounded-lg object-cover cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => bug.imageUrl && openImagePreview(bug.imageUrl)}
                    />
                  </div>
                )}
                <div className="text-sm text-gray-500">
                  Submitted by: {bug.createdBy.name} on {new Date(bug.createdAt?.toDate()).toLocaleDateString()}
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4">
                {activeTab === 'active' && (
                  <>
                    <button
                      onClick={() => handleReorder(bug.id, 'up')}
                      className="p-2 text-gray-500 hover:text-gray-700 hover:cursor-pointer"
                      title="Move up"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleReorder(bug.id, 'down')}
                      className="p-2 text-gray-500 hover:text-gray-700 hover:cursor-pointer"
                      title="Move down"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleMarkComplete(bug.id)}
                      className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:cursor-pointer"
                    >
                      Mark Done
                    </button>
                  </>
                )}
                <button
                  onClick={() => openEditModal(bug)}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:cursor-pointer"
                >
                  Edit
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Submit Bug Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg w-full max-w-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">{isEditing ? 'Edit Report' : 'Submit Report'}</h3>
              <button
                onClick={resetModal}
                className="text-gray-500 hover:text-gray-700 hover:cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-900 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Brief description of the issue"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="priority" className="block text-sm font-medium text-gray-900 mb-1">
                    Priority
                  </label>
                  <select
                    id="priority"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="low">🟢 Low</option>
                    <option value="medium">🟡 Medium</option>
                    <option value="high">🔴 High</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="type" className="block text-sm font-medium text-gray-900 mb-1">
                    Type
                  </label>
                  <select
                    id="type"
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="bug">🐛 Bug</option>
                    <option value="task">📋 Task</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-900 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  rows={4}
                  placeholder="Detailed description of the issue (optional)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Screenshot (Optional)
                </label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg">
                  <div className="space-y-1 text-center">
                    {previewUrl && !removeImage ? (
                      <div className="relative">
                        <Image
                          src={previewUrl}
                          alt="Preview"
                          width={200}
                          height={200}
                          className="mx-auto rounded-lg"
                        />
                        <div className="mt-2 flex justify-center space-x-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedImage(null);
                              setPreviewUrl(null);
                            }}
                            className="bg-red-500 text-white rounded px-3 py-1 text-sm hover:bg-red-600 hover:cursor-pointer"
                          >
                            Replace Image
                          </button>
                          {isEditing && (
                            <button
                              type="button"
                              onClick={() => {
                                setRemoveImage(true);
                                setPreviewUrl(null);
                              }}
                              className="bg-gray-500 text-white rounded px-3 py-1 text-sm hover:bg-gray-600 hover:cursor-pointer"
                            >
                              Remove Image
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <>
                        <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                          <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <div className="flex text-sm text-gray-600">
                          <label
                            htmlFor="file-upload"
                            className="relative cursor-pointer bg-white rounded-md font-medium text-primary hover:text-primary-dark focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary"
                          >
                            <span>Upload a file</span>
                            <input
                              id="file-upload"
                              name="file-upload"
                              type="file"
                              className="sr-only"
                              accept="image/*"
                              onChange={handleImageChange}
                            />
                          </label>
                          <p className="pl-1">or drag and drop</p>
                        </div>
                        <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                        {removeImage && (
                          <div className="mt-2">
                            <p className="text-sm text-gray-500">Image will be removed when you save</p>
                            <button
                              type="button"
                              onClick={() => {
                                setRemoveImage(false);
                                setPreviewUrl(editingBug?.imageUrl || null);
                              }}
                              className="mt-1 text-sm text-blue-600 hover:text-blue-800 hover:cursor-pointer"
                            >
                              Cancel removal
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={resetModal}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg hover:cursor-pointer"
                >
                  Cancel
                </button>
                {isEditing && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:cursor-pointer"
                  >
                    {isDeleting ? (
                      <div className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Deleting...
                      </div>
                    ) : (
                      'Delete Report'
                    )}
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isSubmitting || isUploading}
                  className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:cursor-pointer"
                >
                  {isSubmitting || isUploading ? (
                    <div className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {isUploading ? 'Uploading...' : 'Submitting...'}
                    </div>
                  ) : (
                    isEditing ? 'Update Report' : 'Submit Report'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {showImagePreview && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg w-full max-w-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Image Preview</h3>
              <button
                onClick={() => setShowImagePreview(false)}
                className="text-gray-500 hover:text-gray-700 hover:cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mt-4">
              <Image
                src={previewImageUrl}
                alt="Preview"
                width={800}
                height={800}
                className="rounded-lg object-cover"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 
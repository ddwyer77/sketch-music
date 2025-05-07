"use client";

import React from 'react';

export default function CreatorsPage() {
  // Placeholder creator data
  const creators = [
    { 
      id: 1, 
      name: 'Alex Johnson', 
      avatar: '/placeholder.jpg', 
      genre: 'Electronic', 
      followers: '120K',
      monthlyListeners: '350K',
      status: 'Verified',
      location: 'Los Angeles, CA'
    },
    { 
      id: 2, 
      name: 'Sarah Williams', 
      avatar: '/placeholder.jpg', 
      genre: 'Pop',
      followers: '85K',
      monthlyListeners: '210K',
      status: 'Rising',
      location: 'New York, NY'
    },
    { 
      id: 3, 
      name: 'The Groove Collective', 
      avatar: '/placeholder.jpg', 
      genre: 'Jazz / Funk',
      followers: '62K',
      monthlyListeners: '145K',
      status: 'Verified',
      location: 'Chicago, IL'
    },
    { 
      id: 4, 
      name: 'Midnight Shadows', 
      avatar: '/placeholder.jpg', 
      genre: 'Alternative Rock',
      followers: '78K',
      monthlyListeners: '230K',
      status: 'New',
      location: 'Austin, TX'
    },
    { 
      id: 5, 
      name: 'DJ Maximus', 
      avatar: '/placeholder.jpg', 
      genre: 'House / EDM',
      followers: '210K',
      monthlyListeners: '500K',
      status: 'Featured',
      location: 'Miami, FL'
    }
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
        <h1 className="text-3xl font-bold text-gray-800">Creators</h1>
        <div className="flex space-x-3 w-full md:w-auto flex-wrap gap-3">
          <button className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-lg w-full md:w-auto">
            Filter
          </button>
          <button className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg w-full md:w-auto">
            Add Creator
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {creators.map((creator) => (
          <div key={creator.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="h-20 bg-gradient-to-r from-purple-500 to-indigo-600"></div>
            <div className="p-6 -mt-10">
              <div className="flex justify-between">
                <div className="w-16 h-16 rounded-full bg-gray-300 border-4 border-white shadow-sm">
                  {/* Placeholder for avatar */}
                </div>
                <span className={`px-3 py-1 rounded-full text-xs ${
                  creator.status === 'Verified' ? 'bg-blue-100 text-blue-800' :
                  creator.status === 'Rising' ? 'bg-green-100 text-green-800' :
                  creator.status === 'Featured' ? 'bg-purple-100 text-purple-800' :
                  'bg-yellow-100 text-yellow-800'
                } self-start mt-2`}>
                  {creator.status}
                </span>
              </div>
              
              <h3 className="text-xl font-bold mt-4 text-gray-900">{creator.name}</h3>
              <p className="text-gray-900 text-sm">{creator.genre} • {creator.location}</p>
              
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-900">Followers</p>
                  <p className="text-lg font-semibold text-gray-900">{creator.followers}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-900">Monthly Listeners</p>
                  <p className="text-lg font-semibold text-gray-900">{creator.monthlyListeners}</p>
                </div>
              </div>
              
              <div className="mt-6 flex space-x-3">
                <button className="flex-1 bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg text-sm">
                  View Profile
                </button>
                <button className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-lg text-sm">
                  Contact
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pending Applications */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden mt-8">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Pending Applications</h2>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-center py-8">
            <p className="text-gray-900">No pending applications at this time</p>
          </div>
        </div>
      </div>
    </div>
  );
} 
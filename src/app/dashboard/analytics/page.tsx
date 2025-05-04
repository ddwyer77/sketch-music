"use client";

import React from 'react';

export default function AnalyticsPage() {
  // Placeholder analytics data
  const stats = [
    { id: 1, label: 'Total Plays', value: '3.8M', change: '+12%', changeType: 'increase' },
    { id: 2, label: 'Unique Listeners', value: '1.2M', change: '+8%', changeType: 'increase' },
    { id: 3, label: 'Average Listen Time', value: '3:45', change: '+5%', changeType: 'increase' },
    { id: 4, label: 'Completion Rate', value: '68%', change: '-2%', changeType: 'decrease' },
  ];

  const topTracks = [
    { rank: 1, title: 'Summer Groove', artist: 'DJ Maximus', plays: '220K', change: '+2', trend: 'up' },
    { rank: 2, title: 'Midnight Blue', artist: 'Luna Ray', plays: '185K', change: '+3', trend: 'up' },
    { rank: 3, title: 'Electric Dreams', artist: 'Synthwave Collective', plays: '150K', change: '-1', trend: 'down' },
    { rank: 4, title: 'Mountain High', artist: 'Acoustic Travelers', plays: '135K', change: '0', trend: 'neutral' },
    { rank: 5, title: 'Urban Jungle', artist: 'Metro Beats', plays: '120K', change: '+12', trend: 'up' },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Analytics Dashboard</h1>
      
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <div key={stat.id} className="bg-white rounded-xl shadow-sm p-6">
            <p className="text-sm font-medium text-gray-500">{stat.label}</p>
            <p className="text-3xl font-bold mt-2">{stat.value}</p>
            <div className={`flex items-center mt-2 ${
              stat.changeType === 'increase' ? 'text-green-600' : 'text-red-600'
            }`}>
              <span className="text-sm font-medium">{stat.change}</span>
              <svg 
                className={`w-4 h-4 ml-1 ${stat.changeType === 'increase' ? 'text-green-600' : 'text-red-600'}`} 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d={stat.changeType === 'increase' ? 'M5 10l7-7m0 0l7 7m-7-7v18' : 'M19 14l-7 7m0 0l-7-7m7 7V3'} 
                />
              </svg>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-medium mb-4">Listening Trends</h2>
          <div className="h-64 flex items-center justify-center bg-gray-100 rounded-lg">
            <p className="text-gray-500">Line chart will be displayed here</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-medium mb-4">Listener Demographics</h2>
          <div className="h-64 flex items-center justify-center bg-gray-100 rounded-lg">
            <p className="text-gray-500">Pie chart will be displayed here</p>
          </div>
        </div>
      </div>

      {/* Top Tracks */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium">Top Tracks This Week</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rank
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Track
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Artist
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Plays
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Change
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {topTracks.map((track) => (
                <tr key={track.rank} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {track.rank}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {track.title}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {track.artist}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {track.plays}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`flex items-center ${
                      track.trend === 'up' ? 'text-green-600' : 
                      track.trend === 'down' ? 'text-red-600' : 'text-gray-500'
                    }`}>
                      {track.change}
                      {track.trend !== 'neutral' && (
                        <svg 
                          className="w-4 h-4 ml-1" 
                          fill="none" 
                          viewBox="0 0 24 24" 
                          stroke="currentColor"
                        >
                          <path 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            strokeWidth={2} 
                            d={track.trend === 'up' ? 'M5 10l7-7m0 0l7 7m-7-7v18' : 'M19 14l-7 7m0 0l-7-7m7 7V3'} 
                          />
                        </svg>
                      )}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
} 
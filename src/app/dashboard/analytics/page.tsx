"use client";

import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '../../../hooks';
import { where } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { Campaign } from '@/types/campaign';
import { extractTikTokMetrics } from '../../../lib/webScraper';
import Image from 'next/image';

export default function AnalyticsPage() {
  const { user } = useAuth();
  const { documents: campaigns, loading, error } = useQuery<Campaign>(
    'campaigns',
    user ? [where('owner_id', '==', user.uid)] : []
  );
  const [selectedTimeRange, setSelectedTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [isLoading, setIsLoading] = useState(true);
  
  // Filter campaigns based on selected time range
  const filteredCampaigns = useMemo(() => {
    if (!campaigns.length) return [];
    
    const now = new Date();
    const timeRanges = {
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      '90d': 90 * 24 * 60 * 60 * 1000,
    };
    
    return campaigns.filter(campaign => {
      const campaignDate = new Date(campaign.lastUpdated);
      const timeDiff = now.getTime() - campaignDate.getTime();
      return timeDiff <= timeRanges[selectedTimeRange];
    });
  }, [campaigns, selectedTimeRange]);
  
  // Total aggregate metrics across all campaigns
  const aggregateMetrics = useMemo(() => {
    if (!filteredCampaigns.length) return null;
    
    return filteredCampaigns.reduce((acc, campaign) => {
      return {
        totalViews: acc.totalViews + (campaign.views || 0),
        totalLikes: acc.totalLikes + (campaign.likes || 0),
        totalShares: acc.totalShares + (campaign.shares || 0),
        totalComments: acc.totalComments + (campaign.comments || 0),
        totalBudget: acc.totalBudget + (campaign.budget || 0),
        totalBudgetUsed: acc.totalBudgetUsed + (campaign.budgetUsed || 0),
        totalVideos: acc.totalVideos + (campaign.videos?.length || 0),
      };
    }, {
      totalViews: 0,
      totalLikes: 0,
      totalShares: 0,
      totalComments: 0,
      totalBudget: 0,
      totalBudgetUsed: 0,
      totalVideos: 0,
    });
  }, [filteredCampaigns]);
  
  // Calculate engagement rate: (likes + comments + shares) / views * 100
  const engagementRate = useMemo(() => {
    if (!aggregateMetrics || aggregateMetrics.totalViews === 0) return 0;
    
    const engagements = aggregateMetrics.totalLikes + aggregateMetrics.totalComments + aggregateMetrics.totalShares;
    return (engagements / aggregateMetrics.totalViews) * 100;
  }, [aggregateMetrics]);
  
  // Sort campaigns by views
  const topCampaigns = useMemo(() => {
    if (!filteredCampaigns.length) return [];
    
    return [...filteredCampaigns]
      .sort((a, b) => (b.views || 0) - (a.views || 0))
      .slice(0, 5);
  }, [filteredCampaigns]);
  
  useEffect(() => {
    // Simulate loading for better UX
    if (filteredCampaigns.length > 0) {
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [filteredCampaigns]);
  
  // Format number with commas
  const formatNumber = (num: number): string => {
    return num.toLocaleString('en-US');
  };
  
  // Format large numbers to K, M, B format
  const formatCompactNumber = (num: number): string => {
    if (num >= 1000000000) {
      return (num / 1000000000).toFixed(1) + 'B';
    }
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  // Format date
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };
  
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

  if (loading || isLoading) {
    return (
      <div className="max-w-6xl mx-auto py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm p-6 h-32">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm p-6">
                <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                <div className="h-64 bg-gray-100 rounded-lg"></div>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="grid grid-cols-5 gap-4">
                  {[...Array(5)].map((_, j) => (
                    <div key={j} className="h-6 bg-gray-200 rounded"></div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="max-w-6xl mx-auto py-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <p className="font-medium">Error loading analytics data: {error.message}</p>
        </div>
      </div>
    );
  }
  
  if (!filteredCampaigns.length) {
    return (
      <div className="max-w-6xl mx-auto py-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Analytics Dashboard</h1>
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h2 className="text-xl font-medium mb-2 text-gray-900">No Campaign Data Available</h2>
          <p className="text-gray-900 mb-6">Create your first campaign to start seeing analytics</p>
          <a href="/dashboard" className="inline-block bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-md font-medium transition-colors">
            Go to Campaigns
          </a>
        </div>
      </div>
    );
  }
  
  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8 flex-wrap">
        <h1 className="text-3xl font-bold text-gray-800">TikTok Analytics Dashboard</h1>
        
        {/* Time range selector */}
        <div className="flex space-x-2 p-1 bg-gray-100 rounded-lg mt-4 sm:mt-0">
          <button 
            className={`hover:cursor-pointer hover:bg-white hover:text-primary px-4 py-2 text-sm font-medium rounded-md transition-colors ${selectedTimeRange === '7d' ? 'bg-white shadow-sm text-primary' : 'text-gray-900 hover:text-gray-700'}`}
            onClick={() => setSelectedTimeRange('7d')}
          >
            7 Days
          </button>
          <button 
            className={`hover:cursor-pointer hover:bg-white hover:text-primary px-4 py-2 text-sm font-medium rounded-md transition-colors ${selectedTimeRange === '30d' ? 'bg-white shadow-sm text-primary' : 'text-gray-900 hover:text-gray-700'}`}
            onClick={() => setSelectedTimeRange('30d')}
          >
            30 Days
          </button>
          <button 
            className={`hover:cursor-pointer hover:bg-white hover:text-primary px-4 py-2 text-sm font-medium rounded-md transition-colors ${selectedTimeRange === '90d' ? 'bg-white shadow-sm text-primary' : 'text-gray-900 hover:text-gray-700'}`}
            onClick={() => setSelectedTimeRange('90d')}
          >
            90 Days
          </button>
        </div>
      </div>
      
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Views */}
        <div className="bg-white rounded-xl shadow-sm p-6 border-t-4 border-blue-500">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-900">Total Views</p>
              <p className="text-3xl font-bold mt-2 text-gray-900">{formatCompactNumber(aggregateMetrics?.totalViews || 0)}</p>
            </div>
            <div className="p-2 bg-blue-50 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
          </div>
          <div className="mt-4">
            <div className="h-1 w-full bg-gray-200 rounded-full overflow-hidden">
              <div className="bg-blue-500 h-full rounded-full" style={{ width: `${Math.min(100, (aggregateMetrics?.totalViews || 0) / 10000)}%` }}></div>
            </div>
            <p className="text-xs text-gray-900 mt-1">Goal: 1,000,000 views</p>
          </div>
        </div>

        {/* Engagement Rate */}
        <div className="bg-white rounded-xl shadow-sm p-6 border-t-4 border-green-500">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-900">Engagement Rate</p>
              <p className="text-3xl font-bold mt-2 text-gray-900">{engagementRate.toFixed(1)}%</p>
            </div>
            <div className="p-2 bg-green-50 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905a3.61 3.61 0 01-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
              </svg>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center">
              <span className="text-xs text-gray-900">Low</span>
              <div className="flex-1 mx-2 h-1 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full ${
                    engagementRate < 3 ? 'bg-red-500' : 
                    engagementRate < 5 ? 'bg-yellow-500' : 'bg-green-500'
                  }`} 
                  style={{ width: `${Math.min(100, engagementRate * 5)}%` }}
                ></div>
              </div>
              <span className="text-xs text-gray-900">High</span>
            </div>
            <p className="text-xs text-gray-900 mt-1">
              {engagementRate < 3 ? 'Below average' : 
               engagementRate < 5 ? 'Average' : 'Above average'}
            </p>
          </div>
        </div>

        {/* Budget Usage */}
        <div className="bg-white rounded-xl shadow-sm p-6 border-t-4 border-purple-500">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-900">Budget Usage</p>
              <p className="text-3xl font-bold mt-2 text-gray-900">${aggregateMetrics?.totalBudgetUsed.toFixed(2)}</p>
            </div>
            <div className="p-2 bg-purple-50 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-900 mb-1">
              <span>Used: ${aggregateMetrics?.totalBudgetUsed.toFixed(2)}</span>
              <span>Total: ${aggregateMetrics?.totalBudget.toFixed(2)}</span>
            </div>
            <div className="h-1 w-full bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full ${
                  (aggregateMetrics?.totalBudgetUsed || 0) / (aggregateMetrics?.totalBudget || 1) > 0.9 ? 'bg-red-500' : 
                  (aggregateMetrics?.totalBudgetUsed || 0) / (aggregateMetrics?.totalBudget || 1) > 0.7 ? 'bg-yellow-500' : 'bg-purple-500'
                }`} 
                style={{ width: `${Math.min(100, ((aggregateMetrics?.totalBudgetUsed || 0) / (aggregateMetrics?.totalBudget || 1) * 100) || 0)}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Videos Count */}
        <div className="bg-white rounded-xl shadow-sm p-6 border-t-4 border-amber-500">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-900">Total Videos</p>
              <p className="text-3xl font-bold mt-2 text-gray-900">{aggregateMetrics?.totalVideos || 0}</p>
            </div>
            <div className="p-2 bg-amber-50 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm text-gray-900">Average views per video</p>
            <p className="font-medium">
              {aggregateMetrics?.totalVideos 
                ? formatCompactNumber(aggregateMetrics.totalViews / aggregateMetrics.totalVideos) 
                : 0}
            </p>
          </div>
        </div>
      </div>

      {/* Engagement Metrics and Campaign Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Engagement Metrics */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-medium mb-6 text-gray-900">Engagement Metrics</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 rounded-lg mr-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Likes</p>
                  <p className="text-xl font-bold text-gray-900">{formatCompactNumber(aggregateMetrics?.totalLikes || 0)}</p>
                </div>
              </div>
              <div className="mt-2">
                <div className="h-1 w-full bg-gray-200 rounded-full">
                  <div className="bg-red-500 h-full rounded-full" style={{ 
                    width: aggregateMetrics?.totalViews 
                      ? `${Math.min(100, (aggregateMetrics?.totalLikes / aggregateMetrics?.totalViews) * 100 * 3)}%` 
                      : '0%' 
                  }}></div>
                </div>
                <p className="text-xs text-gray-900 mt-1">
                  {aggregateMetrics?.totalViews 
                    ? ((aggregateMetrics?.totalLikes / aggregateMetrics?.totalViews) * 100).toFixed(2) 
                    : '0'}% like rate
                </p>
              </div>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg mr-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 13V5a2 2 0 00-2-2H4a2 2 0 00-2 2v8a2 2 0 002 2h3l3 3 3-3h3a2 2 0 002-2zM5 7a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1zm1 3a1 1 0 100 2h3a1 1 0 100-2H6z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Comments</p>
                  <p className="text-xl font-bold text-gray-900">{formatCompactNumber(aggregateMetrics?.totalComments || 0)}</p>
                </div>
              </div>
              <div className="mt-2">
                <div className="h-1 w-full bg-gray-200 rounded-full">
                  <div className="bg-blue-500 h-full rounded-full" style={{ 
                    width: aggregateMetrics?.totalViews 
                      ? `${Math.min(100, (aggregateMetrics?.totalComments / aggregateMetrics?.totalViews) * 100 * 5)}%` 
                      : '0%' 
                  }}></div>
                </div>
                <p className="text-xs text-gray-900 mt-1">
                  {aggregateMetrics?.totalViews 
                    ? ((aggregateMetrics?.totalComments / aggregateMetrics?.totalViews) * 100).toFixed(2) 
                    : '0'}% comment rate
                </p>
              </div>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg mr-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Shares</p>
                  <p className="text-xl font-bold text-gray-900">{formatCompactNumber(aggregateMetrics?.totalShares || 0)}</p>
                </div>
              </div>
              <div className="mt-2">
                <div className="h-1 w-full bg-gray-200 rounded-full">
                  <div className="bg-green-500 h-full rounded-full" style={{ 
                    width: aggregateMetrics?.totalViews 
                      ? `${Math.min(100, (aggregateMetrics?.totalShares / aggregateMetrics?.totalViews) * 100 * 10)}%` 
                      : '0%' 
                  }}></div>
                </div>
                <p className="text-xs text-gray-900 mt-1">
                  {aggregateMetrics?.totalViews 
                    ? ((aggregateMetrics?.totalShares / aggregateMetrics?.totalViews) * 100).toFixed(2) 
                    : '0'}% share rate
                </p>
              </div>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg mr-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-500" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Content</p>
                  <p className="text-xl font-bold text-gray-900">{aggregateMetrics?.totalVideos || 0} videos</p>
                </div>
              </div>
              <div className="mt-2">
                <div className="h-1 w-full bg-gray-200 rounded-full">
                  <div className="bg-purple-500 h-full rounded-full" style={{ width: `${Math.min(100, (aggregateMetrics?.totalVideos || 0) * 10)}%` }}></div>
                </div>
                <p className="text-xs text-gray-900 mt-1">
                  Goal: {Math.max(10, (aggregateMetrics?.totalVideos || 0) + 5)} videos
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* ROI Chart */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-medium mb-6 text-gray-900">Campaign ROI</h2>
          <div className="h-64 flex items-center justify-center bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg mb-4">
            <div className="w-full h-full flex flex-col items-center justify-center p-4">
              <div className="text-center mb-4">
                <p className="text-sm font-medium text-gray-900">Cost per 1000 views</p>
                <p className="text-3xl font-bold text-gray-800">
                  ${aggregateMetrics?.totalViews
                    ? ((aggregateMetrics?.totalBudgetUsed / aggregateMetrics?.totalViews) * 1000).toFixed(2)
                    : '0.00'}
                </p>
              </div>
              
              <div className="w-full flex space-x-1">
                {filteredCampaigns.map((campaign, idx) => {
                  const costPer1k = campaign.views
                    ? ((campaign.budgetUsed / campaign.views) * 1000)
                    : 0;
                  
                  const barWidth = `${Math.max(5, 100 / filteredCampaigns.length)}%`;
                  
                  return (
                    <div key={idx} className="flex flex-col items-center" style={{ width: barWidth }}>
                      <div className="w-full bg-gray-200 rounded-full h-32 overflow-hidden relative">
                        <div 
                          className="absolute bottom-0 w-full bg-gradient-to-t from-blue-500 to-purple-500 rounded-full"
                          style={{ height: `${Math.min(100, Math.max(10, 100 - (costPer1k * 10)))}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-900 mt-1 truncate w-full text-center" title={campaign.name}>
                        {campaign.name.length > 10 ? `${campaign.name.substring(0, 10)}...` : campaign.name}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <p className="text-sm text-gray-900 text-center">
            Lower cost per 1000 views indicates better ROI
          </p>
        </div>
      </div>
      
      {/* Top Campaigns */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Top Performing Campaigns</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                  Campaign
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                  Views
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                  Engagement
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                  Budget Used
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                  ROI
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {topCampaigns.map((campaign) => {
                // Calculate campaign engagement rate
                const totalEngagements = (campaign.likes || 0) + (campaign.comments || 0) + (campaign.shares || 0);
                const campaignEngagementRate = campaign.views ? (totalEngagements / campaign.views) * 100 : 0;
                
                // Calculate ROI as views per dollar spent
                const roi = campaign.budgetUsed ? campaign.views / campaign.budgetUsed : 0;
                
                return (
                  <tr key={campaign.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0 mr-3">
                          {campaign.imageUrl ? (
                            <Image 
                              src={campaign.imageUrl} 
                              alt={campaign.name}
                              width={40}
                              height={40}
                              className="rounded-full object-cover"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-primary font-medium">{campaign.name.charAt(0)}</span>
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{campaign.name}</div>
                          <div className="text-xs text-gray-900">{campaign.videos.length} videos</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatNumber(campaign.views || 0)}</div>
                      <div className="text-xs text-gray-900">
                        Last updated: {formatDate(campaign.lastUpdated)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{campaignEngagementRate.toFixed(2)}%</div>
                      <div className="flex items-center text-xs text-gray-900">
                        <span className="mr-1">{formatNumber(campaign.likes || 0)} likes</span>
                        <span className="mx-1">•</span>
                        <span>{formatNumber(campaign.comments || 0)} comments</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">${campaign.budgetUsed.toFixed(2)}</div>
                      <div className="text-xs text-gray-900">
                        of ${campaign.budget.toFixed(2)} ({Math.round((campaign.budgetUsed / campaign.budget) * 100)}%)
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatNumber(Math.round(roi))} views/$
                      </div>
                      <div className={`text-xs ${roi > 1000 ? 'text-green-500' : roi > 500 ? 'text-yellow-500' : 'text-red-500'}`}>
                        {roi > 1000 ? 'Excellent' : roi > 500 ? 'Good' : 'Poor'}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
} 
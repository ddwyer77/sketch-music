"use client";

import React, { useState } from 'react';

export default function SettingsPage() {
  // Active tab state
  const [activeTab, setActiveTab] = useState('account');
  
  // Placeholder user data
  const userData = {
    name: 'John Smith',
    email: 'john.smith@example.com',
    username: 'johnsmith',
    phone: '+1 (555) 123-4567',
    company: 'Music Productions Inc.',
    role: 'Administrator',
    timezone: 'America/New_York',
    notifications: {
      email: true,
      push: true,
      sms: false,
      marketing: true
    },
    security: {
      twoFactor: false,
      lastPasswordChange: '2023-03-15',
      sessions: 2
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
        <h1 className="text-3xl font-bold text-gray-800">Settings</h1>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {/* Tabs Navigation */}
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {['account', 'notifications', 'security', 'billing', 'api', 'advanced'].map((tab) => (
              <button
                key={tab}
                className={`py-4 px-6 text-sm font-medium border-b-2 focus:outline-none ${
                  activeTab === tab
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-900 hover:text-gray-700 hover:border-gray-300'
                }`}
                onClick={() => setActiveTab(tab)}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>
        
        {/* Tab Content */}
        <div className="p-6">
          {/* Account Settings */}
          {activeTab === 'account' && (
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-6">Account Information</h2>
              
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">Full Name</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      defaultValue={userData.name}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">Email Address</label>
                    <input
                      type="email"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      defaultValue={userData.email}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">Username</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      defaultValue={userData.username}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">Phone Number</label>
                    <input
                      type="tel"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      defaultValue={userData.phone}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">Company</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      defaultValue={userData.company}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">Timezone</label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      defaultValue={userData.timezone}
                    >
                      <option value="America/New_York">Eastern Time (US & Canada)</option>
                      <option value="America/Chicago">Central Time (US & Canada)</option>
                      <option value="America/Denver">Mountain Time (US & Canada)</option>
                      <option value="America/Los_Angeles">Pacific Time (US & Canada)</option>
                      <option value="Europe/London">London</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">Bio</label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    rows={4}
                    placeholder="Tell us about yourself..."
                  ></textarea>
                </div>
                
                <div className="flex justify-end space-x-3">
                  <button className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg">
                    Cancel
                  </button>
                  <button className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg">
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Notifications Settings */}
          {activeTab === 'notifications' && (
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-6">Notification Preferences</h2>
              
              <div className="space-y-6">
                <div className="border-b border-gray-200 pb-5">
                  <h3 className="text-md font-medium text-gray-900 mb-4">Email Notifications</h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">Campaign Updates</p>
                        <p className="text-sm text-gray-900">Get notified when there&apos;s activity in your campaigns</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer" 
                          defaultChecked={userData.notifications.email}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">Analytics Reports</p>
                        <p className="text-sm text-gray-900">Receive weekly report summaries</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer" 
                          defaultChecked={userData.notifications.email}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>
                  </div>
                </div>
                
                <div className="border-b border-gray-200 pb-5">
                  <h3 className="text-md font-medium text-gray-900 mb-4">Push Notifications</h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">Real-time Alerts</p>
                        <p className="text-sm text-gray-900">Get notified immediately about important events</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer" 
                          defaultChecked={userData.notifications.push}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-md font-medium text-gray-900 mb-4">Marketing Communications</h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">New Features & Updates</p>
                        <p className="text-sm text-gray-900">Learn about new features and product updates</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer" 
                          defaultChecked={userData.notifications.marketing}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3">
                  <button className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg">
                    Cancel
                  </button>
                  <button className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg">
                    Save Preferences
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Security Settings */}
          {activeTab === 'security' && (
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-6">Security Settings</h2>
              
              <div className="space-y-8">
                <div>
                  <h3 className="text-md font-medium text-gray-900 mb-4">Change Password</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                      <input
                        type="password"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="••••••••"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                      <input
                        type="password"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="••••••••"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                      <input
                        type="password"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="••••••••"
                      />
                    </div>
                    <div>
                      <button className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg">
                        Update Password
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-md font-medium text-gray-900 mb-4">Two-Factor Authentication</h3>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        Add an extra layer of security to your account by enabling two-factor authentication.
                      </p>
                      <p className="text-sm text-gray-900 mt-1">
                        Current status: <span className={userData.security.twoFactor ? "text-green-600" : "text-red-600"}>
                          {userData.security.twoFactor ? "Enabled" : "Disabled"}
                        </span>
                      </p>
                    </div>
                    <button className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg">
                      {userData.security.twoFactor ? "Disable" : "Enable"}
                    </button>
                  </div>
                </div>
                
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-md font-medium text-gray-900 mb-4">Active Sessions</h3>
                  <p className="text-sm text-gray-700 mb-3">
                    You currently have {userData.security.sessions} active sessions on different devices.
                  </p>
                  <button className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg">
                    Sign Out All Other Sessions
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Other tabs would show placeholders */}
          {(activeTab === 'billing' || activeTab === 'api' || activeTab === 'advanced') && (
            <div className="py-10 flex flex-col items-center justify-center">
              <p className="text-gray-900 mb-4">This section is coming soon!</p>
              <button 
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg"
                onClick={() => setActiveTab('account')}
              >
                Go back to Account Settings
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 
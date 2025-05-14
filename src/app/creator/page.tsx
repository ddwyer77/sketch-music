"use client";

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

type Tab = 'campaigns' | 'invitations' | 'account';

export default function CreatorPage() {
  const [activeTab, setActiveTab] = useState<Tab>('campaigns');
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const checkUserType = async () => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            if (userData.user_type !== 'creator') {
              router.push('/dashboard');
            }
          }
        } catch (error) {
          console.error('Error checking user type:', error);
        }
      }
    };

    checkUserType();
  }, [user, router]);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'campaigns', label: 'Campaigns' },
    { id: 'invitations', label: 'Invitations' },
    { id: 'account', label: 'Account' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-3xl font-bold text-gray-900">Creator Dashboard</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                  ${
                    activeTab === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="bg-white shadow rounded-lg p-6">
          {activeTab === 'campaigns' && (
            <div>
              <h2 className="text-xl font-semibold mb-4 text-gray-800">Your Campaigns</h2>
              <p className="text-gray-500">No campaigns yet. You&apos;ll see your active campaigns here.</p>
            </div>
          )}

          {activeTab === 'invitations' && (
            <div>
              <h2 className="text-xl font-semibold mb-4 text-gray-800">Campaign Invitations</h2>
              <p className="text-gray-500">No pending invitations. You&apos;ll see your campaign invitations here.</p>
            </div>
          )}

          {activeTab === 'account' && (
            <div>
              <h2 className="text-xl font-semibold mb-4 text-gray-800">Account Settings</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <p className="mt-1 text-sm text-gray-900">{user?.email}</p>
                </div>
                {/* Add more account settings as needed */}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
} 
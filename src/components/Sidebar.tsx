"use client";

import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { userRole } from '@/types/user';
import React from 'react';

// Simple icon components
const DashboardIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
  </svg>
);

const CampaignsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const AnalyticsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const CreatorsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const PaymentsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

const SettingsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const HelpIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const LogoutIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
);

const UsersIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="7" cy="8" r="4" />
    <circle cx="17" cy="8" r="4" />
    <path d="M2 20v-2a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v2" />
    <path d="M17 14a5 5 0 0 1 5 5v1" />
  </svg>
);

const CreatorHubIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
  </svg>
);

const DiscordIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

type NavItem = {
  path: string;
  label: string;
  icon: () => React.ReactElement;
  disabled?: boolean;
  tooltip?: string;
};

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const [userRoles, setUserRoles] = useState<userRole[]>([]);
  
  useEffect(() => {
    const checkUserRoles = async () => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUserRoles(userData.roles || []);
          }
        } catch (error) {
          console.error('Error checking user roles:', error);
        }
      }
    };

    checkUserRoles();
  }, [user]);
  
  const navItems: NavItem[] = [
    { path: '/dashboard', label: 'Dashboard', icon: DashboardIcon },
    { path: '/dashboard/campaigns', label: 'Campaigns', icon: CampaignsIcon },
    { path: '/dashboard/analytics', label: 'Analytics', icon: AnalyticsIcon },
    { path: '/dashboard/payments', label: 'Payments', icon: PaymentsIcon },
    { path: '/dashboard/discord', label: 'Discord', icon: DiscordIcon },
    { path: '/dashboard/settings', label: 'Settings', icon: SettingsIcon },
    { path: '/dashboard/help', label: 'Help', icon: HelpIcon },
    { path: '/dashboard/users', label: 'Users', icon: UsersIcon }
  ];

  // Add Creator Hub tab - disabled if user doesn't have creator role
  navItems.push({
    path: '/creator',
    label: 'Creator Hub',
    icon: CreatorHubIcon,
    disabled: !userRoles.includes('creator'),
    tooltip: !userRoles.includes('creator') 
      ? "You need creator permissions to access this feature. Visit the 'Users' panel or contact your admin to request creator access."
      : undefined
  });

  const handleLogout = () => {
    // TODO: Implement actual logout functionality
    router.push('/');
  };

  return (
    <aside className="w-20 lg:w-64 h-screen bg-white border-r border-gray-200 flex flex-col">
      
      {/* Nav Items */}
      <nav className="flex-1 pt-4 md:pt-8 pb-4 px-2 overflow-y-auto">
        <ul className="space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            const isDisabled = item.disabled;
            
            return (
              <li key={item.path} className="relative group">
                {isDisabled ? (
                  <div className="flex items-center p-3 rounded-lg text-gray-400 cursor-not-allowed">
                    <item.icon />
                    <span className="ml-3 hidden lg:block">{item.label}</span>
                  </div>
                ) : (
                  <Link href={item.path} className={`flex items-center p-3 rounded-lg transition-colors ${
                    isActive 
                      ? 'bg-primary text-white' 
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}>
                    <item.icon />
                    <span className="ml-3 hidden lg:block">{item.label}</span>
                  </Link>
                )}
                
                {/* Tooltip */}
                {isDisabled && item.tooltip && (
                  <div className="fixed z-50 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="bg-gray-900 text-white text-sm rounded-lg py-2 px-3 whitespace-nowrap">
                      You don't have creator access. Contact your admin to request this role.
                      <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 transform rotate-45 w-2 h-2 bg-gray-900"></div>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
      
      {/* Account & Logout */}
      <div className="p-4 border-t border-gray-200">
        <button 
          onClick={handleLogout} 
          className="flex items-center p-3 w-full rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <LogoutIcon />
          <span className="ml-3 hidden lg:block">Logout</span>
        </button>
        <Link 
          href="/dashboard/account" 
          className="flex items-center p-3 mt-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <SettingsIcon />
          <span className="ml-3 hidden lg:block">Account</span>
        </Link>
      </div>
    </aside>
  );
} 

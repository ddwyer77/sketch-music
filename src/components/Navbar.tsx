"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRouter, usePathname } from 'next/navigation';
import { userRole } from '@/types/user';

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname() || '';
  const isDashboard = pathname.startsWith('/dashboard');
  const [userRoles, setUserRoles] = useState<userRole[]>([]);
  const [firstName, setFirstName] = useState<string>('');
  const { user, logout } = useAuth();
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkUserRoles = async () => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUserRoles(userData.roles || []);
            setFirstName(userData.first_name || userData.firstName || '');
          }
        } catch (error) {
          console.error('Error checking user roles:', error);
        }
      }
    };

    checkUserRoles();
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDashboardClick = () => {
    if (userRoles.includes('admin')) {
      router.push('/dashboard');
    } else {
      router.push('/creator');
    }
    setIsMenuOpen(false);
  };

  const handleSignOut = async () => {
    await logout();
    setIsMenuOpen(false);
  };

  return (
    <nav className="bg-white shadow px-6">
      <div className={isDashboard ? '' : 'max-w-7xl mx-auto'}>
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="text-2xl font-bold text-primary">
                Sketch Music
              </Link>
            </div>
          </div>

          <div className="flex items-center">
            {user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors hover:cursor-pointer"
                  title="User Menu"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <div className="text-left">
                    <div className="text-sm font-medium text-gray-900">{firstName}</div>
                    <div className="text-xs text-gray-500 capitalize">{userRoles.join(', ')}</div>
                  </div>
                </button>

                {isMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
                    <div className="py-1" role="menu" aria-orientation="vertical">
                      <button
                        onClick={handleDashboardClick}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        role="menuitem"
                      >
                        Dashboard
                      </button>
                      <button
                        onClick={handleSignOut}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        role="menuitem"
                      >
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link
                  href="/auth/signin"
                  className="text-gray-600 hover:text-gray-900 cursor-pointer"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/signup?type=creator"
                  className="ml-4 text-gray-600 hover:text-gray-900 cursor-pointer"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
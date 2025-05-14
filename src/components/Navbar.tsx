"use client";

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import logo from '../../public/images/logo.png';

export default function Navbar() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleSignIn = () => {
    router.push('/auth/signin');
  };

  const handleSignOut = async () => {
    try {
      await logout();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <nav className="bg-white shadow-sm px-6 py-4">
      <div className="flex justify-between items-center">
        <Link href="/" className="font-bold w-48"><Image src={logo} alt="Logo" /></Link>
        
        {user ? (
          <button 
            onClick={handleSignOut}
            className="bg-primary hover:bg-primary/90 px-5 text-white hover:cursor-pointer py-2 rounded-md transition-colors"
          >
            Sign Out
          </button>
        ) : (
          <button 
            onClick={handleSignIn}
            className="bg-primary hover:bg-primary/90 px-5 text-white py-2 rounded-md transition-colors cursor-pointer"
          >
            Sign In
          </button>
        )}
      </div>
    </nav>
  );
}
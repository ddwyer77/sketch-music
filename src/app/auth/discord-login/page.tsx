"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import SignIn from '@/components/Auth/SignIn';

export default function DiscordLogin() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isVerified, setIsVerified] = useState(false);
  const { user, logout } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams?.get('token');

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setError('No login token provided');
        setIsLoading(false);
        return;
      }

      try {
        // Check if token exists and is valid
        const tokenDoc = await getDoc(doc(db, 'discord_login_tokens', token));
        
        if (!tokenDoc.exists()) {
          setError('Invalid login token');
          setIsLoading(false);
          return;
        }

        const tokenData = tokenDoc.data();
        
        if (tokenData.expires_at < Date.now()) {
          setError('Login token has expired');
          setIsLoading(false);
          return;
        }

        // If user is already logged in, log them out first
        // if (user) {
        //   await logout();
        //   router.replace(`/auth/discord-login?token=${token}`);
        //   return;
        // }

        setIsVerified(true);
        setIsLoading(false);
      } catch (error) {
        console.error('Error verifying token:', error);
        setError('Failed to verify login token');
        setIsLoading(false);
      }
    };

    verifyToken();
  }, [token, user, logout, router]);

  useEffect(() => {
    const linkAccount = async () => {
      if (!user || !token || !isVerified) return;

      try {
        setIsLoading(true);
        
        // Make POST request to verify token
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/verify-token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Origin': window.location.origin
          },
          credentials: 'include',
          body: JSON.stringify({
            token,
            firebaseUserId: user.uid
          })
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || `Failed to verify token with server (${response.status})`);
        }

        // Redirect to success page
        router.push('/auth/discord-success');
      } catch (error) {
        console.error('Error linking account:', error);
        setError(error instanceof Error ? error.message : 'Failed to link Discord account');
        setIsLoading(false);
      }
    };

    linkAccount();
  }, [user, token, isVerified, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-800">Verifying login token...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">Error</div>
          <p className="text-gray-800">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="mt-4 px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors cursor-pointer"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  if (!isVerified) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-800">
            Sign in to link your Discord account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Please sign in to your Sketch Music account to complete the Discord linking process.
          </p>
        </div>
        <SignIn />
      </div>
    </div>
  );
} 
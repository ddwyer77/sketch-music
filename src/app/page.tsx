"use client";

import { useRouter } from 'next/navigation';
import { useSignUp } from '@/contexts/SignUpContext';
import { useAuth } from '@/contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';
import ContactForm from '../components/ContactForm';

export default function Home() {
  const router = useRouter();
  const { setSelectedUserType } = useSignUp();
  const { user } = useAuth();

  const handleStartManaging = async () => {
    if (user) {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.user_type === 'manager' || userData.user_type === 'admin') {
            router.push('/dashboard');
          } else {
            router.push('/creator');
          }
        }
      } catch (error) {
        console.error('Error checking user type:', error);
      }
    } else {
      setSelectedUserType('manager');
      router.push('/auth/signup');
    }
  };

  const handleEarnAsCreator = async () => {
    if (user) {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.user_type === 'creator') {
            router.push('/creator');
          } else {
            router.push('/dashboard');
          }
        }
      } catch (error) {
        console.error('Error checking user type:', error);
      }
    } else {
      setSelectedUserType('creator');
      router.push('/auth/signup');
    }
  };

  const stats = [
    { title: '$200K', description: 'Paid to creators' },
    { title: '9,000', description: 'Active clippers' },
    { title: '5B', description: 'Organic views' },
    { title: '450', description: 'Campaigns launched' },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="flex-1 py-16 px-6">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          {/* Left Column - Text and CTA */}
          <div className="space-y-6">
            <h1 className="text-5xl font-bold leading-tight text-gray-900">
              The All-in-One Tool for <span className="text-primary">Virality</span>
            </h1>
            <p className="text-xl text-gray-600">
              Sketch Music turns passionate creators into a viral engine for brands—paying only for real views, real engagement, and real impact.
            </p>
            <div className="flex flex-wrap gap-4 pt-2">
              {user ? (
                <button
                  onClick={async () => {
                    try {
                      const userDoc = await getDoc(doc(db, 'users', user.uid));
                      if (userDoc.exists()) {
                        const userData = userDoc.data();
                        router.push(userData.user_type === 'creator' ? '/creator' : '/dashboard');
                      }
                    } catch (error) {
                      console.error('Error checking user type:', error);
                    }
                  }}
                  className="bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-md font-medium transition-colors cursor-pointer"
                >
                  My Dashboard
                </button>
              ) : (
                <>
                  <button
                    onClick={handleStartManaging}
                    className="bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-md font-medium transition-colors cursor-pointer"
                  >
                    Start Managing
                  </button>
                  <button
                    onClick={handleEarnAsCreator}
                    className="border border-primary text-primary hover:bg-primary/5 px-8 py-3 rounded-md font-medium transition-colors cursor-pointer"
                  >
                    🤑 Earn as Creator
                  </button>
                </>
              )}
            </div>
          </div>
          
          {/* Right Column - Videos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl overflow-hidden bg-white aspect-[9/16] relative shadow-xl">
              <iframe 
                className="absolute inset-0 w-full h-full"
                src="https://www.youtube.com/embed/_P8e1umu3xc?autoplay=1&mute=1&loop=1&playlist=_P8e1umu3xc"
                title="YouTube video player"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
            <div className="rounded-2xl overflow-hidden bg-white aspect-[9/16] relative shadow-xl mt-12">
              <iframe 
                className="absolute inset-0 w-full h-full"
                src="https://youtube.com/embed/bR6-I3AGCsk?autoplay=1&mute=1&loop=1&playlist=bR6-I3AGCsk"
                title="YouTube video player"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
              <div className="absolute inset-0 bg-gradient-to-t from-white/30 to-transparent" />
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {stats.map((stat, index) => (
              <div 
                key={index} 
                className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/5 to-primary/10 p-8 hover:shadow-lg transition-all duration-300"
              >
                <div className="flex items-start gap-6">
                  <div className="flex-1">
                    <h2 className="text-6xl font-bold text-primary mb-3">{stat.title}</h2>
                    <p className="text-2xl text-gray-700 font-medium">{stat.description}</p>
                  </div>
                  <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-primary/10 rounded-full blur-2xl"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

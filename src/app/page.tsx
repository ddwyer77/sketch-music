"use client";

import { useRouter } from 'next/navigation';
import { useSignUp } from '@/contexts/SignUpContext';
import { useAuth } from '@/contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';
import ContactForm from '../components/ContactForm';
import { trackEvent } from '@/utils/analytics';

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
          if (userData.roles?.includes('admin')) {
            router.push('/dashboard');
          } else {
            router.push('/creator');
          }
        }
      } catch (error) {
        console.error('Error checking user roles:', error);
      }
    } else {
      router.push('/auth/signup?type=creator');
    }
  };

  const handleEarnAsCreator = async () => {
    trackEvent('earn_creator_click', {
      button_location: 'hero_section',
      button_type: 'primary_cta'
    });
    
    if (user) {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.roles?.includes('admin')) {
            router.push('/dashboard');
          } else {
            router.push('/creator');
          }
        }
      } catch (error) {
        console.error('Error checking user roles:', error);
      }
    } else {
      router.push('/auth/signup?type=creator');
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
      <section className="container grid lg:grid-cols-2 place-items-center py-20 md:py-32 gap-10 max-w-7xl mx-auto px-4">
        <div className="text-center lg:text-start space-y-6">
          <main className="text-5xl md:text-6xl font-bold">
            <h1 className="inline">
              <span className="inline bg-gradient-to-r from-[#F596D3] to-[#D247BF] text-transparent bg-clip-text">Sketch Music</span><span className='text-gray-800'> for&nbsp;</span>
            </h1>
            <h2 className="inline">
              <span className="inline bg-gradient-to-r from-[#61DAFB] via-[#1fc0f1] to-[#03a3d7] text-transparent bg-clip-text">Creators</span>
            </h2>
          </main>
          <p className="text-xl text-gray-700 md:w-10/12 mx-auto lg:mx-0">
            Turn your passion into profit with our all-in-one platform for viral content creation and brand collaboration.
          </p>
          <div className="w-full">
            {user ? (
              <button
                onClick={async () => {
                  try {
                    const userDoc = await getDoc(doc(db, 'users', user.uid));
                    if (userDoc.exists()) {
                      const userData = userDoc.data();
                      router.push(userData.roles?.includes('admin') ? '/dashboard' : '/creator');
                    }
                  } catch (error) {
                    console.error('Error checking user roles:', error);
                  }
                }}
                className="w-full bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-md font-medium transition-colors hover:cursor-pointer"
              >
                My Dashboard
              </button>
            ) : (
              <button
                onClick={handleEarnAsCreator}
                className="w-full bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-md font-medium transition-colors hover:cursor-pointer"
              >
                🤑 Earn as Creator
              </button>
            )}
          </div>
        </div>
        <div className="z-10">
          <div className="hidden lg:flex flex-row flex-wrap gap-8 relative w-[700px] h-[500px]">
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm absolute w-[340px] -top-[15px] drop-shadow-xl shadow-black/10 dark:shadow-white/10 bg-primary/5">
              <div className="space-y-1.5 p-6 flex flex-row items-center gap-4 pb-2">
                <span className="relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full">
                  <img className="aspect-square h-full w-full" alt="Sarah Mcghee" src="https://cdn.pixabay.com/photo/2023/02/03/16/54/dj-7765608_1280.png" />
                </span>
                <div className="flex flex-col">
                  <h3 className="font-semibold tracking-tight text-lg text-gray-800">Sarah Mcghee</h3>
                  <p className="text-sm text-gray-600">@big_vids29</p>
                </div>
              </div>
              <div className="p-6 pt-0 text-gray-800">This platform is amazing for creators!</div>
            </div>
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm absolute right-[20px] top-4 w-80 flex flex-col justify-center items-center drop-shadow-xl shadow-black/10 dark:shadow-white/10 bg-primary/5">
              <div className="flex-col space-y-1.5 p-6 mt-8 flex justify-center items-center pb-2">
                <img src="https://cdn.pixabay.com/photo/2023/11/12/15/33/man-8383298_1280.jpg" alt="user avatar" className="absolute grayscale-[0%] -top-12 rounded-full w-24 h-24 aspect-square object-cover" />
                <h3 className="text-2xl font-semibold leading-none tracking-tight text-center text-gray-800">Ron Johnson</h3>
                <p className="text-sm font-normal text-primary">Content Creator</p>
              </div>
              <div className="p-6 pt-0 text-center pb-2 text-gray-800">
                <p>I love how easy it is to connect with brands and earn from my content</p>
              </div>
            </div>
            <div className="absolute top-[150px] left-[50px] w-72 drop-shadow-xl shadow-black/10 dark:shadow-white/10 flex flex-col items-center justify-center bg-gradient-to-br from-green-100 via-white to-blue-100 border border-gray-200 rounded-2xl overflow-hidden">
              <div className="flex flex-col items-center p-6 w-full">
                <img src="https://cdn.pixabay.com/photo/2016/11/18/15/44/audience-1835431_1280.jpg" alt="New campaigns" className="rounded-full w-20 h-20 object-cover mb-4 shadow-md" />
                <h3 className="text-xl font-bold text-gray-800 text-center mb-2">New campaigns added daily</h3>
                <p className="text-gray-600 text-center">Discover fresh opportunities to earn and grow every day.</p>
              </div>
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

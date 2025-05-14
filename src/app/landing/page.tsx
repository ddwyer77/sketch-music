"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useCollection } from '@/hooks';
import Image from 'next/image';
import Link from 'next/link';
import { Campaign } from '@/types/campaign';

export default function LandingPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { documents: campaigns = [], loading } = useCollection<Campaign>('campaigns');

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Welcome to Sketch Music</h1>
          <p className="text-xl text-gray-600">Discover and engage with our latest campaigns</p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">No campaigns available at the moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {campaigns.map((campaign) => (
              <Link 
                key={campaign.id}
                href={campaign.campaign_url}
                className="group"
              >
                <div className="bg-white rounded-lg shadow-md overflow-hidden transition-transform duration-200 group-hover:scale-105">
                  <div className="relative h-48">
                    {campaign.imageUrl ? (
                      <Image
                        src={campaign.imageUrl}
                        alt={campaign.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-primary/10">
                        <div className="text-primary font-bold text-xl">
                          {campaign.name.charAt(0)}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 group-hover:text-primary transition-colors">
                      {campaign.name}
                    </h3>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 
"use client";

import React, { useState } from 'react';

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('getting-started');
  
  // Placeholder FAQ data
  const faqCategories = [
    { id: 'getting-started', label: 'Getting Started' },
    { id: 'account', label: 'Account Management' },
    { id: 'campaigns', label: 'Campaigns' },
    { id: 'creators', label: 'Working with Creators' },
    { id: 'analytics', label: 'Analytics & Reporting' },
    { id: 'payments', label: 'Payments & Billing' },
    { id: 'technical', label: 'Technical Issues' },
  ];
  
  // FAQ items
  const faqItems = [
    {
      id: 1,
      category: 'getting-started',
      question: 'How do I set up my first campaign?',
      answer: 'Setting up your first campaign is easy! Navigate to the Campaigns section and click on "Create Campaign". From there, follow the step-by-step guide to define your campaign goals, target audience, budget, and creative assets. Our platform will guide you through the entire process.'
    },
    {
      id: 2,
      category: 'getting-started',
      question: 'What types of music campaigns can I create?',
      answer: 'Our platform supports various campaign types including new release promotions, artist spotlights, playlist pitching, concert promotions, and music video launches. Each campaign type has specific features designed to maximize reach and engagement for that particular goal.'
    },
    {
      id: 3,
      category: 'account',
      question: 'How do I change my password?',
      answer: 'To change your password, go to Settings > Security. You\'ll need to enter your current password and then your new password twice to confirm. For security reasons, make sure to use a strong password that you don\'t use on other sites.'
    },
    {
      id: 4,
      category: 'campaigns',
      question: 'Can I pause my active campaign?',
      answer: 'Yes, you can pause an active campaign at any time. Simply go to the Campaigns section, select the campaign you want to pause, and click the "Pause Campaign" button. You can resume it later when you\'re ready.'
    },
    {
      id: 5,
      category: 'campaigns',
      question: 'How long should my campaign run?',
      answer: 'Campaign duration depends on your specific goals. For new releases, we typically recommend a 2-4 week campaign leading up to and following the release date. For ongoing artist promotion, longer campaigns with smaller daily budgets often perform well. Our analytics tools can help you determine the optimal duration based on your budget and objectives.'
    },
    {
      id: 6,
      category: 'creators',
      question: 'How do I invite creators to collaborate?',
      answer: 'To invite creators, navigate to the Creators section and click "Add Creator". You can either search for existing creators on our platform or send an invitation via email to new creators. Once they accept, you can start collaborating on campaigns together.'
    },
    {
      id: 7,
      category: 'analytics',
      question: 'What metrics should I focus on?',
      answer: 'The most important metrics depend on your campaign goals. For awareness, focus on reach and impressions. For engagement, look at click-through rates and time spent. For conversions, track stream counts or purchases. Our Analytics dashboard allows you to customize views based on what matters most to your campaign.'
    },
    {
      id: 8,
      category: 'payments',
      question: 'How does billing work?',
      answer: 'We charge based on your campaign budget plus a small platform fee. You can set daily or total campaign budgets. Funds are only deducted as your campaign runs, and you\'ll receive detailed reports of all charges. You can manage payment methods in the Payments section.'
    },
    {
      id: 9,
      category: 'technical',
      question: 'What file formats do you support for audio uploads?',
      answer: 'We support most common audio formats including MP3, WAV, FLAC, and AAC. For optimal performance, we recommend uploading high-quality MP3 files (320kbps) or lossless formats like WAV or FLAC. Maximum file size is 50MB per track.'
    },
    {
      id: 10,
      category: 'technical',
      question: 'Is my music protected when I upload it to the platform?',
      answer: 'Yes, we take copyright protection seriously. All uploads are secured and only accessible to authorized users. We implement digital watermarking and strict access controls to prevent unauthorized distribution of your content.'
    }
  ];
  
  // Filter FAQs based on category and search query
  const filteredFaqs = faqItems.filter(item => {
    return (activeCategory === 'all' || item.category === activeCategory) && 
           (searchQuery === '' || 
            item.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
            item.answer.toLowerCase().includes(searchQuery.toLowerCase()));
  });

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
        <h1 className="text-3xl font-bold text-gray-800">Help & Support</h1>
        <button className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg w-full md:w-auto">
          Contact Support
        </button>
      </div>
      
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6" role="alert">
        <span className="block sm:inline">Page Under Maintenance</span>
      </div>
      
      {/* Search */}
      <div className="mb-8">
        <div className="relative">
          <input
            type="text"
            className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="Search for help..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="absolute left-3 top-3.5 text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Categories Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-medium mb-4 text-gray-900">Categories</h2>
            <ul className="space-y-2">
              <li>
                <button
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                    activeCategory === 'all' 
                      ? 'bg-primary text-white' 
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  onClick={() => setActiveCategory('all')}
                >
                  All Categories
                </button>
              </li>
              {faqCategories.map((category) => (
                <li key={category.id}>
                  <button
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                      activeCategory === category.id 
                        ? 'bg-primary text-white' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    onClick={() => setActiveCategory(category.id)}
                  >
                    {category.label}
                  </button>
                </li>
              ))}
            </ul>
            
            <div className="mt-8">
              <h2 className="text-lg font-medium mb-4 text-gray-900">Need More Help?</h2>
              <div className="space-y-3">
                <button className="w-full bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg">
                  Contact Support
                </button>
                <button className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-lg">
                  Schedule a Demo
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* FAQ Content */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-6 text-gray-900">
              {activeCategory === 'all' 
                ? 'All FAQs' 
                : faqCategories.find(cat => cat.id === activeCategory)?.label || 'FAQs'}
            </h2>
            
            {filteredFaqs.length === 0 ? (
              <div className="py-10 flex flex-col items-center justify-center">
                <p className="text-gray-900 mb-4">No results found for your search.</p>
                <button 
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg"
                  onClick={() => {
                    setSearchQuery('');
                    setActiveCategory('getting-started');
                  }}
                >
                  Clear Search
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {filteredFaqs.map((faq) => (
                  <div key={faq.id} className="border-b border-gray-200 pb-6 last:border-b-0 last:pb-0">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">{faq.question}</h3>
                    <p className="text-gray-900">{faq.answer}</p>
                    <div className="mt-3 flex items-center">
                      <span className="text-sm text-gray-900 mr-3">Was this helpful?</span>
                      <button className="text-sm text-gray-900 hover:text-gray-700 mr-3">Yes</button>
                      <button className="text-sm text-gray-900 hover:text-gray-700">No</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Resources */}
          <div className="bg-white rounded-xl shadow-sm p-6 mt-8">
            <h2 className="text-xl font-semibold mb-6 text-gray-900">Resources</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <h3 className="font-medium mb-2 text-gray-900">Getting Started Guide</h3>
                <p className="text-sm text-gray-900 mb-3">A complete walkthrough for new users</p>
                <a href="#" className="text-primary hover:text-primary-dark text-sm font-medium">Download PDF →</a>
              </div>
              
              <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <h3 className="font-medium mb-2 text-gray-900">Marketing Best Practices</h3>
                <p className="text-sm text-gray-900 mb-3">Tips for successful music campaigns</p>
                <a href="#" className="text-primary hover:text-primary-dark text-sm font-medium">View Article →</a>
              </div>
              
              <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <h3 className="font-medium mb-2 text-gray-900">Video Tutorials</h3>
                <p className="text-sm text-gray-900 mb-3">Step-by-step visual guides</p>
                <a href="#" className="text-primary hover:text-primary-dark text-sm font-medium">Watch Now →</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
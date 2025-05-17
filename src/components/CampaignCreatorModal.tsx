import { useState, useEffect } from 'react';
import { useCollection } from '@/hooks';
import { User } from '@/types/user';
import { Campaign } from '@/types/campaign';
import Image from 'next/image';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface CampaignCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCampaign?: Campaign;
}

export default function CampaignCreatorModal({ isOpen, onClose, selectedCampaign }: CampaignCreatorModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'email'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const { documents: campaigns = [] } = useCollection<Campaign>('campaigns');
  const { documents: users = [] } = useCollection<User>('users');

  useEffect(() => {
    if (selectedCampaign) {
      setSelectedCampaignId(selectedCampaign.id);
    } else if (campaigns.length > 0) {
      setSelectedCampaignId(campaigns[0].id);
    }
  }, [selectedCampaign, campaigns]);

  const filteredUsers = users.filter(user => {
    const searchLower = searchQuery.toLowerCase();
    return (
      user.email.toLowerCase().includes(searchLower) ||
      user.first_name.toLowerCase().includes(searchLower) ||
      user.last_name.toLowerCase().includes(searchLower) ||
      user.payment_info?.[0]?.email?.toLowerCase().includes(searchLower)
    );
  }).sort((a, b) => {
    const aValue = sortBy === 'name' 
      ? `${a.first_name} ${a.last_name}`.toLowerCase()
      : a.email.toLowerCase();
    const bValue = sortBy === 'name'
      ? `${b.first_name} ${b.last_name}`.toLowerCase()
      : b.email.toLowerCase();
    
    return sortOrder === 'asc'
      ? aValue.localeCompare(bValue)
      : bValue.localeCompare(aValue);
  });

  const handleInviteCreator = async () => {
    if (!inviteEmail || !selectedCampaignId) return;

    try {
      const campaign = campaigns.find(c => c.id === selectedCampaignId);
      if (!campaign) return;

      const currentCreators = campaign.creators || [];
      if (!currentCreators.includes(inviteEmail)) {
        await updateDoc(doc(db, 'campaigns', selectedCampaignId), {
          creators: [...currentCreators, inviteEmail]
        });
      }
      
      setShowInviteForm(false);
      setInviteEmail('');
    } catch (error) {
      console.error('Error inviting creator:', error);
    }
  };

  const handleCreatorToggle = async (creatorId: string) => {
    if (!selectedCampaignId) return;

    const campaign = campaigns.find(c => c.id === selectedCampaignId);
    if (!campaign) return;

    const currentCreators = campaign.creators || [];
    const newCreators = currentCreators.includes(creatorId)
      ? currentCreators.filter(id => id !== creatorId)
      : [...currentCreators, creatorId];

    try {
      await updateDoc(doc(db, 'campaigns', selectedCampaignId), {
        creators: newCreators
      });
    } catch (error) {
      console.error('Error updating campaign creators:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">Manage Creators</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex h-[calc(90vh-8rem)]">
          {/* Left Column - Campaigns */}
          <div className="w-1/3 border-r border-gray-200 p-4 overflow-y-auto">
            <h3 className="font-medium text-gray-800 mb-4">Select Campaign</h3>
            <div className="space-y-2">
              {campaigns.map((campaign) => (
                <button
                  key={campaign.id}
                  onClick={() => setSelectedCampaignId(campaign.id)}
                  className={`w-full p-3 text-left rounded-lg transition-colors ${
                    selectedCampaignId === campaign.id
                      ? 'bg-primary text-white'
                      : 'hover:bg-gray-100 text-gray-800'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    {campaign.imageUrl ? (
                      <Image
                        src={campaign.imageUrl}
                        alt={campaign.name || 'Campaign'}
                        width={40}
                        height={40}
                        className="rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center">
                        <span className="text-gray-800 font-medium ">
                          {campaign.name ? campaign.name.charAt(0) : 'C'}
                        </span>
                      </div>
                    )}
                    <div>
                      <h4 className={`font-medium ${selectedCampaignId === campaign.id ? 'text-white' : 'text-gray-800'}`}>
                        {campaign.name || 'Unnamed Campaign'}
                      </h4>
                      <p className={`text-sm ${selectedCampaignId === campaign.id ? 'text-white' : 'text-gray-800'}`}>
                        {campaign.creators?.length || 0} creators
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Right Column - Creators */}
          <div className="w-2/3 p-4 overflow-y-auto">
            <div className="mb-6 space-y-4">
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-gray-800"
                  />
                </div>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'name' | 'email')}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-gray-800"
                >
                  <option value="name">Sort by Name</option>
                  <option value="email">Sort by Email</option>
                </select>
                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="p-2 text-gray-500 hover:text-gray-700"
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </button>
              </div>

              <button
                onClick={() => setShowInviteForm(true)}
                className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
              >
                Invite Creator
              </button>
            </div>

            {showInviteForm && (
              <div className="mb-6 p-4 border border-gray-200 rounded-lg">
                <h4 className="font-medium mb-2 text-gray-800">Invite Creator</h4>
                <div className="flex space-x-2">
                  <input
                    type="email"
                    placeholder="Enter creator's email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-gray-800"
                  />
                  <button
                    onClick={handleInviteCreator}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
                  >
                    Send Invite
                  </button>
                  <button
                    onClick={() => {
                      setShowInviteForm(false);
                      setInviteEmail('');
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {campaigns
                .find(c => c.id === selectedCampaignId)
                ?.creators?.map((creatorEmail) => {
                  const user = users.find(u => u.email === creatorEmail);
                  
                  return (
                    <div key={creatorEmail} className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-gray-800 font-medium">
                            {user?.first_name ? user.first_name.charAt(0) : creatorEmail.charAt(0)}
                          </span>
                        </div>
                        <div>
                          {user ? (
                            <>
                              <h4 className="font-medium text-gray-800">
                                {user.first_name} {user.last_name}
                              </h4>
                              <p className="text-sm text-gray-800">{user.email}</p>
                            </>
                          ) : (
                            <>
                              <p className="text-sm text-gray-800">{creatorEmail}</p>
                              <p className="text-sm text-red-500">No account created yet</p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
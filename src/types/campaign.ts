export interface Campaign {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  createdAt: number;
  updatedAt: number;
  status: 'draft' | 'active' | 'completed' | 'archived';
  videos?: Video[];
  creators?: string[]; // Array of creator user IDs
  budget: number;
  budgetUsed: number;
  ratePerMillion: number;
  views: number;
  shares: number;
  comments: number;
  likes: number;
  lastUpdated: number;
  campaign_path?: string;
  owner_id: string;
}

export interface Video {
  id: string;
  url: string;
  author_id: string;
  status: 'pending' | 'approved' | 'denied';
  created_at: number;
  updated_at: number;
} 
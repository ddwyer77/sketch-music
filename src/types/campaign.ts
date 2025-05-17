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
}

export interface Video {
  id: string;
  url: string;
  author_id: string;
  status: 'pending' | 'approved' | 'denied';
  created_at: number;
  updated_at: number;
} 
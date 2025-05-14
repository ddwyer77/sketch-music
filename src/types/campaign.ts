export type Video = {
  url: string;
  status: 'pending' | 'approved' | 'denied';
  author_id: string;
};

export type Campaign = {
  id: string;
  owner_id: string;
  name: string;
  budget: number;
  budgetUsed: number;
  ratePerMillion: number;
  imageUrl: string;
  campaign_path: string;
  videos: Video[];
  createdAt: string;
  views: number;
  shares: number;
  comments: number;
  likes?: number;
  lastUpdated: string;
}; 
export interface Campaign {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  soundId?: string;
  soundUrl?: string;
  requireSound?: boolean;
  notes?: string;
  createdAt: number;
  updatedAt: number;
  videos?: Video[];
  creators?: string[]; // Array of creator user IDs
  serverIds?: string[]; // Array of Discord server IDs where this campaign is visible
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
  maxSubmissions?: number; // Maximum number of video submissions allowed
  isComplete: boolean;
  receipts?: Array<{
    receiptId: string;
    creator: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      paymentEmail: string;
    };
    processedBy: {
      id: string;
      name: string;
    };
    payment: {
      amount: number;
      currency: string;
      method: string;
      status: string;
      batchId: string;
      timestamp: number;
    };
    summary: {
      netAmount: number;
      platformFee: number;
      totalVideos: number;
      totalViews: number;
      unpaidVideosCount: number;
    };
    metadata: {
      paymentReference: string;
    };
  }>;
  campaignTerminationDetails?: {
    date: boolean;
    budget: boolean;
    maxSubmissions: boolean;
    manualTermination: boolean;
    other: boolean;
    comments: string;
  };
}

export interface Video {
  id: string;
  url: string;
  author_id: string;
  status: 'pending' | 'approved' | 'denied';
  created_at: number;
  updated_at: number;
  soundIdMatch?: boolean;
  title?: string;
  reasonForDenial?: string | null;
  hasBeenPaid?: boolean;
  payoutAmountForVideo?: number;
  earnings?: number;
  views?: number;
  shares?: number;
  comments?: number;
  likes?: number;
  description?: string;
  musicTitle?: string;
  musicAuthor?: string;
  musicId?: string;
  markedForDeletion?: boolean;
  author?: {
    uniqueId: string;
    nickname?: string;
  };
}

export interface Transaction {
  id: string;
  actorId: string;
  actorName: string;
  amount: number;
  campaignId: string;
  createdAt: number; // timestamp (ms)
  currency: string;
  metadata: {
    netAmount: number;
    paymentEmail: string;
    paymentStatus: string;
    payoutBatchId: string;
    platformFee: number;
    ratePerMillion: number;
    reconciliationId: string;
    timestamp: number;
    totalViews: number;
    videoCount: number;
    videoIds: string[];
    views: number[];
  };
  paymentMethod: string;
  paymentReference: string;
  source: string;
  status: string;
  targetUserId: string;
  type: string;
} 
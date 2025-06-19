import { Timestamp } from 'firebase/firestore';

export interface Bug {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  type: 'bug' | 'task';
  status: 'active' | 'complete';
  imageUrl?: string;
  order: number;
  createdAt: Timestamp;
  completedAt?: Timestamp;
  createdBy: {
    id: string;
    name: string;
  };
} 
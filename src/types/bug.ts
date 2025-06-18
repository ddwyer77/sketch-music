import { Timestamp } from 'firebase/firestore';

export interface Bug {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'complete';
  imageUrl?: string;
  submittedBy: string;
  documentId: string;
  order: number;
  createdAt: Timestamp;
  completedAt?: Timestamp;
} 
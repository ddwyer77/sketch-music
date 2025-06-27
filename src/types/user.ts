export type userRole = 'admin' | 'creator' | 'owner';

export type CampaignContribution = {
  id: string;
  name: string;
};

export type TikTokData = {
  description: string;
  profileImage: string;
  title: string;
  uniqueId: string;
  isVerified?: boolean;
  verifiedAt?: number;
};

export type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: userRole[];
  paymentEmail?: string;
  groups?: string[];
  campaign_contributions?: CampaignContribution[];
  discord_id?: string;
  tiktokData?: { [username: string]: TikTokData };
  tiktokVerified?: boolean;
  wallet?: number;
};

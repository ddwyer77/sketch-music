export type UserType = 'creator' | 'manager' | 'admin';

export type CampaignContribution = {
  id: string;
  name: string;
};

export type User = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  user_type: UserType;
  payment_info?: {
    email: string;
  }[];
  groups?: string[];
  campaign_contributions?: CampaignContribution[];
};
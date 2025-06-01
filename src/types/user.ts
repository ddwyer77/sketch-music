export type userRole = 'admin' | 'creator' | 'owner';

export type CampaignContribution = {
  id: string;
  name: string;
};

export type User = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  roles: userRole[];
  payment_info?: {
    email: string;
  }[];
  groups?: string[];
  campaign_contributions?: CampaignContribution[];
  discord_id?: string;
};

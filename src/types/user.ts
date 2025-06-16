export type userRole = 'admin' | 'creator' | 'owner';

export type CampaignContribution = {
  id: string;
  name: string;
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
};

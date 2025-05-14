export type UserType = 'creator' | 'manager' | 'admin';

export type User = {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    user_type: UserType;
    payment_info: Array<{
      email: string;
    }>;
    groups: string[];
  };
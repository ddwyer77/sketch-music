export type User = {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    payment_info: Array<{
      email: string;
    }>;
    groups: string[];
  };
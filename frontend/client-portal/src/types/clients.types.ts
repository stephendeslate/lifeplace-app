// frontend/client-portal/src/types/clients.types.ts

export interface ClientProfile {
  phone?: string;
  company?: string;
}

export interface Client {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  profile?: ClientProfile;
  date_joined: string;
  is_active: boolean;
  has_account: boolean;
  events?: Event[];
}

export interface ClientInvitation {
  id: string;
  client: string;
  client_name: string;
  invited_by: string;
  is_accepted: boolean;
  expires_at: string;
  created_at: string;
}

export interface AcceptInvitationData {
  password: string;
  confirm_password: string;
}

export interface AcceptInvitationResponse {
  message: string;
  tokens: {
    access: string;
    refresh: string;
  };
  user: Client;
}

// Event interface (basic, will be expanded in events domain)
export interface Event {
  id: number;
  title: string;
  start_date: string;
  end_date: string;
  status: 'DRAFT' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  venue?: string;
}

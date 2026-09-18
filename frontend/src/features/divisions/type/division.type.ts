export interface DivisionUser {
  id: string;
  fullName: string;
  position: string | null;
  email: string;
  role: string;
  isActive: boolean;
}

export interface Division {
  id: string;
  name: string;
  users: DivisionUser[];
  userCount: number;
}

// Raw shape as returned by GET /divisions (joined with users + role)
export interface DivisionResponse {
  id: string;
  division_name: string;
  users: {
    id: string;
    full_name: string;
    position: string | null;
    email: string;
    is_active: boolean;
    role?: { role_name: string } | null;
  }[];
}

export interface DivisionManagementTableProps {
  maxTableHeight?: string;
  maxMobileHeight?: string;
}

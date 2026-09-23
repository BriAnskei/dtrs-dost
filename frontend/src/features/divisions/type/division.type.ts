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

export interface DivisionManagementTableProps {
  maxTableHeight?: string;
  maxMobileHeight?: string;
}

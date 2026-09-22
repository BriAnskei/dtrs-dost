export interface UpdateUserPayload {
  full_name?: string;
  role_id: string;
  division?: string;
  position?: string | null;
  email?: string;
  contact_number?: string | null;
}

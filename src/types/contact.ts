export interface Contact {
  id: string;
  vendor_id: string;
  name: string;
  phone: string | null;
  type: 'client' | 'provider';
  created_at: string;
  updated_at: string;
}

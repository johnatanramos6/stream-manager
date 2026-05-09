export interface MasterAccount {
  id: string;
  vendor_id: string;
  platform: string;
  account_email: string;
  account_password: string;
  total_profiles: number;
  purchase_price: number;
  notes: string;
  created_at: string;
  purchase_date?: string; // Fecha de compra
  // Calculated (not from DB)
  assigned_profiles?: number;
  available_profiles?: number;
}

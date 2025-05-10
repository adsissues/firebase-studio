
import type { User as FirebaseUser } from 'firebase/auth'; // Import Firebase User type
import type { Timestamp } from 'firebase/firestore'; // Import Timestamp type

export interface LocationCoords {
  latitude: number;
  longitude: number;
}

export interface StockItem {
  id: string;
  itemName: string;
  barcode?: string;
  currentStock: number;
  minimumStock?: number;
  overstockThreshold?: number; // New: For overstock alerts (e.g., quantity)
  location?: string;
  description?: string;
  category?: string;
  supplier?: string; // Existing, can be primary supplier name
  photoUrl?: string;
  locationCoords?: LocationCoords;
  userId: string;
  costPrice?: number; // Optional: For inventory value calculation
  lastMovementDate?: Timestamp; // New: To track inactivity

  // Embedded Supplier Details
  supplierName?: string;
  supplierContactPerson?: string;
  supplierPhone?: string;
  supplierEmail?: string;
  supplierWebsite?: string;
  supplierAddress?: string;
}

export interface AppUser extends FirebaseUser {
  role?: 'admin' | 'user';
}

export interface AdminSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  lowStockThreshold: number;
  overstockThresholdPercentage?: number; // New: e.g., alert if stock > 200% of (minimumStock or a baseline)
  inactivityAlertDays?: number; // New: e.g., alert if no movement for X days
}

export interface StockMovementLog {
    id: string;
    itemId: string;
    itemName: string;
    quantityChange: number;
    newStockLevel: number;
    type: 'in' | 'out' | 'restock';
    timestamp: Timestamp;
    userId: string;
    userEmail?: string;
    batchNumber?: string;
    notes?: string;
}



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
  location?: string; 
  description?: string; 
  category?: string; 
  supplier?: string; 
  photoUrl?: string; 
  locationCoords?: LocationCoords; 
  userId: string; 
  costPrice?: number; // Optional: For inventory value calculation
}

export interface AppUser extends FirebaseUser {
  role?: 'admin' | 'user'; 
}

export interface AdminSettings {
  emailNotifications: boolean;
  pushNotifications: boolean; 
  lowStockThreshold: number; 
  // workflowApprovalRequired and defaultLeadTime are effectively removed from active use
  // but kept in type for potential future re-instatement or data migration.
  workflowApprovalRequired?: boolean; 
  defaultLeadTime?: number; 
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

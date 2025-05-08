
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
  minimumStock?: number; // Optional minimum stock level SPECIFIC to this item. Overrides global threshold if set.
  location?: string; // User-defined location string
  description?: string; // Optional description
  category?: string; // Optional category
  supplier?: string; // Optional supplier
  photoUrl?: string; // Optional photo data URI or URL
  locationCoords?: LocationCoords; // Optional geographical coordinates
  userId: string; // Added userId to associate item with a user
  // Removed fields: costPrice, leadTime, batchNumber
}

// Define a User type extending FirebaseUser with role information
export interface AppUser extends FirebaseUser {
  role?: 'admin' | 'user'; // Define possible roles
}

// Settings type, particularly for admin configurations
export interface AdminSettings {
  emailNotifications: boolean;
  pushNotifications: boolean; // Placeholder for future push notification implementation
  lowStockThreshold: number; // Global threshold for low stock notifications, unless overridden by item.minimumStock
  // Removed fields: workflowApprovalRequired, defaultLeadTime
  workflowApprovalRequired?: boolean; // Keep in type definition for potential future reinstatement
  defaultLeadTime?: number; // Keep in type definition for potential future reinstatement
}

// Represents a single stock movement event
export interface StockMovementLog {
    id: string; // Firestore document ID
    itemId: string;
    itemName: string; // Store item name for easier display
    quantityChange: number; // Positive for stock in, negative for stock out
    newStockLevel: number; // Stock level *after* the change
    type: 'in' | 'out' | 'restock'; // Added 'restock' type
    timestamp: Timestamp; // Firestore Timestamp of the event
    userId: string; // ID of the user who performed the action
    userEmail?: string; // Optional: Email of the user for display
    batchNumber?: string; // Kept optional batch number, even if form input removed for now
    notes?: string; // Kept optional notes, even if form input removed for now
}


// Removed placeholder types for reporting/analytics

// export interface InventoryTurnoverReport {
//     itemId: string;
//     itemName: string;
//     turnoverRate: number;
//     period: string; // e.g., 'monthly', 'quarterly'
// }

// export interface SupplierPerformance {
//     supplierId: string;
//     supplierName: string;
//     averageDeliveryTime: number; // days
//     onTimeDeliveryRate: number; // percentage
//     qualityIssueRate: number; // percentage
// }


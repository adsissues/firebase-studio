
import type { User as FirebaseUser } from 'firebase/auth'; 
import type { Timestamp } from 'firebase/firestore'; 

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
  overstockThreshold?: number; 
  location?: string; // Can be more specific e.g., "Building A, Shelf 3, Bin 2"
  rack?: string; // New: For rack location
  shelf?: string; // New: For shelf/bin location
  description?: string;
  category?: string;
  supplier?: string; 
  photoUrl?: string;
  locationCoords?: LocationCoords;
  userId: string; // The UID of the user who created/owns this item
  costPrice?: number; 
  lastMovementDate?: Timestamp; 

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
  assignedLocations?: string[]; // New: List of locations the user is assigned to
}

export interface AdminSettings {
  emailNotifications: boolean;
  pushNotifications: boolean; // Placeholder for future
  lowStockThreshold: number; // Global default if item.minimumStock is not set
  overstockThresholdPercentage?: number; // e.g., 200 means alert if stock > 2x minimum
  inactivityAlertDays?: number; // e.g., alert if no movement for 30 days
  // Potentially add more settings here:
  // defaultReorderQuantity?: number;
  // approvalWorkflowEnabled?: boolean;
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
    userEmail?: string; // For display in logs
    batchNumber?: string; // Optional for batch tracking
    notes?: string; // Optional notes for the movement
}

export interface AlertType {
  id: string; // Unique ID for the alert (e.g., `low-${itemId}`)
  type: 'low_stock' | 'overstock' | 'inactivity' | 'custom'; // Type of alert
  title: string;
  message: string;
  item?: StockItem; // Optional: The item this alert pertains to
  timestamp: Date;
  variant?: 'default' | 'destructive' | 'warning' | 'info'; // For styling
  // Potentially add:
  // acknowledged?: boolean;
  // acknowledgedBy?: string; // userId
  // acknowledgedAt?: Timestamp;
  // actions?: { label: string; onClick: () => void }[];
}

    

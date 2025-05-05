
import type { User as FirebaseUser } from 'firebase/auth'; // Import Firebase User type

export interface LocationCoords {
  latitude: number;
  longitude: number;
}

export interface StockItem {
  id: string;
  itemName: string;
  barcode?: string;
  currentStock: number;
  minimumStock?: number; // Changed from maximumStock to optional minimumStock
  lowStockThreshold?: number; // Added optional low stock threshold per item
  location?: string; // User-defined location string
  description?: string; // Optional description
  category?: string; // Optional category
  supplier?: string; // Optional supplier
  photoUrl?: string; // Optional photo data URI or URL
  locationCoords?: LocationCoords; // Optional geographical coordinates
  userId: string; // Added userId to associate item with a user
}

// Define a User type extending FirebaseUser with role information
export interface AppUser extends FirebaseUser {
  role?: 'admin' | 'user'; // Define possible roles
}


// Placeholder for Stock Out log data if needed later
// export interface StockOutLog {
//     itemId: string;
//     quantity: number;
// }

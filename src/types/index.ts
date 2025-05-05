export interface LocationCoords {
  latitude: number;
  longitude: number;
}

export interface StockItem {
  id: string;
  itemName: string;
  barcode?: string;
  currentStock: number;
  minStock: number;
  location?: string; // User-defined location string
  description?: string; // Optional description
  category?: string; // Optional category
  supplier?: string; // Optional supplier
  photoUrl?: string; // Optional photo data URI or URL
  locationCoords?: LocationCoords; // Optional geographical coordinates
}

// Placeholder for Stock Out log data if needed later
// export interface StockOutLog {
//     itemId: string;
//     quantity: number;
// }

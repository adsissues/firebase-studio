export interface StockItem {
  id: string;
  itemName: string;
  barcode?: string; // Optional for now, based on proposal
  currentStock: number;
  minStock: number;
  location?: string; // Optional for now, based on proposal
}

// Placeholder for Stock Out log data if needed later
// export interface StockOutLog {
//     itemId: string;
//     quantity: number;
// }

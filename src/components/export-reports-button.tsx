
"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { StockItem, StockMovementLog } from '@/types';
import { format } from 'date-fns';

interface ExportReportsButtonProps {
  items: StockItem[];
  movements: StockMovementLog[];
}

// Helper function to convert array of objects to CSV string
function convertToCSV(data: any[], headers: string[]): string {
  const headerRow = headers.join(',');
  const rows = data.map(obj => {
    return headers.map(header => {
      let cell = obj[header] === null || obj[header] === undefined ? '' : String(obj[header]);
      if (typeof obj[header] === 'object' && obj[header] !== null && typeof (obj[header] as any).toDate === 'function') { // Firestore Timestamp
        try {
          cell = format((obj[header] as any).toDate(), 'yyyy-MM-dd HH:mm:ss');
        } catch (e) {
          cell = String(obj[header]); // fallback
        }
      } else if (typeof obj[header] === 'object' && obj[header] !== null) {
        cell = JSON.stringify(obj[header]); // Serialize complex objects
      }
      cell = cell.replace(/"/g, '""'); // Escape double quotes
      if (cell.includes(',')) {
        cell = `"${cell}"`; // Enclose in double quotes if it contains a comma
      }
      return cell;
    }).join(',');
  });
  return [headerRow, ...rows].join('\n');
}

// Helper function to trigger download
function downloadCSV(csvString: string, filename: string) {
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } else {
    console.warn('CSV download attribute not supported. CSV content:', csvString);
    alert('CSV download is not supported by your browser. Data logged to console.');
  }
}

export function ExportReportsButton({ items, movements }: ExportReportsButtonProps) {
  const { toast } = useToast();

  const handleItemsExport = () => {
    if (items.length === 0) {
      toast({
        variant: "destructive",
        title: "No Data",
        description: "There are no items to export.",
      });
      return;
    }

    const itemHeaders = [
      'id', 'itemName', 'barcode', 'currentStock', 'minimumStock', 'overstockThreshold', 
      'location', 'description', 'category', 'supplierName', 'supplierContactPerson', 
      'supplierPhone', 'supplierEmail', 'supplierWebsite', 'supplierAddress', 
      'photoUrl', 'locationCoords', 'userId', 'costPrice', 'lastMovementDate'
    ];
    
    const sanitizedItems = items.map(item => ({
      id: item.id,
      itemName: item.itemName,
      barcode: item.barcode || '',
      currentStock: item.currentStock,
      minimumStock: item.minimumStock ?? '',
      overstockThreshold: item.overstockThreshold ?? '',
      location: item.location || '',
      description: item.description || '',
      category: item.category || '',
      supplierName: item.supplierName || '',
      supplierContactPerson: item.supplierContactPerson || '',
      supplierPhone: item.supplierPhone || '',
      supplierEmail: item.supplierEmail || '',
      supplierWebsite: item.supplierWebsite || '',
      supplierAddress: item.supplierAddress || '',
      photoUrl: item.photoUrl || '',
      locationCoords: item.locationCoords ? `${item.locationCoords.latitude},${item.locationCoords.longitude}` : '',
      userId: item.userId,
      costPrice: item.costPrice ?? '',
      lastMovementDate: item.lastMovementDate ? (typeof (item.lastMovementDate as any).toDate === 'function' ? (item.lastMovementDate as any).toDate().toISOString() : String(item.lastMovementDate)) : '',
    }));

    try {
      const csvString = convertToCSV(sanitizedItems, itemHeaders);
      const filename = `stock_items_report_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`;
      downloadCSV(csvString, filename);
      toast({
        title: "Items Exported",
        description: `${items.length} items exported successfully to ${filename}.`,
      });
    } catch (error) {
      console.error("Error exporting items to CSV:", error);
      toast({
        variant: "destructive",
        title: "Export Error",
        description: "Could not export items to CSV. Check console for details.",
      });
    }
  };

  const handleMovementsExport = () => {
    if (movements.length === 0) {
      toast({
        variant: "destructive",
        title: "No Data",
        description: "There are no movements to export.",
      });
      return;
    }

    const movementHeaders = [
      'id', 'itemId', 'itemName', 'quantityChange', 'newStockLevel', 'type', 
      'timestamp', 'userId', 'userEmail', 'batchNumber', 'notes'
    ];

    const sanitizedMovements = movements.map(log => ({
        ...log,
        timestamp: log.timestamp ? (typeof (log.timestamp as any).toDate === 'function' ? (log.timestamp as any).toDate().toISOString() : String(log.timestamp)) : '',
        userEmail: log.userEmail || '',
        batchNumber: log.batchNumber || '',
        notes: log.notes || '',
    }));

    try {
      const csvString = convertToCSV(sanitizedMovements, movementHeaders);
      const filename = `stock_movements_report_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`;
      downloadCSV(csvString, filename);
      toast({
        title: "Movements Exported",
        description: `${movements.length} movements exported successfully to ${filename}.`,
      });
    } catch (error) {
      console.error("Error exporting movements to CSV:", error);
      toast({
        variant: "destructive",
        title: "Export Error",
        description: "Could not export movements to CSV. Check console for details.",
      });
    }
  };

  return (
    <div className="inline-flex gap-2 ml-auto">
      <Button variant="outline" size="sm" onClick={handleItemsExport}>
        <Download className="mr-2 h-4 w-4" />
        Export Items (CSV)
      </Button>
      <Button variant="outline" size="sm" onClick={handleMovementsExport}>
        <Download className="mr-2 h-4 w-4" />
        Export Movements (CSV)
      </Button>
      <Button variant="outline" size="sm" onClick={() => {
         toast({
          title: `PDF Export (Coming Soon)`,
          description: `This feature is planned for a future update. Full PDF generation is complex.`,
        });
      }}>
        <Download className="mr-2 h-4 w-4" />
        Export PDF (Soon)
      </Button>
    </div>
  );
}


"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { StockItem, StockMovementLog } from '@/types';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import 'jspdf-autotable'; // Import for side effects to extend jsPDF prototype

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
          // If toDate fails, try to convert directly if it's already a Date object
          if (obj[header] instanceof Date) {
            cell = format(obj[header] as Date, 'yyyy-MM-dd HH:mm:ss');
          } else {
            cell = String(obj[header]); // fallback
          }
        }
      } else if (obj[header] instanceof Date) { // Handle if it's already a Date object
         cell = format(obj[header] as Date, 'yyyy-MM-dd HH:mm:ss');
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
function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
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
    console.warn('File download attribute not supported. Content:', content);
    alert('File download is not supported by your browser. Data logged to console.');
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
      downloadFile(csvString, filename, 'text/csv;charset=utf-8;');
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
      downloadFile(csvString, filename, 'text/csv;charset=utf-8;');
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

  const handlePdfExport = () => {
    if (items.length === 0 && movements.length === 0) {
      toast({
        variant: "destructive",
        title: "No Data",
        description: "Nothing to export to PDF.",
      });
      return;
    }

    try {
      const doc = new jsPDF();
      const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
      let yPos = 20;

      doc.setFontSize(18);
      doc.text("Stock Management Report", 14, yPos);
      yPos += 10;

      if (items.length > 0) {
        doc.setFontSize(14);
        doc.text("Stock Items", 14, yPos);
        yPos += 2; // Reduced space before table

        const itemTableHeaders = [
          "Item Name", "Barcode", "Qty", "Min Stock", "Category", "Location", "Cost (£)"
        ];
        const itemTableBody = items.map(item => [
          item.itemName || '-',
          item.barcode || '-',
          item.currentStock,
          item.minimumStock ?? '-',
          item.category || '-',
          item.location || '-',
          item.costPrice !== undefined ? item.costPrice.toFixed(2) : '-'
        ]);

        (doc as any).autoTable({ // Use (doc as any).autoTable
          startY: yPos,
          head: [itemTableHeaders],
          body: itemTableBody,
          theme: 'striped',
          styles: { fontSize: 8, cellPadding: 1.5, overflow: 'linebreak' },
          headStyles: { fillColor: [22, 160, 133], textColor: 255, fontStyle: 'bold', fontSize: 9, cellPadding: 2 },
          columnStyles: {
            0: { cellWidth: 40 }, // Item Name
            1: { cellWidth: 25 }, // Barcode
            2: { cellWidth: 15, halign: 'right' }, // Qty
            3: { cellWidth: 20, halign: 'right' }, // Min Stock
            4: { cellWidth: 25 }, // Category
            5: { cellWidth: 30 }, // Location
            6: { cellWidth: 20, halign: 'right' }, // Cost
          },
          didDrawPage: (data: any) => { // Add type for data if known, otherwise use any
            yPos = data.cursor?.y ?? yPos; // Update yPos after table drawing
          }
        });
        yPos = (doc as any).lastAutoTable.finalY + 10;
      }

      if (movements.length > 0) {
        const estimatedMovementTableHeight = movements.length * 5 + 20;
        if (yPos + estimatedMovementTableHeight > pageHeight && items.length > 0) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(14);
        doc.text("Stock Movements", 14, yPos);
        yPos += 2;

        const movementTableHeaders = [
          "Date", "Item Name", "Type", "Qty Δ", "New Qty", "User"
        ];
        const movementTableBody = movements.map(log => [
          log.timestamp ? format((log.timestamp as any).toDate(), 'dd/MM/yy HH:mm') : '-',
          log.itemName || '-',
          log.type,
          log.quantityChange,
          log.newStockLevel,
          log.userEmail || (log.userId ? log.userId.substring(0, 8) + '...' : '-')
        ]);

        (doc as any).autoTable({ // Use (doc as any).autoTable
          startY: yPos,
          head: [movementTableHeaders],
          body: movementTableBody,
          theme: 'striped',
          styles: { fontSize: 8, cellPadding: 1.5, overflow: 'linebreak' },
          headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold', fontSize: 9, cellPadding: 2 },
          columnStyles: {
            0: { cellWidth: 25 }, // Date
            1: { cellWidth: 50 }, // Item Name
            2: { cellWidth: 20 }, // Type
            3: { cellWidth: 15, halign: 'right' }, // Qty Change
            4: { cellWidth: 20, halign: 'right' }, // New Qty
            5: { cellWidth: 'auto' }, // User
          },
        });
      }

      const filename = `stock_report_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`;
      doc.save(filename);
      toast({
        title: "PDF Exported",
        description: `Report generated as ${filename}.`,
      });

    } catch (error) {
      console.error("Error exporting to PDF:", error);
      toast({
        variant: "destructive",
        title: "PDF Export Error",
        description: "Could not generate PDF report. Check console for details.",
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
      <Button variant="outline" size="sm" onClick={handlePdfExport}>
        <Download className="mr-2 h-4 w-4" />
        Export PDF
      </Button>
    </div>
  );
}

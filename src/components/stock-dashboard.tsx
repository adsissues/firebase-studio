"use client";

import type * as React from 'react';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { StockItem } from '@/types';
import { AlertTriangle } from 'lucide-react';

interface StockDashboardProps {
  items: StockItem[];
}

export function StockDashboard({ items }: StockDashboardProps) {
  const getStatus = (item: StockItem) => {
    if (item.currentStock <= item.minStock) {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          Low Stock
        </Badge>
      );
    } else {
      return <Badge variant="success">In Stock</Badge>;
    }
  };

  return (
    <div className="rounded-lg border shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Item Name</TableHead>
            <TableHead className="text-right">Current Stock</TableHead>
            <TableHead className="text-right">Min Stock</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                No stock items found.
              </TableCell>
            </TableRow>
          ) : (
            items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.itemName}</TableCell>
                <TableCell className="text-right">{item.currentStock}</TableCell>
                <TableCell className="text-right">{item.minStock}</TableCell>
                <TableCell>{getStatus(item)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

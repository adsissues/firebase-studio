
"use client";

import * as React from 'react';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { StockMovementLog } from '@/types';
import { formatDistanceToNow } from 'date-fns'; // For relative time formatting
import { ArrowDownCircle, ArrowUpCircle, UserCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface StockMovementDashboardProps {
  movements: StockMovementLog[];
  itemLimit?: number; // Optional limit for displayed items
}

export function StockMovementDashboard({ movements, itemLimit = 10 }: StockMovementDashboardProps) {

   const formatTimestamp = (timestamp: any): string => {
     if (!timestamp || typeof timestamp.toDate !== 'function') {
         return 'Invalid date'; // Handle cases where timestamp might be missing or malformed
     }
     try {
       const date = timestamp.toDate();
       return formatDistanceToNow(date, { addSuffix: true });
     } catch (error) {
       console.error("Error formatting timestamp:", error);
       return 'Error date';
     }
   };

   // Slice the movements array based on the itemLimit
   const displayedMovements = movements.slice(0, itemLimit);

  return (
    <div className="rounded-lg border shadow-sm overflow-hidden">
      <Table>
        <TableCaption className="py-4">Last {displayedMovements.length} stock level changes.</TableCaption> {/* Updated caption */}
        <TableHeader>
          <TableRow>
            <TableHead className="w-[30%] min-w-[100px]">Item Name</TableHead>
            <TableHead className="text-center w-[15%]">Type</TableHead>
            <TableHead className="text-right w-[15%]">Change</TableHead>
            <TableHead className="text-right w-[15%]">New Qty</TableHead>
            <TableHead className="hidden sm:table-cell w-[25%]">Timestamp</TableHead>
             <TableHead className="hidden md:table-cell text-center w-[10%]">User</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {displayedMovements.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                No stock movements recorded yet.
              </TableCell>
            </TableRow>
          ) : (
            displayedMovements.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="font-medium">{log.itemName || log.itemId}</TableCell>
                <TableCell className="text-center">
                   {log.type === 'in' ? (
                      <Badge variant="secondary" className="flex items-center justify-center gap-1 text-xs bg-success/10 text-success border-success/20">
                        <ArrowUpCircle className="h-3 w-3" />
                        In
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="flex items-center justify-center gap-1 text-xs bg-destructive/10 text-destructive border-destructive/20">
                        <ArrowDownCircle className="h-3 w-3" />
                        Out
                      </Badge>
                    )}
                 </TableCell>
                <TableCell className={`text-right font-mono ${log.quantityChange > 0 ? 'text-success' : 'text-destructive'}`}>
                  {log.quantityChange > 0 ? `+${log.quantityChange}` : log.quantityChange}
                </TableCell>
                <TableCell className="text-right font-mono">{log.newStockLevel}</TableCell>
                <TableCell className="hidden sm:table-cell text-muted-foreground text-xs">{formatTimestamp(log.timestamp)}</TableCell>
                 <TableCell className="hidden md:table-cell text-center">
                    <TooltipProvider delayDuration={100}>
                       <Tooltip>
                           <TooltipTrigger asChild>
                              <span className="flex justify-center items-center cursor-default">
                                 <UserCircle className="h-4 w-4 text-muted-foreground" />
                              </span>
                           </TooltipTrigger>
                           <TooltipContent>
                               <p>{log.userEmail || log.userId}</p>
                            </TooltipContent>
                       </Tooltip>
                    </TooltipProvider>
                 </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

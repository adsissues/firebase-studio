
"use client";

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { StockMovementLog } from '@/types';
import { format, isToday, isYesterday, formatDistanceToNow } from 'date-fns';
import { ArrowDownCircle, ArrowUpCircle, UserCircle, SearchIcon, FilterIcon, RefreshCw } from 'lucide-react'; // Import RefreshCw for restock
import { cn } from "@/lib/utils";

interface ActivityFeedProps {
  movements: StockMovementLog[];
  isLoading?: boolean;
}

interface GroupedLogs {
  [dateGroup: string]: StockMovementLog[];
}

export function ActivityFeed({ movements, isLoading = false }: ActivityFeedProps) {
  const [searchTerm, setSearchTerm] = React.useState('');
  // Update filter type to include 'restock'
  const [filterType, setFilterType] = React.useState<'all' | 'in' | 'out' | 'restock'>('all');

  const formatTimestamp = (timestamp: StockMovementLog['timestamp']): string => {
    if (!timestamp || typeof timestamp.toDate !== 'function') return 'Invalid date';
    try {
      const date = timestamp.toDate();
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (error) {
      console.error("Error formatting timestamp:", error);
      return 'Error date';
    }
  };

  const filteredMovements = React.useMemo(() => {
    return movements.filter(log => {
      const typeMatch = filterType === 'all' || log.type === filterType;
      const searchMatch = searchTerm === '' ||
                          log.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (log.userEmail && log.userEmail.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          log.userId.toLowerCase().includes(searchTerm.toLowerCase());
      return typeMatch && searchMatch;
    });
  }, [movements, searchTerm, filterType]);

  const groupedLogs = React.useMemo(() => {
    const groups: GroupedLogs = {};
    filteredMovements.forEach(log => {
      const logDate = log.timestamp.toDate();
      let dateGroupLabel: string;
      if (isToday(logDate)) dateGroupLabel = "Today";
      else if (isYesterday(logDate)) dateGroupLabel = "Yesterday";
      else dateGroupLabel = format(logDate, "MMMM d, yyyy");

      if (!groups[dateGroupLabel]) {
        groups[dateGroupLabel] = [];
      }
      groups[dateGroupLabel].push(log);
    });
    // Sort groups within each date descending by timestamp
    for (const dateGroup in groups) {
       groups[dateGroup].sort((a, b) => b.timestamp.seconds - a.timestamp.seconds);
    }
    return groups;
  }, [filteredMovements]);

  const dateGroups = Object.keys(groupedLogs).sort((a, b) => {
    // Custom sort logic to keep Today/Yesterday at the top
    const getDateValue = (label: string): number => {
        if (label === "Today") return new Date().setHours(0, 0, 0, 0);
        if (label === "Yesterday") return new Date(new Date().setDate(new Date().getDate() - 1)).setHours(0, 0, 0, 0);
        try {
            return new Date(label).getTime();
        } catch {
            return 0; // Fallback for invalid dates
        }
    };
    return getDateValue(b) - getDateValue(a); // Sort descending
});


  const getIconAndColor = (type: 'in' | 'out' | 'restock') => {
    switch (type) {
      case 'in': return { Icon: ArrowUpCircle, color: 'text-success' };
      case 'out': return { Icon: ArrowDownCircle, color: 'text-destructive' };
      case 'restock': return { Icon: RefreshCw, color: 'text-blue-500' }; // Use RefreshCw for restock
      default: return { Icon: ArrowUpCircle, color: 'text-muted-foreground' }; // Fallback
    }
  };

  const getTypeLabel = (type: 'in' | 'out' | 'restock') => {
      switch (type) {
          case 'in': return 'In';
          case 'out': return 'Out';
          case 'restock': return 'Restock';
          default: return 'Unknown';
      }
  };


  return (
    
      
        
            
                Activity Feed
            
             
               
                 
                   
                     
                    
                    
                     
                      Search item or user...
                    
                  
                  {/* Update Select to include 'restock' */}
                  
                    
                      
                       Type
                      
                    
                    
                      
                        All Types
                      
                      
                        In
                      
                      
                        Out
                      
                      
                        Restock
                      
                    
                  
                
             
        
        
          {isLoading ? (
            
              {[...Array(5)].map((_, i) => )}
            
          ) : dateGroups.length === 0 ? (
            No matching activity found.
          ) : (
             {dateGroups.map(dateGroup => (
               
                 
                   {dateGroup}
                  
                 
                   {groupedLogs[dateGroup].map(log => {
                        const { Icon, color } = getIconAndColor(log.type);
                        const typeLabel = getTypeLabel(log.type);
                        return (
                             
                               
                                 
                               
                               
                                 
                                     
                                       {typeLabel}: {Math.abs(log.quantityChange)}
                                     
                                     {log.itemName}
                                     (New Qty: {log.newStockLevel})
                                      {log.batchNumber && Batch: {log.batchNumber}}
                                  
                                  
                                     
                                       {log.userEmail || log.userId} • {formatTimestamp(log.timestamp)}
                                     
                                    {log.notes && Note: {log.notes}}
                                 
                               
                             
                         );
                   })}
                 
               
             ))
          )}
        
      
    
  );
}


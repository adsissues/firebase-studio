
"use client";

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"; // Added CardDescription
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { StockMovementLog } from '@/types';
import { format, isToday, isYesterday, formatDistanceToNow } from 'date-fns';
import { ArrowDownCircle, ArrowUpCircle, UserCircle, SearchIcon, FilterIcon, RefreshCcw as RestockIcon } from 'lucide-react'; // Import RefreshCcw and alias as RestockIcon
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
            // Attempt to parse the date string, handle potential errors
            const parsedDate = new Date(label);
            return isNaN(parsedDate.getTime()) ? 0 : parsedDate.getTime(); // Return 0 if parsing fails
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
      case 'restock': return { Icon: RestockIcon, color: 'text-blue-500' }; // Use RestockIcon (aliased RefreshCcw)
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
    <Card className="shadow-md flex-grow flex flex-col"> {/* Added flex flex-col */}
      <CardHeader>
        {/* Ensure CardTitle has valid JSX children */}
        <CardTitle className="text-lg">Activity Feed</CardTitle>
        <CardDescription> {/* Added CardDescription */}
            Recent stock movements.
        </CardDescription>
        <div className="flex gap-2 pt-2">
          <div className="relative flex-grow">
            <SearchIcon className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search item or user..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 text-sm h-8 w-full" // Ensure input takes full width
            />
          </div>
          {/* Update Select to include 'restock' */}
          <Select value={filterType} onValueChange={(value) => setFilterType(value as 'all' | 'in' | 'out' | 'restock')}>
            <SelectTrigger className="w-[130px] h-8 text-sm">
              <FilterIcon className="h-3 w-3 mr-1" />
              <SelectValue placeholder="Filter Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="in">In</SelectItem>
              <SelectItem value="out">Out</SelectItem>
              <SelectItem value="restock">Restock</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-grow overflow-hidden"> {/* Remove padding and allow content to grow */}
        <ScrollArea className="h-full p-4"> {/* Add padding back inside ScrollArea */}
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : dateGroups.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No matching activity found.</p>
          ) : (
             <div className="space-y-6"> {/* Add spacing between date groups */}
             {dateGroups.map(dateGroup => (
               <div key={dateGroup}>
                 <h4 className="text-sm font-semibold mb-2 sticky top-0 bg-background/95 backdrop-blur-sm py-1 z-10">{dateGroup}</h4> {/* Make date sticky */}
                 <div className="space-y-2">
                   {groupedLogs[dateGroup].map(log => {
                        const { Icon, color } = getIconAndColor(log.type);
                        const typeLabel = getTypeLabel(log.type);
                        return (
                             <div key={log.id} className="flex items-start gap-3 p-2 rounded-md hover:bg-accent transition-colors">
                               <Icon className={cn("h-5 w-5 mt-1 flex-shrink-0", color)} />
                               <div className="flex-grow">
                                  <p className="text-sm font-medium">
                                       <span className={cn("font-semibold", color)}>{typeLabel}: {Math.abs(log.quantityChange)}</span>
                                     {' '} - {log.itemName}
                                     <span className="text-xs text-muted-foreground"> (New Qty: {log.newStockLevel})</span>
                                      {log.batchNumber && <Badge variant="secondary" className="ml-2 text-xs">Batch: {log.batchNumber}</Badge>}
                                  </p>
                                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                                       <UserCircle className="h-3 w-3"/> {log.userEmail || log.userId} • {formatTimestamp(log.timestamp)}
                                     </p>
                                    {log.notes && <p className="text-xs text-muted-foreground mt-1 italic">Note: {log.notes}</p>}
                                 </div>
                               {/* Removed Badge */}
                             </div>
                         );
                   })}
                 </div>
               </div>
             ))}
             </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

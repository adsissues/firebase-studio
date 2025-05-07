
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
import { ArrowDownCircle, ArrowUpCircle, UserCircle, SearchIcon, FilterIcon, RefreshCcw } from 'lucide-react';
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
  const [filterType, setFilterType] = React.useState<'all' | 'in' | 'out'>('all');

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
    return groups;
  }, [filteredMovements]);

  const dateGroups = Object.keys(groupedLogs).sort((a, b) => {
    if (a === "Today") return -1;
    if (b === "Today") return 1;
    if (a === "Yesterday") return -1;
    if (b === "Yesterday") return 1;
    // Sort other dates chronologically descending
    try {
        const dateA = new Date(a);
        const dateB = new Date(b);
        return dateB.getTime() - dateA.getTime();
    } catch (e) {
        // Handle potential invalid date strings if necessary
        return 0;
    }
});


  return (
    <Card className="shadow-lg rounded-xl h-full flex flex-col">
      <CardHeader className="border-b p-4">
        <CardTitle className="text-xl text-primary flex items-center justify-between">
            <span>Activity Feed</span>
             {/* Add a refresh button or other controls if needed */}
        </CardTitle>
         <div className="flex gap-2 mt-2">
           <div className="relative flex-grow">
             <SearchIcon className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
             <Input
               type="search"
               placeholder="Search item or user..."
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="pl-8 text-xs h-8"
               disabled={isLoading}
             />
           </div>
           <Select value={filterType} onValueChange={(value: 'all' | 'in' | 'out') => setFilterType(value)} disabled={isLoading}>
             <SelectTrigger className="w-[100px] text-xs h-8">
               <FilterIcon className="mr-1 h-3 w-3" />
               <SelectValue placeholder="Type" />
             </SelectTrigger>
             <SelectContent>
               <SelectItem value="all">All</SelectItem>
               <SelectItem value="in">In</SelectItem>
               <SelectItem value="out">Out</SelectItem>
             </SelectContent>
           </Select>
         </div>
      </CardHeader>
      <CardContent className="p-0 flex-grow overflow-hidden">
        <ScrollArea className="h-full p-4">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : dateGroups.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No matching activity found.</p>
          ) : (
             dateGroups.map(dateGroup => (
               <div key={dateGroup} className="mb-6 last:mb-0">
                 <h3 className="text-sm font-semibold text-muted-foreground mb-2 sticky top-0 bg-background/80 backdrop-blur-sm py-1 px-2 -mx-2 z-10">{dateGroup}</h3>
                 <ul className="space-y-3">
                   {groupedLogs[dateGroup].map(log => (
                     <li key={log.id} className="flex items-start space-x-3 text-sm">
                       <div className="flex-shrink-0 pt-0.5">
                         {log.type === 'in' ? (
                           <ArrowUpCircle className="h-4 w-4 text-success" />
                         ) : (
                           <ArrowDownCircle className="h-4 w-4 text-destructive" />
                         )}
                       </div>
                       <div className="flex-grow">
                         <p className="leading-tight">
                            <span className={`font-medium ${log.type === 'in' ? 'text-success' : 'text-destructive'}`}>
                              {log.type === 'in' ? 'In:' : 'Out:'} {Math.abs(log.quantityChange)}
                            </span>
                            <span className="font-semibold mx-1">{log.itemName}</span>
                            <span className="text-muted-foreground">(New Qty: {log.newStockLevel})</span>
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <UserCircle className="h-3 w-3" /> {log.userEmail || log.userId} • {formatTimestamp(log.timestamp)}
                          </p>
                       </div>
                     </li>
                   ))}
                 </ul>
               </div>
             ))
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
    

    

"use client";

import * as React from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from '@/components/ui/badge';
import type { StockMovementLog, StockItem, AdminSettings } from '@/types';
import { format, parseISO, isToday, isYesterday, formatDistanceToNow, startOfDay } from 'date-fns';
import { ArrowDownCircle, ArrowUpCircle, UserCircle, Package, TrendingDown, AlertTriangle, Circle, CalendarIcon, SearchIcon, FilterIcon } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { DateRange } from "react-day-picker";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface StockMovementDashboardProps {
  movements: StockMovementLog[];
  stockItems: StockItem[]; // For checking minimum stock levels
  globalLowStockThreshold: AdminSettings['lowStockThreshold'];
  // itemLimit prop is no longer used due to grouping
}

interface GroupedMovementValue {
  totalIn: number;
  totalOut: number;
  netChange: number;
  logs: StockMovementLog[];
  latestLogForStockCheck?: StockMovementLog; // The last log for this item on this day
}

interface GroupedMovements {
  [dateGroup: string]: {
    [itemName: string]: GroupedMovementValue;
  };
}

export function StockMovementDashboard({ movements, stockItems, globalLowStockThreshold }: StockMovementDashboardProps) {
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(undefined);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedType, setSelectedType] = React.useState<'all' | 'in' | 'out'>('all');
  const [expandedItem, setExpandedItem] = React.useState<string | null>(null); // dateGroup-itemName

  const formatMovementTimestamp = (timestamp: any): string => {
    if (!timestamp || typeof timestamp.toDate !== 'function') {
      return 'Invalid date';
    }
    try {
      const date = timestamp.toDate();
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (error) {
      console.error("Error formatting movement timestamp:", error);
      return 'Error date';
    }
  };

  const getItemGroupKey = (dateGroup: string, itemName: string) => `${dateGroup}-${itemName}`;

  const processedMovements = React.useMemo(() => {
    let filtered = [...movements];

    // Filter by Date Range
    if (dateRange?.from) {
      filtered = filtered.filter(log => {
        const logDate = log.timestamp.toDate();
        if (dateRange.to) {
          return logDate >= startOfDay(dateRange.from!) && logDate <= startOfDay(dateRange.to);
        }
        return logDate >= startOfDay(dateRange.from!) && logDate <= startOfDay(dateRange.from!); // Single day selection
      });
    }

    // Filter by Search Query (Item Name)
    if (searchQuery) {
      filtered = filtered.filter(log =>
        log.itemName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by Type
    if (selectedType !== 'all') {
      filtered = filtered.filter(log => log.type === selectedType);
    }

    // Group by Date then by Item Name
    const grouped: GroupedMovements = {};
    filtered.sort((a,b) => b.timestamp.seconds - a.timestamp.seconds); // Sort logs to get latest

    filtered.forEach(log => {
      const logDate = log.timestamp.toDate();
      let dateGroupLabel: string;
      if (isToday(logDate)) dateGroupLabel = "Today";
      else if (isYesterday(logDate)) dateGroupLabel = "Yesterday";
      else dateGroupLabel = format(logDate, "MMMM d, yyyy");

      if (!grouped[dateGroupLabel]) grouped[dateGroupLabel] = {};
      if (!grouped[dateGroupLabel][log.itemName]) {
        grouped[dateGroupLabel][log.itemName] = { totalIn: 0, totalOut: 0, netChange: 0, logs: [], latestLogForStockCheck: log };
      }

      const itemGroup = grouped[dateGroupLabel][log.itemName];
      if (log.type === 'in') {
        itemGroup.totalIn += log.quantityChange;
      } else {
        itemGroup.totalOut += Math.abs(log.quantityChange); // quantityChange is negative for 'out'
      }
      itemGroup.netChange = itemGroup.totalIn - itemGroup.totalOut;
      itemGroup.logs.push(log);
      // Ensure logs are sorted by time descending to pick the latest for stock check easily
      itemGroup.logs.sort((a,b) => b.timestamp.seconds - a.timestamp.seconds);
      itemGroup.latestLogForStockCheck = itemGroup.logs[0];
    });

    return grouped;
  }, [movements, dateRange, searchQuery, selectedType]);

  const dateGroups = Object.keys(processedMovements).sort((a, b) => {
    if (a === "Today") return -1;
    if (b === "Today") return 1;
    if (a === "Yesterday") return -1;
    if (b === "Yesterday") return 1;
    return parseISO(format(new Date(b), 'yyyy-MM-dd')).getTime() - parseISO(format(new Date(a), 'yyyy-MM-dd')).getTime();
  });


  const getItemStatusBadge = (itemName: string, latestLog?: StockMovementLog) => {
    if (!latestLog) return null;

    const stockItem = stockItems.find(si => si.id === latestLog.itemId);
    const effectiveThreshold = stockItem?.minimumStock !== undefined ? stockItem.minimumStock : globalLowStockThreshold;
    const currentStock = latestLog.newStockLevel;

    if (currentStock === 0) {
      return <Badge variant="destructive" className="text-xs whitespace-nowrap"><AlertTriangle className="h-3 w-3 mr-1" />Out of Stock</Badge>;
    }
    if (currentStock <= effectiveThreshold) {
      return <Badge variant="destructive" className="text-xs whitespace-nowrap"><TrendingDown className="h-3 w-3 mr-1" />Low Stock</Badge>;
    }
    return <Badge variant="secondary" className="text-xs whitespace-nowrap"><Circle className="h-3 w-3 mr-1" />Okay</Badge>;
  };


  return (
    <Card className="shadow-lg rounded-xl">
      <CardHeader>
        <CardTitle className="text-2xl text-primary">Recent Stock Movements</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg bg-muted/30">
          <div>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dateRange && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "LLL dd, y")} -{" "}
                        {format(dateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(dateRange.from, "LLL dd, y")
                    )
                  ) : (
                    <span>Pick a date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by item name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-full"
            />
          </div>
          <div>
            <Select value={selectedType} onValueChange={(value: 'all' | 'in' | 'out') => setSelectedType(value)}>
              <SelectTrigger className="w-full">
                 <FilterIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="in">Stock In</SelectItem>
                <SelectItem value="out">Stock Out</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {dateGroups.length === 0 && (
          <p className="text-center text-muted-foreground py-8">No stock movements match your filters.</p>
        )}

        <Accordion type="multiple" className="w-full space-y-2">
          {dateGroups.map(dateGroup => (
            <AccordionItem value={dateGroup} key={dateGroup} className="border bg-card rounded-lg shadow-sm">
              <AccordionTrigger className="px-6 py-4 text-lg font-medium hover:bg-accent/50 rounded-t-lg">
                {dateGroup}
                <Badge variant="outline" className="ml-auto mr-2">
                  {Object.keys(processedMovements[dateGroup]).length} item(s)
                </Badge>
              </AccordionTrigger>
              <AccordionContent className="px-2 pb-2 sm:px-4 sm:pb-4">
                <div className="space-y-3">
                {Object.entries(processedMovements[dateGroup]).map(([itemName, data]) => {
                  const itemKey = getItemGroupKey(dateGroup, itemName);
                  const stockItemDetails = stockItems.find(si => si.itemName === itemName); // For location, etc.
                  return (
                    <Card key={itemKey} className="overflow-hidden shadow-md">
                       <CardHeader className="p-3 sm:p-4 bg-muted/50 flex flex-row justify-between items-center cursor-pointer" onClick={() => setExpandedItem(expandedItem === itemKey ? null : itemKey)}>
                          <div className="flex items-center gap-2">
                            <Package className="h-5 w-5 text-primary" />
                            <CardTitle className="text-md sm:text-lg">{itemName}</CardTitle>
                          </div>
                          <div className="flex items-center gap-2 text-xs sm:text-sm">
                            {data.totalIn > 0 && <Badge variant="secondary" className="bg-success/10 text-success border-success/20"><ArrowUpCircle className="h-3 w-3 mr-1" /> In: {data.totalIn}</Badge>}
                            {data.totalOut > 0 && <Badge variant="secondary" className="bg-destructive/10 text-destructive border-destructive/20"><ArrowDownCircle className="h-3 w-3 mr-1" /> Out: {data.totalOut}</Badge>}
                            <Badge variant={data.netChange > 0 ? "success" : data.netChange < 0 ? "destructive" : "secondary"} className="font-semibold">
                              Net: {data.netChange > 0 ? `+${data.netChange}` : data.netChange}
                            </Badge>
                            {getItemStatusBadge(itemName, data.latestLogForStockCheck)}
                          </div>
                       </CardHeader>
                      {expandedItem === itemKey && (
                        <CardContent className="p-0">
                          <Table>
                            <TableCaption className="py-2 text-xs">Individual movements for {itemName} on {dateGroup}.</TableCaption>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-[25%] text-xs">Time</TableHead>
                                <TableHead className="text-center w-[15%] text-xs">Type</TableHead>
                                <TableHead className="text-right w-[15%] text-xs">Change</TableHead>
                                <TableHead className="text-right w-[20%] text-xs">New Qty</TableHead>
                                <TableHead className="text-center w-[25%] text-xs">User</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {data.logs.map(log => (
                                <TableRow key={log.id} className="text-xs">
                                  <TableCell>{formatMovementTimestamp(log.timestamp)}</TableCell>
                                  <TableCell className="text-center">
                                    {log.type === 'in' ? (
                                      <Badge variant="secondary" className="text-xs bg-success/20 text-success border-success/30"><ArrowUpCircle className="h-3 w-3 mr-1" />In</Badge>
                                    ) : (
                                      <Badge variant="secondary" className="text-xs bg-destructive/20 text-destructive border-destructive/30"><ArrowDownCircle className="h-3 w-3 mr-1" />Out</Badge>
                                    )}
                                  </TableCell>
                                  <TableCell className={`text-right font-mono ${log.quantityChange > 0 ? 'text-success' : 'text-destructive'}`}>
                                    {log.quantityChange > 0 ? `+${log.quantityChange}` : log.quantityChange}
                                  </TableCell>
                                  <TableCell className="text-right font-mono">{log.newStockLevel}</TableCell>
                                  <TableCell className="text-center">
                                    <TooltipProvider delayDuration={100}>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <span className="flex justify-center items-center cursor-default">
                                            <UserCircle className="h-4 w-4 text-muted-foreground" />
                                          </span>
                                        </TooltipTrigger>
                                        <TooltipContent><p>{log.userEmail || log.userId}</p></TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </CardContent>
                      )}
                    </Card>
                  );
                })}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}

    

"use client";

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { AlertType, StockItem } from '@/types';
import { AlertTriangle, Info, BellRing, X, ShoppingCart, Phone, Mail } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface AlertsPanelProps {
  alerts: AlertType[];
  onDismissAlert: (alertId: string) => void;
  onItemAction?: (item: StockItem) => void; // For reorder/contact supplier
  maxAlertsToShow?: number;
}

export function AlertsPanel({ alerts, onDismissAlert, onItemAction, maxAlertsToShow = 10 }: AlertsPanelProps) {
  
  const getAlertIcon = (variant?: AlertType['variant']) => {
    switch (variant) {
      case 'destructive': return <AlertTriangle className="h-4 w-4" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-warning" />;
      case 'info': return <Info className="h-4 w-4 text-info" />;
      default: return <BellRing className="h-4 w-4" />;
    }
  };

  const getAlertBorderColor = (variant?: AlertType['variant']) => {
    switch (variant) {
      case 'destructive': return 'border-destructive';
      case 'warning': return 'border-warning';
      case 'info': return 'border-info';
      default: return 'border-muted';
    }
  }

  const visibleAlerts = alerts.slice(0, maxAlertsToShow);

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2"><BellRing className="h-5 w-5 text-primary" /> System Alerts</CardTitle>
        <CardDescription>Important notifications regarding your inventory.</CardDescription>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No active alerts.</p>
        ) : (
          <ScrollArea className="h-72"> {/* Adjust height as needed */}
            <div className="space-y-3 pr-3">
              {visibleAlerts.map((alert) => (
                <Alert key={alert.id} variant={alert.variant === 'warning' || alert.variant === 'info' || alert.variant === 'destructive' ? alert.variant : 'default'} className={cn("relative", getAlertBorderColor(alert.variant))}>
                  {getAlertIcon(alert.variant)}
                  <AlertTitle className="font-semibold">{alert.title}</AlertTitle>
                  <AlertDescription className="text-xs">
                    {alert.message}
                    <span className="block text-muted-foreground mt-1 text-[10px]">
                        {formatDistanceToNow(alert.timestamp, { addSuffix: true })}
                    </span>
                  </AlertDescription>
                  <div className="mt-2 flex gap-2">
                    {alert.item && onItemAction && (alert.type === 'low_stock' || alert.type === 'overstock') && (
                       <Button
                          variant="outline"
                          size="xs"
                          onClick={() => onItemAction(alert.item!)}
                          className="text-xs"
                        >
                          {alert.item.supplierEmail ? <Mail className="mr-1 h-3 w-3" /> : alert.item.supplierPhone ? <Phone className="mr-1 h-3 w-3" /> : <ShoppingCart className="mr-1 h-3 w-3" />}
                           Reorder/Contact
                       </Button>
                    )}
                     <Button 
                        variant="ghost" 
                        size="xs" 
                        onClick={() => onDismissAlert(alert.id)} 
                        className="absolute top-2 right-2 p-1 h-auto text-muted-foreground hover:text-foreground"
                        aria-label="Dismiss alert"
                      >
                       <X className="h-3 w-3" />
                     </Button>
                  </div>
                </Alert>
              ))}
               {alerts.length > maxAlertsToShow && (
                <p className="text-xs text-muted-foreground text-center pt-2">
                  Showing {maxAlertsToShow} of {alerts.length} alerts.
                </p>
              )}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

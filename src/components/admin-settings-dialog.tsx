
'use client';

    import * as React from 'react';
    import {
      Dialog,
      DialogContent,
      DialogHeader,
      DialogTitle,
      DialogDescription,
      DialogFooter,
      DialogClose,
    } from '@/components/ui/dialog';
    import { Button } from '@/components/ui/button';
    import { Label } from '@/components/ui/label';
    import { Switch } from '@/components/ui/switch';
    import { Input } from '@/components/ui/input';
    import { Bell, Mail, Save, XCircle, AlertTriangle, Loader2, Activity, TrendingUp as TrendingUpIcon } from 'lucide-react';
    import type { AdminSettings } from '@/types';

    interface AdminSettingsDialogProps {
      isOpen: boolean;
      onClose: () => void;
      onSave: (settings: AdminSettings) => void;
      currentSettings?: AdminSettings;
      isLoading?: boolean;
    }

    const defaultSettings: AdminSettings = {
      emailNotifications: true,
      pushNotifications: false,
      lowStockThreshold: 10,
      overstockThresholdPercentage: 200,
      inactivityAlertDays: 30,
    };

    export function AdminSettingsDialog({
      isOpen,
      onClose,
      onSave,
      currentSettings = defaultSettings,
      isLoading = false,
    }: AdminSettingsDialogProps) {
      const [emailEnabled, setEmailEnabled] = React.useState(currentSettings.emailNotifications);
      const [pushEnabled, setPushEnabled] = React.useState(currentSettings.pushNotifications);
      const [lowStockThreshold, setLowStockThreshold] = React.useState(currentSettings.lowStockThreshold);
      const [overstockPercentage, setOverstockPercentage] = React.useState(currentSettings.overstockThresholdPercentage ?? 200);
      const [inactivityDays, setInactivityDays] = React.useState(currentSettings.inactivityAlertDays ?? 30);

      const [errors, setErrors] = React.useState<{ [key: string]: string | null }>({});

      React.useEffect(() => {
        setEmailEnabled(currentSettings.emailNotifications);
        setPushEnabled(currentSettings.pushNotifications);
        setLowStockThreshold(currentSettings.lowStockThreshold);
        setOverstockPercentage(currentSettings.overstockThresholdPercentage ?? 200);
        setInactivityDays(currentSettings.inactivityAlertDays ?? 30);
        setErrors({});
      }, [isOpen, currentSettings]);

      const validateField = (name: string, value: number): string | null => {
        if (value <= 0) {
          return "Must be a positive number.";
        }
        if (name === 'overstockThresholdPercentage' && value < 100) {
            return "Percentage must be at least 100.";
        }
        return null;
      };

      const handleNumericChange = (setter: React.Dispatch<React.SetStateAction<number>>, fieldName: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
          const value = parseInt(e.target.value, 10);
          setter(isNaN(value) ? 0 : value);
          if (errors[fieldName]) {
              setErrors(prev => ({ ...prev, [fieldName]: validateField(fieldName, isNaN(value) ? 0 : value) }));
          }
      };


      const handleSave = () => {
          if (isLoading) return;

          let currentErrors: { [key: string]: string | null } = {};
          currentErrors.lowStockThreshold = validateField('lowStockThreshold', lowStockThreshold);
          currentErrors.overstockThresholdPercentage = validateField('overstockThresholdPercentage', overstockPercentage);
          currentErrors.inactivityAlertDays = validateField('inactivityAlertDays', inactivityDays);

          setErrors(currentErrors);

          const hasErrors = Object.values(currentErrors).some(err => err !== null);
          if (hasErrors) return;

          onSave({
            emailNotifications: emailEnabled,
            pushNotifications: pushEnabled,
            lowStockThreshold: lowStockThreshold,
            overstockThresholdPercentage: overstockPercentage,
            inactivityAlertDays: inactivityDays,
          });
      };


      return (
        <Dialog open={isOpen} onOpenChange={onClose}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Admin Settings</DialogTitle>
              <DialogDescription>
                Configure global settings for notifications and stock alerts.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4 max-h-[65vh] overflow-y-auto pr-2">
               <div className="space-y-4 border p-4 rounded-md">
                   <h3 className="font-semibold text-lg mb-2 flex items-center gap-2"><Bell className="h-5 w-5"/>Notifications & Alerts</h3>
                   <div className="space-y-1">
                     <Label htmlFor="low-stock-threshold" className="text-sm font-medium">
                       Low Stock Threshold (Units)
                     </Label>
                     <Input
                        id="low-stock-threshold" type="number" value={lowStockThreshold}
                        onChange={handleNumericChange(setLowStockThreshold, 'lowStockThreshold')}
                        className={errors.lowStockThreshold ? 'border-destructive' : ''} min="1" step="1" disabled={isLoading}
                      />
                      {errors.lowStockThreshold && (<p className="text-xs text-destructive flex items-center gap-1"><AlertTriangle className="h-3 w-3"/>{errors.lowStockThreshold}</p>)}
                      <p className="text-xs text-muted-foreground">Global alert level if item-specific minimum is not set.</p>
                   </div>

                   <div className="space-y-1">
                     <Label htmlFor="overstock-threshold" className="text-sm font-medium flex items-center gap-1">
                       <TrendingUpIcon className="h-4 w-4"/> Overstock Threshold (%)
                     </Label>
                     <Input
                        id="overstock-threshold" type="number" value={overstockPercentage}
                        onChange={handleNumericChange(setOverstockPercentage, 'overstockThresholdPercentage')}
                        className={errors.overstockThresholdPercentage ? 'border-destructive' : ''} min="100" step="10" disabled={isLoading}
                      />
                      {errors.overstockThresholdPercentage && (<p className="text-xs text-destructive flex items-center gap-1"><AlertTriangle className="h-3 w-3"/>{errors.overstockThresholdPercentage}</p>)}
                      <p className="text-xs text-muted-foreground">Alert if stock exceeds this percentage of its minimum (or global low) level.</p>
                   </div>

                   <div className="space-y-1">
                     <Label htmlFor="inactivity-alert-days" className="text-sm font-medium flex items-center gap-1">
                       <Activity className="h-4 w-4"/> Inactivity Alert (Days)
                     </Label>
                     <Input
                        id="inactivity-alert-days" type="number" value={inactivityDays}
                        onChange={handleNumericChange(setInactivityDays, 'inactivityAlertDays')}
                        className={errors.inactivityAlertDays ? 'border-destructive' : ''} min="1" step="1" disabled={isLoading}
                      />
                      {errors.inactivityAlertDays && (<p className="text-xs text-destructive flex items-center gap-1"><AlertTriangle className="h-3 w-3"/>{errors.inactivityAlertDays}</p>)}
                      <p className="text-xs text-muted-foreground">Alert if an item has no stock movements for this many days.</p>
                   </div>


                    <div className="flex items-center justify-between space-x-2">
                      <Label htmlFor="email-notifications" className="flex items-center gap-2"><Mail className="h-4 w-4"/> Email Low Stock Alerts</Label>
                      <Switch id="email-notifications" checked={emailEnabled} onCheckedChange={setEmailEnabled} aria-label="Toggle email notifications" disabled={isLoading} />
                    </div>
                    <div className="flex items-center justify-between space-x-2">
                      <Label htmlFor="push-notifications" className="flex items-center gap-2"><Bell className="h-4 w-4"/> Push Notifications</Label>
                      <Switch id="push-notifications" checked={pushEnabled} onCheckedChange={setPushEnabled} disabled={isLoading} aria-label="Toggle push notifications" />
                     </div>
                </div>
            </div>

            <DialogFooter>
              <DialogClose asChild><Button variant="outline" onClick={onClose} disabled={isLoading}><XCircle className="mr-2 h-4 w-4" /> Cancel</Button></DialogClose>
              <Button type="button" onClick={handleSave} disabled={isLoading}>{isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Save Settings</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );
    }
